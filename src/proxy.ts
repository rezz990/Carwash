import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginPage = pathname.startsWith('/login')
  const isAuthPage = pathname.startsWith('/auth')
  
  if (!user && !isLoginPage && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Fetch user profile untuk role & status aktif
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, aktif')
      .eq('id', user.id)
      .single()

    // User yang dinonaktifkan admin harus langsung ke-logout & tidak bisa
    // akses halaman manapun, walau session/cookie-nya masih valid
    if (profile && profile.aktif === false) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'akun_nonaktif')
      return NextResponse.redirect(url)
    }

    const role = profile?.role || 'kasir'

    // If user is already logged in, redirect them away from /login
    if (isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = role === 'admin' ? '/admin' : '/'
      return NextResponse.redirect(url)
    }

    // Protect /admin routes for 'kasir' role
    if (pathname.startsWith('/admin') && role === 'kasir') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}