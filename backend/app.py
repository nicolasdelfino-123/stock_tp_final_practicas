import os
import time
import datetime
import jwt
from functools import wraps

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView

from sqlalchemy import create_engine, or_, func
from sqlalchemy.orm import sessionmaker, scoped_session

from unidecode import unidecode

from config import ProductionConfig
from models.libro import Base, Libro


def create_app():
    app = Flask(__name__)
    
    # CORS: restringir según variable de entorno o usar '*'
    cors_origins = os.getenv("CORS_ORIGINS", "*")
    CORS(app, origins=cors_origins)
    
    app.config.from_object(ProductionConfig)

    engine = create_engine(app.config["SQLALCHEMY_DATABASE_URI"], echo=True)

    # Crear tablas si no existen
    Base.metadata.create_all(engine)

    # Scoped session para evitar problemas con sesiones concurrentes
    Session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
    app.session = Session

    # Admin panel con sesión scoped
    admin = Admin(app, name="Panel de Administración", template_mode="bootstrap3")
    admin.add_view(ModelView(Libro, Session()))

    return app


app = create_app()

SERVER_START_TIME = time.time()


# --- Decorador para proteger rutas con JWT ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Buscar token en headers Authorization Bearer
        auth_header = request.headers.get('Authorization', None)
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]

        if not token:
            return jsonify({'error': 'Token es requerido'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = data['user']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expirado'}), 401
        except Exception:
            return jsonify({'error': 'Token inválido'}), 401

        return f(current_user, *args, **kwargs)
    return decorated


@app.route('/')
def index():
    return '¡Bienvenido a la aplicación Flask!'


@app.route('/ping')
def ping():
    return jsonify({'message': 'pong'}), 200


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    # Login fijo (para producción, reemplazar con DB y bcrypt)
    if username == 'admin' and password == '1234':
        try:
            payload = {
                'user': username,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
            }
            token = jwt.encode(payload, app.config["SECRET_KEY"], algorithm='HS256')

            return jsonify({
                'message': 'Login exitoso',
                'token': token,
                'user': username,
                'server_start': SERVER_START_TIME
            }), 200
        except Exception as e:
            return jsonify({'error': 'Error generando token', 'detalle': str(e)}), 500
    else:
        return jsonify({'error': 'Credenciales inválidas'}), 401


# --- Ejemplo de ruta protegida con JWT ---
@app.route('/libros', methods=['GET'])
@token_required
def obtener_libros(current_user):
    session = app.session()
    palabra_clave = request.args.get('q')
    isbn = request.args.get('isbn')  # Obtener el ISBN si está presente

    try:
        if isbn:  # Filtrar por ISBN
            libro = session.query(Libro).filter(Libro.isbn == isbn).first()
            session.close()
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
                return jsonify([])

        # Buscar por palabra clave
        if palabra_clave:
            palabra_clave = unidecode(palabra_clave.lower())
            libros = session.query(Libro).filter(
                or_(
                    func.lower(Libro.titulo).like(f"%{palabra_clave}%"),
                    func.lower(Libro.autor).like(f"%{palabra_clave}%")
                )
            ).all()
        else:
            libros = session.query(Libro).all()

        result = [{
            'id': libro.id,
            'titulo': libro.titulo,
            'autor': libro.autor,
            'editorial': libro.editorial,
            'isbn': libro.isbn,
            'stock': libro.stock,
            'precio': libro.precio,
            'ubicacion': libro.ubicacion
        } for libro in libros]
        session.close()
        return jsonify(result)

    except Exception as e:
        session.close()
        return jsonify({'error': 'Ocurrió un error al obtener los libros', 'mensaje': str(e)}), 500


@app.route('/libros', methods=['POST'])
@token_required
def crear_libro(current_user):
    session = app.session()
    data = request.json

    # Validación
    if not data.get('titulo') or not data.get('autor'):
        session.close()
        return jsonify({'error': 'Faltan campos obligatorios (titulo o autor)'}), 400

    precio_raw = data.get('precio')
    precio = float(precio_raw) if precio_raw not in (None, '', 'null') else None

    try:
        libro_existente = session.query(Libro).filter(Libro.isbn == data.get('isbn')).first()

        if libro_existente:
            libro_existente.titulo = data['titulo']
            libro_existente.autor = data['autor']
            libro_existente.editorial = data.get('editorial')
            libro_existente.stock = data.get('stock', 0)
            libro_existente.precio = precio
            libro_existente.ubicacion = data.get('ubicacion')

            session.commit()
            session.close()
            return jsonify({'mensaje': 'Libro actualizado con éxito'}), 200
        else:
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
            session.close()
            return jsonify({'mensaje': 'Libro creado con éxito'}), 201

    except Exception as e:
        session.rollback()
        session.close()
        return jsonify({'error': 'Error al crear o actualizar el libro', 'mensaje': str(e)}), 500


@app.route('/libros/<int:libro_id>', methods=['PUT'])
@token_required
def actualizar_libro(current_user, libro_id):
    session = app.session()
    libro = session.query(Libro).get(libro_id)

    if libro is None:
        session.close()
        return jsonify({'error': 'Libro no encontrado'}), 404

    data = request.json
    if not data.get('titulo') or not data.get('autor'):
        session.close()
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
        session.close()
        return jsonify({'mensaje': 'Libro actualizado'})

    except Exception as e:
        session.rollback()
        session.close()
        return jsonify({'error': 'Error al actualizar el libro', 'mensaje': str(e)}), 500


@app.route('/libros/<int:libro_id>', methods=['DELETE'])
@token_required
def eliminar_libro(current_user, libro_id):
    session = app.session()
    libro = session.query(Libro).get(libro_id)

    if libro is None:
        session.close()
        return jsonify({'error': 'Libro no encontrado'}), 404

    try:
        session.delete(libro)
        session.commit()
        session.close()
        return jsonify({'mensaje': 'Libro eliminado'})
    except Exception as e:
        session.rollback()
        session.close()
        return jsonify({'error': 'Error al eliminar el libro', 'mensaje': str(e)}), 500


@app.route('/bajar-libro/<int:libro_id>', methods=['PUT'])
@token_required
def bajar_libro(current_user, libro_id):
    session = app.session()
    libro = session.query(Libro).get(libro_id)

    if libro is None:
        session.close()
        return jsonify({'error': 'Libro no encontrado'}), 404

    data = request.json
    cantidad = data.get('cantidad')

    if not cantidad or cantidad <= 0:
        session.close()
        return jsonify({'error': 'Cantidad inválida'}), 400

    try:
        app.logger.info(f"Antes de actualizar: {libro.titulo} - Stock actual: {libro.stock}")

        if libro.stock >= cantidad:
            libro.stock -= cantidad
            session.commit()

            app.logger.info(f"Después de actualizar: {libro.titulo} - Stock restante: {libro.stock}")

            session.close()
            return jsonify({'mensaje': 'Stock actualizado exitosamente'})
        else:
            session.close()
            return jsonify({'error': 'No hay suficiente stock disponible'}), 400
    except Exception as e:
        session.rollback()
        session.close()
        app.logger.error(f"Error al actualizar el stock: {str(e)}")
        return jsonify({'error': 'Error al bajar el stock', 'mensaje': str(e)}), 500


@app.route('/generar-isbn', methods=['GET'])
@token_required
def generar_isbn(current_user):
    session = app.session()

    try:
        ultimo_libro = session.query(Libro).filter(
            Libro.isbn.like('_____')
        ).order_by(Libro.isbn.desc()).first()

        if ultimo_libro and ultimo_libro.isbn.isdigit():
            nuevo_numero = int(ultimo_libro.isbn) + 1
        else:
            nuevo_numero = 1

        nuevo_isbn = f"{nuevo_numero:05d}"

        while session.query(Libro).filter(Libro.isbn == nuevo_isbn).first():
            nuevo_numero += 1
            nuevo_isbn = f"{nuevo_numero:05d}"

        session.close()
        return jsonify({'isbn': nuevo_isbn}), 200

    except Exception as e:
        session.close()
        app.logger.error(f"Error en /generar-isbn: {str(e)}")
        return jsonify({'error': 'Error al generar ISBN', 'mensaje': str(e)}), 500


@app.route('/api/libros/buscar')
@token_required
def buscar_por_titulo_o_autor(current_user):
    session = app.session()
    titulo = request.args.get('titulo', '')
    autor = request.args.get('autor', '')

    libros = session.query(Libro).filter(
        (Libro.titulo.ilike(f"%{titulo}%")) |
        (Libro.autor.ilike(f"%{autor}%"))
    ).all()
    result = [libro.to_dict() for libro in libros]
    session.close()
    return jsonify({"libros": result})


@app.route('/api/editoriales', methods=['GET'])
@token_required
def obtener_editoriales(current_user):
    session = app.session()
    try:
        editoriales = (
            session.query(Libro.editorial)
            .filter(Libro.editorial.isnot(None), Libro.editorial != "")
            .distinct()
            .order_by(Libro.editorial.asc())
            .all()
        )

        lista_editoriales = [e[0] for e in editoriales]
        session.close()
        return jsonify({
            "success": True,
            "editoriales": lista_editoriales
        })
    except Exception as e:
        session.close()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# Manejo global de errores
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Recurso no encontrado'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Error interno del servidor'}), 500


if __name__ == '__main__':
    from database import init_db
    import sys

    init_db()

    port = int(os.getenv('PORT', 5000))
    debug_mode = False  # NO debug en producción
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
