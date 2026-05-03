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
        // Brand accent — restrained Radix violet, used sparingly.
        mystic: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        // Subtle amber — only for the "credits" affordance. No flashy gradients.
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#f59e0b',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
        },
        // Neutral grayscale — Linear/Vercel "premium dark" inspired.
        // ink-900 = page background (near-black); ink-100 = primary text;
        // ink-200/300 = muted text; ink-700/800 = surfaces; ink-50 = inverse.
        ink: {
          50:  '#fafafa',
          100: '#e6e6e9',
          200: '#a1a1aa',
          300: '#71717a',
          400: '#52525b',
          500: '#3f3f46',
          600: '#27272a',
          700: '#1f1f23',
          800: '#141417',
          900: '#0a0a0c',
          950: '#050507',
        },
      },
      fontFamily: {
        // Display surface (headings/large numbers): Geist; Inter as ramp fallback.
        display: ['var(--font-display)', 'Geist', 'Inter', 'system-ui', 'sans-serif'],
        // Body / UI: Inter.
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        // Toned-down ambient gradient: near-black with one cool violet wash.
        'mystic-gradient':
          'radial-gradient(ellipse at 20% -10%, rgba(124,58,237,0.10) 0%, transparent 55%), linear-gradient(180deg, #0a0a0c 0%, #0a0a0c 100%)',
        // Solid amber rather than flashy ramp.
        'gold-gradient':
          'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
        'mystic-card':
          'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.00) 100%)',
      },
      boxShadow: {
        // Quiet, Stripe-like elevation — no neon glow.
        glow: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.5)',
        gold: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 6px 20px -10px rgba(245,158,11,0.25)',
        soft: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -16px rgba(0,0,0,0.6)',
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%':   { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(124,58,237,0.30)' },
          '70%':  { transform: 'scale(1)',    boxShadow: '0 0 0 14px rgba(124,58,237,0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(124,58,237,0)' },
        },
      },
    },
  },
  plugins: [],
}
