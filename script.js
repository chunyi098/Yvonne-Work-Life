// ---- STATE ----
let expenses = JSON.parse(localStorage.getItem('wh_expenses') || 'null');
let meetings = JSON.parse(localStorage.getItem('wh_meetings') || 'null');
let todos    = JSON.parse(localStorage.getItem('wh_todos')    || 'null');
let sheets   = JSON.parse(localStorage.getItem('wh_sheets')   || '[]');

if (!expenses) expenses = [
  {id:1, name:'Grab Taxi',    amount:25.50, purpose:'Client meeting transport', date:'2026-04-10', reimbursed:false, receipt:''},
  {id:2, name:'Office Depot', amount:45.80, purpose:'Stationery supplies',     date:'2026-04-05', reimbursed:true,  receipt:''},
  {id:3, name:'Coffee Bean',  amount:62.00, purpose:'Team lunch',              date:'2026-04-12', reimbursed:false, receipt:''}
];
if (!meetings) meetings = [
  {id:1, title:'1-on-1 with Manager', date:'2026-04-18', time:'11:00', notes:''},
  {id:2, title:'Client Presentation', date:'2026-04-17', time:'14:00', notes:''},
  {id:3, title:'Weekly Standup',      date:'2026-04-16', time:'10:00', notes:''}
];
if (!todos) todos = [
  {id:1, text:'Review project proposal',  done:false},
  {id:2, text:'Update timesheet',         done:false},
  {id:3, text:'Book flight for conference',done:false},
  {id:4, text:'Submit Q1 report',         done:true}
];

let currentExpFilter = 'all';
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let selectedDate = null;

function save() {
  localStorage.setItem('wh_expenses', JSON.stringify(expenses));
  localStorage.setItem('wh_meetings', JSON.stringify(meetings));
  localStorage.setItem('wh_todos',    JSON.stringify(todos));
  localStorage.setItem('wh_sheets',   JSON.stringify(sheets));
}

// ---- NAVIGATION ----
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => {
    if (b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + id + "'")) b.classList.add('active');
  });
  const renders = {dashboard: renderDashboard, expenses: renderExpenses, calendar: renderCalendar, todos: renderTodos, sheets: renderSheets};
  if (renders[id]) renders[id]();
}

// ---- HELPERS ----
function fmtDate(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
}
function todayStr() { return new Date().toISOString().split('T')[0]; }

// ---- DASHBOARD ----
function renderDashboard() {
  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('hero-date').textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();

  const td = todayStr();
  document.getElementById('dash-pending-count').textContent  = expenses.filter(e => !e.reimbursed).length;
  document.getElementById('dash-meetings-count').textContent = meetings.filter(m => m.date === td).length;

  const done = todos.filter(t => t.done).length;
  document.getElementById('dash-todo-progress').textContent = done + '/' + todos.length;

  const upcoming = [...meetings].filter(m => m.date >= td).sort((a,b) => a.date.localeCompare(b.date)).slice(0,3);
  document.getElementById('dash-meetings-list').innerHTML = upcoming.length
    ? upcoming.map(m => `<div class="meeting-item"><div class="meeting-dot"></div><div><div class="meeting-title">${m.title}</div><div class="meeting-time">${fmtDate(m.date)} &bull; ${m.time}</div></div></div>`).join('')
    : '<div class="empty-hint">No upcoming meetings</div>';

  const pct = todos.length ? Math.round(done / todos.length * 100) : 0;
  document.getElementById('dash-progress-bar').style.width  = pct + '%';
  document.getElementById('dash-progress-text').textContent = done + ' of ' + todos.length + ' completed';
  document.getElementById('dash-progress-pct').textContent  = pct + '%';
  document.getElementById('dash-todos-preview').innerHTML = todos.slice(0,3).map(t =>
    `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:${t.done?'#999':'#1a1a1a'}">
      <div style="width:8px;height:8px;border-radius:50%;background:${t.done?'#15803d':'#e8e8e8'}"></div>
      <span style="${t.done?'text-decoration:line-through':''}">` + t.text + `</span></div>`).join('');

  document.getElementById('dash-expenses-list').innerHTML = [...expenses].slice(-3).reverse().map(e =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #eee">
      <div><div style="font-size:13px">${e.name}</div><div style="font-size:11px;color:#999">${e.purpose}</div></div>
      <div style="text-align:right"><div style="font-size:13px;font-weight:700">$${Number(e.amount).toFixed(2)}</div>
      <span class="badge ${e.reimbursed?'reimbursed':'pending'}">${e.reimbursed?'Reimbursed':'Pending'}</span></div></div>`).join('');

  document.getElementById('dash-sheets-list').innerHTML = sheets.length
    ? sheets.slice(0,3).map(s => `<a class="sheet-item" href="${s.url}" target="_blank"><div class="sheet-icon"><svg width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M9 1H4a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V6L9 1z"/></svg></div><div class="sheet-name">${s.name}</div></a>`).join('')
    : '<div class="empty-hint">No sheets linked yet</div>';
}

// ---- EXPENSES ----
function renderExpenses() {
  const pending = expenses.filter(e => !e.reimbursed);
  const reimb   = expenses.filter(e =>  e.reimbursed);
  document.getElementById('exp-total').textContent         = '$' + expenses.reduce((s,e)=>s+Number(e.amount),0).toFixed(2);
  document.getElementById('exp-pending-val').textContent   = '$' + pending.reduce((s,e)=>s+Number(e.amount),0).toFixed(2);
  document.getElementById('exp-reimbursed-val').textContent= '$' + reimb.reduce((s,e)=>s+Number(e.amount),0).toFixed(2);
  const filtered = currentExpFilter==='all' ? expenses : currentExpFilter==='pending' ? pending : reimb;
  document.getElementById('expense-table-body').innerHTML = filtered.map(e =>
    `<tr>
      <td><button class="check-btn ${e.reimbursed?'done':''}" onclick="toggleExp(${e.id})" title="${e.reimbursed?'Mark pending':'Mark reimbursed'}"></button></td>
      <td>${e.name}</td><td>${e.purpose}</td>
      <td>$${Number(e.amount).toFixed(2)}</td>
      <td>${fmtDate(e.date)}</td>
      <td>${e.receipt ? '<span style="font-size:11px;color:#FF3B7F">' + e.receipt + '</span>' : '&mdash;'}</td>
      <td><button onclick="deleteExp(${e.id})" style="background:none;border:none;cursor:pointer;color:#ccc;font-size:16px">&times;</button></td>
    </tr>`).join('');
}
function toggleExp(id) { const e=expenses.find(x=>x.id===id); if(e) e.reimbursed=!e.reimbursed; save(); renderExpenses(); renderDashboard(); }
function deleteExp(id)  { expenses=expenses.filter(x=>x.id!==id); save(); renderExpenses(); renderDashboard(); }
function filterExp(f, btn) {
  currentExpFilter = f;
  document.querySelectorAll('#page-expenses .filter-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  renderExpenses();
}
function openExpenseModal()  { document.getElementById('expense-modal').classList.add('open'); document.getElementById('exp-date').value=todayStr(); }
function closeExpenseModal() { document.getElementById('expense-modal').classList.remove('open'); clearExpForm(); }
function clearExpForm() {
  ['exp-name','exp-amount','exp-purpose','exp-date'].forEach(id => document.getElementById(id).value='');
  const ai = document.getElementById('ai-processing'); ai.classList.remove('visible'); ai.textContent='';
}
function saveExpense() {
  const name=document.getElementById('exp-name').value.trim();
  const amount=document.getElementById('exp-amount').value;
  const purpose=document.getElementById('exp-purpose').value.trim();
  const date=document.getElementById('exp-date').value;
  if (!name||!amount||!purpose||!date) { alert('Please fill all fields'); return; }
  const receipt=document.getElementById('receipt-file').files[0]?.name||'';
  expenses.push({id:Date.now(),name,amount:Number(amount),purpose,date,reimbursed:false,receipt});
  save(); closeExpenseModal(); renderExpenses(); renderDashboard();
}
async function processReceipt(input) {
  const file = input.files[0]; if (!file) return;
  const ai = document.getElementById('ai-processing');
  ai.textContent = 'AI is reading your receipt...'; ai.classList.add('visible');
  try {
    const b64 = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(file); });
    const resp = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:400,
        messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:file.type||'image/jpeg',data:b64}},
          {type:'text',text:'Extract from this receipt: merchant name, total amount (number only, no currency symbol), and brief purpose. Respond ONLY as JSON: {"name":"...","amount":"...","purpose":"..."}'}]}]})
    });
    const data = await resp.json();
    const txt = data.content.map(c=>c.text||'').join('');
    const parsed = JSON.parse(txt.replace(/```json|```/g,'').trim());
    if (parsed.name)    document.getElementById('exp-name').value    = parsed.name;
    if (parsed.amount)  document.getElementById('exp-amount').value  = parsed.amount;
    if (parsed.purpose) document.getElementById('exp-purpose').value = parsed.purpose;
    ai.textContent = 'Receipt processed! Fields auto-filled below.';
  } catch(e) {
    ai.textContent = 'Could not auto-read receipt — please fill in manually.';
  }
}

// ---- CALENDAR ----
function renderCalendar() {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-month-label').textContent = MONTHS[calMonth] + ' ' + calYear;
  document.getElementById('cal-headers').innerHTML = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<div class="cal-day-header">${d}</div>`).join('');
  const firstDow = new Date(calYear, calMonth, 1).getDay(); const startOffset = firstDow===0?6:firstDow-1;
  const lastDate = new Date(calYear, calMonth+1, 0).getDate();
  const td = todayStr();
  const meetDates = new Set(meetings.map(m=>m.date));
  let html='';
  for (let i=0;i<startOffset;i++) {
    const d=new Date(calYear,calMonth,0-i+1-(startOffset-i)); html+=`<div class="cal-day other-month">${new Date(calYear,calMonth,-startOffset+i+1).getDate()}</div>`;
  }
  for (let d=1;d<=lastDate;d++) {
    const ds=calYear+'-'+String(calMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    html+=`<div class="cal-day${ds===td?' today':''}${meetDates.has(ds)?' has-event':''}" onclick="selectDate('${ds}')">${d}</div>`;
  }
  const endDow=new Date(calYear,calMonth,lastDate).getDay(); const tail=endDow===0?0:7-endDow;
  for (let i=1;i<=tail;i++) html+=`<div class="cal-day other-month">${i}</div>`;
  document.getElementById('cal-days').innerHTML=html;

  const sorted=[...meetings].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  document.getElementById('all-meetings-list').innerHTML = sorted.length
    ? sorted.map(m=>`<div class="meeting-item"><div class="meeting-dot"></div><div style="flex:1"><div class="meeting-title">${m.title}</div><div class="meeting-time">${fmtDate(m.date)} &bull; ${m.time}${m.notes?' &mdash; '+m.notes:''}</div></div><button class="meeting-del" onclick="deleteMeeting(${m.id})">&#10005;</button></div>`).join('')
    : '<div class="empty-hint">No meetings yet</div>';
}
function selectDate(ds) {
  selectedDate=ds;
  document.getElementById('selected-date-label').textContent=fmtDate(ds);
  const dayMeets=meetings.filter(m=>m.date===ds);
  document.getElementById('day-meetings').innerHTML=dayMeets.length
    ? dayMeets.map(m=>`<div class="meeting-item"><div class="meeting-dot"></div><div><div class="meeting-title">${m.title}</div><div class="meeting-time">${m.time}${m.notes?' &mdash; '+m.notes:''}</div></div></div>`).join('')
    : '<div class="empty-hint">No meetings on this day</div>';
}
function prevMonth() { calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); }
function nextMonth() { calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); }
function openMeetingModal()  { document.getElementById('meeting-modal').classList.add('open'); if(selectedDate) document.getElementById('meet-date').value=selectedDate; }
function closeMeetingModal() { document.getElementById('meeting-modal').classList.remove('open'); }
function saveMeeting() {
  const title=document.getElementById('meet-title').value.trim();
  const date=document.getElementById('meet-date').value;
  const time=document.getElementById('meet-time').value;
  const notes=document.getElementById('meet-notes').value.trim();
  if (!title||!date||!time) { alert('Please fill title, date and time'); return; }
  meetings.push({id:Date.now(),title,date,time,notes});
  save(); scheduleNotifications(); closeMeetingModal();
  document.getElementById('meet-title').value=''; document.getElementById('meet-notes').value='';
  renderCalendar(); renderDashboard();
}
function deleteMeeting(id) { meetings=meetings.filter(m=>m.id!==id); save(); renderCalendar(); renderDashboard(); }

// ---- NOTIFICATIONS (7AM SGT) ----
function scheduleNotifications() {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(p => {
    const banner=document.getElementById('notif-banner');
    banner.style.display='block';
    if (p==='granted') { banner.textContent='Notifications enabled! You will be reminded at 7:00 AM SGT daily.'; scheduleDailyCheck(); }
    else banner.textContent='Notification permission denied. Enable notifications in your browser settings to receive daily 7 AM SGT reminders.';
  });
}
function scheduleDailyCheck() {
  const now=new Date();
  const sgt=new Date(now.toLocaleString('en-US',{timeZone:'Asia/Singapore'}));
  const next7=new Date(sgt); next7.setHours(7,0,0,0);
  if (sgt>=next7) next7.setDate(next7.getDate()+1);
  setTimeout(()=>{ sendDailyNotif(); setInterval(sendDailyNotif,86400000); }, next7-sgt);
}
function sendDailyNotif() {
  const td=todayStr();
  const tm=meetings.filter(m=>m.date===td);
  const body=tm.length ? `You have ${tm.length} meeting(s) today: ${tm.map(m=>m.title+' at '+m.time).join(', ')}` : 'No meetings today. Have a productive day!';
  if (Notification.permission==='granted') new Notification('Work Hub — Daily Briefing',{body});
}

// ---- TODOS ----
function renderTodos() {
  const done=todos.filter(t=>t.done).length;
  const pct=todos.length?Math.round(done/todos.length*100):0;
  document.getElementById('todo-progress-fill').style.width=pct+'%';
  document.getElementById('todo-progress-label').textContent=done+'/'+todos.length+' completed';
  document.getElementById('todo-list').innerHTML=todos.map(t=>
    `<div class="todo-item">
      <button class="check-btn ${t.done?'done':''}" onclick="toggleTodo(${t.id})"></button>
      <span class="todo-text ${t.done?'done':''}">${t.text}</span>
      <button class="todo-del" onclick="deleteTodo(${t.id})">&times;</button>
    </div>`).join('');
}
function addTodo() { const i=document.getElementById('todo-input'); const t=i.value.trim(); if(!t)return; todos.push({id:Date.now(),text:t,done:false}); i.value=''; save(); renderTodos(); renderDashboard(); }
function toggleTodo(id) { const t=todos.find(x=>x.id===id); if(t)t.done=!t.done; save(); renderTodos(); renderDashboard(); }
function deleteTodo(id)  { todos=todos.filter(x=>x.id!==id); save(); renderTodos(); renderDashboard(); }

// ---- SHEETS ----
function renderSheets() {
  const q=(document.getElementById('sheet-search').value||'').toLowerCase();
  const filtered=q?sheets.filter(s=>s.name.toLowerCase().includes(q)||s.url.toLowerCase().includes(q)):sheets;
  document.getElementById('sheets-list').innerHTML=filtered.length
    ? filtered.map(s=>`<a class="sheet-item" href="${s.url}" target="_blank">
        <div class="sheet-icon"><svg width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M9 1H4a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V6L9 1z"/></svg></div>
        <div style="flex:1"><div class="sheet-name">${s.name}</div><div style="font-size:11px;color:#999">${s.url.length>50?s.url.slice(0,50)+'...':s.url}</div></div>
        <button class="sheet-del" onclick="event.preventDefault();deleteSheet(${s.id})">&times;</button>
      </a>`).join('')
    : '<div class="empty-hint">No sheets found</div>';
}
function openSheetModal()  { document.getElementById('sheet-modal').classList.add('open'); }
function closeSheetModal() { document.getElementById('sheet-modal').classList.remove('open'); }
function saveSheet() {
  const name=document.getElementById('sheet-name-input').value.trim();
  const url=document.getElementById('sheet-url-input').value.trim();
  if (!name||!url) { alert('Please fill both fields'); return; }
  sheets.push({id:Date.now(),name,url}); save(); closeSheetModal();
  document.getElementById('sheet-name-input').value=''; document.getElementById('sheet-url-input').value='';
  renderSheets(); renderDashboard();
}
function deleteSheet(id) { sheets=sheets.filter(s=>s.id!==id); save(); renderSheets(); renderDashboard(); }

// ---- GMAIL ----
function switchGmail(tab, btn) {
  document.querySelectorAll('[id^="gmail-tab-"]').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  const urls={inbox:'#inbox',starred:'#starred',sent:'#sent',trash:'#trash'};
  document.getElementById('gmail-iframe').src='https://mail.google.com/mail/u/0/'+urls[tab];
}

// ---- INIT ----
renderDashboard();
