import { NextRequest, NextResponse } from 'next/server'
import { sendPayslipEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()
    
    if (!email || !name) {
      return NextResponse.json({ 
        error: 'email y name son requeridos' 
      }, { status: 400 })
    }

    console.log(`Sending test email to ${email} for ${name}`)

    // Create a test PDF buffer
    const testPDFContent = `
      DOCUMENTO DE PRUEBA
      
      Empleado: ${name}
      Fecha: ${new Date().toLocaleDateString()}
      
      Este es un documento de prueba para verificar
      que el sistema de email está funcionando correctamente.
    `
    
    const testPDFBuffer = Buffer.from(testPDFContent, 'utf-8')

    // Send test email
    const success = await sendPayslipEmail({
      employeeName: name,
      employeeEmail: email,
      period: 'Período de Prueba',
      companyName: 'Centro Integrado de Ortopedia y Traumatología S.A.S',
      pdfBuffer: testPDFBuffer,
      contractType: 'NOMINA',
      periodNumber: 999
    })

    if (success) {
      return NextResponse.json({ 
        message: 'Email de prueba enviado exitosamente',
        recipient: email,
        name: name
      })
    } else {
      return NextResponse.json({ 
        error: 'Error al enviar el email de prueba' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in test email:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}