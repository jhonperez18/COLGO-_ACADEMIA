#!/usr/bin/env node
/** Libera un puerto TCP antes de `npm run dev` (evita EADDRINUSE en 3001). */
import { execSync } from 'node:child_process'

const port = String(process.argv[2] || '3001').trim()

function freePortWin32(p) {
  let out = ''
  try {
    out = execSync(`netstat -ano | findstr :${p}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
  } catch {
    return
  }
  const pids = new Set()
  for (const line of out.split(/\r?\n/)) {
    if (!/LISTENING/i.test(line)) continue
    const parts = line.trim().split(/\s+/)
    const pid = parts[parts.length - 1]
    if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid)
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
      console.log(`[free-port] Proceso ${pid} liberó el puerto ${p}`)
    } catch {
      /* ya cerrado */
    }
  }
}

function freePortUnix(p) {
  try {
    execSync(`lsof -ti tcp:${p} | xargs -r kill -9`, { stdio: 'ignore', shell: true })
    console.log(`[free-port] Puerto ${p} liberado`)
  } catch {
    /* nada escuchando */
  }
}

if (process.platform === 'win32') freePortWin32(port)
else freePortUnix(port)
