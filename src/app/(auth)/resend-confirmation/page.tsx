"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, AlertCircle, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function ResendConfirmationPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleResendConfirmation = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('Resend confirmation error:', error)
        setError(error.message || "Failed to resend confirmation email. Please try again.")
        setLoading(false)
        return
      }

      setSuccess(true)
      setEmail("")
    } catch (err: any) {
      console.error('Resend confirmation exception:', err)
      setError(err.message || "Failed to resend confirmation email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">TravelScan</span>
        </Link>

        <div className="bg-card border rounded-2xl p-8 shadow-xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Resend confirmation</h1>
            <p className="text-muted-foreground">
              Enter your email to receive a new confirmation link
            </p>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 text-sm bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                    Confirmation email sent!
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    Check your email for a new confirmation link. If it doesn&apos;t appear within a few minutes, check your spam folder.
                  </p>
                </div>
              </div>

              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResendConfirmation} className="space-y-5">
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

              <Button type="submit" className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? "Sending..." : "Resend confirmation email"}
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
