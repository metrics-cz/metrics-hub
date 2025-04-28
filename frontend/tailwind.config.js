/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{ts,tsx,jsx,js}'],
  
    theme: {
      extend: {
        colors: {
          primary:  '#1976d2',   // modrá
          secondary:'#424242',   // tmavě šedá
          accent:   '#008080',   // teal
          'bg-light':'#fafafa',
          'bg-dark' :'#121212',
        },
      },
      fontFamily: { inter: ['Inter', 'sans-serif'] },
      container:  { center: true, padding: '1rem' },
    },
  
    plugins: [],
  };
  