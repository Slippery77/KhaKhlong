import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const FRONTEND_INDEX = join(ROOT_DIR, 'frontend', 'dist', 'index.html');
const BACKEND_MAIN = join(ROOT_DIR, 'backend', 'dist', 'main.js');
const TOOLS_DIR = join(ROOT_DIR, '.tools');
const CLOUDFLARED_BIN = join(TOOLS_DIR, 'cloudflared.exe');

const args = new Set(process.argv.slice(2));
const forceBuild = args.has('--build');
const noOpen = args.has('--no-open');
const noTunnel = args.has('--no-tunnel');
const PORT = Number(process.env.PORT || 3000);

function getLanIps() {
  const nets = networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

function ensureBuild() {
  const needsBuild =
    forceBuild || !existsSync(FRONTEND_INDEX) || !existsSync(BACKEND_MAIN);
  if (!needsBuild) return;

  console.log('============================================================');
  console.log(' [1/3] กำลังเตรียมไฟล์ระบบ Production (Build Frontend & Backend)...');
  console.log('============================================================');
  execSync('npm run build', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
}

function resolveCloudflared() {
  if (existsSync(CLOUDFLARED_BIN)) {
    return CLOUDFLARED_BIN;
  }
  try {
    execSync('where.exe cloudflared', { stdio: 'ignore' });
    return 'cloudflared';
  } catch {
    console.log('============================================================');
    console.log(' กำลังดาวน์โหลด Cloudflare Tunnel (ทำครั้งแรกครั้งเดียว)...');
    console.log('============================================================');
    mkdirSync(TOOLS_DIR, { recursive: true });
    execSync(
      `curl.exe -sSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -o "${CLOUDFLARED_BIN}"`,
      { stdio: 'inherit' },
    );
    return CLOUDFLARED_BIN;
  }
}

function waitForServer(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolvePromise, rejectPromise) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/api`, (res) => {
        res.resume();
        resolvePromise();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          rejectPromise(new Error(`Server did not start within ${timeoutMs}ms`));
        } else {
          setTimeout(check, 400);
        }
      });
    };
    check();
  });
}

function openBrowser(url) {
  try {
    execSync(`cmd.exe /c start "" "${url}"`, { stdio: 'ignore' });
  } catch {
    // ignore if browser fails to launch automatically
  }
}

async function main() {
  ensureBuild();

  console.log('\n============================================================');
  console.log(' [2/3] กำลังเปิดเซิร์ฟเวอร์ ค้าคล่อง POS (Backend + Frontend)...');
  console.log('============================================================');

  const backendProc = spawn(process.execPath, ['dist/main.js'], {
    cwd: join(ROOT_DIR, 'backend'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
    },
    stdio: 'inherit',
  });

  let tunnelProc = null;
  const cleanup = () => {
    if (tunnelProc && !tunnelProc.killed) {
      tunnelProc.kill();
    }
    if (backendProc && !backendProc.killed) {
      backendProc.kill();
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  backendProc.on('exit', (code) => {
    console.error(`\n[POS Server] ปิดการทำงาน (exit code: ${code ?? 0})`);
    if (tunnelProc && !tunnelProc.killed) {
      tunnelProc.kill();
    }
    process.exit(code ?? 0);
  });

  await waitForServer(PORT);

  const lanIps = getLanIps();
  console.log('\n============================================================');
  console.log(' ระบบ ค้าคล่อง POS พร้อมใช้งานแล้ว!');
  console.log('------------------------------------------------------------');
  console.log(` 1) เครื่องแม่ข่าย (แคชเชียร์): http://localhost:${PORT}`);
  if (lanIps.length > 0) {
    for (const ip of lanIps) {
      console.log(` 2) เครื่องอื่นในวง Wi-Fi (LAN): http://${ip}:${PORT}`);
    }
  }
  console.log('============================================================\n');

  if (!noOpen) {
    openBrowser(`http://localhost:${PORT}`);
  }

  if (!noTunnel) {
    const cfBin = resolveCloudflared();
    console.log(' [3/3] กำลังสร้างลิงก์ HTTPS ผ่าน Cloudflare Tunnel...');
    tunnelProc = spawn(
      cfBin,
      ['tunnel', '--url', `http://127.0.0.1:${PORT}`, '--no-autoupdate'],
      {
        cwd: ROOT_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let announcedUrl = false;
    const handleOutput = (chunk) => {
      const text = chunk.toString('utf8');
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !announcedUrl) {
        announcedUrl = true;
        const publicUrl = match[0];
        console.log('\n************************************************************');
        console.log(' ลิงก์ HTTPS สำหรับมือถือ / แท็บเล็ต / ใช้งานจากที่ไหนก็ได้:');
        console.log(` >>> ${publicUrl} <<<`);
        console.log(' (รองรับติดตั้งแอป PWA + โหมด Offline + กล้องสแกนสลิป SlipOK ครบ 100%)');
        console.log('************************************************************\n');
      }
    };

    tunnelProc.stdout.on('data', handleOutput);
    tunnelProc.stderr.on('data', handleOutput);
    tunnelProc.on('error', (err) => {
      console.warn(
        `[Cloudflare Tunnel] ไม่สามารถเปิด Tunnel ได้ (ใช้งานผ่าน LAN ได้ตามปกติ): ${err.message}`,
      );
    });
  }
}

main().catch((err) => {
  console.error('เกิดข้อผิดพลาดในการเปิดระบบ:', err);
  process.exit(1);
});

