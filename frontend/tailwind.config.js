/** @type {import('tailwindcss').Config} */
module.exports = {
  // hlídat vše ve složce src
  content: ['./src/**/*.{ts,tsx,jsx,js}'],

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
        primary:   '#1976d2',   // modrá
        secondary: '#424242',   // tmavě šedá
        accent:    '#008080',   // teal
        'bg-light':'#fafafa',
        'bg-dark' :'#121212',
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
