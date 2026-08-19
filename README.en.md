[English](README.en.md) | [中文](README.md)

# dsh-chime

<p align="center"><sub><i>opencode task-completion chime for DeepSeek Harness · zero external dependencies · plays in the browser</i></sub></p>

Replicates opencode's task-completion chime inside DeepSeek Harness: a crisp
notification sound when a turn finishes, when the agent asks you a question,
or when a turn ends in error. All three sounds are the **original mp3 files
from the opencode repository**, embedded losslessly (base64 inside the client
bundle). The plugin is fully self-contained.

## How it works

1. **Host half** (Cordis bundle entry) listens to `agent/status` (a `running →
   idle` transition means a turn finished; error-marked turns play the error
   sound) and `tools/execute` (queues the question sound the moment the
   `ask_user_question` tool starts), enqueueing sounds as needed;
2. **webServer routes**: `/chime/poll` serves the pending queue,
   `/chime/debug` exposes status and a listen-through entry;
3. **Client half** (browser) polls `/chime/poll` every 250 ms and plays the
   embedded base64 sources via `Audio`.

## Sounds

| Sound | Trigger | Source (original opencode) |
|---|---|---|
| done | a turn finishes | `bip-bop-01.mp3` |
| question | the question dialog appears | `yup-01.mp3` |
| error | a turn ends in error | `nope-03.mp3` |

## Install

```sh
dsh plugin --profile web add dsh-chime
```

**Restart dsh web** after install (the client channel is scanned at startup).

## Usage

Nothing to do — it just works (host-level: all agents/sessions). Listen and
debug:

```
GET http://127.0.0.1:3080/chime/debug            # status (recent / pending / runningCount)
GET http://127.0.0.1:3080/chime/debug?play=done  # listen (done | question | error)
```

## Plugin management

Manage installed plugins with the thin console from plugin-registry (browser
panel): bundle stack + insert lines + enable/disable, no manual config edits.
Install: `dsh plugin --profile web add <plugin-registry>/packages/plugin/console`

## License

MIT
