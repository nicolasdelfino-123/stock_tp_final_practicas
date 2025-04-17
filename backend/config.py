import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(basedir, "libros.db")  # Base de datos SQLite local

    # Si en algún momento decides usar PostgreSQL, descomenta la siguiente línea y ajusta los datos.
    # SQLALCHEMY_DATABASE_URI = "postgresql://usuario:contraseña@localhost:5432/tu_basedatos"
