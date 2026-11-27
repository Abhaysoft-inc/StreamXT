import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PROTECTED_PREFIXES = ['/dashboard', '/stream', '/auth/complete-profile'];
const AUTH_PAGES = ['/auth/signin', '/auth/signup'];

const ACCESS_COOKIE_NAME = 'streamxt_access';
const REFRESH_COOKIE_NAME = 'streamxt_refresh';

function isProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAuthPage(pathname) {
  return AUTH_PAGES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

async function hasValidAccessToken(token) {
  if (!token) return false;
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;
  const accessToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

  const isAuthenticated = await hasValidAccessToken(accessToken);

  if (isProtectedPath(pathname)) {
    if (isAuthenticated) {
      return NextResponse.next();
    }

    const redirectTarget = `${pathname}${search}`;
    if (refreshToken) {
      const refreshUrl = new URL('/api/v1/auth/refresh-redirect', req.url);
      refreshUrl.searchParams.set('redirect', redirectTarget);
      return NextResponse.redirect(refreshUrl);
    }

    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('redirect', redirectTarget);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthPage(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
