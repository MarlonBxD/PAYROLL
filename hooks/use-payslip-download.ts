import { useState } from 'react'

interface UsePayslipDownloadResult {
  downloadPayslip: (periodId: string, employeeId: string) => Promise<void>
  isDownloading: boolean
  error: string | null
}

export function usePayslipDownload(): UsePayslipDownloadResult {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadPayslip = async (periodId: string, employeeId: string) => {
    setIsDownloading(true)
    setError(null)

    try {
      console.log('🔍 Iniciando descarga de desprendible:', { periodId, employeeId })

      // Use simple HTML version for now (works better than PDF)
      const url = `/api/download-payslip-simple?periodId=${encodeURIComponent(periodId)}&employeeId=${encodeURIComponent(employeeId)}`
      
      // Create a temporary link to trigger download
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      
      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log('✅ Descarga iniciada exitosamente')

    } catch (error) {
      console.error('❌ Error downloading payslip:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al descargar'
      setError(errorMessage)
      throw error
    } finally {
      setIsDownloading(false)
    }
  }

  return {
    downloadPayslip,
    isDownloading,
    error
  }
}

/**
 * Alternative method using POST request and programmatic download
 */
export function usePayslipDownloadPost(): UsePayslipDownloadResult {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadPayslip = async (periodId: string, employeeId: string) => {
    setIsDownloading(true)
    setError(null)

    try {
      console.log('🔍 Iniciando descarga de desprendible (POST):', { periodId, employeeId })

      const response = await fetch('/api/download-payslip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodId,
          employeeId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al generar el desprendible')
      }

      const data = await response.json()

      if (!data.success || !data.pdf || !data.fileName) {
        throw new Error('Respuesta inválida del servidor')
      }

      // Convert base64 to blob
      const byteCharacters = atob(data.pdf)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = data.fileName
      
      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      window.URL.revokeObjectURL(url)

      console.log('✅ Descarga completada:', {
        fileName: data.fileName,
        employeeName: data.employeeName,
        contractType: data.contractType,
        size: data.size
      })

    } catch (error) {
      console.error('❌ Error downloading payslip (POST):', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al descargar'
      setError(errorMessage)
      throw error
    } finally {
      setIsDownloading(false)
    }
  }

  return {
    downloadPayslip,
    isDownloading,
    error
  }
}