from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from config import Config
from models.libro import Libro, Base

# Crear el engine y la sesión
engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
Session = sessionmaker(bind=engine)
session = Session()

# Crear algunos libros de ejemplo
libros = [
    Libro(titulo="Cien años de soledad", autor="Gabriel García Márquez", editorial="Sudamericana", isbn="1234567890", stock=10, precio=1500.00),
    Libro(titulo="El principito", autor="Antoine de Saint-Exupéry", editorial="EMECE", isbn="0987654321", stock=5, precio=1200.00),
    Libro(titulo="1984", autor="George Orwell", editorial="Planeta", isbn="1111222233", stock=7, precio=1800.00),
]

# Agregar y guardar
session.add_all(libros)
session.commit()
session.close()

print("Libros agregados exitosamente.")
