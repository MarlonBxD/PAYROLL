import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, FileText, Send } from "lucide-react"
import Link from "next/link"

export default async function ReviewPayrollPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: periodId } = await params
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

  // Get period info
  const { data: period } = await supabase
    .from("payroll_periods")
    .select("*")
    .eq("id", periodId)
    .eq("company_id", profile.company_id)
    .single()

  if (!period) {
    redirect("/dashboard/payroll")
  }

  // Get payroll summary with employee info
  const { data: payrollSummary } = await supabase
    .from("payroll_summary")
    .select(`
      *,
      employees (
        full_name,
        cedula,
        centro_costo,
        contract_number,
        bank_name,
        account_number,
        afp,
        eps
      )
    `)
    .eq("payroll_period_id", periodId)

  // Calculate totals
  const totals = payrollSummary?.reduce(
    (acc, item) => ({
      totalEarned: acc.totalEarned + (item.total_earned || 0),
      totalDeductions: acc.totalDeductions + (item.total_deductions || 0),
      totalNetPay: acc.totalNetPay + (item.net_pay || 0),
    }),
    { totalEarned: 0, totalDeductions: 0, totalNetPay: 0 },
  ) || { totalEarned: 0, totalDeductions: 0, totalNetPay: 0 }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/payroll">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Revisar Nómina - Período #{period.period_number}</h2>
        </div>

        {period.status === "PROCESADA" && (
          <Button asChild>
            <Link href={`/dashboard/payroll/${periodId}/send`}>
              <Send className="mr-2 h-4 w-4" />
              Enviar Desprendibles
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devengado</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.totalEarned.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Descuentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.totalDeductions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Neto</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.totalNetPay.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollSummary?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Nómina</CardTitle>
          <CardDescription>
            Período del {new Date(period.start_date).toLocaleDateString()} al{" "}
            {new Date(period.end_date).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Centro Costo</TableHead>
                <TableHead>Devengado</TableHead>
                <TableHead>Descuentos</TableHead>
                <TableHead>Neto a Pagar</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollSummary?.map((summary) => (
                <TableRow key={summary.id}>
                  <TableCell className="font-medium">{summary.employees?.full_name}</TableCell>
                  <TableCell>{summary.employees?.cedula}</TableCell>
                  <TableCell>{summary.employees?.centro_costo}</TableCell>
                  <TableCell>${summary.total_earned?.toLocaleString()}</TableCell>
                  <TableCell>${summary.total_deductions?.toLocaleString()}</TableCell>
                  <TableCell className="font-medium">${summary.net_pay?.toLocaleString()}</TableCell>
                  <TableCell>
                    {summary.payslip_sent ? (
                      <span className="text-green-600">Enviado</span>
                    ) : (
                      <span className="text-orange-600">Pendiente</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
