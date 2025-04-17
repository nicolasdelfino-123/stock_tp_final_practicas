from database import get_engine

# Crear el motor de base de datos
engine = get_engine()

# Intentamos conectar a la base de datos
try:
    connection = engine.connect()
    print("Conexión exitosa a la base de datos")
    connection.close()
except Exception as e:
    print(f"Error al conectar a la base de datos: {e}")
