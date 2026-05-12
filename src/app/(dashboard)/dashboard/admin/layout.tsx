import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import AdminNav from "@/components/admin/admin-nav"

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      redirect("/login?redirect=/dashboard/admin")
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      // Non-admin users get redirected to regular dashboard
      redirect("/dashboard")
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background">
        <AdminNav user={user} />
        <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-10">
          {children}
        </main>
      </div>
    )
  } catch (error) {
    console.error('Admin layout error:', error)
    redirect("/dashboard")
  }
}
