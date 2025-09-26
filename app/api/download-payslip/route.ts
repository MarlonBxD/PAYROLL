import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generatePayslipPDF, formatPayslipFilename } from '@/lib/pdf-generator'
import { generateCertificatePDF, formatCertificateFilename, CertificateData } from '@/lib/certificate-generator'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get('periodId')
    const employeeId = searchParams.get('employeeId')
    
    if (!periodId || !employeeId) {
      return NextResponse.json({ 
        error: 'periodId y employeeId son requeridos' 
      }, { status: 400 })
    }

    console.log('🔍 Generando desprendible para período:', periodId, 'empleado:', employeeId)

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
      console.error('❌ Error calling get_complete_payroll_data RPC:', rpcError)
      return NextResponse.json({ 
        error: `Error al obtener datos de nómina: ${rpcError.message}`,
        details: rpcError
      }, { status: 500 })
    }

    if (!payrollData) {
      console.error('❌ No payroll data found for period:', periodId, 'employee:', employeeId)
      return NextResponse.json({ 
        error: `No se encontraron datos de nómina para este período y empleado`
      }, { status: 404 })
    }

    console.log('✅ Found payroll data:', {
      company: payrollData.company?.name,
      employee: payrollData.employee?.full_name,
      period: payrollData.period?.period_number,
      contractType: payrollData.employee?.contract_type
    })

    const data = payrollData

    // Get company data with all details
    const { data: companiesData, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', data.company.id)

    if (companyError) {
      console.error('❌ Error fetching company data:', companyError)
      return NextResponse.json({ 
        error: `Error al obtener datos de la empresa: ${companyError.message}` 
      }, { status: 500 })
    }

    if (!companiesData || companiesData.length === 0) {
      console.error('❌ Company not found for ID:', data.company.id)
      return NextResponse.json({ 
        error: 'No se encontraron datos de la empresa' 
      }, { status: 404 })
    }

    const companyData = companiesData[0]

    // Determine document type based on contract_type
    const contractType = data.employee.contract_type || 'NOMINA'
    let pdfBuffer: Uint8Array
    let fileName: string
    let documentType: string

    console.log('📄 Generando documento tipo:', contractType)

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
      fileName = formatCertificateFilename(data.employee.full_name, data.period.period_number)
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
      fileName = formatPayslipFilename(data.employee.full_name, data.period.period_number)
      documentType = 'Desprendible de Pago'
    }

    console.log('✅ PDF generado exitosamente:', {
      documentType,
      fileName,
      employeeName: data.employee.full_name,
      size: pdfBuffer.length
    })

    // Return PDF as download
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Error generating payslip download:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor al generar el desprendible',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { periodId, employeeId } = await request.json()
    
    if (!periodId || !employeeId) {
      return NextResponse.json({ 
        error: 'periodId y employeeId son requeridos' 
      }, { status: 400 })
    }

    console.log('🔍 Generando desprendible (POST) para período:', periodId, 'empleado:', employeeId)

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
      console.error('❌ Error calling get_complete_payroll_data RPC:', rpcError)
      return NextResponse.json({ 
        error: `Error al obtener datos de nómina: ${rpcError.message}`,
        details: rpcError
      }, { status: 500 })
    }

    if (!payrollData) {
      console.error('❌ No payroll data found for period:', periodId, 'employee:', employeeId)
      return NextResponse.json({ 
        error: `No se encontraron datos de nómina para este período y empleado`
      }, { status: 404 })
    }

    const data = payrollData

    // Get company data with all details
    const { data: companiesData, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', data.company.id)

    if (companyError || !companiesData || companiesData.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron datos de la empresa' 
      }, { status: 404 })
    }

    const companyData = companiesData[0]
    const contractType = data.employee.contract_type || 'NOMINA'
    let pdfBuffer: Uint8Array
    let fileName: string

    if (contractType === 'OPS') {
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
      fileName = formatCertificateFilename(data.employee.full_name, data.period.period_number)
    } else {
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
      fileName = formatPayslipFilename(data.employee.full_name, data.period.period_number)
    }

    // Return PDF as base64 for programmatic handling
    const base64PDF = Buffer.from(pdfBuffer).toString('base64')

    return NextResponse.json({
      success: true,
      fileName: fileName,
      pdf: base64PDF,
      size: pdfBuffer.length,
      employeeName: data.employee.full_name,
      contractType: contractType
    })

  } catch (error) {
    console.error('❌ Error generating payslip (POST):', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor al generar el desprendible',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}