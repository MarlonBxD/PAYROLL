import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Sistema de Control de Nómina</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Gestiona la nómina de tu empresa de manera eficiente y profesional
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Empleados</CardTitle>
              <CardDescription>Registra y administra la información de tus colaboradores</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Datos personales y laborales</li>
                <li>• Información bancaria y de seguridad social</li>
                <li>• Historial de cambios</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cálculo de Nómina</CardTitle>
              <CardDescription>Procesa automáticamente los salarios y descuentos</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Cálculo automático de aportes</li>
                <li>• Conceptos configurables</li>
                <li>• Reportes detallados</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Desprendibles Digitales</CardTitle>
              <CardDescription>Genera y envía desprendibles por correo electrónico</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Formato profesional en PDF</li>
                <li>• Envío automático por email</li>
                <li>• Historial de envíos</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reportes y Análisis</CardTitle>
              <CardDescription>Obtén insights sobre los costos de nómina</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Reportes por período</li>
                <li>• Análisis de costos</li>
                <li>• Exportación a Excel</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/auth/login">Iniciar Sesión</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/register">Crear Cuenta</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
