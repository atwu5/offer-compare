/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* 白金科技风色板：铂金白底 + 金色点缀 */
        ink: {
          950: '#FCFBF8',
          900: '#F7F6F2',
          850: '#FFFFFF',
          800: '#F1EFE9',
          750: '#EBE8E0',
          700: '#E2DFD5',
          600: '#CFCBBE',
        },
        cream: {
          50: '#1C1A14',
          100: '#2B2820',
          200: '#45423A',
          300: '#5F5B4E',
          400: '#7E7A6B',
          500: '#9B9687',
          600: '#B5B0A2',
        },
        gold: {
          200: '#EAD9A0',
          300: '#D9BC6A',
          400: '#C9A23C',
          500: '#B08F27',
          600: '#8A6E23',
          700: '#6E591D',
        },
        steel: {
          300: '#3D6E99',
          400: '#5E92BE',
          500: '#7FA8CB',
        },
      },
    },
  },
  plugins: [],
}
