/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
      extend: {
        colors: {
          darkBg: "#000814",
          accent: "#d95b1a",
          secondary: "#0077ff"
        },
        animation: {
          'fade-in': 'fade-in 0.6s ease-out',
          'spin-slow': 'spin 3s linear infinite',
          'spin-reverse-slow': 'spin-reverse 4s linear infinite',
          'draw': 'draw 2s ease-out forwards',
          'bounce-smooth': 'bounce-smooth 1.5s ease-in-out infinite',
          'bounce-shadow': 'bounce-shadow 1.5s ease-in-out infinite',
          'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
          'bounce-quick': 'bounce-quick 0.8s ease-in-out infinite',
        },
        keyframes: {
          'fade-in': {
            from: {
              opacity: '0',
              transform: 'translateY(20px)',
            },
            to: {
              opacity: '1',
              transform: 'translateY(0)',
            },
          },
          'spin-reverse': {
            from: {
              transform: 'rotate(0deg)',
            },
            to: {
              transform: 'rotate(-360deg)',
            },
          },
          'draw': {
            from: {
              strokeDasharray: '300',
              strokeDashoffset: '300',
            },
            to: {
              strokeDasharray: '300',
              strokeDashoffset: '0',
            },
          },
          'bounce-smooth': {
            '0%, 100%': {
              transform: 'translateY(0)',
              animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
            },
            '50%': {
              transform: 'translateY(-20px)',
              animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
            },
          },
          'bounce-shadow': {
            '0%, 100%': {
              transform: 'translateX(-50%) scaleX(1) scaleY(1)',
              opacity: '0.3',
            },
            '50%': {
              transform: 'translateX(-50%) scaleX(1.3) scaleY(0.5)',
              opacity: '0.1',
            },
          },
          'bounce-gentle': {
            '0%, 100%': {
              transform: 'translateY(0)',
              animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)',
            },
            '50%': {
              transform: 'translateY(-12px)',
              animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)',
            },
          },
          'bounce-quick': {
            '0%, 100%': {
              transform: 'translateY(0)',
              animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
            },
            '50%': {
              transform: 'translateY(-15px)',
              animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
            },
          },
        },
      },
    },
    plugins: [],
  }