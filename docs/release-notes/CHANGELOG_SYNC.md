# 中文更新日志同步流程 (独家服)

本服的玩家可见更新日志在 `public/changelog.html` (路由 `/changelog`),
首页导航栏「新闻资讯」右侧的「独家更新」入口指向该页。

官方「新闻资讯」面板仍拉取 GitHub Releases 原文; 本服中文页是独立维护的
玩家向摘要, 顺序固定为:

1. **独家更新** (本服数值/机制调整, 始终置顶)
2. **官方更新** (当前版本的中文摘要, 例如 v0.29.0)

Agent 执行同一流程时使用 skill:

- Claude / Cursor: `.claude/skills/changelog-sync/` (`/changelog-sync`)
- Codex: `.agents/skills/woc-changelog-sync/` (`$woc-changelog-sync`)

## 同步一次官方版本时的步骤

1. 从官方 Release 取原文  
   `https://github.com/levy-street/world-of-claudecraft/releases/tag/vX.Y.Z`  
   若仓库已有英文源稿 `docs/release-notes/release-notes-vX.Y.Z.md`, 优先用它。
2. 在 `docs/release-notes/` 写/更新中文源稿  
   `release-notes-vX.Y.md` (只写玩家关心的要点, 可压缩工具链/CI 细节)
3. 更新 `public/changelog.html`  
   - 独家区块保持在前, 按需追加本服新改动  
   - 官方区块替换为本次中文摘要, 标题带版本号  
   - 同步页面 meta / og 描述里的版本号与发布日期
4. 确认导航入口仍在「新闻资讯」右侧, 文案为「独家更新」  
   (`nav.exclusiveUpdates`, `index.html` / `play.html` 的 `#nav-btn-exclusive`)
5. 如有 sitemap / 页脚版本链接需要指向 `/changelog`, 一并核对

## 独家改动维护约定

- 只记录本服相对官方的差异 (数值倍率、施法规则、掉落副属性等)
- 新独家功能落地时, 在同一次变更里追加到独家列表, 不要混进官方区块
- 不要把官方 Release 正文原样粘贴进独家区块

## 相关路径

| 路径 | 用途 |
|---|---|
| `public/changelog.html` | 线上中文页 |
| `docs/release-notes/release-notes-v*.md` | 中文源稿 |
| `docs/release-notes/release-notes-v*.*.*.md` | 官方英文源稿 (若有) |
| `.claude/skills/changelog-sync/` | Claude / Cursor skill |
| `.agents/skills/woc-changelog-sync/` | Codex skill |
| `src/ui/i18n.catalog/index.ts` (`nav.exclusiveUpdates`) | 导航英文键 |
| `src/ui/i18n.locales/zh_CN.ts` 等 | 导航本地化 |
| `index.html` / `play.html` | 导航 DOM |
| `src/main.ts` (`nav-btn-exclusive`) | 跳转 `/changelog` |
