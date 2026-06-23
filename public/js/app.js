import { applyTheme, toggleTheme } from './theme.js';
import { restoreUserSession, loginUser, registerUser, logoutUser } from './auth.js';
import { addHabit, loadHabits, markHabitCompleted, updateHabit, deleteHabitById, getStats, createHabitCard } from './habit.js';
import { showAlert, showAuthAlert, showApp, showAuth, showAuthView, openEditModal, closeEditModal, go, renderChart } from './ui.js';
import { getAuthToken, apiFetch } from './api.js';

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
        this.setupIntersectionObserver();

        try {
            if (this.authToken) {
                this.currentUser = await restoreUserSession();
                this.isAuthenticated = true;
                showApp(this.currentUser);
                await this.loadHabits();
                await this.updateStats();
                if(document.getElementById('profileNameDisplay')) document.getElementById('profileNameDisplay').textContent = this.currentUser.username;
                if(document.getElementById('profileEmailDisplay')) document.getElementById('profileEmailDisplay').textContent = this.currentUser.email || 'No email provided';
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

    setupIntersectionObserver() {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('in');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => io.observe(el));
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
        
        // Pre-fill profile
        if(document.getElementById('profileNameDisplay')) document.getElementById('profileNameDisplay').textContent = this.currentUser.username;
        if(document.getElementById('profileEmailDisplay')) document.getElementById('profileEmailDisplay').textContent = this.currentUser.email || 'No email provided';
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
            const modal = document.getElementById('createHabitModal');
            if (modal) modal.style.display = 'none';
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
        const container = document.getElementById('habits-grid');
        this.renderPendingTasks();
        if (!container) return;

        if (this.habits.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No habits yet</h3>
                    <p style="color:var(--text-muted);">Create your first habit to start tracking.</p>
                </div>`;
            return;
        }

        container.innerHTML = this.habits.map(h => createHabitCard(h)).join('');
        this.renderRecentHabitsTable();
    }

    renderPendingTasks() {
        const container = document.getElementById('pending-tasks-feed');
        if (!container) return;

        const today = new Date().toISOString().split('T')[0];
        const pendingHabits = this.habits.filter(h => !h.completedDates.includes(today));

        if (pendingHabits.length === 0) {
            container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:14px;">No pending tasks for today! 🎉</div>';
            return;
        }

        container.innerHTML = pendingHabits.map(habit => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:0.5px solid var(--border);">
                <div>
                    <div style="font-weight:500;">${habit.name}</div>
                    <div style="font-size:12px; color:var(--text-muted);">${habit.category}</div>
                </div>
                <button class="btn" style="font-size:12px; padding:6px 12px;" onclick="app.completeHabit('${habit._id || habit.id}')">Complete</button>
            </div>
        `).join('');
    }

    renderRecentHabitsTable() {
        const tbody = document.getElementById('recent-habits-tbody');
        if (!tbody) return;
        if (this.habits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No habits found</td></tr>';
            return;
        }
        
        // Show up to 5 most recently created habits
        const recent = [...this.habits].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
        tbody.innerHTML = recent.map(h => {
             const dates = h.completedDates || [];
             let streak = 0;
             if(dates.length > 0) {
                  streak = 1;
             }
             return `<tr>
                 <td>${h.name}</td>
                 <td>${h.category}</td>
                 <td>${dates.length} days</td>
                 <td><span class="badge active">Active</span></td>
             </tr>`;
        }).join('');
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
            
            // Standard Navbar stats
            const activeHabitsCount = document.getElementById('activeHabitsCount');
            const todayProgress = document.getElementById('todayProgress');
            if (activeHabitsCount) activeHabitsCount.textContent = stats.totalHabits;
            if (todayProgress) todayProgress.textContent = stats.todayProgress;
            
            // Overview Dashboard Stats
            const overviewStreak = document.getElementById('overviewStreak');
            const overviewCheckins = document.getElementById('overviewCheckins');
            if (overviewStreak) overviewStreak.textContent = stats.longestStreak + 'd';
            if (overviewCheckins) overviewCheckins.textContent = `${stats.completedToday}/${stats.totalHabits}`;
            
            // Analytics Dashboard Stats
            const analyticsTotal = document.getElementById('analyticsTotal');
            const analyticsLongest = document.getElementById('analyticsLongest');
            if (analyticsTotal) analyticsTotal.textContent = stats.totalCompletions;
            if (analyticsLongest) analyticsLongest.textContent = stats.longestStreak + 'd';

            // Charts
            if (stats.last7Days) renderChart('overview-chart', stats.last7Days);
            if (stats.last8Weeks) renderChart('analytics-chart', stats.last8Weeks);
            
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }
    
    // Subscribe
    async subscribe(planName) {
        try {
            const response = await apiFetch('/auth/subscribe', {
                method: 'POST',
                body: JSON.stringify({ plan: planName })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to subscribe');
            }
            this.currentUser = data.user;
            showAlert(`Successfully subscribed to ${planName}!`, 'success');
            
            // Update UI to reflect plan
            const planDisplay = document.getElementById('currentPlanDisplay');
            if(planDisplay) planDisplay.textContent = planName;
            
            go('dashboard');
        } catch (error) {
            console.error('Error subscribing:', error);
            showAlert(error.message, 'danger');
        }
    }
    
    // Update Profile
    async updateProfile() {
        try {
            const username = document.getElementById('profileName').value.trim();
            const email = document.getElementById('profileEmail').value.trim();
            
            if (!username) {
                showAlert('Name cannot be empty', 'warning');
                return;
            }
            
            const response = await apiFetch('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify({ username, email })
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }
            
            this.currentUser = data.user;
            showAlert('Profile updated successfully!', 'success');
            
            // Update UI chips
            const userChips = document.querySelectorAll('.sidebar-foot span');
            userChips.forEach(chip => {
                if(chip.textContent.startsWith('@')) chip.textContent = `@${this.currentUser.username}`;
            });
            
        } catch (error) {
            console.error('Error updating profile:', error);
            showAlert(error.message, 'danger');
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
    window.go = (page) => {
        go(page);
        if (page === 'dashboard' && app.isAuthenticated) {
            app.renderHabits();
        }
    };
    window.openEditModal = (id) => openEditModal(id, app.habits);
    window.closeEditModal = closeEditModal;
    window.toggleTheme = () => app.toggleTheme();
    
    // Bind Dashboard sidebar section toggler
    window.showSection = (btn, name) => {
        document.querySelectorAll('.nav-item[data-section]').forEach(n => n.classList.remove('active'));
        if(btn) btn.classList.add('active');
        document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
        const sec = document.getElementById('sec-' + name);
        if(sec) sec.classList.add('active');
    };
    
    // Bind Checkout functions
    window.selectPlan = (name, price) => {
        if (!app.isAuthenticated) {
            showAlert('Please create an account or log in first before subscribing', 'warning');
            go('home'); // Go to login section inside auth screen
            showAuthView('register');
            return;
        }
        document.getElementById('co-plan').textContent = name;
        document.getElementById('sum-plan').textContent = name;
        document.getElementById('sum-after').textContent = '$' + price.toFixed(2);
        
        // Hide/show correct view
        go('checkout');
    };
    
    window.submitCheckout = () => {
        const planName = document.getElementById('co-plan').textContent;
        app.subscribe(planName);
    };
});
