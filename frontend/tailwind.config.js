/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mystic: {
          50:  '#f7f3ff',
          100: '#ede1ff',
          200: '#dcc4ff',
          300: '#c39bff',
          400: '#a86bff',
          500: '#8b3dff',
          600: '#7322e6',
          700: '#5b18b8',
          800: '#3f0e8a',
          900: '#26075c',
          950: '#16003a',
        },
        gold: {
          50:  '#fdf9ec',
          100: '#fbf0c8',
          200: '#f6e08e',
          300: '#f0c84f',
          400: '#e8b228',
          500: '#d49b1c',
          600: '#b27915',
          700: '#8b5a14',
          800: '#724817',
          900: '#5f3c18',
        },
        rose: {
          400: '#ec4899',
          500: '#db2777',
        },
        ink: {
          50:  '#f5f3ff',
          100: '#e9e4f5',
          200: '#cfc6e3',
          300: '#a497c7',
          400: '#7868a4',
          500: '#574785',
          600: '#3e3066',
          700: '#2a1f4a',
          800: '#1a1133',
          900: '#0e0823',
          950: '#070315',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'mystic-gradient':
          'radial-gradient(ellipse at top, rgba(139,61,255,0.25) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(212,155,28,0.10) 0%, transparent 55%), linear-gradient(180deg, #0e0823 0%, #16003a 60%, #070315 100%)',
        'gold-gradient':
          'linear-gradient(135deg, #f0c84f 0%, #d49b1c 50%, #8b5a14 100%)',
        'mystic-card':
          'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
      },
      boxShadow: {
        glow: '0 0 32px -4px rgba(139,61,255,0.45)',
        gold: '0 0 24px -4px rgba(212,155,28,0.45)',
        soft: '0 10px 40px -10px rgba(0,0,0,0.5)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        twinkle: {
          '0%,100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(139,61,255,0.55)' },
          '70%': { transform: 'scale(1)', boxShadow: '0 0 0 18px rgba(139,61,255,0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(139,61,255,0)' },
        },
      },
    },
  },
  plugins: [],
}
