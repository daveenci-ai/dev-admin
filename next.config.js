/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic configuration for stable builds
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

module.exports = nextConfig 