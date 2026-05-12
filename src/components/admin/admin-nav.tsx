"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Brain, 
  LayoutDashboard, 
  LogOut, 
  BarChart3, 
  Activity, 
  Gauge, 
  Target,
  MessageSquare,
  Lightbulb,
  ShieldCheck
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface AdminNavProps {
  user: any
}

export default function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const handleBackToDashboard = () => {
    router.push("/dashboard")
  }

  const adminNavItems = [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/operations", label: "Operations", icon: Activity },
    { href: "/dashboard/admin/ml-monitoring", label: "ML Monitoring", icon: Gauge },
    { href: "/dashboard/admin/quality", label: "Quality", icon: Target },
    { href: "/dashboard/admin/feedback-intelligence", label: "Feedback", icon: MessageSquare },
    { href: "/dashboard/admin/intelligence-signals", label: "Signals", icon: Lightbulb },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8 lg:gap-10">
            <Link href="/dashboard/admin" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">Admin Console</span>
                <Badge variant="destructive" className="text-xs">Admin</Badge>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {adminNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-2 h-9 px-3 font-medium transition-all",
                        isActive && "bg-secondary shadow-sm"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{item.label}</span>
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBackToDashboard}
              className="h-9 font-medium"
            >
              <Brain className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline text-sm">User Dashboard</span>
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[200px] font-medium">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="h-9 font-medium">
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline text-sm">Sign out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
