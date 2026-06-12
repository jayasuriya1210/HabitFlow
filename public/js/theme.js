import { THEME_STORAGE_KEY } from './config.js';

export function applyTheme(theme, persist = true) {
    const activeTheme = theme === 'dark' ? 'dark' : 'light';
    document.body.classList.toggle('dark-mode', activeTheme === 'dark');

    if (persist) {
        localStorage.setItem(THEME_STORAGE_KEY, activeTheme);
    }

    const label = activeTheme === 'dark' ? '☀' : '☾';
    const tooltip = activeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

    ['themeToggle', 'authThemeToggle'].forEach((id) => {
        const button = document.getElementById(id);
        if (button) {
            button.textContent = label;
            button.title = tooltip;
            button.setAttribute('aria-label', tooltip);
        }
    });

    return activeTheme;
}

export function toggleTheme(currentTheme) {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    return applyTheme(newTheme);
}
