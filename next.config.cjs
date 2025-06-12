/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't include server-only modules in client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        os: false,
        path: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        util: false,
        assert: false,
        url: false,
        net: false,
        tls: false,
        child_process: false,
        'gcp-metadata': false,
      }
    }
    return config
  },
}

module.exports = nextConfig 