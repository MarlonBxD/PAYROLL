-- Agregar campos del representante legal a la tabla companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nombre_representante TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tipo_documento_representante TEXT DEFAULT 'CC';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS numero_documento_representante TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS firma_representante_url TEXT;

-- Actualizar datos por defecto para la empresa existente (opcional)
UPDATE companies 
SET 
  nombre_representante = 'Representante Legal',
  tipo_documento_representante = 'CC',
  numero_documento_representante = '12345678'
WHERE nombre_representante IS NULL;