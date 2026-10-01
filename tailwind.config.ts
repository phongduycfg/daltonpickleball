import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Design tokens theo bản demo v7 đã chốt.
 * Nền navy tối · card #0F1A2C · lime #D7F531 có glow · bo góc 12/16/24px.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#08111F',
        ink: '#0B1424',
        card: '#0F1A2C',
        card2: '#13203A',
        deep: '#0B1526',
        nav: '#0D1729',
        lime: { DEFAULT: '#D7F531', soft: '#ECFCCB' },
        live: '#EF4444',
        done: '#22C55E',
        soon: '#0EA5E9',
        warn: '#FB923C',
        // Biến dùng bởi shadcn/ui
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
      },
      fontFamily: { sans: ['var(--font-sans)', 'system-ui', 'sans-serif'] },
      borderRadius: { lg: '1.5rem', md: '1rem', sm: '0.75rem' },
      boxShadow: {
        glow: '0 0 24px rgba(215,245,49,.28)',
        'glow-sm': '0 0 14px rgba(215,245,49,.35)',
        card: 'inset 0 1px 0 rgba(255,255,255,.04), 0 10px 30px rgba(0,0,0,.25)',
      },
      keyframes: {
        bump: { '0%,100%': { transform: 'scale(1)' }, '35%': { transform: 'scale(1.45)' } },
        blink: { '50%': { opacity: '.35' } },
      },
      animation: { bump: 'bump .35s ease-out', blink: 'blink 1.2s infinite' },
    },
  },
  plugins: [animate],
};

export default config;
