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
        <div class="row">
            <span class="emoji">${emoji}</span>
            <span class="badge ${completedToday ? 'active' : 'pending'}">${completedToday ? 'Completed' : 'Pending'}</span>
        </div>
        <div>
            <h4>${habit.name}</h4>
            <div class="meta">${habit.category} · ${daysTracked}d tracked</div>
        </div>
        <div class="progress"><div style="width:${progress}%"></div></div>
        <div style="display:flex; gap:8px; margin-top:10px;">
            <button class="btn" style="flex:1; font-size:12px; padding:6px 10px;" onclick="app.completeHabit('${habitId}')" ${completedToday ? 'disabled' : ''}>${completedToday ? '✓ Done' : '+ Complete'}</button>
            <button class="btn" style="font-size:12px; padding:6px 10px;" onclick="openEditModal('${habitId}')">✎ Edit</button>
            <button class="btn" style="font-size:12px; padding:6px 10px; color:#ef4444; border-color:#fee2e2;" onclick="app.deleteHabit('${habitId}')">🗑</button>
        </div>
      </div>
    `;
}
