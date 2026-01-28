/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                bg: {
                    primary: 'var(--bg-primary)',
                    secondary: 'var(--bg-secondary)',
                    hover: 'var(--bg-hover)',
                    panel: 'var(--bg-panel)',
                },
                text: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
                    muted: 'var(--text-muted)',
                },
                accent: 'var(--accent)',
                selection: 'var(--selection)',
                cursor: 'var(--cursor)',
            },
        },
    },
    plugins: [],
};
