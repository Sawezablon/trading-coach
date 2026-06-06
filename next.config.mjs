/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  outputFileTracingIncludes: {
    "/api/mt5/ea": ["./mt5/QyvexEdgeSyncEA.mq5"],
  },
};

export default nextConfig;
