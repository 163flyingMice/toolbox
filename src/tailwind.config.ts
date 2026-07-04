import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'dev-bg': '#0F1117',
        'dev-panel': '#1A1D2E',
        'dev-green': '#00E5A0',
        'dev-orange': '#FF6B35',
        'dev-border': '#2A2D3E',
        'dev-muted': '#C8CCD4',
        'dev-text': '#E8ECF0',
        'dev-input': '#12141E',
        'dev-hover': '#242738',
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
