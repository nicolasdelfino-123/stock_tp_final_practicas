from flask import Flask, jsonify, request
from sqlalchemy import create_engine, or_, func, desc
from flask_sqlalchemy import SQLAlchemy

from sqlalchemy.orm import sessionmaker, scoped_session
from config import ProductionConfig  # usamos configuración segura desde .env
from models.libro import Base, Libro, Faltante, LibroBaja

from unidecode import unidecode
from flask_cors import CORS
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from flask import send_from_directory,request, jsonify
from flask import abort
from datetime import datetime, timedelta, timezone
from sqlalchemy.exc import SQLAlchemyError
from flask_migrate import Migrate

import jwt 
import time
import os

# Cargar variables de entorno solo si no estamos en producción
if os.getenv('FLASK_ENV') != 'production':
    from dotenv import load_dotenv
    load_dotenv()

def create_app():
    app = Flask(__name__, static_folder="../frontend/build", static_url_path="/")
    CORS(app)
    app.config.from_object(ProductionConfig)

    # --- Soporte para migraciones sin tocar tu ORM actual ---
    # Config para Flask-SQLAlchemy (solo para que Flask-Migrate funcione)
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config["SQLALCHEMY_DATABASE_URI"]
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Creamos un "db" solo para migraciones, usando la MISMA metadata de tus modelos
    db = SQLAlchemy(metadata=Base.metadata)
    db.init_app(app)

    # Inicializamos Flask-Migrate apuntando a esa metadata
    migrate = Migrate(app, db, compare_type=True)
    # --------------------------------------------------------

    engine = create_engine(app.config["SQLALCHEMY_DATABASE_URI"], echo=True, pool_pre_ping=True)
    
    # 🔧 CREAR TABLAS EN PRODUCCIÓN
    if os.getenv("FLASK_ENV") == "production" or app.config.get("CREATE_TABLES_ON_STARTUP"):
        print("🏗️ Creando tablas en producción...")
        Base.metadata.create_all(engine)
        print("✅ Tablas creadas exitosamente!")
    elif os.getenv("FLASK_ENV") == "development":
        Base.metadata.create_all(engine)

    SessionFactory = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
    app.session_factory = SessionFactory
    app.session = SessionFactory   # <— clave: los endpoints que ya usan app.session siguen funcionando

    @app.teardown_appcontext
    def remove_session(exception=None):
        SessionFactory.remove()

    admin = Admin(app, name="Panel de Administración", template_mode="bootstrap3")
    admin.add_view(ModelView(Libro, db.session))

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
    s = app.session
    data = request.get_json() or {}
    username = data.get('username')
    password = (data.get('password') or "")

    if not username or not password:
        return jsonify({'error': 'username y password requeridos'}), 400

    try:
        # Fallback: .env APP_LOGIN / APP_PASSWORD (compatibilidad)
        if username == os.getenv('APP_LOGIN') and password == os.getenv('APP_PASSWORD'):
            payload = {
                'user': username,
                'exp': datetime.utcnow() + timedelta(hours=2)
            }
            token = jwt.encode(payload, app.config["SECRET_KEY"], algorithm='HS256')
            return jsonify({
                'message': 'Login exitoso (env)',
                'token': token,
                'user': username,
                'server_start': SERVER_START_TIME
            }), 200

        return jsonify({'error': 'Credenciales inválidas'}), 401

    except Exception as e:
        return jsonify({'error': 'Error en login', 'detalle': str(e)}), 500

# ============================================================
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
                or_( # or_ es como WHERE titulo LIKE '%harry%' OR autor LIKE '%harry%' "significa Dame los libros que cumplan con condición_1 o condición_2".
                    func.lower(Libro.titulo).like(f"%{palabra_clave}%"),
                    #Esto baja todo a minúsculas. Es para que la búsqueda no sea sensible a mayúsculas/minúsculas. esto genera en SQL algo como LOWER(titulo)
                    func.lower(Libro.autor).like(f"%{palabra_clave}%")
                    #El % significa "cualquier cosa antes o después".
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

@app.route('/libros', methods=['POST'])
def crear_libro():
    session = app.session
    data = request.json
    print("📦 Datos recibidos:", data)
    print(f"🔍 Tipo de cada campo:")
    for key, value in data.items():
        print(f"  {key}: {value} (tipo: {type(value)})")

    # Validación de campos obligatorios
    if not data.get('titulo') or not data.get('autor'):
        print("❌ Error: Faltan campos obligatorios (titulo o autor)")
        return jsonify({'error': 'Faltan campos obligatorios (titulo o autor)'}), 400
    
    # Validar ISBN - debe existir y no estar vacío
    isbn = data.get('isbn', '').strip()
    if not isbn:
        print("❌ Error: ISBN vacío o faltante")
        return jsonify({'error': 'El ISBN es obligatorio'}), 400
    print(f"✅ ISBN validado: '{isbn}'")

    # Validar ubicación - debe existir y no estar vacía
    ubicacion = data.get('ubicacion', '').strip()
    if not ubicacion:
        print("❌ Error: Ubicación vacía o faltante")
        return jsonify({'error': 'La ubicación es obligatoria'}), 400
    print(f"✅ Ubicación validada: '{ubicacion}'")

    # Procesar el precio: si viene vacío o null, lo dejamos en None
    precio_raw = data.get('precio')
    precio = float(precio_raw) if precio_raw not in (None, '', 'null') else None
    print(f"✅ Precio procesado: {precio}")

    try:
        print("🔍 Buscando libro existente por ISBN...")
        # Buscar si ya existe un libro con el mismo ISBN
        libro_existente = session.query(Libro).filter(Libro.isbn == isbn).first()

        if libro_existente:
            print(f"📚 Libro existente encontrado, actualizando...")
            # Si ya existe, actualizamos el libro con los nuevos datos
            libro_existente.titulo = data['titulo']
            libro_existente.autor = data['autor']
            libro_existente.editorial = data.get('editorial')
            libro_existente.stock = data.get('stock', 0)
            libro_existente.precio = precio
            libro_existente.ubicacion = ubicacion

            session.commit()
            print("✅ Libro actualizado exitosamente")
            return jsonify({'mensaje': 'Libro actualizado con éxito'}), 200
        else:
            print(f"📚 Creando nuevo libro...")
            # Si no existe, creamos un nuevo libro
            nuevo_libro = Libro(
                titulo=data['titulo'],
                autor=data['autor'],
                editorial=data.get('editorial'),
                isbn=isbn,
                stock=data.get('stock', 0),
                precio=precio,
                ubicacion=ubicacion
            )
            session.add(nuevo_libro)
            session.commit()
            print("✅ Libro creado exitosamente")
            return jsonify({'mensaje': 'Libro creado con éxito'}), 201

    except Exception as e:
        session.rollback()
        print(f"❌ Error en crear_libro: {type(e).__name__}: {str(e)}")
        print(f"📦 Datos que causaron el error: {data}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Error al crear o actualizar el libro', 
            'mensaje': str(e),
            'tipo_error': type(e).__name__,
            'datos_enviados': data
        }), 500


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

# Nuevo endpoint para bajar stock (separado del marcar baja)
@app.route('/libros/<int:libro_id>/bajar-stock', methods=['PUT'])
def bajar_stock_libro(libro_id):
    session = app.session
    libro = session.query(Libro).get(libro_id)
    
    if libro is None:
        return jsonify({'error': 'Libro no encontrado'}), 404
    
    try:
        payload = request.get_json()
        cantidad = int(payload.get('cantidad', 0))
        
        if cantidad <= 0:
            return jsonify({'error': 'La cantidad debe ser mayor que 0'}), 400
            
        if cantidad > libro.stock:
            return jsonify({'error': f'No hay suficiente stock. Stock actual: {libro.stock}'}), 400
        
        # Solo bajar el stock, NO marcar como baja todavía
        libro.stock -= cantidad
        session.commit()
        session.refresh(libro)
        
        return jsonify({
            'mensaje': 'Stock actualizado',
            'stock': libro.stock,
            'ubicacion': libro.ubicacion
        })
        
    except Exception as e:
        session.rollback()
        return jsonify({'error': 'Error al actualizar stock', 'mensaje': str(e)}), 500

@app.route('/libros/<int:libro_id>/marcar-baja', methods=['PUT'])
def marcar_baja(libro_id):
    session = app.session
    libro = session.query(Libro).get(libro_id)
    
    if libro is None:
        return jsonify({'error': 'Libro no encontrado'}), 404
    
    try:
        # Usar timezone local de Argentina
        from datetime import timezone, timedelta
        tz_argentina = timezone(timedelta(hours=-3))  # UTC-3 para Argentina
        ahora_argentina = datetime.now(tz_argentina)
        
        # Obtener cantidad del payload enviado desde el frontend
        payload = request.get_json(silent=True) or {}
        cantidad_baja = int(payload.get('cantidad', 1))
        
        # Calcular cantidad basada en diferencia de stock si es posible
        # (esto es una aproximación, idealmente deberías pasar la cantidad)
        
        # Registrar movimiento con snapshot
        mov = LibroBaja(
            libro_id=libro.id,
            fecha_baja=ahora_argentina.replace(tzinfo=None),  # Guardar sin timezone info
            cantidad_bajada=cantidad_baja,
            stock_resultante=libro.stock,
            titulo=libro.titulo,
            autor=libro.autor,
            editorial=libro.editorial,
            isbn=libro.isbn,
            precio=libro.precio,
            ubicacion=libro.ubicacion
        )
        session.add(mov)
        
        # Solo marcar fecha_baja en el libro si stock llegó a 0
        if libro.stock == 0:
            libro.fecha_baja = ahora_argentina.replace(tzinfo=None)
        
        session.commit()
        session.refresh(mov)
        session.refresh(libro)
        
        return jsonify({
            'mensaje': 'Baja registrada',
            'fecha_baja': mov.fecha_baja.isoformat(),
            'cantidad_bajada': mov.cantidad_bajada,
            'stock_resultante': mov.stock_resultante,
            'libro': {
                'id': libro.id,
                'titulo': libro.titulo,
                'stock': libro.stock,
                'fecha_baja': libro.fecha_baja.isoformat() if libro.fecha_baja else None
            },
            'movimiento': {
                'id': mov.id,
                'fecha_baja': mov.fecha_baja.isoformat(),
                'cantidad_bajada': mov.cantidad_bajada,
                'stock_resultante': mov.stock_resultante
            }
        })
        
    except Exception as e:
        session.rollback()
        return jsonify({'error': 'Error al marcar baja', 'mensaje': str(e)}), 500

@app.route('/libros/dados-baja', methods=['GET'])
def listar_dados_baja():
    session = app.session
    try:
        bajas = (
            session.query(LibroBaja)
            .order_by(desc(LibroBaja.fecha_baja))
            .all()
        )
        print(f"📚 Encontrados {len(bajas)} movimientos de baja")
        
        data = [
            {
                'id': b.id,                              # id del movimiento
                'titulo': b.titulo,
                'autor': b.autor,
                'editorial': b.editorial,
                'isbn': b.isbn,
                'precio': b.precio,
                'ubicacion': b.ubicacion,
                'fecha_baja': b.fecha_baja.isoformat(),
                'cantidad': b.stock_resultante,          # tu columna "Cantidad Actual"
                'stock': b.stock_resultante,              # por compatibilidad si lo usás
                'cantidad_bajada': b.cantidad_bajada      # Esta es la cantidad que se bajó
            }
            for b in bajas
        ]
        return jsonify(data)
        
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
    # Tomamos parámetros de la URL (si no vienen, quedan en string vacío)
    titulo = request.args.get('titulo', '')
    autor = request.args.get('autor', '')

    # Normalizamos lo que viene del cliente: minúsculas + sin tildes
    titulo_norm = unidecode(titulo.lower())
    autor_norm  = unidecode(autor.lower())

    # Armamos condiciones: aplicamos unaccent y lower a las columnas
    condiciones = []
    if titulo_norm:
        condiciones.append(func.lower(func.unaccent(Libro.titulo)).like(f"%{titulo_norm}%"))
    if autor_norm:
        condiciones.append(func.lower(func.unaccent(Libro.autor)).like(f"%{autor_norm}%"))

    # Ejecutamos consulta
    q = Libro.query
    if condiciones:
        q = q.filter(or_(*condiciones))

    libros = q.all()

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

if __name__ == "__main__":
    port = int(os.getenv('PORT', 5000))  # Render usa la variable PORT
    print(f"🚀 Starting app on port {port}")
    print(f"🔑 APP_LOGIN configured: {os.getenv('APP_LOGIN')}")
    print(f"🔐 APP_PASSWORD configured: {'***' if os.getenv('APP_PASSWORD') else 'NOT SET'}")
    app.run(debug=False, host='0.0.0.0', port=port)  # debug=False para producción
