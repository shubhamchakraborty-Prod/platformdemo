#!/usr/bin/env node
'use strict';
const path = require('path');
const { createServer } = require('../src/server');

const port = Number(process.env.PORT) || 8787;
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const server = createServer({ dataDir });

// retention purge on start and daily (spec B13)
const purge = () => { const n = server.app.store.purge(); if (n) console.log(`[store] purged ${n} expired sessions`); };
purge(); setInterval(purge, 864e5).unref();

server.listen(port, () => console.log(`Course Finder API on http://localhost:${port} (engine ${server.app.versions().engine_version}, catalogue ${server.app.versions().catalogue_version})`));
