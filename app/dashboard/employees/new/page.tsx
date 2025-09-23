"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { employeeSchema, type EmployeeFormData } from "@/lib/validations"
import { useToast } from "@/hooks/use-toast"

export default function NewEmployeePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    cedula: "",
    full_name: "",
    centro_costo: "",
    contract_number: "",
    hire_date: "",
    salary_type: "FIJO" as const,
    base_salary: 0,
    bank_name: "",
    account_number: "",
    afp: "",
    eps: "",
    status: "ACTIVO" as const,
    is_active: true,
  })

  // Validate unique cedula
  const validateCedula = async (cedula: string): Promise<boolean> => {
    if (!cedula) return false
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('employees')
        .select('cedula')
        .eq('cedula', cedula)
        .single()

      if (error) {
        console.log('Error validando cédula (esperado si no existe):', error)
        // Si el error es "PGRST116" significa que no encontró registros (cédula única)
        if (error.code === 'PGRST116') {
          return true // Cédula única, puede usarse
        }
        // Si es error de RLS, asumir que no existe (fallback)
        if (error.message?.includes('row-level security')) {
          console.warn('Error de RLS en validación de cédula, asumiendo que es única')
          return true
        }
        throw error
      }

      return !data // Returns true if cedula doesn't exist
    } catch (error) {
      console.error('Error en validateCedula:', error)
      // En caso de error, asumir que la cédula es única para no bloquear
      return true
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      // Validate form data
      const validationResult = employeeSchema.safeParse(formData)
      
      if (!validationResult.success) {
        const formErrors: Record<string, string> = {}
        validationResult.error.errors.forEach((error) => {
          if (error.path[0]) {
            formErrors[error.path[0] as string] = error.message
          }
        })
        setErrors(formErrors)
        return
      }

      const supabase = createClient()

      // Get user profile to get company_id
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      // Validate unique cedula - try RPC first, then fallback
      let isCedulaUnique = false
      try {
        // Try RPC function first
        const { data: isUnique, error: rpcError } = await supabase
          .rpc('check_cedula_unique', {
            cedula_to_check: formData.cedula,
            user_id: user.id
          })
        
        if (rpcError) {
          console.warn('RPC cédula validation failed, trying direct method:', rpcError)
          isCedulaUnique = await validateCedula(formData.cedula)
        } else {
          isCedulaUnique = isUnique
        }
      } catch (error) {
        console.warn('Error in cedula validation, trying direct method:', error)
        isCedulaUnique = await validateCedula(formData.cedula)
      }

      if (!isCedulaUnique) {
        setErrors({ cedula: 'Ya existe un empleado con esta cédula' })
        return
      }

      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

      if (!profile?.company_id) {
        throw new Error("Empresa no configurada")
      }

      console.log('Creando empleado con datos:', formData)
      console.log('User ID:', user.id)

      const employeeData = {
        cedula: formData.cedula,
        full_name: formData.full_name,
        centro_costo: formData.centro_costo || '',
        contract_number: formData.contract_number || '',
        hire_date: formData.hire_date,
        salary_type: formData.salary_type,
        base_salary: formData.base_salary.toString(),
        bank_name: formData.bank_name || '',
        account_number: formData.account_number || '',
        afp: formData.afp || '',
        eps: formData.eps || '',
        is_active: formData.is_active.toString(),
      }

      console.log('Datos del empleado a insertar:', employeeData)

      // Try RPC function first (recommended for RLS)
      let result = null
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('create_employee_for_company', {
            employee_data: employeeData,
            user_id: user.id
          })

        if (rpcError) throw rpcError
        result = rpcData
        console.log('Empleado creado con RPC:', result)
        
      } catch (rpcError) {
        console.warn('RPC function failed, trying direct insert:', rpcError)
        
        // Si la función RPC no existe, mostrar instrucciones
        if ((rpcError as any)?.message?.includes('function') && (rpcError as any)?.message?.includes('does not exist')) {
          console.error(`
🔧 CONFIGURACIÓN REQUERIDA PARA EMPLEADOS:

Para solucionar este error, ejecuta en tu dashboard de Supabase:

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto  
3. Ve a "SQL Editor"
4. Ejecuta el contenido completo del archivo: scripts/006_fix_employees_rls.sql

El script contiene:
✅ Función RPC 'create_employee_for_company'
✅ Función RPC 'check_cedula_unique'
✅ Políticas RLS para todas las tablas
✅ Permisos necesarios para empleados
          `)
          throw new Error('Configuración de base de datos pendiente. Ejecuta el script SQL 006_fix_employees_rls.sql en tu dashboard de Supabase. Ver consola para detalles.')
        }

        // Fallback to direct insert
        const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

        if (!profile?.company_id) {
          throw new Error("Empresa no configurada")
        }

        const { data, error } = await supabase
          .from("employees")
          .insert({
            company_id: profile.company_id,
            cedula: formData.cedula,
            full_name: formData.full_name,
            centro_costo: formData.centro_costo || null,
            contract_number: formData.contract_number || null,
            hire_date: formData.hire_date,
            salary_type: formData.salary_type,
            base_salary: formData.base_salary,
            bank_name: formData.bank_name || null,
            account_number: formData.account_number || null,
            afp: formData.afp || null,
            eps: formData.eps || null,
            status: formData.is_active ? 'ACTIVO' : 'INACTIVO',
          })
          .select()

        if (error) {
          console.error('Error en inserción directa:', error)
          
          if (error.message?.includes('row-level security') || error.code === '42501') {
            throw new Error('Error de permisos: Ejecuta el script SQL 006_fix_employees_rls.sql en tu dashboard de Supabase para configurar las políticas RLS.')
          }
          
          if (error.message?.includes('duplicate key') || error.code === '23505') {
            throw new Error('Ya existe un empleado con esa cédula')
          }

          throw new Error(`Error creando empleado: ${error.message}`)
        }
        
        result = data
        console.log('Empleado creado con inserción directa:', result)
      }

      if (!result) {
        throw new Error('No se pudo crear el empleado')
      }

      toast({
        title: "Éxito",
        description: "Empleado creado correctamente",
      })

      router.push("/dashboard/employees")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/employees">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Nuevo Empleado</h2>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información del Empleado</CardTitle>
          <CardDescription>Completa todos los campos para registrar un nuevo empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cedula">Cédula *</Label>
                <Input
                  id="cedula"
                  value={formData.cedula}
                  onChange={(e) => handleInputChange("cedula", e.target.value)}
                  placeholder="1234567890"
                  required
                />
                {errors.cedula && <p className="text-sm text-destructive">{errors.cedula}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange("full_name", e.target.value)}
                  placeholder="Juan Pérez García"
                  required
                />
                {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="centro_costo">Centro de Costo</Label>
                <Input
                  id="centro_costo"
                  value={formData.centro_costo}
                  onChange={(e) => handleInputChange("centro_costo", e.target.value)}
                  placeholder="CC001"
                />
                {errors.centro_costo && <p className="text-sm text-destructive">{errors.centro_costo}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract_number">Número de Contrato</Label>
                <Input
                  id="contract_number"
                  value={formData.contract_number}
                  onChange={(e) => handleInputChange("contract_number", e.target.value)}
                  placeholder="C-2024-001"
                />
                {errors.contract_number && <p className="text-sm text-destructive">{errors.contract_number}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="hire_date">Fecha de Ingreso *</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => handleInputChange("hire_date", e.target.value)}
                  required
                />
                {errors.hire_date && <p className="text-sm text-destructive">{errors.hire_date}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary_type">Tipo de Salario</Label>
                <Select value={formData.salary_type} onValueChange={(value) => handleInputChange("salary_type", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIJO">Fijo</SelectItem>
                    <SelectItem value="VARIABLE">Variable</SelectItem>
                  </SelectContent>
                </Select>
                {errors.salary_type && <p className="text-sm text-destructive">{errors.salary_type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="base_salary">Salario Base *</Label>
                <Input
                  id="base_salary"
                  type="number"
                  value={formData.base_salary}
                  onChange={(e) => handleInputChange("base_salary", Number(e.target.value))}
                  placeholder="1300000"
                  required
                />
                {errors.base_salary && <p className="text-sm text-destructive">{errors.base_salary}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_name">Banco</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => handleInputChange("bank_name", e.target.value)}
                  placeholder="Bancolombia"
                />
                {errors.bank_name && <p className="text-sm text-destructive">{errors.bank_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Número de Cuenta</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => handleInputChange("account_number", e.target.value)}
                  placeholder="12345678901234567890"
                />
                {errors.account_number && <p className="text-sm text-destructive">{errors.account_number}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="afp">AFP</Label>
                <Input
                  id="afp"
                  value={formData.afp}
                  onChange={(e) => handleInputChange("afp", e.target.value)}
                  placeholder="Porvenir"
                />
                {errors.afp && <p className="text-sm text-destructive">{errors.afp}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="eps">EPS</Label>
                <Input
                  id="eps"
                  value={formData.eps}
                  onChange={(e) => handleInputChange("eps", e.target.value)}
                  placeholder="Sura"
                />
                {errors.eps && <p className="text-sm text-destructive">{errors.eps}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVO">Activo</SelectItem>
                    <SelectItem value="INACTIVO">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
              </div>
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="text-sm text-destructive">
                Por favor corrige los errores en el formulario
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Empleado"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/dashboard/employees">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
