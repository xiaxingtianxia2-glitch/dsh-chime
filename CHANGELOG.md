# Changelog

## 0.1.1 (2026-08-19)

- 完善：host 文件头文档注释（原理/形态/注意）
- 完善：错误日志改用 `ctx.logger`（受 dsh 日志系统管理，带 `[dsh-chime]` 前缀）
- 完善：README 补 GitHub 源安装、`/chime/debug` 输出示例、FAQ、创造模式署名
- 行为不变：三音触发逻辑与 0.1.0 一致

## 0.1.0 (2026-08-18)

- 首个发布版：opencode 三音效（完成/提问/错误）bundle 插件
- host：`agent/status` / `tools/execute` 事件入队，`/chime/poll` + `/chime/debug` 路由
- client：250ms 轮询播放，原始 mp3 base64 内嵌（零外部依赖）
