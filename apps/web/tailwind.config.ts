import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark default (PLAN.md §4): background #080D19, aksen #246BFD.
        background: "#080D19",
        accent: "#246BFD",
      },
    },
  },
  plugins: [],
} satisfies Config;
