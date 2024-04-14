import { type Config } from 'tailwindcss';

export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
