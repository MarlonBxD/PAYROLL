import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { periodId, employeeId } = await request.json()

    const supabase = await createClient()

    // Get user to verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Get user profile to get company_id
    const { data: profile } = await supabase
      .from("profiles")
      .select(`
        company_id,
        companies (*)
      `)
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Empresa no configurada" }, { status: 400 })
    }

    // Get period info
    const { data: period } = await supabase
      .from("payroll_periods")
      .select("*")
      .eq("id", periodId)
      .eq("company_id", profile.company_id)
      .single()

    if (!period) {
      return NextResponse.json({ error: "Período no encontrado" }, { status: 404 })
    }

    // Get employee info
    const { data: employee } = await supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .eq("company_id", profile.company_id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 })
    }

    // Get payroll summary
    const { data: summary } = await supabase
      .from("payroll_summary")
      .select("*")
      .eq("payroll_period_id", periodId)
      .eq("employee_id", employeeId)
      .single()

    // Get concepts and deductions
    const { data: concepts } = await supabase
      .from("payroll_concepts")
      .select("*")
      .eq("payroll_period_id", periodId)
      .eq("employee_id", employeeId)

    const { data: deductions } = await supabase
      .from("payroll_deductions")
      .select("*")
      .eq("payroll_period_id", periodId)
      .eq("employee_id", employeeId)

    // Here you would generate the PDF and send the email
    // For now, we'll simulate the process
    console.log("Generating payslip for:", {
      company: profile.companies,
      period,
      employee,
      summary,
      concepts,
      deductions,
    })

    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      message: `Desprendible generado y enviado a ${employee.full_name}`,
    })
  } catch (error: any) {
    console.error("Error generating payslip:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
