module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: '#1a1a28',
        'border-bright': '#2a2a3d',
        background: '#030306',
        surface: '#08080f',
        'surface-raised': '#0e0e18',
        foreground: '#eaeaf2',
        muted: {
          DEFAULT: '#0c0c14',
          foreground: '#7a7a94',
        },
        accent: {
          DEFAULT: '#00ffaa',
          dim: '#00c988',
          muted: '#00ffaa33',
          foreground: '#030306',
        },
        primary: {
          DEFAULT: '#00ffaa',
          foreground: '#030306',
        },
        destructive: {
          DEFAULT: '#ff4d6d',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#fbbf24',
          foreground: '#030306',
        },
        success: {
          DEFAULT: '#00ffaa',
          foreground: '#030306',
        },
        console: {
          panel: '#0a0a12',
          hud: '#06060c',
          glow: '#00ffaa',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      boxShadow: {
        glow: '0 0 24px rgba(0, 255, 170, 0.12)',
        'glow-sm': '0 0 12px rgba(0, 255, 170, 0.08)',
        panel: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      backgroundImage: {
        'console-grid':
          'linear-gradient(rgba(0,255,170,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,170,0.035) 1px, transparent 1px)',
        'console-vignette':
          'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,255,170,0.06), transparent 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        scan: 'scan 8s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};
