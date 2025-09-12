#!/usr/bin/env python3
"""
Script de arranque del backend de Stock Charles
"""
import os
from dotenv import load_dotenv

# Cargar variables de entorno ANTES de importar app
load_dotenv()

# Ahora importar la aplicación
from app import app

if __name__ == "__main__":
    # Obtener configuración del .env
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    host = os.getenv('HOST', '0.0.0.0')
    
    print("🚀 INICIANDO BACKEND STOCK CHARLES")
    print("=" * 40)
    print(f"🌐 Host: {host}")
    print(f"🔌 Puerto: {port}")
    print(f"🐛 Debug: {debug}")
    print(f"🗄️  Base de datos: {os.getenv('DB_NAME')}")
    print(f"👤 Usuario DB: {os.getenv('DB_USER')}")
    print("=" * 40)
    print(f"📡 Servidor disponible en: http://localhost:{port}")
    print("🛑 Para detener el servidor: Ctrl+C")
    print("=" * 40)
    
    # Ejecutar la aplicación
    try:
        app.run(
            host=host,
            port=port,
            debug=debug
        )
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido por el usuario")
    except Exception as e:
        print(f"❌ Error al iniciar el servidor: {e}")
