import { getAssetPathForPDF } from './company-assets'

// PDF generation utilities for payslips
export interface PayslipData {
  company: {
    name: string
    nit: string
    address?: string
    phone?: string
    email?: string
    nombre_representante?: string
    tipo_documento_representante?: string
    numero_documento_representante?: string
  }
  employee: {
    cedula: string
    full_name: string
    banco?: string
    account_number?: string
    centro_costo: string
    contract_number: string
    hire_date: string
    salary_type: string
    base_salary: number
    email?: string
    phone?: string
    position?: string
    department?: string
    contract_type?: string
  }
  period: {
    period_number: number
    start_date: string
    end_date: string
    period_name?: string
  }
  concepts: Array<{
    concept_code: string
    concept_name: string
    days_hours: number
    unit_value: number
    total_value: number
  }>
  deductions: Array<{
    concept_code: string
    concept_name: string
    percentage?: number
    base_value?: number
    total_value: number
  }>
  summary: {
    total_earned: number
    total_deductions: number
    net_pay: number
  }
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

/**
 * Generate a payslip PDF for NÓMINA employees using PDFKit
 */
export async function generatePayslipPDF(data: PayslipData): Promise<Uint8Array> {
  try {
    // Dynamic import to avoid client-side issues
    const PDFDocument = (await import('pdfkit')).default
    
    // Create new PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    })

    // Buffer to collect PDF data
    const chunks: Uint8Array[] = []
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const result = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          result.set(chunk, offset)
          offset += chunk.length
        }
        resolve(result)
      })

      doc.on('error', reject)

      try {
        // Generate payslip content
        generatePayslipContent(doc, data)
        doc.end()
      } catch (error) {
        reject(error)
      }
    })
  } catch (error) {
    console.error('Error generating payslip PDF:', error)
    throw new Error('Error al generar el desprendible de pago')
  }
}

/**
 * Generate the content of the payslip PDF
 */
async function generatePayslipContent(doc: PDFKit.PDFDocument, data: PayslipData) {
  const pageWidth = doc.page.width
  const pageHeight = doc.page.height
  const margin = 50
  const contentWidth = pageWidth - (margin * 2)
  
  let yPosition = margin

  // Try to add company logo
  try {
    const logoPath = await getAssetPathForPDF('logo')
    if (logoPath) {
      doc.image(logoPath, margin, yPosition, { width: 120, height: 40 })
    }
  } catch (error) {
    console.warn('Could not add logo to payslip:', error)
  }

  // Company info (right side of header)
  doc.fontSize(10)
     .text(data.company.name, pageWidth - margin - 200, yPosition, { width: 200, align: 'right' })
  
  if (data.company.nit) {
    doc.text(`NIT: ${data.company.nit}`, pageWidth - margin - 200, yPosition + 15, { width: 200, align: 'right' })
  }
  
  if (data.company.address) {
    doc.text(data.company.address, pageWidth - margin - 200, yPosition + 30, { width: 200, align: 'right' })
  }

  yPosition += 80

  // Payslip Title
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text('DESPRENDIBLE DE PAGO', margin, yPosition, { width: contentWidth, align: 'center' })

  yPosition += 30

  // Period info
  const periodName = data.period.period_name || `Período ${data.period.period_number}`
  doc.fontSize(12)
     .font('Helvetica')
     .text(`${periodName} - ${formatDate(data.period.start_date)} al ${formatDate(data.period.end_date)}`, 
           margin, yPosition, { width: contentWidth, align: 'center' })

  yPosition += 40

  // Employee Information Section
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('INFORMACIÓN DEL EMPLEADO', margin, yPosition)

  yPosition += 20

  // Employee details in two columns
  const leftCol = margin
  const rightCol = margin + (contentWidth / 2)

  doc.fontSize(10)
     .font('Helvetica')

  // Left column
  doc.text(`Nombre: ${data.employee.full_name}`, leftCol, yPosition)
  doc.text(`Cédula: ${data.employee.cedula}`, leftCol, yPosition + 15)
  doc.text(`Centro de Costo: ${data.employee.centro_costo}`, leftCol, yPosition + 30)
  doc.text(`Contrato: ${data.employee.contract_number}`, leftCol, yPosition + 45)

  // Right column
  if (data.employee.position) {
    doc.text(`Cargo: ${data.employee.position}`, rightCol, yPosition)
  }
  if (data.employee.department) {
    doc.text(`Departamento: ${data.employee.department}`, rightCol, yPosition + 15)
  }
  doc.text(`Fecha Ingreso: ${formatDate(data.employee.hire_date)}`, rightCol, yPosition + 30)
  doc.text(`Salario Base: ${formatCurrency(data.employee.base_salary)}`, rightCol, yPosition + 45)

  yPosition += 80

  // Concepts Section
  if (data.concepts && data.concepts.length > 0) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('DEVENGADO', margin, yPosition)

    yPosition += 20

    // Table headers
    doc.fontSize(10)
       .font('Helvetica-Bold')
    
    const conceptCodeX = margin
    const conceptNameX = margin + 60
    const daysHoursX = margin + 200
    const unitValueX = margin + 260
    const totalValueX = margin + 350

    doc.text('Código', conceptCodeX, yPosition)
    doc.text('Concepto', conceptNameX, yPosition)
    doc.text('Días/Horas', daysHoursX, yPosition)
    doc.text('Valor Unit.', unitValueX, yPosition)
    doc.text('Total', totalValueX, yPosition)

    yPosition += 15

    // Draw line under headers
    doc.moveTo(margin, yPosition)
       .lineTo(pageWidth - margin, yPosition)
       .stroke()

    yPosition += 10

    // Concept rows
    doc.font('Helvetica')
    for (const concept of data.concepts) {
      doc.text(concept.concept_code, conceptCodeX, yPosition)
      doc.text(concept.concept_name, conceptNameX, yPosition, { width: 130 })
      doc.text(concept.days_hours.toString(), daysHoursX, yPosition)
      doc.text(formatCurrency(concept.unit_value), unitValueX, yPosition)
      doc.text(formatCurrency(concept.total_value), totalValueX, yPosition)
      
      yPosition += 15
    }

    yPosition += 10
  }

  // Deductions Section
  if (data.deductions && data.deductions.length > 0) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('DEDUCCIONES', margin, yPosition)

    yPosition += 20

    // Table headers
    doc.fontSize(10)
       .font('Helvetica-Bold')
    
    const deductionCodeX = margin
    const deductionNameX = margin + 60
    const percentageX = margin + 200
    const baseValueX = margin + 260
    const totalValueX = margin + 350

    doc.text('Código', deductionCodeX, yPosition)
    doc.text('Concepto', deductionNameX, yPosition)
    doc.text('Porcentaje', percentageX, yPosition)
    doc.text('Base', baseValueX, yPosition)
    doc.text('Total', totalValueX, yPosition)

    yPosition += 15

    // Draw line under headers
    doc.moveTo(margin, yPosition)
       .lineTo(pageWidth - margin, yPosition)
       .stroke()

    yPosition += 10

    // Deduction rows
    doc.font('Helvetica')
    for (const deduction of data.deductions) {
      doc.text(deduction.concept_code, deductionCodeX, yPosition)
      doc.text(deduction.concept_name, deductionNameX, yPosition, { width: 130 })
      doc.text(deduction.percentage ? `${deduction.percentage}%` : '-', percentageX, yPosition)
      doc.text(deduction.base_value ? formatCurrency(deduction.base_value) : '-', baseValueX, yPosition)
      doc.text(formatCurrency(deduction.total_value), totalValueX, yPosition)
      
      yPosition += 15
    }

    yPosition += 10
  }

  // Summary Section
  yPosition += 20

  doc.fontSize(12)
     .font('Helvetica-Bold')

  const summaryX = pageWidth - margin - 200
  
  doc.text('RESUMEN:', summaryX - 50, yPosition)
  yPosition += 20

  doc.text('Total Devengado:', summaryX - 50, yPosition)
  doc.text(formatCurrency(data.summary.total_earned), summaryX + 80, yPosition, { align: 'right' })
  yPosition += 15

  doc.text('Total Deducciones:', summaryX - 50, yPosition)
  doc.text(formatCurrency(data.summary.total_deductions), summaryX + 80, yPosition, { align: 'right' })
  yPosition += 15

  // Line above net pay
  doc.moveTo(summaryX - 50, yPosition)
     .lineTo(summaryX + 130, yPosition)
     .stroke()

  yPosition += 10

  doc.fontSize(14)
     .text('NETO A PAGAR:', summaryX - 50, yPosition)
  doc.text(formatCurrency(data.summary.net_pay), summaryX + 80, yPosition, { align: 'right' })

  // Signature section (if representative info available)
  if (data.company.nombre_representante) {
    const signatureY = Math.max(yPosition + 60, pageHeight - 150)
    
    // Try to add signature
    try {
      const signaturePath = await getAssetPathForPDF('signature')
      if (signaturePath) {
        doc.image(signaturePath, margin + 50, signatureY - 40, { width: 120, height: 40 })
      }
    } catch (error) {
      console.warn('Could not add signature to payslip:', error)
    }

    // Signature line
    doc.moveTo(margin, signatureY + 20)
       .lineTo(margin + 200, signatureY + 20)
       .stroke()

    // Representative info
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text(data.company.nombre_representante.toUpperCase(), margin, signatureY + 30, { width: 200, align: 'center' })

    if (data.company.tipo_documento_representante && data.company.numero_documento_representante) {
      const docType = getDocumentTypeName(data.company.tipo_documento_representante)
      doc.fontSize(9)
         .font('Helvetica')
         .text(`${docType} ${data.company.numero_documento_representante}`, margin, signatureY + 45, { width: 200, align: 'center' })
    }

    doc.text('Representante Legal', margin, signatureY + 60, { width: 200, align: 'center' })
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Get document type name
 */
function getDocumentTypeName(type: string): string {
  const types: Record<string, string> = {
    'CC': 'C.C.',
    'CE': 'C.E.',
    'PP': 'Pasaporte',
    'NIT': 'NIT'
  }
  return types[type] || type
}

/**
 * Generate a payroll report PDF using PDFKit
 */
export async function generateReportPDF(data: ReportData): Promise<Uint8Array> {
  try {
    // Dynamic import to avoid client-side issues
    const PDFDocument = (await import('pdfkit')).default
    
    // Create new PDF document
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape', // Better for report tables
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    })

    // Buffer to collect PDF data
    const chunks: Uint8Array[] = []
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const result = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          result.set(chunk, offset)
          offset += chunk.length
        }
        resolve(result)
      })

      doc.on('error', reject)

      try {
        // Generate report content
        generateReportContent(doc, data)
        doc.end()
      } catch (error) {
        reject(error)
      }
    })
  } catch (error) {
    console.error('Error generating report PDF:', error)
    throw new Error('Error al generar el reporte de nómina')
  }
}

/**
 * Generate the content of the payroll report PDF
 */
async function generateReportContent(doc: PDFKit.PDFDocument, data: ReportData) {
  const pageWidth = doc.page.width
  const margin = 50
  const contentWidth = pageWidth - (margin * 2)
  
  let yPosition = margin

  // Report Title
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text('REPORTE DE NÓMINA', margin, yPosition, { width: contentWidth, align: 'center' })

  yPosition += 30

  // Period info
  const periodName = data.period?.period_name || `Período ${data.period?.period_number}`
  doc.fontSize(12)
     .font('Helvetica')
     .text(`${periodName}`, margin, yPosition, { width: contentWidth, align: 'center' })

  yPosition += 15

  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  doc.text(`Generado el ${currentDate}`, margin, yPosition, { width: contentWidth, align: 'center' })

  yPosition += 40

  // Summary section
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('RESUMEN GENERAL', margin, yPosition)

  yPosition += 20

  doc.fontSize(11)
     .font('Helvetica')
  
  const summaryLeftCol = margin
  const summaryRightCol = margin + (contentWidth / 2)

  doc.text(`Total Empleados: ${data.totals.totalEmployees}`, summaryLeftCol, yPosition)
  doc.text(`Total Devengado: ${formatCurrency(data.totals.totalConcepts)}`, summaryRightCol, yPosition)
  
  yPosition += 15

  doc.text(`Total Deducciones: ${formatCurrency(data.totals.totalDeductions)}`, summaryLeftCol, yPosition)
  doc.text(`Total Neto a Pagar: ${formatCurrency(data.totals.totalNet)}`, summaryRightCol, yPosition)

  yPosition += 40

  // Detailed table
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('DETALLE POR EMPLEADO', margin, yPosition)

  yPosition += 20

  // Table headers
  doc.fontSize(9)
     .font('Helvetica-Bold')
  
  const colWidths = {
    cedula: 80,
    nombre: 150,
    cargo: 100,
    salario: 80,
    devengado: 80,
    deducciones: 80,
    neto: 80
  }

  let xPosition = margin
  
  doc.text('Cédula', xPosition, yPosition)
  xPosition += colWidths.cedula
  
  doc.text('Nombre', xPosition, yPosition)
  xPosition += colWidths.nombre
  
  doc.text('Cargo', xPosition, yPosition)
  xPosition += colWidths.cargo
  
  doc.text('Salario Base', xPosition, yPosition)
  xPosition += colWidths.salario
  
  doc.text('Devengado', xPosition, yPosition)
  xPosition += colWidths.devengado
  
  doc.text('Deducciones', xPosition, yPosition)
  xPosition += colWidths.deducciones
  
  doc.text('Neto', xPosition, yPosition)

  yPosition += 15

  // Draw line under headers
  doc.moveTo(margin, yPosition)
     .lineTo(pageWidth - margin, yPosition)
     .stroke()

  yPosition += 10

  // Table rows
  doc.font('Helvetica')
  for (const summary of data.summaries) {
    xPosition = margin
    
    doc.text(summary.employees?.cedula || 'N/A', xPosition, yPosition, { width: colWidths.cedula - 5 })
    xPosition += colWidths.cedula
    
    doc.text(summary.employees?.full_name || 'N/A', xPosition, yPosition, { width: colWidths.nombre - 5 })
    xPosition += colWidths.nombre
    
    doc.text(summary.employees?.position || 'N/A', xPosition, yPosition, { width: colWidths.cargo - 5 })
    xPosition += colWidths.cargo
    
    doc.text(formatCurrency(summary.base_salary || 0), xPosition, yPosition, { width: colWidths.salario - 5 })
    xPosition += colWidths.salario
    
    doc.text(formatCurrency(summary.total_concepts || 0), xPosition, yPosition, { width: colWidths.devengado - 5 })
    xPosition += colWidths.devengado
    
    doc.text(formatCurrency(summary.total_deductions || 0), xPosition, yPosition, { width: colWidths.deducciones - 5 })
    xPosition += colWidths.deducciones
    
    doc.text(formatCurrency(summary.total_net || 0), xPosition, yPosition, { width: colWidths.neto - 5 })
    
    yPosition += 15

    // Check if we need a new page
    if (yPosition > doc.page.height - 100) {
      doc.addPage()
      yPosition = margin + 50
    }
  }
}

/**
 * Format payslip filename for download
 */
export function formatPayslipFilename(employeeName: string, periodNumber: number): string {
  const sanitizedName = employeeName.replace(/[^a-zA-Z0-9]/g, "_")
  return `desprendible_${sanitizedName}_periodo_${periodNumber}.pdf`
}


