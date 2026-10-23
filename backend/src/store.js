'use strict';
/* File store (spec B10 stores, B13 storage). Sessions are keyed by random ID; answers and plan
   snapshots are encrypted at rest with AES-256-GCM; the optional first name lives in its own file;
   analytics events carry the session ID only. Swap for a database by keeping this interface. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadKey(dataDir, env) {
  if (env.DATA_KEY) {
    const k = Buffer.from(env.DATA_KEY, 'base64');
    if (k.length !== 32) throw new Error('DATA_KEY must be 32 bytes, base64-encoded');
    return k;
  }
  if (env.NODE_ENV === 'production') throw new Error('DATA_KEY is required in production');
  const f = path.join(dataDir, '.devkey');
  if (fs.existsSync(f)) return Buffer.from(fs.readFileSync(f, 'utf8').trim(), 'base64');
  const k = crypto.randomBytes(32);
  fs.writeFileSync(f, k.toString('base64'), { mode: 0o600 });
  if (!env.QUIET) console.warn(`[store] No DATA_KEY set. Generated a development key at ${f}. Set DATA_KEY in production.`);
  return k;
}

function makeStore({ dataDir, env = process.env, retentionDays = Number(env.RETENTION_DAYS) || 180 }) {
  ['', 'sessions', 'names', 'docs'].forEach(d => fs.mkdirSync(path.join(dataDir, d), { recursive: true }));
  const key = loadKey(dataDir, env);

  const seal = obj => {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const body = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64');
  };
  const open = txt => {
    const b = Buffer.from(txt, 'base64');
    const d = crypto.createDecipheriv('aes-256-gcm', key, b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
  };
  const writeAtomic = (file, data) => { const tmp = file + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, data, { mode: 0o600 }); fs.renameSync(tmp, file); };
  const safeId = id => typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id);
  const sessFile = id => path.join(dataDir, 'sessions', id + '.enc');
  const nameFile = id => path.join(dataDir, 'names', id + '.enc');

  const api = {
    /* small encrypted documents, e.g. the catalogue changes */
    read(name) { const f = path.join(dataDir, 'docs', name + '.enc'); return fs.existsSync(f) ? open(fs.readFileSync(f, 'utf8')) : null; },
    write(name, obj) { writeAtomic(path.join(dataDir, 'docs', name + '.enc'), seal(obj)); },

    createSession(data) {
      const id = crypto.randomUUID();
      api.saveSession(id, { ...data, createdAt: new Date().toISOString() });
      return id;
    },
    getSession(id) {
      if (!safeId(id) || !fs.existsSync(sessFile(id))) return null;
      try { return open(fs.readFileSync(sessFile(id), 'utf8')); } catch (e) { return null; }
    },
    saveSession(id, data) { writeAtomic(sessFile(id), seal({ ...data, updatedAt: new Date().toISOString() })); },
    getName(id) { return safeId(id) && fs.existsSync(nameFile(id)) ? open(fs.readFileSync(nameFile(id), 'utf8')).name : undefined; },
    setName(id, name) {
      if (!safeId(id)) return;
      if (name) writeAtomic(nameFile(id), seal({ name }));
      else if (fs.existsSync(nameFile(id))) fs.unlinkSync(nameFile(id));
    },
    deleteSession(id) { [sessFile(id), nameFile(id)].forEach(f => { if (safeId(id) && fs.existsSync(f)) fs.unlinkSync(f); }); },

    logEvent(ev) { fs.appendFileSync(path.join(dataDir, 'events.jsonl'), JSON.stringify({ ...ev, at: new Date().toISOString() }) + '\n'); },
    readEvents() {
      const f = path.join(dataDir, 'events.jsonl');
      return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
    },

    /* retention (B13): drop sessions untouched for longer than retentionDays */
    purge(now = Date.now()) {
      const cut = now - retentionDays * 864e5; let n = 0;
      fs.readdirSync(path.join(dataDir, 'sessions')).forEach(f => {
        const full = path.join(dataDir, 'sessions', f);
        if (fs.statSync(full).mtimeMs < cut) { api.deleteSession(f.replace(/\.enc$/, '')); n++; }
      });
      return n;
    },
  };
  return api;
}

module.exports = { makeStore };
