import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/layout/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16a085", // bg-primary
          border: "#11816b", // border-primary-border
          hover: "#0c6453", // hover:bg-primary-hover
          text: "#134e4a",
        },
        secondary: "#FBBF24", // Example secondary color
        accent: "#EF4444", // Example accent color
        background: "#F0F0F0", // Example background color
        white: {
          light: "#f0fdfa",
          DEFAULT: "#ffffff",
          dark: "#d1d5db",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Merriweather", "serif"],
      },
      boxShadow: {
        "custom-light": "0 2px 10px rgba(0, 0, 0, 0.1)",
        "custom-dark": "0 2px 10px rgba(0, 0, 0, 0.3)",
      },
      height: {
        "header-height": "70px",
      },
      margin: {
        "header-height": "70px",
      },
    },
  },
  plugins: [
    //@ts-ignore
    function ({ addVariant }) {
      addVariant("child", "& > *");
      addVariant("child-hover", "& > *:hover");
    },
  ],
};
export default config;
