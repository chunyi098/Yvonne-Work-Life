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
// API KEY  (still optional — used only if present)
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
}
function closeExpenseModal() {
  el('expense-modal').classList.remove('open');
  ['exp-name','exp-amount','exp-purpose','exp-date'].forEach(id => el(id).value = '');
  el('receipt-file').value = '';
  currentReceiptDataUrl = '';
  el('ai-processing').classList.remove('visible');
  el('ocr-progress-wrap').style.display = 'none';
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
  el('upload-sub-text').textContent = 'PNG, JPG, WEBP \u2014 auto-scanned for free, no API key needed';
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
// RECEIPT PROCESSING  —  Tesseract OCR (free) + optional Claude AI
// ============================================================

// ---------- Smart text parser ----------
function parseReceiptText(rawText) {
  const lines  = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const full   = rawText.toUpperCase();

  // --- Amount: find the LARGEST dollar value on the receipt ---
  // Looks for patterns like: $12.50  /  12.50  /  SGD 12.50  /  TOTAL 12.50
  const amountCandidates = [];
  const amtRe = /(?:total|amount|amt|subtotal|sub-total|grand|due|pay|sgd|s\$|\$)?\s*[\$S]?\s*(\d{1,6}\.\d{2})(?!\d)/gi;
  let m;
  while ((m = amtRe.exec(rawText)) !== null) {
    const v = parseFloat(m[1]);
    if (v > 0 && v < 100000) amountCandidates.push(v);
  }
  // prefer lines with TOTAL keyword
  let amount = '';
  const totalLineRe = /(?:total|grand total|amount due|balance due)[^\d]*(\d{1,6}\.\d{2})/i;
  const totalMatch  = rawText.match(totalLineRe);
  if (totalMatch) {
    amount = totalMatch[1];
  } else if (amountCandidates.length) {
    // pick the largest value (usually the grand total)
    amount = String(Math.max(...amountCandidates));
  }

  // --- Date: look for common date formats ---
  let date = '';
  const datePatterns = [
    /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/,          // DD/MM/YYYY or MM/DD/YYYY
    /(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/,             // YYYY-MM-DD
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{2,4})/i
  ];
  for (const pat of datePatterns) {
    const dm = rawText.match(pat);
    if (dm) {
      try {
        const parsed = new Date(dm[0]);
        if (!isNaN(parsed)) { date = parsed.toISOString().split('T')[0]; break; }
      } catch(_) {}
    }
  }
  if (!date) date = todayStr(); // fallback to today

  // --- Merchant name: usually in the first few non-empty lines ---
  // Skip lines that look like addresses (numbers + street keywords) or dates
  const skipRe = /^(\d{1,5}\s|receipt|tax|invoice|tel|phone|address|website|www|http|gst|uen|reg|\d{2}[\/-])/i;
  let name = '';
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i];
    if (line.length < 3) continue;
    if (skipRe.test(line)) continue;
    if (/^\d+(\.\d+)?$/.test(line)) continue; // pure number
    // favour lines in ALL CAPS or Title Case (typical for store names)
    name = line.replace(/[^a-zA-Z0-9\s&'.-]/g, '').trim();
    if (name.length >= 3) break;
  }
  if (!name) name = lines[0] ? lines[0].replace(/[^a-zA-Z0-9\s]/g,'').trim() : 'Receipt';

  // --- Purpose: look for category keywords in the text ---
  const purposeMap = [
    [/grab|taxi|gojek|lyft|uber|ride|transport|cab/i,   'Transport'],
    [/hotel|airbnb|lodg|accommodat|resort/i,             'Accommodation'],
    [/restaurant|cafe|coffee|food|lunch|dinner|breakfast|hawker|drinks|bistro|kitchen|eat/i, 'Meals & Entertainment'],
    [/supermarket|grocery|fairprice|cold storage|giant|sheng siong/i, 'Groceries'],
    [/office|stationery|supply|supplies|depot|print/i,   'Office Supplies'],
    [/flight|airline|airfare|train|mrt|bus|toll/i,       'Travel'],
    [/pharmacy|clinic|hospital|medical|health/i,         'Medical'],
    [/book|course|training|seminar|conference/i,         'Training & Education'],
    [/software|subscription|saas|cloud|hosting/i,        'Software & Subscriptions'],
  ];
  let purpose = 'Business Expense';
  for (const [re, label] of purposeMap) {
    if (re.test(full) || re.test(name)) { purpose = label; break; }
  }

  return { name, amount, date, purpose };
}

// ---------- Main handler ----------
async function processReceipt(input) {
  const file = input.files[0];
  if (!file) return;

  const aiEl = el('ai-processing');
  const area = el('upload-area');

  // Read file → dataURL
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  currentReceiptDataUrl = dataUrl;

  // Show image preview
  if (file.type.startsWith('image/')) {
    area.style.backgroundImage    = 'url(' + dataUrl + ')';
    area.style.backgroundSize     = 'cover';
    area.style.backgroundPosition = 'center';
    area.style.minHeight          = '120px';
    area.style.borderColor        = '#FF3B7F';
    el('upload-icon-wrap').style.display = 'none';
    el('upload-text').textContent     = '\u2713 ' + file.name;
    el('upload-sub-text').textContent = 'Scanning...';
  }

  // ---- Try Claude AI first if API key exists ----
  const apiKey = getApiKey();
  if (apiKey) {
    await scanWithClaude(dataUrl, file, apiKey, aiEl);
    return;
  }

  // ---- Fallback: Tesseract.js OCR (no key needed) ----
  await scanWithTesseract(dataUrl, aiEl);
}

async function scanWithTesseract(dataUrl, aiEl) {
  const progressWrap = el('ocr-progress-wrap');
  const bar          = el('ocr-bar');
  const pctText      = el('ocr-pct');
  const statusText   = el('ocr-status-text');

  progressWrap.style.display = 'block';
  aiEl.classList.remove('visible');

  try {
    const result = await Tesseract.recognize(dataUrl, 'eng', {
      logger: function(info) {
        if (info.status === 'recognizing text') {
          const p = Math.round((info.progress || 0) * 100);
          bar.style.width  = p + '%';
          pctText.textContent  = p + '%';
          statusText.textContent = 'Reading receipt... ' + p + '%';
        } else if (info.status === 'loading tesseract core') {
          statusText.textContent = 'Loading OCR engine...';
        } else if (info.status === 'initializing tesseract') {
          statusText.textContent = 'Initialising...';
        } else if (info.status === 'loading language traineddata') {
          statusText.textContent = 'Loading language data...';
        }
      }
    });

    progressWrap.style.display = 'none';
    const rawText = result.data.text;

    if (!rawText || rawText.trim().length < 5) {
      throw new Error('Could not read text from image. Please fill in manually.');
    }

    const parsed = parseReceiptText(rawText);

    if (parsed.name)    el('exp-name').value    = parsed.name;
    if (parsed.amount)  el('exp-amount').value  = parsed.amount;
    if (parsed.date)    el('exp-date').value     = parsed.date;
    if (parsed.purpose) el('exp-purpose').value = parsed.purpose;

    el('upload-sub-text').textContent = 'Click to change';
    aiEl.textContent      = '\u2713 Receipt scanned! Check the fields and adjust if needed.';
    aiEl.style.background = '#ecfdf5';
    aiEl.style.color      = '#15803d';
    aiEl.classList.add('visible');

  } catch (err) {
    progressWrap.style.display = 'none';
    console.error('OCR error:', err);
    aiEl.textContent      = '\u26a0\ufe0f ' + (err.message || 'Scan failed — please fill in fields manually.');
    aiEl.style.background = '#fffbeb';
    aiEl.style.color      = '#b45309';
    aiEl.classList.add('visible');
    el('upload-sub-text').textContent = 'Click to change';
  }
}

async function scanWithClaude(dataUrl, file, apiKey, aiEl) {
  aiEl.textContent      = '\ud83e\udd16 Claude AI is reading your receipt...';
  aiEl.style.background = '#FFE0ED';
  aiEl.style.color      = '#CC2B66';
  aiEl.classList.add('visible');
  try {
    const b64 = dataUrl.split(',')[1];
    let mt = file.type || 'image/png';
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role:'user', content: [
          { type:'image', source:{ type:'base64', media_type:mt, data:b64 } },
          { type:'text',  text:'This is a receipt. Extract: merchant name, total amount paid (number only, no currency), date (YYYY-MM-DD), and brief purchase category. Reply ONLY as JSON: {"name":"...","amount":"...","date":"...","purpose":"..."}' }
        ]}]
      })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(()=>({}));
      if (resp.status===401) throw new Error('Invalid API key.');
      if (resp.status===429) throw new Error('Rate limit — try again shortly.');
      throw new Error((err.error&&err.error.message)||'HTTP '+resp.status);
    }
    const data = await resp.json();
    const txt  = (data.content||[]).map(c=>c.text||'').join('');
    let parsed;
    try { parsed = JSON.parse(txt.replace(/```json|```/g,'').trim()); }
    catch(_) { const mm=txt.match(/\{[\s\S]*?\}/); if(!mm) throw new Error('Bad AI response'); parsed=JSON.parse(mm[0]); }
    if (parsed.name)    el('exp-name').value    = parsed.name;
    if (parsed.amount)  el('exp-amount').value  = String(parsed.amount).replace(/[^0-9.]/g,'');
    if (parsed.date)    el('exp-date').value     = parsed.date;
    if (parsed.purpose) el('exp-purpose').value = parsed.purpose;
    el('upload-sub-text').textContent = 'Click to change';
    aiEl.textContent      = '\u2713 Claude auto-filled the fields — check before saving.';
    aiEl.style.background = '#ecfdf5';
    aiEl.style.color      = '#15803d';
  } catch(err) {
    console.warn('Claude failed, falling back to OCR:', err.message);
    // Gracefully fall back to Tesseract
    await scanWithTesseract(dataUrl, aiEl);
  }
}

// ============================================================
// CALENDAR
// ============================================================
function renderCalendar() {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  el('cal-month-label').textContent = MONTHS[calMonth] + ' ' + calYear;
  el('cal-headers').innerHTML = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => '<div class="cal-day-header">' + d + '</div>').join('');
  const firstDow    = new Date(calYear, calMonth, 1).getDay();
  const startOffset = firstDow===0 ? 6 : firstDow-1;
  const lastDate    = new Date(calYear, calMonth+1, 0).getDate();
  const td          = todayStr();
  const meetDates   = new Set(meetings.map(m => m.date));
  let html = '';
  for (let i=0; i<startOffset; i++)
    html += '<div class="cal-day other-month">' + new Date(calYear, calMonth, -startOffset+i+1).getDate() + '</div>';
  for (let d=1; d<=lastDate; d++) {
    const ds  = calYear+'-'+String(calMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const cls = (ds===td?' today':'') + (meetDates.has(ds)?' has-event':'');
    html += '<div class="cal-day' + cls + '" onclick="selectDate(\'' + ds + '\')">' + d + '</div>';
  }
  const endDow = new Date(calYear, calMonth, lastDate).getDay();
  for (let i=1; i<=(endDow===0?0:7-endDow); i++) html += '<div class="cal-day other-month">' + i + '</div>';
  el('cal-days').innerHTML = html;
  const sorted = [...meetings].sort((a,b) => a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  el('all-meetings-list').innerHTML = sorted.length
    ? sorted.map(m =>
        '<div class="meeting-item"><div class="meeting-dot"></div>' +
        '<div style="flex:1"><div class="meeting-title">' + m.title + '</div>' +
        '<div class="meeting-time">' + fmtDate(m.date) + ' &bull; ' + m.time + (m.notes?' &mdash; '+m.notes:'') + '</div></div>' +
        '<button class="meeting-del" onclick="deleteMeeting(' + m.id + ')">&#10005;</button></div>').join('')
    : '<p class="empty-hint">No meetings yet</p>';
}
function selectDate(ds) {
  selectedDate = ds;
  el('selected-date-label').textContent = fmtDate(ds);
  const dm = meetings.filter(m => m.date===ds);
  el('day-meetings').innerHTML = dm.length
    ? dm.map(m =>
        '<div class="meeting-item"><div class="meeting-dot"></div>' +
        '<div><div class="meeting-title">' + m.title + '</div>' +
        '<div class="meeting-time">' + m.time + (m.notes?' &mdash; '+m.notes:'') + '</div></div></div>').join('')
    : '<p class="empty-hint">No meetings on this day</p>';
}
function prevMonth() { calMonth--; if(calMonth<0)  { calMonth=11; calYear--; } renderCalendar(); }
function nextMonth() { calMonth++; if(calMonth>11) { calMonth=0;  calYear++; } renderCalendar(); }
function openMeetingModal()  { el('meeting-modal').classList.add('open'); if(selectedDate) el('meet-date').value=selectedDate; }
function closeMeetingModal() { el('meeting-modal').classList.remove('open'); }
function saveMeeting() {
  const title=el('meet-title').value.trim(), date=el('meet-date').value,
        time=el('meet-time').value,          notes=el('meet-notes').value.trim();
  if (!title||!date||!time) { alert('Please fill in title, date and time.'); return; }
  meetings.push({ id:Date.now(), title, date, time, notes });
  save(); scheduleNotifications(); closeMeetingModal();
  el('meet-title').value=''; el('meet-notes').value='';
  renderCalendar(); renderDashboard();
}
function deleteMeeting(id) { meetings=meetings.filter(m=>m.id!==id); save(); renderCalendar(); renderDashboard(); }

// ============================================================
// NOTIFICATIONS  (7 AM SGT)
// ============================================================
function scheduleNotifications() {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(perm => {
    const banner = el('notif-banner');
    banner.style.display = 'block';
    if (perm==='granted') { banner.textContent='Notifications enabled \u2014 reminders at 7:00 AM SGT daily.'; scheduleDailyCheck(); }
    else banner.textContent='Notification permission denied. Enable in browser settings for 7 AM SGT reminders.';
  });
}
function scheduleDailyCheck() {
  const now=new Date(), sgt=new Date(now.toLocaleString('en-US',{timeZone:'Asia/Singapore'}));
  const next7=new Date(sgt); next7.setHours(7,0,0,0);
  if (sgt>=next7) next7.setDate(next7.getDate()+1);
  setTimeout(function(){ sendDailyNotif(); setInterval(sendDailyNotif,86400000); }, next7-sgt);
}
function sendDailyNotif() {
  const td=todayStr(), tm=meetings.filter(m=>m.date===td);
  const body=tm.length
    ? 'You have '+tm.length+' meeting(s) today: '+tm.map(m=>m.title+' at '+m.time).join(', ')
    : 'No meetings today \u2014 have a productive day!';
  if (Notification.permission==='granted') new Notification('Work Hub \u2014 Daily Briefing',{body});
}

// ============================================================
// TODOS
// ============================================================
function renderTodos() {
  const done=todos.filter(t=>t.done).length;
  const pct=todos.length?Math.round(done/todos.length*100):0;
  el('todo-progress-fill').style.width=pct+'%';
  el('todo-progress-label').textContent=done+'/'+todos.length+' completed';
  el('todo-list').innerHTML=todos.map(t =>
    '<div class="todo-item">' +
    '<button class="check-btn '+(t.done?'done':'')+' " onclick="toggleTodo('+t.id+')"></button>' +
    '<span class="todo-text '+(t.done?'done':'')+'">'+t.text+'</span>' +
    '<button class="todo-del" onclick="deleteTodo('+t.id+')">&times;</button>' +
    '</div>').join('');
}
function addTodo() {
  const inp=el('todo-input'), txt=inp.value.trim(); if(!txt) return;
  todos.push({id:Date.now(),text:txt,done:false}); inp.value='';
  save(); renderTodos(); renderDashboard();
}
function toggleTodo(id) { const t=todos.find(x=>x.id===id); if(t)t.done=!t.done; save(); renderTodos(); renderDashboard(); }
function deleteTodo(id)  { todos=todos.filter(x=>x.id!==id); save(); renderTodos(); renderDashboard(); }

// ============================================================
// SHEETS
// ============================================================
function renderSheets() {
  const q=(el('sheet-search').value||'').toLowerCase();
  const filtered=q?sheets.filter(s=>s.name.toLowerCase().includes(q)||s.url.toLowerCase().includes(q)):sheets;
  el('sheets-list').innerHTML=filtered.length
    ? filtered.map(s =>
        '<a class="sheet-item" href="'+s.url+'" target="_blank">' +
        '<div class="sheet-icon"><svg width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M9 1H4a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V6L9 1z"/></svg></div>' +
        '<div style="flex:1"><div class="sheet-name">'+s.name+'</div>' +
        '<div style="font-size:11px;color:#999">'+(s.url.length>55?s.url.slice(0,55)+'\u2026':s.url)+'</div></div>' +
        '<button class="sheet-del" onclick="event.preventDefault();deleteSheet('+s.id+')">&times;</button>' +
        '</a>').join('')
    : '<p class="empty-hint">No sheets found</p>';
}
function openSheetModal()  { el('sheet-modal').classList.add('open'); }
function closeSheetModal() { el('sheet-modal').classList.remove('open'); }
function saveSheet() {
  const name=el('sheet-name-input').value.trim(), url=el('sheet-url-input').value.trim();
  if(!name||!url){alert('Please fill in both fields.');return;}
  sheets.push({id:Date.now(),name,url}); save(); closeSheetModal();
  el('sheet-name-input').value=''; el('sheet-url-input').value='';
  renderSheets(); renderDashboard();
}
function deleteSheet(id) { sheets=sheets.filter(s=>s.id!==id); save(); renderSheets(); renderDashboard(); }

// ============================================================
// INIT
// ============================================================
renderDashboard();
updateApiKeyStatus();
