let alertTimer;
let authAlertTimer;

export function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('alert');
    if (!alertBox) return;
    alertBox.innerHTML = message;
    alertBox.className = `alert ${type} show`;

    window.clearTimeout(alertTimer);
    alertTimer = window.setTimeout(() => {
        alertBox.classList.remove('show');
    }, 3000);
}

export function showAuthAlert(message, type = 'success') {
    const alertBox = document.getElementById('authAlert');
    if (!alertBox) return;
    alertBox.innerHTML = message;
    alertBox.className = `alert auth-alert ${type} show`;

    window.clearTimeout(authAlertTimer);
    authAlertTimer = window.setTimeout(() => {
        alertBox.classList.remove('show');
    }, 3000);
}

export function clearAuthAlert() {
    const alertBox = document.getElementById('authAlert');
    if (alertBox) {
        alertBox.classList.remove('show');
    }
}

export function showApp(currentUser) {
    const authScreen = document.getElementById('authScreen');
    const appShell = document.getElementById('appShell');
    if (authScreen) {
        authScreen.hidden = true;
        authScreen.style.display = 'none';
    }
    if (appShell) {
        appShell.hidden = false;
        appShell.style.display = 'block';
    }

    const userChip = document.getElementById('userChip');
    if (userChip && currentUser) {
        userChip.textContent = `@${currentUser.username}`;
    }
}

export function showAuth() {
    const authScreen = document.getElementById('authScreen');
    const appShell = document.getElementById('appShell');
    if (authScreen) {
        authScreen.hidden = false;
        authScreen.style.display = 'flex';
    }
    if (appShell) {
        appShell.hidden = true;
        appShell.style.display = 'none';
    }
    showAuthView('login');
}

export function showAuthView(view) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTab = document.getElementById('authLoginTab');
    const registerTab = document.getElementById('authRegisterTab');

    if (loginForm) {
        loginForm.classList.toggle('active', view === 'login');
    }
    if (registerForm) {
        registerForm.classList.toggle('active', view === 'register');
    }
    if (loginTab) {
        loginTab.classList.toggle('active', view === 'login');
    }
    if (registerTab) {
        registerTab.classList.toggle('active', view === 'register');
    }

    clearAuthAlert();
}

export function openEditModal(id, habits) {
    const habit = habits.find((h) => h._id === id || h.id === id);
    if (!habit) return;

    document.getElementById('editHabitId').value = id;
    document.getElementById('editHabitName').value = habit.name;
    document.getElementById('editHabitCategory').value = habit.category;
    document.getElementById('editHabitDescription').value = habit.description;
    document.getElementById('editHabitGoal').value = habit.goal;

    document.getElementById('editModal').classList.add('show');
}

export function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.classList.remove('show');
    }
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.reset();
    }
}
