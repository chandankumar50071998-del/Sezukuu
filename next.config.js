/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // Telegram webhook ke liye bodyParser disable karna zaruri hai
  api: {
    bodyParser: false,
  },

  // Vercel optimization
  swcMinify: true,

  // Future safe options
  experimental: {
    optimizePackageImports: ["mongoose"],
  }
};

module.exports = nextConfig;
