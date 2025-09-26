-- Insertar empresa de ejemplo
INSERT INTO companies (id, name, nit, address, phone, email) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'CAJACOPI EPS S.A.S',
  '900123456-1',
  'Calle 123 #45-67, Bogotá',
  '+57 1 234 5678',
  'info@cajacopi.com'
) ON CONFLICT (nit) DO NOTHING;

-- Insertar empleado de ejemplo basado en el desprendible
INSERT INTO employees (
  company_id,
  cedula,
  full_name,
  centro_costo,
  contract_number,
  hire_date,
  salary_type,
  base_salary,
  bank_name,
  account_number,
  afp,
  eps,
  status
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '1082859058',
  'MEYER CORREA ILSE ROSA',
  'CAJACOPI COSTO MAGDALENA',
  '20392',
  '2025-03-01',
  'VARIABLE',
  4244625.00,
  'BANCO DE BOGOTÁ',
  '439215518',
  'PROTECCION S.A.',
  'NUEVA E.P.S. S.A.',
  'ACTIVO'
) ON CONFLICT (company_id, cedula) DO NOTHING;
