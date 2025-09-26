"use client"

import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ReportActionsProps {
  periodsWithTotals: any[]
  ytdTotals: any
}

export function ReportActions({ periodsWithTotals, ytdTotals }: ReportActionsProps) {
  const { toast } = useToast()

  const handleGenerateReport = async () => {
    try {
      if (!periodsWithTotals || periodsWithTotals.length === 0) {
        toast({
          title: "Error",
          description: "No hay datos para generar el reporte",
          variant: "destructive",
        })
        return
      }

      const reportData = {
        period: {
          period_number: "CONSOLIDADO",
          period_name: `Reporte Anual ${new Date().getFullYear()}`,
        },
        summaries: periodsWithTotals.flatMap(period => 
          period.payroll_summary?.map((summary: any) => ({
            ...summary,
            employees: {
              cedula: summary.employees?.cedula || 'N/A',
              full_name: summary.employees?.full_name || 'N/A',
              position: summary.employees?.position || 'N/A',
            },
            base_salary: summary.base_salary || 0,
            total_concepts: summary.total_earned || 0,
            total_deductions: summary.total_deductions || 0,
            total_net: summary.net_pay || 0,
          })) || []
        ),
        totals: {
          totalEmployees: periodsWithTotals.reduce((acc, period) => 
            Math.max(acc, period.totals?.employeeCount || 0), 0
          ),
          totalConcepts: ytdTotals.totalEarned || 0,
          totalDeductions: ytdTotals.totalDeductions || 0,
          totalNet: ytdTotals.totalNetPay || 0,
        }
      }

      // For now, show a message that this feature is coming soon
      // In the future, we'll create an API endpoint for report generation
      toast({
        title: "Funcionalidad en desarrollo",
        description: "La generación de reportes PDF estará disponible próximamente",
      })
      return

      // TODO: Implement API endpoint for report generation
      // const response = await fetch('/api/generate-report', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(reportData),
      // })
      // const blob = await response.blob()
      // ... handle download
      
      toast({
        title: "Éxito",
        description: "Reporte generado correctamente",
      })
    } catch (error) {
      console.error('Error generating report:', error)
      toast({
        title: "Error",
        description: "Error al generar el reporte",
        variant: "destructive",
      })
    }
  }

  const handleExportExcel = async () => {
    toast({
      title: "Próximamente",
      description: "La funcionalidad de exportar a Excel estará disponible pronto",
    })
  }

  return (
    <div className="flex items-center space-x-2">
      <Button variant="outline" onClick={handleExportExcel}>
        <Download className="mr-2 h-4 w-4" />
        Exportar Excel
      </Button>
      <Button variant="outline" onClick={handleGenerateReport}>
        <FileText className="mr-2 h-4 w-4" />
        Generar PDF
      </Button>
    </div>
  )
}