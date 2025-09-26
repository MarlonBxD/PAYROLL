"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SupabaseDiagnostic() {
  const [status, setStatus] = useState<{
    connection: string
    user: any
    profile: any
    company: any
    error?: string
  }>({
    connection: 'checking',
    user: null,
    profile: null,
    company: null
  })

  const runDiagnostic = async () => {
    const supabase = createClient()
    
    try {
      // Test 1: Check connection
      setStatus(prev => ({ ...prev, connection: 'connecting' }))
      
      // Test 2: Get user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw new Error(`Auth error: ${userError.message}`)
      
      // Test 3: Get profile
      let profileData = null
      if (userData.user) {
        const { data: profData, error: profError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle()
          
        if (profError) console.warn('Profile error:', profError)
        profileData = profData
      }
      
      // Test 4: Get company if profile has company_id
      let companyData = null
      if (profileData?.company_id) {
        const { data: compData, error: compError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", profileData.company_id)
          .maybeSingle()
          
        if (compError) console.warn('Company error:', compError)
        companyData = compData
      }
      
      setStatus({
        connection: 'connected',
        user: userData.user,
        profile: profileData,
        company: companyData
      })
      
    } catch (error: any) {
      setStatus({
        connection: 'error',
        user: null,
        profile: null,
        company: null,
        error: error.message
      })
    }
  }

  useEffect(() => {
    runDiagnostic()
  }, [])

  return (
    <Card className="max-w-2xl mb-6">
      <CardHeader>
        <CardTitle>🔧 Diagnóstico del Sistema</CardTitle>
        <CardDescription>Estado de la conexión con Supabase</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span>Conexión:</span>
            <span className={`font-medium ${
              status.connection === 'connected' ? 'text-green-600' : 
              status.connection === 'error' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {status.connection}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Usuario:</span>
            <span className={`font-medium ${status.user ? 'text-green-600' : 'text-red-600'}`}>
              {status.user ? '✓ Autenticado' : '✗ No autenticado'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Perfil:</span>
            <span className={`font-medium ${status.profile ? 'text-green-600' : 'text-yellow-600'}`}>
              {status.profile ? '✓ Existe' : '⚠ No existe'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Empresa:</span>
            <span className={`font-medium ${status.company ? 'text-green-600' : 'text-gray-500'}`}>
              {status.company ? '✓ Configurada' : '○ Sin configurar'}
            </span>
          </div>
        </div>

        {status.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            <strong>Error:</strong> {status.error}
          </div>
        )}

        {status.user && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
            <strong>Usuario ID:</strong> {status.user.id}<br/>
            <strong>Email:</strong> {status.user.email}
          </div>
        )}

        <Button onClick={runDiagnostic} variant="outline" size="sm">
          🔄 Actualizar Diagnóstico
        </Button>
      </CardContent>
    </Card>
  )
}