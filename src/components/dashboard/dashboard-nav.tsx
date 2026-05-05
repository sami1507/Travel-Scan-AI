"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Brain, LayoutDashboard, Database, Bell, Activity, LogOut, TrendingUp, Compass, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface DashboardNavProps {
  user: any
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/analysis", label: "Analysis", icon: Compass },
    { href: "/dashboard/saved", label: "Saved", icon: Activity },
    { href: "/dashboard/profile", label: "Profile", icon: User },
    { href: "/dashboard/intelligence", label: "Intelligence", icon: Brain },
    { href: "/dashboard/opportunities", label: "Opportunities", icon: TrendingUp },
    { href: "/dashboard/sources", label: "Sources", icon: Database },
    { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8 lg:gap-10">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">TravelScan</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
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
