/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'express',
    'midi-writer-js',
    'wav',
    'mpg123-decoder',
  ],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

export default nextConfig;
