/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // NISHKA brand pink palette
        brand: {
          50:  '#fff0f5',
          100: '#ffe0ec',
          200: '#ffc1d9',
          300: '#ff93bb',
          400: '#ff5593',
          500: '#f72f6e',   // primary brand pink
          600: '#e8186a',   // slightly deeper
          700: '#c40f56',
          800: '#a30e49',
          900: '#870f41',
          950: '#52011f',
        },
        rose: {
          DEFAULT: '#f72f6e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 4px 24px -4px rgba(247, 47, 110, 0.25)',
        'card':  '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.06)',
        'card-hover': '0 4px 16px -4px rgba(0,0,0,.12)',
      },
    },
  },
  plugins: [],
};
