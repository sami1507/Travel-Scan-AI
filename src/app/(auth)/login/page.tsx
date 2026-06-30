"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Plane, Shield, Zap, CheckCircle2, AlertCircle, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// User-friendly error messages
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
  'Email not confirmed': 'Please confirm your email address before signing in.',
  'User not found': 'No account found with this email address.',
  'Invalid email': 'Please enter a valid email address.',
  'Password is too short': 'Password must be at least 6 characters.',
  'Email rate limit exceeded': 'Too many attempts. Please wait a few minutes and try again.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
  }, [searchParams])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")

    try {
      const supabase = createClient(true)
      
      // Build redirect URL with preserved redirect parameter
      const nextParam = searchParams.get('redirect')
      const redirectTo = nextParam 
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`
        : `${window.location.origin}/auth/callback`
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        console.error('Google sign-in error:', error)
        setError("Unable to sign in with Google. Please try again or use email/password.")
        setLoading(false)
        return
      }

      // OAuth redirect happens automatically - no need to set loading to false
    } catch (err: any) {
      console.error('Google sign-in exception:', err)
      setError("Unable to sign in with Google. Please try again.")
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!email || !password) {
      setError("Please enter your email and password")
      setLoading(false)
      return
    }

    try {
      const supabase = createClient(rememberMe)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error)
        // Use friendly error messages
        const friendlyMessage = Object.entries(AUTH_ERROR_MESSAGES).find(([key]) => 
          error.message.includes(key)
        )?.[1] || "Unable to sign in. Please check your credentials and try again."
        
        setError(friendlyMessage)
        setLoading(false)
        return
      }

      if (data?.session) {
        const redirectTo = searchParams.get('redirect') || '/dashboard'
        router.push(redirectTo)
        router.refresh()
      } else {
        setError("Failed to sign in. Please try again.")
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Login exception:', err)
      setError(err.message || "Failed to sign in. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8 lg:p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-3 mb-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl shadow-lg shadow-orange-200" style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}>
              <Plane className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">TravelScan</span>
          </Link>

          <div className="mb-10 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-base text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Link href="/reset-password" className="text-sm text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={loading}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer select-none"
              >
                Remember me
              </Label>
            </div>

            {error && error.trim() && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 p-4 rounded-xl">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span>{error}</span>
                  {error.includes("Didn't receive the email") && (
                    <Link href="/resend-confirmation" className="block mt-2 text-primary hover:underline font-medium">
                      Resend confirmation email →
                    </Link>
                  )}
                </div>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full font-semibold border-0 text-white shadow-lg shadow-orange-200" style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full font-medium"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">Don&apos;t have an account? </span>
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-[hsl(199,89%,68%)]/10 via-[hsl(22,100%,62%)]/5 to-background border-l">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold mb-6">AI-powered travel intelligence</h2>
          <p className="text-lg text-muted-foreground mb-12">
            Join thousands of travelers who never miss an opportunity with smart monitoring and alerts.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0" style={{ background: 'hsl(199,89%,68%,0.15)' }}>
                <Zap className="h-6 w-6" style={{ color: 'hsl(199,60%,35%)' }} />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Real-time monitoring</h3>
                <p className="text-sm text-muted-foreground">Track flights, hotels, and weather conditions 24/7</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0" style={{ background: 'hsl(199,89%,68%,0.15)' }}>
                <Shield className="h-6 w-6" style={{ color: 'hsl(199,60%,35%)' }} />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Secure & private</h3>
                <p className="text-sm text-muted-foreground">Your data is encrypted and never shared</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0" style={{ background: 'hsl(199,89%,68%,0.15)' }}>
                <CheckCircle2 className="h-6 w-6" style={{ color: 'hsl(199,60%,35%)' }} />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Smart alerts</h3>
                <p className="text-sm text-muted-foreground">Get notified when it matters most</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2">
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
