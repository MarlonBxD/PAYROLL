import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { periodId, employeeId } = await request.json()
    
    if (!periodId || !employeeId) {
      return NextResponse.json({ 
        error: 'periodId y employeeId son requeridos' 
      }, { status: 400 })
    }

    console.log('🔍 Diagnosticando datos para período:', periodId, 'empleado:', employeeId)

    // Use service role key for database operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // PASO 1: Verificar que exista el período
    const { data: periodData, error: periodError } = await supabaseAdmin
      .from('payroll_periods')
      .select('*')
      .eq('id', periodId)

    console.log('📅 Período encontrado:', periodData)
    if (periodError) console.error('❌ Error al buscar período:', periodError)

    // PASO 2: Verificar que exista el empleado
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', employeeId)

    console.log('👤 Empleado encontrado:', employeeData)
    if (employeeError) console.error('❌ Error al buscar empleado:', employeeError)

    // PASO 3: Verificar que exista el resumen de nómina
    const { data: summaryData, error: summaryError } = await supabaseAdmin
      .from('payroll_summary')
      .select('*')
      .eq('payroll_period_id', periodId)
      .eq('employee_id', employeeId)

    console.log('📊 Resumen de nómina encontrado:', summaryData)
    if (summaryError) console.error('❌ Error al buscar resumen:', summaryError)

    // PASO 4: Verificar que exista la empresa
    if (employeeData && employeeData.length > 0) {
      const companyId = employeeData[0].company_id
      console.log('🏢 Buscando empresa con ID:', companyId)

      const { data: companyData, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('id', companyId)

      console.log('🏢 Empresa encontrada:', companyData)
      if (companyError) console.error('❌ Error al buscar empresa:', companyError)
    }

    // PASO 5: Probar la función RPC
    console.log('🔧 Probando función RPC get_complete_payroll_data...')
    const { data: rpcData, error: rpcError } = await supabaseAdmin
      .rpc('get_complete_payroll_data', {
        p_period_id: periodId,
        p_employee_id: employeeId
      })

    console.log('🔧 Resultado RPC:', rpcData)
    if (rpcError) console.error('❌ Error en RPC:', rpcError)

    // PASO 6: Verificar conceptos y deducciones
    const { data: conceptsData, error: conceptsError } = await supabaseAdmin
      .from('payroll_concepts')
      .select('*')
      .eq('payroll_period_id', periodId)
      .eq('employee_id', employeeId)

    console.log('💰 Conceptos encontrados:', conceptsData?.length || 0)
    if (conceptsError) console.error('❌ Error al buscar conceptos:', conceptsError)

    const { data: deductionsData, error: deductionsError } = await supabaseAdmin
      .from('payroll_deductions')
      .select('*')
      .eq('payroll_period_id', periodId)
      .eq('employee_id', employeeId)

    console.log('💸 Deducciones encontradas:', deductionsData?.length || 0)
    if (deductionsError) console.error('❌ Error al buscar deducciones:', deductionsError)

    return NextResponse.json({
      success: true,
      diagnosis: {
        period: {
          found: !!periodData && periodData.length > 0,
          data: periodData?.[0] || null,
          error: periodError
        },
        employee: {
          found: !!employeeData && employeeData.length > 0,
          data: employeeData?.[0] || null,
          error: employeeError
        },
        company: {
          id: employeeData?.[0]?.company_id || null,
          found: false, // Se determina arriba
          data: null,   // Se determina arriba
          error: null   // Se determina arriba
        },
        summary: {
          found: !!summaryData && summaryData.length > 0,
          data: summaryData?.[0] || null,
          error: summaryError
        },
        rpc: {
          success: !rpcError,
          data: rpcData,
          error: rpcError
        },
        concepts: {
          count: conceptsData?.length || 0,
          error: conceptsError
        },
        deductions: {
          count: deductionsData?.length || 0,
          error: deductionsError
        }
      }
    })

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}