import { Resend } from 'resend'

const resend = new Resend(process.env.RE_SEND_API_KEY)

export interface PayslipEmailData {
  employeeName: string
  employeeEmail: string
  period: string
  companyName: string
  pdfBuffer: Buffer
  contractType: 'NOMINA' | 'OPS'
  periodNumber: number
}

export async function sendPayslipEmail(data: PayslipEmailData): Promise<boolean> {
  try {
    const { employeeName, employeeEmail, period, companyName, pdfBuffer, contractType, periodNumber } = data
    
    // Determinar tipo de documento y contenido del email
    const isNomina = contractType === 'NOMINA'
    const documentType = isNomina ? 'Desprendible de Pago' : 'Certificado de Pago de Servicios'
    const fileName = isNomina 
      ? `desprendible_${employeeName.replace(/\s+/g, '_')}_periodo_${periodNumber}.pdf`
      : `certificado_${employeeName.replace(/\s+/g, '_')}_periodo_${periodNumber}.pdf`
    
    const subject = `${documentType} - ${period} - ${companyName}`
    
    // Template de email diferenciado
    const htmlContent = isNomina ? getNominaEmailTemplate(data) : getOpsEmailTemplate(data)
    
    console.log(`Sending email to ${employeeEmail} with subject: ${subject}`)
    
    const { data: result, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'sistemasciot@gmail.com',
      to: [employeeEmail],
      subject: subject,
      html: htmlContent,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
        },
      ],
    })

    if (error) {
      console.error('Error sending email via Resend:', error)
      return false
    }

    console.log('Email sent successfully via Resend:', result?.id)
    return true
  } catch (error) {
    console.error('Error in sendPayslipEmail:', error)
    return false
  }
}

function getNominaEmailTemplate({ employeeName, period, companyName }: PayslipEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Desprendible de Pago</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        .header h2 {
          color: #2563eb;
          margin: 0;
        }
        .content {
          margin-bottom: 30px;
        }
        .highlight {
          background-color: #eff6ff;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
        }
        ul {
          padding-left: 20px;
        }
        li {
          margin-bottom: 8px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
        .signature {
          margin-top: 20px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>📋 Desprendible de Pago</h2>
        <p style="margin: 5px 0 0 0; color: #6b7280;">${companyName}</p>
      </div>
      
      <div class="content">
        <p>Estimado/a <strong>${employeeName}</strong>,</p>
        
        <div class="highlight">
          <p><strong>¡Su desprendible de pago está listo!</strong></p>
          <p>Adjunto encontrará su desprendible de pago correspondiente al <strong>${period}</strong>.</p>
        </div>
        
        <p>En el documento adjunto podrá revisar:</p>
        <ul>
          <li><strong>Conceptos de pago:</strong> Salario base, bonificaciones, horas extras, etc.</li>
          <li><strong>Deducciones:</strong> Seguridad social, retenciones, aportes, etc.</li>
          <li><strong>Valor neto a pagar:</strong> Cantidad que será consignada</li>
          <li><strong>Información bancaria:</strong> Detalles de su cuenta para consignación</li>
        </ul>
        
        <p>Si tiene alguna pregunta o inquietud sobre su desprendible de pago, no dude en contactar al departamento de recursos humanos.</p>
        
        <div class="signature">
          <p>Cordialmente,</p>
          <p><strong>${companyName}</strong><br>
          Departamento de Recursos Humanos</p>
        </div>
      </div>
      
      <div class="footer">
        <p><strong>Nota importante:</strong> Este es un mensaje automático, por favor no responda a este correo.</p>
        <p>Para consultas, contacte directamente al departamento de recursos humanos.</p>
      </div>
    </body>
    </html>
  `
}

function getOpsEmailTemplate({ employeeName, period, companyName }: PayslipEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Certificado de Pago de Servicios</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background-color: #f0fdf4;
          border-radius: 8px;
        }
        .header h2 {
          color: #059669;
          margin: 0;
        }
        .content {
          margin-bottom: 30px;
        }
        .highlight {
          background-color: #f0fdf4;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
          border-left: 4px solid #10b981;
        }
        ul {
          padding-left: 20px;
        }
        li {
          margin-bottom: 8px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
        .signature {
          margin-top: 20px;
          font-weight: bold;
        }
        .legal-note {
          background-color: #fef3c7;
          padding: 12px;
          border-radius: 6px;
          margin-top: 15px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>📄 Certificado de Pago de Servicios</h2>
        <p style="margin: 5px 0 0 0; color: #6b7280;">${companyName}</p>
      </div>
      
      <div class="content">
        <p>Estimado/a <strong>${employeeName}</strong>,</p>
        
        <div class="highlight">
          <p><strong>¡Su certificado de pago está listo!</strong></p>
          <p>Adjunto encontrará el certificado de pago por los servicios prestados durante el <strong>${period}</strong>.</p>
        </div>
        
        <p>El documento certifica oficialmente:</p>
        <ul>
          <li><strong>Los servicios profesionales prestados</strong> durante el período indicado</li>
          <li><strong>El período exacto</strong> de prestación del servicio</li>
          <li><strong>El valor acordado</strong> por los servicios profesionales</li>
          <li><strong>Las retenciones aplicables</strong> según la normativa vigente</li>
          <li><strong>El valor neto a pagar</strong> después de retenciones</li>
        </ul>
        
        <div class="legal-note">
          <p><strong>💡 Importante:</strong> Este certificado puede ser utilizado para:</p>
          <ul style="margin: 10px 0;">
            <li>Sus declaraciones tributarias</li>
            <li>Soporte de ingresos profesionales</li>
            <li>Certificación de servicios prestados</li>
          </ul>
        </div>
        
        <p>Si requiere información adicional, aclaraciones o copias adicionales de este certificado, puede contactarnos.</p>
        
        <div class="signature">
          <p>Cordialmente,</p>
          <p><strong>${companyName}</strong><br>
          Departamento Administrativo</p>
        </div>
      </div>
      
      <div class="footer">
        <p><strong>Nota importante:</strong> Este es un mensaje automático, por favor no responda a este correo.</p>
        <p>Para consultas sobre servicios prestados, contacte al departamento administrativo.</p>
      </div>
    </body>
    </html>
  `
}

// Función para envío masivo
export async function sendBulkPayslips(
  employees: any[], 
  periodId: string,
  periodName: string,
  companyName: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] }
  
  console.log(`Starting bulk email send for ${employees.length} employees`)
  
  for (const employee of employees) {
    try {
      if (!employee.email) {
        results.failed++
        results.errors.push(`${employee.full_name}: Sin email configurado`)
        continue
      }
      
      // Generar PDF para cada empleado usando el API
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employee.id,
          periodId: periodId,
        }),
      })

      if (!response.ok) {
        results.failed++
        results.errors.push(`${employee.full_name}: Error generando documento`)
        continue
      }

      const pdfBuffer = Buffer.from(await response.arrayBuffer())
      const contractType = response.headers.get('X-Contract-Type') as 'NOMINA' | 'OPS' || 'NOMINA'
      
      const success = await sendPayslipEmail({
        employeeName: employee.full_name,
        employeeEmail: employee.email,
        period: periodName,
        companyName,
        pdfBuffer,
        contractType,
        periodNumber: parseInt(periodName.replace(/\D/g, '')) || 1
      })
      
      if (success) {
        results.success++
        console.log(`✅ Email sent to ${employee.full_name} (${employee.email})`)
      } else {
        results.failed++
        results.errors.push(`${employee.full_name}: Error al enviar email`)
        console.log(`❌ Failed to send email to ${employee.full_name}`)
      }
      
      // Delay entre envíos para no sobrecargar el servicio (1 segundo)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      results.failed++
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      results.errors.push(`${employee.full_name}: ${errorMessage}`)
      console.log(`❌ Error processing ${employee.full_name}: ${errorMessage}`)
    }
  }
  
  console.log(`Bulk email send completed: ${results.success} success, ${results.failed} failed`)
  return results
}