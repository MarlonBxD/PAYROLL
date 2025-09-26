import { z } from 'zod'

// Employee validation schema (actualizado para coincidir con el esquema real de la BD)
export const employeeSchema = z.object({
  cedula: z.string()
    .min(1, 'Cédula es requerida')
    .regex(/^\d+$/, 'La cédula debe contener solo números'),
  full_name: z.string()
    .min(1, 'Nombre completo es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string()
    .optional()
    .refine(val => !val || z.string().email().safeParse(val).success, {
      message: 'Email no válido'
    }),
  phone: z.string()
    .optional()
    .or(z.literal('')),
  position: z.string()
    .optional()
    .or(z.literal('')),
  department: z.string()
    .optional()
    .or(z.literal('')),
  centro_costo: z.string()
    .optional()
    .or(z.literal('')),
  contract_type: z.enum(['NOMINA', 'OPS'])
    .optional()
    .default('NOMINA'),
  contract_number: z.string()
    .optional()
    .or(z.literal('')),
  hire_date: z.string()
    .min(1, 'Fecha de contratación es requerida'),
  salary_type: z.enum(['FIJO', 'VARIABLE'])
    .optional()
    .default('FIJO'),
  base_salary: z.number()
    .positive('El salario debe ser mayor a 0')
    .min(1, 'Salario base es requerido'),
  bank_name: z.string()
    .optional()
    .or(z.literal('')),
  account_number: z.string()
    .optional()
    .or(z.literal('')),
  afp: z.string()
    .optional()
    .or(z.literal('')),
  eps: z.string()
    .optional()
    .or(z.literal('')),
  status: z.enum(['ACTIVO', 'INACTIVO'])
    .optional()
    .default('ACTIVO'),
  is_active: z.boolean()
    .optional()
    .default(true)
})

// Payroll period validation schema
export const payrollPeriodSchema = z.object({
  period_number: z.number()
    .positive('El número de período debe ser mayor a 0'),
  period_name: z.string()
    .min(1, 'Nombre del período es requerido'),
  start_date: z.string()
    .min(1, 'Fecha de inicio es requerida'),
  end_date: z.string()
    .min(1, 'Fecha de fin es requerida'),
  status: z.enum(['draft', 'active', 'processed', 'closed'])
    .optional()
    .default('draft')
})

// Concept validation schema
export const conceptSchema = z.object({
  concept_name: z.string()
    .min(1, 'Nombre del concepto es requerido'),
  concept_code: z.string()
    .min(1, 'Código del concepto es requerido')
    .regex(/^[A-Z0-9_]+$/, 'El código debe contener solo letras mayúsculas, números y guiones bajos'),
  description: z.string()
    .optional(),
  calculation_type: z.enum(['fixed', 'percentage']),
  amount: z.number()
    .nonnegative('El monto no puede ser negativo')
    .optional(),
  percentage: z.number()
    .min(0, 'El porcentaje no puede ser negativo')
    .max(100, 'El porcentaje no puede ser mayor a 100')
    .optional(),
  is_active: z.boolean()
    .optional()
    .default(true)
}).refine(
  (data) => {
    if (data.calculation_type === 'fixed') {
      return data.amount !== undefined && data.amount >= 0
    }
    if (data.calculation_type === 'percentage') {
      return data.percentage !== undefined && data.percentage >= 0
    }
    return false
  },
  {
    message: 'Debe especificar un monto para tipo fijo o un porcentaje para tipo porcentual',
    path: ['amount']
  }
)

// Deduction validation schema
export const deductionSchema = z.object({
  deduction_name: z.string()
    .min(1, 'Nombre de la deducción es requerido'),
  deduction_code: z.string()
    .min(1, 'Código de la deducción es requerido')
    .regex(/^[A-Z0-9_]+$/, 'El código debe contener solo letras mayúsculas, números y guiones bajos'),
  description: z.string()
    .optional(),
  calculation_type: z.enum(['fixed', 'percentage']),
  amount: z.number()
    .nonnegative('El monto no puede ser negativo')
    .optional(),
  percentage: z.number()
    .min(0, 'El porcentaje no puede ser negativo')
    .max(100, 'El porcentaje no puede ser mayor a 100')
    .optional(),
  is_active: z.boolean()
    .optional()
    .default(true)
}).refine(
  (data) => {
    if (data.calculation_type === 'fixed') {
      return data.amount !== undefined && data.amount >= 0
    }
    if (data.calculation_type === 'percentage') {
      return data.percentage !== undefined && data.percentage >= 0
    }
    return false
  },
  {
    message: 'Debe especificar un monto para tipo fijo o un porcentaje para tipo porcentual',
    path: ['amount']
  }
)

// Login validation schema
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email es requerido')
    .email('Email no válido'),
  password: z.string()
    .min(1, 'Contraseña es requerida')
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
})

// Register validation schema
export const registerSchema = z.object({
  email: z.string()
    .min(1, 'Email es requerido')
    .email('Email no válido'),
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe contener al menos una minúscula, una mayúscula y un número'
    ),
  confirmPassword: z.string()
    .min(1, 'Confirmar contraseña es requerido'),
  full_name: z.string()
    .min(1, 'Nombre completo es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  }
)

// Company configuration validation schema
export const companyConfigSchema = z.object({
  name: z.string()
    .min(1, 'Nombre de la empresa es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres'),
  nit: z.string()
    .min(1, 'NIT es requerido')
    .regex(/^[0-9-]+$/, 'El NIT debe contener solo números y guiones'),
  address: z.string()
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .optional()
    .or(z.literal('')),
  email: z.string()
    .optional()
    .refine(val => !val || z.string().email().safeParse(val).success, {
      message: 'Email no válido'
    }),
  nombre_representante: z.string()
    .optional()
    .or(z.literal('')),
  tipo_documento_representante: z.enum(['CC', 'CE', 'PP', 'NIT'])
    .optional(),
  numero_documento_representante: z.string()
    .optional()
    .or(z.literal(''))
})

// Type exports
export type EmployeeFormData = z.infer<typeof employeeSchema>
export type PayrollPeriodFormData = z.infer<typeof payrollPeriodSchema>
export type ConceptFormData = z.infer<typeof conceptSchema>
export type DeductionFormData = z.infer<typeof deductionSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type CompanyConfigFormData = z.infer<typeof companyConfigSchema>

// Validation utility functions
export function validateEmployee(data: unknown): { success: boolean; data?: EmployeeFormData; errors?: string[] } {
  try {
    const validData = employeeSchema.parse(data)
    return { success: true, data: validData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(e => e.message) 
      }
    }
    return { success: false, errors: ['Error de validación desconocido'] }
  }
}

export function validateConcept(data: unknown): { success: boolean; data?: ConceptFormData; errors?: string[] } {
  try {
    const validData = conceptSchema.parse(data)
    return { success: true, data: validData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(e => e.message) 
      }
    }
    return { success: false, errors: ['Error de validación desconocido'] }
  }
}

export function validateDeduction(data: unknown): { success: boolean; data?: DeductionFormData; errors?: string[] } {
  try {
    const validData = deductionSchema.parse(data)
    return { success: true, data: validData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(e => e.message) 
      }
    }
    return { success: false, errors: ['Error de validación desconocido'] }
  }
}