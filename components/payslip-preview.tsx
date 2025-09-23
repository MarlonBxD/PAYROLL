"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { generatePayslipPDF } from "@/lib/pdf-generator"
import { useToast } from "@/hooks/use-toast"

interface PayslipData {
  company: any
  period: any
  employee: any
  summary: any
  concepts: any[]
  deductions: any[]
}

export function PayslipPreview({ data }: { data: PayslipData }) {
  const { toast } = useToast()

  const handleDownloadPDF = async () => {
    try {
      const pdfData = generatePayslipPDF(data)
      
      // Create blob and download
      const blob = new Blob([new Uint8Array(pdfData)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `desprendible_${data.employee?.full_name?.replace(/\s+/g, '_')}_${data.period?.period_number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Éxito",
        description: "Desprendible descargado correctamente",
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "Error",
        description: "Error al generar el PDF",
        variant: "destructive",
      })
    }
  }
  const { company, period, employee, summary, concepts, deductions } = data

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleDownloadPDF} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF
        </Button>
      </div>
      
      <div className="bg-white p-8 font-mono text-sm border max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-lg font-bold mb-2">{company?.name || "EMPRESA"}</div>
        <div className="text-sm">DESPRENDIBLE DE PAGO</div>
      </div>

      {/* Employee and Company Info */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-20">NOMBRE</span>
            <span className="mr-2">:</span>
            <span className="font-bold">{employee?.full_name}</span>
          </div>
          <div className="flex">
            <span className="w-20">CEDULA</span>
            <span className="mr-2">:</span>
            <span>{employee?.cedula}</span>
          </div>
          <div className="flex">
            <span className="w-20">C.C.</span>
            <span className="mr-2">:</span>
            <span>{employee?.centro_costo}</span>
          </div>
          <div className="flex">
            <span className="w-20">CONTRATO</span>
            <span className="mr-2">:</span>
            <span>{employee?.contract_number}</span>
          </div>
          <div className="flex">
            <span className="w-20">BANCO</span>
            <span className="mr-2">:</span>
            <span>{employee?.bank_name}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex">
            <span className="w-20">NOMINA</span>
            <span className="mr-2">:</span>
            <span>{company?.name}</span>
          </div>
          <div className="flex">
            <span className="w-20">PERIODO</span>
            <span className="mr-2">:</span>
            <span>
              DESDE {new Date(period?.start_date).toLocaleDateString()} HASTA{" "}
              {new Date(period?.end_date).toLocaleDateString()}
            </span>
          </div>
          <div className="flex">
            <span className="w-20">INGRESO</span>
            <span className="mr-2">:</span>
            <span>{new Date(employee?.hire_date).toLocaleDateString()}</span>
          </div>
          <div className="flex">
            <span className="w-20">SUELDO</span>
            <span className="mr-2">:</span>
            <span>{employee?.base_salary?.toLocaleString()}</span>
          </div>
          <div className="flex">
            <span className="w-20">CUENTA</span>
            <span className="mr-2">:</span>
            <span>{employee?.account_number}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-20">PAGO</span>
            <span className="mr-2">:</span>
            <span>{period?.period_number}</span>
          </div>
          <div className="flex">
            <span className="w-20">TIPO SALARIO</span>
            <span className="mr-2">:</span>
            <span>{employee?.salary_type}</span>
          </div>
          <div className="flex">
            <span className="w-20">A.F.P.</span>
            <span className="mr-2">:</span>
            <span>{employee?.afp}</span>
          </div>
          <div className="flex">
            <span className="w-20">E.P.S.</span>
            <span className="mr-2">:</span>
            <span>{employee?.eps}</span>
          </div>
        </div>
      </div>

      {/* Concepts and Deductions */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Concepts (Earnings) */}
        <div>
          {concepts.map((concept) => (
            <div key={concept.id} className="flex justify-between mb-2">
              <div className="flex-1">
                <span className="mr-4">{concept.concept_code}</span>
                <span>{concept.concept_name}</span>
              </div>
              <div className="flex gap-4">
                <span className="w-16 text-right">{concept.days_hours?.toFixed(2)}</span>
                <span className="w-24 text-right">{concept.total_value?.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Deductions */}
        <div>
          {deductions.map((deduction) => (
            <div key={deduction.id} className="flex justify-between mb-2">
              <div className="flex-1">
                <span className="mr-4">{deduction.deduction_code}</span>
                <span>{deduction.deduction_name}</span>
              </div>
              <div className="flex gap-4">
                <span className="w-24 text-right">{deduction.base_amount?.toLocaleString()}</span>
                <span className="w-16 text-right">{deduction.deduction_value?.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="border-t-2 border-black pt-4">
        <div className="flex justify-between text-lg font-bold">
          <span>{summary?.total_earned?.toLocaleString()}</span>
          <span>{summary?.total_deductions?.toLocaleString()}</span>
          <span>{summary?.net_pay?.toLocaleString()}</span>
        </div>
        </div>
      </div>
    </div>
  )
}
