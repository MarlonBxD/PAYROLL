import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get("periodId")
    const format = searchParams.get("format") || "csv"

    const supabase = await createClient()

    // Get user to verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Get user profile to get company_id
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Empresa no configurada" }, { status: 400 })
    }

    let query = supabase.from("payroll_summary").select(`
        *,
        employees (
          full_name,
          cedula,
          centro_costo,
          contract_number,
          bank_name,
          account_number
        ),
        payroll_periods (
          period_number,
          start_date,
          end_date
        )
      `)

    if (periodId) {
      query = query.eq("payroll_period_id", periodId)
    }

    const { data: payrollData } = await query

    if (!payrollData || payrollData.length === 0) {
      return NextResponse.json({ error: "No hay datos para exportar" }, { status: 404 })
    }

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "Período",
        "Empleado",
        "Cédula",
        "Centro de Costo",
        "Contrato",
        "Banco",
        "Cuenta",
        "Total Devengado",
        "Total Descuentos",
        "Neto a Pagar",
      ]

      const csvRows = [
        headers.join(","),
        ...payrollData.map((row) =>
          [
            row.payroll_periods?.period_number || "",
            `"${row.employees?.full_name || ""}"`,
            row.employees?.cedula || "",
            `"${row.employees?.centro_costo || ""}"`,
            row.employees?.contract_number || "",
            `"${row.employees?.bank_name || ""}"`,
            row.employees?.account_number || "",
            row.total_earned || 0,
            row.total_deductions || 0,
            row.net_pay || 0,
          ].join(","),
        ),
      ]

      const csvContent = csvRows.join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="nomina_${periodId || "completa"}.csv"`,
        },
      })
    }

    // Default JSON response
    return NextResponse.json(payrollData)
  } catch (error: any) {
    console.error("Error exporting payroll:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
