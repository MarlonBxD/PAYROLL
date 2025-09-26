import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPayslipEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { periodId, employeeIds } = await request.json()
    
    if (!periodId || !employeeIds || !Array.isArray(employeeIds)) {
      return NextResponse.json({ 
        error: 'periodId y employeeIds (array) son requeridos' 
      }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('Searching for period:', periodId)

    // Get period info - first without .single() to see what we get
    const { data: periodsData, error: periodError } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('id', periodId)

    if (periodError) {
      console.error('Error fetching period:', periodError)
      return NextResponse.json({ 
        error: `Error al buscar período: ${periodError.message}`,
        details: periodError
      }, { status: 500 })
    }

    if (!periodsData || periodsData.length === 0) {
      console.error('Period not found for ID:', periodId)
      
      // Debug: List all periods to help identify the issue
      const { data: allPeriods } = await supabase
        .from('payroll_periods')
        .select('id, period_number, status')
        .limit(10)
      
      console.log('Available periods:', allPeriods)
      
      return NextResponse.json({ 
        error: `Período no encontrado. ID buscado: ${periodId}. Períodos disponibles: ${allPeriods?.map(p => `${p.id} (${p.period_number})`).join(', ')}` 
      }, { status: 404 })
    }

    if (periodsData.length > 1) {
      console.warn('Multiple periods found for ID:', periodId, 'Count:', periodsData.length)
    }

    const periodData = periodsData[0]
    console.log('Period found:', periodData)

    // Get company info
    const { data: companiesData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', periodData.company_id)

    if (companyError) {
      console.error('Error fetching company:', companyError)
      return NextResponse.json({ 
        error: `Error al obtener empresa: ${companyError.message}` 
      }, { status: 500 })
    }

    if (!companiesData || companiesData.length === 0) {
      console.error('Company not found for ID:', periodData.company_id)
      return NextResponse.json({ 
        error: 'Empresa no encontrada' 
      }, { status: 404 })
    }

    const companyData = companiesData[0]
    console.log('Company found:', companyData.name)

    // Get employees with payroll summary info
    const { data: employeesData, error: employeesError } = await supabase
      .from('payroll_summary')
      .select(`
        *,
        employees (
          id,
          full_name,
          email,
          contract_type
        )
      `)
      .eq('payroll_period_id', periodId)
      .in('employee_id', employeeIds)

    if (employeesError || !employeesData) {
      console.error('Error fetching employees:', employeesError)
      return NextResponse.json({ 
        error: 'Error al obtener datos de empleados' 
      }, { status: 500 })
    }

    // Transform data for bulk sending
    const employees = employeesData.map(summary => ({
      id: summary.employee_id,
      full_name: summary.employees?.full_name,
      email: summary.employees?.email,
      contract_type: summary.employees?.contract_type
    }))

    console.log(`Starting bulk email send for period ${periodData.period_number} to ${employees.length} employees`)

    // Send bulk emails - inline implementation
    const results = { success: 0, failed: 0, errors: [] as string[] }
    const successfulEmployeeIds: string[] = []
    
    for (const employee of employees) {
      try {
        if (!employee.email) {
          results.failed++
          results.errors.push(`${employee.full_name}: Sin email configurado`)
          continue
        }
        
        // Generar PDF para cada empleado usando el API interno
        const docResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employeeId: employee.id,
            periodId: periodId,
          }),
        })

        if (!docResponse.ok) {
          results.failed++
          results.errors.push(`${employee.full_name}: Error generando documento`)
          continue
        }

        const pdfBuffer = Buffer.from(await docResponse.arrayBuffer())
        const contractType = docResponse.headers.get('X-Contract-Type') as 'NOMINA' | 'OPS' || 'NOMINA'
        
        const success = await sendPayslipEmail({
          employeeName: employee.full_name,
          employeeEmail: employee.email,
          period: `Período ${periodData.period_number}`,
          companyName: companyData.name,
          pdfBuffer,
          contractType,
          periodNumber: periodData.period_number
        })
        
        if (success) {
          results.success++
          successfulEmployeeIds.push(employee.id)
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

    // Update payslip_sent status for successful sends
    if (successfulEmployeeIds.length > 0) {
      await supabase
        .from('payroll_summary')
        .update({
          payslip_sent: true,
          payslip_sent_at: new Date().toISOString(),
        })
        .eq('payroll_period_id', periodId)
        .in('employee_id', successfulEmployeeIds)
    }

    // Update period status if all emails were sent
    if (results.success === employees.length) {
      await supabase
        .from('payroll_periods')
        .update({ status: 'ENVIADA' })
        .eq('id', periodId)
    }

    return NextResponse.json({
      message: 'Proceso de envío masivo completado',
      results: {
        total: employees.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors
      },
      periodUpdated: results.success === employees.length
    })

  } catch (error) {
    console.error('Error in bulk email send:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}