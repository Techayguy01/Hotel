const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        join(__dirname, '{src,pages,components,app}/**/*.{ts,tsx,html}'),
        join(__dirname, 'components/**/*.{ts,tsx}'),
        join(__dirname, 'app/**/*.{ts,tsx}'),
    ],
    theme: {
        extend: {
            fontFamily: {
                pixel: ["'Press Start 2P'", "cursive"],
                friendly: ["'Fredoka'", "sans-serif"],
            },
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
                secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
                accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
                card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
                // Pokemon Theme
                pokedex: { red: "#ef5350", "red-dark": "#c62828" },
                screen: { green: "#98c379", "green-dark": "#558b2f" },
            },
            animation: {
                "float": "float 3s ease-in-out infinite",
                "bounce-talk": "bounce 0.5s infinite",
                "pulse-listen": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-10px)" },
                }
            }
        },
    },
    plugins: [],
};
