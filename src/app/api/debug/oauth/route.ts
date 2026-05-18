import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin
  
  return NextResponse.json({
    baseUrl,
    callbackUrl: `${baseUrl}/api/auth/callback/google`,
    signInUrl: `${baseUrl}/api/auth/signin/google`,
    info: "Estas URLs deben estar configuradas en Google Cloud Console"
  })
}
