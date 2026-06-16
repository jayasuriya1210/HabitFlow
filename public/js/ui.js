export function showAlert(message, type = 'success') {
    const alertsContainer = document.getElementById('appAlerts');
    if (!alertsContainer) return;
    const alertBox = document.createElement('div');
    alertBox.style.padding = '12px 16px';
    alertBox.style.background = type === 'danger' ? '#fee2e2' : type === 'warning' ? '#fef3c7' : '#d1fae5';
    alertBox.style.color = type === 'danger' ? '#991b1b' : type === 'warning' ? '#92400e' : '#065f46';
    alertBox.style.borderRadius = '8px';
    alertBox.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
    alertBox.innerHTML = message;
    alertBox.style.transition = 'opacity 0.3s ease';
    alertsContainer.appendChild(alertBox);
    setTimeout(() => { 
        alertBox.style.opacity = '0';
        setTimeout(() => alertBox.remove(), 300);
    }, 3000);
}

export function showAuthAlert(message, type = 'success') {
    showAlert(message, type);
}

export function clearAuthAlert() {}

export function go(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if(target) target.classList.add('active');
    window.scrollTo(0,0);
}

export function showApp(currentUser) {
    go('dashboard');
    const userChips = document.querySelectorAll('.sidebar-foot span');
    userChips.forEach(chip => {
        if(chip.textContent.startsWith('@')) chip.textContent = `@${currentUser.username}`;
    });
    const overviewWelcome = document.getElementById('overview-welcome');
    if (overviewWelcome && currentUser) {
        overviewWelcome.textContent = `Welcome back, ${currentUser.username}.`;
    }
    const planDisplay = document.getElementById('currentPlanDisplay');
    if(planDisplay && currentUser) planDisplay.textContent = currentUser.subscriptionPlan || 'Free';
}

export function showAuth() {
    go('home'); 
}

export function showAuthView(view) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if(loginForm && registerForm) {
        if(view === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }
    }
}

export function openEditModal(id, habits) {
    const habit = habits.find((h) => h._id === id || h.id === id);
    if (!habit) return;

    document.getElementById('editHabitId').value = id;
    document.getElementById('editHabitName').value = habit.name;
    document.getElementById('editHabitCategory').value = habit.category;
    document.getElementById('editHabitDescription').value = habit.description || '';
    document.getElementById('editHabitGoal').value = habit.goal;

    document.getElementById('editModal').style.display = 'block';
}

export function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
    const editForm = document.getElementById('editForm');
    if (editForm) editForm.reset();
}

export function renderChart(id, values) {
    const el = document.getElementById(id);
    if (!el || !values || !values.length) return;
    const max = Math.max(...values, 1); // default to 1 to avoid divide by zero
    el.innerHTML = values.map(v => `<div class="bar" style="height:${(v/max)*100}%" title="${v}"></div>`).join('');
}
