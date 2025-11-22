// tailwind.config.js
// Place this file in the ROOT of your project (same level as package.json)

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class", // CRITICAL: This enables dark mode!
  theme: {
    extend: {},
  },
  plugins: [],
};