# dsh-chime

<p align="center"><sub><i>本项目由 dsh创造模式 + Deepseek-V4-Flash0731 独立完成</i></sub></p>

[English](README.en.md) | 中文

## 这是什么

为 DeepSeek Harness 复刻 opencode 的任务完成提示音：一轮对话完成、向你提问、
计划提交待审、或一轮出错结束时播放清脆提示音。三个音源均为 opencode 官方
仓库的**原始 mp3 无损内嵌**（base64 打包在 client 中），插件完全自包含、
零外部依赖。

## 工作原理

1. **host 半**（Cordis bundle entry）监听 `agent/status`（一轮 `running → idle`
   即完成，出错轮播错误音）与 `tools/execute`（`ask_user_question` 提问工具、
   `exit_plan_mode` 计划提交工具开始执行即入队提问音），按需入队音效；
2. **webServer 路由**：`/chime/poll` 提供待播队列，`/chime/debug` 提供状态与
   试听入口；
3. **client 半**（浏览器）每 250ms 轮询 `/chime/poll`，用 `Audio` 播放内嵌
   base64 音源。

## 音效

| 音效 | 触发时机 | 音源（opencode 原始） |
|---|---|---|
| 完成音 | 一轮回复结束 | `bip-bop-01.mp3` |
| 提问音 | 提问弹窗出现瞬间 / 计划提交待审 | `yup-01.mp3` |
| 错误音 | 一轮出错结束 | `nope-03.mp3` |

## 安装

```bash
dsh plugin --profile web add dsh-chime
```

或从 GitHub 源安装（等同内容）：

```bash
dsh plugin --profile web add github:xiaxingtianxia2-glitch/dsh-chime
```

装完**重启 web**（client 通道启动时扫描装配）。本插件为 host 级监听——
所有 agent/会话（含子代理）完成都会响。

## 使用

无需操作，自动生效。试听与排查：

```bash
curl http://127.0.0.1:3080/chime/debug
```

```json
{"pendingCount":0,"recent":["done","question"],"runningCount":1}
```

字段含义：`recent` 最近入队历史；`pendingCount` 待播放队列长度（client 每
250ms 取走）；`runningCount` 当前 live agent 数。

试听指定音效：

```bash
curl http://127.0.0.1:3080/chime/debug?play=done      # done | question | error
```

## 常见问题

- **没声音？** 先确认系统音量与浏览器标签页未被静音；再访问
  `/chime/debug?play=done` 试听——若入队但没播，刷新页面重载 client 播放器。
- **子代理完成也响？** 会——host 级监听所有 agent，与 opencode 一致（所有
  session 都响）。若觉得吵可卸载插件：
  `dsh plugin --profile web remove dsh-chime`。
- **提问音不响？** 提问音在提问工具**开始执行**时触发（弹窗出现瞬间），
  计划待审音在 `exit_plan_mode` 工具开始执行时触发。若使用非标准提问/计划
  通道（不经过这两个工具）不会触发。
- **重启后还有效吗？** 有效——bundle 插件随 profile 自动装配，重启即生效。

## 许可证

[MIT](LICENSE)
