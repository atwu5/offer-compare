/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* 黑金科技风色板 */
        ink: {
          950: '#070709',
          900: '#0B0B0E',
          850: '#101014',
          800: '#15151B',
          750: '#1B1B22',
          700: '#232330',
          600: '#2E2E3A',
        },
        cream: {
          50: '#F4F1E6',
          100: '#E9E5D6',
          200: '#C9C4B2',
          300: '#A29D8C',
          400: '#7E7A6B',
          500: '#615E52',
          600: '#494640',
        },
        gold: {
          200: '#F6ECC3',
          300: '#EDDB94',
          400: '#E2C368',
          500: '#D0AC3F',
          600: '#AE8C2C',
          700: '#8A6E23',
        },
        steel: {
          300: '#A5CBE8',
          400: '#7BB1DC',
          500: '#5894C6',
        },
      },
    },
  },
  plugins: [],
}
