"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Send, Mail, FileText, CheckCircle } from "lucide-react"
import Link from "next/link"

interface PayrollSummaryWithEmployee {
  id: string
  employee_id: string
  total_earned: number
  total_deductions: number
  net_pay: number
  payslip_sent: boolean
  employees: {
    full_name: string
    cedula: string
    email?: string
  }
}

export default function SendPayslipsPage() {
  const router = useRouter()
  const params = useParams()
  const periodId = params.id as string

  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummaryWithEmployee[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [period, setPeriod] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [periodId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      // Get user profile to get company_id
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

      if (!profile?.company_id) {
        throw new Error("Empresa no configurada")
      }

      // Get period info
      const { data: periodData } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("id", periodId)
        .eq("company_id", profile.company_id)
        .single()

      if (!periodData) {
        throw new Error("Período no encontrado")
      }

      setPeriod(periodData)

      // Get payroll summary with employee info
      const { data: summaryData } = await supabase
        .from("payroll_summary")
        .select(`
          *,
          employees (
            full_name,
            cedula,
            email
          )
        `)
        .eq("payroll_period_id", periodId)

      setPayrollSummary(summaryData || [])

      // Pre-select employees who haven't received payslips
      const unsentEmployees = (summaryData || []).filter((item) => !item.payslip_sent).map((item) => item.employee_id)
      setSelectedEmployees(unsentEmployees)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmployeeSelection = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees((prev) => [...prev, employeeId])
    } else {
      setSelectedEmployees((prev) => prev.filter((id) => id !== employeeId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allEmployeeIds = payrollSummary.map((item) => item.employee_id)
      setSelectedEmployees(allEmployeeIds)
    } else {
      setSelectedEmployees([])
    }
  }

  const generateAndSendPayslips = async () => {
    setIsSending(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      // For each selected employee, generate and send payslip
      for (const employeeId of selectedEmployees) {
        // Generate payslip PDF (this would call an API route)
        const response = await fetch("/api/generate-payslip", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            periodId,
            employeeId,
          }),
        })

        if (!response.ok) {
          throw new Error(`Error generando desprendible para empleado ${employeeId}`)
        }

        // Update payslip_sent status
        await supabase
          .from("payroll_summary")
          .update({
            payslip_sent: true,
            payslip_sent_at: new Date().toISOString(),
          })
          .eq("payroll_period_id", periodId)
          .eq("employee_id", employeeId)
      }

      // Update period status to ENVIADA
      await supabase.from("payroll_periods").update({ status: "ENVIADA" }).eq("id", periodId)

      setSuccess(`Desprendibles enviados exitosamente a ${selectedEmployees.length} empleados`)

      // Reload data to update the UI
      await loadData()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return <div className="flex-1 p-8">Cargando...</div>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/payroll">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Enviar Desprendibles - Período #{period?.period_number}</h2>
      </div>

      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800">{success}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Empleados</CardTitle>
          <CardDescription>Elige los empleados a los que enviar los desprendibles de pago</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedEmployees.length === payrollSummary.length}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Seleccionar todos ({payrollSummary.length} empleados)
              </label>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Enviar</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Neto a Pagar</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollSummary.map((summary) => (
                <TableRow key={summary.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedEmployees.includes(summary.employee_id)}
                      onCheckedChange={(checked) => handleEmployeeSelection(summary.employee_id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{summary.employees?.full_name}</TableCell>
                  <TableCell>{summary.employees?.cedula}</TableCell>
                  <TableCell>${summary.net_pay?.toLocaleString()}</TableCell>
                  <TableCell>
                    {summary.payslip_sent ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Enviado
                      </div>
                    ) : (
                      <div className="flex items-center text-orange-600">
                        <Mail className="h-4 w-4 mr-1" />
                        Pendiente
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 flex gap-4">
            <Button
              onClick={generateAndSendPayslips}
              disabled={isSending || selectedEmployees.length === 0}
              className="flex items-center"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSending ? "Enviando..." : `Enviar Desprendibles (${selectedEmployees.length})`}
            </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/payroll/${periodId}/preview`}>
                <FileText className="mr-2 h-4 w-4" />
                Vista Previa
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
