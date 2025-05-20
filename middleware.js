import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const path = req.nextUrl.pathname;
  
  // Define public paths that don't require authentication
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/verify',
    '/verify-email', // Add verify-email path
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/auth/callback',
    '/api/register',
    '/api/verify',
    '/api/verify-email', // Add the verify-email API route
    '/api/resend-verification',
    '/manifest.json',
    '/favicon.ico'
  ];
  
  // Check if the path is public (no auth required)
  const isPublicPath = publicPaths.some(pubPath => 
    path === pubPath || 
    path.startsWith('/verify/') || 
    path.startsWith('/_next/') ||
    path.startsWith('/verify-email')  // Also check for paths starting with /verify-email
  );
  
  // Allow API routes that should be accessible without auth
  if (path.startsWith('/api/') && 
      !path.startsWith('/api/user/') && 
      !path.startsWith('/api/dashboard/')) {
    return NextResponse.next();
  }
  
  // Check if the user is authenticated
  const token = await getToken({ req });
  const isAuthenticated = !!token;
  
  // If the path is public, no need to redirect
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // If the user is not authenticated and the path is not public, redirect to login
  if (!isAuthenticated) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url));
  }
  
  // Check if user is verified for protected routes
  if (isAuthenticated && !token.verified && 
      !publicPaths.includes(path) && 
      !path.startsWith('/verify-email')) {
    // If user is logged in but not verified, redirect to a specific page
    return NextResponse.redirect(new URL('/', req.url));
  }
  
  // User is authenticated, allow access to protected routes
  return NextResponse.next();
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api/auth/* (authentication routes)
     * 2. /_next/* (Next.js internals)
     * 3. /static/* (static files)
     * 4. /images/* (image files)
     * 5. /favicon.ico, /robots.txt (common root files)
     */
    '/((?!_next/|static/|images/|favicon\\.ico|robots\\.txt).*)',
  ],
};