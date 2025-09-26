// Utility functions for dashboard calculations and data processing

export interface DashboardMetrics {
  totalEmployees: number
  activeEmployees: number
  totalPeriods: number
  currentMonthTotal: number
  ytdTotal: number
  averageSalary: number
  deductionRate: number
}

export interface PayrollPeriodSummary {
  id: string
  period_number: number
  start_date: string
  end_date: string
  status: string
  employee_count: number
  total_earned: number
  total_deductions: number
  total_net_pay: number
}

export function calculateDashboardMetrics(employees: any[], payrollPeriods: any[]): DashboardMetrics {
  const totalEmployees = employees.length
  const activeEmployees = employees.filter((emp) => emp.status === "ACTIVO").length
  const totalPeriods = payrollPeriods.length

  const currentYear = new Date().getFullYear()
  const currentYearPeriods = payrollPeriods.filter(
    (period) => new Date(period.start_date).getFullYear() === currentYear,
  )

  const ytdTotal = currentYearPeriods.reduce((acc, period) => {
    const periodTotal =
      period.payroll_summary?.reduce((sum: number, summary: any) => sum + (summary.net_pay || 0), 0) || 0
    return acc + periodTotal
  }, 0)

  const currentMonthTotal =
    payrollPeriods[0]?.payroll_summary?.reduce((acc: number, summary: any) => acc + (summary.net_pay || 0), 0) || 0

  const averageSalary = activeEmployees > 0 ? ytdTotal / activeEmployees : 0

  const totalEarned = currentYearPeriods.reduce((acc, period) => {
    const periodEarned =
      period.payroll_summary?.reduce((sum: number, summary: any) => sum + (summary.total_earned || 0), 0) || 0
    return acc + periodEarned
  }, 0)

  const totalDeductions = currentYearPeriods.reduce((acc, period) => {
    const periodDeductions =
      period.payroll_summary?.reduce((sum: number, summary: any) => sum + (summary.total_deductions || 0), 0) || 0
    return acc + periodDeductions
  }, 0)

  const deductionRate = totalEarned > 0 ? (totalDeductions / totalEarned) * 100 : 0

  return {
    totalEmployees,
    activeEmployees,
    totalPeriods,
    currentMonthTotal,
    ytdTotal,
    averageSalary,
    deductionRate,
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVO":
      return "text-green-600"
    case "INACTIVO":
      return "text-red-600"
    case "PROCESADA":
      return "text-blue-600"
    case "ENVIADA":
      return "text-green-600"
    case "BORRADOR":
      return "text-orange-600"
    default:
      return "text-gray-600"
  }
}

export function generateQuickInsights(metrics: DashboardMetrics): string[] {
  const insights: string[] = []

  if (metrics.activeEmployees === 0) {
    insights.push("Agrega empleados para comenzar a procesar nómina")
  }

  if (metrics.totalPeriods === 0 && metrics.activeEmployees > 0) {
    insights.push("Crea tu primer período de nómina")
  }

  if (metrics.deductionRate > 10) {
    insights.push("Tasa de descuentos alta, revisa configuración")
  }

  if (metrics.averageSalary > 0) {
    insights.push(`Salario promedio: ${formatCurrency(metrics.averageSalary)}`)
  }

  if (insights.length === 0) {
    insights.push("Sistema funcionando correctamente")
  }

  return insights
}
