/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Для production (Vercel) убираем локальные IP адреса
  ...(process.env.NODE_ENV === 'development' && {
    // Разрешаем доступ с других устройств в сети только в development
    allowedDevOrigins: [
      'http://192.168.56.1:3000',
      'http://192.168.56.1',
      'http://192.168.1.91:3000',
      'http://192.168.1.91',
      'http://172.30.224.1:3000',
      'http://172.30.224.1',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
  }),
}

export default nextConfig
