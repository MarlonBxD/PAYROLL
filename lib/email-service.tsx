// Email service utilities for sending payslips

export interface EmailConfig {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  fromEmail: string
  fromName: string
}

export interface PayslipEmailData {
  employeeName: string
  employeeEmail: string
  periodNumber: number
  companyName: string
  pdfBuffer: Buffer
}

export async function sendPayslipEmail(emailData: PayslipEmailData, config: EmailConfig): Promise<boolean> {
  try {
    // This would integrate with a real email service like:
    // - Nodemailer with SMTP
    // - SendGrid
    // - AWS SES
    // - Resend

    console.log("Sending payslip email to:", emailData.employeeEmail)
    console.log("Company:", emailData.companyName)
    console.log("Period:", emailData.periodNumber)

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    return true
  } catch (error) {
    console.error("Error sending email:", error)
    return false
  }
}

export function generateEmailTemplate(employeeName: string, companyName: string, periodNumber: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Desprendible de Pago</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>${companyName}</h2>
                <p>Desprendible de Pago</p>
            </div>
            
            <div class="content">
                <p>Estimado/a ${employeeName},</p>
                
                <p>Adjunto encontrará su desprendible de pago correspondiente al período #${periodNumber}.</p>
                
                <p>Si tiene alguna pregunta sobre su desprendible de pago, no dude en contactar al departamento de recursos humanos.</p>
                
                <p>Cordialmente,<br>
                Departamento de Recursos Humanos<br>
                ${companyName}</p>
            </div>
            
            <div class="footer">
                <p>Este es un mensaje automático, por favor no responda a este correo.</p>
            </div>
        </div>
    </body>
    </html>
  `
}
