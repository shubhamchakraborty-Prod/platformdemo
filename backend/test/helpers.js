'use strict';
/* Shared test helpers: a random but valid answer set generator (B12 randomised profiles). */
const { SCREENS } = require('../src/questionnaire');

function rng(seed) { // mulberry32, so failures are reproducible
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function randomAnswers(rand) {
  const a = {};
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  SCREENS.forEach(sc => sc.qs.forEach(q => {
    if (q.showIf && !q.showIf(a)) return;
    const opts = (q.optionsFn ? q.optionsFn(a) : q.options || []).map(o => o[0]);
    if (q.type === 'text') { a[q.id] = pick(['Painter General', 'Plumber', 'Tailor']); return; }
    if (q.type === 'select' || q.type === 'single') { a[q.id] = pick(opts); return; }
    // multi and chips
    if (q.exclusive && rand() < 0.15) { a[q.id] = [q.exclusive]; return; }
    const pool = opts.filter(v => v !== q.exclusive).sort(() => rand() - 0.5);
    const n = 1 + Math.floor(rand() * Math.min(q.max || pool.length, pool.length));
    a[q.id] = pool.slice(0, n);
  }));
  if (rand() < 0.5) a.name = pick(['Asha', 'Ravi', 'Imran']);
  return a;
}

module.exports = { rng, randomAnswers };
