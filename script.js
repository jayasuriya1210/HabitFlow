const API_BASE_URL = window.location.origin && window.location.origin !== 'null'
    ? `${window.location.origin}/api`
    : 'http://localhost:5000/api';

const TOKEN_STORAGE_KEY = 'habitflow_session_token';
const THEME_STORAGE_KEY = 'habitflow_theme';

// Initialize App
class HabitFlow {
    constructor() {
        this.habits = [];
        this.currentFilter = 'all';
        this.currentUser = null;
        this.authToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        this.theme = localStorage.getItem(THEME_STORAGE_KEY)
            || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        this.isAuthenticated = false;
    }

    // Initialize the app
    async init() {
        this.applyTheme(this.theme, false);
        this.setupEventListeners();

        try {
            await this.restoreSession();
            if (this.isAuthenticated) {
                this.showApp();
                await this.loadHabits();
                await this.updateStats();
                this.showAlert(`Welcome back, ${this.currentUser.username}!`, 'success');
            } else {
                this.showAuth();
            }
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showAuth();
            this.showAuthAlert('Please sign in to continue.', 'warning');
        }
    }

    // Setup all event listeners
    setupEventListeners() {
        const habitForm = document.getElementById('habitForm');
        if (habitForm) {
            habitForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addHabit();
            });
        }

        const editForm = document.getElementById('editForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateHabit();
            });
        }

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.register();
            });
        }

        document.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentFilter = e.currentTarget.dataset.filter;
                this.renderHabits();
            });
        });

        const authLoginTab = document.getElementById('authLoginTab');
        const authRegisterTab = document.getElementById('authRegisterTab');
        if (authLoginTab) {
            authLoginTab.addEventListener('click', () => this.showAuthView('login'));
        }
        if (authRegisterTab) {
            authRegisterTab.addEventListener('click', () => this.showAuthView('register'));
        }

        const themeToggle = document.getElementById('themeToggle');
        const authThemeToggle = document.getElementById('authThemeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        if (authThemeToggle) {
            authThemeToggle.addEventListener('click', () => this.toggleTheme());
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        const closeModalBtn = document.querySelector('.close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeEditModal);
        }

        window.addEventListener('click', (event) => {
            const modal = document.getElementById('editModal');
            if (modal && event.target === modal) {
                closeEditModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (this.isAuthenticated) {
                }
            }
        });
    }

    async apiFetch(path, options = {}, authRequired = true) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (authRequired && this.authToken) {
            headers['x-session-token'] = this.authToken;
        }

        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers
        });

        if (response.status === 401 && authRequired) {
            await this.handleSessionExpired();
            throw new Error('Authentication required');
        }

        return response;
    }

    async restoreSession() {
        if (!this.authToken) {
            return;
        }

        const response = await this.apiFetch('/auth/me', { method: 'GET' }, true);
        if (!response.ok) {
            throw new Error('Unable to restore session');
        }

        const data = await response.json();
        this.currentUser = data.user;
        this.isAuthenticated = true;
    }

    async handleSessionExpired() {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        this.authToken = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.habits = [];
        this.renderHabits();
        this.updateStats();
        this.showAuth();
        this.showAuthAlert('Your session expired. Please sign in again.', 'warning');
    }

    // Theme handling
    applyTheme(theme, persist = true) {
        this.theme = theme === 'dark' ? 'dark' : 'light';
        document.body.classList.toggle('dark-mode', this.theme === 'dark');

        if (persist) {
            localStorage.setItem(THEME_STORAGE_KEY, this.theme);
        }

        const label = this.theme === 'dark' ? '☀' : '☾';
        const tooltip = this.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

        ['themeToggle', 'authThemeToggle'].forEach((id) => {
            const button = document.getElementById(id);
            if (button) {
                button.textContent = label;
                button.title = tooltip;
                button.setAttribute('aria-label', tooltip);
            }
        });
    }

    toggleTheme() {
        this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
    }

    // Screen state
    showApp() {
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
        if (userChip && this.currentUser) {
            userChip.textContent = `@${this.currentUser.username}`;
        }
    }

    showAuth() {
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
        this.showAuthView('login');
    }

    showAuthView(view) {
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

        this.clearAuthAlert();
    }

    // Authentication
    async login() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showAuthAlert('Please enter your username and password.', 'danger');
            return;
        }

        try {
            const response = await this.apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            }, false);

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            this.onAuthSuccess(data, `Welcome back, ${data.user.username}!`);
        } catch (error) {
            console.error('Error logging in:', error);
            this.showAuthAlert(error.message || 'Failed to log in.', 'danger');
        }
    }

    async register() {
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (!username || !password || !confirmPassword) {
            this.showAuthAlert('Please complete all registration fields.', 'danger');
            return;
        }

        if (password !== confirmPassword) {
            this.showAuthAlert('Passwords do not match.', 'danger');
            return;
        }

        try {
            const response = await this.apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            }, false);

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Account creation failed');
            }

            this.onAuthSuccess(data, `Welcome, ${data.user.username}!`);
        } catch (error) {
            console.error('Error registering:', error);
            this.showAuthAlert(error.message || 'Failed to create account.', 'danger');
        }
    }

    async logout(silent = false) {
        try {
            if (this.authToken) {
                await this.apiFetch('/auth/logout', { method: 'POST' }, true);
            }
        } catch (error) {
            console.warn('Logout request failed:', error);
        } finally {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            this.authToken = null;
            this.currentUser = null;
            this.isAuthenticated = false;
            this.habits = [];
            this.renderHabits();
            this.updateStats();
            this.showAuth();

            if (!silent) {
                this.showAuthAlert('You have been signed out.', 'success');
            }
        }
    }

    onAuthSuccess(data, message) {
        this.authToken = data.sessionToken;
        this.currentUser = data.user;
        this.isAuthenticated = true;
        localStorage.setItem(TOKEN_STORAGE_KEY, this.authToken);
        this.showApp();
        this.showAlert(message, 'success');
        this.loadHabits();
        this.updateStats();
    }

    // CREATE - Add new habit
    async addHabit() {
        const name = document.getElementById('habitName').value.trim();
        const category = document.getElementById('habitCategory').value;
        const description = document.getElementById('habitDescription').value.trim();
        const goal = document.getElementById('habitGoal').value;

        if (!name || !category || !goal) {
            this.showAlert('Please fill in all required fields.', 'danger');
            return;
        }

        try {
            const response = await this.apiFetch('/habits', {
                method: 'POST',
                body: JSON.stringify({ name, category, description, goal })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create habit');
            }

            document.getElementById('habitForm').reset();
            await this.loadHabits();
            await this.updateStats();
            this.showAlert(`Habit "${name}" created successfully!`, 'success');
        } catch (error) {
            console.error('Error adding habit:', error);
            this.showAlert(error.message || 'Failed to create habit', 'danger');
        }
    }

    // READ - Load habits from API
    async loadHabits() {
        if (!this.isAuthenticated) {
            this.renderHabits();
            return;
        }

        try {
            const response = await this.apiFetch('/habits', { method: 'GET' });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch habits');
            }

            this.habits = data.habits || [];
            this.renderHabits();
        } catch (error) {
            console.error('Error loading habits:', error);
            this.showAlert(error.message || 'Failed to load habits', 'danger');
        }
    }

    // READ - Render habits
    renderHabits() {
        const container = document.getElementById('habitsContainer');
        if (!container) {
            return;
        }

        if (!this.isAuthenticated) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔒</div>
                    <h2>Sign in to continue</h2>
                    <p>Your habits are tied to your account, so log in or create one to see your dashboard.</p>
                </div>
            `;
            return;
        }

        let filteredHabits = this.habits;
        if (this.currentFilter !== 'all') {
            filteredHabits = this.habits.filter((habit) => habit.category === this.currentFilter);
        }

        if (filteredHabits.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <h2>No habits found!</h2>
                    <p>${this.currentFilter === 'all'
                ? 'Create your first habit to get started on your journey to success.'
                : `No habits in the ${this.currentFilter} category yet.`}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredHabits.map((habit) => this.createHabitCard(habit)).join('');
    }

    // Create habit card HTML
    createHabitCard(habit) {
        const today = new Date().toISOString().split('T')[0];
        const completedToday = habit.completedDates.includes(today);
        const daysTracked = habit.completedDates.length;
        const progress = Math.min((daysTracked / 30) * 100, 100);

        const categoryEmojis = {
            Health: '🏃',
            Learning: '📚',
            Productivity: '💼',
            Mindfulness: '🧘',
            Finance: '💰',
            Social: '👥',
            Other: '✨'
        };

        const emoji = categoryEmojis[habit.category] || '✨';
        const habitId = habit._id || habit.id;

        return `
            <div class="habit-card" data-id="${habitId}">
                <div class="habit-header">
                    <h3 class="habit-title">${habit.name}</h3>
                    <span class="habit-badge">${emoji} ${habit.category}</span>
                </div>

                ${habit.description ? `<p class="habit-description">${habit.description}</p>` : ''}

                <div class="habit-stats">
                    <div class="stat">
                        <div class="stat-label">Days Tracked</div>
                        <div class="stat-number">${daysTracked}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Daily Goal</div>
                        <div class="stat-number">${habit.goal}</div>
                    </div>
                </div>

                <div class="progress-container">
                    <div class="progress-label">
                        <span>30-Day Progress</span>
                        <span>${Math.round(progress)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>

                <div class="action-buttons">
                    <button class="btn-icon btn-check" onclick="app.completeHabit('${habitId}')"
                            style="${completedToday ? 'opacity: 0.6; cursor: not-allowed;' : ''}">
                        ${completedToday ? '✓ Done Today' : '+ Complete'}
                    </button>
                    <button class="btn-icon btn-edit" onclick="openEditModal('${habitId}')">
                        ✎ Edit
                    </button>
                    <button class="btn-icon btn-delete" onclick="app.deleteHabit('${habitId}')">
                        🗑 Delete
                    </button>
                </div>
            </div>
        `;
    }

    // UPDATE - Complete habit
    async completeHabit(id) {
        const habit = this.habits.find((h) => h._id === id || h.id === id);
        if (!habit) return;

        const today = new Date().toISOString().split('T')[0];

        if (habit.completedDates.includes(today)) {
            this.showAlert('You already completed this habit today!', 'warning');
            return;
        }

        try {
            const response = await this.apiFetch(`/habits/${id}/complete`, {
                method: 'POST'
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to complete habit');
            }

            await this.loadHabits();
            await this.updateStats();
            this.showAlert(`Great job! You completed "${habit.name}" today!`, 'success');
        } catch (error) {
            console.error('Error completing habit:', error);
            this.showAlert(error.message || 'Failed to complete habit', 'danger');
        }
    }

    // UPDATE - Edit habit
    async updateHabit() {
        const id = document.getElementById('editHabitId').value;
        const name = document.getElementById('editHabitName').value.trim();
        const category = document.getElementById('editHabitCategory').value;
        const description = document.getElementById('editHabitDescription').value.trim();
        const goal = document.getElementById('editHabitGoal').value;

        if (!name || !category || !goal) {
            this.showAlert('Please fill in all required fields.', 'danger');
            return;
        }

        try {
            const response = await this.apiFetch(`/habits/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name, category, description, goal })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update habit');
            }

            await this.loadHabits();
            await this.updateStats();
            this.showAlert(`Habit "${name}" updated successfully!`, 'success');
            closeEditModal();
        } catch (error) {
            console.error('Error updating habit:', error);
            this.showAlert(error.message || 'Failed to update habit', 'danger');
        }
    }

    // DELETE - Delete habit
    async deleteHabit(id) {
        const habit = this.habits.find((h) => h._id === id || h.id === id);
        if (!habit) return;

        if (!confirm(`Are you sure you want to delete "${habit.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await this.apiFetch(`/habits/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete habit');
            }

            await this.loadHabits();
            await this.updateStats();
            this.showAlert('Habit deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting habit:', error);
            this.showAlert(error.message || 'Failed to delete habit', 'danger');
        }
    }

    // Update statistics
    async updateStats() {
        if (!this.isAuthenticated) {
            const activeHabitsCount = document.getElementById('activeHabitsCount');
            const todayProgress = document.getElementById('todayProgress');
            if (activeHabitsCount) activeHabitsCount.textContent = '0';
            if (todayProgress) todayProgress.textContent = '0%';
            return;
        }

        try {
            const response = await this.apiFetch('/stats', { method: 'GET' });
            const stats = await response.json();

            if (!response.ok) {
                throw new Error(stats.error || 'Failed to fetch stats');
            }

            const activeHabitsCount = document.getElementById('activeHabitsCount');
            const todayProgress = document.getElementById('todayProgress');
            if (activeHabitsCount) activeHabitsCount.textContent = stats.totalHabits;
            if (todayProgress) todayProgress.textContent = stats.todayProgress;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    // Alert helpers
    showAlert(message, type = 'success') {
        const alertBox = document.getElementById('alert');
        if (!alertBox) return;
        alertBox.innerHTML = message;
        alertBox.className = `alert ${type} show`;

        window.clearTimeout(this.alertTimer);
        this.alertTimer = window.setTimeout(() => {
            alertBox.classList.remove('show');
        }, 3000);
    }

    showAuthAlert(message, type = 'success') {
        const alertBox = document.getElementById('authAlert');
        if (!alertBox) return;
        alertBox.innerHTML = message;
        alertBox.className = `alert auth-alert ${type} show`;

        window.clearTimeout(this.authAlertTimer);
        this.authAlertTimer = window.setTimeout(() => {
            alertBox.classList.remove('show');
        }, 3000);
    }

    clearAuthAlert() {
        const alertBox = document.getElementById('authAlert');
        if (alertBox) {
            alertBox.classList.remove('show');
        }
    }
}

// Modal Functions
function openEditModal(id) {
    const habit = app.habits.find((h) => h._id === id || h.id === id);
    if (!habit) return;

    document.getElementById('editHabitId').value = id;
    document.getElementById('editHabitName').value = habit.name;
    document.getElementById('editHabitCategory').value = habit.category;
    document.getElementById('editHabitDescription').value = habit.description;
    document.getElementById('editHabitGoal').value = habit.goal;

    document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
    document.getElementById('editForm').reset();
}

// Initialize App
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HabitFlow();
    app.init();
});
