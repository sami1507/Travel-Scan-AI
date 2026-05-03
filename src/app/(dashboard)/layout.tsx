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

    return (
      <div className="min-h-screen">
        <DashboardNav user={user} />
        <main className="container mx-auto px-4 lg:px-8 py-6 lg:py-8">
          {children}
        </main>
      </div>
    )
  } catch (error) {
    console.error('Dashboard layout error:', error)
    redirect("/login")
  }
}
