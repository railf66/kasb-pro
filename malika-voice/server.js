// Голос Малики для getyordamchi.uz (замена malika-voice.php, чтобы сайт мог жить на GitHub Pages).
//   POST ?a=tts  JSON {"text": "...", "lang": "ru|uz|en"}  -> audio/wav (голос Kore)
//   POST ?a=stt  multipart, поле "audio" (+ "mime")         -> JSON {"text": "..."}
//   POST ?a=clientlog JSON {"m": "..."}                     -> записывает строку в журнал
//   GET  ?a=log                                              -> последние ошибки
// Ключ Gemini берётся из переменной GEMINI_KEY (файл /etc/malika-voice.env), в браузер не попадает.
// Без внешних библиотек, работает на старых версиях Node.js.
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = +process.env.PORT || 8091;
const KEY = (process.env.GEMINI_KEY || '').trim();
const DATA = process.env.DATA_DIR || '/var/lib/malika-voice';
const VOICE = 'Kore';
const TTS_MODEL = process.env.TTS_MODEL || 'gemini-3.8-flash-tts';
const STT_MODEL = process.env.STT_MODEL || 'gemini-3.8-flash';
const MAX_TEXT = 700, MAX_AUDIO = 3000000, MAX_BODY = 3500000;
const RATE_LIMIT = 40, RATE_WINDOW = 600 * 1000;
const ALLOWED_HOSTS = ['getyordamchi.uz', 'www.getyordamchi.uz', 'railf66.github.io'];

try { fs.mkdirSync(DATA, { recursive: true }); } catch (e) {}
const LOG = path.join(DATA, 'errors.txt');

function logerr(msg) {
  const line = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' ' + msg + '\n';
  try {
    fs.appendFileSync(LOG, line);
    if (fs.statSync(LOG).size > 200000) fs.writeFileSync(LOG, fs.readFileSync(LOG, 'utf8').slice(-100000));
  } catch (e) {}
}

function hostOf(u) { try { return new URL(u).hostname.toLowerCase(); } catch (e) { return ''; } }

function cors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_HOSTS.indexOf(hostOf(origin)) >= 0) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}
function fail(res, a, code, msg) {
  logerr(a + ' ' + code + ' ' + msg);
  send(res, code, 'application/json; charset=utf-8', JSON.stringify({ error: msg }));
}

const hits = new Map();
function rateOk(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(function (t) { return t > now - RATE_WINDOW; });
  if (list.length >= RATE_LIMIT) { hits.set(ip, list); return false; }
  list.push(now); hits.set(ip, list); return true;
}
setInterval(function () {
  const now = Date.now();
  hits.forEach(function (l, ip) { if (!l.some(function (t) { return t > now - RATE_WINDOW; })) hits.delete(ip); });
}, 60000).unref();

function readBody(req, cb) {
  const chunks = []; let size = 0, done = false;
  req.on('data', function (c) {
    if (done) return;
    size += c.length;
    if (size > MAX_BODY) { done = true; cb(new Error('too big')); req.resume(); return; }
    chunks.push(c);
  });
  req.on('end', function () { if (!done) { done = true; cb(null, Buffer.concat(chunks)); } });
  req.on('error', function (e) { if (!done) { done = true; cb(e); } });
}

// Простой разбор multipart/form-data: возвращает {name: {data, type, filename}}
function parseMultipart(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!m) return {};
  const boundary = Buffer.from('--' + (m[1] || m[2]).trim());
  const out = {};
  let pos = buf.indexOf(boundary);
  while (pos >= 0) {
    let start = pos + boundary.length;
    if (buf.slice(start, start + 2).toString() === '--') break;
    start += 2; // \r\n
    const headEnd = buf.indexOf('\r\n\r\n', start);
    if (headEnd < 0) break;
    const head = buf.slice(start, headEnd).toString('utf8');
    const next = buf.indexOf(boundary, headEnd + 4);
    if (next < 0) break;
    const data = buf.slice(headEnd + 4, next - 2);
    const nm = /name="([^"]*)"/i.exec(head);
    const ct = /content-type:\s*([^\r\n]+)/i.exec(head);
    const fn = /filename="([^"]*)"/i.exec(head);
    if (nm) out[nm[1]] = { data: data, type: ct ? ct[1].trim() : '', filename: fn ? fn[1] : null };
    pos = next;
  }
  return out;
}

function gemini(model, body, cb) {
  const payload = Buffer.from(JSON.stringify(body));
  const req = https.request({
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/' + model + ':generateContent',
    method: 'POST',
    timeout: 60000,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY, 'Content-Length': payload.length },
  }, function (r) {
    const chunks = [];
    r.on('data', function (c) { chunks.push(c); });
    r.on('end', function () {
      const raw = Buffer.concat(chunks).toString('utf8');
      let data = null;
      try { data = JSON.parse(raw); } catch (e) {}
      if (r.statusCode !== 200 || !data) {
        const why = data && data.error && data.error.message ? data.error.message : raw;
        return cb(new Error('gemini ' + model + ' http ' + r.statusCode + ': ' + String(why).slice(0, 300)));
      }
      cb(null, data);
    });
  });
  req.on('timeout', function () { req.destroy(new Error('gemini ' + model + ' timeout')); });
  req.on('error', function (e) { cb(e); });
  req.end(payload);
}

function parts(data) {
  const c = data && data.candidates && data.candidates[0];
  return (c && c.content && c.content.parts) || [];
}

function tts(req, res, buf) {
  let input = {};
  try { input = JSON.parse(buf.toString('utf8')) || {}; } catch (e) {}
  let text = String(input.text || '').trim();
  text = text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}*_#>`]/gu, '');
  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return fail(res, 'tts', 400, 'empty text');
  if (Array.from(text).length > MAX_TEXT) text = Array.from(text).slice(0, MAX_TEXT).join('');
  const cache = path.join(DATA, 'tts_' + crypto.createHash('md5').update(VOICE + TTS_MODEL + text).digest('hex') + '.wav');
  if (fs.existsSync(cache)) return send(res, 200, 'audio/wav', fs.readFileSync(cache));
  gemini(TTS_MODEL, {
    contents: [{ parts: [{ text: text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
    },
  }, function (err, data) {
    if (err) return fail(res, 'tts', 502, err.message);
    const p = parts(data)[0];
    const b64 = p && p.inlineData && p.inlineData.data;
    if (!b64) return fail(res, 'tts', 502, 'no audio');
    let audio = Buffer.from(b64, 'base64');
    const mime = (p.inlineData.mimeType || '').toLowerCase();
    // Gemini отдаёт сырой PCM (audio/L16;rate=24000). PHP-версия отдавала его как есть;
    // здесь добавляем WAV-заголовок, если его нет, чтобы файл точно играл в браузере.
    if (audio.slice(0, 4).toString() !== 'RIFF' && mime.indexOf('wav') < 0) {
      const rm = /rate=(\d+)/.exec(mime);
      audio = wav(audio, rm ? +rm[1] : 24000);
    }
    try { fs.writeFileSync(cache, audio); } catch (e) {}
    send(res, 200, 'audio/wav', audio);
  });
}

function wav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

function stt(req, res, buf) {
  const form = parseMultipart(buf, req.headers['content-type']);
  const f = form.audio;
  if (!f || !f.data.length) return fail(res, 'stt', 400, 'no audio, content-length ' + (req.headers['content-length'] || '?'));
  if (f.data.length > MAX_AUDIO) return fail(res, 'stt', 413, 'audio too long');
  let mime = String((form.mime && form.mime.data.toString('utf8')) || f.type || 'audio/webm').replace(/;.*/, '').trim();
  if (!/^audio\/[a-z0-9.+-]+$/.test(mime)) mime = 'audio/webm';
  gemini(STT_MODEL, {
    contents: [{ parts: [
      { text: 'Transcribe this voice message from a website visitor exactly as spoken. It is in Russian, Uzbek or English. Write Uzbek in Latin script. Output only the transcribed text, nothing else. If there is no speech, output an empty string.' },
      { inlineData: { mimeType: mime, data: f.data.toString('base64') } },
    ] }],
    generationConfig: { temperature: 0 },
  }, function (err, data) {
    if (err) return fail(res, 'stt', 502, err.message);
    let text = '';
    parts(data).forEach(function (p) { if (!p.thought) text += p.text || ''; });
    if (!text.trim()) {
      const c = data.candidates && data.candidates[0];
      logerr('stt empty: mime ' + mime + ', size ' + f.data.length + ', finish ' + ((c && c.finishReason) || '?'));
    }
    send(res, 200, 'application/json; charset=utf-8', JSON.stringify({ text: text.trim() }));
  });
}

http.createServer(function (req, res) {
  const url = new URL(req.url, 'http://x');
  const a = url.searchParams.get('a') || '';
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (a === 'log' || (req.method === 'GET' && url.pathname === '/health')) {
    let lines = [];
    try { lines = fs.readFileSync(LOG, 'utf8').trim().split('\n').slice(-15); } catch (e) {}
    const info = 'key: ' + (KEY ? KEY.length + ' chars' : 'EMPTY') + ' | node ' + process.version + '\n\n';
    return send(res, 200, 'text/plain; charset=utf-8', a === 'log' ? info + (lines.length ? lines.join('\n') : 'no errors logged') + '\n' : 'ok\n');
  }
  if (req.method !== 'POST') return fail(res, a || '-', 405, 'POST only');
  if (!KEY) return fail(res, a, 500, 'GEMINI_KEY is empty');

  const from = req.headers.origin && req.headers.origin !== 'null' ? req.headers.origin : (req.headers.referer || '');
  if (ALLOWED_HOSTS.indexOf(hostOf(from)) < 0) return fail(res, a, 403, 'forbidden');

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'x').split(',')[0].trim();
  if (a !== 'clientlog' && !rateOk(ip)) return fail(res, a, 429, 'too many requests');

  readBody(req, function (err, buf) {
    if (err) return fail(res, a, 413, 'body: ' + err.message);
    if (a === 'tts') return tts(req, res, buf);
    if (a === 'stt') return stt(req, res, buf);
    if (a === 'clientlog') {
      let m = '';
      try { m = String((JSON.parse(buf.toString('utf8')) || {}).m || ''); } catch (e) {}
      logerr('client: ' + m.slice(0, 300));
      return send(res, 200, 'application/json', '{"ok":true}');
    }
    fail(res, a, 400, 'unknown action');
  });
}).listen(PORT, '127.0.0.1', function () { console.log('malika-voice on 127.0.0.1:' + PORT); });
