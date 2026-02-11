import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/contexts/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: "#FF6B35",
                    light: "#FF8C61",
                    dark: "#E55A2B",
                },
            },
            fontFamily: {
                sans: [
                    "Inter",
                    "-apple-system",
                    "BlinkMacSystemFont",
                    "Segoe UI",
                    "Roboto",
                    "Oxygen",
                    "Ubuntu",
                    "Cantarell",
                    "Fira Sans",
                    "Droid Sans",
                    "Helvetica Neue",
                    "sans-serif",
                ],
                manager: [
                    "Plus Jakarta Sans",
                    "Inter",
                    "-apple-system",
                    "BlinkMacSystemFont",
                    "Segoe UI",
                    "Roboto",
                    "Helvetica Neue",
                    "sans-serif",
                ],
                serif: ["Cormorant Garamond", "serif"],
            },
            fontSize: {
                xs: [
                    "12px",
                    {
                        lineHeight: "1.5",
                        letterSpacing: "-0.008em",
                        fontWeight: "400",
                    },
                ],
                sm: [
                    "14px",
                    {
                        lineHeight: "1.5",
                        letterSpacing: "-0.011em",
                        fontWeight: "400",
                    },
                ],
                base: [
                    "14px",
                    {
                        lineHeight: "1.5",
                        letterSpacing: "-0.011em",
                        fontWeight: "400",
                    },
                ],
                lg: [
                    "16px",
                    {
                        lineHeight: "1.5",
                        letterSpacing: "-0.012em",
                        fontWeight: "400",
                    },
                ],
                xl: [
                    "18px",
                    {
                        lineHeight: "1.45",
                        letterSpacing: "-0.015em",
                        fontWeight: "600",
                    },
                ],
                "2xl": [
                    "20px",
                    {
                        lineHeight: "1.4",
                        letterSpacing: "-0.018em",
                        fontWeight: "600",
                    },
                ],
                "3xl": [
                    "24px",
                    {
                        lineHeight: "1.35",
                        letterSpacing: "-0.02em",
                        fontWeight: "600",
                    },
                ],
                "4xl": [
                    "28px",
                    {
                        lineHeight: "1.3",
                        letterSpacing: "-0.022em",
                        fontWeight: "600",
                    },
                ],
                label: [
                    "12px",
                    {
                        lineHeight: "1.5",
                        letterSpacing: "-0.008em",
                        fontWeight: "500",
                    },
                ],
                caption: [
                    "11px",
                    {
                        lineHeight: "1.4",
                        letterSpacing: "-0.006em",
                        fontWeight: "400",
                    },
                ],
            },
            fontWeight: {
                light: "300",
                normal: "400",
                medium: "500",
                semibold: "600",
                bold: "700",
            },
        },
    },
    plugins: [],
};

export default config;
