/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'accent-primary': '#00f2ff',
        'accent-secondary': '#7000ff',
        'accent-success': '#00ff88',
        'accent-warning': '#ffcc00',
        'accent-error': '#ff3366',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
