import { apiFetch } from './api.js';

export async function addHabit(habitData) {
    const response = await apiFetch('/habits', {
        method: 'POST',
        body: JSON.stringify(habitData)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to create habit');
    }
    return data;
}

export async function loadHabits() {
    const response = await apiFetch('/habits', { method: 'GET' });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch habits');
    }
    return data.habits || [];
}

export async function markHabitCompleted(id) {
    const response = await apiFetch(`/habits/${id}/complete`, {
        method: 'POST'
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to complete habit');
    }
    return data;
}

export async function updateHabit(id, habitData) {
    const response = await apiFetch(`/habits/${id}`, {
        method: 'PUT',
        body: JSON.stringify(habitData)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to update habit');
    }
    return data;
}

export async function deleteHabitById(id) {
    const response = await apiFetch(`/habits/${id}`, {
        method: 'DELETE'
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to delete habit');
    }
    return data;
}

export async function getStats() {
    const response = await apiFetch('/stats', { method: 'GET' });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
    }
    return data;
}

export function createHabitCard(habit) {
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
