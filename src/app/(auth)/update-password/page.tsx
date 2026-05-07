"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, AlertCircle, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    // Check if user has a valid session (came from reset email link)
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError("Your reset link has expired or is invalid. This can happen if you opened the link in a different browser. Please request a new password reset.")
        return
      }
      
      setValidSession(true)
    }
    
    checkSession()
  }, [])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        console.error('Update password error:', error)
        const friendlyMessage = error.message.includes('session')
          ? "Your session has expired. Please request a new password reset link."
          : error.message.includes('weak')
          ? "Please choose a stronger password with at least 6 characters."
          : "Unable to update password. Please try again or request a new reset link."
        setError(friendlyMessage)
        setLoading(false)
        return
      }

      setSuccess(true)
      
      // Redirect to dashboard after successful password update
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 2000)
    } catch (err: any) {
      console.error('Update password exception:', err)
      setError(err.message || "Failed to update password. Please try again.")
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
            <h1 className="text-3xl font-bold tracking-tight mb-2">Update password</h1>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          {!validSession && error ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 text-sm bg-destructive/10 border border-destructive/30 p-4 rounded-xl">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-destructive mb-1">
                    Invalid Reset Link
                  </p>
                  <p className="text-muted-foreground">
                    {error}
                  </p>
                </div>
              </div>

              <Link href="/reset-password">
                <Button className="w-full">
                  Request new reset link
                </Button>
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 text-sm bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                    Password updated successfully!
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    Redirecting to your dashboard...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || !validSession}
                  className="h-11"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading || !validSession}
                  className="h-11"
                  autoComplete="new-password"
                />
              </div>

              {error && validSession && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 p-4 rounded-xl">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20" 
                disabled={loading || !validSession}
              >
                {loading ? "Updating password..." : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
