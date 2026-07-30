// Stream a filesystem path onto an HTTP response without leaking the open
// file descriptor when the client aborts mid-transfer.
//
// Bare `createReadStream(path).pipe(res)` does not destroy the readable when
// the socket closes early (Node's long-standing pipe+http abort behavior).
// Under sustained traffic that leaks FDs until every open() fails with EMFILE,
// and an unhandled stream 'error' then floods `uncaughtException`. `pipeline`
// tears both ends down on abort or error, so the failure stays in-process.

import { createReadStream } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { pipeline } from 'node:stream';

/** Client-gone / half-close errors that are normal under load, not a server fault. */
export function isBenignStreamClose(err: NodeJS.ErrnoException): boolean {
  return (
    err.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
    err.code === 'ECONNRESET' ||
    err.code === 'EPIPE' ||
    err.name === 'AbortError'
  );
}

/**
 * Pipe `file` to `res`. Call only after `res.writeHead` (or equivalent headers).
 * Never throws: open/read failures destroy the response instead of becoming an
 * uncaughtException. Returns immediately; transfer finishes asynchronously.
 */
export function pipeFileToResponse(file: string, res: ServerResponse): void {
  const stream = createReadStream(file);
  pipeline(stream, res, (err) => {
    if (err === null || err === undefined) return;
    if (isBenignStreamClose(err as NodeJS.ErrnoException)) return;
    // Headers are already sent by the caller; tear the socket down so we do not
    // leave a half-written response or an orphaned readable FD.
    if (!res.destroyed) res.destroy();
  });
}
