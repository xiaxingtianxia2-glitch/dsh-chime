# Changelog

## 0.1.0 (2026-08-18)

- 首个发布版：opencode 三音效（完成/提问/错误）bundle 插件
- host：`agent/status` / `tools/execute` 事件入队，`/chime/poll` + `/chime/debug` 路由
- client：250ms 轮询播放，原始 mp3 base64 内嵌（零外部依赖）
