"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Brain, Bell, LogOut, TrendingUp, Compass, User, Bookmark, BarChart2, ShieldCheck, Plane } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface DashboardNavProps {
  user: any
  isAdmin?: boolean
}

const primaryNav = [
  { href: "/dashboard/analysis", label: "Analysis", icon: Plane },
  { href: "/dashboard/saved", label: "Saved Trips", icon: Bookmark },
  { href: "/dashboard/profile", label: "Profile", icon: User },
]

const secondaryNav = [
  { href: "/dashboard/intelligence", label: "Intelligence", icon: BarChart2 },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: TrendingUp },
]

export default function DashboardNav({ user, isAdmin = false }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <>
      {/* ── Top header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            {/* Left: logo + nav */}
            <div className="flex items-center gap-6 lg:gap-8">
              <Link href="/dashboard/analysis" className="flex items-center gap-2.5 shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/20">
                  <Brain className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-base hidden sm:inline">TravelScan</span>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-0.5">
                {/* Primary items */}
                {primaryNav.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "gap-2 h-9 px-3 font-medium transition-all duration-150",
                          active
                            ? "bg-secondary text-secondary-foreground opacity-100 shadow-sm"
                            : "opacity-80 hover:opacity-100 hover:bg-accent"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="text-sm">{item.label}</span>
                      </Button>
                    </Link>
                  )
                })}

                {/* Divider */}
                <span className="mx-1.5 h-5 w-px bg-border/60" aria-hidden />

                {/* Secondary items */}
                {secondaryNav.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "gap-1.5 h-8 px-2.5 transition-all duration-150",
                          active
                            ? "bg-secondary text-secondary-foreground opacity-100 shadow-sm font-medium"
                            : "opacity-60 hover:opacity-80 hover:bg-accent font-normal"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs">{item.label}</span>
                      </Button>
                    </Link>
                  )
                })}

                {/* Admin link — only if isAdmin */}
                {isAdmin && (
                  <Link href="/dashboard/admin">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-1.5 h-8 px-2.5 transition-all duration-150",
                        isActive("/dashboard/admin")
                          ? "bg-secondary text-secondary-foreground opacity-100 shadow-sm font-medium"
                          : "opacity-60 hover:opacity-80 hover:bg-accent font-normal"
                      )}
                    >
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs">Admin</span>
                    </Button>
                  </Link>
                )}
              </nav>
            </div>

            {/* Right: email + sign out */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden lg:inline truncate max-w-[180px]">
                {user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="h-9 gap-1.5 opacity-70 hover:opacity-100">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile bottom nav (primary only) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="flex items-stretch h-16">
          {primaryNav.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-all duration-150",
                  active
                    ? "text-primary opacity-100"
                    : "text-muted-foreground opacity-70 hover:opacity-90"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                  active ? "bg-primary/10" : ""
                )}>
                  <Icon className={cn("h-5 w-5", active ? "text-primary" : "")} />
                </div>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
