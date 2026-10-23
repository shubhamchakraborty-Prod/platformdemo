'use strict';
/* Spec B2 data model and A8 catalogue.
   Ported unchanged from the Course Finder reference prototype (artifact "Swift AI Academy - Find your courses (ITI)", version 1791439992-5d3c).
   Spec: ITI Course Finder - Product and Technical Specification (7 Oct 2026). */

/* ============ DATA LAYER: everything here is metadata, not logic ============ */

/* ---- Skill ontology: shared vocabulary between learners and courses ---- */
const SKILLS = {
  // digital
  phone_typing:   {label:'Phone typing',        group:'digital', gap:'you are still getting used to typing on a phone'},
  file_sharing:   {label:'Sharing files',       group:'digital', gap:'you have not sent a PDF or photo on WhatsApp yet'},
  web_search:     {label:'Online search',       group:'digital', gap:'you have not searched for information online yet'},
  online_forms:   {label:'Online forms',        group:'digital', gap:'you have not filled an online form yet'},
  email_use:      {label:'Email basics',        group:'digital', gap:'you have not used email yet'},
  computer_basics:{label:'Computer basics',     group:'digital', gap:'you have not used a computer much yet'},
  doc_typing:     {label:'Typing documents',    group:'digital', gap:'you have not typed a document on a computer yet'},
  spreadsheet:    {label:'Spreadsheets',        group:'digital', gap:'you have not used Excel or Google Sheets yet'},
  slides:         {label:'Presentations',       group:'digital', gap:'you have not made a presentation yet'},
  coding_basics:  {label:'Coding',              group:'digital', gap:'you have not written code yet'},
  design_tools:   {label:'Design apps',         group:'digital', gap:'you have not used a design or video app yet'},
  // ai
  ai_aware:       {label:'Knowing AI apps',     group:'ai', gap:'AI apps are new to you'},
  ai_first_use:   {label:'Using an AI app',     group:'ai', gap:'you have not used an AI app yet'},
  ai_prompting:   {label:'Asking AI clearly',   group:'ai', gap:'you have not yet practised asking AI clear questions'},
  ai_verification:{label:'Checking AI answers', group:'ai', gap:p=> p.a.aiUsed==='yes' && p.a.aiCheck==='use'
                      ? 'you told us you would use an AI answer without checking it first'
                      : 'you have not yet learnt how to check AI answers before using them',
                    risk:a=> a.aiUsed==='yes' && a.aiCheck==='use' && ['month','week'].includes(a.aiFreq)},
  ai_task_use:    {label:'AI for real tasks',   group:'ai', gap:'you do not yet use AI for your study or trade work'},
  ai_safety:      {label:'Staying safe online', group:'ai', gap:p=> p.a.scam && p.a.scam!=='check'
                      ? 'you told us you might respond to a "pay to confirm your job" message'
                      : 'you have not yet learnt to spot fake messages and keep your data safe',
                    risk:a=> a.scam==='pay' || a.scam==='call'},
  ai_method:      {label:'Your own AI method',  group:'ai', gap:'you do not yet have a fixed, tested way of using AI each week'},
  bot_building:   {label:'Building chatbots',   group:'ai', gap:'you have not built a chatbot yet'},
  python_data:    {label:'Python for data',     group:'ai', gap:'you have not worked with data using code yet'},
  // communication
  eng_basic:      {label:'Introducing yourself',group:'comm', gap:'you have not introduced yourself in English yet'},
  eng_instructions:{label:'Following instructions',group:'comm', gap:'you sometimes need help to understand instructions in English'},
  eng_reading:    {label:'Reading notices',     group:'comm', gap:'reading short notices in English is still new to you'},
  eng_forms_writing:{label:'Filling forms',     group:'comm', gap:'you have not yet written a letter or filled a form in English'},
  trade_talk:     {label:'Trade talk',          group:'comm', gap:'you do not yet explain trade work and safety in English'},
  customer_talk:  {label:'Talking to customers',group:'comm', gap:'talking politely to customers is still new to you'},
  job_cards_logs: {label:'Job cards and logs',  group:'comm', gap:'you have not yet written a job card or work diary in English'},
  email_writing:  {label:'Work emails',         group:'comm', gap:'you have not written a work email yet'},
  interview_skills:{label:'Interview answers',  group:'comm', gap:p=> p.a.interviews==='never' ? 'you have not attended a job interview yet' : 'you have attended only one or two interviews so far'},
  gd_skills:      {label:'Group discussion',    group:'comm', gap:'you have not taken part in a group discussion yet'},
  spoken_clarity: {label:'Speaking clearly',    group:'comm', gap:'you have not spoken in front of a group yet'},
  cv_writing:     {label:'CV writing',          group:'comm', gap:'you have not made a CV yet'},
  team_instructions:{label:'Guiding a team',    group:'comm', gap:'you have not yet given instructions to a team'},
  reporting_upward:{label:'Reporting to seniors',group:'comm', gap:'you have not yet reported a team\'s work to a senior'},
  handover_writing:{label:'Handover notes',     group:'comm', gap:'you have not yet written handover notes'},
  delegation:     {label:'Delegating work',     group:'comm', gap:'you have not yet delegated work to others'},
  management_reports:{label:'Management reports',group:'comm', gap:'you have not written management reports'},
  people_leadership:{label:'Leading people',    group:'comm', gap:'you have not led people as a manager'},
  executive_comm: {label:'Executive communication',group:'comm', gap:'executive communication is new to you'}
};

/* ---- Goals: each goal declares the skills it needs. Courses link to goals THROUGH skills. ---- */
const GOALS = {
  private_job:  {label:'Get a job in a private company', phrase:'get a private-sector job',
                 needs:['eng_basic','eng_instructions','interview_skills','cv_writing','trade_talk','online_forms','email_writing','ai_verification']},
  govt_job:     {label:'Get a government job', phrase:'get a government job',
                 needs:['online_forms','eng_reading','web_search','ai_safety','ai_verification','interview_skills','email_use']},
  apprenticeship:{label:'Do an apprenticeship', phrase:'do an apprenticeship',
                 needs:['eng_instructions','trade_talk','job_cards_logs','interview_skills','online_forms','cv_writing']},
  trade_work:   {label:'Work as a technician in my trade', phrase:'work in your trade',
                 needs:['trade_talk','job_cards_logs','customer_talk','ai_task_use','eng_instructions','ai_verification']},
  business:     {label:'Start my own business or shop', phrase:'start your own business',
                 needs:['customer_talk','web_search','ai_task_use','ai_safety','bot_building','spreadsheet','file_sharing','ai_method']},
  freelance:    {label:'Work on my own and take orders', phrase:'work on your own',
                 needs:['customer_talk','web_search','ai_task_use','file_sharing','bot_building','ai_method','online_forms']},
  study_further:{label:'Study further (diploma or degree)', phrase:'study further',
                 needs:['eng_reading','email_writing','doc_typing','ai_prompting','ai_verification','spoken_clarity']},
  tech_career:  {label:'Work with computers or technology', phrase:'work with computers and technology',
                 needs:['computer_basics','spreadsheet','ai_prompting','ai_task_use','bot_building','python_data','ai_method']},
  improve_english:{label:'Speak better English before applying for jobs', phrase:'speak better English before applying for jobs',
                 needs:['eng_basic','eng_instructions','eng_reading','spoken_clarity','interview_skills']},
  not_sure:     {label:'I am not sure yet', phrase:'explore your options',
                 needs:['eng_basic','web_search','ai_first_use','ai_verification','online_forms']},
  // implicit goal raised by interest 'lead'
  lead_team:    {label:'Lead a team one day', phrase:'lead a team one day', implicit:true,
                 needs:['team_instructions','reporting_upward','handover_writing']}
};

const INTERESTS = {
  computers:{label:'Computers', phrase:'computers'}, ai:{label:'AI apps', phrase:'AI apps'}, build:{label:'Making apps or chatbots', phrase:'making apps and chatbots'},
  design:{label:'Posters and videos', phrase:'posters and videos'}, repair:{label:'Fixing and repairing', phrase:'fixing and repairing'},
  customers:{label:'Customers and selling', phrase:'customers and selling'}, lead:{label:'Leading a team', phrase:'leading a team'}
};

const TRADES = [
  {id:'electrician', label:'Electrician', group:'electrical'},
  {id:'fitter', label:'Fitter', group:'mechanical'},
  {id:'welder', label:'Welder (Gas and Electric)', group:'mechanical'},
  {id:'mech_diesel', label:'Mechanic Diesel', group:'automotive'},
  {id:'mech_mv', label:'Mechanic Motor Vehicle', group:'automotive'},
  {id:'electronics', label:'Electronics Mechanic', group:'electrical'},
  {id:'copa', label:'COPA (Computer Operator and Programming Assistant)', group:'it'},
  {id:'ictsm', label:'ICTSM (Information and Communication Technology System Maintenance)', group:'it'},
  {id:'dm_civil', label:'Draughtsman Civil', group:'design'},
  {id:'dm_mech', label:'Draughtsman Mechanical', group:'design'},
  {id:'rac', label:'Refrigeration and Air Conditioning Technician', group:'electrical'},
  {id:'turner', label:'Turner', group:'mechanical'},
  {id:'machinist', label:'Machinist', group:'mechanical'},
  {id:'plumber', label:'Plumber', group:'construction'},
  {id:'wireman', label:'Wireman', group:'electrical'},
  {id:'sewing', label:'Sewing Technology', group:'apparel'},
  {id:'other', label:'Other (type your trade)', group:'other'}
];

const EDU_RANK = {class8:1, class10:2, class12:3, other:2, diploma:4, graduate:5};

/* ---- Course catalogue ----
   status: repository = from uploaded scope / LSRWVG frameworks
           demo        = from the existing Swift AI Academy demo catalogue
           authored    = course outline written for the ITI pathway (content team to validate)
   ladder: {track, rung} places a course on a progression track. Rung order drives level inference.
*/
const CATEGORY = {
  comm:   {label:'Communication',     color:'#0891B2', tint:'#E2F5FA'},
  career: {label:'Career Readiness',  color:'#C2185B', tint:'#FCE4EE'},
  aif:    {label:'AI Foundations',    color:'#3D5AFE', tint:'#EAEEFF'},
  aiapp:  {label:'Applied AI',        color:'#6D28D9', tint:'#F0E8FD'},
  bot:    {label:'Bot Building',      color:'#0E1B5C', tint:'#E5E9FA'},
  data:   {label:'Data and Code',     color:'#1A2B85', tint:'#E5E9FA'}
};

const COURSES = [
  /* ---------------- Communication: LSRWVG frameworks (ZIP) ---------------- */
  { id:'COM-L12', name:'Basic and Foundational Workplace Communication', category:'comm', domain:'communication', subdomain:'workplace english',
    status:'repository', source:'Revised Level 1-2 LSRWVG Framework', nsqf:'NSQF 1-2', nsqfNum:1.5, ladder:{track:'comm', rung:1},
    stage:'foundation', difficulty:1, hours:58, langs:['English','Hindi'], langStrict:false,
    oneLiner:'Greet people, follow instructions, read notices and fill forms at work.',
    modules:['Greetings, Names and Following Simple Instructions','Basic Safety Words, Simple Requests and Reporting a Problem','Everyday Conversations and Multi-Step Instructions','Reading, Forms and Fuller Reporting','Putting It Together: A Full Day at Work'],
    prereq:{all:[], any:[]}, teaches:['eng_basic','eng_instructions','eng_reading','eng_forms_writing'],
    careerOutcomes:['Helper','Assistant','Entry worker'], trades:['all'], interests:[], tags:['jobReady'],
    promise:'This course helps you greet people, introduce yourself, follow instructions and fill simple forms in English, step by step.' },

  { id:'COM-L3', name:'Trade and Team Communication', category:'comm', domain:'communication', subdomain:'workplace english',
    status:'repository', source:'Level 2.5-3 LSRWVG Framework (Entry-Skilled Employee / ITI Trainee)', nsqf:'NSQF 2.5-3', nsqfNum:3, ladder:{track:'comm', rung:2},
    stage:'skill', difficulty:2, hours:44, langs:['English','Hindi'], langStrict:false,
    oneLiner:'Talk about trade work, safety, customers and job cards with confidence.',
    modules:['Communicating on the Shop Floor: Instructions and Safety','Customer and Team Interaction Basics','Reading Job Cards, SOPs and Writing Simple Logs'],
    prereq:{all:['eng_basic','eng_instructions'], any:[]}, teaches:['trade_talk','customer_talk','job_cards_logs'],
    careerOutcomes:['ITI trainee','Entry-skilled technician'], trades:['all'], interests:['customers'], tags:['jobReady'],
    promise:'This course helps you explain your work and safety steps, talk to customers and write job cards and daily logs.' },

  { id:'COM-L4', name:'Supervisory Communication Skills', category:'comm', domain:'communication', subdomain:'supervisory',
    status:'repository', source:'Level 3.5-4 LSRWVG Framework', nsqf:'NSQF 3.5-4', nsqfNum:4, ladder:{track:'comm', rung:3},
    stage:'applied', difficulty:3, hours:57, langs:['English','Hindi'], langStrict:false,
    oneLiner:'Give clear instructions to a team, report upward and write handover notes.',
    modules:['Giving Clear Instructions and Coordinating a Team','Listening to the Shop Floor and Reporting Upward','Basic Workplace Conflict and Feedback','Supervisory Reports and Handover Notes'],
    prereq:{all:['trade_talk','job_cards_logs'], any:[]}, teaches:['team_instructions','reporting_upward','handover_writing'],
    careerOutcomes:['Senior technician','Junior supervisor'], trades:['all'], interests:['lead'], tags:[], minRelevance:0.35,
    promise:'This course prepares you to guide a small team, report problems to seniors and write handover notes for the next shift.' },

  { id:'COM-L5', name:'Junior Management Communication Skills', category:'comm', domain:'communication', subdomain:'management',
    status:'repository', source:'Level 4.5-5 LSRWVG Framework', nsqf:'NSQF 4.5-5', nsqfNum:5, ladder:{track:'comm', rung:4},
    stage:'applied', difficulty:4, hours:57, langs:['English'], langStrict:false,
    oneLiner:'Delegate work, train a team and write reports for management.',
    modules:['Delegating Tasks and Giving Performance Feedback','Motivating, Guiding and Training a Team','Managing Upward and Cross-Functional Coordination','Handling Grievances, Basic Negotiation and Management Reports'],
    prereq:{all:['team_instructions','reporting_upward'], any:[], experience:'job'}, teaches:['delegation','management_reports'],
    careerOutcomes:['Junior manager','Technical supervisor'], trades:['all'], interests:['lead'], tags:[], minRelevance:0.35,
    promise:'This course helps you delegate work, train people and write reports that managers act on.' },

  { id:'COM-L6', name:'Interpersonal Communication for Managers', category:'comm', domain:'communication', subdomain:'management',
    status:'repository', source:'Level 5.5-6 LSRWVG Framework', nsqf:'NSQF 5.5-6', nsqfNum:6, ladder:{track:'comm', rung:5},
    stage:'applied', difficulty:5, hours:64, langs:['English'], langStrict:true,
    oneLiner:'Difficult conversations, negotiation and mentoring for managers.',
    modules:['Listening to Respond','Motivating and Inspiring Teams','Difficult Conversations and Conflict Resolution','Persuasion, Negotiation and Influence','Mentoring, Coaching and Cross-Team Collaboration'],
    prereq:{all:['delegation','management_reports'], any:[], minEducation:'diploma', experience:'job'}, teaches:['people_leadership'],
    careerOutcomes:['Manager'], trades:['all'], interests:['lead'], tags:[], minRelevance:0.4,
    promise:'This course builds the conversations managers rely on.' },

  { id:'COM-L65', name:'Cross-Cultural and Executive Presence Communication', category:'comm', domain:'communication', subdomain:'executive',
    status:'repository', source:'Level 6.5 LSRWVG Framework', nsqf:'NSQF 6.5', nsqfNum:6.5, ladder:{track:'comm', rung:6},
    stage:'applied', difficulty:5, hours:46, langs:['English'], langStrict:true, oneLiner:'Executive presence and cross-cultural meetings.',
    modules:['Cross-Cultural Communication','Executive Presence','Strategic Storytelling'],
    prereq:{all:['people_leadership'], any:[], minEducation:'graduate', experience:'job'}, teaches:['executive_comm'],
    careerOutcomes:['Senior manager'], trades:['all'], interests:[], tags:[], minRelevance:0.4, promise:'' },

  { id:'COM-L7', name:'Strategic Negotiation and Crisis Leadership Communication', category:'comm', domain:'communication', subdomain:'executive',
    status:'repository', source:'Level 7 LSRWVG Framework', nsqf:'NSQF 7', nsqfNum:7, ladder:{track:'comm', rung:7},
    stage:'applied', difficulty:5, hours:38, langs:['English'], langStrict:true, oneLiner:'Negotiation and crisis communication for directors.',
    modules:['International Negotiation','Crisis and Stakeholder Communication','Executive Writing'],
    prereq:{all:['executive_comm'], any:[], minEducation:'graduate', experience:'job'}, teaches:['executive_comm'],
    careerOutcomes:['Director'], trades:['all'], interests:[], tags:[], minRelevance:0.4, promise:'' },

  { id:'COM-L8', name:'Research, Governance and Thought-Leadership Communication', category:'comm', domain:'communication', subdomain:'executive',
    status:'repository', source:'Level 8 LSRWVG Framework', nsqf:'NSQF 8', nsqfNum:8, ladder:{track:'comm', rung:8},
    stage:'applied', difficulty:5, hours:60, langs:['English'], langStrict:true, oneLiner:'Academic and governance communication.',
    modules:['Academic and Research Discourse','Thought Leadership','Literature Synthesis and Peer Review'],
    prereq:{all:['executive_comm'], any:[], minEducation:'graduate', experience:'job'}, teaches:['executive_comm'],
    careerOutcomes:['Researcher','Board member'], trades:['all'], interests:[], tags:[], minRelevance:0.4, promise:'' },

  /* ---------------- Career readiness: demo catalogue ---------------- */
  { id:'CO01', name:'Spoken Clarity and Listening', category:'career', domain:'communication', subdomain:'speaking',
    status:'demo', source:'Swift AI Academy demo catalogue (CO01)', nsqf:'NSQF to be confirmed', nsqfNum:null, ladder:null,
    stage:'skill', difficulty:2, hours:9, langs:['English','Hindi'], langStrict:false,
    oneLiner:'Listen carefully, ask good questions and speak in a clear order.',
    modules:['Listening','Clarification','Structured speaking','Pronunciation practice','Reflection'],
    prereq:{all:['eng_basic'], any:[]}, teaches:['spoken_clarity'],
    careerOutcomes:['Any customer-facing role'], trades:['all'], interests:['customers','lead'], tags:['jobReady','short'],
    promise:'This short course helps you speak clearly and confidently in front of others, and ask questions when you are not sure.' },

  { id:'CO02', name:'Written Workplace English', category:'career', domain:'communication', subdomain:'writing',
    status:'demo', source:'Swift AI Academy demo catalogue (CO02)', nsqf:'NSQF to be confirmed', nsqfNum:null, ladder:null,
    stage:'skill', difficulty:2, hours:9, langs:['English'], langStrict:true,
    oneLiner:'Write short emails and work updates that people act on.',
    modules:['Audience and tone','Email structure','Status updates','Editing','Action requests'],
    prereq:{all:['eng_reading','phone_typing'], any:['eng_forms_writing','email_use']}, teaches:['email_writing'],
    careerOutcomes:['Office and service roles'], trades:['all'], interests:['computers'], tags:['jobReady','short'],
    promise:'This short course shows you how to write a clear work email and a short status update.' },

  { id:'CO03', name:'Interviews and Group Discussion', category:'career', domain:'communication', subdomain:'interview',
    status:'demo', source:'Swift AI Academy demo catalogue (CO03)', nsqf:'NSQF to be confirmed', nsqfNum:null, ladder:null,
    stage:'applied', difficulty:2, hours:6, langs:['English'], langStrict:true,
    oneLiner:'Practise interview answers and speak up in a group discussion.',
    modules:['Role research','STAR examples','Interview practice','Group discussion','Reflection'],
    prereq:{all:['eng_basic','eng_reading'], any:[]}, teaches:['interview_skills','gd_skills'],
    careerOutcomes:['Any job interview'], trades:['all'], interests:[], tags:['jobReady','short'],
    promise:'This short course helps you practise introductions, common interview questions and group discussions.' },

  /* ---------------- AI ladder ---------------- */
  { id:'AIF-1', name:'AI First Steps on Your Phone', category:'aif', domain:'ai', subdomain:'digital and ai basics',
    status:'authored', source:'Course outline authored for the ITI pathway (Applied AI Level 1)', nsqf:'NSQF 1 (proposed)', nsqfNum:1, ladder:{track:'ai', rung:1},
    stage:'foundation', difficulty:1, hours:8, langs:['English','Hindi'], langStrict:false,
    oneLiner:'Get comfortable with your phone and see what an AI app can do.',
    modules:[{n:'Your Phone, Step by Step: typing, voice typing and saving contacts', h:2},{n:'Search and Share Safely: Google, Maps, sharing photos and PDFs', h:2},{n:'Meet an AI App: ask your first question by voice or text', h:2},{n:'Checkpoint: find a bus time, share a PDF, ask AI to explain a trade word', h:2}],
    prereq:{all:[], any:[]}, teaches:['phone_typing','file_sharing','web_search','ai_aware'],
    careerOutcomes:['Digital first steps'], trades:['all'], interests:['ai','computers'], tags:['short','access'],
    promise:'This course starts from zero. You will practise typing, searching and sharing on a phone, and ask an AI app your first question.' },

  { id:'AIF-2', name:'Everyday AI Basics', category:'aif', domain:'ai', subdomain:'ai literacy',
    status:'authored', source:'Course outline authored for the ITI pathway (Applied AI Level 2)', nsqf:'NSQF 2 (proposed)', nsqfNum:2, ladder:{track:'ai', rung:2},
    stage:'foundation', difficulty:2, hours:10, langs:['English','Hindi'], langStrict:false,
    oneLiner:'Use AI apps, online forms and email for everyday tasks.',
    modules:[{n:'What AI Apps Can and Cannot Do', h:2},{n:'Online Forms Without Fear: scheme, scholarship and job forms, OTPs and uploads', h:3},{n:'Email Basics: create an account, write, attach a PDF', h:2},{n:'First Useful AI Tasks: a leave letter, a translated notice, a simple explanation', h:2},{n:'Checkpoint: fill a form, send an email, ask AI and check the answer', h:1}],
    prereq:{all:['phone_typing'], any:['web_search','file_sharing']}, teaches:['ai_first_use','online_forms','email_use'],
    careerOutcomes:['Digital readiness'], trades:['all'], interests:['ai','computers'], tags:['short'],
    promise:'This course helps you use an AI app, fill online forms and send emails for everyday tasks.' },

  { id:'AAI-MC1', name:'Applied AI 1: Use It, and Check It', category:'aif', domain:'ai', subdomain:'applied ai literacy',
    status:'repository', series:{id:'AAI-E', order:1}, source:'Applied AI for Everyday and Workplace Use, MC1', url:'https://aai-tau.vercel.app/#S01', nsqf:'NSQF 4 (proposed)', nsqfNum:4, ladder:{track:'ai', rung:3},
    stage:'foundation', difficulty:3, hours:16, langs:['English','Hindi'], langStrict:false,
    oneLiner:'Use an AI app on real tasks and check every answer before you use it.',
    modules:['1.1 First Contact','1.2 Framing and Refining','1.3 Check Before You Use','Checkpoint 1: Use It and Check It'],
    prereq:{all:['phone_typing','web_search'], any:[]}, teaches:['ai_first_use','ai_prompting','ai_verification'],
    careerOutcomes:['Any trade or job'], trades:['all'], interests:['ai'], tags:['jobReady'],
    promise:'In this course you use an AI app on your phone for real tasks, learn to ask clearly, and check facts and numbers before you trust them.' },

  { id:'AAI-MC2', name:'Applied AI 2: Apply It Where It Matters', category:'aiapp', domain:'ai', subdomain:'applied ai',
    status:'repository', series:{id:'AAI-E', order:2}, source:'Applied AI for Everyday and Workplace Use, MC2', nsqf:'NSQF 4 (proposed)', nsqfNum:4, ladder:{track:'ai', rung:3},
    stage:'skill', difficulty:3, hours:16, langs:['English','Hindi'], langStrict:false,
    oneLiner:'Use AI for your trade, studies or daily life, then try new tasks on your own.',
    modules:['2.1 Choose Your Arena','2.2 Deep Practice in Your Arena','2.3 Transfer to Two Others','Checkpoint 2: The Cold Arena'],
    prereq:{all:['ai_prompting','ai_verification'], any:[]}, teaches:['ai_task_use'],
    careerOutcomes:['Any trade or job'], trades:['all'], tradeContext:true, interests:['ai','repair'], tags:[],
    promise:'This course helps you use AI for job cards, estimates, safety briefs and study notes, and then do new tasks on your own.' },

  { id:'AAI-MC3', name:'Applied AI 3: Trust, Safety and Harm', category:'aiapp', domain:'ai', subdomain:'ai safety',
    status:'repository', series:{id:'AAI-E', order:3}, source:'Applied AI for Everyday and Workplace Use, MC3', nsqf:'NSQF 4 (proposed)', nsqfNum:4, ladder:{track:'ai', rung:4},
    stage:'skill', difficulty:4, hours:16, langs:['English','Hindi'], langStrict:false,
    oneLiner:'Spot wrong AI answers, fake messages and scams, and protect your data.',
    modules:['3.1 Fabrication and Verification Depth','3.2 Fraud, Synthetic Media and Manipulation','3.3 Privacy, Disclosure and Ethics','Checkpoint 3: Error, Fraud and Data'],
    prereq:{all:['ai_prompting','ai_verification'], any:[]}, teaches:['ai_safety'],
    careerOutcomes:['Any trade or job'], trades:['all'], interests:['ai'], tags:[],
    promise:'This course teaches you to catch fake job messages, cloned voices and edited photos, and to keep your personal data safe.' },

  { id:'AAI-MC4', name:'Applied AI 4: Make It Stick', category:'aiapp', domain:'ai', subdomain:'applied ai',
    status:'repository', series:{id:'AAI-E', order:4}, source:'Applied AI for Everyday and Workplace Use, MC4', nsqf:'NSQF 4 (proposed)', nsqfNum:4, ladder:{track:'ai', rung:4},
    stage:'applied', difficulty:4, hours:16, langs:['English','Hindi'], langStrict:false,
    oneLiner:'Build and test your own AI method for a task you do every week.',
    modules:['4.1 Build the Method','4.2 Test and Harden It','4.3 Demonstrate and Commit','Final Demonstration'],
    prereq:{all:['ai_task_use','ai_verification','ai_safety'], any:[]}, teaches:['ai_method'],
    careerOutcomes:['Any trade or job'], trades:['all'], interests:['ai','build'], tags:[],
    promise:'In this course you build a tested AI method for one task you do every week, and show it working live.' },

  { id:'AI01', name:'Python for Data Work', category:'data', domain:'ai', subdomain:'data and code',
    status:'demo', source:'Swift AI Academy demo catalogue (AI01, Applied AI/ML Practitioner)', nsqf:'NSQF to be confirmed', nsqfNum:5, ladder:{track:'ai', rung:5},
    stage:'applied', difficulty:5, hours:16, langs:['English'], langStrict:true, device:'computer',
    oneLiner:'Write simple Python to load, clean and summarise data tables.',
    modules:['Variables and types','Loops and functions','Tabular data','Cleaning','Summary report'],
    prereq:{all:['computer_basics','spreadsheet','ai_prompting'], any:[], minEducation:'class12', altEducationTrades:['it']}, teaches:['python_data','coding_basics'],
    careerOutcomes:['Data and AI support roles'], trades:['copa','ictsm','electronics'], interests:['computers','ai'], tags:[], minRelevance:0.4,
    promise:'This course is the first step towards data and AI work. You write simple Python to clean a table and make a correct summary.' },

  /* ---------------- Bot building ---------------- */
  { id:'BOT-1', name:'SwiftChat Bot Builder', category:'bot', domain:'ai', subdomain:'bot building',
    status:'authored', source:'Course outline authored for the ITI pathway (SwiftChat Bot Builder)', nsqf:'NSQF to be confirmed', nsqfNum:4, ladder:null,
    stage:'applied', difficulty:4, hours:15, langs:['English','Hindi'], langStrict:false,
    oneLiner:'Design and build a simple chatbot on SwiftChat that answers real questions.',
    modules:[{n:'What a Chatbot Does: real bots for shops, repairs and services', h:2},{n:'Plan Your Bot: pick one job, write the questions and answers', h:3},{n:'Build It in SwiftChat: menus, replies and simple forms', h:5},{n:'Test With Real Users: fix confusing replies', h:3},{n:'Showcase: demonstrate your working bot', h:2}],
    prereq:{all:['phone_typing','web_search','ai_first_use'], any:['computer_basics','online_forms']}, teaches:['bot_building'],
    careerOutcomes:['Small business support','Tech support roles'], trades:['all'], interests:['build','ai','computers','customers'], tags:[], minRelevance:0.5,
    promise:'In this course you plan and build your own chatbot on SwiftChat, for example one that answers customer questions about your service.' }
];

/* ---- Live course: shown to every learner at the top of the results ---- */
const LIVE_COURSE = { url:'https://aai-tau.vercel.app/#S01', courseId:'AAI-MC1', label:'Applied AI · Module 1', host:'aai-tau.vercel.app' };

/* ---- A course that does NOT exist yet: used to demonstrate automatic ingestion ---- */
const NEW_COURSE_DEMO = { id:'CR-CV1', name:'CV and Job Application Basics', category:'career', domain:'communication', subdomain:'job applications',
    status:'authored', source:'Course outline authored for the ITI pathway (ingestion demo)', nsqf:'NSQF 3 (proposed)', nsqfNum:3, ladder:null,
    stage:'skill', difficulty:2, hours:6, langs:['English','Hindi'], langStrict:false,
    oneLiner:'Make a one-page CV and apply for jobs online without mistakes.',
    modules:[{n:'What a CV Is For: what employers look for in an ITI CV', h:1},{n:'Your One-Page CV: trade, skills, projects and contact', h:3},{n:'Applying Online Safely: portals, uploads and fake job checks', h:2}],
    prereq:{all:['phone_typing'], any:['eng_forms_writing','online_forms']}, teaches:['cv_writing','online_forms'],
    careerOutcomes:['Any job application'], trades:['all'], interests:[], tags:['jobReady','short'],
    promise:'This short course helps you make a one-page CV and apply for jobs online safely.' };

module.exports = { SKILLS, GOALS, INTERESTS, TRADES, EDU_RANK, CATEGORY, COURSES, LIVE_COURSE, NEW_COURSE_DEMO };
