// Стальной двор — онлайн-сервер. Без внешних библиотек: только Node.js.
// Комнаты до 8 игроков, матч 5 минут, затем следующая карта.
'use strict';
const http = require('http');
const crypto = require('crypto');

const PORT = +process.env.PORT || 8090;
const MAPS = ['sklad', 'gorod', 'zavod'];
const MATCH_SEC = +process.env.MATCH_SEC || 300, BREAK_SEC = 8, MAX_PLAYERS = 8, TICK_MS = 80, MAX_HP = 100;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const rooms = new Map();
let nextRoom = 1, nextPlayer = 1;

function newRoom() {
  const r = { id: nextRoom++, players: new Map(), mi: 0, ends: Date.now() + MATCH_SEC * 1000, breakUntil: 0 };
  rooms.set(r.id, r); return r;
}
function pickRoom() {
  for (const r of rooms.values()) if (r.players.size < MAX_PLAYERS) return r;
  return newRoom();
}
const num = (v, lim = 1000) => (typeof v === 'number' && isFinite(v)) ? Math.max(-lim, Math.min(lim, v)) : 0;
const round2 = v => Math.round(v * 100) / 100;

// ---------- websocket (RFC 6455, minimal) ----------
function frame(str) {
  const data = Buffer.from(str);
  let head;
  if (data.length < 126) head = Buffer.from([0x81, data.length]);
  else if (data.length < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(data.length, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(data.length), 2); }
  return Buffer.concat([head, data]);
}
function send(p, obj) { if (!p.sock.destroyed) { try { p.sock.write(frame(JSON.stringify(obj))); } catch (e) {} } }
function broadcast(room, obj, except) {
  const f = frame(JSON.stringify(obj));
  for (const p of room.players.values()) if (p !== except && !p.sock.destroyed) { try { p.sock.write(f); } catch (e) {} }
}

// ---------- visit counter: /hit from the game page, /stats for the owner ----------
// stored in /var/tmp (writable for the service user, survives restarts and reboots)
const fs = require('fs');
const STATS_FILE = process.env.STATS_FILE || '/var/tmp/sd-game-stats.json';
const STATS_KEY_SHA = '2e20b1773f9bcd536af494a2c2cd699f329c671af1c34726819a075ae7679e42';
const SRC_NAMES = { yt: 'YouTube', tg: 'Telegram', ig: 'Instagram', tt: 'TikTok', fb: 'Facebook', kp: 'kasbpro.uz', web: 'Другие сайты', direct: 'Прямой заход' };
let stats = { days: {} }, statsDirty = false;
try { stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); if (!stats.days) stats.days = {}; } catch (e) {}
function saveStats() { if (!statsDirty) return; statsDirty = false; try { fs.writeFileSync(STATS_FILE + '.tmp', JSON.stringify(stats)); fs.renameSync(STATS_FILE + '.tmp', STATS_FILE); } catch (e) {} }
setInterval(saveStats, 20000);
process.on('SIGTERM', () => { saveStats(); process.exit(0); });
const dayKey = (t = Date.now()) => new Date(t + 5 * 3600e3).toISOString().slice(0, 10); // Tashkent date
const ipHits = new Map();
setInterval(() => ipHits.clear(), 60000);
function countHit(q, ip) {
  const c = (ipHits.get(ip) || 0) + 1; ipHits.set(ip, c); if (c > 20) return; // flood guard per IP per minute
  const e = q.get('e') === 'play' ? 'play' : 'open';
  let src = String(q.get('src') || 'direct').toLowerCase().replace(/[^a-z]/g, '').slice(0, 8); if (!SRC_NAMES[src]) src = 'web';
  const uniq = q.get('u') === '1';
  const d = stats.days[dayKey()] || (stats.days[dayKey()] = { open: 0, uniq: 0, play: 0, src: {} });
  const s = d.src[src] || (d.src[src] = { open: 0, uniq: 0, play: 0 });
  d[e]++; s[e]++; if (uniq && e === 'open') { d.uniq++; s.uniq++; }
  const keys = Object.keys(stats.days).sort(); while (keys.length > 120) delete stats.days[keys.shift()];
  statsDirty = true;
}
function statsPage(online) {
  const esc = v => String(v).replace(/[<>&]/g, '');
  const days = Object.keys(stats.days).sort().reverse().slice(0, 30);
  const tot = { open: 0, uniq: 0, play: 0 }, totSrc = {};
  for (const k of Object.keys(stats.days)) { const d = stats.days[k]; tot.open += d.open; tot.uniq += d.uniq; tot.play += d.play; for (const s in d.src) { const t = totSrc[s] || (totSrc[s] = { open: 0, uniq: 0, play: 0 }); t.open += d.src[s].open; t.uniq += d.src[s].uniq; t.play += d.src[s].play; } }
  const today = stats.days[dayKey()] || { open: 0, uniq: 0, play: 0, src: {} };
  const yt = (d) => (d.src && d.src.yt) ? d.src.yt.uniq : 0;
  const srcRows = (src) => Object.keys(src).sort((a, b) => src[b].uniq - src[a].uniq).map(s => `<tr><td>${esc(SRC_NAMES[s] || s)}</td><td>${src[s].uniq}</td><td>${src[s].open}</td><td>${src[s].play}</td></tr>`).join('') || '<tr><td colspan=4>пока нет</td></tr>';
  const dayRows = days.map(k => { const d = stats.days[k]; return `<tr><td>${k.slice(8)}.${k.slice(5, 7)}</td><td>${d.uniq}</td><td>${d.open}</td><td>${d.play}</td><td>${yt(d)}</td></tr>`; }).join('') || '<tr><td colspan=5>пока нет</td></tr>';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Стальной двор: статистика</title>
<style>body{font:15px system-ui,sans-serif;margin:0;padding:14px;background:#0b0f14;color:#e8edf2}h1{font-size:19px;margin:0 0 10px}h2{font-size:16px;margin:20px 0 6px}
.cards{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.c{background:#18202a;border-radius:12px;padding:10px}.c b{display:block;font-size:26px}.c span{font-size:12px;opacity:.7}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:6px 4px;border-bottom:1px solid #253040;text-align:right}td:first-child,th:first-child{text-align:left}th{font-size:12px;opacity:.7;font-weight:600}
p{font-size:12px;opacity:.6}</style></head><body>
<h1>Стальной двор · статистика</h1>
<div class="cards"><div class="c"><b>${today.uniq}</b><span>человек сегодня</span></div><div class="c"><b>${yt(today)}</b><span>из них с YouTube</span></div>
<div class="c"><b>${today.play}</b><span>начали играть сегодня</span></div><div class="c"><b>${online}</b><span>сейчас в онлайн-режиме</span></div></div>
<h2>Сегодня по источникам</h2><table><tr><th>Откуда</th><th>Людей</th><th>Заходов</th><th>Игр</th></tr>${srcRows(today.src)}</table>
<h2>По дням</h2><table><tr><th>День</th><th>Людей</th><th>Заходов</th><th>Игр</th><th>YouTube</th></tr>${dayRows}</table>
<h2>За всё время</h2><table><tr><th>Откуда</th><th>Людей</th><th>Заходов</th><th>Игр</th></tr>${srcRows(totSrc)}<tr><td><b>Всего</b></td><td><b>${tot.uniq}</b></td><td><b>${tot.open}</b></td><td><b>${tot.play}</b></td></tr></table>
<p>«Людей» — сколько разных телефонов/компьютеров открыли игру за день. «Заходов» — сколько раз открывали. «Игр» — сколько раз нажали «Играть». Время ташкентское. Обновите страницу, чтобы увидеть свежие цифры.</p>
</body></html>`;
}

const server = http.createServer((req, res) => {
  let n = 0; for (const r of rooms.values()) n += r.players.size;
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/hit') {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    countHit(u.searchParams, ip);
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); res.end(); return;
  }
  if (u.pathname === '/stats') {
    const k = crypto.createHash('sha256').update(String(u.searchParams.get('k') || '')).digest('hex');
    if (k !== STATS_KEY_SHA) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Нет доступа\n'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(statsPage(n)); return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end('Стальной двор: сервер работает. Игроков онлайн: ' + n + '\n');
});

server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  sock.setNoDelay(true);
  const p = { id: nextPlayer++, sock, room: null, name: 'Игрок', x: 0, y: 0, z: 0, yaw: 0, pitch: 0, w: 0, mv: 0, hp: MAX_HP, alive: true, kills: 0, deaths: 0, last: Date.now(), healAt: 0, msgs: 0, msgWin: Date.now() };
  let buf = Buffer.alloc(0);
  sock.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    if (buf.length > 65536) { sock.destroy(); return; }
    while (buf.length >= 2) {
      const op = buf[0] & 0x0f, masked = buf[1] & 0x80; let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { sock.destroy(); return; }
      if (!masked || len > 8192) { sock.destroy(); return; }
      if (buf.length < off + 4 + len) return;
      const mask = buf.slice(off, off + 4), data = Buffer.alloc(len);
      for (let i = 0; i < len; i++) data[i] = buf[off + 4 + i] ^ mask[i & 3];
      buf = buf.slice(off + 4 + len);
      if (op === 8) { sock.end(Buffer.from([0x88, 0])); return; }
      if (op === 9) { sock.write(Buffer.concat([Buffer.from([0x8a, data.length]), data])); continue; }
      if (op === 1) { let m; try { m = JSON.parse(data.toString()); } catch (e) { continue; } onMessage(p, m); }
    }
  });
  const bye = () => leave(p);
  sock.on('close', bye); sock.on('error', bye); sock.on('end', bye);
});

// ---------- game logic ----------
function snapshot(r) {
  return [...r.players.values()].map(q => [q.id, round2(q.x), round2(q.y), round2(q.z), round2(q.yaw), round2(q.pitch), q.w, q.alive ? 1 : 0, q.mv]);
}
function scores(r) { return [...r.players.values()].map(q => ({ id: q.id, n: q.name, k: q.kills, d: q.deaths })).sort((a, b) => b.k - a.k || a.d - b.d); }

function onMessage(p, m) {
  p.last = Date.now();
  if (p.last - p.msgWin > 1000) { p.msgWin = p.last; p.msgs = 0; }
  if (++p.msgs > 60) return; // flood guard
  const r = p.room;
  switch (m.t) {
    case 'join': {
      if (r) return;
      p.name = String(m.n || 'Игрок').replace(/[<>&"']/g, '').trim().slice(0, 16) || 'Игрок';
      const room = pickRoom(); p.room = room; room.players.set(p.id, p);
      send(p, { t: 'welcome', id: p.id, map: MAPS[room.mi], left: Math.max(0, room.ends - Date.now()), brk: room.breakUntil > Date.now(), players: [...room.players.values()].map(q => ({ id: q.id, n: q.name })), sc: scores(room) });
      broadcast(room, { t: 'pj', id: p.id, n: p.name }, p);
      break;
    }
    case 's': if (!r) return;
      p.x = num(m.x, 60); p.y = num(m.y, 10); p.z = num(m.z, 60); p.yaw = num(m.yaw, 100); p.pitch = num(m.p, 3); p.w = (m.w | 0) & 7; p.mv = m.mv ? 1 : 0;
      break;
    case 'shot': if (!r || !p.alive || !Array.isArray(m.a) || m.a.length !== 6) return;
      broadcast(r, { t: 'shot', id: p.id, a: m.a.map(v => round2(num(v, 200))), k: (m.k | 0) & 7 }, p);
      break;
    case 'proj': if (!r || !p.alive || !Array.isArray(m.a) || m.a.length !== 6) return;
      broadcast(r, { t: 'proj', id: p.id, a: m.a.map(v => round2(num(v, 200))), k: (m.k | 0) & 7 }, p);
      break;
    case 'hit': {
      if (!r || r.breakUntil > Date.now()) return;
      const v = r.players.get(m.v | 0);
      if (!v || !v.alive || (!p.alive && v !== p)) return;
      const d = Math.max(0, Math.min(250, num(m.d, 250)));
      v.hp -= d;
      send(v, { t: 'hp', hp: Math.max(0, Math.round(v.hp)), by: p.id });
      if (v.hp <= 0) {
        v.alive = false; v.deaths++; if (v !== p) p.kills++;
        broadcast(r, { t: 'kill', k: p.id, v: v.id, h: m.h ? 1 : 0, sc: scores(r) });
        setTimeout(() => { if (!r.players.has(v.id)) return; v.hp = MAX_HP; v.alive = true; broadcast(r, { t: 'resp', id: v.id }); }, 3000);
      }
      break;
    }
    case 'heal': if (!r || !p.alive || Date.now() < p.healAt) return;
      p.healAt = Date.now() + 8000; p.hp = Math.min(MAX_HP, p.hp + 40); send(p, { t: 'hp', hp: Math.round(p.hp), by: 0 });
      break;
  }
}
function leave(p) {
  const r = p.room; if (!r || !r.players.has(p.id)) return;
  r.players.delete(p.id); broadcast(r, { t: 'pl', id: p.id, sc: scores(r) });
  if (!r.players.size) rooms.delete(r.id);
  try { p.sock.destroy(); } catch (e) {}
}

setInterval(() => {
  const now = Date.now();
  for (const r of rooms.values()) {
    for (const p of r.players.values()) if (now - p.last > 15000) leave(p);
    if (!r.players.size) continue;
    if (!r.breakUntil && now > r.ends) {
      r.breakUntil = now + BREAK_SEC * 1000;
      broadcast(r, { t: 'end', sc: scores(r), next: MAPS[(r.mi + 1) % MAPS.length] });
    } else if (r.breakUntil && now > r.breakUntil) {
      r.breakUntil = 0; r.mi = (r.mi + 1) % MAPS.length; r.ends = now + MATCH_SEC * 1000;
      for (const p of r.players.values()) { p.kills = 0; p.deaths = 0; p.hp = MAX_HP; p.alive = true; }
      broadcast(r, { t: 'map', map: MAPS[r.mi], left: MATCH_SEC * 1000, sc: scores(r) });
    }
    broadcast(r, { t: 'st', p: snapshot(r) });
  }
}, TICK_MS);

server.listen(PORT, '127.0.0.1', () => console.log('Стальной двор: сервер на порту ' + PORT));
