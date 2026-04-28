import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  allowedDevOrigins: [
    '.space-z.ai',
    'preview-chat-a1a1eed2-64ed-457a-93f6-eecb7e80c07d.space-z.ai',
    'localhost:81',
  ],
};

export default nextConfig;
