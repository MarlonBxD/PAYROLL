"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SupabaseDiagnostic } from "@/components/supabase-diagnostic"

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [companyData, setCompanyData] = useState({
    name: "",
    nit: "",
    address: "",
    phone: "",
    email: "",
    logo_url: "",
  })

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadCompanyData()
  }, [])

  const loadCompanyData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select(`
          company_id,
          companies (*)
        `)
        .eq("id", user.id)
        .single()

      if (profile?.companies && typeof profile.companies === 'object' && profile.companies !== null) {
        const company = profile.companies as any
        setCompanyData({
          name: company.name || "",
          nit: company.nit || "",
          address: company.address || "",
          phone: company.phone || "",
          email: company.email || "",
          logo_url: company.logo_url || "",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      console.log('User authenticated:', user.id)

      // Validate required fields
      if (!companyData.name || !companyData.nit) {
        throw new Error("Nombre de empresa y NIT son campos requeridos")
      }

      // Try to get or create profile
      let profile
      
      const { data: existingProfile, error: profileSelectError } = await supabase
        .from("profiles")
        .select("id, company_id")
        .eq("id", user.id)
        .maybeSingle()

      if (profileSelectError) {
        console.error('Error selecting profile:', profileSelectError)
        throw new Error('Error verificando perfil de usuario')
      }

      if (!existingProfile) {
        // Create new profile
        console.log('Creating new profile for user:', user.id)
        const { data: newProfile, error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            email: user.email || '',
            company_id: null
          })
          .select("id, company_id")
          .single()

        if (createProfileError) {
          console.error('Error creating profile:', createProfileError)
          throw new Error('Error creando perfil de usuario')
        }
        
        profile = newProfile
      } else {
        profile = existingProfile
      }

      console.log('Profile data:', profile)

      // Handle company creation or update
      if (profile.company_id) {
        console.log('Updating existing company:', profile.company_id)
        const { error: updateError } = await supabase
          .from("companies")
          .update({
            name: companyData.name,
            nit: companyData.nit,
            address: companyData.address || null,
            phone: companyData.phone || null,
            email: companyData.email || null,
            logo_url: companyData.logo_url || null
          })
          .eq("id", profile.company_id)

        if (updateError) {
          console.error('Error updating company:', updateError)
          throw new Error('Error actualizando empresa: ' + updateError.message)
        }
      } else {
        console.log('Creating new company with data:', companyData)
        
        // Try with RPC function first (recommended approach for RLS)
        let { data: newCompany, error: companyError } = await supabase.rpc('create_company_for_user', {
          company_data: {
            name: companyData.name,
            nit: companyData.nit,
            address: companyData.address || null,
            phone: companyData.phone || null,
            email: companyData.email || null,
            logo_url: companyData.logo_url || null
          },
          user_id: user.id
        })

        if (companyError) {
          console.warn('RPC function failed:', companyError)
          
          // Si la función RPC no existe, mostrar instrucciones claras
          if (companyError.message?.includes('function') && companyError.message?.includes('does not exist')) {
            console.error(`
🔧 CONFIGURACIÓN REQUERIDA:

Para solucionar este error, necesitas ejecutar el SQL en tu dashboard de Supabase:

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a "SQL Editor"
4. Ejecuta el contenido completo del archivo: scripts/005_create_company_rpc.sql

El archivo contiene:
✅ Función RPC 'create_company_for_user'
✅ Políticas RLS para tabla 'companies'
✅ Permisos necesarios para la aplicación

Una vez ejecutado, recarga la página e intenta guardar nuevamente.
            `)
            
            throw new Error('Configuración de base de datos pendiente. Ejecuta el script SQL 005_create_company_rpc.sql en tu dashboard de Supabase. Ver consola para detalles.')
          }
          
          // Fallback to direct insert para otros errores
          console.log('Intentando inserción directa como fallback...')
          const { data: directCompany, error: directError } = await supabase
            .from("companies")
            .insert({
              name: companyData.name,
              nit: companyData.nit,
              address: companyData.address || null,
              phone: companyData.phone || null,
              email: companyData.email || null,
              logo_url: companyData.logo_url || null
            })
            .select("id")
            .single()

          if (directError) {
            console.error('Error en inserción directa:', directError)
            
            if (directError.message?.includes('row-level security')) {
              throw new Error('Error de permisos: Ejecuta el script SQL 005_create_company_rpc.sql en tu dashboard de Supabase para configurar las políticas RLS.')
            }
            
            throw new Error('Error creando empresa: ' + directError.message)
          }
          
          newCompany = directCompany
          console.log('Empresa creada con inserción directa:', newCompany)
        } else {
          console.log('Empresa creada exitosamente con RPC:', newCompany)
        }

        // Verificar que tenemos el ID de la empresa
        const companyId = newCompany?.id || (Array.isArray(newCompany) ? newCompany[0] : null)
        
        if (!companyId) {
          throw new Error('No se pudo obtener el ID de la empresa creada')
        }

        // Update profile with company_id solo si no fue hecho por la función RPC
        if (companyError) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ company_id: companyId })
            .eq("id", user.id)

          if (profileError) {
            console.error('Error updating profile with company_id:', profileError)
            throw new Error('Error vinculando empresa al perfil: ' + profileError.message)
          }
          
          console.log('Perfil actualizado con company_id:', companyId)
        }
      }

      toast({
        title: "Éxito",
        description: "Configuración guardada exitosamente",
      })

      // Reload data to show updated company info
      await loadCompanyData()
      
    } catch (error: any) {
      console.error('Full error details:', error)
      toast({
        title: "Error",
        description: error.message || 'Error desconocido',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setCompanyData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Building2 className="h-8 w-8" />
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
      </div>

      <SupabaseDiagnostic />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información de la Empresa</CardTitle>
          <CardDescription>Configura los datos de tu empresa para el sistema de nómina</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Nombre de la Empresa *</Label>
                <Input
                  id="name"
                  value={companyData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Mi Empresa S.A.S"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nit">NIT *</Label>
                <Input
                  id="nit"
                  value={companyData.nit}
                  onChange={(e) => handleInputChange("nit", e.target.value)}
                  placeholder="900123456-1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={companyData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+57 1 234 5678"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={companyData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="info@miempresa.com"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Textarea
                  id="address"
                  value={companyData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Calle 123 #45-67, Ciudad, País"
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="logo">Logo de la Empresa</Label>
                <div className="flex items-center gap-4">
                  <Button type="button" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Logo
                  </Button>
                  <span className="text-sm text-muted-foreground">Formato recomendado: PNG, JPG (máx. 2MB)</span>
                </div>
              </div>
            </div>



            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
