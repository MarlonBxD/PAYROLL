import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { ArrowLeft, Edit, Mail, Phone, User, Building, Calendar, DollarSign, CreditCard } from "lucide-react"

interface EmployeeViewProps {
  params: {
    id: string
  }
}

export default async function EmployeeViewPage({ params }: EmployeeViewProps) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile to get company_id
  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", data.user.id).single()

  if (!profile?.company_id) {
    redirect("/dashboard/settings")
  }

  // Get employee details
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", profile.company_id)
    .single()

  if (employeeError || !employee) {
    redirect("/dashboard/employees")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/employees">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Detalles del Empleado</h2>
        </div>
        <Button asChild>
          <Link href={`/dashboard/employees/${employee.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Nombre Completo</p>
                <p className="text-base">{employee.full_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Cédula</p>
                <p className="text-base">{employee.cedula}</p>
              </div>
              {employee.email && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Correo Electrónico
                  </p>
                  <p className="text-base">{employee.email}</p>
                </div>
              )}
              {employee.phone && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Teléfono
                  </p>
                  <p className="text-base">{employee.phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Información Laboral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Información Laboral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {employee.position && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Cargo</p>
                  <p className="text-base">{employee.position}</p>
                </div>
              )}
              {employee.department && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Departamento</p>
                  <p className="text-base">{employee.department}</p>
                </div>
              )}
              {employee.centro_costo && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Centro de Costo</p>
                  <p className="text-base">{employee.centro_costo}</p>
                </div>
              )}
              {employee.contract_type && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Tipo de Contrato</p>
                  <p className="text-base">{employee.contract_type === 'NOMINA' ? 'NÓMINA' : employee.contract_type}</p>
                </div>
              )}
              {employee.contract_number && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Número de Contrato</p>
                  <p className="text-base">{employee.contract_number}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Fecha de Ingreso
                </p>
                <p className="text-base">{new Date(employee.hire_date).toLocaleDateString('es-ES')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <Badge variant={employee.status === "ACTIVO" ? "default" : "secondary"}>
                  {employee.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Salarial */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Información Salarial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Tipo de Salario</p>
                <p className="text-base">{employee.salary_type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Salario Base</p>
                <p className="text-base font-semibold">${employee.base_salary?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Bancaria y Seguridad Social */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Información Bancaria y Seguridad Social
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {employee.bank_name && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Banco</p>
                  <p className="text-base">{employee.bank_name}</p>
                </div>
              )}
              {employee.account_number && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Número de Cuenta</p>
                  <p className="text-base">{employee.account_number}</p>
                </div>
              )}
              {employee.afp && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">AFP</p>
                  <p className="text-base">{employee.afp}</p>
                </div>
              )}
              {employee.eps && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">EPS</p>
                  <p className="text-base">{employee.eps}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Información del Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Fecha de Creación</p>
                <p className="text-base">{new Date(employee.created_at).toLocaleDateString('es-ES')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Última Actualización</p>
                <p className="text-base">{new Date(employee.updated_at).toLocaleDateString('es-ES')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}