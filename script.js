// --- SECTION SWITCHER LOGIC ---
function showSection(id) {
    // 1. Hide all sections
    const sections = document.querySelectorAll('main section');
    sections.forEach(sec => {
        sec.classList.add('hidden');
    });

    // 2. Show the specific section clicked
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
    }

    // 3. Highlight the active button in the sidebar
    const buttons = document.querySelectorAll('nav button');
    buttons.forEach(btn => {
        btn.classList.remove('bg-pink-50', 'text-pink-500', 'font-bold');
    });
    
    // This finds the button you clicked and makes it look "active"
    const activeBtn = document.querySelector(`button[onclick="showSection('${id}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('bg-pink-50', 'text-pink-500', 'font-bold');
    }
}

// --- DATA INITIALIZATION (Local Storage) ---
let myTasks = JSON.parse(localStorage.getItem('tasks')) || [];
let mySheets = JSON.parse(localStorage.getItem('sheets')) || [];

// --- SAVE FUNCTION ---
function saveAll() {
    localStorage.setItem('tasks', JSON.stringify(myTasks));
    localStorage.setItem('sheets', JSON.stringify(mySheets));
    renderTasks();
    renderSheets(mySheets);
}

// --- TO-DO LIST LOGIC ---
function addTask() {
    const input = document.getElementById('taskInput');
    if (input && input.value) {
        myTasks.push({ text: input.value, done: false });
        input.value = '';
        saveAll();
    }
}

function toggleTask(index) {
    myTasks[index].done = !myTasks[index].done;
    saveAll();
}

function renderTasks() {
    const list = document.getElementById('taskList');
    const progress = document.getElementById('todoBar');
    if (!list) return;

    list.innerHTML = myTasks.map((t, i) => `
        <li class="flex items-center gap-3 bg-gray-50 p-2 rounded">
            <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTask(${i})">
            <span class="${t.done ? 'line-through text-gray-400' : ''}">${t.text}</span>
        </li>
    `).join('');
    
    const doneCount = myTasks.filter(t => t.done).length;
    if (progress) {
        progress.value = myTasks.length ? (doneCount / myTasks.length) * 100 : 0;
    }
}

// --- GOOGLE SHEETS LOGIC ---
function addSheet() {
    const t = document.getElementById('sheetTitle');
    const u = document.getElementById('sheetUrl');
    if(t.value && u.value) {
        mySheets.push({ title: t.value, url: u.value });
        t.value = ''; u.value = '';
        saveAll();
    }
}

function renderSheets(arr) {
    const list = document.getElementById('sheetsList');
    if (!list) return;
    list.innerHTML = arr.map(s => `
        <div class="border p-3 rounded-lg flex justify-between bg-pink-50/30">
