import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@react-pdf/renderer", "pino", "pino-pretty"],
};

export default nextConfig;
