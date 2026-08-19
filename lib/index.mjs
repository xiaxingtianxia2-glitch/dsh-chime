/**
 * dsh-chime — opencode 任务完成提示音（完成/提问/错误三音）。
 *
 * 原理
 * ----
 * 1. 监听 agent/status：一轮 running→idle 即完成（入队完成音）；期间发生过
 *    agent/error 的轮次播错误音而非完成音。
 * 2. 监听 tools/execute：ask_user_question 提问工具开始执行即入队提问音
 *    （弹窗出现瞬间响起；tools/result 在回答后才触发，时机太晚）。
 * 3. webServer 路由：/chime/poll 提供待播队列（client 每 250ms 轮询取走），
 *    /chime/debug 提供状态与试听入口（?play=done|question|error）。
 * 4. 音频为 opencode 仓库原始 mp3，base64 内嵌于 client（lib/client.js，
 *    由 scripts/gen-client.mjs 生成），零外部依赖。
 *
 * 形态
 * ----
 * 标准 DSH bundle 插件：`dsh plugin --profile web add dsh-chime` 安装，重启
 * web 生效。host 级监听——所有 agent/会话（含子代理）完成都会响。
 *
 * 注意
 * ----
 * 插件激活时各 agent 可能已在 running（running 事件已错过），须用
 * agents.list() 初始化 running 状态，否则当轮 idle 的 wasRunning 检查失败、
 * 完成音不触发。
 */
export const name = 'dsh-chime'
export const inject = ['webServer', 'agents']

export function apply(ctx) {
  const running = new Map()
  const errored = new Map()
  const pending = []
  const recent = []
  const logger = ctx.logger
  const error = (msg, ...args) => { if (logger?.error) logger.error('[dsh-chime] ' + msg, ...args); else console.error('[dsh-chime]', msg, ...args) }

  const idOf = (agent) => {
    if (!agent || typeof agent !== 'object') return null
    const v = agent.id ?? agent.sessionId
    return typeof v === 'string' && v ? v : null
  }

  const push = (sound) => {
    pending.push({ sound, at: Date.now() })
    recent.push(sound)
    if (recent.length > 30) recent.shift()
    if (pending.length > 30) pending.splice(0, pending.length - 30)
  }

  // 激活时初始化 running 状态：host 级插件激活时各 agent 可能已在 running，
  // running 事件已错过；不初始化则本轮 idle 的 wasRunning 检查失败 -> 完成音不触发。
  try {
    for (const a of ctx.agents.list()) {
      const aid = idOf(a)
      if (aid) running.set(aid, true)
    }
  } catch (e) {
    error('init running failed', e)
  }

  // 完成音/错误音：任意 agent 一轮结束（host 级收到所有 agent 的事件）
  ctx.on('agent/status', (payload) => {
    try {
      const id = idOf(payload && payload.agent)
      const status = payload && payload.status
      if (!id || !status) return
      if (status === 'running') {
        running.set(id, true)
        errored.delete(id)
      } else if (status === 'idle' && running.get(id)) {
        running.delete(id)
        const sound = errored.get(id) ? 'error' : 'done'
        errored.delete(id)
        push(sound)
      }
    } catch (e) { error('status', e) }
  })
  ctx.on('agent/error', (payload) => {
    const id = idOf(payload && payload.agent)
    if (id) errored.set(id, true)
  })
  ctx.on('agent/disposed', (payload) => {
    const id = idOf(payload && payload.agent)
    if (id) { running.delete(id); errored.delete(id) }
  })

  // 提问音/计划待审音：提问工具或计划提交工具开始执行时入队（弹窗出现即响）
  ctx.on('tools/execute', async (exec, next) => {
    try {
      const n = exec && exec.name
      if (n === 'ask_user_question' || n === 'exit_plan_mode') push('question')
    } catch (e) { error('tools/execute', e) }
    return next()
  })

  // 轮询路由：client 每 250ms 取待播队列
  ctx.webServer.register({
    kind: 'exact',
    path: '/chime/poll',
    handler: (req, res) => {
      if (!pending.length) {
        res.setHeader('Content-Type', 'application/json')
        res.end('{"sounds":[]}')
        return
      }
      const now = Date.now()
      const fresh = pending.filter((p) => now - p.at <= 15000)
      pending.length = 0
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ sounds: fresh.map((p) => p.sound) }))
    },
  })

  // 调试/试听路由：/chime/debug 看状态；?play=done|question|error 试听
  ctx.webServer.register({
    kind: 'exact',
    path: '/chime/debug',
    handler: (req, res) => {
      let play = null
      const q = (req.url || '').split('?')[1]
      if (q) {
        const m = q.match(/play=([a-z_]+)/)
        if (m && ['done', 'question', 'error'].includes(m[1])) play = m[1]
      }
      if (play) push(play)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ pendingCount: pending.length, recent, runningCount: running.size }))
    },
  })
}
