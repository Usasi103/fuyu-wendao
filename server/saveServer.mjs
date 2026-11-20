import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = Number(process.env.SAVE_PORT || 3001);
const DATA_DIR = path.resolve(process.cwd(), 'data', 'saves');
fs.mkdirSync(DATA_DIR, { recursive: true });

function sanitizeAccountId(raw) {
  const clean = String(raw || '').trim();
  if (clean.length < 3 || clean.length > 64) return null;
  // 使用 SHA-256 映射到固定安全文件名，既支持中文道号+口令又防止路径穿越
  return crypto.createHash('sha256').update(clean).digest('hex').slice(0, 32);
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const urlPath = (req.url || '').split('?')[0];

  if (req.method === 'GET' && urlPath === '/api/health') {
    sendJson(res, 200, { ok: true, mode: 'cloud-save' });
    return;
  }

  const match = urlPath.match(/^\/api\/save\/([^/]+)$/);
  if (!match) {
    sendJson(res, 404, { error: 'Not Found' });
    return;
  }

  const rawKey = decodeURIComponent(match[1]);
  const fileHash = sanitizeAccountId(rawKey);
  if (!fileHash) {
    sendJson(res, 400, { error: '账号口令长度需在 3~64 个字符之间' });
    return;
  }

  const filePath = path.join(DATA_DIR, `${fileHash}.json`);

  if (req.method === 'GET') {
    if (!fs.existsSync(filePath)) {
      sendJson(res, 404, { exists: false });
      return;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      sendJson(res, 200, { exists: true, save: JSON.parse(content) });
    } catch {
      sendJson(res, 500, { error: '读取云端存档失败' });
    }
    return;
  }

  if (req.method === 'PUT') {
    let body = '';
    let aborted = false;
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 512 * 1024) {
        aborted = true;
        sendJson(res, 413, { error: '存档体积过大' });
        req.destroy();
      }
    });
    req.on('end', () => {
      if (aborted) return;
      try {
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed.realmTier !== 'number' || !parsed.resources) {
          sendJson(res, 400, { error: '无效的存档结构' });
          return;
        }
        const payload = { ...parsed, cloudUpdatedAt: Date.now() };
        const tmpPath = `${filePath}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(payload), 'utf-8');
        fs.renameSync(tmpPath, filePath);
        sendJson(res, 200, { ok: true, cloudUpdatedAt: payload.cloudUpdatedAt });
      } catch {
        sendJson(res, 400, { error: 'JSON 格式错误' });
      }
    });
    return;
  }

  sendJson(res, 405, { error: 'Method Not Allowed' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Fuyu-Wendao] Cloud Save API listening on http://0.0.0.0:${PORT}`);
});
