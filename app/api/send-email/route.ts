import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPayslipEmail } from '@/lib/email-service'
import { generatePayslipPDF, formatPayslipFilename } from '@/lib/pdf-generator'
import { generateCertificatePDF, formatCertificateFilename, CertificateData } from '@/lib/certificate-generator'

export async function POST(request: NextRequest) {
  try {
    const { periodId, employeeId } = await request.json()
    
    if (!periodId || !employeeId) {
      return NextResponse.json({ 
        error: 'periodId y employeeId son requeridos' 
      }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('Fetching payroll data for period:', periodId, 'employee:', employeeId)

    // Use service role key for database operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Use the RPC function to get complete payroll data
    const { data: payrollData, error: rpcError } = await supabaseAdmin
      .rpc('get_complete_payroll_data', {
        p_period_id: periodId,
        p_employee_id: employeeId
      })

    if (rpcError) {
      console.error('Error calling get_complete_payroll_data RPC:', rpcError)
      return NextResponse.json({ 
        error: `Error al obtener datos de nómina: ${rpcError.message}`,
        details: rpcError
      }, { status: 500 })
    }

    if (!payrollData) {
      console.error('No payroll data found for period:', periodId, 'employee:', employeeId)
      
      // Debug: Let's see what data exists
      const { data: debugSummary } = await supabaseAdmin
        .from('payroll_summary')
        .select('id, payroll_period_id, employee_id')
        .limit(5)
      
      console.log('Available summaries (first 5):', debugSummary)
      
      return NextResponse.json({ 
        error: `No se encontraron datos de nómina para este período y empleado. Período: ${periodId}, Empleado: ${employeeId}`,
        debug: debugSummary
      }, { status: 404 })
    }

    console.log('Found payroll data:', {
      company: payrollData.company?.name,
      employee: payrollData.employee?.full_name,
      period: payrollData.period?.period_number
    })

    const data = payrollData
    
    if (!data.employee.email) {
      return NextResponse.json({ 
        error: 'El empleado no tiene email configurado' 
      }, { status: 400 })
    }

    console.log('Sending email for employee:', data.employee.full_name, data.employee.email)

    // Get company data with representative info
    const { data: companiesData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', data.company.id)

    if (companyError) {
      console.error('Error fetching company data:', companyError)
      return NextResponse.json({ 
        error: `Error al obtener datos de la empresa: ${companyError.message}` 
      }, { status: 500 })
    }

    if (!companiesData || companiesData.length === 0) {
      console.error('Company not found for ID:', data.company.id)
      return NextResponse.json({ 
        error: 'No se encontraron datos de la empresa' 
      }, { status: 404 })
    }

    const companyData = companiesData[0]

    // Determine document type based on contract_type
    const contractType = data.employee.contract_type || 'NOMINA'
    let pdfBuffer: Uint8Array
    let documentType: string

    if (contractType === 'OPS') {
      // Generate payment certificate for OPS employees
      const certificateData: CertificateData = {
        employee: {
          cedula: data.employee.cedula,
          full_name: data.employee.full_name,
          email: data.employee.email,
          phone: data.employee.phone,
          position: data.employee.position
        },
        company: {
          name: companyData.name,
          nit: companyData.nit,
          address: companyData.address,
          phone: companyData.phone,
          email: companyData.email,
          nombre_representante: companyData.nombre_representante,
          tipo_documento_representante: companyData.tipo_documento_representante,
          numero_documento_representante: companyData.numero_documento_representante
        },
        period: {
          period_number: data.period.period_number,
          period_name: `Período ${data.period.period_number}`,
          start_date: data.period.start_date,
          end_date: data.period.end_date
        },
        payment: {
          gross_amount: data.summary.total_earned,
          deductions: data.summary.total_deductions,
          net_amount: data.summary.net_pay,
          services_description: `Servicios profesionales como ${data.employee.position || 'Contratista'}`
        }
      }

      pdfBuffer = await generateCertificatePDF(certificateData)
      documentType = 'Certificado de Pago'
    } else {
      // Generate payslip for NÓMINA employees
      const payslipData = {
        company: {
          name: companyData.name,
          nit: companyData.nit,
          address: companyData.address,
          phone: companyData.phone,
          email: companyData.email,
          nombre_representante: companyData.nombre_representante,
          tipo_documento_representante: companyData.tipo_documento_representante,
          numero_documento_representante: companyData.numero_documento_representante
        },
        employee: {
          cedula: data.employee.cedula,
          full_name: data.employee.full_name,
          banco: data.employee.bank_name,
          account_number: data.employee.account_number,
          centro_costo: data.employee.centro_costo,
          contract_number: data.employee.contract_number,
          hire_date: data.employee.hire_date,
          salary_type: data.employee.salary_type,
          base_salary: data.employee.base_salary,
          email: data.employee.email,
          phone: data.employee.phone,
          position: data.employee.position,
          department: data.employee.department,
          contract_type: data.employee.contract_type
        },
        period: {
          period_number: data.period.period_number,
          start_date: data.period.start_date,
          end_date: data.period.end_date,
          period_name: `Período ${data.period.period_number}`
        },
        concepts: data.concepts || [],
        deductions: data.deductions || [],
        summary: {
          total_earned: data.summary.total_earned,
          total_deductions: data.summary.total_deductions,
          net_pay: data.summary.net_pay
        }
      }

      pdfBuffer = await generatePayslipPDF(payslipData)
      documentType = 'Desprendible de Pago'
    }

    // Send email
    const success = await sendPayslipEmail({
      employeeName: data.employee.full_name,
      employeeEmail: data.employee.email,
      period: `Período ${data.period.period_number}`,
      companyName: companyData.name,
      pdfBuffer: Buffer.from(pdfBuffer),
      contractType: contractType as 'NOMINA' | 'OPS',
      periodNumber: data.period.period_number
    })

    if (success) {
      // Update payslip_sent status
      await supabase
        .from('payroll_summary')
        .update({
          payslip_sent: true,
          payslip_sent_at: new Date().toISOString(),
        })
        .eq('payroll_period_id', periodId)
        .eq('employee_id', employeeId)

      return NextResponse.json({ 
        message: 'Email enviado exitosamente',
        documentType: documentType,
        contractType: contractType,
        employeeName: data.employee.full_name,
        employeeEmail: data.employee.email
      })
    } else {
      return NextResponse.json({ 
        error: 'Error al enviar el email' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error sending payslip:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}