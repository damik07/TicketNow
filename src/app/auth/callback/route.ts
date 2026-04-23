import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Handle Google OAuth callback
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth_error', request.url))
  }

  if (code) {
    // Process the OAuth callback
    // This would typically involve exchanging the code for tokens
    // and then redirecting to the appropriate page
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.redirect(new URL('/login', request.url))
}
