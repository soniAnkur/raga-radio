/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'express',
    'midi-writer-js',
    'wav',
    'mpg123-decoder',
    '@modelcontextprotocol/sdk',
  ],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version' },
        ],
      },
    ];
  },
};

export default nextConfig;
