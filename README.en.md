[English](README.en.md) | [中文](README.md)

# dsh-chime

<p align="center"><sub><i>Independently built with the dsh creation mode + Deepseek-V4-Flash0731</i></sub></p>

## What is this

Replicates opencode's task-completion chime inside DeepSeek Harness: a crisp
notification sound when a turn finishes, when the agent asks you a question,
when a plan is submitted for review, or when a turn ends in error. All three
sources are the **original mp3 files from the opencode repository**, embedded
losslessly (base64 inside the client bundle). The plugin is fully
self-contained with zero external dependencies.

## How it works

1. **Host half** (Cordis bundle entry) listens to `agent/status` (a `running →
   idle` transition means a turn finished; error-marked turns play the error
   sound) and `tools/execute` (queues the question sound the moment the
   `ask_user_question` question tool or the `exit_plan_mode` plan tool
   starts), enqueueing sounds as needed;
2. **webServer routes**: `/chime/poll` serves the pending queue,
   `/chime/debug` exposes status and a listen-through entry;
3. **Client half** (browser) polls `/chime/poll` every 250 ms and plays the
   embedded base64 sources via `Audio`.

## Sounds

| Sound | Trigger | Source (original opencode) |
|---|---|---|
| done | a turn finishes | `bip-bop-01.mp3` |
| question | the question dialog appears / a plan is submitted for review | `yup-01.mp3` |
| error | a turn ends in error | `nope-03.mp3` |

## Install

```bash
dsh plugin --profile web add dsh-chime
```

Or install from the GitHub source (identical content):

```bash
dsh plugin --profile web add github:xiaxingtianxia2-glitch/dsh-chime
```

**Restart dsh web** after install (the client channel is scanned at startup).
This plugin listens at host level — every agent/session (including subagents)
triggers it on completion.

## Usage

Nothing to do — it just works. Listen and debug:

```bash
curl http://127.0.0.1:3080/chime/debug
```

```json
{"pendingCount":0,"recent":["done","question"],"runningCount":1}
```

`recent` = recent enqueue history; `pendingCount` = queue length (consumed by
the client every 250 ms); `runningCount` = live agent count.

Listen to a specific sound:

```bash
curl http://127.0.0.1:3080/chime/debug?play=done      # done | question | error
```

## FAQ

- **No sound?** Check the system volume and that the browser tab is not muted;
  then visit `/chime/debug?play=done` to test. If it enqueues but does not
  play, refresh the page to reload the client player.
- **Subagent completions also chime?** Yes — host-level listening covers all
  agents, matching opencode semantics. Uninstall to stop:
  `dsh plugin --profile web remove dsh-chime`.
- **Question sound missing?** The question sound triggers when the question
  tool **starts** (the moment the dialog appears); the plan-review sound
  triggers when the `exit_plan_mode` tool starts. Non-standard question/plan
  channels that do not go through these tools will not trigger it.
- **Still active after restart?** Yes — bundle plugins are assembled from the
  profile on startup.

## License

[MIT](LICENSE)
