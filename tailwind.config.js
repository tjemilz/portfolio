js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-tinos)', 'Georgia', 'serif'],
      },
      colors: {
        'background': '#fcfcfc',
        'foreground': '#272932',
        'space-indigo': '#25283d',
        'shadow-grey': '#272932',
        'slate-grey': '#6d8a96',
        'ruby-red': '#a4031f',
        'accent': '#a4031f',
        'accent-hover': '#8a0219',
      },
    },
  },
  plugins: [],
}