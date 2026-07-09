/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jiwo: {
          bg: '#F9FBF9', // Cream/off-white with a hint of green
          primary: '#4FA3A5', // Warm Tosca
          primaryLight: '#D2ECEE', // Soft Tosca
          sage: '#8FBC8F', // Sage green
          sageLight: '#E8F2E8', // Light Sage green
          blueCalm: '#6B90B3', // Calming blue
          blueLight: '#E6EEF6', // Light calming blue
          textDark: '#2C3E3F', // Dark Slate for readability without harshness of pure black
          textMuted: '#607D8B', // Slate gray
          stress: '#E88E8D', // Soft red-orange for stress state
          happy: '#F4D35E', // Warm yellow for happy state
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'breathe-slow': 'breathe 8s ease-in-out infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.035)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
