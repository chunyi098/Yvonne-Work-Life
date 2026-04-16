// 1. SECTION SWITCHER
function showSection(id) {
    // Hide all
    document.querySelectorAll('main section').forEach(sec => sec.classList.add('hidden'));
    // Show target
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');

    // Update button styling
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    const activeBtn = document.querySelector(`button[onclick="showSection('${id}')"]`);
    if (activeBtn) activeBtn.classList.add('active-nav');
}

// 2. LOCAL STORAGE INITIALIZATION
let myTasks = JSON.parse(localStorage.getItem('tasks')) || [];
let mySheets = JSON.parse(localStorage.getItem('sheets')) || [];

function save() {
    localStorage.setItem('tasks', JSON.stringify(myTasks));
    localStorage.setItem('sheets', JSON.stringify(mySheets));
    renderTasks();
    renderSheets(mySheets);
}

// 3. TO-DO LOGIC
function addTask() {
    const input = document.getElementById('taskInput');
    if (input.value) {
        myTasks.push({ text: input.value, done: false });
        input.value = '';
        save();
    }
}

function toggleTask(i) {
    myTasks[i].done = !myTasks[i].done;
    save();
}

function renderTasks() {
    const list = document.getElementById('taskList');
    const progress = document.getElementById('todoBar');
    if (!list) return;

    list.innerHTML = myTasks.map((t, i) => `
        <li class="flex items-center gap-3 bg-white border p-3 rounded-xl">
            <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTask(${i})" class="accent-pink-500">
            <span class="${t.done ? 'line-through text-gray-400' : ''}">${t.text}</span>
        </li>
    `).join('');

    const done = myTasks.filter(t => t.done).length;
    progress.value = myTasks.length ? (done / myTasks.length) * 100 : 0;
}

// 4. GOOGLE SHEETS LOGIC
function addSheet() {
    const t = document.getElementById('sheetTitle');
    const u = document.getElementById('sheetUrl');
    if (t.value && u.value) {
        mySheets.push({ title: t.value, url: u.value });
        t.value = ''; u.value = '';
        save();
    }
}

function renderSheets(arr) {
    const list = document.getElementById('sheetsList');
    if (!list) return;
    list.innerHTML = arr.map(s => `
        <div class="bg-white border p-4 rounded-xl flex justify-between items-center shadow-sm">
            <span class="font-bold">${s.title}</span>
            <a href="${s.url}" target="_blank" class="text-pink-500 text-sm font-bold underline">Open Sheet</a>
        </div>
    `).join('');
}

function filterSheets() {
    const val = document.getElementById('sheetSearch').value.toLowerCase();
    const filtered = mySheets.filter(s => s.title.toLowerCase().includes(val));
    renderSheets(filtered);
}

// 5. CALENDAR (Basic Setup)
document.addEventListener('DOMContentLoaded', () => {
    const calEl = document.getElementById('calendar');
    if (calEl) {
        const calendar = new FullCalendar.Calendar(calEl, {
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev,next', center: 'title', right: 'today' }
        });
        calendar.render();
    }
    renderTasks();
    renderSheets(mySheets);
});
