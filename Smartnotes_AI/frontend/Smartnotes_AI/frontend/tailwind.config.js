/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#8B5CF6", // vibrant purple
                secondary: "#EC4899", // pink
                tertiary: "#F97316", // orange
                background: "#F8FAFC", // light gray/slate base
                surface: "#FFFFFF", // white panel
                success: "#10B981",
                warning: "#F59E0B",
                error: "#EF4444",
                lavender: "#E0E7FF",
                skyBlue: "#E0F2FE",
                peach: "#FFEDD5",
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.6s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'gradient-x': 'gradient-x 15s ease infinite',
                'gradient-y': 'gradient-y 15s ease infinite',
                'gradient-xy': 'gradient-xy 15s ease infinite',
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fire-pulse': 'fire-pulse 1.5s ease-in-out infinite alternate',
                'blob': 'blob 7s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'gradient-y': {
                    '0%, 100%': {
                        'background-size': '400% 400%',
                        'background-position': 'center top'
                    },
                    '50%': {
                        'background-size': '200% 200%',
                        'background-position': 'center center'
                    }
                },
                'gradient-x': {
                    '0%, 100%': {
                        'background-size': '200% 200%',
                        'background-position': 'left center'
                    },
                    '50%': {
                        'background-size': '200% 200%',
                        'background-position': 'right center'
                    }
                },
                'gradient-xy': {
                    '0%, 100%': {
                        'background-size': '400% 400%',
                        'background-position': 'left center'
                    },
                    '50%': {
                        'background-size': '200% 200%',
                        'background-position': 'right center'
                    }
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
                    '50%': { opacity: '.8', filter: 'brightness(1.2)' },
                },
                'fire-pulse': {
                    '0%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 2px #f97316)' },
                    '100%': { transform: 'scale(1.1)', filter: 'drop-shadow(0 0 8px #ef4444)' }
                },
                blob: {
                    "0%": {
                        transform: "translate(0px, 0px) scale(1)"
                    },
                    "33%": {
                        transform: "translate(30px, -50px) scale(1.1)"
                    },
                    "66%": {
                        transform: "translate(-20px, 20px) scale(0.9)"
                    },
                    "100%": {
                        transform: "translate(0px, 0px) scale(1)"
                    }
                }
            }
        },
    },
    plugins: [],
}
