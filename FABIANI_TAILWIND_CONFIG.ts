// Configuration Tailwind pour le style Fabiani-Naquet

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette Mondrian
        'mondrian': {
          'white': '#FFFFFF',
          'black': '#111111',
          'yellow': '#FFD700',
          'blue': '#4A90E2',
          'red': '#E74C3C',
          'gray': '#555555',
        },
        // Couleurs du site
        'fabiani': {
          'primary': '#111111',
          'secondary': '#FFD700',
          'accent': '#4A90E2',
          'danger': '#E74C3C',
          'text': '#111111',
          'text-light': '#555555',
        }
      },
      fontFamily: {
        'resolve': ['Resolve Sans', 'Inter', 'system-ui', 'sans-serif'],
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        'nav': '78px',
        'border': '3px',
      },
      height: {
        'nav': '78px',
      },
      borderWidth: {
        '3': '3px',
      },
      boxShadow: {
        'nav-hover': 'inset 3px 0 0 #111111, inset -3px 0 0 #111111',
      },
      animation: {
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      letterSpacing: {
        'logo': '0.02em',
        'nav': '0.05em',
      },
      fontSize: {
        'logo': '1.1rem',
        'nav': '0.8rem',
      },
    },
  },
  plugins: [],
}

export default config