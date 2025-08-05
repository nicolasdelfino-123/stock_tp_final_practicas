from flask import Flask, jsonify, request
from sqlalchemy import create_engine, or_, func
from sqlalchemy.orm import sessionmaker
from config import ProductionConfig  # usamos configuración segura desde .env
from models.libro import Base, Libro
from unidecode import unidecode
from flask_cors import CORS
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from sqlalchemy import func
from models.libro import Base
import jwt 
import datetime
import time
from flask import send_from_directory
import os




def create_app():
    app = Flask(__name__, static_folder="../frontend/build", static_url_path="/")
    CORS(app)
    app.config.from_object(ProductionConfig)
    

    
    engine = create_engine(app.config["SQLALCHEMY_DATABASE_URI"], echo=True)
    
    # Especifica el esquema que quieres usar
    #Base.metadata.schema = 'nico'  # o cualquier otro esquema que tengas permiso
    
    Base.metadata.create_all(engine)

    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    app.session = Session()
    admin = Admin(app, name="Panel de Administración", template_mode="bootstrap3")
    admin.add_view(ModelView(Libro, app.session))

    return app

app = create_app()

@app.route("/")
def serve():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(app.static_folder, path)



SERVER_START_TIME = time.time()
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    # ⚠️ Login fijo (después lo cambiamos por usuarios reales de DB)
    if username == os.getenv('APP_LOGIN') and password == os.getenv('APP_PASSWORD'):

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
                'server_start': SERVER_START_TIME  # Agrega esto
                 }), 200
        except Exception as e:
            return jsonify({'error': 'Error generando token', 'detalle': str(e)}), 500
    else:
        return jsonify({'error': 'Credenciales inválidas'}), 401


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
                return jsonify([])  # Cambio clave: Devuelve array vacío en lugar de error 404
        
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

@app.route('/generar-isbn', methods=['GET'])
def generar_isbn():
    try:
        session = app.session

        # Buscar el último ISBN numérico de 5 dígitos
        ultimo_libro = session.query(Libro).filter(
            Libro.isbn.like('_____')  # Busca exactamente 5 caracteres (podrían ser dígitos)
        ).order_by(Libro.isbn.desc()).first()

        if ultimo_libro and ultimo_libro.isbn.isdigit():  # Verifica que sean solo dígitos
            nuevo_numero = int(ultimo_libro.isbn) + 1
        else:
            # Si no hay ISBNs numéricos, empezar desde 1
            nuevo_numero = 1

        nuevo_isbn = f"{nuevo_numero:05d}"  # Formatea a 5 dígitos con ceros a la izquierda

        # Verificar que no exista duplicado
        while session.query(Libro).filter(Libro.isbn == nuevo_isbn).first():
            nuevo_numero += 1
            nuevo_isbn = f"{nuevo_numero:05d}"

        return jsonify({'isbn': nuevo_isbn}), 200

    except Exception as e:
        print(f"Error en /generar-isbn: {str(e)}")
        return jsonify({'error': 'Error al generar ISBN', 'mensaje': str(e)}), 500
    
@app.route('/api/libros/buscar')
def buscar_por_titulo_o_autor():
    titulo = request.args.get('titulo', '')
    autor = request.args.get('autor', '')

    libros = Libro.query.filter(
        (Libro.titulo.ilike(f"%{titulo}%")) |
        (Libro.autor.ilike(f"%{autor}%"))
    ).all()

    return jsonify({"libros": [libro.to_dict() for libro in libros]})




@app.route('/api/editoriales', methods=['GET'])
def obtener_editoriales():
    """
    Obtiene todas las editoriales únicas de la base de datos usando SQLAlchemy
    """
    session = app.session
    try:
        # Consulta para obtener editoriales distintas, no nulas ni vacías
        editoriales = (
            session.query(Libro.editorial)
            .filter(Libro.editorial.isnot(None), Libro.editorial != "")
            .distinct()
            .order_by(Libro.editorial.asc())
            .all()
        )

        lista_editoriales = [e[0] for e in editoriales]

        return jsonify({
            "success": True,
            "editoriales": lista_editoriales
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500



def run():
    from database import init_db
    init_db()  # Crea las tablas si no existen
    app.run()

if __name__ == '__main__':
    run()
