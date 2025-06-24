/** @type {import('tailwindcss').Config} */
module.exports = {
  // hlídat vše ve složce src
  content: ['./src/**/*.{ts,tsx,jsx,js}'],
  darkMode: 'class',

  theme: {
    extend: {
      borderRadius: {
        lg: '12px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 2px 6px -1px rgb(0 0 0 / 0.1)',
        mat: '0 1px 2px 0 rgb(0 0 0 / .14), 0 1px 3px 1px rgb(0 0 0 / .12)',
      },
      /* ---------- barvy projektu ---------- */
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        secondary: '#424242',   // tmavě šedá
        accent:    '#059669',   // zelená
        'bg-light':'#ffffff',   // čistě bílá
        'bg-dark' :'#0f0f0f',   // velmi tmavě šedá místo černé
      },

      /* ---------- animace fade-in ---------- */
      keyframes: {
        fade: {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      animation: {
        fade: 'fade 200ms ease-out',
      },
    },

    /* ---------- globální rodina písma & container ---------- */
    fontFamily: { inter: ['Inter', 'sans-serif'] },
    container:  { center: true, padding: '1rem' },
  },

  plugins: [
    /* nový plugin – utility .form-input, .form-select, … */
    require('@tailwindcss/forms')({ strategy: 'class' }),
  ],
};
