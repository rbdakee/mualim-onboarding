import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // В режиме разработки разрешаем все cross-origin запросы
  if (process.env.NODE_ENV === 'development') {
    const origin = request.headers.get('origin')
    
    // Разрешаем запросы с любых локальных IP-адресов
    if (origin) {
      const url = new URL(origin)
      const hostname = url.hostname
      
      // Разрешаем localhost, 127.0.0.1 и все локальные IP-адреса (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      const isLocalNetwork = 
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') ||
        hostname.startsWith('172.19.') ||
        hostname.startsWith('172.20.') ||
        hostname.startsWith('172.21.') ||
        hostname.startsWith('172.22.') ||
        hostname.startsWith('172.23.') ||
        hostname.startsWith('172.24.') ||
        hostname.startsWith('172.25.') ||
        hostname.startsWith('172.26.') ||
        hostname.startsWith('172.27.') ||
        hostname.startsWith('172.28.') ||
        hostname.startsWith('172.29.') ||
        hostname.startsWith('172.30.') ||
        hostname.startsWith('172.31.')
      
      if (isLocalNetwork) {
        const response = NextResponse.next()
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        return response
      }
    }
    
    // Для OPTIONS запросов (preflight)
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin)
      }
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      return response
    }
  }
  
  return NextResponse.next()
}

export const config = {
  // Применяем ко всем запросам, включая статические ресурсы
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/_next/:path*',
  ],
}

