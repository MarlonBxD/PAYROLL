"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Send, Mail, FileText, CheckCircle, Download } from "lucide-react"
import Link from "next/link"
import { usePayslipDownload } from "@/hooks/use-payslip-download"

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
    contract_type?: string
    position?: string
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
  
  // Hook for downloading payslips
  const { downloadPayslip: downloadPayslipHook, isDownloading: isDownloadingPayslip, error: downloadError } = usePayslipDownload()

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
            email,
            contract_type,
            position
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

      console.log('Sending emails individually for period:', periodId, 'employees:', selectedEmployees)

      // Send emails individually using the simpler API
      let successCount = 0
      let failedCount = 0
      const errors: string[] = []

      for (const employeeId of selectedEmployees) {
        try {
          const employee = payrollSummary.find(s => s.employee_id === employeeId)
          
          if (!employee?.employees?.email) {
            failedCount++
            errors.push(`${employee?.employees?.full_name || employeeId}: Sin email configurado`)
            continue
          }

          const response = await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              periodId,
              employeeId,
            }),
          })

          if (response.ok) {
            successCount++
            console.log(`✅ Email sent to ${employee.employees.full_name}`)
          } else {
            const errorData = await response.json()
            failedCount++
            errors.push(`${employee.employees.full_name}: ${errorData.error}`)
            console.error(`❌ Failed to send to ${employee.employees.full_name}:`, errorData.error)
          }

          // Small delay between sends
          await new Promise(resolve => setTimeout(resolve, 500))
          
        } catch (error) {
          failedCount++
          const employee = payrollSummary.find(s => s.employee_id === employeeId)
          const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
          errors.push(`${employee?.employees?.full_name || employeeId}: ${errorMsg}`)
          console.error(`❌ Error sending to employee ${employeeId}:`, error)
        }
      }

      // Show results
      if (failedCount > 0) {
        setError(`Se enviaron ${successCount} documentos exitosamente, pero ${failedCount} fallaron. Errores: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`)
      }

      // Update period status if all emails were sent successfully
      if (successCount === selectedEmployees.length) {
        await supabase.from("payroll_periods").update({ status: "ENVIADA" }).eq("id", periodId)
      }

      const documentCount = selectedEmployees.length
      const opsCount = selectedEmployees.filter(empId => {
        const emp = payrollSummary.find(s => s.employee_id === empId)
        return emp?.employees?.contract_type === 'OPS'
      }).length
      const nominaCount = documentCount - opsCount
      
      let successMessage = `Documentos enviados exitosamente a ${documentCount} empleados`
      if (opsCount > 0 && nominaCount > 0) {
        successMessage += ` (${nominaCount} desprendibles y ${opsCount} certificados)`
      } else if (opsCount > 0) {
        successMessage += ` (${opsCount} certificados de pago)`
      } else {
        successMessage += ` (${nominaCount} desprendibles de pago)`
      }
      
      setSuccess(successMessage)

      // Reload data to update the UI
      await loadData()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSending(false)
    }
  }

  const handleDownloadPayslip = async (employeeId: string) => {
    try {
      await downloadPayslipHook(periodId, employeeId)
    } catch (error) {
      console.error('Error downloading payslip:', error)
      setError(`Error al descargar el desprendible: ${downloadError || 'Error desconocido'}`)
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
        <h2 className="text-3xl font-bold tracking-tight">Enviar Documentos - Período #{period?.period_number}</h2>
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

      {downloadError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">Error de descarga: {downloadError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Empleados</CardTitle>
          <CardDescription>
            Elige los empleados a los que enviar los documentos. Se generarán desprendibles para empleados NÓMINA y certificados para empleados OPS.
          </CardDescription>
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
                <TableHead>Tipo Contrato</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Neto a Pagar</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollSummary.map((summary) => {
                const contractType = summary.employees?.contract_type || 'NOMINA'
                const documentType = contractType === 'OPS' ? 'Certificado' : 'Desprendible'
                const docIcon = contractType === 'OPS' ? '📄' : '📋'
                
                return (
                  <TableRow key={summary.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedEmployees.includes(summary.employee_id)}
                        onCheckedChange={(checked) => handleEmployeeSelection(summary.employee_id, checked as boolean)}
                        disabled={!summary.employees?.email}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {summary.employees?.full_name}
                      {summary.employees?.position && (
                        <div className="text-sm text-muted-foreground">
                          {summary.employees.position}
                        </div>
                      )}
                      {!summary.employees?.email && (
                        <div className="text-xs text-red-500 mt-1">
                          ⚠️ Sin email configurado
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{summary.employees?.cedula}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        contractType === 'OPS' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {contractType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center">
                        <span className="mr-1">{docIcon}</span>
                        {documentType}
                      </span>
                    </TableCell>
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
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPayslip(summary.employee_id)}
                        className="flex items-center"
                        title={`Descargar ${documentType.toLowerCase()} para ${summary.employees?.full_name}`}
                        disabled={isDownloadingPayslip}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {isDownloadingPayslip ? 'Descargando...' : 'Descargar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <div className="mt-6 flex gap-4">
            <Button
              onClick={generateAndSendPayslips}
              disabled={isSending || selectedEmployees.length === 0}
              className="flex items-center"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSending ? "Enviando..." : `Enviar Documentos (${selectedEmployees.length})`}
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
