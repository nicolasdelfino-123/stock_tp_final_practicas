#!/usr/bin/env python3
"""
Script para verificar la conexión a la base de datos
y mostrar información de la BD actual
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Cargar variables de entorno
load_dotenv()

# Obtener la URL de la base de datos
database_url = os.getenv('DATABASE_URL')
db_name = os.getenv('DB_NAME')
db_user = os.getenv('DB_USER')

print("🔍 VERIFICACIÓN DE CONEXIÓN A BASE DE DATOS")
print("=" * 50)
print(f"📊 Base de datos configurada: {db_name}")
print(f"👤 Usuario configurado: {db_user}")
print(f"🔗 URL de conexión: {database_url}")
print("=" * 50)

try:
    # Crear conexión
    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        # Verificar a qué base de datos estamos conectados
        result = conn.execute(text("SELECT current_database(), current_user, version()"))
        db_info = result.fetchone()
        
        print(f"✅ CONEXIÓN EXITOSA")
        print(f"📍 Base de datos actual: {db_info[0]}")
        print(f"👤 Usuario actual: {db_info[1]}")
        print(f"🐘 Versión PostgreSQL: {db_info[2]}")
        
        # Verificar si existen las tablas principales
        print("\n📋 TABLAS EXISTENTES:")
        tables_result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'stock_charles_schema' 
            ORDER BY table_name
        """))
        
        tables = tables_result.fetchall()
        if tables:
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print("   ⚠️  No hay tablas en el esquema stock_charles_schema")
            
        # Verificar el esquema de la tabla pedidos si existe
        print("\n🏗️  ESTRUCTURA DE LA TABLA 'pedidos' (si existe):")
        try:
            columns_result = conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'stock_charles_schema' 
                AND table_name = 'pedidos'
                ORDER BY ordinal_position
            """))
            columns = columns_result.fetchall()
            if columns:
                for col in columns:
                    print(f"   - {col[0]} ({col[1]})")
            else:
                print("   ⚠️  La tabla 'pedidos' no existe o no tiene columnas")
        except Exception as e:
            print(f"   ⚠️  Error al consultar tabla pedidos: {e}")

except Exception as e:
    print(f"❌ ERROR DE CONEXIÓN: {e}")
    print("\n💡 Posibles soluciones:")
    print("   1. Verificar que PostgreSQL esté corriendo")
    print("   2. Verificar credenciales en el archivo .env")
    print("   3. Verificar que la base de datos existe")
