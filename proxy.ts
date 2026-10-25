import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })

          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value)
          })
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null
  const isLoginRoute = request.nextUrl.pathname === '/login'

  if (!claims && !isLoginRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (claims && isLoginRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
