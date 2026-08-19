// chime：opencode 任务完成提示音（完成/提问/错误三音）
// host 半：事件入队 + webServer 轮询/调试路由；client 半负责浏览器播放。
export const name = 'chime'
export const inject = ['webServer', 'agents']

export function apply(ctx) {
  const running = new Map()
  const errored = new Map()
  const pending = []
  const recent = []

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
    console.error('[chime] init running failed', e)
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
    } catch (e) { console.error('[chime] status', e) }
  })
  ctx.on('agent/error', (payload) => {
    const id = idOf(payload && payload.agent)
    if (id) errored.set(id, true)
  })
  ctx.on('agent/disposed', (payload) => {
    const id = idOf(payload && payload.agent)
    if (id) { running.delete(id); errored.delete(id) }
  })

  // 提问音：提问工具开始执行时入队（弹窗出现即响）
  ctx.on('tools/execute', async (exec, next) => {
    try {
      if (exec && exec.name === 'ask_user_question') push('question')
    } catch (e) { console.error('[chime] tools/execute', e) }
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
