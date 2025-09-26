import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    console.log('🔍 Generando desprendible simple para período:', periodId, 'empleado:', employeeId)

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
    const contractType = data.employee.contract_type || 'NOMINA'

    console.log('📄 Generando documento tipo:', contractType)

    // Generate simple HTML content instead of PDF for now
    const documentType = contractType === 'OPS' ? 'Certificado de Pago' : 'Desprendible de Pago'
    
    const htmlContent = generateSimpleHTML({
      company: companyData,
      employee: data.employee,
      period: data.period,
      concepts: data.concepts || [],
      deductions: data.deductions || [],
      summary: data.summary,
      documentType,
      contractType
    })

    // Return HTML for now instead of PDF
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="desprendible_${data.employee.full_name.replace(/[^a-zA-Z0-9]/g, "_")}_periodo_${data.period.period_number}.html"`,
      }
    })

  } catch (error) {
    console.error('❌ Error generating payslip:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor al generar el desprendible',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

function generateSimpleHTML(data: any): string {
  const { company, employee, period, concepts, deductions, summary, documentType, contractType } = data
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${documentType} - ${employee.full_name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            color: #333;
        }
        .header {
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
        }
        .logo-section {
            flex: 0 0 120px;
        }
        .company-logo {
            max-width: 120px;
            max-height: 80px;
            object-fit: contain;
        }
        .title-section {
            flex: 1;
            text-align: center;
        }
        .company-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .employee-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h3 {
            background: #007bff;
            color: white;
            padding: 10px;
            margin: 0 0 15px 0;
            border-radius: 3px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
        }
        .summary {
            background: #e9f7ef;
            border: 2px solid #28a745;
            border-radius: 5px;
            padding: 20px;
            text-align: center;
        }
        .summary h3 {
            background: #28a745;
            color: white;
            margin: -20px -20px 15px -20px;
            padding: 15px;
            border-radius: 3px 3px 0 0;
        }
        .amount {
            font-weight: bold;
            font-size: 1.1em;
        }
        .net-pay {
            font-size: 1.5em;
            color: #28a745;
            font-weight: bold;
            border-top: 2px solid #28a745;
            padding-top: 10px;
            margin-top: 15px;
        }
        .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            page-break-inside: avoid;
        }
        .signature-box {
            text-align: center;
            width: 250px;
        }
        .signature-image {
            max-width: 150px;
            max-height: 60px;
            object-fit: contain;
            margin-bottom: 10px;
        }
        .signature-line {
            border-bottom: 1px solid #333;
            margin-bottom: 5px;
            height: 40px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
        }
        .signature-text {
            font-size: 0.9em;
            color: #666;
        }
        .signature-name {
            font-weight: bold;
            color: #333;
            margin-bottom: 3px;
        }
        .action-buttons {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            flex-direction: column;
        }
        .print-btn, .download-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9em;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .print-btn:hover, .download-btn:hover {
            background: #0056b3;
        }
        .download-btn {
            background: #28a745;
        }
        .download-btn:hover {
            background: #1e7e34;
        }
        @media print {
            .action-buttons { display: none; }
            body { margin: 0; padding: 15px; }
            .signature-section { margin-top: 40px; }
            .header-content { flex-wrap: wrap; }
            .logo-section { flex: 0 0 100px; }
            .company-logo { max-width: 100px; max-height: 60px; }
        }
        @media (max-width: 768px) {
            .header-content { 
                flex-direction: column; 
                text-align: center; 
            }
            .logo-section { 
                flex: none; 
                margin-bottom: 15px; 
            }
            .employee-info { 
                grid-template-columns: 1fr; 
                gap: 15px; 
            }
            .signature-section { 
                flex-direction: column; 
                gap: 30px; 
                align-items: center; 
            }
            table { font-size: 0.85em; }
            th, td { padding: 6px 8px; }
        }
    </style>
</head>
<body>
    <div class="action-buttons">
        <button class="print-btn" onclick="printDocument()">🖨️ Imprimir / Guardar como PDF</button>
        <button class="download-btn" onclick="downloadAsHTML()">💾 Descargar HTML</button>
    </div>
    
    <div class="header">
        <div class="header-content">
            <div class="logo-section">
                <img src="/placeholders/default-logo.png" alt="Logo de la empresa" class="company-logo" onerror="this.style.display='none'">
            </div>
            <div class="title-section">
                <h1>${documentType}</h1>
                <h2>${period.period_name || `Período ${period.period_number}`}</h2>
                <p>Del ${formatDate(period.start_date)} al ${formatDate(period.end_date)}</p>
            </div>
        </div>
    </div>

    <div class="company-info">
        <h3>Información de la Empresa</h3>
        <strong>${company.name}</strong><br>
        ${company.nit ? `NIT: ${company.nit}` : ''}<br>
        ${company.address || ''}<br>
        ${company.phone || ''} ${company.email || ''}
    </div>

    <div class="employee-info">
        <div>
            <h3>Información del ${contractType === 'OPS' ? 'Contratista' : 'Empleado'}</h3>
            <p><strong>Nombre:</strong> ${employee.full_name}</p>
            <p><strong>Cédula:</strong> ${employee.cedula}</p>
            <p><strong>Cargo:</strong> ${employee.position || 'No especificado'}</p>
            <p><strong>Centro de Costo:</strong> ${employee.centro_costo || 'No especificado'}</p>
        </div>
        <div>
            <h3>Detalles del Contrato</h3>
            <p><strong>Tipo:</strong> ${contractType}</p>
            <p><strong>Fecha de Ingreso:</strong> ${formatDate(employee.hire_date)}</p>
            <p><strong>Salario Base:</strong> ${formatCurrency(employee.base_salary)}</p>
            ${employee.bank_name ? `<p><strong>Banco:</strong> ${employee.bank_name}</p>` : ''}
        </div>
    </div>

    ${concepts.length > 0 ? `
    <div class="section">
        <h3>💰 Devengado</h3>
        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Concepto</th>
                    <th>Días/Horas</th>
                    <th>Valor Unitario</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${concepts.map((concept: any) => `
                <tr>
                    <td>${concept.concept_code}</td>
                    <td>${concept.concept_name}</td>
                    <td class="amount">${concept.days_hours}</td>
                    <td class="amount">${formatCurrency(concept.unit_value)}</td>
                    <td class="amount">${formatCurrency(concept.total_value)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    ${deductions.length > 0 ? `
    <div class="section">
        <h3>💸 Deducciones</h3>
        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Concepto</th>
                    <th>Porcentaje</th>
                    <th>Base</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${deductions.map((deduction: any) => `
                <tr>
                    <td>${deduction.concept_code}</td>
                    <td>${deduction.concept_name}</td>
                    <td class="amount">${deduction.percentage ? deduction.percentage + '%' : '-'}</td>
                    <td class="amount">${deduction.base_value ? formatCurrency(deduction.base_value) : '-'}</td>
                    <td class="amount">${formatCurrency(deduction.total_value)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="summary">
        <h3>📊 Resumen de Pago</h3>
        <p><strong>Total Devengado:</strong> <span class="amount">${formatCurrency(summary.total_earned)}</span></p>
        <p><strong>Total Deducciones:</strong> <span class="amount">${formatCurrency(summary.total_deductions)}</span></p>
        <div class="net-pay">
            <strong>NETO A PAGAR: ${formatCurrency(summary.net_pay)}</strong>
        </div>
    </div>

    ${company.nombre_representante ? `
    <div class="signature-section">
        <div class="signature-box">
            <div class="signature-line">
                <img src="/placeholders/default-signature.png" alt="Firma" class="signature-image" onerror="this.style.display='none'">
            </div>
            <div class="signature-name">${company.nombre_representante.toUpperCase()}</div>
            ${company.tipo_documento_representante && company.numero_documento_representante ? 
                `<div class="signature-text">${getDocumentTypeName(company.tipo_documento_representante)} ${company.numero_documento_representante}</div>` 
                : ''}
            <div class="signature-text">Representante Legal</div>
        </div>
        <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-name">EMPLEADO</div>
            <div class="signature-text">${employee.full_name}</div>
            <div class="signature-text">C.C. ${employee.cedula}</div>
            <div class="signature-text">${contractType === 'OPS' ? 'Contratista' : 'Empleado'}</div>
        </div>
    </div>
    ` : ''}

    <div style="margin-top: 50px; text-align: center; color: #666; font-size: 0.9em;">
        <p>Documento generado el ${new Date().toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p>${contractType === 'OPS' ? 'Certificado de Pago para Servicios Profesionales' : 'Desprendible de Nómina'}</p>
    </div>

    <script>
        // Auto-print functionality
        if (window.location.search.includes('autoprint=true')) {
            setTimeout(() => window.print(), 1000);
        }

        // Download HTML function
        function downloadAsHTML() {
            const htmlContent = document.documentElement.outerHTML;
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '${documentType.replace(/[^a-zA-Z0-9]/g, "_")}_${employee.full_name.replace(/[^a-zA-Z0-9]/g, "_")}_periodo_${period.period_number}.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }

        // Enhanced print functionality with page setup
        function printDocument() {
            window.print();
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                printDocument();
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                downloadAsHTML();
            }
        });
    </script>
</body>
</html>
  `

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function getDocumentTypeName(type: string): string {
    const types: Record<string, string> = {
      'CC': 'C.C.',
      'CE': 'C.E.',
      'PP': 'Pasaporte',
      'NIT': 'NIT'
    }
    return types[type] || type
  }
}