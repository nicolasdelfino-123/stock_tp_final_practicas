import os
from dotenv import load_dotenv

load_dotenv()

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'clave-por-defecto')

    # URI para desarrollo local (reemplazalo por tu DB local)
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://app_stock:1234@localhost:5432/stock_charles?options=-csearch_path%3Dstock_charles_schema"
    )

    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_size': 10,
        'max_overflow': 20,
        'pool_recycle': 3600,
        'pool_timeout': 30,
        'connect_args': {
            'connect_timeout': 10,
            'application_name': 'stock_charles_app'
        }
    }

    # Opcional: control CORS (útil para producción)
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")


class ProductionConfig(Config):
    DEBUG = False
    
    # 🎯 FIX: Usar DATABASE_URL directamente en producción
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        # Fallback para desarrollo local
        "postgresql://app_stock_dev:dev123456@localhost:5432/stock_charles_dev?options=-csearch_path%3Dstock_charles_schema"
    )
    
    # 🔧 CREAR TABLAS EN PRODUCCIÓN
    CREATE_TABLES_ON_STARTUP = True
