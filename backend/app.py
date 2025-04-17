from flask import Flask, jsonify, request
from sqlalchemy import create_engine, or_, func
from sqlalchemy.orm import sessionmaker
from config import Config
from models.libro import Base, Libro
from unidecode import unidecode
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config.from_object(Config)

    engine = create_engine(app.config["SQLALCHEMY_DATABASE_URI"], echo=True)
    Base.metadata.create_all(engine)

    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    app.session = Session()

    return app

app = create_app()

# Obtener todos los libros o filtrar por palabra clave
@app.route('/libros', methods=['GET'])
def obtener_libros():
    session = app.session
    palabra_clave = request.args.get('q')

    try:
        if palabra_clave:
            # Normalizamos palabra clave (sin tildes, minúscula)
            palabra_clave = unidecode(palabra_clave.lower())

            # Si usas PostgreSQL, puedes usar unaccent, pero aquí asumo que no.
            # Te sugiero usar lower() y unidecode para las búsquedas de texto.
            libros = session.query(Libro).filter(
                or_(
                    func.lower(Libro.titulo).like(f"%{palabra_clave}%"),
                    func.lower(Libro.autor).like(f"%{palabra_clave}%")
                )
            ).all()
        else:
            libros = session.query(Libro).all()

        return jsonify([{
            'id': libro.id,
            'titulo': libro.titulo,
            'autor': libro.autor,
            'editorial': libro.editorial,
            'isbn': libro.isbn,
            'stock': libro.stock,
            'precio': libro.precio
        } for libro in libros])

    except Exception as e:
        return jsonify({'error': 'Ocurrió un error al obtener los libros', 'mensaje': str(e)}), 500

# Crear nuevo libro con validación
@app.route('/libros', methods=['POST'])
def crear_libro():
    session = app.session
    data = request.json
    print("📦 Datos recibidos:", data)

    # Validación de campos obligatorios (sacamos precio de la validación)
    if not data.get('titulo') or not data.get('autor'):
        return jsonify({'error': 'Faltan campos obligatorios (titulo o autor)'}), 400

    # Procesar el precio: si viene vacío o null, lo dejamos en None
    precio_raw = data.get('precio')
    precio = float(precio_raw) if precio_raw not in (None, '', 'null') else None

    try:
        nuevo_libro = Libro(
            titulo=data['titulo'],
            autor=data['autor'],
            editorial=data.get('editorial'),
            isbn=data.get('isbn'),
            stock=data.get('stock', 0),
            precio=precio
        )
        session.add(nuevo_libro)
        session.commit()
        return jsonify({'mensaje': 'Libro creado con éxito'}), 201

    except Exception as e:
        session.rollback()
        return jsonify({'error': 'Error al crear el libro', 'mensaje': str(e)}), 500


# Actualizar libro
@app.route('/libros/<int:libro_id>', methods=['PUT'])
def actualizar_libro(libro_id):
    session = app.session
    libro = session.query(Libro).get(libro_id)

    if libro is None:
        return jsonify({'error': 'Libro no encontrado'}), 404

    data = request.json
    if not data.get('titulo') or not data.get('autor') or not data.get('precio'):
        return jsonify({'error': 'Faltan campos obligatorios (titulo, autor o precio)'}), 400

    try:
        libro.titulo = data['titulo']
        libro.autor = data['autor']
        libro.editorial = data.get('editorial')
        libro.isbn = data.get('isbn')
        libro.stock = data.get('stock', 0)
        libro.precio = float(data['precio'])

        session.commit()
        return jsonify({'mensaje': 'Libro actualizado'})

    except Exception as e:
        session.rollback()
        return jsonify({'error': 'Error al actualizar el libro', 'mensaje': str(e)}), 500

# Eliminar libro
@app.route('/libros/<int:libro_id>', methods=['DELETE'])
def eliminar_libro(libro_id):
    session = app.session
    libro = session.query(Libro).get(libro_id)

    if libro is None:
        return jsonify({'error': 'Libro no encontrado'}), 404

    try:
        session.delete(libro)
        session.commit()
        return jsonify({'mensaje': 'Libro eliminado'})
    except Exception as e:
        session.rollback()
        return jsonify({'error': 'Error al eliminar el libro', 'mensaje': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
