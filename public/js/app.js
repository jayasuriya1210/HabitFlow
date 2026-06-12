import { applyTheme, toggleTheme } from './theme.js';
import { restoreUserSession, loginUser, registerUser, logoutUser } from './auth.js';
import { addHabit, loadHabits, markHabitCompleted, updateHabit, deleteHabitById, getStats, createHabitCard } from './habit.js';
import { showAlert, showAuthAlert, showApp, showAuth, showAuthView, openEditModal, closeEditModal } from './ui.js';
import { getAuthToken } from './api.js';

class HabitFlow {
    constructor() {
        this.habits = [];
        this.currentFilter = 'all';
        this.currentUser = null;
        this.authToken = getAuthToken();
        this.theme = localStorage.getItem('habitflow_theme')
            || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        this.isAuthenticated = false;
    }

    // Initialize the app
    async init() {
        this.theme = applyTheme(this.theme, false);
        this.setupEventListeners();

        try {
            if (this.authToken) {
                this.currentUser = await restoreUserSession();
                this.isAuthenticated = true;
                showApp(this.currentUser);
                await this.loadHabits();
                await this.updateStats();
                showAlert(`Welcome back, ${this.currentUser.username}!`, 'success');
            } else {
                showAuth();
            }
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.handleSessionExpired();
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
            authLoginTab.addEventListener('click', () => showAuthView('login'));
        }
        if (authRegisterTab) {
            authRegisterTab.addEventListener('click', () => showAuthView('register'));
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
    }

    async handleSessionExpired() {
        localStorage.removeItem('habitflow_auth_token');
        localStorage.removeItem('habitflow_session_token');
        this.authToken = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.habits = [];
        this.renderHabits();
        this.updateStats();
        showAuth();
        showAuthAlert('Your session expired. Please sign in again.', 'warning');
    }

    toggleTheme() {
        this.theme = toggleTheme(this.theme);
    }

    // Authentication
    async login() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            showAuthAlert('Please enter your username and password.', 'danger');
            return;
        }

        try {
            const data = await loginUser(username, password);
            this.onAuthSuccess(data, `Welcome back, ${data.user.username}!`);
        } catch (error) {
            console.error('Error logging in:', error);
            showAuthAlert(error.message || 'Failed to log in.', 'danger');
        }
    }

    async register() {
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (!username || !password || !confirmPassword) {
            showAuthAlert('Please complete all registration fields.', 'danger');
            return;
        }

        if (password !== confirmPassword) {
            showAuthAlert('Passwords do not match.', 'danger');
            return;
        }

        try {
            const data = await registerUser(username, password);
            this.onAuthSuccess(data, `Welcome, ${data.user.username}!`);
        } catch (error) {
            console.error('Error registering:', error);
            showAuthAlert(error.message || 'Failed to create account.', 'danger');
        }
    }

    async logout(silent = false) {
        try {
            if (this.authToken) {
                await logoutUser();
            }
        } finally {
            localStorage.removeItem('habitflow_auth_token');
            localStorage.removeItem('habitflow_session_token');
            this.authToken = null;
            this.currentUser = null;
            this.isAuthenticated = false;
            this.habits = [];
            this.renderHabits();
            this.updateStats();
            showAuth();

            if (!silent) {
                showAuthAlert('You have been signed out.', 'success');
            }
        }
    }

    onAuthSuccess(data, message) {
        this.authToken = data.accessToken || data.sessionToken;
        if (!this.authToken) {
            throw new Error('Authentication token missing from server response');
        }
        this.currentUser = data.user;
        this.isAuthenticated = true;
        localStorage.setItem('habitflow_auth_token', this.authToken);
        localStorage.removeItem('habitflow_session_token');
        showApp(this.currentUser);
        showAlert(message, 'success');
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
            showAlert('Please fill in all required fields.', 'danger');
            return;
        }

        try {
            await addHabit({ name, category, description, goal });
            document.getElementById('habitForm').reset();
            await this.loadHabits();
            await this.updateStats();
            showAlert(`Habit "${name}" created successfully!`, 'success');
        } catch (error) {
            console.error('Error adding habit:', error);
            showAlert(error.message || 'Failed to create habit', 'danger');
        }
    }

    // READ - Load habits from API
    async loadHabits() {
        if (!this.isAuthenticated) {
            this.renderHabits();
            return;
        }

        try {
            this.habits = await loadHabits();
            this.renderHabits();
        } catch (error) {
            console.error('Error loading habits:', error);
            showAlert(error.message || 'Failed to load habits', 'danger');
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

        container.innerHTML = filteredHabits.map((habit) => createHabitCard(habit)).join('');
    }

    // UPDATE - Complete habit
    async completeHabit(id) {
        const habit = this.habits.find((h) => h._id === id || h.id === id);
        if (!habit) return;

        const today = new Date().toISOString().split('T')[0];

        if (habit.completedDates.includes(today)) {
            showAlert('You already completed this habit today!', 'warning');
            return;
        }

        try {
            await markHabitCompleted(id);
            await this.loadHabits();
            await this.updateStats();
            showAlert(`Great job! You completed "${habit.name}" today!`, 'success');
        } catch (error) {
            console.error('Error completing habit:', error);
            showAlert(error.message || 'Failed to complete habit', 'danger');
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
            showAlert('Please fill in all required fields.', 'danger');
            return;
        }

        try {
            await updateHabit(id, { name, category, description, goal });
            await this.loadHabits();
            await this.updateStats();
            showAlert(`Habit "${name}" updated successfully!`, 'success');
            closeEditModal();
        } catch (error) {
            console.error('Error updating habit:', error);
            showAlert(error.message || 'Failed to update habit', 'danger');
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
            await deleteHabitById(id);
            await this.loadHabits();
            await this.updateStats();
            showAlert('Habit deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting habit:', error);
            showAlert(error.message || 'Failed to delete habit', 'danger');
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
            const stats = await getStats();
            const activeHabitsCount = document.getElementById('activeHabitsCount');
            const todayProgress = document.getElementById('todayProgress');
            if (activeHabitsCount) activeHabitsCount.textContent = stats.totalHabits;
            if (todayProgress) todayProgress.textContent = stats.todayProgress;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }
}

// Initialize App
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HabitFlow();
    app.init();

    // Bind to window for HTML onclick handler compatibility
    window.app = app;
    window.openEditModal = (id) => openEditModal(id, app.habits);
    window.closeEditModal = closeEditModal;
});
