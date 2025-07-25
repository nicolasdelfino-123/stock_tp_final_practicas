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
    DB_USER = os.getenv('DB_USER', 'app_stock')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '1234')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'stock_charles')
    DB_SCHEMA = os.getenv('DB_SCHEMA', 'stock_charles_schema')

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DB_USER}:{DB_PASSWORD}@"
        f"{DB_HOST}:{DB_PORT}/{DB_NAME}"
        f"?options=-csearch_path%3D{DB_SCHEMA}"
    )
