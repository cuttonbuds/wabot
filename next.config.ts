import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit .next/standalone with a self-contained server.js for the Dockerfile.
  output: "standalone",
  // Allow local network IP access during development
  allowedDevOrigins: ["192.168.1.2", "localhost", "127.0.0.1"],
};

export default nextConfig;
