import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base brand colors can be customized here
        brand: {
          primary: '#0052FF',
          secondary: '#1a1a3e',
        },
      },
    },
  },
  plugins: [],
};

export default config;
