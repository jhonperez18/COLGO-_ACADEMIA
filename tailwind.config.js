/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        accent2: 'var(--accent-2)',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}

