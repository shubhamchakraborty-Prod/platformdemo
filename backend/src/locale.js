'use strict';
/* Learner-visible text for one language. Same rules as the prototype UI helpers,
   without the DOM: every string a plan or config response shows goes through here. */
const { SKILLS, GOALS, CATEGORY } = require('./data');
const { SECTIONS } = require('./questionnaire');
const { UI, SECTION_INTRO, HI } = require('./i18n');

const LANGS_SUPPORTED = ['en', 'hi'];

function makeLocale(lang) {
  const L = LANGS_SUPPORTED.includes(lang) ? lang : 'en';
  const hi = L === 'hi';
  const t = (key, vars) => {
    let v = (UI[L] || UI.en)[key];
    if (v === undefined) v = UI.en[key];
    if (vars && typeof v === 'string') Object.entries(vars).forEach(([k, x]) => { v = v.split('{' + k + '}').join(x); });
    return v;
  };
  const HQ = q => (hi ? HI.q[q.id] || {} : {});
  const listJoin = a => (a.length <= 1 ? a[0] || '' : a.slice(0, -1).join(', ') + t('andWord') + a[a.length - 1]);
  const langName = l => (hi ? HI.langs[l] || l : l);
  const optText = (q, v, label) => {
    if (!hi) return label;
    if (q.id === 'trade') return HI.trades[v] || label;
    if (q.id === 'speak' || q.id === 'read') return HI.langs[v] || label;
    return (HQ(q).o || {})[v] || label;
  };
  const nsqfText = n => (hi ? n.replace('NSQF to be confirmed', 'NSQF तय होना बाकी').replace('(proposed)', '(प्रस्तावित)') : n);
  const diffLabel = d => (d <= 2 ? t('diff_beg') : d === 3 ? t('diff_mid') : t('diff_adv'));
  return {
    lang: L, hi, t, listJoin, langName, optText, nsqfText, diffLabel,
    qText: q => HQ(q).q || q.q,
    qHint: q => HQ(q).hint || q.hint,
    qPh: q => HQ(q).ph || q.placeholder,
    sceneWho: q => HQ(q).who || q.scene.who,
    sceneText: q => HQ(q).text || q.scene.text, // English-reading items keep English text on purpose (A6)
    secName: i => (hi ? HI.sections[i] : SECTIONS[i]),
    secIntro: i => ((hi && SECTION_INTRO.hi) ? SECTION_INTRO.hi[i] : (SECTION_INTRO.en || {})[i]),
    screenTitle: sc => (hi ? HI.screens[sc.key] || sc.title : sc.title),
    catName: c => (hi ? HI.cat[c.category] || CATEGORY[c.category].label : CATEGORY[c.category].label),
    skillName: s => (hi ? HI.skill[s] || SKILLS[s].label : SKILLS[s].label),
    goalLabel: g => (hi ? (HI.q.goals.o || {})[g] || GOALS[g].label : GOALS[g].label),
    oneLiner: c => (hi ? (HI.course[c.id] || {}).one || (c.i18n && c.i18n.hi && c.i18n.hi.one) || c.oneLiner : c.oneLiner),
    levelText: c => (/to be confirmed/i.test(c.nsqf) ? diffLabel(c.difficulty) : diffLabel(c.difficulty) + ', ' + nsqfText(c.nsqf)),
    weeks: (c, p) => Math.max(1, Math.ceil(c.hours / p.weekly)),
  };
}

module.exports = { makeLocale, LANGS_SUPPORTED };
