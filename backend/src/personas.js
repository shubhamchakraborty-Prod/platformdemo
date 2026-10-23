'use strict';
/* Spec A2 regression personas.
   Ported unchanged from the Course Finder reference prototype (artifact "Swift AI Academy - Find your courses (ITI)", version 1791439992-5d3c).
   Spec: ITI Course Finder - Product and Technical Specification (7 Oct 2026). */

const PERSONAS = [
  { key:'ramesh', name:'Ramesh', tagline:'Electrician, very new to phones and AI', answers:{
    name:'Ramesh', trade:'electrician', itiStatus:'y1', education:'class10', workExp:'helper',
    goals:['govt_job','trade_work'], workType:'machines', interests:['repair'], jobTiming:'six', interviews:'never', relocate:'nearby',
    speak:['Hindi'], read:['Hindi'], learnLang:'Hindi', introEnglish:'never', scenarioInstr:'ask', readNotice:'notsure', customerReply:'b',
    commDone:['none'], phone:'shared', phoneDone:['msg','youtube'], computerUse:'never', computerAccess:'iti',
    aiUsed:'no', aiCheck:'check', scam:'call', weeklyTime:'low' }},
  { key:'priya', name:'Priya', tagline:'COPA student, comfortable with computers', answers:{
    name:'Priya', trade:'copa', itiStatus:'y2', education:'class12', stream:'commerce', workExp:'none',
    goals:['tech_career','private_job'], workType:'computers', interests:['computers','ai','build'], jobTiming:'six', interviews:'few', relocate:'yes',
    speak:['Hindi','English','Marathi'], read:['Hindi','English','Marathi'], learnLang:'English', introEnglish:'many', scenarioInstr:'reply_en', readNotice:'tuesday', customerReply:'b',
    commDone:['email','letter','talk','jobform'], phone:'own', phoneDone:['msg','pdf','youtube','search','form','upi','email','maps'], computerUse:'often',
    computerDone:['doc','sheet','slides','email','course'], computerAccess:'iti',
    aiUsed:'yes', aiTools:['ChatGPT','Gemini'], aiFreq:'week', aiPurpose:['doubts','writing','translate'], aiCheck:'check', scam:'check', weeklyTime:'mid' }},
  { key:'arjun', name:'Arjun', tagline:'Fitter, looking for a private-sector job now', answers:{
    name:'Arjun', trade:'fitter', itiStatus:'done', education:'class10', workExp:'helper',
    goals:['private_job','apprenticeship'], workType:'machines', interests:['repair'], jobTiming:'now', interviews:'never', relocate:'yes',
    speak:['Hindi'], read:['Hindi','English'], learnLang:'Both', introEnglish:'few', scenarioInstr:'reply_own', readNotice:'tuesday', customerReply:'b',
    commDone:['letter'], phone:'own', phoneDone:['msg','pdf','youtube','search','upi'], computerUse:'few', computerDone:['none'], computerAccess:'home',
    aiUsed:'yes', aiTools:['Meta AI'], aiFreq:'once', aiPurpose:['fun'], aiCheck:'use', scam:'call', weeklyTime:'mid' }},
  { key:'salim', name:'Salim', tagline:'Welder, wants a government job', answers:{
    name:'Salim', trade:'welder', itiStatus:'y2', education:'class10', workExp:'none',
    goals:['govt_job'], workType:'machines', interests:['repair'], jobTiming:'six', interviews:'never', relocate:'no',
    speak:['Hindi','Urdu'], read:['Hindi','Urdu'], learnLang:'Hindi', introEnglish:'never', scenarioInstr:'reply_own', readNotice:'tuesday', customerReply:'b',
    commDone:['none'], phone:'own', phoneDone:['msg','pdf','youtube','search','form','upi'], computerUse:'never', computerAccess:'iti',
    aiUsed:'no', aiCheck:'check', scam:'pay', weeklyTime:'mid' }},
  { key:'kavya', name:'Kavya', tagline:'Electronics Mechanic, keen on AI and building', answers:{
    name:'Kavya', trade:'electronics', itiStatus:'y2', education:'class12', stream:'science', workExp:'none',
    goals:['tech_career','business'], workType:'mix', interests:['ai','build','computers'], jobTiming:'later', interviews:'few', relocate:'yes',
    speak:['Hindi','English','Bengali'], read:['Hindi','English','Bengali'], learnLang:'Both', introEnglish:'few', scenarioInstr:'reply_en', readNotice:'tuesday', customerReply:'b',
    commDone:['email','explain','diary'], phone:'own', phoneDone:['msg','pdf','youtube','search','form','upi','email'], computerUse:'few', computerDone:['doc','sheet'], computerAccess:'iti',
    aiUsed:'yes', aiTools:['ChatGPT','SwiftChat'], aiFreq:'month', aiPurpose:['doubts','trade','code'], aiCheck:'check', scam:'check', weeklyTime:'high' }},
  { key:'meena', name:'Meena', tagline:'Sewing Technology, wants her own shop', answers:{
    name:'Meena', trade:'sewing', itiStatus:'y1', education:'class8', workExp:'helper',
    goals:['business','freelance'], workType:'people', interests:['customers','design'], jobTiming:'later', interviews:'never', relocate:'no',
    speak:['Tamil'], read:['Tamil'], learnLang:'Regional', introEnglish:'never', scenarioInstr:'ask', readNotice:'notsure', customerReply:'b',
    commDone:['customers'], phone:'own', phoneDone:['msg','pdf','youtube','upi'], computerUse:'never', computerAccess:'no',
    aiUsed:'notsure', aiCheck:'skip', scam:'check', weeklyTime:'low' }}
];

module.exports = { PERSONAS };
