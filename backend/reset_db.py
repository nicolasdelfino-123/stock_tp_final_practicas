# reset_db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from config import ProductionConfig
from models.libro import Base, Libro

# Crear engine igual que en app.py
engine = create_engine(ProductionConfig.SQLALCHEMY_DATABASE_URI, echo=True)

# Crear sesión scoped para la base
Session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
session = Session()

try:
    # Borra todos los libros
    num_eliminados = session.query(Libro).delete()
    session.commit()
    print(f"Se eliminaron {num_eliminados} libros de la base de datos.")
except Exception as e:
    session.rollback()
    print(f"Error al eliminar libros: {e}")
finally:
    session.close()
    Session.remove()
