// zecrete/tailwind.config.cjs

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./app/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        zecrete: {
          bg: "#0b0f16",
          panel: "rgba(255,255,255,0.04)",
          neon: "#06b6d4",
          gold: "#fbbf24",
          purple: "#8b5cf6"
        }
      },
      boxShadow: {
        neon: "0 8px 30px -8px rgba(6,182,212,0.35)"
      }
    }
  },
  plugins: []
};
