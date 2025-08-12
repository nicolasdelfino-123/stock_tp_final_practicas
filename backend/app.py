from flask import Flask, jsonify, request
from sqlalchemy import create_engine, or_, func
from sqlalchemy.orm import sessionmaker
from config import ProductionConfig  # usamos configuración segura desde .env
from models.libro import Base, Libro, Faltante, Pedido  
from unidecode import unidecode
from flask_cors import CORS
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from sqlalchemy import func
from models.libro import Base
import jwt 

import time
from flask import send_from_directory
import os
from flask import abort
from datetime import datetime, timedelta
from sqlalchemy.exc import SQLAlchemyError




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
                        'exp': datetime.utcnow() + timedelta(hours=2)  # ✅ FIX
}
            token = jwt.encode(payload, app.config["SECRET_KEY"], algorithm='HS256')
           
            print("TOKEN TYPE:", type(token))


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
    






@app.route('/libros/<int:libro_id>/marcar-baja', methods=['PUT'])
def marcar_baja(libro_id):
    session = app.session
    libro = session.query(Libro).get(libro_id)

    if libro is None:
        return jsonify({'error': 'Libro no encontrado'}), 404

    try:
        fecha_actual = datetime.now()
        libro.fecha_baja = fecha_actual
        session.merge(libro)
        session.commit()
        session.refresh(libro)
        return jsonify({
            'mensaje': 'Libro marcado como dado de baja',
            'fecha_baja': libro.fecha_baja.isoformat(),
            'libro': {
                'id': libro.id,
                'titulo': libro.titulo,
                'fecha_baja': libro.fecha_baja.isoformat()
            }
        })
    except Exception as e:
        session.rollback()
        return jsonify({'error': 'Error al marcar como baja', 'mensaje': str(e)}), 500


@app.route('/libros/dados-baja', methods=['GET'])
def listar_dados_baja():
    session = app.session
    try:
        libros = session.query(Libro).filter(Libro.fecha_baja.isnot(None)).all()
        print(f"📚 Encontrados {len(libros)} libros dados de baja")
        for libro in libros:
            print(f"- ID: {libro.id}, Título: {libro.titulo}, Fecha baja: {libro.fecha_baja}")
        return jsonify([
            {
                'id': libro.id,
                'titulo': libro.titulo,
                'autor': libro.autor,
                'editorial': libro.editorial,
                'isbn': libro.isbn,
                'stock': libro.stock,
                'precio': libro.precio,
                'cantidad': libro.stock,  # Añadido para mostrar cantidad actual
                'ubicacion': libro.ubicacion,
                'fecha_baja': libro.fecha_baja.isoformat() if libro.fecha_baja else None
            }
            for libro in libros
        ])
    except Exception as e:
        print(f"❌ Error al obtener libros dados de baja: {e}")
        return jsonify({'error': 'Error al obtener libros dados de baja', 'mensaje': str(e)}), 500






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

from flask import jsonify




@app.route('/api/faltantes', methods=['GET'])
def get_faltantes():
    session = app.session
    try:
     
        faltantes = session.query(Faltante).filter(Faltante.eliminado == False).order_by(Faltante.id.desc()).all()

        return jsonify([{"id": f.id, "descripcion": f.descripcion} for f in faltantes])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/faltantes', methods=['POST'])
def crear_faltante():
    session = app.session
    data = request.json
    descripcion = data.get("descripcion")
    if not descripcion:
        return jsonify({"error": "Faltante sin descripción"}), 400
    try:
        nuevo = Faltante(descripcion=descripcion)
        session.add(nuevo)
        session.commit()
        return jsonify({"success": True, "faltante": {"id": nuevo.id, "descripcion": nuevo.descripcion}})
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/faltantes', methods=['DELETE'],strict_slashes=False)
def limpiar_faltantes():
    session = app.session
    try:
        session.query(Faltante).filter(Faltante.eliminado == False).update({"eliminado": True})
        session.commit()
        return jsonify({"success": True})
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500



@app.route('/api/faltantes/<int:id>', methods=['PUT', 'DELETE'],strict_slashes=False)
def modificar_faltante(id):
    session = app.session
    
    if request.method == 'PUT':
        data = request.json
        descripcion = data.get("descripcion")
        if not descripcion:
            return jsonify({"error": "Descripción requerida para editar"}), 400
        try:
            faltante = session.query(Faltante).filter(Faltante.id == id).first()
            if not faltante:
                return jsonify({"error": "Faltante no encontrado"}), 404
            
            faltante.descripcion = descripcion
            session.commit()
            return jsonify({"success": True, "faltante": {"id": faltante.id, "descripcion": faltante.descripcion}})
        except Exception as e:
            session.rollback()
            return jsonify({"error": str(e)}), 500

    elif request.method == 'DELETE':
        try:
            faltante = session.query(Faltante).filter(Faltante.id == id).first()
            if not faltante:
                return jsonify({"error": "Faltante no encontrado"}), 404

            faltante.eliminado = True
            session.commit()

            return jsonify({"success": True})
        except Exception as e:
            session.rollback()
            return jsonify({"error": str(e)}), 500


@app.route('/api/faltantes/recuperar/<int:id>', methods=['PUT'])
def recuperar_faltante(id):
    session = app.session
    try:
        faltante = session.query(Faltante).filter(Faltante.id == id, Faltante.eliminado == True).first()
        if not faltante:
            return jsonify({"error": "Faltante no encontrado o no está eliminado"}), 404
        faltante.eliminado = False
        session.commit()
        return jsonify({"success": True, "faltante": {"id": faltante.id, "descripcion": faltante.descripcion}})
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/faltantes/eliminados', methods=['GET'])
def get_faltantes_eliminados():
    session = app.session
    try:
        eliminados = session.query(Faltante).filter(Faltante.eliminado == True).order_by(Faltante.id.desc()).all()
        return jsonify([
            {
                "id": f.id,
                "descripcion": f.descripcion,
                "fecha_creacion": f.fecha_creacion.isoformat() if f.fecha_creacion else None
            }
            for f in eliminados
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    





    

@app.route('/api/pedidos', methods=['GET'])
def get_pedidos():
    session = app.session
    try:
        pedidos = session.query(Pedido).order_by(Pedido.id.desc()).all()
        return jsonify([{
            'id': p.id,
            'cliente_nombre': p.cliente_nombre,
            'seña': p.seña,
            'fecha': p.fecha.isoformat() if p.fecha else None,
            'titulo': p.titulo,
            'autor': p.autor,
            'telefonoCliente': p.telefono,
            'comentario': p.comentario,
            'cantidad': p.cantidad,
            'isbn': p.isbn
        } for p in pedidos])
    except SQLAlchemyError as e:
        session.rollback()
        return jsonify({'error': 'Error al obtener pedidos', 'mensaje': str(e)}), 500
    finally:
        session.close()


@app.route('/api/pedidos', methods=['POST'])
def crear_pedido():
   
   
    session = app.session
    data = request.json
    print("📦 Datos recibidos para crear pedido:", data)

    try:
        nuevo_pedido = Pedido(
            cliente_nombre=data.get('cliente_nombre'),
            seña=float(data.get('seña', 0)) if data.get('seña') else 0.0,
            titulo=data.get('titulo'),
            autor=data.get('autor'),
            telefono=data.get('telefonoCliente', ''),
            fecha=data.get('fecha'), 
            comentario=data.get('comentario', ''),
            cantidad=int(data.get('cantidad', 1)),
            isbn=data.get('isbn', '')
        )
        session.add(nuevo_pedido)
        session.commit()

        return jsonify({
            'mensaje': 'Pedido creado con éxito',
            'pedido': {
                'id': nuevo_pedido.id,
                'cliente_nombre': nuevo_pedido.cliente_nombre,
                'seña': nuevo_pedido.seña,
                'fecha': nuevo_pedido.fecha.isoformat() if nuevo_pedido.fecha else None,
                'titulo': nuevo_pedido.titulo,
                'telefonoCliente': nuevo_pedido.telefono,
                'autor': nuevo_pedido.autor,
                'comentario': nuevo_pedido.comentario,
                'cantidad': nuevo_pedido.cantidad,
                'isbn': nuevo_pedido.isbn
            }
        }), 201

    except SQLAlchemyError as e:
        session.rollback()
        return jsonify({'error': 'Error al crear el pedido', 'mensaje': str(e)}), 500
    finally:
        session.close()


@app.route('/api/pedidos/<int:pedido_id>', methods=['PUT'])
def actualizar_pedido(pedido_id):
    session = app.session
    data = request.json

    try:
        pedido = session.query(Pedido).get(pedido_id)
        if not pedido:
            return jsonify({'error': 'Pedido no encontrado'}), 404

        pedido.cliente_nombre = data.get('cliente_nombre', pedido.cliente_nombre)
        pedido.seña = float(data.get('seña', pedido.seña))
        pedido.telefono = data.get('telefonoCliente', pedido.telefono)
        pedido.titulo = data.get('titulo', pedido.titulo)
        pedido.autor = data.get('autor', pedido.autor)
        pedido.comentario = data.get('comentario', pedido.comentario)
        pedido.cantidad = int(data.get('cantidad', pedido.cantidad))
        pedido.isbn = data.get('isbn', pedido.isbn)

        session.commit()
        return jsonify({'mensaje': 'Pedido actualizado con éxito'})

    except SQLAlchemyError as e:
        session.rollback()
        return jsonify({'error': 'Error al actualizar el pedido', 'mensaje': str(e)}), 500
    finally:
        session.close()


@app.route('/api/pedidos/<int:pedido_id>', methods=['DELETE'])
def eliminar_pedido(pedido_id):
    session = app.session

    try:
        pedido = session.query(Pedido).get(pedido_id)
        if not pedido:
            return jsonify({'error': 'Pedido no encontrado'}), 404

        session.delete(pedido)
        session.commit()
        return jsonify({'mensaje': 'Pedido eliminado con éxito'})

    except SQLAlchemyError as e:
        session.rollback()
        return jsonify({'error': 'Error al eliminar el pedido', 'mensaje': str(e)}), 500
    finally:
        session.close()


def run():
    from database import init_db
    init_db()  # Crea las tablas si no existen
    app.run()

if __name__ == '__main__':
    run()
