'use strict';

// STATE
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

function save() {
  localStorage.setItem('wh_expenses', JSON.stringify(expenses));
  localStorage.setItem('wh_meetings', JSON.stringify(meetings));
  localStorage.setItem('wh_todos',    JSON.stringify(todos));
  localStorage.setItem('wh_sheets',   JSON.stringify(sheets));
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }); }
function el(id) { return document.getElementById(id); }

function showFinanceBanner(msg) {
  const b = el('finance-confirm-banner');
  if (!b) return;
  b.textContent = msg;
  b.style.display = 'block';
  setTimeout(() => { b.style.display = 'none'; }, 5000);
}

// ============================================================
// FINANCE INSTANT SYNC
// ============================================================
function initFinanceSync() {
  try {
    const bc = new BroadcastChannel('wh_finance_sync');
    bc.onmessage = function(e) {
      if (e.data && e.data.type === 'MARK_PAID') {
        const exp = expenses.find(x => String(x.id) === String(e.data.id));
        if (exp && !exp.reimbursed) {
          exp.reimbursed = true;
          save();
          renderDashboard(); renderExpenses();
          showFinanceBanner('\u2713 ' + exp.name + ' marked as reimbursed by finance!');
        }
      }
    };
  } catch(_) {}

  window.addEventListener('storage', function(e) {
    if (e.key === 'wh_expenses' && e.newValue) {
      try {
        const updated = JSON.parse(e.newValue);
        const newlyPaid = updated.filter(u => {
          const old = expenses.find(x => String(x.id) === String(u.id));
          return u.reimbursed && old && !old.reimbursed;
        });
        if (newlyPaid.length > 0) {
          expenses = updated;
          renderDashboard(); renderExpenses();
          showFinanceBanner('\u2713 ' + newlyPaid.length + ' expense' + (newlyPaid.length > 1 ? 's' : '') + ' marked as reimbursed by finance!');
        }
      } catch(_) {}
    }
  });
}

function checkConfirmParam() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('confirm');
  if (!raw) return;
  let paidIds;
  try { paidIds = JSON.parse(atob(raw)); } catch(_) { return; }
  if (!Array.isArray(paidIds) || !paidIds.length) return;
  let count = 0;
  paidIds.forEach(id => { const e = expenses.find(x => String(x.id) === String(id)); if (e && !e.reimbursed) { e.reimbursed = true; count++; } });
  if (count > 0) {
    save();
    window.history.replaceState({}, document.title, window.location.pathname);
    showFinanceBanner('\u2713 ' + count + ' expense' + (count > 1 ? 's' : '') + ' marked as reimbursed!');
    renderDashboard(); renderExpenses();
  }
}

// GOOGLE CALENDAR
const GCAL_SCOPE    = 'https://www.googleapis.com/auth/calendar';
const GCAL_API_BASE = 'https://www.googleapis.com/calendar/v3';
let gcalToken = null, gcalTokenExp = 0, gcalImported = [];
function gcalClientId()    { return localStorage.getItem('wh_gcal_client_id') || ''; }
function gcalIsConnected() { return !!gcalToken && Date.now() < gcalTokenExp; }
function gcalUpdateUI() {
  const btn=el('gcal-btn'),btnText=el('gcal-btn-text'),syncBtn=el('gcal-sync-btn');
  if(!btn)return;
  if(!gcalClientId()){btnText.textContent='Connect Google Calendar';btn.style.background='';btn.style.color='';if(syncBtn)syncBtn.style.display='none';}
  else if(gcalIsConnected()){btnText.textContent='\u2713 Google Calendar connected';btn.style.background='#e8f5e9';btn.style.color='#2e7d32';if(syncBtn)syncBtn.style.display='flex';}
  else{btnText.textContent='Sign in to Google Calendar';btn.style.background='';btn.style.color='';if(syncBtn)syncBtn.style.display='none';}
}
function gcalToggle(){
  if(!gcalClientId()){el('gcal-client-id-input').value=gcalClientId();el('gcal-setup-modal').classList.add('open');return;}
  if(gcalIsConnected()){if(confirm('Disconnect Google Calendar?')){gcalToken=null;gcalTokenExp=0;gcalImported=[];gcalUpdateUI();}return;}
  gcalSignIn();
}
function gcalSaveClientId(){
  const id=el('gcal-client-id-input').value.trim();if(!id){alert('Please paste your Client ID.');return;}
  localStorage.setItem('wh_gcal_client_id',id);el('gcal-setup-modal').classList.remove('open');gcalSignIn();
}
function gcalSignIn(){
  const clientId=gcalClientId();if(!clientId){alert('Please set up your Google Client ID first.');return;}
  if(typeof google==='undefined'||!google.accounts){alert('Google Identity Services failed to load. Please refresh.');return;}
  const client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:GCAL_SCOPE,callback:(resp)=>{
    if(resp.error){alert('Google sign-in failed: '+resp.error);return;}
    gcalToken=resp.access_token;gcalTokenExp=Date.now()+(resp.expires_in-60)*1000;gcalUpdateUI();gcalFetchEvents();
  }});
  client.requestAccessToken();
}
async function gcalFetchEvents(){
  if(!gcalIsConnected()){gcalSignIn();return;}
  const statusBar=el('gcal-status-bar');
  if(statusBar){statusBar.style.display='block';statusBar.textContent='Syncing with Google Calendar...';}
  try{
    const now=new Date(),tMin=new Date(now.getFullYear(),now.getMonth()-1,1).toISOString(),tMax=new Date(now.getFullYear(),now.getMonth()+4,0).toISOString();
    const resp=await fetch(GCAL_API_BASE+'/calendars/primary/events?timeMin='+encodeURIComponent(tMin)+'&timeMax='+encodeURIComponent(tMax)+'&singleEvents=true&orderBy=startTime&maxResults=200',{headers:{Authorization:'Bearer '+gcalToken}});
    if(!resp.ok)throw new Error('HTTP '+resp.status);
    const data=await resp.json(),existingGcalIds=new Set(meetings.filter(m=>m.gcalId).map(m=>m.gcalId));let added=0;
    (data.items||[]).forEach(ev=>{
      if(existingGcalIds.has(ev.id))return;const start=ev.start&&(ev.start.dateTime||ev.start.date);if(!start)return;
      const dt=new Date(start);meetings.push({id:Date.now()+Math.random(),gcalId:ev.id,title:ev.summary||'(No title)',date:dt.toISOString().split('T')[0],time:ev.start.dateTime?String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0'):'00:00',notes:ev.description||ev.location||''});added++;
    });
    if(added>0)save();gcalImported=(data.items||[]).map(e=>e.id);renderCalendar();renderDashboard();
    if(statusBar){statusBar.textContent=added>0?'\u2713 Synced! '+added+' new event'+(added>1?'s':'')+' imported.':'\u2713 Up to date.';setTimeout(()=>{statusBar.style.display='none';},4000);}
  }catch(err){
    if(statusBar){statusBar.style.background='#fff0f0';statusBar.style.color='#cc0000';statusBar.textContent='\u26a0\ufe0f Sync failed: '+err.message;}
    if(err.message&&err.message.includes('401')){gcalToken=null;gcalTokenExp=0;gcalUpdateUI();}
  }
}
async function gcalCreateEvent(meeting){
  if(!gcalIsConnected())return;
  try{
    const start=new Date(meeting.date+'T'+meeting.time+':00'),end=new Date(start.getTime()+3600000);
    const resp=await fetch(GCAL_API_BASE+'/calendars/primary/events',{method:'POST',headers:{'Authorization':'Bearer '+gcalToken,'Content-Type':'application/json'},body:JSON.stringify({summary:meeting.title,description:meeting.notes||'',start:{dateTime:start.toISOString()},end:{dateTime:end.toISOString()}})});
    if(resp.ok){const ev=await resp.json();const m=meetings.find(x=>x.id===meeting.id);if(m){m.gcalId=ev.id;save();}}
  }catch(err){console.warn('GCal create failed:',err.message);}
}
async function gcalDeleteEvent(gcalId){
  if(!gcalIsConnected()||!gcalId)return;
  try{await fetch(GCAL_API_BASE+'/calendars/primary/events/'+gcalId,{method:'DELETE',headers:{'Authorization':'Bearer '+gcalToken}});}catch(err){console.warn('GCal delete failed:',err.message);}
}

// NAVIGATION
function showPage(pageId){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  el('page-'+pageId).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(btn=>{const oc=btn.getAttribute('onclick')||'';if(oc.includes("'"+pageId+"'"))btn.classList.add('active');});
  const map={dashboard:renderDashboard,expenses:renderExpenses,calendar:renderCalendar,todos:renderTodos,sheets:renderSheets};
  if(map[pageId])map[pageId]();
}

// API KEY
function getApiKey(){return localStorage.getItem('wh_apikey')||'';}
function updateApiKeyStatus(){const span=el('api-key-status');if(!span)return;if(getApiKey()){span.textContent='\u2713 API Key saved';span.style.color='#15803d';}else{span.textContent='Set API Key (optional)';span.style.color='';}}
function openApiKeyModal(){el('apikey-input').value=getApiKey();el('apikey-modal').classList.add('open');}
function closeApiKeyModal(){el('apikey-modal').classList.remove('open');}
function saveApiKey(){const k=el('apikey-input').value.trim();if(!k){alert('Please enter your API key.');return;}if(!k.startsWith('sk-ant-')){alert('Key should start with sk-ant-');return;}localStorage.setItem('wh_apikey',k);updateApiKeyStatus();closeApiKeyModal();alert('API key saved!');}
function clearApiKey(){if(!confirm('Remove saved API key?'))return;localStorage.removeItem('wh_apikey');el('apikey-input').value='';updateApiKeyStatus();closeApiKeyModal();}

// FINANCE LINK
function openFinanceLink(){
  const pending=expenses.filter(e=>!e.reimbursed).map(e=>({id:e.id,name:e.name,amount:e.amount,purpose:e.purpose,date:e.date,reimbursed:false,receipt:e.receipt}));
  if(!pending.length){alert('No pending expenses to share.');return;}
  const base=window.location.href.split('?')[0].replace('index.html','').replace(/\/$/,'');
  el('finance-link-text').textContent=base+'/finance.html?data='+btoa(JSON.stringify(pending));
  el('finance-link-modal').classList.add('open');
}
function copyFinanceLink(){
  const txt=el('finance-link-text').textContent;
  navigator.clipboard.writeText(txt).then(()=>{el('finance-copy-btn').textContent='\u2713 Copied!';setTimeout(()=>{el('finance-copy-btn').textContent='Copy Link';},2000);}).catch(()=>{const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);el('finance-copy-btn').textContent='\u2713 Copied!';setTimeout(()=>{el('finance-copy-btn').textContent='Copy Link';},2000);});
}

// DASHBOARD
function renderDashboard(){
  const now=new Date(),days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  el('hero-date').textContent=days[now.getDay()]+', '+months[now.getMonth()]+' '+now.getDate();
  const td=todayStr();
  el('dash-pending-count').textContent=expenses.filter(e=>!e.reimbursed).length;
  el('dash-meetings-count').textContent=meetings.filter(m=>m.date===td).length;
  const done=todos.filter(t=>t.done).length;
  el('dash-todo-progress').textContent=done+'/'+todos.length;
  const upcoming=[...meetings].filter(m=>m.date>=td).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  el('dash-meetings-list').innerHTML=upcoming.length?upcoming.map(m=>'<div class="meeting-item"><div class="meeting-dot"></div><div><div class="meeting-title">'+m.title+'</div><div class="meeting-time">'+fmtDate(m.date)+' &bull; '+m.time+'</div></div></div>').join(''):'<p class="empty-hint">No upcoming meetings</p>';
  const pct=todos.length?Math.round(done/todos.length*100):0;
  el('dash-progress-bar').style.width=pct+'%';el('dash-progress-text').textContent=done+' of '+todos.length+' completed';el('dash-progress-pct').textContent=pct+'%';
  el('dash-todos-preview').innerHTML=todos.slice(0,3).map(t=>'<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:'+(t.done?'#999':'#1a1a1a')+'"><div style="width:8px;height:8px;border-radius:50%;background:'+(t.done?'#15803d':'#e8e8e8')+'" ></div><span style="'+(t.done?'text-decoration:line-through':'')+'">'+t.text+'</span></div>').join('');
  el('dash-expenses-list').innerHTML=[...expenses].reverse().slice(0,3).map(e=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #eee"><div><div style="font-size:13px">'+e.name+'</div><div style="font-size:11px;color:#999">'+e.purpose+'</div></div><div style="text-align:right"><div style="font-size:13px;font-weight:700">$'+Number(e.amount).toFixed(2)+'</div><span class="badge '+(e.reimbursed?'reimbursed':'pending')+'">'+(e.reimbursed?'Reimbursed':'Pending')+'</span></div></div>').join('');
  el('dash-sheets-list').innerHTML=sheets.length?sheets.slice(0,3).map(s=>'<a class="sheet-item" href="'+s.url+'" target="_blank"><div class="sheet-icon"><svg width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M9 1H4a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V6L9 1z"/></svg></div><div class="sheet-name">'+s.name+'</div></a>').join(''):'<p class="empty-hint">No sheets linked yet</p>';
}

// EXPENSES
function renderExpenses(){
  const pending=expenses.filter(e=>!e.reimbursed),reimb=expenses.filter(e=>e.reimbursed);
  el('exp-total').textContent='$'+expenses.reduce((s,e)=>s+Number(e.amount),0).toFixed(2);
  el('exp-pending-val').textContent='$'+pending.reduce((s,e)=>s+Number(e.amount),0).toFixed(2);
  el('exp-reimbursed-val').textContent='$'+reimb.reduce((s,e)=>s+Number(e.amount),0).toFixed(2);
  const list=expFilter==='all'?expenses:expFilter==='pending'?pending:reimb;
  el('expense-table-body').innerHTML=list.map(e=>'<tr><td><button class="check-btn '+(e.reimbursed?'done':'')+' " onclick="toggleExp('+e.id+')" title="'+(e.reimbursed?'Mark pending':'Mark reimbursed')+'"></button></td><td>'+e.name+'</td><td>'+e.purpose+'</td><td>$'+Number(e.amount).toFixed(2)+'</td><td>'+fmtDate(e.date)+'</td><td>'+(e.receiptImg?'<img src="'+e.receiptImg+'" onclick="viewReceipt('+e.id+')" style="height:36px;width:48px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid #eee" title="View receipt" />':(e.receipt?'<span style="font-size:11px;color:#FF3B7F">'+e.receipt+'</span>':'&mdash;'))+'</td><td><button onclick="deleteExp('+e.id+')" style="background:none;border:none;cursor:pointer;color:#ccc;font-size:18px">&times;</button></td></tr>').join('');
}
function viewReceipt(id){const e=expenses.find(x=>x.id===id);if(!e||!e.receiptImg)return;const w=window.open('','_blank');w.document.write('<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="'+e.receiptImg+'" style="max-width:100%;max-height:100vh" /></body></html>');}
function toggleExp(id){const e=expenses.find(x=>x.id===id);if(e)e.reimbursed=!e.reimbursed;save();renderExpenses();renderDashboard();}
function deleteExp(id){expenses=expenses.filter(x=>x.id!==id);save();renderExpenses();renderDashboard();}
function filterExp(f,btn){expFilter=f;document.querySelectorAll('#page-expenses .filter-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');renderExpenses();}
function openExpenseModal(){currentReceiptDataUrl='';el('expense-modal').classList.add('open');el('exp-date').value=todayStr();resetUploadArea();el('ai-processing').classList.remove('visible');el('ai-processing').textContent='';el('ocr-progress-wrap').style.display='none';el('ocr-raw-box').style.display='none';}
function closeExpenseModal(){el('expense-modal').classList.remove('open');['exp-name','exp-amount','exp-purpose','exp-date'].forEach(id=>el(id).value='');el('receipt-file').value='';currentReceiptDataUrl='';el('ai-processing').classList.remove('visible');el('ocr-progress-wrap').style.display='none';el('ocr-raw-box').style.display='none';resetUploadArea();}
function resetUploadArea(){const area=el('upload-area');area.style.backgroundImage='';area.style.backgroundSize='';area.style.minHeight='';area.style.borderColor='';el('upload-icon-wrap').style.display='flex';el('upload-text').textContent='Upload Receipt';el('upload-sub-text').textContent='PNG, JPG, WEBP \u2014 auto-scanned free, no API key needed';}
function saveExpense(){const name=el('exp-name').value.trim(),amount=el('exp-amount').value,purpose=el('exp-purpose').value.trim(),date=el('exp-date').value;if(!name||!amount||!purpose||!date){alert('Please fill in all fields.');return;}const file=el('receipt-file').files[0];expenses.push({id:Date.now(),name,amount:Number(amount),purpose,date,reimbursed:false,receipt:file?file.name:'',receiptImg:currentReceiptDataUrl});save();closeExpenseModal();renderExpenses();renderDashboard();}

// ============================================================
// IMAGE PREPROCESSING
// ============================================================
async function preprocessImageForOCR(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MIN_LONG_EDGE = 1500;
      let w = img.naturalWidth, h = img.naturalHeight;
      const longEdge = Math.max(w, h);
      if (longEdge < MIN_LONG_EDGE) {
        const scale = MIN_LONG_EDGE / longEdge;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const gray = new Uint8ClampedArray(w * h);
      for (let i = 0; i < w * h; i++) {
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }
      const borderSamples = [];
      const step = Math.max(1, Math.floor(w / 40));
      for (let x = 0; x < w; x += step) { borderSamples.push(gray[x]); borderSamples.push(gray[(h-1)*w+x]); }
      const vstep = Math.max(1, Math.floor(h / 40));
      for (let y = 0; y < h; y += vstep) { borderSamples.push(gray[y*w]); borderSamples.push(gray[y*w+w-1]); }
      borderSamples.sort((a,b)=>a-b);
      const isDark = borderSamples[Math.floor(borderSamples.length/2)] < 100;
      if (isDark) { for (let i = 0; i < gray.length; i++) gray[i] = 255 - gray[i]; }
      const sorted = gray.slice().sort((a,b)=>a-b);
      const lo = sorted[Math.floor(sorted.length*0.05)], hi = sorted[Math.floor(sorted.length*0.95)];
      const range = hi - lo || 1;
      for (let i = 0; i < gray.length; i++) gray[i] = Math.min(255, Math.max(0, Math.round(((gray[i]-lo)/range)*255)));
      const BLOCK = 18, BIAS = isDark ? 8 : 10;
      const out = new Uint8ClampedArray(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const x0=Math.max(0,x-BLOCK),x1=Math.min(w-1,x+BLOCK),y0=Math.max(0,y-BLOCK),y1=Math.min(h-1,y+BLOCK);
          let sum=0,count=0;
          for (let yy=y0;yy<=y1;yy++) for (let xx=x0;xx<=x1;xx++) { sum+=gray[yy*w+xx]; count++; }
          out[y*w+x] = gray[y*w+x] < (sum/count) - BIAS ? 0 : 255;
        }
      }
      for (let i = 0; i < w*h; i++) { const v=out[i]; data[i*4]=v; data[i*4+1]=v; data[i*4+2]=v; data[i*4+3]=255; }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ============================================================
// OCR LINE QUALITY CHECK
// Returns true if a line looks like garbled logo/image text.
// ============================================================
function isNoiseLine(line) {
  if (!line || line.length < 2) return true;
  const tokens = line.trim().split(/\s+/);
  if (!tokens.length) return true;
  let noise = 0;
  for (const t of tokens) {
    if (t.length === 1) { noise++; continue; }
    if (/[a-zA-Z]/.test(t) && /\d/.test(t) && t.length <= 4) { noise++; continue; }
    if (/^[A-Z]{1,2}$/.test(t)) { noise++; continue; }
  }
  return noise / tokens.length > 0.5;
}

// ============================================================
// RECEIPT TEXT PARSER
// ============================================================
function parseReceiptText(raw) {
  const text = raw.replace(/\r/g, '\n').replace(/[|l](?=\d)/g, '1').replace(/O(?=\d)/g, '0');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const upper = text.toUpperCase();

  // ---- AMOUNT ----
  let amount = '', fxDetected = false;

  const sgdExplicit = [
    /total\s+sgd\s*\$?\s*([\d,]+\.\d{2})/i,
    /sgd\s*\$\s*([\d,]+\.\d{2})/i,
    /s\$\s*([\d,]+\.\d{2})/i,
    /\bsgd\s+([\d,]+\.\d{2})/i,
  ];
  for (const re of sgdExplicit) { const m=text.match(re); if(m){amount=m[1].replace(/,/g,'');break;} }

  if (!amount) {
    const tp = [
      /(?:grand\s+)?total\s+(?:amount\s+)?(?:due|paid|payable)?[\s:]*(?:s?\$|sgd)?\s*([\d,]+\.\d{2})/i,
      /amount\s+(?:due|paid|payable)[\s:]*(?:s?\$|sgd)?\s*([\d,]+\.\d{2})/i,
      /balance\s+(?:due)?[\s:]*(?:s?\$|sgd)?\s*([\d,]+\.\d{2})/i,
      /(?:net\s+)?total[\s:]*(?:s?\$|sgd)?\s*([\d,]+\.\d{2})/i,
    ];
    for (const re of tp) { const m=text.match(re); if(m){amount=m[1].replace(/,/g,'');break;} }
  }

  if (!amount) {
    for (let i=0;i<lines.length;i++) {
      if (/^total\s*$/i.test(lines[i]) && i+1<lines.length) {
        const m=lines[i+1].match(/(?:s?\$|sgd)?\s*([\d,]+\.\d{2})/i);
        if(m){amount=m[1].replace(/,/g,'');break;}
      }
    }
  }

  if (!amount) {
    const fxm=text.match(/1\s*([A-Z]{3})\s*[=:]\s*([\d.]+)\s*SGD/i);
    if (fxm) {
      const fc=fxm[1].toUpperCase(), fr=parseFloat(fxm[2]);
      const fam=text.match(new RegExp(fc+'\\s*([\\d,]+\\.\\d{2})','i'));
      if(fam&&fr>0){amount=(parseFloat(fam[1].replace(/,/g,''))*fr).toFixed(2);fxDetected=true;}
    }
  }

  if (!amount) {
    const myr=text.match(/MYR\s*([\d,]+\.\d{2})/i);
    const nums=[]; const re=/\b(\d{1,6}\.\d{2})\b/g; let m;
    while((m=re.exec(text))!==null) nums.push(parseFloat(m[1]));
    if(myr&&nums.length){
      const ma=parseFloat(myr[1].replace(/,/g,''));
      const c=nums.filter(n=>n!==ma&&n>1&&n<ma);
      if(c.length) amount=Math.max(...c).toFixed(2);
    }
  }

  if (!amount) {
    const c=[];
    for (const ln of lines) {
      const m=ln.match(/(?:\$|s\$|sgd|rm|myr|usd)?\s*([\d,]{1,8}\.\d{2})\s*$/i);
      if(m){const v=parseFloat(m[1].replace(',','.'));if(v>0.01&&v<99999)c.push(v);}
    }
    if(c.length) amount=Math.max(...c).toFixed(2);
  }

  if (!amount) {
    const a=[]; const re=/\b(\d{1,6}\.\d{2})\b/g; let m;
    while((m=re.exec(text))!==null){const v=parseFloat(m[1]);if(v>0.5&&v<99999)a.push(v);}
    if(a.length) amount=Math.max(...a).toFixed(2);
  }

  // ---- DATE ----
  let date = '';
  const mn='jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
  const dp=[
    new RegExp('(?:confirmed|completed\\s+on|ordered?\\s+on|placed\\s+on)[\\s:]+(?:(0?[1-9]|[12]\\d|3[01])\\s+('+mn+')[a-z]*(?:[,\\s]+(20\\d{2}))?|('+mn+')[a-z]*\\s+(0?[1-9]|[12]\\d|3[01])[,\\s]+(20\\d{2}))','i'),
    new RegExp('\\b('+mn+')[a-z]*\\s+(0?[1-9]|[12]\\d|3[01])[,\\s]+(20\\d{2})\\b','i'),
    /\b(20\d{2})[-\/](0?[1-9]|1[0-2])[-\/](0?[1-9]|[12]\d|3[01])\b/,
    /\b(0?[1-9]|[12]\d|3[01])[-\/](0?[1-9]|1[0-2])[-\/](20\d{2})\b/,
    new RegExp('\\b(0?[1-9]|[12]\\d|3[01])\\s+('+mn+')[a-z]*\\s+(20\\d{2})\\b','i'),
    new RegExp('\\b(0?[1-9]|[12]\\d|3[01])\\s+('+mn+')[a-z]*\\b','i'),
    /\b(0?[1-9]|[12]\d|3[01])[-\/](0?[1-9]|1[0-2])[-\/](\d{2})\b/,
  ];
  for (const pat of dp) {
    const m=text.match(pat);
    if(m){
      try{
        let s=m[0].replace(/confirmed\s+on|completed\s+on|ordered?\s+on|placed\s+on/gi,'').trim();
        s=s.replace(/\s+at\s+\d+:\d+\s*(am|pm)?/i,'').replace(/-/g,'/');
        if(!/20\d{2}/.test(s)) s=s+' '+new Date().getFullYear();
        const d=new Date(s);
        if(!isNaN(d.getTime())&&d.getFullYear()>=2000){date=d.toISOString().split('T')[0];break;}
      }catch(_){}
    }
  }
  if(!date) date=todayStr();

  // ---- MERCHANT NAME ----
  // Strategy: search the ENTIRE text for brand fingerprints first.
  // This handles cases where the logo is unreadable but brand name
  // or unique menu items appear elsewhere in the document.
  //
  // Waa Cow specifically: their logo renders as garbage ("RRR WOON...")
  // but their menu items (Mentaiko Wagyu Beef, Original Chirashi,
  // Yuzu Foie Gras Wagyu Beef) are printed in plain text and are unique.
  // We match on individual keywords — no compound regex needed.

  const brandMap = [
    // Each entry: [regex tested on full uppercased text, brand name]
    [/\bWISE\b/, 'Wise'],
    [/GRAB\s*(?:FOOD|MART|EXPRESS|TAXI|CAR|PAY)?/, 'Grab'],
    [/GOJEK/, 'Gojek'],
    [/FOODPANDA/, 'Foodpanda'],
    [/DELIVEROO/, 'Deliveroo'],
    [/LAZADA/, 'Lazada'],
    [/SHOPEE/, 'Shopee'],
    // Waa Cow: logo unreadable — match on unique menu item words instead
    [/WAA\s*COW|WAACOW/, 'Waa Cow'],
    [/MENTAIKO\s+WAGYU/, 'Waa Cow'],
    [/YUZU\s+FOIE\s+GRAS/, 'Waa Cow'],
    [/ORIGINAL\s+CHIRASHI/, 'Waa Cow'],
    [/ORIGINAL\s+WAGYU\s+BEEF/, 'Waa Cow'],
    // Standard SG brands
    [/NTUC\s*(?:FAIRPRICE)?/, 'NTUC FairPrice'],
    [/FAIRPRICE/, 'NTUC FairPrice'],
    [/COLD\s*STORAGE/, 'Cold Storage'],
    [/SHENG\s*SIONG/, 'Sheng Siong'],
    [/DON\s*DON\s*DONKI|DONKI/, 'Don Don Donki'],
    [/\bGIANT\b/, 'Giant'],
    [/7[\s-]?ELEVEN/, '7-Eleven'],
    [/\bCHEERS\b/, 'Cheers'],
    [/WATSONS/, 'Watsons'],
    [/GUARDIAN/, 'Guardian'],
    [/STARBUCKS/, 'Starbucks'],
    [/COFFEE\s*BEAN/, 'The Coffee Bean'],
    [/YA\s*KUN/, 'Ya Kun'],
    [/TOAST\s*BOX/, 'Toast Box'],
    [/OLD\s*CHANG\s*KEE/, 'Old Chang Kee'],
    [/HAKKA\s*RESTAURANT/, 'Hakka Restaurant'],
    [/MCDONALD|MCDONALDS/, "McDonald's"],
    [/BURGER\s*KING/, 'Burger King'],
    [/\bKFC\b/, 'KFC'],
    [/\bSUBWAY\b/, 'Subway'],
    [/TEXAS\s*CHICKEN/, 'Texas Chicken'],
    [/BENGAWAN\s*SOLO/, 'Bengawan Solo'],
    [/PRIMA\s*DELI/, 'Prima Deli'],
    [/\bIKEA\b/, 'IKEA'],
    [/\bCOURTS\b/, 'Courts'],
    [/HARVEY\s*NORMAN/, 'Harvey Norman'],
    [/POPULAR\s*BOOKSTORE/, 'Popular Bookstore'],
    [/OFFICE\s*DEPOT/, 'Office Depot'],
    [/CHALLENGER/, 'Challenger'],
    [/BEST\s*DENKI/, 'Best Denki'],
    [/\bUNIQLO\b/, 'Uniqlo'],
    [/\bZARA\b/, 'Zara'],
    [/\bH&M\b/, 'H&M'],
    [/CAPITALAND/, 'CapitaLand Mall'],
  ];

  let name = '';
  // Test each brand pattern against the full uppercased text
  for (const [re, label] of brandMap) {
    if (re.test(upper)) { name = label; break; }
  }

  // Shopify order fallback: if we see "Order #" + Shopify-style text
  // but no brand matched above, try readable lines near the top
  if (!name) {
    const isShopifyOrder = /ORDER\s*#\s*\d+/.test(upper) &&
      /PREPARING.*ITEMS.*SHIPPING|BUY\s*AGAIN|ORDER\s*DISCOUNT|MASTERCARD|VISA/.test(upper);
    if (isShopifyOrder) {
      for (let i = 0; i < Math.min(lines.length, 8); i++) {
        const ln = lines[i];
        if (ln.length < 3) continue;
        if (/order|#\d|confirmed|preparing|shipping|buy again|\d{4,}/i.test(ln)) continue;
        if (isNoiseLine(ln)) continue;
        const clean = ln.replace(/[^\w\s&'.,\-]/g, '').trim();
        if (clean.length >= 3 && clean.length <= 50) { name = clean; break; }
      }
      if (!name) name = 'Online Order';
    }
  }

  // General fallback: first clean, non-noise line
  if (!name) {
    const skip = /^(\d[\d\s\-\/]+$|receipt|invoice|tax\s*invoice|order\s*#|tel:|phone:|fax:|gst|uen|reg\s*no|website|www\.|http|address:|thank\s*you|page\s+\d|cashier|server|table\s*\d|pos\s+|ref\s*[:#]|#\d|date[:\s]|time[:\s]|receipt\s*no|bill\s*no|invoice\s*no|trans[a-z]*\s*[:#]|merchant\s*name|transaction\s*id|fx\s*rate|completed)/i;
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const ln = lines[i];
      if (ln.length <= 2) continue;
      if (skip.test(ln)) continue;
      if (/^\d+(\.\d+)?$/.test(ln)) continue;
      if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(ln)) continue;
      if (isNoiseLine(ln)) continue;
      const clean = ln.replace(/[^\w\s&'.,\-]/g, '').trim();
      if (clean.length >= 3) { name = clean.slice(0, 50); break; }
    }
  }

  if (!name) name = 'Receipt';

  // ---- PURPOSE ----
  const pm = [
    [/grab\s*(?:car|taxi|hitch|premium|xl|exec)|gojek|uber|lyft|taxi|cab\b|car\s*hire|car\s*rental/i, 'Transport'],
    [/grab\s*food|foodpanda|deliveroo|food\s*delivery|deliver/i, 'Meals & Entertainment'],
    [/mrt|bus\s*(?:ticket|fare)|train|commut|toll|ez.?link|transitlink/i, 'Transport'],
    [/flight|airlin|airfare|airport|changi/i, 'Travel'],
    [/hotel|airbnb|resort|lodg|accommodat|inn\b|hostel/i, 'Accommodation'],
    [/restaurant|bistro|hawker|kopitiam|foodcourt|food\s*court|dining|eatery/i, 'Meals & Entertainment'],
    [/cafe|coffee|starbucks|ya\s*kun|toast\s*box|kopi/i, 'Meals & Entertainment'],
    [/lunch|dinner|breakfast|supper|meal|eat|drink\b|beverage|wagyu|chirashi|sushi|japanese|mentaiko|foie\s*gras/i, 'Meals & Entertainment'],
    [/ntuc|fairprice|cold\s*storage|giant|sheng\s*siong|supermarket|grocery|grocer/i, 'Groceries'],
    [/7.eleven|cheers|convenience\s*store|minimart/i, 'Groceries'],
    [/watsons|guardian|unity\s*pharmacy/i, 'Groceries'],
    [/office|stationery|supplies|depot|print|paper/i, 'Office Supplies'],
    [/pharmacy\b|clinic|hospital|medical|dental|polyclinic/i, 'Medical'],
    [/book|course|training|seminar|conference|workshop|tuition/i, 'Training & Education'],
    [/software|subscription|saas|cloud|hosting|domain|aws/i, 'Software & Subscriptions'],
    [/singtel|starhub|m1\b|circles?\.life|mobile\s*plan|broadband/i, 'Software & Subscriptions'],
  ];
  let purpose = 'Business Expense';
  const st = upper + ' ' + name.toUpperCase();
  for (const [re, label] of pm) { if (re.test(st)) { purpose = label; break; } }

  return { name, amount, date, purpose, fxDetected };
}

// ============================================================
// RECEIPT PROCESSING
// ============================================================
async function processReceipt(input) {
  const file = input.files[0]; if (!file) return;
  const aiEl = el('ai-processing'), area = el('upload-area');
  const dataUrl = await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
  currentReceiptDataUrl = dataUrl;
  area.style.backgroundImage='url('+dataUrl+')';area.style.backgroundSize='cover';area.style.backgroundPosition='center';area.style.minHeight='120px';area.style.borderColor='#FF3B7F';
  el('upload-icon-wrap').style.display='none';el('upload-text').textContent='\u2713 '+file.name;el('upload-sub-text').textContent='Scanning...';
  if (getApiKey()) { await scanWithClaude(dataUrl,file,getApiKey(),aiEl); } else { await scanWithTesseract(dataUrl,file,aiEl); }
}

async function scanWithTesseract(dataUrl, file, aiEl) {
  const pw=el('ocr-progress-wrap'),bar=el('ocr-bar'),pct=el('ocr-pct'),st=el('ocr-status-text'),rb=el('ocr-raw-box'),rp=el('ocr-raw-text');
  pw.style.display='block';rb.style.display='none';aiEl.classList.remove('visible');
  try {
    st.textContent='Enhancing image...';bar.style.width='5%';pct.textContent='5%';
    const processed = await preprocessImageForOCR(dataUrl);
    const result = await Tesseract.recognize(processed,'eng',{
      logger:function(info){
        if(info.status==='recognizing text'){const p=Math.round((info.progress||0)*100);bar.style.width=p+'%';pct.textContent=p+'%';st.textContent='Reading receipt... '+p+'%';}
        else if(info.status==='loading tesseract core')st.textContent='Loading OCR engine...';
        else if(info.status==='initializing tesseract')st.textContent='Initialising OCR...';
        else if(info.status==='loading language traineddata')st.textContent='Loading language data...';
      },
      tessedit_pageseg_mode:'6',tessedit_ocr_engine_mode:'1',preserve_interword_spaces:'1',
    });
    pw.style.display='none';
    const rawText=result.data.text||'';
    if(rawText.trim().length>0){rp.textContent=rawText;rb.style.display='block';}
    if(rawText.trim().length<3)throw new Error('OCR could not read text. Try a clearer photo.');
    const parsed=parseReceiptText(rawText);
    el('exp-name').value=parsed.name||'';el('exp-amount').value=parsed.amount||'';el('exp-date').value=parsed.date||todayStr();el('exp-purpose').value=parsed.purpose||'';
    el('upload-sub-text').textContent='Click to change';
    const filled=[parsed.name,parsed.amount].filter(Boolean).length;
    if(filled===2){
      const fx=parsed.fxDetected?' (converted from foreign currency \u2014 please verify)':'';
      aiEl.textContent='\u2713 Fields auto-filled!'+fx+' Review and adjust if needed.';
      aiEl.style.background=parsed.fxDetected?'#fffbeb':'#ecfdf5';aiEl.style.color=parsed.fxDetected?'#b45309':'#15803d';
    } else if(filled===1){
      aiEl.textContent='\u26a0\ufe0f Partial fill \u2014 some fields not detected. Check raw text below.';
      aiEl.style.background='#fffbeb';aiEl.style.color='#b45309';
    } else {
      aiEl.textContent='\u26a0\ufe0f Could not extract fields. Try a clearer, flat photo with good lighting.';
      aiEl.style.background='#fff0f0';aiEl.style.color='#cc0000';
    }
    aiEl.classList.add('visible');
  } catch(err) {
    pw.style.display='none';aiEl.textContent='\u26a0\ufe0f '+(err.message||'Scan failed.');
    aiEl.style.background='#fff0f0';aiEl.style.color='#cc0000';aiEl.classList.add('visible');
    el('upload-sub-text').textContent='Click to change';
  }
}

async function scanWithClaude(dataUrl, file, apiKey, aiEl) {
  aiEl.textContent='\ud83e\udd16 Claude AI reading receipt...';aiEl.style.background='#FFE0ED';aiEl.style.color='#CC2B66';aiEl.classList.add('visible');
  try {
    const b64=dataUrl.split(',')[1],mt=file.type||'image/png';
    const prompt=`You are reading a receipt, order confirmation, or payment screenshot. Extract the following and return ONLY a JSON object — no extra text, no markdown.

Rules:
- "name": the merchant or store name (e.g. "Grab", "Hakka Restaurant", "Waa Cow", "NTUC FairPrice"). If the logo is unclear but you can see the menu items or order details, infer the brand from those.
- "amount": the final total in SGD as a plain number string (e.g. "184.52").
  * If the receipt shows SGD total explicitly, use that.
  * If it shows a foreign currency (MYR, USD, etc.) with an FX rate to SGD, calculate and return the SGD equivalent.
  * Use the TOTAL line — never subtotal, never a line item price.
- "date": transaction/order date in YYYY-MM-DD. If no year shown assume ${new Date().getFullYear()}.
- "purpose": one of: Transport, Meals & Entertainment, Groceries, Office Supplies, Accommodation, Medical, Software & Subscriptions, Training & Education, Business Expense

Return exactly: {"name":"...","amount":"...","date":"...","purpose":"..."}`;
    const resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:300,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:mt,data:b64}},{type:'text',text:prompt}]}]})});
    if(!resp.ok){const err=await resp.json().catch(()=>({}));if(resp.status===401)throw new Error('Invalid API key.');if(resp.status===429)throw new Error('Rate limit hit.');throw new Error((err.error&&err.error.message)||'HTTP '+resp.status);}
    const data=await resp.json(),txt=(data.content||[]).map(c=>c.text||'').join('');
    let parsed;
    try{parsed=JSON.parse(txt.replace(/```json|```/g,'').trim());}catch(_){const mm=txt.match(/\{[\s\S]*?\}/);if(!mm)throw new Error('Bad response');parsed=JSON.parse(mm[0]);}
    if(parsed.name)el('exp-name').value=parsed.name;if(parsed.amount)el('exp-amount').value=String(parsed.amount).replace(/[^0-9.]/g,'');if(parsed.date)el('exp-date').value=parsed.date;if(parsed.purpose)el('exp-purpose').value=parsed.purpose;
    el('upload-sub-text').textContent='Click to change';aiEl.textContent='\u2713 Claude auto-filled fields.';aiEl.style.background='#ecfdf5';aiEl.style.color='#15803d';
  } catch(err){console.warn('Claude failed, falling back to Tesseract:',err.message);await scanWithTesseract(dataUrl,file,aiEl);}
}

// CALENDAR
function renderCalendar(){
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  el('cal-month-label').textContent=MONTHS[calMonth]+' '+calYear;
  el('cal-headers').innerHTML=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>'<div class="cal-day-header">'+d+'</div>').join('');
  const firstDow=new Date(calYear,calMonth,1).getDay(),startOffset=firstDow===0?6:firstDow-1,lastDate=new Date(calYear,calMonth+1,0).getDate(),td=todayStr(),meetDates=new Set(meetings.map(m=>m.date));
  let html='';
  for(let i=0;i<startOffset;i++)html+='<div class="cal-day other-month">'+new Date(calYear,calMonth,-startOffset+i+1).getDate()+'</div>';
  for(let d=1;d<=lastDate;d++){const ds=calYear+'-'+String(calMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'),cls=(ds===td?' today':'')+(meetDates.has(ds)?' has-event':'');html+='<div class="cal-day'+cls+'" onclick="selectDate(\''+ds+'\')">'+d+'</div>';}
  const endDow=new Date(calYear,calMonth,lastDate).getDay();
  for(let i=1;i<=(endDow===0?0:7-endDow);i++)html+='<div class="cal-day other-month">'+i+'</div>';
  el('cal-days').innerHTML=html;
  const sorted=[...meetings].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  el('all-meetings-list').innerHTML=sorted.length?sorted.map(m=>'<div class="meeting-item"><div class="meeting-dot" style="background:'+(m.gcalId?'#4285F4':'#FF3B7F')+'"></div><div style="flex:1"><div class="meeting-title">'+m.title+'</div><div class="meeting-time">'+fmtDate(m.date)+' &bull; '+m.time+(m.notes?' &mdash; '+m.notes:'')+(m.gcalId?' <span style="font-size:10px;color:#4285F4;font-weight:600">&#x2665; Google</span>':'')+'</div></div><button class="meeting-del" onclick="deleteMeeting('+m.id+')">&#10005;</button></div>').join(''):'<p class="empty-hint">No meetings yet</p>';
}
function selectDate(ds){
  selectedDate=ds;el('selected-date-label').textContent=fmtDate(ds);
  const dm=meetings.filter(m=>m.date===ds);
  el('day-meetings').innerHTML=dm.length?dm.map(m=>'<div class="meeting-item"><div class="meeting-dot" style="background:'+(m.gcalId?'#4285F4':'#FF3B7F')+'"></div><div><div class="meeting-title">'+m.title+'</div><div class="meeting-time">'+m.time+(m.notes?' &mdash; '+m.notes:'')+'</div></div></div>').join(''):'<p class="empty-hint">No meetings on this day</p>';
}
function prevMonth(){calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCalendar();}
function nextMonth(){calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCalendar();}
function openMeetingModal(){el('meeting-modal').classList.add('open');if(selectedDate)el('meet-date').value=selectedDate;}
function closeMeetingModal(){el('meeting-modal').classList.remove('open');}
function saveMeeting(){
  const title=el('meet-title').value.trim(),date=el('meet-date').value,time=el('meet-time').value,notes=el('meet-notes').value.trim();
  if(!title||!date||!time){alert('Please fill in title, date and time.');return;}
  const m={id:Date.now(),title,date,time,notes,gcalId:null};
  meetings.push(m);save();scheduleNotifications();closeMeetingModal();
  el('meet-title').value='';el('meet-notes').value='';
  if(gcalIsConnected())gcalCreateEvent(m);
  renderCalendar();renderDashboard();
}
function deleteMeeting(id){
  const m=meetings.find(x=>x.id===id);
  if(m&&m.gcalId&&gcalIsConnected())gcalDeleteEvent(m.gcalId);
  meetings=meetings.filter(x=>x.id!==id);save();renderCalendar();renderDashboard();
}

// NOTIFICATIONS
function scheduleNotifications(){if(!('Notification'in window))return;Notification.requestPermission().then(perm=>{const banner=el('notif-banner');banner.style.display='block';if(perm==='granted'){banner.textContent='Notifications enabled \u2014 reminders at 7:00 AM SGT daily.';scheduleDailyCheck();}else banner.textContent='Notification permission denied.';});}
function scheduleDailyCheck(){const now=new Date(),sgt=new Date(now.toLocaleString('en-US',{timeZone:'Asia/Singapore'}));const next7=new Date(sgt);next7.setHours(7,0,0,0);if(sgt>=next7)next7.setDate(next7.getDate()+1);setTimeout(function(){sendDailyNotif();setInterval(sendDailyNotif,86400000);},next7-sgt);}
function sendDailyNotif(){const td=todayStr(),tm=meetings.filter(m=>m.date===td);const body=tm.length?'You have '+tm.length+' meeting(s) today: '+tm.map(m=>m.title+' at '+m.time).join(', '):'No meetings today \u2014 have a productive day!';if(Notification.permission==='granted')new Notification('Work Hub \u2014 Daily Briefing',{body});}

// TODOS
function renderTodos(){const done=todos.filter(t=>t.done).length,pct=todos.length?Math.round(done/todos.length*100):0;el('todo-progress-fill').style.width=pct+'%';el('todo-progress-label').textContent=done+'/'+todos.length+' completed';el('todo-list').innerHTML=todos.map(t=>'<div class="todo-item"><button class="check-btn '+(t.done?'done':'')+'\" onclick="toggleTodo('+t.id+')"></button><span class="todo-text '+(t.done?'done':'')+'">'+t.text+'</span><button class="todo-del" onclick="deleteTodo('+t.id+')">&times;</button></div>').join('');}
function addTodo(){const inp=el('todo-input'),txt=inp.value.trim();if(!txt)return;todos.push({id:Date.now(),text:txt,done:false});inp.value='';save();renderTodos();renderDashboard();}
function toggleTodo(id){const t=todos.find(x=>x.id===id);if(t)t.done=!t.done;save();renderTodos();renderDashboard();}
function deleteTodo(id){todos=todos.filter(x=>x.id!==id);save();renderTodos();renderDashboard();}

// SHEETS
function renderSheets(){const q=(el('sheet-search').value||'').toLowerCase(),filtered=q?sheets.filter(s=>s.name.toLowerCase().includes(q)||s.url.toLowerCase().includes(q)):sheets;el('sheets-list').innerHTML=filtered.length?filtered.map(s=>'<a class="sheet-item" href="'+s.url+'" target="_blank"><div class="sheet-icon"><svg width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M9 1H4a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V6L9 1z"/></svg></div><div style="flex:1"><div class="sheet-name">'+s.name+'</div><div style="font-size:11px;color:#999">'+(s.url.length>55?s.url.slice(0,55)+'\u2026':s.url)+'</div></div><button class="sheet-del" onclick="event.preventDefault();deleteSheet('+s.id+')">&times;</button></a>').join(''):'<p class="empty-hint">No sheets found</p>';}
function openSheetModal(){el('sheet-modal').classList.add('open');}
function closeSheetModal(){el('sheet-modal').classList.remove('open');}
function saveSheet(){const name=el('sheet-name-input').value.trim(),url=el('sheet-url-input').value.trim();if(!name||!url){alert('Please fill in both fields.');return;}sheets.push({id:Date.now(),name,url});save();closeSheetModal();el('sheet-name-input').value='';el('sheet-url-input').value='';renderSheets();renderDashboard();}
function deleteSheet(id){sheets=sheets.filter(s=>s.id!==id);save();renderSheets();renderDashboard();}

// INIT
renderDashboard();
updateApiKeyStatus();
gcalUpdateUI();
initFinanceSync();
checkConfirmParam();
