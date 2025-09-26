import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { PayslipPreview } from "@/components/payslip-preview"

export default async function PreviewPayslipPage({
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
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      company_id,
      companies (*)
    `)
    .eq("id", data.user.id)
    .single()

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

  // Get first employee's payroll data for preview
  const { data: payrollSummary } = await supabase
    .from("payroll_summary")
    .select(`
      *,
      employees (*)
    `)
    .eq("payroll_period_id", periodId)
    .limit(1)
    .single()

  if (!payrollSummary) {
    redirect("/dashboard/payroll")
  }

  // Get payroll concepts and deductions for this employee
  const { data: concepts } = await supabase
    .from("payroll_concepts")
    .select("*")
    .eq("payroll_period_id", periodId)
    .eq("employee_id", payrollSummary.employee_id)

  const { data: deductions } = await supabase
    .from("payroll_deductions")
    .select("*")
    .eq("payroll_period_id", periodId)
    .eq("employee_id", payrollSummary.employee_id)

  const payslipData = {
    company: profile.companies,
    period,
    employee: payrollSummary.employees,
    summary: payrollSummary,
    concepts: concepts || [],
    deductions: deductions || [],
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/payroll/${periodId}/send`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Vista Previa del Desprendible</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Desprendible de Pago - {payrollSummary.employees?.full_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <PayslipPreview data={payslipData} />
        </CardContent>
      </Card>
    </div>
  )
}
