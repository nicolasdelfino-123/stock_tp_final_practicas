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
    isbn = request.args.get('isbn')  # Obtener el ISBN si está presente

    try:
        if isbn:  # Si el ISBN está presente, filtra por él
            libro = session.query(Libro).filter(Libro.isbn == isbn).first()
            if libro:
                return jsonify([{
                    'id': libro.id,
                    'titulo': libro.titulo,
                    'autor': libro.autor,
                    'editorial': libro.editorial,
                    'isbn': libro.isbn,
                    'stock': libro.stock,
                    'precio': libro.precio,
                    'ubicacion': libro.ubicacion
                }])
            else:
                return jsonify({'error': 'Libro con ese ISBN no encontrado'}), 404
        
        # Si no se pasa ISBN, busca por palabra clave
        if palabra_clave:
            palabra_clave = unidecode(palabra_clave.lower())
            libros = session.query(Libro).filter(
                or_( # or_ es como WHERE titulo LIKE '%harry%' OR autor LIKE '%harry%' “significa Dame los libros que cumplan con condición_1 o condición_2”.
                    func.lower(Libro.titulo).like(f"%{palabra_clave}%"),
                    #Esto baja todo a minúsculas. Es para que la búsqueda no sea sensible a mayúsculas/minúsculas. esto genera en SQL algo como LOWER(titulo)
                    func.lower(Libro.autor).like(f"%{palabra_clave}%")
                    #El % significa “cualquier cosa antes o después”.
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
            'precio': libro.precio,
            'ubicacion': libro.ubicacion
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
        # Buscar si ya existe un libro con el mismo ISBN
        libro_existente = session.query(Libro).filter(Libro.isbn == data.get('isbn')).first()

        if libro_existente:
            # Si ya existe, actualizamos el libro con los nuevos datos
            libro_existente.titulo = data['titulo']
            libro_existente.autor = data['autor']
            libro_existente.editorial = data.get('editorial')
            libro_existente.stock = data.get('stock', 0)
            libro_existente.precio = precio
            libro_existente.ubicacion = data.get('ubicacion')

            session.commit()
            return jsonify({'mensaje': 'Libro actualizado con éxito'}), 200
        else:
            # Si no existe, creamos un nuevo libro
            nuevo_libro = Libro(
                titulo=data['titulo'],
                autor=data['autor'],
                editorial=data.get('editorial'),
                isbn=data.get('isbn'),
                stock=data.get('stock', 0),
                precio=precio,
                ubicacion=data.get('ubicacion')
            )
            session.add(nuevo_libro)
            session.commit()
            return jsonify({'mensaje': 'Libro creado con éxito'}), 201

    except Exception as e:
        session.rollback()
        return jsonify({'error': 'Error al crear o actualizar el libro', 'mensaje': str(e)}), 500


# Actualizar libro
@app.route('/libros/<int:libro_id>', methods=['PUT'])
def actualizar_libro(libro_id):
    session = app.session
    libro = session.query(Libro).get(libro_id)

    if libro is None:
        return jsonify({'error': 'Libro no encontrado'}), 404

    data = request.json
    if not data.get('titulo') or not data.get('autor'):
        return jsonify({'error': 'Faltan campos obligatorios (titulo o autor)'}), 400

    try:
        libro.titulo = data['titulo']
        libro.autor = data['autor']
        libro.editorial = data.get('editorial')
        libro.isbn = data.get('isbn')
        libro.stock = data.get('stock', 0)
        libro.precio = float(data['precio'])
        libro.ubicacion = data.get('ubicacion')

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
    
    # Bajar Stock de un libro
@app.route('/bajar-libro/<int:libro_id>', methods=['PUT'])
def bajar_libro(libro_id):
    session = app.session
    libro = session.query(Libro).get(libro_id)

    if libro is None:
        return jsonify({'error': 'Libro no encontrado'}), 404

    data = request.json
    cantidad = data.get('cantidad')

    if not cantidad or cantidad <= 0:
        return jsonify({'error': 'Cantidad inválida'}), 400

    try:
        # Log para ver el stock antes de la actualización
        app.logger.info(f"Antes de actualizar: {libro.titulo} - Stock actual: {libro.stock}")

        if libro.stock >= cantidad:
            libro.stock -= cantidad
            session.commit()

            # Log para confirmar que se hizo la actualización
            app.logger.info(f"Después de actualizar: {libro.titulo} - Stock restante: {libro.stock}")
            
            return jsonify({'mensaje': 'Stock actualizado exitosamente'})
        else:
            return jsonify({'error': 'No hay suficiente stock disponible'}), 400
    except Exception as e:
        session.rollback()
        app.logger.error(f"Error al actualizar el stock: {str(e)}")
        return jsonify({'error': 'Error al bajar el stock', 'mensaje': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
