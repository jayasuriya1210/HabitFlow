import { API_BASE_URL, TOKEN_STORAGE_KEY, LEGACY_TOKEN_STORAGE_KEY } from './config.js';

export function getAuthToken() {
    let token = localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);
    if (token && !localStorage.getItem(TOKEN_STORAGE_KEY)) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    }
    return token;
}

export function setAuthToken(token) {
    if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    }
}

export async function apiFetch(path, options = {}, authRequired = true, onSessionExpired = null) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const token = getAuthToken();
    if (authRequired && token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
    });

    if (response.status === 401 && authRequired) {
        if (onSessionExpired) {
            await onSessionExpired();
        }
        throw new Error('Authentication required');
    }

    return response;
}
