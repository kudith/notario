/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
      };
    }
    
    // Ignore canvas module untuk client-side
    config.externals = config.externals || [];
    config.externals.push({
      canvas: 'canvas',
    });
    
    return config;
  },
};

export default nextConfig;