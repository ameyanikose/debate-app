/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#157C61',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#157C61',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        background: {
          DEFAULT: '#F8F1DD',
          50: '#F8F1DD',
          100: '#f5f0e8',
          200: '#f0e8d6',
          300: '#e8dcc4',
          400: '#e0d0b2',
          500: '#F8F1DD',
        }
      }
    }
  }
}
