#!/bin/bash

# Script para configurar base de datos de desarrollo
# Este script crea una base de datos completamente separada de producción

echo "🔧 Configurando base de datos de DESARROLLO para stock-charles..."
echo "⚠️  Esta configuración NO afectará tu base de datos de producción"

# Verificar si PostgreSQL está corriendo
if ! sudo systemctl is-active --quiet postgresql; then
    echo "❌ PostgreSQL no está corriendo. Iniciando..."
    sudo systemctl start postgresql
fi

# Conectarse como postgres y crear la configuración de desarrollo
sudo -u postgres psql << EOF
-- Crear usuario para desarrollo (diferente al de producción)
CREATE USER app_stock_dev WITH PASSWORD 'dev123456';

-- Crear base de datos de desarrollo
CREATE DATABASE stock_charles_dev OWNER app_stock_dev;

-- Dar permisos al usuario
GRANT ALL PRIVILEGES ON DATABASE stock_charles_dev TO app_stock_dev;

-- Conectarse a la base de datos de desarrollo
\c stock_charles_dev;

-- Crear el esquema
CREATE SCHEMA IF NOT EXISTS stock_charles_schema;

-- Dar permisos al esquema
GRANT ALL ON SCHEMA stock_charles_schema TO app_stock_dev;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA stock_charles_schema TO app_stock_dev;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA stock_charles_schema TO app_stock_dev;

-- Configurar búsqueda por defecto
ALTER USER app_stock_dev SET search_path TO stock_charles_schema;

\q
EOF

echo "✅ Base de datos de desarrollo configurada correctamente"
echo "📊 Detalles de la configuración:"
echo "   - Usuario: app_stock_dev"
echo "   - Password: dev123456"
echo "   - Base de datos: stock_charles_dev"
echo "   - Esquema: stock_charles_schema"
echo "   - Puerto: 5432 (mismo puerto, pero BD diferente)"
