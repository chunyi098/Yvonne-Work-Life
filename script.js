// INITIALIZE DATA
let myTasks = JSON.parse(localStorage.getItem('tasks')) || [];
let mySheets = JSON.parse(localStorage.getItem('sheets')) || [];

// 1. SECTION SWITCHER
function showSection(id) {
    document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// 2. SAVE DATA STEP (The logic you asked for)
function saveAll() {
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
    list.innerHTML = myTasks.map((t, i) => `
        <li class="flex items-center gap-3 bg-gray-50 p-2 rounded">
            <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTask(${i})">
            <span class="${t.done ? 'line-through text-gray-400' : ''}">${t.text}</span>
        </li>
    `).join('');
    
    const doneCount = myTasks.filter(t => t.done).length;
    progress.value = myTasks.length ? (doneCount / myTasks.length) * 100 : 0;
}

// 4. GOOGLE SHEETS LOGIC
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
    document.getElementById('sheetsList').innerHTML = arr.map(s => `
        <div class="border p-3 rounded-lg flex justify-between bg-pink-50/30">
            <strong>${s.title}</strong>
            <a href="${s.url}" target="_blank" class="text-pink-500 underline text-sm">Open Sheet</a>
        </div>
    `).join('');
}

// RUN ON LOAD
renderTasks();
renderSheets(mySheets);
