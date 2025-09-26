import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, TrendingUp, Users, DollarSign, Calendar } from "lucide-react"
import Link from "next/link"
import { ReportActions } from "@/components/report-actions"

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile to get company_id
  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", data.user.id).single()

  if (!profile?.company_id) {
    redirect("/dashboard/settings")
  }

  // Get payroll periods with summary data
  const { data: payrollPeriods } = await supabase
    .from("payroll_periods")
    .select(`
      *,
      payroll_summary (
        total_earned,
        total_deductions,
        net_pay
      )
    `)
    .eq("company_id", profile.company_id)
    .order("period_number", { ascending: false })

  // Calculate totals for each period
  const periodsWithTotals = payrollPeriods?.map((period) => {
    const totals = period.payroll_summary.reduce(
      (acc: any, summary: any) => ({
        totalEarned: acc.totalEarned + (summary.total_earned || 0),
        totalDeductions: acc.totalDeductions + (summary.total_deductions || 0),
        totalNetPay: acc.totalNetPay + (summary.net_pay || 0),
        employeeCount: acc.employeeCount + 1,
      }),
      { totalEarned: 0, totalDeductions: 0, totalNetPay: 0, employeeCount: 0 },
    )

    return {
      ...period,
      totals,
    }
  })

  // Get employee statistics
  const { count: totalEmployees } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile.company_id)

  const { count: activeEmployees } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile.company_id)
    .eq("status", "ACTIVO")

  // Calculate year-to-date totals
  const currentYear = new Date().getFullYear()
  const ytdTotals = periodsWithTotals
    ?.filter((period) => new Date(period.start_date).getFullYear() === currentYear)
    .reduce(
      (acc, period) => ({
        totalEarned: acc.totalEarned + period.totals.totalEarned,
        totalDeductions: acc.totalDeductions + period.totals.totalDeductions,
        totalNetPay: acc.totalNetPay + period.totals.totalNetPay,
      }),
      { totalEarned: 0, totalDeductions: 0, totalNetPay: 0 },
    ) || { totalEarned: 0, totalDeductions: 0, totalNetPay: 0 }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reportes y Análisis</h2>
        <ReportActions 
          periodsWithTotals={periodsWithTotals || []} 
          ytdTotals={ytdTotals} 
        />
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">{activeEmployees} activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nómina YTD</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${ytdTotals.totalNetPay.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">pagado este año</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Descuentos YTD</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${ytdTotals.totalDeductions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">en aportes y descuentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Períodos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodsWithTotals?.length || 0}</div>
            <p className="text-xs text-muted-foreground">períodos procesados</p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Nómina</CardTitle>
          <CardDescription>Resumen de todos los períodos de nómina procesados</CardDescription>
        </CardHeader>
        <CardContent>
          {periodsWithTotals && periodsWithTotals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Fechas</TableHead>
                  <TableHead>Empleados</TableHead>
                  <TableHead>Total Devengado</TableHead>
                  <TableHead>Total Descuentos</TableHead>
                  <TableHead>Total Neto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodsWithTotals.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">#{period.period_number}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(period.start_date).toLocaleDateString()}</div>
                        <div className="text-muted-foreground">{new Date(period.end_date).toLocaleDateString()}</div>
                      </div>
                    </TableCell>
                    <TableCell>{period.totals.employeeCount}</TableCell>
                    <TableCell>${period.totals.totalEarned.toLocaleString()}</TableCell>
                    <TableCell>${period.totals.totalDeductions.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">${period.totals.totalNetPay.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          period.status === "PROCESADA"
                            ? "default"
                            : period.status === "ENVIADA"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {period.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/payroll/${period.id}/review`}>
                          <FileText className="h-4 w-4 mr-1" />
                          Ver
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No hay períodos de nómina procesados</p>
              <Button asChild>
                <Link href="/dashboard/payroll/new">
                  <Calendar className="mr-2 h-4 w-4" />
                  Crear Primer Período
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Reports */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reportes Rápidos</CardTitle>
            <CardDescription>Genera reportes específicos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <FileText className="mr-2 h-4 w-4" />
              Reporte de Empleados Activos
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <DollarSign className="mr-2 h-4 w-4" />
              Análisis de Costos por Centro
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <TrendingUp className="mr-2 h-4 w-4" />
              Evolución Salarial
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <Calendar className="mr-2 h-4 w-4" />
              Reporte Mensual
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análisis de Tendencias</CardTitle>
            <CardDescription>Insights sobre la nómina</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Costo promedio por empleado</span>
                <span className="font-medium">
                  ${(activeEmployees && activeEmployees > 0) ? Math.round(ytdTotals.totalNetPay / activeEmployees).toLocaleString() : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Tasa de descuentos</span>
                <span className="font-medium">
                  {ytdTotals.totalEarned > 0
                    ? ((ytdTotals.totalDeductions / ytdTotals.totalEarned) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Períodos procesados</span>
                <span className="font-medium">{periodsWithTotals?.length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
