let expenses = JSON.parse(localStorage.getItem('exp')) || [];
let todos = JSON.parse(localStorage.getItem('todo')) || [];

function showSection(id) {
    document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
    const btn = document.querySelector(`button[onclick="showSection('${id}')"]`);
    if(btn) btn.classList.add('active-nav');
}

// EXPENSE LOGIC
function addExpense() {
    const p = document.getElementById('expPurp').value;
    const a = document.getElementById('expAmt').value;
    if(p && a) {
        expenses.push({ purpose: p, amount: a, status: 'PENDING', date: new Date().toLocaleDateString() });
        document.getElementById('expPurp').value = '';
        document.getElementById('expAmt').value = '';
        saveAndRender();
    }
}

function deleteExpense(index) {
    expenses.splice(index, 1);
    saveAndRender();
}

// TODO LOGIC
function addTodo() {
    const val = document.getElementById('todoInput').value;
    if(val) {
        todos.push({ text: val, done: false });
        document.getElementById('todoInput').value = '';
        saveAndRender();
    }
}

function deleteTodo(index) {
    todos.splice(index, 1);
    saveAndRender();
}

function toggleTodo(index) {
    todos[index].done = !todos[index].done;
    saveAndRender();
}

// SAVE & RENDER
function saveAndRender() {
    localStorage.setItem('exp', JSON.stringify(expenses));
    localStorage.setItem('todo', JSON.stringify(todos));
    
    // Render Expenses
    const eList = document.getElementById('expenseList');
    eList.innerHTML = expenses.map((e, i) => `
        <tr class="border-b border-gray-50 last:border-0">
            <td class="p-5"><span class="px-3 py-1 bg-pink-50 text-pink-500 text-[10px] font-black rounded-full">${e.status}</span></td>
            <td class="p-5 font-bold text-sm">${e.purpose}</td>
            <td class="p-5 font-black text-sm">$${e.amount}</td>
            <td class="p-5 text-right"><span onclick="deleteExpense(${i})" class="delete-btn">Delete</span></td>
        </tr>
    `).join('');

    // Render Todos
    const tList = document.getElementById('todoContainer');
    tList.innerHTML = todos.map((t, i) => `
        <div class="flex justify-between items-center p-5 bg-gray-50 rounded-2xl">
            <div class="flex items-center gap-4">
                <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo(${i})" class="w-5 h-5 accent-pink-500">
                <span class="${t.done ? 'line-through text-gray-400' : 'font-bold'} text-sm">${t.text}</span>
            </div>
            <span onclick="deleteTodo(${i})" class="delete-btn text-xs">Remove</span>
        </div>
    `).join('');

    // Update Dashboard Stats
    const done = todos.filter(x => x.done).length;
    document.getElementById('dash-exp-count').innerText = expenses.length;
    document.getElementById('dash-todo-count').innerText = `${done}/${todos.length}`;
    
    const perc = todos.length ? Math.round((done / todos.length) * 100) : 0;
    document.getElementById('perc-text').innerText = perc + "%";
    document.getElementById('circle-progress').style.strokeDasharray = `${perc}, 100`;
}

document.addEventListener('DOMContentLoaded', () => {
    saveAndRender();
    showSection('dash-sec');
});
