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
        // Emerald color scale (renamed from primary to avoid conflicts)
        emerald: {
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
        // Static accent color (kept for backward compatibility)
        accent:    '#059669',   // zelená
        'bg-light':'#ffffff',   // čistě bílá
        'bg-dark' :'#0f0f0f',   // velmi tmavě šedá místo černé

        /* ---------- Universal Theme Colors ---------- */
        // Surface/Background colors (use with bg-, border-, etc.)
        'base': 'var(--color-bg-base)',
        'card': 'var(--color-bg-card)',
        'elevated': 'var(--color-bg-elevated)',
        'input': 'var(--color-bg-input)',
        'brand': 'var(--color-bg-brand)',
        'brand-hover': 'var(--color-bg-brand-hover)',
        'brand-active': 'var(--color-bg-brand-active)',
        'hover': 'var(--color-bg-hover)',
        'hover-strong': 'var(--color-bg-hover-strong)',

        // Text colors (use with text-) - simplified names without text- prefix
        'primary': 'var(--color-text-primary)',
        'secondary': 'var(--color-text-secondary)',
        'muted': 'var(--color-text-muted)',
        'error': 'var(--color-text-error)',
        'accent-text': 'var(--color-text-accent)',
        'on-brand': 'var(--color-text-on-brand)',
        'on-brand-active': 'var(--color-text-on-brand-active)',

        // Border colors - simplified names without border- prefix
        'border': 'var(--color-border-default)',
        'border-light': 'var(--color-border-light)',
        'border-accent': 'var(--color-border-accent)',

        // Divider color
        'divider': 'var(--color-divider)',

        // Semantic badge colors
        'badge-success-bg': 'var(--color-badge-success-bg)',
        'badge-success-text': 'var(--color-badge-success-text)',
        'badge-info-bg': 'var(--color-badge-info-bg)',
        'badge-info-text': 'var(--color-badge-info-text)',
        'badge-warning-bg': 'var(--color-badge-warning-bg)',
        'badge-warning-text': 'var(--color-badge-warning-text)',
        'badge-pending-bg': 'var(--color-badge-pending-bg)',
        'badge-pending-text': 'var(--color-badge-pending-text)',
        'badge-error-bg': 'var(--color-badge-error-bg)',
        'badge-error-text': 'var(--color-badge-error-text)',
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
