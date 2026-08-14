-- Migración segura para la base D1 EXISTENTE. Ejecutar UNA sola vez antes o después del deploy.
-- Los registros antiguos quedan automáticamente como inglés.
ALTER TABLE leads ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
