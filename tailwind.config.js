/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        singer: {
          DEFAULT: '#d6073b',
          dark: '#ad1e31',
          light: '#e7334a',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disabling preflight to prevent Tailwind from overriding Ant Design styles completely
  }
}
