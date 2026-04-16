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

    // 3. Optional: Highlight the active button in the sidebar
    const buttons = document.querySelectorAll('nav button');
    buttons.forEach(btn => {
        btn.classList.remove('bg-pink-50', 'text-pink-500', 'font-bold');
    });
    
    // Find the button that was clicked and style it
    const activeBtn = document.querySelector(`button[onclick="showSection('${id}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('bg-pink-50', 'text-pink-500', 'font-bold');
    }
}
