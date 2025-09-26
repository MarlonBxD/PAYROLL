import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generatePayslipPDF, formatPayslipFilename } from '@/lib/pdf-generator'
import { generateCertificatePDF, formatCertificateFilename, CertificateData } from '@/lib/certificate-generator'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { employeeId, periodId } = await request.json()

    if (!employeeId || !periodId) {
      return NextResponse.json({ 
        error: 'employeeId y periodId son requeridos' 
      }, { status: 400 })
    }

    // Get company info
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ 
        error: 'Usuario no asociado a una empresa' 
      }, { status: 400 })
    }

    // Get complete payroll data
    const { data: payrollData, error: payrollError } = await supabase
      .rpc('get_complete_payroll_data', {
        p_period_id: periodId,
        p_employee_id: employeeId
      })

    if (payrollError || !payrollData || payrollData.length === 0) {
      console.error('Error fetching payroll data:', payrollError)
      return NextResponse.json({ 
        error: 'No se encontraron datos de nómina' 
      }, { status: 404 })
    }

    const data = payrollData[0]
    
    // Log data for debugging
    console.log('Generating document for:', data)

    // Get company data with representative info
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single()

    if (companyError || !companyData) {
      console.error('Error fetching company data:', companyError)
      return NextResponse.json({ 
        error: 'No se encontraron datos de la empresa' 
      }, { status: 404 })
    }

    // Determine document type based on contract_type
    const contractType = data.employee.contract_type || 'NOMINA'
    let pdfBuffer: Uint8Array
    let filename: string
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
      filename = formatCertificateFilename(data.employee.full_name, data.period.period_number)
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
      filename = formatPayslipFilename(data.employee.full_name, data.period.period_number)
      documentType = 'Desprendible de Pago'
    }

    // Return PDF as response
    const responseBuffer = Buffer.from(pdfBuffer)
    return new NextResponse(responseBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': responseBuffer.length.toString(),
        'X-Document-Type': documentType,
        'X-Contract-Type': contractType
      }
    })

  } catch (error) {
    console.error('Error generating document:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}