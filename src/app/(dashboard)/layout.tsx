import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import DashboardNav from "@/components/dashboard/dashboard-nav"

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      redirect("/login")
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background">
        <DashboardNav user={user} isAdmin={isAdmin} />
        <main className="container mx-auto px-4 lg:px-8 py-8 pb-24 lg:pb-10 lg:py-10">
          {children}
        </main>
      </div>
    )
  } catch (error) {
    console.error('Dashboard layout error:', error)
    redirect("/login")
  }
}
