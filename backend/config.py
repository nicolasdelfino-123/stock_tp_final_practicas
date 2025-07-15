import os
from dotenv import load_dotenv

# Carga variables del archivo .env para que estén disponibles en os.getenv()
load_dotenv()

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    # Mejora el rendimiento desactivando el seguimiento de cambios en los objetos SQLAlchemy
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Clave secreta para sesiones, tokens, etc (obtenida de .env o valor por defecto)
    SECRET_KEY = os.getenv('SECRET_KEY', 'clave-por-defecto')
    
    # URI base de la base de datos para desarrollo (no usar en producción)
    SQLALCHEMY_DATABASE_URI = "postgresql://app_stock:1234@localhost:5432/stock_charles?options=-csearch_path%3Dstock_charles_schema"

class ProductionConfig(Config):
    # Variables sensibles y específicas para producción, cargadas desde .env
    DB_USER = os.getenv('DB_USER', 'app_stock')  # Usuario DB
    DB_PASSWORD = os.getenv('DB_PASSWORD', '1234')  # Contraseña DB (debe estar en .env)
    DB_HOST = os.getenv('DB_HOST', 'localhost')  # Host PostgreSQL
    DB_PORT = os.getenv('DB_PORT', '5432')  # Puerto PostgreSQL
    DB_NAME = os.getenv('DB_NAME', 'stock_charles')  # Nombre DB
    DB_SCHEMA = os.getenv('DB_SCHEMA', 'stock_charles_schema')  # Esquema DB
    
    # Construye la URI completa para SQLAlchemy usando las variables anteriores
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DB_USER}:{DB_PASSWORD}@"
        f"{DB_HOST}:{DB_PORT}/{DB_NAME}"
        f"?options=-csearch_path%3D{DB_SCHEMA}"
    )
    
    # Opciones para manejar el pool de conexiones y mejorar estabilidad en producción
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,  # Verifica si las conexiones están activas antes de usarlas
        'pool_size': 10,        # Número máximo de conexiones en pool
        'max_overflow': 20,     # Conexiones extras que pueden crearse si pool está lleno
        'pool_recycle': 3600,   # Tiempo (segundos) para reciclar conexiones (evita timeouts)
        'pool_timeout': 30,     # Timeout para obtener conexión del pool
        'connect_args': {
            'connect_timeout': 10,  # Timeout de conexión a PostgreSQL
            'application_name': 'stock_charles_app'  # Nombre de la aplicación en PostgreSQL
        }
    }