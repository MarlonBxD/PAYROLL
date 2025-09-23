"use client"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Calculator, FileText, Settings, LogOut, Building2 } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Empleados",
    href: "/dashboard/employees",
    icon: Users,
  },
  {
    title: "Nómina",
    href: "/dashboard/payroll",
    icon: Calculator,
  },
  {
    title: "Reportes",
    href: "/dashboard/reports",
    icon: FileText,
  },
  {
    title: "Configuración",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="pb-12 w-64 border-r bg-card">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center mb-6">
            <Building2 className="h-6 w-6 mr-2" />
            <h2 className="text-lg font-semibold">Sistema Nómina</h2>
          </div>
          <div className="space-y-1">
            <nav className="grid items-start gap-2">
              {sidebarNavItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <Button
                    key={index}
                    asChild
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Link href={item.href}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Link>
                  </Button>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
