"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plane, AlertCircle, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    if (!email) {
      setError("Please enter your email address")
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      })

      if (error) {
        console.error('Reset password error:', error)
        setError(error.message || "Failed to send reset email. Please try again.")
        setLoading(false)
        return
      }

      setSuccess(true)
      setEmail("")
    } catch (err: any) {
      console.error('Reset password exception:', err)
      setError(err.message || "Failed to send reset email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-[hsl(22,100%,62%)]/5 via-background to-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-8 relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg shadow-orange-200" style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}>
            <Plane className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">TravelScan</span>
        </Link>

        <div className="bg-card border rounded-2xl p-8 shadow-xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Reset password</h1>
            <p className="text-muted-foreground">
              Enter your email and we&apos;ll send you a link to reset your password
            </p>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 text-sm bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Reset link sent!
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    Check your email for a link to reset your password. If it doesn&apos;t appear within a few minutes, check your spam folder.
                  </p>
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-900">
                    <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                      Important for mobile users:
                    </p>
                    <p className="text-green-700 dark:text-green-300 text-xs">
                      Open the reset link in the same browser where you&apos;ll update your password. If you&apos;re on mobile, tap &quot;Open in browser&quot; when clicking the email link.
                    </p>
                  </div>
                </div>
              </div>

              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                  autoComplete="email"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 p-4 rounded-xl">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base font-semibold border-0 text-white shadow-lg shadow-orange-200" style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }} disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>

              <Link href="/login">
                <Button variant="ghost" className="w-full">
                  Back to sign in
                </Button>
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
