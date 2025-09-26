import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, FileText, Calculator, Settings, TrendingUp, DollarSign, Calendar, Building2 } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile and company info
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      companies (*)
    `)
    .eq("id", data.user.id)
    .single()

  // Get employee count
  const { count: employeeCount } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile?.company_id)

  const { count: activeEmployeeCount } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile?.company_id)
    .eq("status", "ACTIVO")

  // Get payroll periods count
  const { count: payrollCount } = await supabase
    .from("payroll_periods")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile?.company_id)

  // Get recent payroll periods with totals
  const { data: recentPeriods } = await supabase
    .from("payroll_periods")
    .select(`
      *,
      payroll_summary (
        total_earned,
        total_deductions,
        net_pay
      )
    `)
    .eq("company_id", profile?.company_id)
    .order("period_number", { ascending: false })
    .limit(3)

  // Calculate current month total
  const currentMonthTotal =
    recentPeriods?.[0]?.payroll_summary.reduce((acc: number, summary: any) => acc + (summary.net_pay || 0), 0) || 0

  // Calculate YTD total
  const currentYear = new Date().getFullYear()
  const ytdTotal =
    recentPeriods
      ?.filter((period) => new Date(period.start_date).getFullYear() === currentYear)
      .reduce((acc, period) => {
        const periodTotal = period.payroll_summary.reduce(
          (sum: number, summary: any) => sum + (summary.net_pay || 0),
          0,
        )
        return acc + periodTotal
      }, 0) || 0

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Bienvenido al sistema de control de nómina</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/dashboard/employees/new">
              <Users className="mr-2 h-4 w-4" />
              Nuevo Empleado
            </Link>
          </Button>
        </div>
      </div>

      {profile?.companies ? (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6" />
              <div>
                <CardTitle>{profile.companies.name}</CardTitle>
                <CardDescription>
                  NIT: {profile.companies.nit} | Administrador: {profile.full_name}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">Configuración Requerida</CardTitle>
            <CardDescription className="text-orange-700">
              Necesitas configurar tu empresa antes de continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/settings">Configurar Empresa</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployeeCount || 0}</div>
            <p className="text-xs text-muted-foreground">de {employeeCount || 0} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nómina Actual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentMonthTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">último período procesado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Año</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${ytdTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">pagado en {new Date().getFullYear()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Períodos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollCount || 0}</div>
            <p className="text-xs text-muted-foreground">períodos creados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Funciones principales del sistema</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="grid gap-4 md:grid-cols-2">
              <Button asChild variant="outline" className="justify-start h-12 bg-transparent">
                <Link href="/dashboard/employees">
                  <Users className="mr-2 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Gestionar Empleados</div>
                    <div className="text-xs text-muted-foreground">Agregar, editar empleados</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-12 bg-transparent">
                <Link href="/dashboard/payroll">
                  <Calculator className="mr-2 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Procesar Nómina</div>
                    <div className="text-xs text-muted-foreground">Calcular y enviar desprendibles</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-12 bg-transparent">
                <Link href="/dashboard/reports">
                  <FileText className="mr-2 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Ver Reportes</div>
                    <div className="text-xs text-muted-foreground">Análisis y estadísticas</div>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-12 bg-transparent">
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Configuración</div>
                    <div className="text-xs text-muted-foreground">Datos de empresa</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Períodos Recientes</CardTitle>
            <CardDescription>Últimos períodos de nómina procesados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPeriods && recentPeriods.length > 0 ? (
                recentPeriods.map((period) => {
                  const periodTotal = period.payroll_summary.reduce(
                    (acc: number, summary: any) => acc + (summary.net_pay || 0),
                    0,
                  )
                  const employeeCount = period.payroll_summary.length

                  return (
                    <div key={period.id} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">Período #{period.period_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {employeeCount} empleados - ${periodTotal.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(period.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No hay períodos procesados</p>
                  <Button asChild size="sm">
                    <Link href="/dashboard/payroll/new">Crear Período</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Empleados procesados</span>
                <span className="text-sm font-medium">{recentPeriods?.[0]?.payroll_summary.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total pagado</span>
                <span className="text-sm font-medium">${currentMonthTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Promedio por empleado</span>
                <span className="text-sm font-medium">
                  $
                  {recentPeriods?.[0]?.payroll_summary.length > 0
                    ? Math.round(currentMonthTotal / recentPeriods[0].payroll_summary.length).toLocaleString()
                    : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Base de datos</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium">Activa</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Configuración</span>
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 ${profile?.companies ? "bg-green-500" : "bg-orange-500"} rounded-full mr-2`}
                  ></div>
                  <span className="text-sm font-medium">{profile?.companies ? "Completa" : "Pendiente"}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Último acceso</span>
                <span className="text-sm font-medium">Ahora</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximas Acciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {!profile?.companies && (
                <div className="text-sm">
                  <span className="text-orange-600">• Configurar empresa</span>
                </div>
              )}
              {employeeCount === 0 && (
                <div className="text-sm">
                  <span className="text-blue-600">• Agregar empleados</span>
                </div>
              )}
              {payrollCount === 0 && employeeCount > 0 && (
                <div className="text-sm">
                  <span className="text-green-600">• Crear primer período</span>
                </div>
              )}
              {payrollCount > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">• Sistema listo para usar</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
