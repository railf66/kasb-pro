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

const server = http.createServer((req, res) => {
  let n = 0; for (const r of rooms.values()) n += r.players.size;
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
