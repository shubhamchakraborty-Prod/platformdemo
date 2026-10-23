'use strict';
/* Spec B3-B8 engine.
   Ported unchanged from the Course Finder reference prototype (artifact "Swift AI Academy - Find your courses (ITI)", version 1791439992-5d3c).
   Spec: ITI Course Finder - Product and Technical Specification (7 Oct 2026). */

/* ============ ENGINE: generic, metadata-driven. No course IDs appear in this file. ============ */

/* ---- 1. Evidence rules: answers -> skills held. One rule per skill; questions never reference courses. ---- */
const has = (arr, v) => Array.isArray(arr) && arr.includes(v);
const nonFun = a => (a.aiPurpose||[]).filter(x=>x!=='fun');
const EVIDENCE = {
  phone_typing:   a => a.phone && a.phone!=='none' && has(a.phoneDone,'msg'),
  file_sharing:   a => has(a.phoneDone,'pdf'),
  web_search:     a => has(a.phoneDone,'search'),
  online_forms:   a => has(a.phoneDone,'form') || has(a.commDone,'jobform'),
  email_use:      a => has(a.phoneDone,'email') || has(a.computerDone,'email') || has(a.commDone,'email'),
  computer_basics:a => a.computerUse==='often' || (a.computerUse==='few' && (a.computerDone||[]).some(x=>x!=='none')),
  doc_typing:     a => has(a.computerDone,'doc'),
  spreadsheet:    a => has(a.computerDone,'sheet'),
  slides:         a => has(a.computerDone,'slides'),
  coding_basics:  a => has(a.computerDone,'code'),
  design_tools:   a => has(a.computerDone,'design') || has(a.computerDone,'cad'),
  ai_aware:       a => a.aiUsed==='yes' || has(a.interests,'ai'),
  ai_first_use:   a => a.aiUsed==='yes',
  ai_prompting:   a => a.aiUsed==='yes' && ['month','week'].includes(a.aiFreq) && nonFun(a).length>=2,
  ai_verification:a => a.aiUsed==='yes' && a.aiCheck==='check',
  ai_task_use:    a => a.aiUsed==='yes' && (a.aiFreq==='week' || (a.aiFreq==='month' && has(a.aiPurpose,'trade'))) && nonFun(a).length>=2,
  ai_safety:      a => a.aiUsed==='yes' && a.aiFreq==='week' && a.aiCheck==='check' && a.scam==='check',
  ai_method:      a => a.aiUsed==='yes' && a.aiFreq==='week' && nonFun(a).length>=3 && a.aiCheck==='check',
  eng_basic:      a => ['many','few'].includes(a.introEnglish) || has(a.speak,'English'),
  eng_instructions:a=> ['reply_en','reply_own'].includes(a.scenarioInstr),
  eng_reading:    a => a.readNotice==='tuesday',
  eng_forms_writing:a=> has(a.commDone,'letter') || has(a.commDone,'jobform') || has(a.commDone,'email'),
  trade_talk:     a => a.scenarioInstr==='reply_en' && (has(a.commDone,'explain') || a.workExp==='job' || a.itiStatus==='apprentice'),
  customer_talk:  a => a.customerReply==='b' && (has(a.commDone,'customers') || a.workExp!=='none'),
  job_cards_logs: a => has(a.commDone,'diary'),
  email_writing:  a => has(a.commDone,'email'),
  interview_skills:a=> a.interviews==='many',
  gd_skills:      a => has(a.commDone,'gd'),
  spoken_clarity: a => has(a.commDone,'talk'),
  cv_writing:     a => has(a.commDone,'cv') || has(a.aiPurpose,'cv'),
  team_instructions:a=> has(a.commDone,'lead') && a.scenarioInstr==='reply_en',
  reporting_upward:a=> has(a.commDone,'lead') && a.scenarioInstr==='reply_en' && a.workExp==='job'
};

/* ---- 2. Scoring weights: one config object, tuned once, applied to every course ---- */
const WEIGHTS = { goal:0.30, level:0.20, unlock:0.12, interest:0.12, urgency:0.10, trade:0.06, lang:0.05, time:0.05 };
const START_DOMAIN = 'ai';          // set to null to let any domain lead
const BONUS = { risk:0.12, access:0.10, gateway:0.08, seriesOrder:0.10 };
const LADDER_PASS = 0.6;         // share of a rung's skills a learner must hold to be placed above it
const DEFAULT_MIN_RELEVANCE = 0.25;
const WEEKLY_HOURS = {low:1.5, mid:4, high:6};

function makeEngine(D){
  const {SKILLS,GOALS,TRADES,EDU_RANK} = D;
  let COURSES = D.COURSES.slice();

  /* ---- Knowledge graph: derived from metadata on every load ---- */
  function buildGraph(){
    const teachersOf = {};                 // skill -> courses that teach it
    COURSES.forEach(c=>c.teaches.forEach(s=>(teachersOf[s]=teachersOf[s]||[]).push(c.id)));
    const edges = [];                      // {from, to, via:skill, type}
    COURSES.forEach(b=>{
      const req = [...b.prereq.all, ...b.prereq.any];
      req.forEach(s=>(teachersOf[s]||[]).forEach(aid=>{ if(aid!==b.id) edges.push({from:aid,to:b.id,via:s,type:'LEADS_TO'}); }));
    });
    // ladder tracks: rung -> courses
    const tracks = {};
    COURSES.filter(c=>c.ladder).forEach(c=>{ const t=(tracks[c.ladder.track]=tracks[c.ladder.track]||{}); (t[c.ladder.rung]=t[c.ladder.rung]||[]).push(c); });
    // goal links through skills
    const goalLinks = [];
    COURSES.forEach(c=>Object.entries(GOALS).forEach(([g,G])=>{ const hit=c.teaches.filter(s=>G.needs.includes(s)); if(hit.length) goalLinks.push({course:c.id, goal:g, via:hit}); }));
    const orphanSkills = Object.keys(SKILLS).filter(s=>!teachersOf[s]);
    return {teachersOf, edges, tracks, goalLinks, orphanSkills};
  }
  let G = buildGraph();

  /* ---- Learner profile ---- */
  function buildProfile(a){
    const skills = new Set(Object.entries(EVIDENCE).filter(([s,f])=>{ try{return !!f(a);}catch(e){return false;} }).map(([s])=>s));
    const trade = TRADES.find(t=>t.id===a.trade) || {id:'other',label:a.tradeOther||'Other',group:'other'};
    const tradeLabel = a.trade==='other' ? (a.tradeOther||'your trade') : trade.label;
    const goalIds = (a.goals||[]).slice();
    if(has(a.interests,'lead')) goalIds.push('lead_team');
    const goalList = goalIds.map((g,i)=>({id:g, w: GOALS[g].implicit ? 0.6 : [1,0.85,0.7][i]||0.6}));
    const interests = new Set((a.interests||[]).filter(x=>x!=='none'));
    if(a.workType==='computers') interests.add('computers');
    if(a.workType==='people') interests.add('customers');
    if(a.workType==='machines') interests.add('repair');
    if(has(a.goals,'tech_career')) interests.add('computers');
    const readLangs = (a.read||[]);
    const prefLangs = a.learnLang==='Both' ? ['English','Hindi'] : a.learnLang==='Regional' ? readLangs.filter(l=>!['English','Hindi'].includes(l)) : [a.learnLang];
    const p = {a, skills, trade:trade.id, tradeGroup:trade.group, tradeLabel, goalList, interests, readLangs, prefLangs,
               weekly: WEEKLY_HOURS[a.weeklyTime]||3};
    p.levels = {};
    Object.keys(G.tracks).forEach(t=>p.levels[t]=trackLevel(t, skills));
    p.labels = describe(p);
    p.commNeeds = commNeeds(p);
    return p;
  }

  // Level on a track = first rung whose taught skills the learner does not mostly hold
  function trackLevel(track, skills){
    const rungs = Object.keys(G.tracks[track]).map(Number).sort((x,y)=>x-y);
    for(const r of rungs){
      const taught = [...new Set(G.tracks[track][r].flatMap(c=>c.teaches))];
      const held = taught.filter(s=>skills.has(s)).length / taught.length;
      if(held < LADDER_PASS) return r;
    }
    return rungs[rungs.length-1];
  }

  // returns label KEYS; the UI translates them
  function describe(p){
    const s=p.skills, a=p.a;
    const digitalCount = ['phone_typing','file_sharing','web_search','online_forms','email_use'].filter(x=>s.has(x)).length;
    const phone = a.phone==='none' ? 'phone_none' : digitalCount<=1 ? 'phone_start' : digitalCount<=3 ? 'phone_basic' : 'phone_conf';
    const comp = !s.has('computer_basics') ? 'comp_new' : ['doc_typing','spreadsheet','slides','coding_basics'].filter(x=>s.has(x)).length>=2 ? 'comp_conf' : 'comp_some';
    const ai = !s.has('ai_first_use') ? 'ai_new' : s.has('ai_task_use') ? 'ai_tasks' : 'ai_tried';
    const cl = p.levels.comm||1;
    const eng = cl<=1 ? 'eng_basic' : cl===2 ? 'eng_work' : 'eng_conf';
    return {phone, comp, ai, eng};
  }

  function s_has(p,s){ return p.skills.has(s); }
  function commNeeds(p){
    const s=p.skills, n=[], cl=p.levels.comm||1, jobish=p.goalList.some(g=>['private_job','govt_job','apprenticeship','trade_work','improve_english'].includes(g.id));
    const goalNeeds = new Set(p.goalList.flatMap(g=>GOALS[g.id].needs));
    const englishMatters = ['eng_basic','eng_instructions','eng_reading','trade_talk'].some(s=>goalNeeds.has(s) && !s_has(p,s)) || (p.a.relocate==='yes' && !s_has(p,'eng_basic'));
    if(cl<=1 && englishMatters) n.push('Foundation communication');
    if(cl===2 && englishMatters) n.push('Workplace communication');
    if(jobish && !s.has('interview_skills')) n.push('Interview preparation');
    if(!s.has('email_writing') && p.goalList.some(g=>GOALS[g.id].needs.includes('email_writing'))) n.push('Professional writing');
    if(!s.has('spoken_clarity') && (p.interests.has('lead')||p.interests.has('customers')||p.goalList.some(g=>['study_further','improve_english'].includes(g.id)))) n.push('Presentation and speaking');
    if(cl>=3) n.push('Advanced communication development');
    return n;
  }

  /* ---- 3. Eligibility: hard rules. A score can never override these. ---- */
  function eligibility(c, have, p){
    const blocks = [];
    const missAll = c.prereq.all.filter(s=>!have.has(s));
    if(missAll.length) blocks.push({type:'skill', skills:missAll});
    if(c.prereq.any.length && !c.prereq.any.some(s=>have.has(s))) blocks.push({type:'skillAny', skills:c.prereq.any});
    if(c.prereq.minEducation){
      const ok = (EDU_RANK[p.a.education]||0) >= EDU_RANK[c.prereq.minEducation] || (c.prereq.altEducationTrades||[]).includes(p.tradeGroup);
      if(!ok) blocks.push({type:'education', need:c.prereq.minEducation});
    }
    if(c.prereq.experience==='job' && p.a.workExp!=='job') blocks.push({type:'experience'});
    if(c.device==='computer' && p.a.computerAccess==='no') blocks.push({type:'device'});
    if(c.langStrict && !c.langs.some(l=>p.readLangs.includes(l))) blocks.push({type:'language', langs:c.langs});
    const gap = c.teaches.filter(s=>!have.has(s));
    if(!gap.length) blocks.push({type:'mastered'});
    // can blocks be cleared by learning other catalogue courses?
    const hard = blocks.some(b=>['education','experience','device','language','mastered'].includes(b.type));
    const teachable = blocks.every(b=>b.type==='skill' ? b.skills.every(s=>G.teachersOf[s]) : b.type==='skillAny' ? b.skills.some(s=>G.teachersOf[s]) : false);
    const status = !blocks.length ? 'eligible' : (!hard && teachable ? 'later' : 'excluded');
    return {status, blocks, gap};
  }

  /* ---- 4. Relevance: weighted features, every one computed from metadata ---- */
  function relevance(c, have, p){
    const gap = c.teaches.filter(s=>!have.has(s));
    const f = {}; const why = [];
    // goal fit: gap skills that the learner's goals need
    let best=0, extra=0, goalHits=[];
    p.goalList.forEach(g=>{ const hit=gap.filter(s=>GOALS[g.id].needs.includes(s)); if(hit.length){ const v=g.w*Math.min(1,hit.length/2); goalHits.push({goal:g.id,skills:hit,v}); if(v>best){extra+=best?0.15:0; best=v;} else extra+=0.15; } });
    f.goal = Math.min(1, best+extra);
    goalHits.sort((x,y)=>y.v-x.v);
    // level fit
    if(c.ladder){ const lvl=p.levels[c.ladder.track]; const d=c.ladder.rung-lvl; f.level = d===0?1 : d===1?0.45 : d===-1?0.3 : 0; }
    else f.level = 0.5;
    // unlock value: how many other relevant courses this opens
    const have2 = new Set([...have, ...c.teaches]);
    const opens = COURSES.filter(o=>o.id!==c.id && eligibility(o,have,p).status!=='eligible' && eligibility(o,have2,p).status==='eligible' && o.teaches.some(s=>p.goalList.some(g=>GOALS[g.id].needs.includes(s))));
    f.unlock = Math.min(1, opens.length/3);
    // interest
    const ih = (c.interests||[]).filter(i=>p.interests.has(i));
    f.interest = ih.length>=2 ? 1 : ih.length===1 ? 0.7 : 0;
    // urgency
    const jt=p.a.jobTiming;
    f.urgency = has(c.tags,'jobReady') ? (jt==='now'?1:jt==='six'?0.75:0.3) : 0;
    if(has(c.tags,'short') && has(c.tags,'jobReady') && jt==='now') f.urgency = Math.min(1,f.urgency+0.2);
    // trade
    f.trade = (c.trades.includes(p.trade)||c.trades.includes(p.tradeGroup)) ? 1 : c.trades.includes('all') ? 0.5 : 0.1;
    if(c.tradeContext) f.trade = Math.min(1,f.trade+0.3);
    // language
    f.lang = c.langs.some(l=>p.prefLangs.includes(l)) ? 1 : c.langs.some(l=>p.readLangs.includes(l)) ? 0.6 : 0.2;
    // time
    const weeks = Math.ceil(c.hours / p.weekly);
    f.time = weeks<=8 ? 1 : weeks<=16 ? 0.7 : 0.4;
    let score = Object.entries(WEIGHTS).reduce((t,[k,w])=>t+w*(f[k]||0),0);
    // safety priority: the learner's own answers show exposure to harm that this course closes
    const riskHits = gap.filter(s=>SKILLS[s].risk && SKILLS[s].risk(p.a));
    if(riskHits.length) score += BONUS.risk;
    // access first: a course tagged 'access' leads when the learner is on its rung (platform use depends on it)
    const access = has(c.tags,'access') && c.ladder && p.levels[c.ladder.track]<=c.ladder.rung;
    if(access) score += BONUS.access;
    // gateway rule: a foundation course on a track where the learner sits on its rung is preferred as a first step
    const gateway = c.stage==='foundation' && c.ladder && p.levels[c.ladder.track]===c.ladder.rung && c.ladder.rung<=2;
    if(gateway) score += BONUS.gateway;
    // series order: if an earlier unit of the same series is still open for this learner, this one waits
    const earlierOpen = c.series && COURSES.some(o=>o.series && o.series.id===c.series.id && o.series.order<c.series.order && o.teaches.some(s=>!have.has(s)));
    if(earlierOpen) score -= BONUS.seriesOrder;
    const purpose = f.goal>0 || riskHits.length>0;
    return {score:Math.round(score*1000)/1000, f, gap, goalHits, riskHits, interestHits:ih, opens:opens.map(o=>o.id), weeks, gateway, access, purpose};
  }

  /* ---- 5. Path planner ---- */
  function recommend(answers, pack){
    const L = pack || EN;
    const p = buildProfile(answers);
    const have = p.skills;
    const rows = COURSES.map(c=>{ const e=eligibility(c,have,p); const r=relevance(c,have,p); return {c, e, r}; });
    const minRel = c => c.minRelevance ?? DEFAULT_MIN_RELEVANCE;
    const byScore = (x,y)=>y.r.score-x.r.score;
    const eligibleNow = rows.filter(x=>x.e.status==='eligible' && x.r.score>=minRel(x.c)).sort(byScore);
    // Start and Next must serve something the learner asked for (a goal) or a safety risk
    const purposeful = eligibleNow.filter(x=>x.r.purpose);
    // fallback: if nothing clears the relevance bar, offer the best eligible course rather than an empty plan
    const anyEligible = rows.filter(x=>x.e.status==='eligible').sort(byScore);
    // product rule: the plan always opens with a course from START_DOMAIN (AI), still chosen by eligibility and score
    const inStartDomain = x => !START_DOMAIN || x.c.domain===START_DOMAIN;
    const start = purposeful.find(inStartDomain) || eligibleNow.find(inStartDomain) || anyEligible.find(inStartDomain)
               || purposeful[0] || eligibleNow[0] || anyEligible[0] || null;
    const next = [];
    if(start){
      const have2 = new Set([...have, ...start.c.teaches]);
      const isSuccessor = c => G.edges.some(e=>e.from===start.c.id && e.to===c.id) ||
        (c.ladder && start.c.ladder && c.ladder.track===start.c.ladder.track && c.ladder.rung===start.c.ladder.rung+1) ||
        (c.series && start.c.series && c.series.id===start.c.series.id && c.series.order===start.c.series.order+1);
      const follow = COURSES.filter(c=>c.id!==start.c.id && isSuccessor(c))
        .map(c=>({c, e:eligibility(c,have2,p), r:relevance(c,have2,p)}))
        .filter(x=>x.e.status==='eligible' && x.r.score>=minRel(x.c) && x.r.purpose).sort(byScore);
      if(follow[0]) next.push({...follow[0], e:eligibility(follow[0].c,have,p), kind:'follow', after:start.c.id});
      const taken = id => id===start.c.id || next.some(n=>n.c.id===id);
      const rest = purposeful.filter(x=>!taken(x.c.id));
      if(rest.length && next.length<2){
        const top = rest[0];
        const domains = new Set([start.c.domain, ...next.map(n=>n.c.domain)]);
        const diverse = rest.find(x=>!domains.has(x.c.domain));
        const pick = (diverse && diverse.r.score >= top.r.score-0.12) ? diverse : top;
        next.push({...pick, kind:'parallel'});
      }
      const rest2 = purposeful.filter(x=>!taken(x.c.id));
      if(next.length<2 && rest2[0]) next.push({...rest2[0], kind:'parallel'});
    }
    const used = new Set([start&&start.c.id, ...next.map(n=>n.c.id)].filter(Boolean));
    // 'later' courses qualify only when what they still need is taught by the Start or Next courses
    const pathTeaches = new Set([...used].flatMap(id=>COURSES.find(c=>c.id===id).teaches));
    const oneStepAway = x => x.e.blocks.every(b=>b.type==='skill' ? b.skills.every(s=>pathTeaches.has(s)||have.has(s)) : b.type==='skillAny' ? b.skills.some(s=>pathTeaches.has(s)) : false);
    const later = rows.filter(x=>x.e.status==='later' && oneStepAway(x) && x.r.score>=minRel(x.c));
    const alsoScore = x => x.r.score + 0.1*(x.r.interestHits.length>0) + 0.1*(x.r.riskHits.length>0);
    const also = [...eligibleNow, ...later].filter(x=>!used.has(x.c.id) && (x.r.purpose || x.r.interestHits.length))
      .sort((x,y)=>alsoScore(y)-alsoScore(x)).slice(0,3);
    // never leave "You may also like" empty: fall back to the next best course that is open now or one step away
    if(!also.length){
      const gated = c => (c.minRelevance ?? DEFAULT_MIN_RELEVANCE) > DEFAULT_MIN_RELEVANCE;   // specialist courses keep their bar
      [...rows.filter(x=>x.e.status==='eligible'), ...rows.filter(x=>x.e.status==='later' && oneStepAway(x))]
        .filter(x=>!used.has(x.c.id) && !gated(x.c) && x.r.score>=0.15).sort(byScore).slice(0,2).forEach(x=>also.push(x));
    }
    // last resort: the best course the learner can reach later, shown with its "After X" label
    if(!also.length){
      rows.filter(x=>x.e.status==='later' && !used.has(x.c.id)).sort(byScore).slice(0,1).forEach(x=>also.push(x));
    }
    // backend addition (A7 rule 9, found by the B12 20,000-profile run): a learner who has mastered most of the
    // catalogue can have only a specialist course left open, just under its bar. Offer it rather than an empty section.
    if(!also.length){
      rows.filter(x=>x.e.status==='eligible' && !used.has(x.c.id)).sort(byScore).slice(0,1).forEach(x=>also.push(x));
    }
    const recs = [];
    if(start) recs.push({slot:'start', ...start});
    next.slice(0,2).forEach(n=>recs.push({slot:'next', ...n}));
    also.forEach(x=>recs.push({slot:'also', ...x}));
    recs.forEach(x=>x.why = explain(x, p, recs, L));
    const path = buildPath(recs);
    // needs the catalogue cannot serve for this learner right now: product backlog signal
    const served = new Set(recs.flatMap(x=>x.c.teaches));
    const unserved = [...new Set(p.goalList.flatMap(g=>GOALS[g.id].needs))].filter(s=>!have.has(s) && !served.has(s));
    return {profile:p, recs, rows, path, graph:G, unserved};
  }

  function buildPath(recs){
    const order = {foundation:0, skill:1, applied:2};
    const chosen = recs.filter(r=>r.slot!=='also').map(r=>r.c);
    return ['foundation','skill','applied'].map(st=>({stage:st, courses:chosen.filter(c=>c.stage===st)}));
  }

  /* ---- 6. Explanations: built from the learner's own answers ---- */
  /* English pack. Other languages pass a pack with the same shape into recommend(). */
  const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
  const EN = {
    gap:(s,p)=>{ const g=SKILLS[s].gap; return typeof g==='function' ? g(p) : g; },
    goal:k=>GOALS[k].phrase, interest:k=>D.INTERESTS[k].phrase, promise:c=>c.promise, name:c=>c.name, trade:p=>p.tradeLabel,
    join:a=> a.length<=1 ? (a[0]||'') : a.slice(0,-1).join(', ')+' and '+a[a.length-1],
    t:{
      sentence:x=>cap(x)+'.',
      riskGoal:gl=>`This matters for your plan to ${gl}.`,
      goalLead:(gl,gap,imp)=> imp ? `You said you would like to ${gl}, and ${gap}.` : `You told us you want to ${gl}, and ${gap}.`,
      also:gap=>`Also, ${gap}.`,
      gateway:'This is the best first step for you, because the other courses build on it.',
      follow:n=>`It follows naturally once you finish ${n}.`,
      later:n=>`You can take this after ${n}.`,
      interest:l=>`You said you are interested in ${l}.`,
      trade:tr=>`You practise with examples from ${tr} work.`,
      urgency:w=>`You want to start working soon, and this takes about ${w} week${w>1?'s':''} at your pace.`
    }
  };
  function explain(x, p, recs, L){
    const {c, r} = x; const parts = []; const T = L.t;
    const gh = r.goalHits[0];
    if(r.riskHits.length){
      parts.push(T.sentence(L.gap(r.riskHits[0],p)));
      if(gh && !gh.skills.includes(r.riskHits[0])) parts.push(T.riskGoal(L.goal(gh.goal)));
    } else if(gh){
      parts.push(T.goalLead(L.goal(gh.goal), L.gap(gh.skills[0],p), !!GOALS[gh.goal].implicit));
    } else if(r.gap.length){
      parts.push(T.sentence(L.gap(r.gap[0],p)));
    }
    const used = r.riskHits[0] || (gh && gh.skills[0]);
    const core = r.gap.find(s=>s!==used && SKILLS[s].group===SKILLS[r.gap[0]].group);
    const opener = x.slot==='start' && (r.gateway||r.access) && r.opens.length;
    if(x.slot==='start' && core && used && !opener) parts.push(T.also(L.gap(core,p)));
    if(opener) parts.push(T.gateway);
    else if(x.kind==='follow') parts.push(T.follow(L.name(courseById(x.after))));
    else if(x.e && x.e.status==='later' && x.slot==='also') parts.push(T.later(L.join(laterCourses(x).map(L.name))));
    if(r.interestHits.length && parts.length<3 && x.slot!=='start') parts.push(T.interest(L.join(r.interestHits.map(L.interest))));
    if(c.tradeContext && parts.length<3) parts.push(T.trade(L.trade(p)));
    if(r.f.urgency>=0.75 && has(c.tags,'short') && parts.length<3) parts.push(T.urgency(r.weeks));
    parts.push(L.promise(c));
    return parts.join(' ');
  }
  function courseById(id){ return COURSES.find(c=>c.id===id) || {id, name:id}; }
  function laterCourses(x){
    const miss = x.e.blocks.flatMap(b=>b.type==='skill'?b.skills:b.type==='skillAny'?[b.skills.find(s=>G.teachersOf[s])]:[]);
    return [...new Set(miss.map(s=>G.teachersOf[s][0]))].map(courseById);
  }

  /* ---- 7. Ingestion: add a course, rebuild the graph, nothing else changes ---- */
  function addCourse(meta){
    const required = ['id','name','category','domain','stage','hours','langs','prereq','teaches','trades','promise'];
    const missing = required.filter(k=>meta[k]===undefined);
    if(missing.length) return {ok:false, missing};
    const unknown = [...meta.teaches, ...meta.prereq.all, ...meta.prereq.any].filter(s=>!SKILLS[s]);
    if(unknown.length) return {ok:false, unknownSkills:unknown};
    COURSES = COURSES.filter(c=>c.id!==meta.id).concat([meta]);
    G = buildGraph();
    return {ok:true, precededBy:G.edges.filter(e=>e.to===meta.id).map(e=>e.from), leadsTo:G.edges.filter(e=>e.from===meta.id).map(e=>e.to),
            goals:G.goalLinks.filter(l=>l.course===meta.id).map(l=>l.goal)};
  }
  function removeCourse(id){ COURSES = COURSES.filter(c=>c.id!==id); G = buildGraph(); }

  return {recommend, buildProfile, BONUS, eligibility, relevance, addCourse, removeCourse, get courses(){return COURSES;}, get graph(){return G;}, EVIDENCE, WEIGHTS};
}

module.exports = { has, nonFun, EVIDENCE, WEIGHTS, START_DOMAIN, BONUS, LADDER_PASS, DEFAULT_MIN_RELEVANCE, WEEKLY_HOURS, makeEngine };
