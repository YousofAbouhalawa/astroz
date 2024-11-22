import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],

  theme: {
    extend: {
      colors: {
        accent: '#e3dede'
      }
    }
  },

  plugins: [typography]
} satisfies Config;
