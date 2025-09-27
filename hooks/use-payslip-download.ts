import { useState } from 'react'

/**
 * Hook para descargar documentos de nómina
 * Automáticamente genera desprendibles para empleados NÓMINA o certificados para empleados OPS
 * basándose en el tipo de contrato del empleado
 */
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
      console.log('🔍 Iniciando descarga de documento:', { periodId, employeeId })

      const response = await fetch('/api/generate-pdf', {
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
        throw new Error(errorData.error || 'Error al generar el documento')
      }

      // Get the PDF as blob
      const blob = await response.blob()
      
      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'documento.pdf'
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="(.+)"/)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      
      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      window.URL.revokeObjectURL(url)

      console.log('✅ Descarga completada:', { filename })

    } catch (error) {
      console.error('❌ Error downloading document:', error)
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
      console.log('🔍 Iniciando descarga de documento (POST):', { periodId, employeeId })

      const response = await fetch('/api/generate-pdf', {
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
        throw new Error(errorData.error || 'Error al generar el documento')
      }

      // Get the PDF as blob
      const blob = await response.blob()
      
      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'documento.pdf'
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="(.+)"/)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      
      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      window.URL.revokeObjectURL(url)

      console.log('✅ Descarga completada:', { filename })

    } catch (error) {
      console.error('❌ Error downloading document (POST):', error)
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