export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          400: '#2DD4BF',
          500: '#0EA5A4',
          600: '#0891B2',
          700: '#0F766E',
        },
      },
      boxShadow: {
        card: '0 2px 12px rgba(15,23,42,0.04)',
        'card-hover': '0 8px 24px rgba(15,23,42,0.08)',
        brand: '0 4px 14px rgba(14,165,164,0.25)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
