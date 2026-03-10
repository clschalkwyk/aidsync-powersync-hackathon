/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Updated Clinical color palette based on UI/UX Pro Max recommendations
        // Primary: #0891B2 (Cyan 600), Background: #ECFEFF (Cyan 50), Text: #164E63 (Cyan 900)
        clinical: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        // Safety colors - reserved for real warning states
        // CTA/Success: #059669 (Emerald 600)
        safety: {
          green: '#059669',
          yellow: '#d97706',
          red: '#dc2626',
        },
        // Brand accent
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      fontFamily: {
        // Figtree for professional clinical look
        sans: ['Figtree', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      transitionDuration: {
        'DEFAULT': '200ms',
      },
    },
  },
  plugins: [],
}
