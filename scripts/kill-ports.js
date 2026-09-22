import { execSync } from 'node:child_process';

const PORTS = [4000];

for (const port of PORTS) {
  try {
    if (process.platform === 'win32') {
      const out = execSync('netstat -aon', { encoding: 'utf8' });
      const lines = out.split('\n').filter(l => l.includes(`:${port} `) && l.includes('LISTENING'));
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0') {
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            console.log(`[predev] Freed port ${port} (killed PID ${pid})`);
          } catch {}
        }
      }
    } else {
      try {
        execSync(`lsof -ti:${port} | xargs -r kill -9 2>/dev/null`, { stdio: 'ignore' });
      } catch {}
    }
  } catch {}
}
