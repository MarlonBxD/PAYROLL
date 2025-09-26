"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, AlertCircle, CheckCircle } from "lucide-react"

export default function TestDownloadPage() {
  const [periodId, setPeriodId] = useState("4f764847-262d-4cf9-8f40-6bc70fa1794d")
  const [employeeId, setEmployeeId] = useState("4576a010-3315-48a9-8f87-c30b8e4dc248")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testDownload = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const url = `/api/download-payslip-simple?periodId=${encodeURIComponent(periodId)}&employeeId=${encodeURIComponent(employeeId)}`
      
      // Open in new tab
      window.open(url, '_blank')
      
      setResult('✅ Desprendible abierto en nueva pestaña')
    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  const testDiagnosis = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/debug-payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodId,
          employeeId
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(`
✅ Diagnóstico completado:
• Período encontrado: ${data.diagnosis.period.found ? '✅' : '❌'}
• Empleado encontrado: ${data.diagnosis.employee.found ? '✅' : '❌'}
• Resumen encontrado: ${data.diagnosis.summary.found ? '✅' : '❌'}
• RPC funcionando: ${data.diagnosis.rpc.success ? '✅' : '❌'}
• Conceptos: ${data.diagnosis.concepts.count}
• Deducciones: ${data.diagnosis.deductions.count}
        `)
      } else {
        setError(`Error en diagnóstico: ${data.error}`)
      }
    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Prueba de Descarga de Desprendibles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">ID del Período</label>
            <Input
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              placeholder="Ingresa el ID del período"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">ID del Empleado</label>
            <Input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Ingresa el ID del empleado"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={testDownload}
              disabled={isLoading || !periodId || !employeeId}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isLoading ? 'Generando...' : 'Descargar Desprendible'}
            </Button>

            <Button
              variant="outline"
              onClick={testDiagnosis}
              disabled={isLoading || !periodId || !employeeId}
            >
              🔍 Diagnosticar
            </Button>
          </div>

          {result && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <pre className="text-green-800 text-sm whitespace-pre-wrap">{result}</pre>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Instrucciones:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Asegúrate de que el servidor Next.js esté corriendo</li>
              <li>2. Usa los IDs por defecto o ingresa otros válidos</li>
              <li>3. Haz clic en "Diagnosticar" para verificar los datos</li>
              <li>4. Haz clic en "Descargar" para abrir el desprendible</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}