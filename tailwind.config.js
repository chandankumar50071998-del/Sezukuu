/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        dark: {
          900: "#0B0F19",
          800: "#111827",
          700: "#1F2937",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.25)",
      },
      backgroundImage: {
        "gradient-r":
          "linear-gradient(to right, var(--tw-gradient-stops))",
      }
    },
  },
  plugins: [],
};
