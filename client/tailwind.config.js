/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: '#F4F7FB',
        card: '#FFFFFF',
        'card-border': '#E3E9F2',
        heading: '#0F172A',
        body: '#475569',
        muted: '#94A3B8',
        aicte: {
          navy: '#0B2545',
          'navy-mid': '#13438C',
          'navy-light': '#1D6FD1',
          saffron: '#F59E0B',
          'saffron-orange': '#F97316',
        },
        status: {
          pending: '#F59E0B',
          process: '#2563EB',
          disposed: '#16A34A',
          transferred: '#7C3AED',
          escalated: '#DC2626',
        }
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #0B2545 0%, #13438C 55%, #1D6FD1 100%)',
        'primary-gradient-sidebar': 'linear-gradient(180deg, #07172B 0%, #0B2545 50%, #10325E 100%)',
        'saffron-gradient': 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
        'hero-gradient': 'linear-gradient(135deg, #0B2545 0%, #11386E 55%, #1D6FD1 100%)',
        'card-gradient': 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%)',
      },
      borderRadius: {
        'card': '12px',
        'xl': '12px',
        '2xl': '16px',
      },
      boxShadow: {
        'card': '0 4px 16px rgba(11, 37, 69, 0.06)',
        'card-hover': '0 8px 24px rgba(11, 37, 69, 0.10)',
        'drawer': '-8px 0 32px rgba(11, 37, 69, 0.15)',
        'saffron-sm': '0 2px 8px rgba(245, 158, 11, 0.25)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': '0.6875rem', // 11px
        '3xs': '0.625rem',  // 10px
      }
    },
  },
  plugins: [],
}
