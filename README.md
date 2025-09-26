# 💼 Sistema de Nómina Empresarial

Un sistema completo de gestión de nómina empresarial desarrollado con Next.js 14, TypeScript y Supabase.

## 🚀 Características Principales

### ✅ **Sistema de Autenticación**
- Registro e inicio de sesión seguro con Supabase Auth
- Middleware de autenticación para rutas protegidas
- Gestión de sesiones y perfiles de usuario

### 👥 **Gestión de Empleados**
- CRUD completo de empleados
- Validación de cédulas únicas por empresa
- Campos completos: información personal, bancaria, AFP, EPS
- Estados de empleado (ACTIVO/INACTIVO)

### 💰 **Procesamiento de Nómina**
- Cálculos automáticos de salarios, deducciones y bonificaciones
- Períodos de nómina configurables
- Generación de recibos de pago
- Validaciones de datos y cálculos precisos

### 📄 **Generación de PDF**
- Recibos de pago profesionales en PDF
- Reportes consolidados de nómina
- Descarga automática de documentos
- Diseño responsivo y profesional

### 📊 **Dashboard y Reportes**
- Métricas en tiempo real del sistema
- Reportes detallados por período
- Estadísticas de empleados y nóminas
- Visualización de datos clara y útil

### 🏢 **Configuración Empresarial**
- Gestión completa de información de empresa
- Configuración de conceptos y deducciones
- Personalización por empresa
- Seguridad a nivel de fila (RLS)

## 🛠️ Stack Tecnológico

### **Frontend**
- **Next.js 14.2.16** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **shadcn/ui** - Componentes UI modernos
- **React Hook Form** - Manejo de formularios
- **Zod** - Validación de esquemas

### **Backend**
- **Supabase** - Base de datos PostgreSQL + Autenticación
- **Row Level Security (RLS)** - Seguridad a nivel de base de datos
- **Edge Functions** - Funciones serverless

### **Librerías Adicionales**
- **jsPDF + jspdf-autotable** - Generación de PDF
- **Zustand** - Gestión de estado global
- **date-fns** - Manejo de fechas
- **Lucide React** - Iconos

## 📁 Estructura del Proyecto

```
payroll-system/
├── app/
│   ├── api/                    # API Routes
│   ├── auth/                   # Páginas de autenticación
│   ├── dashboard/              # Panel de administración
│   │   ├── employees/          # Gestión de empleados
│   │   ├── payroll/           # Procesamiento de nómina
│   │   ├── reports/           # Reportes y análisis
│   │   └── settings/          # Configuración empresarial
├── components/
│   ├── ui/                    # Componentes UI reutilizables
│   └── [feature-components]   # Componentes específicos
├── lib/
│   ├── supabase/             # Configuración de Supabase
│   ├── validations.ts        # Esquemas de validación Zod
│   ├── pdf-generator.ts      # Generación de PDF
│   └── payroll-calculations.ts # Lógica de cálculos
├── scripts/                  # Scripts SQL para base de datos
└── hooks/                   # Custom React hooks
```

## 🚦 Configuración e Instalación

### **Prerrequisitos**
- Node.js 18+ 
- npm, yarn, o pnpm
- Cuenta de Supabase

### **1. Clonar el Repositorio**
```bash
git clone https://github.com/MarlonBxD/PAYROLL.git
cd PAYROLL
```

### **2. Instalar Dependencias**
```bash
npm install
# o
pnpm install
```

### **3. Configurar Variables de Entorno**
Crear archivo `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### **4. Configurar Base de Datos**
Ejecutar los scripts SQL en tu dashboard de Supabase:
1. `scripts/001_create_payroll_schema.sql` - Esquema principal
2. `scripts/002_create_profile_trigger.sql` - Triggers de perfil
3. `scripts/003_seed_sample_data.sql` - Datos de ejemplo
4. `scripts/004_fix_rls_policies.sql` - Políticas RLS generales
5. `scripts/005_create_company_rpc.sql` - Funciones RPC para empresas
6. `scripts/006_fix_employees_rls.sql` - Políticas RLS para empleados

### **5. Ejecutar en Desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📖 Guía de Uso

### **1. Primer Uso**
1. Registrar cuenta nueva
2. Configurar información de empresa en Settings
3. Crear empleados
4. Procesar primera nómina

### **2. Flujo de Nómina**
1. **Dashboard** → Ver métricas generales
2. **Empleados** → Gestionar empleados activos
3. **Nómina** → Crear período y procesar cálculos
4. **Reportes** → Generar y descargar documentos

### **3. Configuración Avanzada**
- **Settings**: Configurar empresa, conceptos, deducciones
- **Empleados**: Gestionar información completa de personal
- **Períodos**: Configurar fechas y tipos de procesamiento

## 🔒 Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas
- **Autenticación JWT** con Supabase
- **Validación de datos** con Zod en frontend y backend
- **Políticas de acceso** por empresa/usuario
- **Sanitización** de inputs y outputs

## 📊 Funciones Principales

### **Cálculos de Nómina**
- Salario base y variables
- Deducciones legales (Salud, Pensión, etc.)
- Bonificaciones y extras
- Cálculos precisos con validaciones

### **Generación de PDF**
- Recibos individuales de pago
- Reportes consolidados por período
- Formato profesional y personalizable
- Descarga automática

### **Gestión de Datos**
- CRUD completo para todas las entidades
- Validaciones en tiempo real
- Backup automático con Supabase
- Sincronización en tiempo real

## 🤝 Contribución

1. Fork del proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🎯 Próximas Funcionalidades

- [ ] Integración con API de bancos
- [ ] Notificaciones por email/SMS
- [ ] Reportes avanzados con gráficos
- [ ] Exportación a Excel
- [ ] Sistema de aprobaciones
- [ ] Integración con contabilidad

## 📞 Soporte

Para soporte o preguntas:
- **GitHub Issues**: [Reportar bug o solicitar feature](https://github.com/MarlonBxD/PAYROLL/issues)
- **Email**: [tu-email@ejemplo.com]

---

**Desarrollado con ❤️ por [MarlonBxD](https://github.com/MarlonBxD)**