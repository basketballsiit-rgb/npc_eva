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
          DEFAULT: '#4A2C6D',
          dark: '#351F4F',
          light: '#613B8E',
          soft: '#F3EBF9',
        },
        info: {
          DEFAULT: '#0288D1',
          dark: '#01579B',
          light: '#29B6F6',
        },
        accent: {
          DEFAULT: '#F57C00',
          dark: '#E65100',
          light: '#FFB74D',
        },
        danger: {
          DEFAULT: '#D32F2F',
          dark: '#C62828',
          light: '#EF5350',
        }
      },
      fontFamily: {
        sans: ['Kanit', 'sans-serif'],
        sarabun: ['Sarabun', '"TH Sarabun PSK"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
