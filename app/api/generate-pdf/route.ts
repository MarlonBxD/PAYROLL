import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import { PayslipPDF } from '@/components/payslip-pdf'
import { CertificatePDF } from '@/components/certificate-pdf'
import React from 'react'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const periodId = searchParams.get('periodId')

    console.log('PDF Generation Request:', { employeeId, periodId })

    if (!employeeId || !periodId) {
      return NextResponse.json(
        { error: 'employeeId and periodId are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch payroll data
    const { data: payrollData, error: payrollError } = await supabase
      .from('payroll_summary')
      .select(`
        *,
        employees(*),
        payroll_periods(*)
      `)
      .eq('employee_id', employeeId)
      .eq('payroll_period_id', periodId)
      .single()

    console.log('Payroll query result:', { payrollData, payrollError })

    if (payrollError || !payrollData) {
      console.log('No payroll data found, error:', payrollError)
      return NextResponse.json(
        { error: 'Payroll data not found', details: payrollError },
        { status: 404 }
      )
    }

    // Get company data
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', payrollData.employees?.company_id)
      .single()

    // Get payroll concepts and deductions
    const { data: concepts } = await supabase
      .from('payroll_concepts')
      .select('*')
      .eq('payroll_period_id', periodId)
      .eq('employee_id', employeeId)

    const { data: deductions } = await supabase
      .from('payroll_deductions')
      .select('*')
      .eq('payroll_period_id', periodId)
      .eq('employee_id', employeeId)

    // Prepare data for PDF component
    const pdfData = {
      company: companyData,
      period: payrollData.payroll_periods,
      employee: payrollData.employees,
      summary: payrollData,
      concepts: concepts || [],
      deductions: deductions || []
    }

    // Determine document type based on contract type
    const contractType = payrollData.employees?.contract_type || 'NOMINA'
    const isOPS = contractType === 'OPS'
    
    console.log('Contract type detected:', contractType, 'Using OPS certificate:', isOPS)

    // Create PDF document using appropriate component
    const document = React.createElement(
      isOPS ? CertificatePDF : PayslipPDF, 
      { data: pdfData }
    ) as any

    // Generate PDF using renderToStream
    const stream = await renderToStream(document)
    const chunks: Uint8Array[] = []
    
    return new Promise<NextResponse>((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks)
        const documentName = isOPS ? 'certificado_pago' : 'desprendible'
        const fileName = `${documentName}-${payrollData.employees?.full_name?.replace(/\s+/g, '_') || 'empleado'}-periodo_${payrollData.payroll_periods?.period_number}.pdf`
        
        resolve(new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName}"`
          }
        }))
      })
      stream.on('error', reject)
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}