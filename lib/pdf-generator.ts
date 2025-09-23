import jsPDF from 'jspdf'
import 'jspdf-autotable'

// PDF generation utilities for payslips
export interface PayslipData {
  company: any
  employee: any
  period: any
  summary: any
  concepts: any[]
  deductions: any[]
}

export interface ReportData {
  period: any
  summaries: any[]
  totals: {
    totalEmployees: number
    totalConcepts: number
    totalDeductions: number
    totalNet: number
  }
}

export interface PayslipPDFData {
  company: {
    name: string
    nit: string
    logo_url?: string
  }
  period: {
    period_number: number
    start_date: string
    end_date: string
  }
  employee: {
    full_name: string
    cedula: string
    centro_costo: string
    contract_number: string
    hire_date: string
    salary_type: string
    base_salary: number
    bank_name: string
    account_number: string
    afp: string
    eps: string
  }
  concepts: Array<{
    concept_code: string
    concept_name: string
    days_hours: number
    unit_value: number
    total_value: number
  }>
  deductions: Array<{
    deduction_code: string
    deduction_name: string
    base_amount: number
    percentage: number
    deduction_value: number
  }>
  summary: {
    total_earned: number
    total_deductions: number
    net_pay: number
  }
}

export function generatePayslipPDF(data: PayslipData): Uint8Array {
  const doc = new jsPDF()
  
  // Configuración del documento
  doc.setFontSize(16)
  doc.text(data.company?.name || 'EMPRESA', 105, 20, { align: 'center' })
  
  doc.setFontSize(14)
  doc.text('DESPRENDIBLE DE PAGO', 105, 30, { align: 'center' })
  
  // Información del período
  doc.setFontSize(10)
  doc.text(`Período: ${data.period?.period_number} - ${data.period?.period_name}`, 20, 45)
  doc.text(`Fecha: ${new Date(data.period?.end_date).toLocaleDateString()}`, 20, 52)
  
  // Información del empleado
  doc.text(`Empleado: ${data.employee?.full_name}`, 20, 65)
  doc.text(`Cédula: ${data.employee?.cedula}`, 20, 72)
  doc.text(`Cargo: ${data.employee?.position || 'N/A'}`, 20, 79)
  doc.text(`Salario Base: $${data.employee?.base_salary?.toLocaleString()}`, 20, 86)
  
  // Tabla de conceptos
  if (data.concepts && data.concepts.length > 0) {
    const conceptsData = data.concepts.map(concept => [
      concept.concept_name || 'N/A',
      concept.calculation_type === 'percentage' ? `${concept.percentage}%` : 'Fijo',
      `$${concept.amount?.toLocaleString() || '0'}`
    ])
    
    ;(doc as any).autoTable({
      startY: 95,
      head: [['Conceptos', 'Tipo', 'Valor']],
      body: conceptsData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [51, 122, 183] }
    })
  }
  
  // Tabla de deducciones
  if (data.deductions && data.deductions.length > 0) {
    const deductionsData = data.deductions.map(deduction => [
      deduction.deduction_name || 'N/A',
      deduction.calculation_type === 'percentage' ? `${deduction.percentage}%` : 'Fijo',
      `$${deduction.amount?.toLocaleString() || '0'}`
    ])
    
    const finalY = (doc as any).lastAutoTable?.finalY || 120
    
    ;(doc as any).autoTable({
      startY: finalY + 10,
      head: [['Deducciones', 'Tipo', 'Valor']],
      body: deductionsData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [217, 83, 79] }
    })
  }
  
  // Resumen final
  const summaryY = (doc as any).lastAutoTable?.finalY + 20 || 160
  
  doc.setFontSize(12)
  doc.text(`Total Conceptos: $${data.summary?.total_concepts?.toLocaleString() || '0'}`, 20, summaryY)
  doc.text(`Total Deducciones: $${data.summary?.total_deductions?.toLocaleString() || '0'}`, 20, summaryY + 7)
  
  // Línea y neto final
  doc.setDrawColor(0)
  doc.line(20, summaryY + 10, 190, summaryY + 10)
  doc.setFontSize(14)
  doc.text(`NETO A PAGAR: $${data.summary?.total_net?.toLocaleString() || '0'}`, 20, summaryY + 20)
  
  return new Uint8Array(doc.output('arraybuffer'))
}

export function generateReportPDF(data: ReportData): Uint8Array {
  const doc = new jsPDF()
  
  // Título del reporte
  doc.setFontSize(16)
  doc.text('REPORTE DE NÓMINA', 105, 20, { align: 'center' })
  
  doc.setFontSize(12)
  doc.text(`Período: ${data.period?.period_number} - ${data.period?.period_name}`, 105, 30, { align: 'center' })
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 105, 37, { align: 'center' })
  
  // Resumen general
  doc.setFontSize(10)
  doc.text(`Total Empleados: ${data.totals.totalEmployees}`, 20, 50)
  doc.text(`Total Conceptos: $${data.totals.totalConcepts.toLocaleString()}`, 20, 57)
  doc.text(`Total Deducciones: $${data.totals.totalDeductions.toLocaleString()}`, 20, 64)
  doc.text(`Total Neto: $${data.totals.totalNet.toLocaleString()}`, 20, 71)
  
  // Tabla detallada
  const tableData = data.summaries.map(summary => [
    summary.employees?.cedula || 'N/A',
    summary.employees?.full_name || 'N/A',
    summary.employees?.position || 'N/A',
    `$${summary.base_salary?.toLocaleString() || '0'}`,
    `$${summary.total_concepts?.toLocaleString() || '0'}`,
    `$${summary.total_deductions?.toLocaleString() || '0'}`,
    `$${summary.total_net?.toLocaleString() || '0'}`
  ])
  
  ;(doc as any).autoTable({
    startY: 80,
    head: [['Cédula', 'Nombre', 'Cargo', 'Salario Base', 'Conceptos', 'Deducciones', 'Neto']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 122, 183] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' }
    }
  })
  
  return new Uint8Array(doc.output('arraybuffer'))
}

export async function generatePayslipPDFLegacy(data: PayslipPDFData): Promise<Buffer> {
  console.log("Generating PDF for:", data.employee.full_name)

  // For now, return a mock buffer
  // In a real implementation, this would generate the actual PDF
  const mockPDFContent = `
    DESPRENDIBLE DE PAGO
    
    NOMBRE: ${data.employee.full_name}
    CEDULA: ${data.employee.cedula}
    PERIODO: ${data.period.period_number}
    
    DEVENGADO: $${data.summary.total_earned.toLocaleString()}
    DESCUENTOS: $${data.summary.total_deductions.toLocaleString()}
    NETO A PAGAR: $${data.summary.net_pay.toLocaleString()}
  `

  return Buffer.from(mockPDFContent, "utf-8")
}

export function formatPayslipFilename(employeeName: string, periodNumber: number): string {
  const sanitizedName = employeeName.replace(/[^a-zA-Z0-9]/g, "_")
  return `desprendible_${sanitizedName}_periodo_${periodNumber}.pdf`
}
