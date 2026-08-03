import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import * as http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { isBenignStreamClose, pipeFileToResponse } from '../../server/stream_file';

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'woc-stream-file-'));
  roots.push(root);
  return root;
}

async function listen(server: http.Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('missing test server port');
  return address.port;
}

async function close(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

describe('isBenignStreamClose', () => {
  it('recognizes premature close and connection-reset codes', () => {
    expect(
      isBenignStreamClose({ code: 'ERR_STREAM_PREMATURE_CLOSE' } as NodeJS.ErrnoException),
    ).toBe(true);
    expect(isBenignStreamClose({ code: 'ECONNRESET' } as NodeJS.ErrnoException)).toBe(true);
    expect(isBenignStreamClose({ code: 'EPIPE' } as NodeJS.ErrnoException)).toBe(true);
    expect(isBenignStreamClose({ name: 'AbortError' } as NodeJS.ErrnoException)).toBe(true);
    expect(isBenignStreamClose({ code: 'EMFILE' } as NodeJS.ErrnoException)).toBe(false);
    expect(isBenignStreamClose({ code: 'ENOENT' } as NodeJS.ErrnoException)).toBe(false);
  });
});

describe('pipeFileToResponse', () => {
  it('delivers the full file body', async () => {
    const root = tempRoot();
    const file = join(root, 'index.html');
    const body = '<!doctype html><title>ok</title>';
    writeFileSync(file, body);

    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      pipeFileToResponse(file, res);
    });
    const port = await listen(server);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(body);
    } finally {
      await close(server);
    }
  });

  it('closes the readable after many client aborts so later opens still succeed', async () => {
    // Repro for the EMFILE loop: bare .pipe(res) leaks an FD per aborted
    // transfer. After enough aborts, opening the same path fails. pipeline must
    // keep the process able to open the file afterwards.
    const root = tempRoot();
    const file = join(root, 'big.bin');
    // Large enough that a tiny first-chunk read cannot finish before abort.
    writeFileSync(file, Buffer.alloc(4 * 1024 * 1024, 0xab));

    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      pipeFileToResponse(file, res);
    });
    const port = await listen(server);
    try {
      for (let i = 0; i < 80; i++) {
        const ac = new AbortController();
        const pending = fetch(`http://127.0.0.1:${port}/`, { signal: ac.signal }).catch(() => null);
        // Abort as soon as headers arrive so the body stream is still open.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        ac.abort();
        await pending;
      }
      // Give pipeline callbacks a turn to destroy leftovers.
      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      const response = await fetch(`http://127.0.0.1:${port}/`);
      expect(response.status).toBe(200);
      expect((await response.arrayBuffer()).byteLength).toBe(4 * 1024 * 1024);
    } finally {
      await close(server);
    }
  });

  it('does not throw an uncaughtException when the path cannot be opened', async () => {
    const missing = join(tempRoot(), 'gone.html');
    const uncaught: unknown[] = [];
    const onUncaught = (err: unknown) => {
      uncaught.push(err);
    };
    process.on('uncaughtException', onUncaught);

    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      pipeFileToResponse(missing, res);
    });
    const port = await listen(server);
    try {
      await fetch(`http://127.0.0.1:${port}/`).catch(() => null);
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      expect(uncaught).toEqual([]);
    } finally {
      process.off('uncaughtException', onUncaught);
      await close(server);
    }
  });

  it('still serves after a prior open failure on the same process', async () => {
    // Guards against the live symptom: once EMFILE starts, every SPA fallback
    // open fails and the log floods. After a handled failure, a good path must
    // still work (we cannot force EMFILE portably, so we use ENOENT then a real file).
    const root = tempRoot();
    const good = join(root, 'index.html');
    writeFileSync(good, 'hello');
    let serveMissing = true;

    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      pipeFileToResponse(serveMissing ? join(root, 'missing') : good, res);
    });
    const port = await listen(server);
    try {
      await fetch(`http://127.0.0.1:${port}/`).catch(() => null);
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      serveMissing = false;
      const response = await fetch(`http://127.0.0.1:${port}/`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('hello');
    } finally {
      await close(server);
    }
  });
});

describe('serveStatic wiring', () => {
  it('routes static bodies through pipeFileToResponse, never bare createReadStream().pipe', () => {
    // Pin the EMFILE fix at the call site so a future edit cannot reintroduce
    // the leaky pipe pattern that flooded uncaughtException in production.
    const source = readFileSync(join(process.cwd(), 'server/main.ts'), 'utf8');
    expect(source).toContain("from './stream_file'");
    expect(source.match(/pipeFileToResponse\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).not.toMatch(/createReadStream\([^)]+\)\.pipe\(/);
  });
});
