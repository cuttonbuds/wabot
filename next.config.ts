import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network IP access during development
  allowedDevOrigins: ["192.168.1.2", "localhost", "127.0.0.1"],
};

export default nextConfig;

