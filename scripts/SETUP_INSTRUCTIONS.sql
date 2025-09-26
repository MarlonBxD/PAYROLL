-- =====================================================
-- INSTRUCCIONES PASO A PASO PARA CONFIGURAR EL SISTEMA COMPLETO
-- =====================================================

/*
🚀 ORDEN DE EJECUCIÓN DE SCRIPTS:

1️⃣ RESET_AND_CREATE_COMPLETE_SYSTEM.sql
   - Elimina tablas existentes (excepto users y companies)
   - Crea toda la estructura de nómina
   - Configura empleados con soporte NOMINA/OPS

2️⃣ USER_SYSTEM_COMPLETE.sql
   - Crea sistema de usuarios y perfiles
   - Configura autenticación con Supabase Auth
   - Establece políticas RLS

3️⃣ USER_SYSTEM_ADVANCED.sql
   - Configuraciones avanzadas de seguridad
   - Sistema de logs y auditoría
   - Funciones para gestión empresarial

📋 PASOS DETALLADOS:
*/

-- =====================================================
-- PASO 1: VERIFICAR DATOS DE EMPRESA EXISTENTE
-- =====================================================

-- Primero, obtén el ID de tu empresa existente
SELECT id, name, nit FROM companies LIMIT 1;

-- Guarda el company_id que aparezca, lo necesitarás después

-- =====================================================
-- PASO 2: EJECUTAR SCRIPTS EN ORDEN
-- =====================================================

-- 2.1: Ejecuta RESET_AND_CREATE_COMPLETE_SYSTEM.sql
-- Este script limpiará y recreará toda la estructura

-- 2.2: Ejecuta USER_SYSTEM_COMPLETE.sql  
-- Este script creará el sistema de usuarios

-- 2.3: Ejecuta USER_SYSTEM_ADVANCED.sql
-- Este script agregará funciones avanzadas

-- =====================================================
-- PASO 3: ACTUALIZAR DATOS DE EMPRESA (después de ejecutar scripts)
-- =====================================================

-- Actualiza tu empresa con datos del representante legal
-- REEMPLAZA 'TU-COMPANY-ID-AQUI' con el ID real de tu empresa
/*
UPDATE companies 
SET 
  nombre_representante = 'MARLON ANDRES BUELVAS TELLEZ',
  tipo_documento_representante = 'CC',
  numero_documento_representante = '1007398493',
  address = 'Dirección de tu empresa',
  phone = 'Teléfono de tu empresa',
  email = 'email@tuempresa.com'
WHERE id = 'TU-COMPANY-ID-AQUI';
*/

-- =====================================================
-- PASO 4: REGISTRAR USUARIO ADMIN EN SUPABASE AUTH
-- =====================================================

/*
4.1: Ve a Supabase Dashboard > Authentication > Users
4.2: Haz clic en "Invite user" o "Add user"
4.3: Registra tu usuario con:
     - Email: marlonbuelvas314@gmail.com
     - Password: (tu contraseña segura)
     - Full Name: MARLON ANDRES BUELVAS TELLEZ

4.4: El trigger automáticamente creará el perfil en la tabla profiles
*/

-- =====================================================
-- PASO 5: VINCULAR USUARIO A EMPRESA COMO ADMIN
-- =====================================================

-- Después de registrar el usuario, ejecuta esto para vincularlo como admin:
-- REEMPLAZA 'TU-COMPANY-ID-AQUI' con el ID real de tu empresa
/*
UPDATE profiles 
SET 
  company_id = 'TU-COMPANY-ID-AQUI',
  full_name = 'MARLON ANDRES BUELVAS TELLEZ',
  role = 'ADMIN',
  status = 'ACTIVE'
WHERE email = 'marlonbuelvas314@gmail.com';
*/

-- =====================================================
-- PASO 6: CREAR EMPLEADO DE EJEMPLO
-- =====================================================

-- Crea tu primer empleado (tú mismo)
-- REEMPLAZA 'TU-COMPANY-ID-AQUI' con el ID real de tu empresa
/*
INSERT INTO employees (
  company_id,
  cedula,
  full_name,
  email,
  phone,
  position,
  department,
  centro_costo,
  contract_number,
  hire_date,
  salary_type,
  base_salary,
  bank_name,
  account_number,
  afp,
  eps,
  contract_type,
  status
) VALUES (
  'TU-COMPANY-ID-AQUI',
  '1007398493',
  'MARLON ANDRES BUELVAS TELLEZ',
  'marlonbuelvas314@gmail.com',
  '3245653729',
  'Administrador',
  'Sistemas',
  'CC001',
  '08',
  '2025-09-01',
  'FIJO',
  1600000,
  'Bancolombia',
  '52391565295',
  'Porvenir',
  'Sura',
  'NOMINA',
  'ACTIVO'
);
*/

-- =====================================================
-- PASO 7: CREAR PERÍODO DE NÓMINA DE PRUEBA
-- =====================================================

-- Crea un período para probar el sistema
-- REEMPLAZA 'TU-COMPANY-ID-AQUI' con el ID real de tu empresa
/*
INSERT INTO payroll_periods (
  company_id,
  period_number,
  start_date,
  end_date,
  status
) VALUES (
  'TU-COMPANY-ID-AQUI',
  1,
  '2025-09-01',
  '2025-09-30',
  'BORRADOR'
);
*/

-- =====================================================
-- PASO 8: VERIFICAR CONFIGURACIÓN
-- =====================================================

-- Verifica que todo esté configurado correctamente
SELECT 'Verificación del sistema:' as status;

-- Verificar empresa
SELECT 
  'Empresa:' as tipo,
  id,
  name,
  nit,
  nombre_representante
FROM companies;

-- Verificar usuario
SELECT 
  'Usuario:' as tipo,
  id,
  email,
  full_name,
  role,
  status,
  company_id
FROM profiles;

-- Verificar empleado
SELECT 
  'Empleado:' as tipo,
  id,
  cedula,
  full_name,
  email,
  contract_type,
  status
FROM employees;

-- Verificar período
SELECT 
  'Período:' as tipo,
  id,
  period_number,
  start_date,
  end_date,
  status
FROM payroll_periods;

-- =====================================================
-- PASO 9: PROBAR FUNCIONES RPC
-- =====================================================

-- Prueba la función de información del usuario
-- (esto funciona después de hacer login en tu app)
/*
SELECT get_current_user_info();
*/

-- =====================================================
-- PASO 10: CONFIGURAR VARIABLES DE ENTORNO
-- =====================================================

/*
Asegúrate de que tu archivo .env.local tenga:

NEXT_PUBLIC_SUPABASE_URL=tu-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
RESEND_API_KEY=re_KB4gj3Lp_NboxtfNHHZnCnaJTEQidNcrF
RESEND_FROM_EMAIL=sistemasciot@gmail.com
*/

-- =====================================================
-- FINALIZACIÓN - CHECKLIST
-- =====================================================

/*
✅ CHECKLIST FINAL:

□ Script RESET_AND_CREATE_COMPLETE_SYSTEM.sql ejecutado
□ Script USER_SYSTEM_COMPLETE.sql ejecutado  
□ Script USER_SYSTEM_ADVANCED.sql ejecutado
□ Datos de empresa actualizados con representative_data
□ Usuario registrado en Supabase Auth
□ Usuario vinculado a empresa como ADMIN
□ Empleado de ejemplo creado
□ Período de nómina de prueba creado
□ Variables de entorno configuradas
□ Sistema probado con get_current_user_info()

🎉 SISTEMA LISTO PARA USAR:
- Login/Register funcionando
- Gestión de empleados NOMINA/OPS
- Generación de documentos diferenciados
- Envío de emails con Resend
- Políticas de seguridad RLS
- Log de actividades
- Gestión de roles y permisos

📱 PRÓXIMOS PASOS:
1. Probar login en la aplicación
2. Crear más empleados desde la UI
3. Generar períodos de nómina
4. Probar envío de documentos
5. Configurar más usuarios si necesario
*/

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '🎯 CONFIGURACIÓN COMPLETA DEL SISTEMA';
  RAISE NOTICE '📋 Sigue las instrucciones paso a paso de este archivo';
  RAISE NOTICE '🔧 Reemplaza TU-COMPANY-ID-AQUI con tu ID real';
  RAISE NOTICE '✅ Verifica cada paso antes de continuar';
  RAISE NOTICE '🚀 ¡Tu sistema de nómina estará listo!';
END $$;