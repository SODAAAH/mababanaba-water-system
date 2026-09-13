/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./public/index.html",
    "./public/404.html",
    "./public/offline.html",
    "./public/js/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
  safelist: [
    'opacity-0',
    'opacity-80',
    'opacity-100',
    'cursor-not-allowed',
    'hidden',
    'flex',
    'fixed',
    'inset-0',
    'z-[100]',
    'z-[110]',
    // Loyalty tiers gradients & colors
    'from-cyan-500', 'to-blue-600', 'text-cyan-600', 'bg-cyan-100', 'text-cyan-800', 'border-cyan-300',
    'from-slate-700', 'to-slate-900', 'text-slate-700', 'bg-slate-100', 'text-slate-800', 'border-slate-400',
    'from-amber-400', 'to-yellow-600', 'text-amber-600', 'bg-amber-100', 'text-amber-900', 'border-amber-300',
    'from-slate-400', 'to-slate-600', 'text-slate-600', 'bg-slate-100', 'text-slate-700', 'border-slate-300',
    'from-amber-600', 'to-amber-800', 'text-amber-700', 'bg-amber-50', 'text-amber-900', 'border-amber-200',
    'from-blue-500', 'to-blue-600', 'text-blue-600', 'bg-blue-50', 'text-blue-700', 'border-blue-200'
  ]
};
