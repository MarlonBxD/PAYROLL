import { getAssetPathForPDF } from './company-assets'

export interface CertificateData {
  employee: {
    cedula: string
    full_name: string
    email?: string
    phone?: string
    position?: string
  }
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
  period: {
    period_number: number
    period_name: string
    start_date: string
    end_date: string
  }
  payment: {
    gross_amount: number
    deductions: number
    net_amount: number
    services_description?: string
  }
}

/**
 * Generate a payment certificate PDF for OPS employees
 */
export async function generateCertificatePDF(certificateData: CertificateData): Promise<Uint8Array> {
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
        // Generate certificate content
        generateCertificateContent(doc, certificateData)
        doc.end()
      } catch (error) {
        reject(error)
      }
    })
  } catch (error) {
    console.error('Error generating certificate PDF:', error)
    throw new Error('Error al generar el certificado de pago')
  }
}

/**
 * Generate the content of the payment certificate
 */
async function generateCertificateContent(doc: PDFKit.PDFDocument, data: CertificateData) {
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
    console.warn('Could not add logo to certificate:', error)
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

  // Certificate Title
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text('CERTIFICADO DE PAGO DE SERVICIOS', margin, yPosition, { width: contentWidth, align: 'center' })

  yPosition += 40

  // Certificate Number (optional)
  const certificateNumber = `${data.period.period_number}-${data.employee.cedula}-${new Date().getFullYear()}`
  doc.fontSize(10)
     .font('Helvetica')
     .text(`Certificado No. ${certificateNumber}`, margin, yPosition, { width: contentWidth, align: 'center' })

  yPosition += 30

  // Main certificate text
  doc.fontSize(12)
     .font('Helvetica')
     .text('La empresa ', margin, yPosition)
  
  doc.font('Helvetica-Bold')
     .text(data.company.name.toUpperCase(), { continued: true })
  
  doc.font('Helvetica')
     .text(`, identificada con NIT ${data.company.nit}, CERTIFICA que:`, { continued: true })

  yPosition += 30

  doc.text(`El prestador de servicios `, margin, yPosition)
  
  doc.font('Helvetica-Bold')
     .text(data.employee.full_name.toUpperCase(), { continued: true })
  
  doc.font('Helvetica')
     .text(`, identificado(a) con cédula de ciudadanía No. ${data.employee.cedula}, `, { continued: true })

  yPosition += 20

  doc.text(`prestó servicios profesionales durante el período comprendido entre el `, margin, yPosition)
  
  doc.font('Helvetica-Bold')
     .text(formatDate(data.period.start_date), { continued: true })
  
  doc.font('Helvetica')
     .text(' y el ', { continued: true })
  
  doc.font('Helvetica-Bold')
     .text(formatDate(data.period.end_date), { continued: true })
  
  doc.font('Helvetica')
     .text('.', { continued: true })

  yPosition += 30

  // Services description (if available)
  if (data.payment.services_description) {
    doc.text(`Servicios prestados: ${data.payment.services_description}`, margin, yPosition)
    yPosition += 20
  }

  // Payment details table
  yPosition += 20
  
  // Table header
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .text('DETALLE DE PAGOS', margin, yPosition)

  yPosition += 20

  // Table content
  const tableY = yPosition
  const col1X = margin
  const col2X = margin + 200
  const col3X = margin + 350

  // Headers
  doc.font('Helvetica-Bold')
     .text('Concepto', col1X, tableY)
     .text('Valor', col2X, tableY, { align: 'right', width: 100 })

  yPosition += 20

  // Gross amount
  doc.font('Helvetica')
     .text('Valor bruto de servicios', col1X, yPosition)
     .text(formatCurrency(data.payment.gross_amount), col2X, yPosition, { align: 'right', width: 100 })

  yPosition += 15

  // Deductions (if any)
  if (data.payment.deductions > 0) {
    doc.text('Retenciones aplicadas', col1X, yPosition)
       .text(`-${formatCurrency(data.payment.deductions)}`, col2X, yPosition, { align: 'right', width: 100 })
    yPosition += 15
  }

  // Net amount
  doc.font('Helvetica-Bold')
     .text('Valor neto pagado', col1X, yPosition)
     .text(formatCurrency(data.payment.net_amount), col2X, yPosition, { align: 'right', width: 100 })

  yPosition += 40

  // Certificate footer text
  doc.fontSize(12)
     .font('Helvetica')
     .text('Se expide el presente certificado a solicitud del interesado para los fines que considere convenientes.', margin, yPosition, { width: contentWidth, align: 'justify' })

  yPosition += 30

  // Date and place
  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  doc.text(`Dado en la ciudad de Colombia, a los ${currentDate}.`, margin, yPosition)

  yPosition += 60

  // Signature section
  const signatureY = Math.max(yPosition, pageHeight - 150)
  
  // Try to add signature
  try {
    const signaturePath = await getAssetPathForPDF('signature')
    if (signaturePath) {
      doc.image(signaturePath, margin + 50, signatureY - 40, { width: 120, height: 40 })
    }
  } catch (error) {
    console.warn('Could not add signature to certificate:', error)
  }

  // Signature line
  doc.moveTo(margin, signatureY + 20)
     .lineTo(margin + 200, signatureY + 20)
     .stroke()

  // Representative info
  if (data.company.nombre_representante) {
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text(data.company.nombre_representante.toUpperCase(), margin, signatureY + 30, { width: 200, align: 'center' })
  }

  if (data.company.tipo_documento_representante && data.company.numero_documento_representante) {
    const docType = getDocumentTypeName(data.company.tipo_documento_representante)
    doc.fontSize(9)
       .font('Helvetica')
       .text(`${docType} ${data.company.numero_documento_representante}`, margin, signatureY + 45, { width: 200, align: 'center' })
  }

  doc.text('Representante Legal', margin, signatureY + 60, { width: 200, align: 'center' })
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
 * Format certificate filename for download
 */
export function formatCertificateFilename(employeeName: string, periodNumber: number): string {
  const sanitizedName = employeeName.replace(/[^a-zA-Z0-9]/g, "_")
  return `certificado_${sanitizedName}_periodo_${periodNumber}.pdf`
}