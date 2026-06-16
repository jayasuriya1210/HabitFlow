import { THEME_STORAGE_KEY } from './config.js';

export function applyTheme(theme, persist = true) {
    const activeTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', activeTheme);

    if (persist) {
        localStorage.setItem(THEME_STORAGE_KEY, activeTheme);
    }

    const label = activeTheme === 'dark' ? '☀' : '☾';

    document.querySelectorAll('#themeBtn, #dashThemeToggle, .theme-btn').forEach((button) => {
        if (button) {
            button.textContent = label;
        }
    });
    
    const sw = document.getElementById('darkSwitch');
    if (sw) {
        if (activeTheme === 'dark') {
            sw.classList.add('on');
        } else {
            sw.classList.remove('on');
        }
    }

    return activeTheme;
}

export function toggleTheme(currentTheme) {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    return applyTheme(newTheme);
}
