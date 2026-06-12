export const API_BASE_URL = window.location.origin && window.location.origin !== 'null'
    ? `${window.location.origin}/api`
    : 'http://localhost:5001/api';

export const TOKEN_STORAGE_KEY = 'habitflow_auth_token';
export const LEGACY_TOKEN_STORAGE_KEY = 'habitflow_session_token';
export const THEME_STORAGE_KEY = 'habitflow_theme';
