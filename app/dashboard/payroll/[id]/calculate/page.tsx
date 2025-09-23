"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Calculator, CheckCircle } from "lucide-react"
import Link from "next/link"

interface Employee {
  id: string
  full_name: string
  cedula: string
  base_salary: number
  salary_type: string
}

interface PayrollCalculation {
  employee_id: string
  employee_name: string
  base_salary: number
  days_worked: number
  salary_earned: number
  eps_deduction: number
  afp_deduction: number
  total_deductions: number
  net_pay: number
}

export default function CalculatePayrollPage() {
  const router = useRouter()
  const params = useParams()
  const periodId = params.id as string

  const [isLoading, setIsLoading] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [calculations, setCalculations] = useState<PayrollCalculation[]>([])
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

      // Get active employees
      const { data: employeesData } = await supabase
        .from("employees")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("status", "ACTIVO")

      setEmployees(employeesData || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const calculatePayroll = async () => {
    setIsCalculating(true)
    setError(null)

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

      // Get active concepts and deductions
      const { data: concepts } = await supabase
        .from('payroll_concepts')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)

      const { data: deductions } = await supabase
        .from('payroll_deductions')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)

      // Calculate payroll for each employee
      const calculatedPayroll: PayrollCalculation[] = []

      for (const employee of employees) {
        // Calculate concepts total
        let totalConcepts = 0
        for (const concept of concepts || []) {
          if (concept.calculation_type === 'fixed') {
            totalConcepts += concept.amount || 0
          } else if (concept.calculation_type === 'percentage') {
            totalConcepts += (employee.base_salary * (concept.percentage || 0)) / 100
          }
        }

        // Calculate deductions total
        let totalDeductionsAmount = 0
        for (const deduction of deductions || []) {
          if (deduction.calculation_type === 'fixed') {
            totalDeductionsAmount += deduction.amount || 0
          } else if (deduction.calculation_type === 'percentage') {
            totalDeductionsAmount += (employee.base_salary * (deduction.percentage || 0)) / 100
          }
        }

        // Calculate final amounts
        const salaryEarned = employee.base_salary + totalConcepts
        const netPay = salaryEarned - totalDeductionsAmount

        calculatedPayroll.push({
          employee_id: employee.id,
          employee_name: employee.full_name,
          base_salary: employee.base_salary,
          days_worked: 30, // Default to monthly
          salary_earned: salaryEarned,
          eps_deduction: totalDeductionsAmount * 0.5, // Split deductions for display
          afp_deduction: totalDeductionsAmount * 0.5,
          total_deductions: totalDeductionsAmount,
          net_pay: netPay,
        })
      }

      setCalculations(calculatedPayroll)

      // Save calculations to database
      for (const calc of calculatedPayroll) {
        // Insert base salary concept
        await supabase.from("payroll_concepts").insert({
          payroll_period_id: periodId,
          employee_id: calc.employee_id,
          concept_code: "001",
          concept_name: "Salario Base",
          days_hours: 30,
          unit_value: calc.base_salary / 30,
          total_value: calc.base_salary,
        })

        // Insert additional concepts
        for (const concept of concepts || []) {
          let amount = 0
          if (concept.calculation_type === 'fixed') {
            amount = concept.amount || 0
          } else if (concept.calculation_type === 'percentage') {
            amount = (calc.base_salary * (concept.percentage || 0)) / 100
          }

          if (amount > 0) {
            await supabase.from("payroll_concepts").insert({
              payroll_period_id: periodId,
              employee_id: calc.employee_id,
              concept_code: concept.concept_code,
              concept_name: concept.concept_name,
              days_hours: 1,
              unit_value: amount,
              total_value: amount,
            })
          }
        }

        // Insert deductions
        for (const deduction of deductions || []) {
          let amount = 0
          let percentage = 0
          
          if (deduction.calculation_type === 'fixed') {
            amount = deduction.amount || 0
          } else if (deduction.calculation_type === 'percentage') {
            percentage = deduction.percentage || 0
            amount = (calc.base_salary * percentage) / 100
          }

          if (amount > 0) {
            await supabase.from("payroll_deductions").insert({
              payroll_period_id: periodId,
              employee_id: calc.employee_id,
              deduction_code: deduction.deduction_code,
              deduction_name: deduction.deduction_name,
              base_amount: calc.base_salary,
              percentage: percentage,
              deduction_value: amount,
            })
          }
        }

        // Insert payroll summary
        await supabase.from("payroll_summary").insert({
          payroll_period_id: periodId,
          employee_id: calc.employee_id,
          total_earned: calc.salary_earned,
          total_deductions: calc.total_deductions,
          net_pay: calc.net_pay,
        })
      }

      // Update period status to PROCESADA
      await supabase.from("payroll_periods").update({ status: "PROCESADA" }).eq("id", periodId)
    } catch (error: any) {
      console.error('Error calculating payroll:', error)
      setError(error.message)
    } finally {
      setIsCalculating(false)
    }
  }

  const handleFinishCalculation = () => {
    router.push("/dashboard/payroll")
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
        <h2 className="text-3xl font-bold tracking-tight">Calcular Nómina - Período #{period?.period_number}</h2>
      </div>

      {period && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información del Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="font-medium">#{period.period_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Desde</p>
                <p className="font-medium">{new Date(period.start_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hasta</p>
                <p className="font-medium">{new Date(period.end_date).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Empleados a Procesar</CardTitle>
          <CardDescription>{employees.length} empleados activos encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          {calculations.length === 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Salario Base</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.full_name}</TableCell>
                      <TableCell>{employee.cedula}</TableCell>
                      <TableCell>${employee.base_salary?.toLocaleString()}</TableCell>
                      <TableCell>{employee.salary_type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 flex gap-4">
                <Button onClick={calculatePayroll} disabled={isCalculating || employees.length === 0}>
                  <Calculator className="mr-2 h-4 w-4" />
                  {isCalculating ? "Calculando..." : "Calcular Nómina"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-green-800 font-medium">Nómina calculada exitosamente</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Devengado</TableHead>
                    <TableHead>EPS (4%)</TableHead>
                    <TableHead>AFP (4%)</TableHead>
                    <TableHead>Total Desc.</TableHead>
                    <TableHead>Neto a Pagar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculations.map((calc) => (
                    <TableRow key={calc.employee_id}>
                      <TableCell className="font-medium">{calc.employee_name}</TableCell>
                      <TableCell>{calc.days_worked}</TableCell>
                      <TableCell>${calc.salary_earned.toLocaleString()}</TableCell>
                      <TableCell>${calc.eps_deduction.toLocaleString()}</TableCell>
                      <TableCell>${calc.afp_deduction.toLocaleString()}</TableCell>
                      <TableCell>${calc.total_deductions.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">${calc.net_pay.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 flex gap-4">
                <Button onClick={handleFinishCalculation}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Finalizar Cálculo
                </Button>
              </div>
            </>
          )}

          {error && <div className="mt-4 text-sm text-destructive">{error}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
