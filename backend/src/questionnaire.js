'use strict';
/* Spec A4 questionnaire.
   Ported unchanged from the Course Finder reference prototype (artifact "Swift AI Academy - Find your courses (ITI)", version 1791439992-5d3c).
   Spec: ITI Course Finder - Product and Technical Specification (7 Oct 2026). */
const { TRADES, GOALS } = require('./data');

/* ---- Questionnaire: screens > questions. Adding a question needs only an evidence rule, never a course change. ---- */
const LANGS = ['Hindi','English','Bengali','Marathi','Telugu','Tamil','Gujarati','Urdu','Kannada','Odia','Malayalam','Punjabi','Assamese','Other'];

const SECTIONS = ['Your trade','Your studies','Your goals','Phone and computer','AI apps','Languages','Talking and writing','Your time'];

/* Happy flow: easy facts first, then goals, then everyday habits, then languages, then work situations, then time. */
const SCREENS = [
  {section:0, key:'iti', title:'Let us start with your ITI', qs:[
    {id:'trade', type:'select', q:'Which trade are you studying?', options:TRADES.map(t=>[t.id,t.label]), required:true},
    {id:'tradeOther', type:'text', q:'Type your trade', placeholder:'For example: Painter General', showIf:a=>a.trade==='other', required:true},
    {id:'itiStatus', type:'single', q:'Where are you in your ITI course?', required:true, options:[
      ['y1','I am in 1st year'],['y2','I am in 2nd year or final year'],['done','I have finished ITI'],['apprentice','I am doing an apprenticeship now']]}
  ]},
  {section:1, key:'studies', title:'Your studies', qs:[
    {id:'education', type:'single', q:'What did you pass before joining ITI?', required:true, options:[
      ['class8','Class 8'],['class10','Class 10'],['class12','Class 12'],['diploma','Diploma'],['graduate','Graduate (BA, BCom, BSc or other)'],['other','Other']]},
    {id:'stream', type:'single', q:'Which subjects did you study in Class 12?', showIf:a=>['class12','graduate','diploma'].includes(a.education), required:true, optionsFn:a=>[
      ['science','Science'],['commerce','Commerce'],['arts','Arts'],['vocational','Vocational subjects']]
      .concat(['diploma','graduate'].includes(a.education) ? [['none12','I have not studied Class 12']] : [])},
    {id:'workExp', type:'single', q:'Have you worked before? Any job, shop or family work counts.', required:true, options:[
      ['none','No, not yet'],['helper','Yes, as a helper or in family work'],['job','Yes, in a job or apprenticeship']]}
  ]},
  {section:2, key:'goals', title:'Your goals', qs:[
    {id:'goals', type:'multi', max:3, q:'What do you want to do after ITI?', hint:'Choose up to 3', required:true,
      options:Object.entries(GOALS).filter(([k,g])=>!g.implicit).map(([k,g])=>[k,g.label]), exclusive:'not_sure'}
  ]},
  {section:2, key:'enjoy', title:'What you enjoy', qs:[
    {id:'workType', type:'single', q:'What kind of work do you enjoy most?', required:true, options:[
      ['machines','Working with machines and tools'],['computers','Working on computers'],['people','Working with people, like customers or a team'],['mix','A mix of these']]},
    {id:'interests', type:'multi', q:'Which of these sound interesting to you?', hint:'Choose all that apply', required:true, exclusive:'none',
      options:[['computers','Learning more about computers'],['ai','AI apps like ChatGPT'],['build','Making my own app or chatbot'],['design','Making posters or videos'],
               ['repair','Fixing and repairing things'],['customers','Talking to customers and selling'],['lead','Leading a team one day'],['none','None of these']]}
  ]},
  {section:2, key:'job', title:'Getting a job', qs:[
    {id:'jobTiming', type:'single', q:'When do you want to start working?', required:true, options:[
      ['now','As soon as possible'],['six','In the next 6 months'],['later','After 1 year or more'],['study','I will study further first']]},
    {id:'interviews', type:'single', q:'Have you ever given a job interview?', required:true, options:[
      ['never','No, never'],['few','Yes, once or twice'],['many','Yes, 3 times or more']]},
    {id:'relocate', type:'single', q:'Can you move to another city for a job?', required:true, options:[
      ['yes','Yes'],['nearby','Only to a nearby city'],['no','No'],['notsure','Not sure']]}
  ]},
  {section:3, key:'phone', title:'Your phone', qs:[
    {id:'phone', type:'single', q:'Do you use a smartphone?', required:true, options:[
      ['own','Yes, my own phone'],['shared','Yes, a family member\'s phone'],['none','No']]},
    {id:'phoneDone', type:'multi', q:'On a phone, which of these have you done?', hint:'Choose all that apply', showIf:a=>a.phone && a.phone!=='none', required:true, exclusive:'none', options:[
      ['msg','Sent WhatsApp messages'],['pdf','Sent a photo or PDF on WhatsApp'],['youtube','Learnt something from YouTube'],['search','Searched on Google'],
      ['form','Filled an online form'],['upi','Paid using UPI (PhonePe, GPay, Paytm)'],['email','Sent an email'],['maps','Used Google Maps'],['none','None of these']]}
  ]},
  {section:3, key:'computer', title:'Computers', qs:[
    {id:'computerUse', type:'single', q:'Have you used a computer or laptop?', required:true, options:[
      ['never','Never'],['few','A few times'],['often','Often, every week']]},
    {id:'computerDone', type:'multi', q:'On a computer, which of these have you done?', hint:'Choose all that apply', showIf:a=>a.computerUse && a.computerUse!=='never', required:true, exclusive:'none', options:[
      ['doc','Typed a document (Word or Google Docs)'],['sheet','Made a table in Excel or Google Sheets'],['slides','Made a presentation (PowerPoint)'],
      ['email','Sent an email'],['code','Written computer code'],['design','Made a poster or edited a video'],['cad','Used AutoCAD or drawing software'],['course','Done an online course'],['none','None of these']]},
    {id:'computerAccess', type:'single', q:'Can you use a computer when you need one?', required:true, options:[
      ['iti','Yes, at ITI'],['home','Yes, at home or a cyber cafe'],['no','No']]}
  ]},
  {section:4, key:'ai', title:'AI apps', qs:[
    {id:'aiUsed', type:'single', q:'Have you used an app where you type or speak a question, and it answers you like a person?', required:true,
      examples:['ChatGPT','Gemini','SwiftChat','Copilot','Meta AI on WhatsApp'], options:[
      ['yes','Yes, I have used one'],['no','No, never'],['notsure','I am not sure']]},
    {id:'aiTools', type:'chips', q:'Which ones have you used?', showIf:a=>a.aiUsed==='yes', required:true, options:[
      ['ChatGPT','ChatGPT'],['Gemini','Gemini'],['SwiftChat','SwiftChat'],['Copilot','Copilot'],['Meta AI','Meta AI'],['Other','Other']]},
    {id:'aiFreq', type:'single', q:'How often do you use it?', showIf:a=>a.aiUsed==='yes', required:true, options:[
      ['once','I tried it once or twice'],['month','A few times a month'],['week','Every week']]},
    {id:'aiPurpose', type:'multi', q:'What did you use it for?', hint:'Choose all that apply', showIf:a=>a.aiUsed==='yes', required:true, options:[
      ['doubts','Clearing study doubts'],['trade','Questions about my trade work'],['writing','Writing a message, letter or application'],['translate','Translating languages'],
      ['cv','Making a CV'],['images','Making pictures or videos'],['code','Writing code'],['fun','Just for fun or chatting']]}
  ]},
  {section:4, key:'think', title:'Think about this', qs:[
    {id:'aiCheck', type:'single', q:'What will you do?', required:true,
      scene:{who:'Imagine this', text:'An AI app gives you a measurement for your workshop job.'}, options:[
      ['use','Use it directly'],['check','Check it in my trade book or ask my instructor'],['skip','I would not use AI for this']]},
    {id:'scam', type:'single', q:'What will you do?', required:true,
      scene:{who:'You get a WhatsApp message', text:'"You are selected for a government job. Pay Rs 2,000 today to confirm."'}, options:[
      ['pay','Pay quickly so I do not miss it'],['call','Call the number to ask more'],['check','Ignore it and check on the official website or with my ITI']]}
  ]},
  {section:5, key:'langs', title:'Languages you know', qs:[
    {id:'speak', type:'chips', q:'Which languages can you speak easily?', options:LANGS.map(l=>[l,l]), required:true},
    {id:'read', type:'chips', q:'Which languages can you read easily?', options:LANGS.map(l=>[l,l]), required:true}
  ]},
  {section:5, key:'learnlang', title:'Learning language', qs:[
    {id:'learnLang', type:'single', q:'Which language do you want to learn in?', hint:'It is fine if you do not know English. Many courses are in Hindi too.', required:true, options:[
      ['English','English'],['Hindi','Hindi'],['Both','Both English and Hindi'],['Regional','My own language (not English or Hindi)']]}
  ]},
  {section:6, key:'speak', title:'Speaking at work', qs:[
    {id:'introEnglish', type:'single', q:'Have you ever introduced yourself in English? For example in class, an interview or to a visitor.', required:true, options:[
      ['many','Yes, many times'],['few','Yes, once or twice'],['never','No, never']]},
    {id:'scenarioInstr', type:'single', q:'What would you do?', required:true,
      scene:{who:'Your supervisor says', text:'"Please check the machine and tell me if there is any problem."'}, options:[
      ['reply_en','I understand, and I can reply in English'],['reply_own','I understand, but I will reply in Hindi or my language'],['ask','I need someone to explain it to me']]}
  ]},
  {section:6, key:'situations', title:'Two quick situations', qs:[
    {id:'readNotice', type:'single', q:'When should you bring your ID card?', required:true,
      scene:{who:'Notice on the workshop board', text:'Workshop closed on Monday. Bring your ID card on Tuesday.', notice:true}, options:[
      ['monday','Monday'],['tuesday','Tuesday'],['notsure','I am not sure']]},
    {id:'customerReply', type:'single', q:'Which reply is best?', required:true,
      scene:{who:'A customer says', text:'"The fan you repaired is still not working."'}, options:[
      ['a','"That is not my problem."'],['b','"Sorry for the trouble. I will check it again today."'],['c','"Call me next week."']]}
  ]},
  {section:6, key:'donebefore', title:'Things you have done', qs:[
    {id:'commDone', type:'multi', q:'Which of these have you done before?', hint:'Choose all that apply', required:true, exclusive:'none', options:[
      ['email','Written an email'],['letter','Written a leave application or letter'],['cv','Made a CV (resume)'],['jobform','Applied for a job online'],
      ['talk','Spoken in front of the class'],['gd','Taken part in a group discussion'],['customers','Talked to customers'],
      ['explain','Explained a task to a junior or new person'],['lead','Led a small team or group work'],['diary','Written a job card or daily work diary in English'],['none','None of these']]}
  ]},
  {section:7, key:'time', title:'Your time', qs:[
    {id:'weeklyTime', type:'single', q:'How much time can you give to learning each week?', required:true, options:[
      ['low','1 to 2 hours'],['mid','3 to 5 hours'],['high','More than 5 hours']]}
  ]}
];

module.exports = { LANGS, SECTIONS, SCREENS };
