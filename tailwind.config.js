/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
        },
      },
    },
  },
  plugins: [],
};
