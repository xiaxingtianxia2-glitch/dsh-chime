# dsh-chime

<p align="center"><sub><i>opencode 任务完成提示音 · 零外部依赖 · 浏览器播放</i></sub></p>

为 DeepSeek Harness 复刻 opencode 的任务完成提示音：一轮对话完成、向你提问、
或一轮出错结束时播放清脆提示音。三个音效均为 opencode 官方仓库的**原始 mp3
无损内嵌**（base64 打包在 client 中），插件完全自包含。

## 工作原理

1. **host 半**（Cordis bundle entry）监听 `agent/status`（一轮 `running → idle`
   即完成，出错轮播错误音）与 `tools/execute`（`ask_user_question` 提问工具
   开始执行即入队提问音），按需入队音效；
2. **webServer 路由**：`/chime/poll` 提供待播队列，`/chime/debug` 提供状态与
   试听入口；
3. **client 半**（浏览器）每 250ms 轮询 `/chime/poll`，用 `Audio` 播放内嵌
   base64 音源。

## 音效

| 音效 | 触发时机 | 音源（opencode 原始） |
|---|---|---|
| 完成音 | 一轮回复结束 | `bip-bop-01.mp3` |
| 提问音 | 提问弹窗出现瞬间 | `yup-01.mp3` |
| 错误音 | 一轮出错结束 | `nope-03.mp3` |

## 安装

```sh
dsh plugin --profile web add dsh-chime
```

装完**重启 web**（client 通道启动时扫描装配）。

## 使用

无需操作，自动生效（host 级监听所有 agent/会话）。试听与排查：

```
GET http://127.0.0.1:3080/chime/debug            # 状态（recent / pending / runningCount）
GET http://127.0.0.1:3080/chime/debug?play=done  # 试听（done | question | error）
```

## 插件管理

已装插件用 plugin-registry 的**薄控制台**管理（浏览器面板）：管理 profile
插件安装态（bundle 层栈 + insert 行 + 启停），无需手改配置。安装：
`dsh plugin --profile web add <plugin-registry>/packages/plugin/console`

## 许可证

MIT
