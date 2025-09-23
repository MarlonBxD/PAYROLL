import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, Calculator, FileText, Send } from "lucide-react"

export default async function PayrollPage() {
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

  // Get payroll periods
  const { data: payrollPeriods } = await supabase
    .from("payroll_periods")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("period_number", { ascending: false })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gestión de Nómina</h2>
        <Button asChild>
          <Link href="/dashboard/payroll/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Período
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Períodos de Nómina</CardTitle>
          <CardDescription>Gestiona los períodos de pago y procesa la nómina</CardDescription>
        </CardHeader>
        <CardContent>
          {payrollPeriods && payrollPeriods.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Fecha Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollPeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">Período #{period.period_number}</TableCell>
                    <TableCell>{new Date(period.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(period.end_date).toLocaleDateString()}</TableCell>
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
                      <div className="flex items-center gap-2">
                        {period.status === "BORRADOR" && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/payroll/${period.id}/calculate`}>
                              <Calculator className="h-4 w-4 mr-1" />
                              Calcular
                            </Link>
                          </Button>
                        )}
                        {period.status === "PROCESADA" && (
                          <>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/payroll/${period.id}/review`}>
                                <FileText className="h-4 w-4 mr-1" />
                                Revisar
                              </Link>
                            </Button>
                            <Button asChild size="sm">
                              <Link href={`/dashboard/payroll/${period.id}/send`}>
                                <Send className="h-4 w-4 mr-1" />
                                Enviar
                              </Link>
                            </Button>
                          </>
                        )}
                        {period.status === "ENVIADA" && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/payroll/${period.id}/review`}>
                              <FileText className="h-4 w-4 mr-1" />
                              Ver
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No hay períodos de nómina creados</p>
              <Button asChild>
                <Link href="/dashboard/payroll/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Período
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
