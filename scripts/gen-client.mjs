// 生成 dsh-chime bundle 的 client half：下载原始 mp3 -> base64 注入 -> 写 lib/client.js
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'client.js')
const FILES = {
  done: 'bip-bop-01.mp3',
  question: 'yup-01.mp3',
  error: 'nope-03.mp3',
}

const lines = []
lines.push('window.__ModuleLoader__.load({ id: "dsh-chime", factory: (require) => { var module = { exports: {} }; var exports = module.exports;')
lines.push('')
lines.push('const SOUNDS = {')
for (const [key, file] of Object.entries(FILES)) {
  const url = `https://api.github.com/repos/sst/opencode/contents/packages/ui/src/assets/audio/${file}`
  const res = await fetch(url, { headers: { 'User-Agent': 'dsh-agent', 'Accept': 'application/vnd.github.raw+json' } })
  if (!res.ok) throw new Error(`download ${file} failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const full = 'data:audio/mpeg;base64,' + buf.toString('base64')
  console.log(key, file, buf.length, 'bytes, dataUrl', full.length, 'chars')
  lines.push(`  ${key}: '${full.slice(0, 1000)}' +`)
  for (let i = 1000; i < full.length; i += 1500) {
    const chunk = full.slice(i, i + 1500)
    lines.push(`    '${chunk}'${i + 1500 >= full.length ? '' : ' +'}`)
  }
  lines.push('  ,')
}
lines.push('}')
lines.push('let el = null')
lines.push('function play(name) {')
lines.push('  const src = SOUNDS[name]')
lines.push('  if (!src) return')
lines.push('  try {')
lines.push(`    if (typeof Audio === 'undefined') return`)
lines.push('    if (!el) el = new Audio()')
lines.push('    el.src = src')
lines.push('    el.volume = 1')
lines.push('    const p = el.play()')
lines.push(`    if (p && typeof p.catch === 'function') p.catch(() => {})`)
lines.push('  } catch (e) { console.error(\'[chime] play failed\', e) }')
lines.push('}')
lines.push('function apply(ctx) {')
lines.push('  ctx.effect(() => {')
lines.push('    const iv = setInterval(() => {')
lines.push(`      fetch('/chime/poll').then((r) => r.json()).then((res) => {`)
lines.push('        if (res && Array.isArray(res.sounds)) {')
lines.push('          for (const s of res.sounds) play(s)')
lines.push('        }')
lines.push('      }).catch(() => {})')
lines.push('    }, 250)')
lines.push('    return () => clearInterval(iv)')
lines.push("  }, 'chime: poll player')")
lines.push('}')
lines.push('exports.apply = apply')
lines.push('')
lines.push('return exports; } });')

const out = lines.join('\n')
await fs.writeFile(OUT, out, 'utf8')
console.log('written', OUT, 'chars:', out.length)
