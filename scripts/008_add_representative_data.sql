-- Add representative legal data to companies table
-- This migration adds fields for legal representative information

-- Add representative legal fields to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nombre_representante TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tipo_documento_representante TEXT 
  CHECK (tipo_documento_representante IN ('CC', 'CE', 'PP', 'NIT'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS numero_documento_representante TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN companies.nombre_representante IS 'Nombre completo del representante legal';
COMMENT ON COLUMN companies.tipo_documento_representante IS 'Tipo de documento del representante legal (CC, CE, PP, NIT)';
COMMENT ON COLUMN companies.numero_documento_representante IS 'Número de documento del representante legal';

-- Add default representative data if company exists but has no representative
-- UPDATE companies SET nombre_representante = 'Por definir' WHERE nombre_representante IS NULL;
-- UPDATE companies SET tipo_documento_representante = 'CC' WHERE tipo_documento_representante IS NULL;
-- UPDATE companies SET numero_documento_representante = '00000000' WHERE numero_documento_representante IS NULL;