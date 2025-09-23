// Utility functions for payroll calculations

export interface PayrollCalculationInput {
  baseSalary: number
  daysWorked: number
  salaryType: "FIJO" | "VARIABLE"
  bonuses?: number
  extraHours?: number
  extraHourRate?: number
}

export interface PayrollCalculationResult {
  baseSalaryEarned: number
  bonuses: number
  extraHoursEarned: number
  totalEarned: number
  epsDeduction: number
  afpDeduction: number
  totalDeductions: number
  netPay: number
}

export interface PayrollSummary {
  totalConcepts: number
  totalDeductions: number
  totalNet: number
}

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const { baseSalary, daysWorked, salaryType, bonuses = 0, extraHours = 0, extraHourRate = 0 } = input

  // Calculate base salary earned
  const dailySalary = baseSalary / 30 // Assuming 30 days per month
  const baseSalaryEarned = dailySalary * daysWorked

  // Calculate extra hours
  const extraHoursEarned = extraHours * extraHourRate

  // Calculate total earned
  const totalEarned = baseSalaryEarned + bonuses + extraHoursEarned

  // Calculate deductions (Colombian rates)
  const epsDeduction = totalEarned * 0.04 // 4% for EPS
  const afpDeduction = totalEarned * 0.04 // 4% for AFP
  const totalDeductions = epsDeduction + afpDeduction

  // Calculate net pay
  const netPay = totalEarned - totalDeductions

  return {
    baseSalaryEarned,
    bonuses,
    extraHoursEarned,
    totalEarned,
    epsDeduction,
    afpDeduction,
    totalDeductions,
    netPay,
  }
}

export function calculateConceptAmount(employee: any, concept: any): number {
  if (!employee || !concept) return 0

  if (concept.calculation_type === 'fixed') {
    return concept.amount || 0
  } else if (concept.calculation_type === 'percentage') {
    return (employee.base_salary * (concept.percentage || 0)) / 100
  }
  return 0
}

export function calculateDeductionAmount(employee: any, deduction: any): number {
  if (!employee || !deduction) return 0

  if (deduction.calculation_type === 'fixed') {
    return deduction.amount || 0
  } else if (deduction.calculation_type === 'percentage') {
    return (employee.base_salary * (deduction.percentage || 0)) / 100
  }
  return 0
}

export async function calculatePayrollSummary(
  employee: any, 
  concepts: any[], 
  deductions: any[]
): Promise<PayrollSummary> {
  const totalConcepts = concepts.reduce((sum, concept) => 
    sum + calculateConceptAmount(employee, concept), 0
  )
  
  const totalDeductions = deductions.reduce((sum, deduction) => 
    sum + calculateDeductionAmount(employee, deduction), 0
  )

  const totalNet = employee.base_salary + totalConcepts - totalDeductions

  return {
    totalConcepts,
    totalDeductions,
    totalNet
  }
}

export function calculateDaysWorked(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + 1 // Include both start and end dates
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("es-CO").format(amount)
}
