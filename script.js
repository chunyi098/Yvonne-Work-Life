let calendar;

function showSection(id) {
    // Hide all sections with a slight fade (optional)
    document.querySelectorAll('main section').forEach(sec => sec.classList.add('hidden'));
    
    // Show selected
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');

    // Button highlighting
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    const clickedBtn = document.querySelector(`button[onclick="showSection('${id}')"]`);
    if (clickedBtn) clickedBtn.classList.add('active-nav');

    // Render calendar if switched to
    if (id === 'cal-sec' && calendar) {
        setTimeout(() => calendar.render(), 10);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize FullCalendar
    const calendarEl = document.getElementById('calendar');
    if (calendarEl) {
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'title', center: '', right: 'prev,next' },
            dayMaxEvents: true,
            events: [
                { title: 'Project Review', start: '2026-04-18', color: '#EC4899' }
            ]
        });
        calendar.render();
    }
    
    // Default to Dashboard
    showSection('dash-sec');
});
