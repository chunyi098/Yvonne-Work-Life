'use strict';

// ============================================================
// STATE
// ============================================================
let expenses = JSON.parse(localStorage.getItem('wh_expenses') || 'null');
let meetings = JSON.parse(localStorage.getItem('wh_meetings') || 'null');
let todos    = JSON.parse(localStorage.getItem('wh_todos')    || 'null');
let sheets   = JSON.parse(localStorage.getItem('wh_sheets')  || '[]');

if (!expenses) expenses = [
  { id:1, name:'Grab Taxi',    amount:25.50, purpose:'Client meeting transport', date:'2026-04-10', reimbursed:false, receipt:'', receiptImg:'' },
  { id:2, name:'Office Depot', amount:45.80, purpose:'Stationery supplies',     date:'2026-04-05', reimbursed:true,  receipt:'', receiptImg:'' },
  { id:3, name:'Coffee Bean',  amount:62.00, purpose:'Team lunch',              date:'2026-04-12', reimbursed:false, receipt:'', receiptImg:'' }
];
if (!meetings) meetings = [
  { id:1, title:'1-on-1 with Manager', date:'2026-04-18', time:'11:00', notes:'' },
  { id:2, title:'Client Presentation', date:'2026-04-17', time:'14:00', notes:'' },
  { id:3, title:'Weekly Standup',      date:'2026-04-16', time:'10:00', notes:'' }
];
if (!todos) todos = [
  { id:1, text:'Review project proposal',    done:false },
  { id:2, text:'Update timesheet',           done:false },
  { id:3, text:'Book flight for conference', done:false },
  { id:4, text:'Submit Q1 report',           done:true  }
];

let expFilter             = 'all';
let calYear               = new Date().getFullYear();
let calMonth              = new Date().getMonth();
let selectedDate          = null;
let currentReceiptDataUrl = '';

// ============================================================
// PERSIST
// ============================================================
function save() {
  localStorage.setItem('wh_expenses', JSON.stringify(expenses));
  localStorage.setItem('wh_meetings', JSON.stringify(meetings));
  localStorage.setItem('wh_todos',    JSON.stringify(todos));
  localStorage.setItem('wh_sheets',   JSON.stringify(sheets));
}

// ============================================================
// HELPERS
// ============================================================
function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}
function el(id) { return document.getElementById(id); }

// ============================================================
// ON LOAD: handle ?confirm= param from finance portal
// ============================================================
function checkConfirmParam() {
  const params = new URLSearchParams(window.location.search);
  const raw    = params.get('confirm');
  if (!raw) return;

  let paidIds;
  try { paidIds = JSON.parse(atob(raw)); } catch(_) { return; }
  if (!Array.isArray(paidIds) || !paidIds.length) return;

  let updatedCount = 0;
  paidIds.forEach(id => {
    const e = expenses.find(x => String(x.id) === String(id));
    if (e && !e.reimbursed) { e.reimbursed = true; updatedCount++; }
  });

  if (updatedCount > 0) {
    save();
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    // Show success banner
    const banner = el('finance-confirm-banner');
    if (banner) {
      banner.textContent = '\u2713 ' + updatedCount + ' expense' + (updatedCount>1?'s':'') + ' marked as reimbursed by the finance team!';
      banner.style.display = 'block';
      setTimeout(() => { banner.style.display = 'none'; }, 6000);
    }
    renderDashboard();
    renderExpenses();
  }
}

// ============================================================
// NAVIGATION
// ============================================================
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el('page-' + pageId).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(btn => {
    const oc = btn.getAttribute('onclick') || '';
    if (oc.includes("'" + pageId + "'")) btn.classList.add('active');
  });
  const map = { dashboard:renderDashboard, expenses:renderExpenses, calendar:renderCalendar, todos:renderTodos, sheets:renderSheets };
  if (map[pageId]) map[pageId]();
}

// ============================================================
// API KEY  (optional)
// ============================================================
function getApiKey() { return localStorage.getItem('wh_apikey') || ''; }
function updateApiKeyStatus() {
  const span = el('api-key-status');
  if (!span) return;
  if (getApiKey()) { span.textContent = '\u2713 API Key saved'; span.style.color = '#15803d'; }
  else             { span.textContent = 'Set API Key (optional)'; span.style.color = ''; }
}
function openApiKeyModal()  { el('apikey-input').value = getApiKey(); el('apikey-modal').classList.add('open'); }
function closeApiKeyModal() { el('apikey-modal').classList.remove('open'); }
function saveApiKey() {
  const k = el('apikey-input').value.trim();
  if (!k) { alert('Please enter your API key.'); return; }
  if (!k.startsWith('sk-ant-')) { alert('Key should start with sk-ant-'); return; }
  localStorage.setItem('wh_apikey', k);
  updateApiKeyStatus(); closeApiKeyModal();
  alert('API key saved! Smarter AI scanning is now active.');
}
function clearApiKey() {
  if (!confirm('Remove saved API key?')) return;
  localStorage.removeItem('wh_apikey');
  el('apikey-input').value = ''; updateApiKeyStatus(); closeApiKeyModal();
}

// ============================================================
// FINANCE PORTAL LINK
// ============================================================
function openFinanceLink() {
  // Encode only pending expenses (strip receiptImg to keep URL short)
  const pending = expenses.filter(e => !e.reimbursed).map(e => ({
    id: e.id, name: e.name, amount: e.amount,
    purpose: e.purpose, date: e.date, reimbursed: false, receipt: e.receipt
  }));
  if (!pending.length) { alert('No pending expenses to share with finance.'); return; }

  const payload  = btoa(JSON.stringify(pending));
  const base     = window.location.href.split('?')[0].replace('index.html','').replace(/\/$/, '');
  const link     = base + '/finance.html?data=' + payload;

  el('finance-link-text').textContent = link;
  el('finance-link-modal').classList.add('open');
}
function copyFinanceLink() {
  const txt = el('finance-link-text').textContent;
  navigator.clipboard.writeText(txt)
    .then(() => { el('finance-copy-btn').textContent = '\u2713 Copied!'; setTimeout(() => { el('finance-copy-btn').textContent = 'Copy Link'; }, 2000); })
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = txt; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      el('finance-copy-btn').textContent = '\u2713 Copied!';
      setTimeout(() => { el('finance-copy-btn').textContent = 'Copy Link'; }, 2000);
    });
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const now    = new Date();
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  el('hero-date').textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();
  const td = todayStr();
  el('dash-pending-count').textContent  = expenses.filter(e => !e.reimbursed).length;
  el('dash-meetings-count').textContent = meetings.filter(m => m.date === td).length;
  const done = todos.filter(t => t.done).length;
  el('dash-todo-progress').textContent = done + '/' + todos.length;
  const upcoming = [...meetings].filter(m => m.date >= td).sort((a,b) => a.date.localeCompare(b.date)).slice(0,3);
  el('dash-meetings-list').innerHTML = upcoming.length
    ? upcoming.map(m => '<div class="meeting-item"><div class="meeting-dot"></div><div><div class="meeting-title">' + m.title + '</div><div class="meeting-time">' + fmtDate(m.date) + ' &bull; ' + m.time + '</div></div></div>').join('')
    : '<p class="empty-hint">No upcoming meetings</p>';
  const pct = todos.length ? Math.round(done / todos.length * 100) : 0;
  el('dash-progress-bar').style.width  = pct + '%';
  el('dash-progress-text').textContent = done + ' of ' + todos.length + ' completed';
  el('dash-progress-pct').textContent  = pct + '%';
  el('dash-todos-preview').innerHTML = todos.slice(0,3).map(t =>
    '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:' + (t.done?'#999':'#1a1a1a') + '">' +
    '<div style="width:8px;height:8px;border-radius:50%;background:' + (t.done?'#15803d':'#e8e8e8') + '"></div>' +
    '<span style="' + (t.done?'text-decoration:line-through':'') + '">' + t.text + '</span></div>').join('');
  el('dash-expenses-list').innerHTML = [...expenses].reverse().slice(0,3).map(e =>
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #eee">' +
    '<div><div style="font-size:13px">' + e.name + '</div><div style="font-size:11px;color:#999">' + e.purpose + '</div></div>' +
    '<div style="text-align:right"><div style="font-size:13px;font-weight:700">$' + Number(e.amount).toFixed(2) + '</div>' +
    '<span class="badge ' + (e.reimbursed?'reimbursed':'pending') + '">' + (e.reimbursed?'Reimbursed':'Pending') + '</span></div></div>').join('');
  el('dash-sheets-list').innerHTML = sheets.length
    ? sheets.slice(0,3).map(s =>
        '<a class="sheet-item" href="' + s.url + '" target="_blank">' +
        '<div class="sheet-icon"><svg width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M9 1H4a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V6L9 1z"/></svg></div>' +
        '<div class="sheet-name">' + s.name + '</div></a>').join('')
    : '<p class="empty-hint">No sheets linked yet</p>';
}

// ============================================================
// EXPENSES
// ============================================================
function renderExpenses() {
  const pending = expenses.filter(e => !e.reimbursed);
  const reimb   = expenses.filter(e =>  e.reimbursed);
  el('exp-total').textContent          = '$' + expenses.reduce((s,e) => s+Number(e.amount), 0).toFixed(2);
  el('exp-pending-val').textContent    = '$' + pending.reduce((s,e) => s+Number(e.amount), 0).toFixed(2);
  el('exp-reimbursed-val').textContent = '$' + reimb.reduce((s,e) => s+Number(e.amount), 0).toFixed(2);
  const list = expFilter==='all' ? expenses : expFilter==='pending' ? pending : reimb;
  el('expense-table-body').innerHTML = list.map(e =>
    '<tr>' +
    '<td><button class="check-btn ' + (e.reimbursed?'done':'') + '" onclick="toggleExp(' + e.id + ')" title="' + (e.reimbursed?'Mark pending':'Mark reimbursed') + '"></button></td>' +
    '<td>' + e.name + '</td><td>' + e.purpose + '</td>' +
    '<td>$' + Number(e.amount).toFixed(2) + '</td>' +
    '<td>' + fmtDate(e.date) + '</td>' +
    '<td>' + (e.receiptImg
      ? '<img src="' + e.receiptImg + '" onclick="viewReceipt(' + e.id + ')" style="height:36px;width:48px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid #eee" title="View receipt" />'
      : (e.receipt ? '<span style="font-size:11px;color:#FF3B7F">' + e.receipt + '</span>' : '&mdash;')) + '</td>' +
    '<td><button onclick="deleteExp(' + e.id + ')" style="background:none;border:none;cursor:pointer;color:#ccc;font-size:18px">&times;</button></td>' +
    '</tr>').join('');
}
function viewReceipt(id) {
  const e = expenses.find(x => x.id === id);
  if (!e || !e.receiptImg) return;
  const w = window.open('', '_blank');
  w.document.write('<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="' + e.receiptImg + '" style="max-width:100%;max-height:100vh" /></body></html>');
}
function toggleExp(id) { const e=expenses.find(x=>x.id===id); if(e) e.reimbursed=!e.reimbursed; save(); renderExpenses(); renderDashboard(); }
function deleteExp(id)  { expenses=expenses.filter(x=>x.id!==id); save(); renderExpenses(); renderDashboard(); }
function filterExp(f, btn) {
  expFilter = f;
  document.querySelectorAll('#page-expenses .filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active'); renderExpenses();
}
function openExpenseModal() {
  currentReceiptDataUrl = '';
  el('expense-modal').classList.add('open');
  el('exp-date').value = todayStr();
  resetUploadArea();
  el('ai-processing').classList.remove('visible');
  el('ai-processing').textContent = '';
  el('ocr-progress-wrap').style.display = 'none';
  el('ocr-raw-box').style.display = 'none';
}
function closeExpenseModal() {
  el('expense-modal').classList.remove('open');
  ['exp-name','exp-amount','exp-purpose','exp-date'].forEach(id => el(id).value = '');
  el('receipt-file').value = '';
  currentReceiptDataUrl = '';
  el('ai-processing').classList.remove('visible');
  el('ocr-progress-wrap').style.display = 'none';
  el('ocr-raw-box').style.display = 'none';
  resetUploadArea();
}
function resetUploadArea() {
  const area = el('upload-area');
  area.style.backgroundImage = '';
  area.style.backgroundSize  = '';
  area.style.minHeight       = '';
  area.style.borderColor     = '';
  el('upload-icon-wrap').style.display = 'flex';
  el('upload-text').textContent     = 'Upload Receipt';
  el('upload-sub-text').textContent = 'PNG, JPG, WEBP \u2014 auto-scanned free, no API key needed';
}
function saveExpense() {
  const name    = el('exp-name').value.trim();
  const amount  = el('exp-amount').value;
  const purpose = el('exp-purpose').value.trim();
  const date    = el('exp-date').value;
  if (!name||!amount||!purpose||!date) { alert('Please fill in all fields.'); return; }
  const file = el('receipt-file').files[0];
  expenses.push({ id:Date.now(), name, amount:Number(amount), purpose, date, reimbursed:false, receipt:file?file.name:'', receiptImg:currentReceiptDataUrl });
  save(); closeExpenseModal(); renderExpenses(); renderDashboard();
}

// ============================================================
// RECEIPT PARSER
// ============================================================
function parseReceiptText(raw) {
  const text  = raw.replace(/\r/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const upper = text.toUpperCase();
  let amount = '';
  const totalKeywords = [
    /total\s*(?:amount)?[:\s]*\$?\s*(\d[\d,]*\.\d{2})/i,
    /amount\s*(?:due|paid|payable)[:\s]*\$?\s*(\d[\d,]*\.\d{2})/i,
    /grand\s*total[:\s]*\$?\s*(\d[\d,]*\.\d{2})/i,
    /balance\s*(?:due)?[:\s]*\$?\s*(\d[\d,]*\.\d{2})/i,
    /(?:net\s*)?total[:\s]*\$?\s*(\d[\d,]*\.\d{2})/i,
    /(?:s\$|sgd|usd|myr)\s*(\d[\d,]*\.\d{2})/i,
  ];
  for (const re of totalKeywords) { const m=text.match(re); if(m){amount=m[1].replace(/,/g,'');break;} }
  if (!amount) {
    const candidates=[];
    for(const line of lines){const m=line.match(/(?:\$|S\$|SGD|RM|USD)?\s*(\d{1,6}[.,]\d{2})\s*$/i);if(m){const v=parseFloat(m[1].replace(',','.'));if(v>0.01&&v<99999)candidates.push(v);}}
    if(candidates.length) amount=String(Math.max(...candidates).toFixed(2));
  }
  if (!amount) {
    const allNums=[]; const re3=/\b(\d{1,6}\.\d{2})\b/g; let m3;
    while((m3=re3.exec(text))!==null){const v=parseFloat(m3[1]);if(v>0.5&&v<99999)allNums.push(v);}
    if(allNums.length) amount=String(Math.max(...allNums).toFixed(2));
  }
  let date='';
  const mn='jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
  const datePatterns=[
    /\b(20\d{2})[-\/](0?[1-9]|1[0-2])[-\/](0?[1-9]|[12]\d|3[01])\b/,
    /\b(0?[1-9]|[12]\d|3[01])[-\/](0?[1-9]|1[0-2])[-\/](20\d{2})\b/,
    new RegExp('\\b(0?[1-9]|[12]\\d|3[01])\\s+('+mn+')[a-z]*\\s+(20\\d{2})\\b','i'),
    new RegExp('\\b('+mn+')[a-z]*\\s+(0?[1-9]|[12]\\d|3[01])[,\\s]+(20\\d{2})\\b','i'),
    /\b(0?[1-9]|[12]\d|3[01])[-\/](0?[1-9]|1[0-2])[-\/](\d{2})\b/,
  ];
  for(const pat of datePatterns){const m=text.match(pat);if(m){try{const d=new Date(m[0].replace(/-/g,'/'));if(!isNaN(d.getTime())&&d.getFullYear()>=2000){date=d.toISOString().split('T')[0];break;}}catch(_){}}}
  if(!date) date=todayStr();
  const skipLine=/^(\d[\d\s\-\/]+$|receipt|invoice|tax invoice|order|tel:|phone:|fax:|gst|uen|reg\s*no|website|www\.|http|address:|thank you|page \d|cashier|server|table|pos |ref |#)/i;
  let name='';
  for(let i=0;i<Math.min(lines.length,12);i++){const ln=lines[i];if(ln.length<=2)continue;if(skipLine.test(ln))continue;if(/^\d+(\.\d+)?$/.test(ln))continue;if(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(ln))continue;const clean=ln.replace(/[^\w\s&'.,-]/g,'').trim();if(clean.length>=3){name=clean;break;}}
  if(!name) name=lines.length?lines[0].replace(/[^\w\s]/g,'').trim().slice(0,40):'Receipt';
  if(!name) name='Receipt';
  const purposeMap=[
    [/grab|gojek|taxi|uber|lyft|ride.hail|transport|cab\b/i,'Transport'],
    [/mrt|bus|train|commut|toll|ez.?link/i,'Transport'],
    [/flight|airlin|airfare|airport|air ticket/i,'Travel'],
    [/hotel|airbnb|resort|lodg|accommodat|inn\b/i,'Accommodation'],
    [/restaurant|bistro|hawker|kopitiam|foodcourt|food court|dining/i,'Meals & Entertainment'],
    [/cafe|coffee|starbucks|ya kun|toast box|koi|gong cha/i,'Meals & Entertainment'],
    [/lunch|dinner|breakfast|supper|meal|eat|drink\b/i,'Meals & Entertainment'],
    [/fairprice|cold storage|giant|sheng siong|supermarket|grocery/i,'Groceries'],
    [/7.?eleven|cheers|watsons|guardian|convenience/i,'Groceries'],
    [/office|stationery|supplies|depot|print|paper\b/i,'Office Supplies'],
    [/pharmacy|clinic|hospital|polyclinic|medical|dental|health/i,'Medical'],
    [/book|course|training|seminar|conference|workshop/i,'Training & Education'],
    [/software|subscription|saas|cloud|hosting|domain/i,'Software & Subscriptions'],
    [/grab ?food|food.?panda|deliveroo|deliver/i,'Meals & Entertainment'],
  ];
  let purpose='Business Expense';
  const searchText=upper+' '+name.toUpperCase();
  for(const [re,label] of purposeMap){if(re.test(searchText)){purpose=label;break;}}
  return{name,amount,date,purpose};
}

// ============================================================
// RECEIPT PROCESSING
// ============================================================
async function processReceipt(input) {
  const file=input.files[0]; if(!file) return;
  const aiEl=el('ai-processing'), area=el('upload-area');
  const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
  currentReceiptDataUrl=dataUrl;
  area.style.backgroundImage='url('+dataUrl+')';
  area.style.backgroundSize='cover'; area.style.backgroundPosition='center';
  area.style.minHeight='120px'; area.style.borderColor='#FF3B7F';
  el('upload-icon-wrap').style.display='none';
  el('upload-text').textContent='\u2713 '+file.name;
  el('upload-sub-text').textContent='Scanning...';
  if(getApiKey()){await scanWithClaude(dataUrl,file,getApiKey(),aiEl);}
  else{await scanWithTesseract(dataUrl,file,aiEl);}
}
async function scanWithTesseract(dataUrl,file,aiEl){
  const progressWrap=el('ocr-progress-wrap'),bar=el('ocr-bar'),pctText=el('ocr-pct'),statusText=el('ocr-status-text'),rawBox=el('ocr-raw-box'),rawPre=el('ocr-raw-text');
  progressWrap.style.display='block'; rawBox.style.display='none'; aiEl.classList.remove('visible');
  try{
    const result=await Tesseract.recognize(dataUrl,'eng',{logger:function(info){
      if(info.status==='recognizing text'){const p=Math.round((info.progress||0)*100);bar.style.width=p+'%';pctText.textContent=p+'%';statusText.textContent='Reading receipt... '+p+'%';}
      else if(info.status==='loading tesseract core')statusText.textContent='Loading OCR engine (first time only)...';
      else if(info.status==='initializing tesseract')statusText.textContent='Initialising OCR...';
      else if(info.status==='loading language traineddata')statusText.textContent='Loading language data...';
      else if(info.status==='initializing api')statusText.textContent='Starting up...';
    }});
    progressWrap.style.display='none';
    const rawText=result.data.text||'';
    if(rawText.trim().length>0){rawPre.textContent=rawText;rawBox.style.display='block';}
    if(rawText.trim().length<3)throw new Error('OCR could not read any text. Try a clearer, higher-resolution screenshot.');
    const parsed=parseReceiptText(rawText);
    el('exp-name').value=parsed.name||''; el('exp-amount').value=parsed.amount||'';
    el('exp-date').value=parsed.date||todayStr(); el('exp-purpose').value=parsed.purpose||'';
    el('upload-sub-text').textContent='Click to change';
    const fc=[parsed.name,parsed.amount].filter(Boolean).length;
    if(fc===2){aiEl.textContent='\u2713 Fields auto-filled from OCR! Please review and adjust if needed.';aiEl.style.background='#ecfdf5';aiEl.style.color='#15803d';}
    else{aiEl.textContent='\u26a0\ufe0f OCR read the text (see below) but could not find all fields. Please fill in any missing ones.';aiEl.style.background='#fffbeb';aiEl.style.color='#b45309';}
    aiEl.classList.add('visible');
  }catch(err){
    progressWrap.style.display='none';
    aiEl.textContent='\u26a0\ufe0f '+(err.message||'Scan failed \u2014 please fill in fields manually.');
    aiEl.style.background='#fff0f0'; aiEl.style.color='#cc0000'; aiEl.classList.add('visible');
    el('upload-sub-text').textContent='Click to change';
  }
}
async function scanWithClaude(dataUrl,file,apiKey,aiEl){
  aiEl.textContent='\ud83e\udd16 Claude AI is reading your receipt...';aiEl.style.background='#FFE0ED';aiEl.style.color='#CC2B66';aiEl.classList.add('visible');
  try{
    const b64=dataUrl.split(',')[1],mt=file.type||'image/png';
    const resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:300,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:mt,data:b64}},{type:'text',text:'This is a receipt. Extract: merchant name, total amount paid (number only, no currency symbol), date in YYYY-MM-DD format, and purchase category. Reply ONLY as JSON with no extra text: {"name":"...","amount":"...","date":"...","purpose":"..."}'}]}]})})
    if(!resp.ok){const err=await resp.json().catch(()=>({}));if(resp.status===401)throw new Error('Invalid API key.');if(resp.status===429)throw new Error('Rate limit.');throw new Error((err.error&&err.error.message)||'HTTP '+resp.status);}
    const data=await resp.json(),txt=(data.content||[]).map(c=>c.text||'').join('');
    let parsed;try{parsed=JSON.parse(txt.replace(/```json|```/g,'').trim());}catch(_){const mm=txt.match(/\{[\s\S]*?\}/);if(!mm)throw new Error('Bad AI response');parsed=JSON.parse(mm[0]);}
    if(parsed.name)el('exp-name').value=parsed.name;
    if(parsed.amount)el('exp-amount').value=String(parsed.amount).replace(/[^0-9.]/g,'');
    if(parsed.date)el('exp-date').value=parsed.date;
    if(parsed.purpose)el('exp-purpose').value=parsed.purpose;
    el('upload-sub-text').textContent='Click to change';
    aiEl.textContent='\u2713 Claude auto-filled the fields \u2014 check before saving.';aiEl.style.background='#ecfdf5';aiEl.style.color='#15803d';
  }catch(err){console.warn('Claude failed, falling back to OCR:',err.message);await scanWithTesseract(dataUrl,file,aiEl);}
}

// ============================================================
// CALENDAR
// ============================================================
function renderCalendar() {
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  el('cal-month-label').textContent=MONTHS[calMonth]+' '+calYear;
  el('cal-headers').innerHTML=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>'<div class="cal-day-header">'+d+'</div>').join('');
  const firstDow=new Date(calYear,calMonth,1).getDay(),startOffset=firstDow===0?6:firstDow-1,lastDate=new Date(calYear,calMonth+1,0).getDate(),td=todayStr(),meetDates=new Set(meetings.map(m=>m.date));
  let html='';
  for(let i=0;i<startOffset;i++)html+='<div class="cal-day other-month">'+new Date(calYear,calMonth,-startOffset+i+1).getDate()+'</div>';
  for(let d=1;d<=lastDate;d++){const ds=calYear+'-'+String(calMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'),cls=(ds===td?' today':'')+(meetDates.has(ds)?' has-event':'');html+='<div class="cal-day'+cls+'" onclick="selectDate(\''+ds+'\')">' +d+'</div>';}
  const endDow=new Date(calYear,calMonth,lastDate).getDay();
  for(let i=1;i<=(endDow===0?0:7-endDow);i++)html+='<div class="cal-day other-month">'+i+'</div>';
  el('cal-days').innerHTML=html;
  const sorted=[...meetings].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  el('all-meetings-list').innerHTML=sorted.length?sorted.map(m=>'<div class="meeting-item"><div class="meeting-dot"></div><div style="flex:1"><div class="meeting-title">'+m.title+'</div><div class="meeting-time">'+fmtDate(m.date)+' &bull; '+m.time+(m.notes?' &mdash; '+m.notes:'')+'</div></div><button class="meeting-del" onclick="deleteMeeting('+m.id+')">&#10005;</button></div>').join(''):'<p class="empty-hint">No meetings yet</p>';
}
function selectDate(ds){selectedDate=ds;el('selected-date-label').textContent=fmtDate(ds);const dm=meetings.filter(m=>m.date===ds);el('day-meetings').innerHTML=dm.length?dm.map(m=>'<div class="meeting-item"><div class="meeting-dot"></div><div><div class="meeting-title">'+m.title+'</div><div class="meeting-time">'+m.time+(m.notes?' &mdash; '+m.notes:'')+'</div></div></div>').join(''):'<p class="empty-hint">No meetings on this day</p>';}
function prevMonth(){calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCalendar();}
function nextMonth(){calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCalendar();}
function openMeetingModal(){el('meeting-modal').classList.add('open');if(selectedDate)el('meet-date').value=selectedDate;}
function closeMeetingModal(){el('meeting-modal').classList.remove('open');}
function saveMeeting(){
  const title=el('meet-title').value.trim(),date=el('meet-date').value,time=el('meet-time').value,notes=el('meet-notes').value.trim();
  if(!title||!date||!time){alert('Please fill in title, date and time.');return;}
  meetings.push({id:Date.now(),title,date,time,notes});save();scheduleNotifications();closeMeetingModal();
  el('meet-title').value='';el('meet-notes').value='';renderCalendar();renderDashboard();
}
function deleteMeeting(id){meetings=meetings.filter(m=>m.id!==id);save();renderCalendar();renderDashboard();}

// ============================================================
// NOTIFICATIONS  (7 AM SGT)
// ============================================================
function scheduleNotifications(){
  if(!('Notification'in window))return;
  Notification.requestPermission().then(perm=>{const banner=el('notif-banner');banner.style.display='block';
    if(perm==='granted'){banner.textContent='Notifications enabled \u2014 reminders at 7:00 AM SGT daily.';scheduleDailyCheck();}
    else banner.textContent='Notification permission denied. Enable in browser settings for 7 AM SGT reminders.';});
}
function scheduleDailyCheck(){const now=new Date(),sgt=new Date(now.toLocaleString('en-US',{timeZone:'Asia/Singapore'}));const next7=new Date(sgt);next7.setHours(7,0,0,0);if(sgt>=next7)next7.setDate(next7.getDate()+1);setTimeout(function(){sendDailyNotif();setInterval(sendDailyNotif,86400000);},next7-sgt);}
function sendDailyNotif(){const td=todayStr(),tm=meetings.filter(m=>m.date===td);const body=tm.length?'You have '+tm.length+' meeting(s) today: '+tm.map(m=>m.title+' at '+m.time).join(', '):'No meetings today \u2014 have a productive day!';if(Notification.permission==='granted')new Notification('Work Hub \u2014 Daily Briefing',{body});}

// ============================================================
// TODOS
// ============================================================
function renderTodos(){const done=todos.filter(t=>t.done).length,pct=todos.length?Math.round(done/todos.length*100):0;el('todo-progress-fill').style.width=pct+'%';el('todo-progress-label').textContent=done+'/'+todos.length+' completed';el('todo-list').innerHTML=todos.map(t=>'<div class="todo-item"><button class="check-btn '+(t.done?'done':'')+'" onclick="toggleTodo('+t.id+')"></button><span class="todo-text '+(t.done?'done':'')+'">'+t.text+'</span><button class="todo-del" onclick="deleteTodo('+t.id+')">&times;</button></div>').join('');}
function addTodo(){const inp=el('todo-input'),txt=inp.value.trim();if(!txt)return;todos.push({id:Date.now(),text:txt,done:false});inp.value='';save();renderTodos();renderDashboard();}
function toggleTodo(id){const t=todos.find(x=>x.id===id);if(t)t.done=!t.done;save();renderTodos();renderDashboard();}
function deleteTodo(id){todos=todos.filter(x=>x.id!==id);save();renderTodos();renderDashboard();}

// ============================================================
// SHEETS
// ============================================================
function renderSheets(){const q=(el('sheet-search').value||'').toLowerCase(),filtered=q?sheets.filter(s=>s.name.toLowerCase().includes(q)||s.url.toLowerCase().includes(q)):sheets;el('sheets-list').innerHTML=filtered.length?filtered.map(s=>'<a class="sheet-item" href="'+s.url+'" target="_blank"><div class="sheet-icon"><svg width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M9 1H4a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V6L9 1z"/></svg></div><div style="flex:1"><div class="sheet-name">'+s.name+'</div><div style="font-size:11px;color:#999">'+(s.url.length>55?s.url.slice(0,55)+'\u2026':s.url)+'</div></div><button class="sheet-del" onclick="event.preventDefault();deleteSheet('+s.id+')">&times;</button></a>').join(''):'<p class="empty-hint">No sheets found</p>';}
function openSheetModal(){el('sheet-modal').classList.add('open');}
function closeSheetModal(){el('sheet-modal').classList.remove('open');}
function saveSheet(){const name=el('sheet-name-input').value.trim(),url=el('sheet-url-input').value.trim();if(!name||!url){alert('Please fill in both fields.');return;}sheets.push({id:Date.now(),name,url});save();closeSheetModal();el('sheet-name-input').value='';el('sheet-url-input').value='';renderSheets();renderDashboard();}
function deleteSheet(id){sheets=sheets.filter(s=>s.id!==id);save();renderSheets();renderDashboard();}

// ============================================================
// INIT
// ============================================================
renderDashboard();
updateApiKeyStatus();
checkConfirmParam();
