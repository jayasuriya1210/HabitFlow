import { apiFetch } from './api.js';

export async function loginUser(username, password) {
    const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    }, false);

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Login failed');
    }
    return data;
}

export async function registerUser(username, password) {
    const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    }, false);

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Account creation failed');
    }
    return data;
}

export async function logoutUser() {
    try {
        await apiFetch('/auth/logout', { method: 'POST' }, true);
    } catch (error) {
        console.warn('Logout request failed:', error);
    }
}

export async function restoreUserSession() {
    const response = await apiFetch('/auth/me', { method: 'GET' }, true);
    if (!response.ok) {
        throw new Error('Unable to restore session');
    }
    const data = await response.json();
    return data.user;
}
