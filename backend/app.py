from flask import Flask, jsonify, request
from sqlalchemy import create_engine, or_, func, desc
from flask_sqlalchemy import SQLAlchemy

from sqlalchemy.orm import sessionmaker, scoped_session
from config import ProductionConfig  # usamos configuración segura desde .env
from models.libro import Base, Libro, Faltante, Pedido, LibroBaja,Usuario, CajaInicioDetalle, Movimiento, AuditoriaEvento, Arqueo, MovimientoEditado, CajaTurno, MovimientoBorrado

from unidecode import unidecode
from flask_cors import CORS
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from models.libro import Base
import jwt 
import time
from flask import send_from_directory,request, jsonify
import os
from flask import abort
from datetime import datetime, timedelta, timezone
from sqlalchemy.exc import SQLAlchemyError
from flask_migrate import Migrate

# ==== IMPORTS PARA USUARIOS + EDICIÓN CAJA ====
import bcrypt  # pip install bcrypt
import re







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
    if os.getenv("FLASK_ENV") == "development":
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

# ====== HELPERS USUARIOS + ENDPOINT BOOTSTRAP (debajo de app = create_app()) ======
def _bcrypt_hash(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def _bcrypt_check(pw: str, hashed: str) -> bool:
    try:
        if not pw or not hashed:
            return False
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception as e:
        print(f"Error en _bcrypt_check: {e}")
        return False

@app.route("/api/caja/usuarios/bootstrap", methods=["POST"])
def usuarios_bootstrap():
    """
    Crea usuarios básicos si la tabla está vacía.
    - Admin para que el login por .env funcione con los endpoints protegidos
    - Ricardo (con pass largo para apertura/cierre) y pin4
    - Flor, Yani, Nico (pin4)
    Body opcional (JSON):
      {
        "ricardo_pass_largo": "R-2024-CAJA!!",
        "pins": {"f":"1234","y":"2345","r":"3456","n":"4567"},
        "admin_username": "admin"
      }
    """
    s = app.session_factory()

    try:
        # Si ya hay usuarios, no hacer nada
        if s.query(Usuario).count() > 0:
            return jsonify({"ok": True, "mensaje": "Usuarios ya existen; no se creó nada."}), 200

        data = request.get_json(silent=True) or {}
        pins = data.get("pins", {})
        ricardo_pass_largo = data.get("ricardo_pass_largo") or "R-CAJA-2024!!"
        admin_username = data.get("admin_username") or os.getenv("APP_LOGIN") or "admin"

        # 1) usuario admin para match con /login (APP_LOGIN/.env)
        # 1) usuario admin (cumple modelo: password_hash y rol)
        u_admin = Usuario(
            username=admin_username,
            password_hash=_bcrypt_hash(os.getenv("APP_PASSWORD") or "admin123"),
            rol="DUENO",
            activo=True
        )
        s.add(u_admin)

        # 2) staff (guardamos el PIN de 4 dígitos como password_hash)
        u_f = Usuario(username="f", password_hash=_bcrypt_hash(str(pins.get("f", "1234"))), rol="EMPLEADO", activo=True)
        u_y = Usuario(username="y", password_hash=_bcrypt_hash(str(pins.get("y", "1234"))), rol="EMPLEADO", activo=True)
        u_n = Usuario(username="n", password_hash=_bcrypt_hash(str(pins.get("n", "1234"))), rol="EMPLEADO", activo=True)

        # Ricardo (para ventas/salidas con PIN corto)
        u_r = Usuario(username="r", password_hash=_bcrypt_hash(str(pins.get("r", "1234"))), rol="EMPLEADO", activo=True)

        # Ricardo ADMIN (para apertura/cierre con contraseña larga)
        u_r_admin = Usuario(username="ricardo_admin", password_hash=_bcrypt_hash(ricardo_pass_largo), rol="DUENO", activo=True)

        s.add_all([u_f, u_y, u_n, u_r, u_r_admin])
        s.commit()


        return jsonify({
            "ok": True,
            "creados": [
                {"username": admin_username, "nota": "admin para login .env"},
                {"username": "r", "nombre": "Ricardo", "pin4": u_r.pin4, "pass_largo_set": True},
                {"username": "f", "nombre": "Flor", "pin4": u_f.pin4},
                {"username": "y", "nombre": "Yani", "pin4": u_y.pin4},
                {"username": "n", "nombre": "Nico", "pin4": u_n.pin4},
            ]
        }), 201
    except Exception as e:
        s.rollback()
        return jsonify({"error": "No se pudo crear usuarios", "mensaje": str(e)}), 500

# Reemplaza tu ruta @app.route("/api/caja/passwords/verificar", methods=["POST"]) por esta:

@app.route("/api/caja/passwords/verificar", methods=["POST"])
def verificar_passwords():
    s = app.session_factory()

    try:
        data = request.get_json() or {}
        tipo = (data.get("tipo") or "").strip()
        raw_username = (data.get("username") or "").strip().lower()
        
        # Obtener la contraseña/PIN desde diferentes campos posibles
        password = data.get("pass") or data.get("password") or data.get("pin4") or ""
        password = str(password).strip()
        
        if not raw_username or not password:
            return jsonify({"ok": False, "error": "Username y password requeridos"}), 400

        # Alias tolerantes para usuarios
        alias = {
            "flor": "f", "yani": "y", "nico": "n", "ricardo": "r", "ric": "r",
            "owner": "ricardo_admin", "dueno": "ricardo_admin", "dueño": "ricardo_admin",
            "admin": "ricardo_admin",
        }
        username = alias.get(raw_username, raw_username)
        # --- Normalizar formato de PIN para usuarios de PIN corto ---
# Aceptar tanto "1234" como "y1234" / "y 1234" (quedarnos con los dígitos)
        if username in ("f", "y", "n", "r"):
            m = re.match(r"^\s*([a-z])\s*(\d{4,})\s*$", password, re.I)
            if m:
                password = m.group(2)


        # Buscar usuario en la base de datos
        u = s.query(Usuario).filter(Usuario.username == username, Usuario.activo == True).first()
        if not u:
            return jsonify({"ok": False, "error": "Usuario no encontrado"}), 404

        # Verificar la contraseña usando bcrypt
        if u.password_hash:
            try:
                # La contraseña está hasheada con bcrypt
                password_bytes = password.encode('utf-8')
                hash_bytes = u.password_hash.encode('utf-8') if isinstance(u.password_hash, str) else u.password_hash
                
                if _bcrypt_check(password, u.password_hash):
                    return jsonify({"ok": True}), 200
                else:
                    return jsonify({"ok": False, "error": "Contraseña incorrecta"}), 401
                    
            except Exception as e:
                return jsonify({"ok": False, "error": "Error al verificar contraseña"}), 500
        
        return jsonify({"ok": False, "error": "Usuario sin contraseña configurada"}), 401

    except Exception as e:
        return jsonify({"ok": False, "error": f"Error interno: {str(e)}"}), 500
    
# Reemplaza tus rutas de cambio de password por estas:

@app.route("/api/caja/usuarios/set-pin4", methods=["POST"])
def usuarios_set_pin4():
    s = app.session_factory()
    try:
        data = request.get_json() or {}
        username = (data.get("username") or "").strip().lower()
        pin4 = (data.get("pin4") or "").strip()
        
        if not username or not pin4:
            return jsonify({"ok": False, "error": "Username y pin4 requeridos"}), 400

        # Alias tolerantes
        alias = {
            "flor": "f", "yani": "y", "nico": "n", "ricardo": "r", "ric": "r"
        }
        username = alias.get(username, username)
        # --- Normalizar por si mandan "y12345" en lugar de solo números ---
        m = re.match(r"^\s*([a-z])\s*(\d{4,})\s*$", pin4, re.I)
        if m:
            pin4 = m.group(2)


        u = s.query(Usuario).filter(Usuario.username == username, Usuario.activo == True).first()
        if not u:
            return jsonify({"ok": False, "error": "Usuario no encontrado"}), 404

        # Actualizar password_hash con el nuevo PIN hasheado
        u.password_hash = _bcrypt_hash(pin4)
        s.commit()
        
        return jsonify({"ok": True}), 200
        
    except Exception as e:
        s.rollback()
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/caja/usuarios/set-pass-largo", methods=["POST"])
def usuarios_set_pass_largo():
    s = app.session_factory()
    try:
        data = request.get_json() or {}
        username = (data.get("username") or "").strip().lower()
        password = data.get("pass") or data.get("password") or ""
        
        if not username or not password:
            return jsonify({"ok": False, "error": "Username y password requeridos"}), 400

        # Para admin siempre usamos ricardo_admin
        if username in ["admin", "ricardo_admin", "owner", "dueno", "dueño"]:
            username = "ricardo_admin"

        u = s.query(Usuario).filter(Usuario.username == username, Usuario.activo == True).first()
        if not u:
            return jsonify({"ok": False, "error": "Usuario no encontrado"}), 404

        # Actualizar password_hash con la nueva contraseña hasheada
        u.password_hash = _bcrypt_hash(password)
        s.commit()
        
        return jsonify({"ok": True}), 200
        
    except Exception as e:
        s.rollback()
        return jsonify({"ok": False, "error": str(e)}), 500

# ====== HELPERS DE USUARIOS (pegar debajo de: app = create_app()) ======
def _usuario_por_username(username: str):
    s = app.session
    return s.query(Usuario).filter(Usuario.username == username).first()

def _get_password_hash_from_user(u):
    if not u:
        return None
    # Soporta modelos que usen password_hash o password
    for attr in ("password_hash", "password"):
        if hasattr(u, attr):
            val = getattr(u, attr)
            # guardamos como str en DB, lo convertimos a bytes para bcrypt
            if val is None:
                return None
            return val.encode("utf-8") if isinstance(val, str) else val
    return None

def _set_user_password_hash(u, raw_password: str):
    hashed = bcrypt.hashpw(raw_password.encode("utf-8"), bcrypt.gensalt())
    # Guardar como str (utf-8) para DB
    if hasattr(u, "password_hash"):
        u.password_hash = hashed.decode("utf-8")
    elif hasattr(u, "password"):
        u.password = hashed.decode("utf-8")
    else:
        raise Exception("El modelo Usuario no tiene campo password_hash ni password")
    return True

def _ensure_user(username: str, password: str, activo: bool = True):
    """
    Crea el usuario si NO existe. Si existe, NO pisa password.
    Devuelve (usuario, creado_bool).
    """
    s = app.session
    u = _usuario_por_username(username)
    if u:
        # asegurar activo=True si el modelo lo tiene
        if hasattr(u, "activo") and u.activo is not None:
            u.activo = True
            s.commit()
        return u, False

    u = Usuario(username=username)
    if hasattr(u, "activo"):
        u.activo = bool(activo)
    _set_user_password_hash(u, password)
    s.add(u)
    s.commit()
    return u, True
# ====== FIN HELPERS ======


# --- Helper auth: devuelve (usuario, None) o (None, (jsonify(...), 401)) ---
def _get_user_or_401():
    s = app.session_factory()
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, (jsonify({"error": "No autenticado"}), 401)
    try:
        token = auth.split(" ", 1)[1]
        data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])

        # En tu login guardás el username como "user"
        username = data.get("user") or data.get("username")
        if not username:
            return None, (jsonify({"error": "Token inválido"}), 401)

        u = s.query(Usuario).filter(Usuario.username == username, Usuario.activo == True).first()  # noqa
        if not u:
            return None, (jsonify({"error": "Usuario inválido"}), 401)

        return u, None

    except jwt.ExpiredSignatureError:
        return None, (jsonify({"error": "Token expirado"}), 401)
    except Exception as e:
        return None, (jsonify({"error": "Token inválido", "mensaje": str(e)}), 401)


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
        # 1) Intento con DB (usuarios reales)
        q = s.query(Usuario).filter(Usuario.username == username)
        if hasattr(Usuario, "activo"):
            q = q.filter(Usuario.activo == True)  # noqa
        u = q.first()

        stored = _get_password_hash_from_user(u)
        if u and stored and bcrypt.checkpw(password.encode('utf-8'), stored):
            payload = {
                'user': username,
                'exp': datetime.utcnow() + timedelta(hours=2)
            }
            token = jwt.encode(payload, app.config["SECRET_KEY"], algorithm='HS256')
            return jsonify({
                'message': 'Login exitoso',
                'token': token,
                'user': username,
                'server_start': SERVER_START_TIME
            }), 200

        # 2) Fallback: .env APP_LOGIN / APP_PASSWORD (compatibilidad)
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
# Bootstrap inicial para tu componente: crea 5 usuarios de caja
# POST /api/caja/bootstrap-usuarios
# Payload:
# {
#   "flor": {"username":"flor","password":"1234"},
#   "yani": {"username":"yani","password":"4321"},
#   "nico": {"username":"nico","password":"5678"},
#   "ricardo": {"username":"ricardo","password":"2468"},             # PIN 4 dígitos para movimientos
#   "ricardo_admin": {"username":"ricardo_admin","password":"XXX"}   # contraseña LARGA para abrir/cerrar
# }
# ============================================================
@app.route('/api/caja/bootstrap-usuarios', methods=['POST'])
def bootstrap_usuarios_caja():
    s = app.session
    try:
        data = request.get_json() or {}
        req_keys = ["flor", "yani", "nico", "ricardo", "ricardo_admin"]
        if not all(k in data for k in req_keys):
            return jsonify({'error': 'Payload inválido. Faltan claves: flor, yani, nico, ricardo, ricardo_admin'}), 400

        resumen = {}
        for key in req_keys:
            item = data.get(key) or {}
            username = item.get("username")
            password = item.get("password")
            if not username or not password:
                return jsonify({'error': f'Usuario {key} sin username/password'}), 400

            u, creado = _ensure_user(username=username, password=password, activo=True)
            resumen[key] = {"username": username, "creado": bool(creado), "id": getattr(u, "id", None)}

        return jsonify({"ok": True, "resumen": resumen}), 200
    except Exception as e:
        s.rollback()
        return jsonify({'error': 'No se pudo bootstrapear usuarios', 'detalle': str(e)}), 500


# ============================================================
# Fallback universal para el componente (si no usás bootstrap):
# Crea un usuario suelto. Devuelve 409 si ya existe.
# POST /register  { "username": "...", "password": "..." }
# ============================================================
@app.route('/register', methods=['POST'])
def register_user():
    s = app.session
    try:
        data = request.get_json() or {}
        username = data.get("username")
        password = data.get("password")
        if not username or not password:
            return jsonify({'error': 'username y password requeridos'}), 400

        existente = _usuario_por_username(username)
        if existente:
            return jsonify({'error': 'Usuario ya existe'}), 409

        nuevo = Usuario(username=username)
        if hasattr(nuevo, "activo"):
            nuevo.activo = True
        _set_user_password_hash(nuevo, password)
        s.add(nuevo)
        s.commit()
        return jsonify({'success': True, 'id': getattr(nuevo, "id", None)}), 201
    except Exception as e:
        s.rollback()
        return jsonify({'error': 'No se pudo registrar usuario', 'detalle': str(e)}), 500
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
        show_ocultos = request.args.get('include_ocultos') in ('1', 'true', 'True')
        if show_ocultos:
            pedidos = session.query(Pedido).filter(Pedido.oculto == True).order_by(Pedido.id.desc()).all()
        else:
            pedidos = session.query(Pedido).filter(
                or_(Pedido.oculto == False, Pedido.oculto == None)
            ).order_by(Pedido.id.desc()).all()

        return jsonify([{
            'id': p.id,
            'cliente_nombre': p.cliente_nombre,
            'seña': p.seña,
            'fecha': (p.fecha.date().isoformat() if p.fecha else None),
            'fecha_viene': (p.fecha_viene.date().isoformat() if p.fecha_viene else None),
            'titulo': p.titulo,
            'autor': p.autor,
            'editorial': p.editorial,
            'telefonoCliente': p.telefono,
            'comentario': p.comentario,
            'cantidad': p.cantidad,
            'isbn': p.isbn,
            'estado': p.estado,
            'motivo': p.motivo,
            'oculto': p.oculto
        } for p in pedidos])
    except SQLAlchemyError as e:
        session.rollback()
        return jsonify({'error': 'Error al obtener pedidos', 'mensaje': str(e)}), 500
    finally:
        session.close()


from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError



@app.route('/api/pedidos', methods=['POST'])
def crear_pedido():
    session = app.session
    data = request.json
    print("📦 Datos recibidos para crear pedido:", data)

    try:
        # --- fecha (permite "-", "sin fecha" o vacío => NULL) ---
        fecha_raw = (data.get('fecha') or '').strip()
        fecha = None
# Si es texto especial, usar una fecha muy antigua para distinguir
        if fecha_raw and fecha_raw not in ('-', 'SIN FECHA', 'sin fecha'):
            try:
                if '/' in fecha_raw:  # DD/MM/YYYY
                    fecha = datetime.strptime(fecha_raw, '%d/%m/%Y')
                else:                 # ISO variantes
                    fecha = datetime.fromisoformat(
                        fecha_raw.replace('Z', '+00:00').replace('T', ' ')
                    )
            except Exception:
                fecha = None  # si no parsea, lo dejamos NULL

        # --- fecha_viene (mismo criterio) ---
        fecha_viene_raw = (data.get('fecha_viene') or '').strip()
        fecha_viene = None
        if fecha_viene_raw and fecha_viene_raw not in ('-', 'SIN FECHA', 'sin fecha'):
            try:
                if '/' in fecha_viene_raw:
                    fecha_viene = datetime.strptime(fecha_viene_raw, '%d/%m/%Y')
                else:
                    fecha_viene = datetime.fromisoformat(
                        fecha_viene_raw.replace('Z', '+00:00').replace('T', ' ')
                    )
            except Exception:
            # Si no es fecha válida pero hay texto, usar fecha especial
                if fecha_raw:
                    fecha = datetime(1900, 1, 1)  # Fecha especial para texto
                else:
                    fecha = None

        nuevo_pedido = Pedido(
            cliente_nombre=data.get('cliente_nombre'),
            seña=float(data.get('seña', 0)) if data.get('seña') else 0.0,
            titulo=data.get('titulo'),
            autor=data.get('autor'),
            editorial=data.get('editorial', ''),
            telefono=data.get('telefonoCliente', ''),
            fecha=fecha,                  # puede ser None (no pisa el default si la key no venía)
            comentario=data.get('comentario', ''),
            cantidad=int(data.get('cantidad', 1)),
            isbn=data.get('isbn', ''),
            estado=data.get('estado', None),
            motivo=data.get('motivo', None),
            fecha_viene=fecha_viene,
        )

        session.add(nuevo_pedido)
        session.commit()

        return jsonify({
            'mensaje': 'Pedido creado con éxito',
            'pedido': {
                'id': nuevo_pedido.id,
                'cliente_nombre': nuevo_pedido.cliente_nombre,
                'seña': nuevo_pedido.seña,
                'fecha': (nuevo_pedido.fecha.date().isoformat() if nuevo_pedido.fecha else None),
                'fecha_viene': (nuevo_pedido.fecha_viene.date().isoformat() if nuevo_pedido.fecha_viene else None),
                'titulo': nuevo_pedido.titulo,
                'telefonoCliente': nuevo_pedido.telefono,
                'autor': nuevo_pedido.autor,
                'editorial': nuevo_pedido.editorial,
                'comentario': nuevo_pedido.comentario,
                'cantidad': nuevo_pedido.cantidad,
                'isbn': nuevo_pedido.isbn,
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
        pedido.editorial = data.get('editorial', pedido.editorial)
        pedido.comentario = data.get('comentario', pedido.comentario)
        pedido.cantidad = int(data.get('cantidad', pedido.cantidad))
        pedido.isbn = data.get('isbn', pedido.isbn)
        pedido.estado = data.get('estado', pedido.estado)
        pedido.motivo = data.get('motivo', pedido.motivo)

        # --- fecha: solo si viene la key; permite vaciar con "-", "sin fecha" o "" ---
        if 'fecha' in data:
            fecha_raw = (data.get('fecha') or '').strip()
            if fecha_raw in ('', '-', 'sin fecha', 'SIN FECHA'):
                pedido.fecha = None
            else:
                try:
                    if '/' in fecha_raw:
                        pedido.fecha = datetime.strptime(fecha_raw, '%d/%m/%Y')
                    else:
                        pedido.fecha = datetime.fromisoformat(
                            fecha_raw.replace('Z', '+00:00').replace('T', ' ')
                        )
                except Exception:
                    if fecha_raw:
                        pedido.fecha = datetime(1900, 1, 1)  # Fecha especial
                    else:
                        pedido.fecha = None

        pedido.oculto = data.get('oculto', pedido.oculto)

        # --- fecha_viene: mismo criterio, también opcional ---
        if 'fecha_viene' in data:
            fv_raw = (data.get('fecha_viene') or '').strip()
            if fv_raw in ('', '-', 'sin fecha', 'SIN FECHA'):
                pedido.fecha_viene = None
            else:
                try:
                    if '/' in fv_raw:
                        pedido.fecha_viene = datetime.strptime(fv_raw, '%d/%m/%Y')
                    else:
                        pedido.fecha_viene = datetime.fromisoformat(
                            fv_raw.replace('Z', '+00:00').replace('T', ' ')
                        )
                except Exception:
                    pedido.fecha_viene = None

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


@app.route('/api/pedidos/ocultar', methods=['PUT'])
def ocultar_pedidos():
    session = app.session
    data = request.json
    ids = data.get('ids', [])

    if not ids:
        return jsonify({'error': 'No se enviaron IDs'}), 400

    try:
        session.query(Pedido).filter(Pedido.id.in_(ids)).update(
            {Pedido.oculto: True},
            synchronize_session=False
        )
        session.commit()
        return jsonify({'mensaje': 'Pedidos ocultados con éxito'})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()





#### cajasss apisssssss#############

# =====================================================================
# =========================  CAJA - HELPERS  ==========================
# =====================================================================

def _map_metodo(label: str) -> str:
    if not label:
        return "OTRO"
    label = str(label).strip()
    mapa = {
        "Efectivo": "EFECTIVO",
        "Transferencia - Bancaria": "TRANSF_BANCARIA",
        "Transferencia - Mercado Pago": "TRANSF_MP",
        "Débito": "DEBITO",
        "Debito": "DEBITO",
        "Crédito": "CREDITO",
        "Credito": "CREDITO",
    }
    return mapa.get(label, label if label in ("EFECTIVO","TRANSF_BANCARIA","TRANSF_MP","DEBITO","CREDITO","OTRO") else "OTRO")

def _totales_por_metodo(session, turno_id: int) -> dict:
    """Suma neta por método dentro del turno.
       VENTA y AJUSTE suman, SALIDA y ANULACION restan. Excluye eliminados."""
    qs = session.query(Movimiento).filter(
        Movimiento.turno_id == turno_id,
        Movimiento.eliminado == False  # noqa
    ).all()
    tot = {"EFECTIVO": 0.0, "TRANSF_BANCARIA": 0.0, "TRANSF_MP": 0.0, "DEBITO": 0.0, "CREDITO": 0.0, "OTRO": 0.0}
    for m in qs:
        signo = 1.0
        if m.tipo in ("SALIDA", "ANULACION"):
            signo = -1.0
        tot[m.metodo_pago] = round(tot.get(m.metodo_pago, 0.0) + signo * float(m.importe or 0.0), 2)
    return tot

def _mov_to_snapshot(m: Movimiento) -> dict:
    return {
        "id": m.id,
        "turno_id": m.turno_id,
        "tipo": m.tipo,
        "metodo_pago": m.metodo_pago,
        "importe": float(m.importe or 0),
        "descripcion": m.descripcion,
        "paga_con": float(m.paga_con or 0) if m.paga_con is not None else None,
        "vuelto": float(m.vuelto or 0) if m.vuelto is not None else None,
        "creado_por_id": m.creado_por_id,
        "creado_en": m.creado_en.isoformat() if m.creado_en else None,
        "es_anulado": m.es_anulado,
        "revierte_a_id": m.revierte_a_id,
        "eliminado": m.eliminado,
        "eliminado_en": m.eliminado_en.isoformat() if m.eliminado_en else None,
        "motivo_eliminado": m.motivo_eliminado,
        "es_editado": getattr(m, "es_editado", False),
        "editado_por_id": getattr(m, "editado_por_id", None),
        "editado_en": m.editado_en.isoformat() if getattr(m, "editado_en", None) else None,
        "motivo_ultima_edicion": getattr(m, "motivo_ultima_edicion", None),
    }

# =====================================================================
# =========================  CAJA - TURNOS  ===========================
# =====================================================================

# ABRIR TURNO
@app.route("/api/caja/turnos/abrir", methods=["POST"])
def caja_turno_abrir():
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        data = request.get_json() or {}
        codigo = data.get("codigo") or datetime.now().strftime("%Y%m%d-%H%M")
        obs = data.get("observacion")
        denominaciones = data.get("denominaciones", [])  # [{etiqueta, importe_total}]

        # --- NUEVO: fecha y turno ---
        tz_arg = timezone(timedelta(hours=-3))
        fecha_str = (data.get("fecha") or "").strip()  # "YYYY-MM-DD"
        try:
            fecha = datetime.fromisoformat(fecha_str).date() if fecha_str else datetime.now(tz_arg).date()
        except Exception:
            fecha = datetime.now(tz_arg).date()

        turno = (data.get("turno") or "").strip().upper()  # "MANANA" | "TARDE"
        if turno not in ("MANANA", "TARDE", ""):
            turno = ""

        # Evitar dos turnos abiertos
        abierto = s.query(CajaTurno).filter(CajaTurno.estado == "ABIERTO").first()
        if abierto:
            return jsonify({"error": "Ya existe un turno ABIERTO", "turno_id": abierto.id}), 409

        t = CajaTurno(
            codigo=codigo,
            estado="ABIERTO",
            abierto_por_id=user.id,
            observacion_apertura=obs,
            monto_inicial_efectivo=0.0,
            fecha=fecha,          # NUEVO
            turno=turno or None,  # NUEVO
        )
        s.add(t)
        s.flush()  # para tener t.id

        total_inicio = 0.0
        for d in denominaciones:
            etiqueta = (d.get("etiqueta") or "").strip() or "otros"
            importe_total = float(d.get("importe_total") or 0)
            s.add(CajaInicioDetalle(turno_id=t.id, etiqueta=etiqueta, importe_total=importe_total))
            total_inicio += importe_total

        t.monto_inicial_efectivo = round(total_inicio, 2)
        s.add(AuditoriaEvento(usuario_id=user.id, accion="ABRIR_TURNO", entidad="turno", entidad_id=t.id, detalle={"codigo": codigo}))
        s.commit()

        return jsonify({
            "ok": True,
            "turno": {
                "id": t.id, "codigo": t.codigo, "estado": t.estado,
                "abierto_por_id": t.abierto_por_id,
                "abierto_en": t.abierto_en.isoformat() if t.abierto_en else None,
                "monto_inicial_efectivo": t.monto_inicial_efectivo,
                "fecha": t.fecha.isoformat() if t.fecha else None,   # NUEVO
                "turno": t.turno,                                     # NUEVO
            }
        }), 201
    except Exception as e:
        s.rollback()
        return jsonify({"error": "No se pudo abrir el turno", "mensaje": str(e)}), 500


# LISTAR TURNOS (?estado=ABIERTO/CERRADO, ?desde=ISO, ?hasta=ISO)
@app.route("/api/caja/turnos", methods=["GET"])
def caja_turnos_listar():
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        q = s.query(CajaTurno).order_by(CajaTurno.id.desc())
        estado = request.args.get("estado")
        if estado:
            q = q.filter(CajaTurno.estado == estado)

        # Filtros existentes
        desde = request.args.get("desde")
        hasta = request.args.get("hasta")
        if desde:
            q = q.filter(CajaTurno.abierto_en >= datetime.fromisoformat(desde))
        if hasta:
            q = q.filter(CajaTurno.abierto_en <= datetime.fromisoformat(hasta))

        # NUEVO: filtro por fecha exacta (YYYY-MM-DD)
        fecha_str = request.args.get("fecha")
        if fecha_str:
            try:
                fecha = datetime.fromisoformat(fecha_str).date()
                q = q.filter(CajaTurno.fecha == fecha)
            except Exception:
                pass

        # NUEVO: filtro por turno (MANANA/TARDE)
        turno = (request.args.get("turno") or "").strip().upper()
        if turno in ("MANANA", "TARDE"):
            q = q.filter(CajaTurno.turno == turno)

        turnos = q.all()
        out = []
        for t in turnos:
            out.append({
                "id": t.id, "codigo": t.codigo, "estado": t.estado,
                "abierto_por_id": t.abierto_por_id,
                "abierto_en": t.abierto_en.isoformat() if t.abierto_en else None,
                "cerrado_por_id": t.cerrado_por_id,
                "cerrado_en": t.cerrado_en.isoformat() if t.cerrado_en else None,
                "monto_inicial_efectivo": t.monto_inicial_efectivo,
                "efectivo_contado_cierre": t.efectivo_contado_cierre,
                "diferencia_efectivo": t.diferencia_efectivo,
                "fecha": t.fecha.isoformat() if t.fecha else None,  # NUEVO
                "turno": t.turno,                                    # NUEVO
            })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": "No se pudo listar turnos", "mensaje": str(e)}), 500

# DETALLE DE TURNO (incluye denominaciones)
@app.route("/api/caja/turnos/<int:turno_id>", methods=["GET"])
def caja_turno_detalle(turno_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        t = s.query(CajaTurno).get(turno_id)
        if not t:
            return jsonify({"error": "Turno no encontrado"}), 404

        den = s.query(CajaInicioDetalle).filter(CajaInicioDetalle.turno_id == turno_id).order_by(CajaInicioDetalle.id.asc()).all()
        return jsonify({
            "id": t.id, "codigo": t.codigo, "estado": t.estado,
            "abierto_por_id": t.abierto_por_id,
            "abierto_en": t.abierto_en.isoformat() if t.abierto_en else None,
            "cerrado_por_id": t.cerrado_por_id,
            "cerrado_en": t.cerrado_en.isoformat() if t.cerrado_en else None,
            "monto_inicial_efectivo": t.monto_inicial_efectivo,
            "efectivo_contado_cierre": t.efectivo_contado_cierre,
            "diferencia_efectivo": t.diferencia_efectivo,
            "fecha": t.fecha.isoformat() if t.fecha else None,   # NUEVO
            "turno": t.turno,                                     # NUEVO
            "denominaciones": [{
                "id": d.id, "etiqueta": d.etiqueta,
                "importe_total": float(d.importe_total or 0),
                "es_editado": getattr(d, "es_editado", False),
                "editado_por_id": getattr(d, "editado_por_id", None),
                "editado_en": d.editado_en.isoformat() if getattr(d, "editado_en", None) else None,
            } for d in den]
        }), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener turno", "mensaje": str(e)}), 500

# CERRAR TURNO (calcula diferencia de efectivo)
@app.route("/api/caja/turnos/<int:turno_id>/cerrar", methods=["POST"])
def caja_turno_cerrar(turno_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        t = s.query(CajaTurno).get(turno_id)
        if not t or t.estado != "ABIERTO":
            return jsonify({"error": "Turno no encontrado o no está ABIERTO"}), 404

        data = request.get_json() or {}
        efectivo_contado = float(data.get("efectivo_contado", 0))
        obs_cierre = data.get("observacion")

        teoricos = _totales_por_metodo(s, turno_id)
        efectivo_teorico = round((teoricos.get("EFECTIVO", 0.0) or 0.0) + float(t.monto_inicial_efectivo or 0.0), 2)
        diferencia = round(efectivo_contado - efectivo_teorico, 2)

        # Arqueo de cierre
        a = Arqueo(
            turno_id=turno_id,
            realizado_por_id=user.id,
            efectivo_contado=efectivo_contado,
            resumen_por_metodo=teoricos,
            observacion=obs_cierre,
            es_cierre=True
        )
        s.add(a)

        # Actualiza turno
        t.efectivo_contado_cierre = efectivo_contado
        t.diferencia_efectivo = diferencia
        t.observacion_cierre = obs_cierre
        t.cerrado_por_id = user.id
        t.cerrado_en = datetime.utcnow()
        t.estado = "CERRADO"

        s.add(AuditoriaEvento(usuario_id=user.id, accion="CERRAR_TURNO", entidad="turno", entidad_id=t.id,
                              detalle={"teoricos": teoricos, "efectivo_teorico": efectivo_teorico,
                                       "efectivo_contado": efectivo_contado, "diferencia": diferencia}))
        s.commit()

        return jsonify({"ok": True, "diferencia_efectivo": diferencia}), 200
    except Exception as e:
        s.rollback()
        return jsonify({"error": "No se pudo cerrar el turno", "mensaje": str(e)}), 500

# RESUMEN TEÓRICO DEL TURNO (por método + efectivo teórico)
@app.route("/api/caja/turnos/<int:turno_id>/resumen", methods=["GET"])
def caja_turno_resumen(turno_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        t = s.query(CajaTurno).get(turno_id)
        if not t:
            return jsonify({"error": "Turno no encontrado"}), 404

        teoricos = _totales_por_metodo(s, turno_id)
        efectivo_teorico = round((teoricos.get("EFECTIVO", 0.0) or 0.0) + float(t.monto_inicial_efectivo or 0.0), 2)
        return jsonify({
            "turno_id": t.id,
            "teoricos_por_metodo": teoricos,
            "efectivo_teorico_fisico": efectivo_teorico
        }), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener resumen", "mensaje": str(e)}), 500

# =====================================================================
# =====================  CAJA - INICIO DETALLES  ======================
# =====================================================================

# LISTAR por turno
@app.route("/api/caja/inicio-detalles", methods=["GET"])
def inicio_detalles_listar():
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err
        turno_id = request.args.get("turno_id", type=int)
        if not turno_id:
            return jsonify({"error": "turno_id requerido"}), 400

        filas = s.query(CajaInicioDetalle).filter(CajaInicioDetalle.turno_id == turno_id).order_by(CajaInicioDetalle.id.asc()).all()
        out = []
        for d in filas:
            out.append({
                "id": d.id, "turno_id": d.turno_id, "etiqueta": d.etiqueta,
                "importe_total": float(d.importe_total or 0),
                "es_editado": getattr(d, "es_editado", False),
                "editado_por_id": getattr(d, "editado_por_id", None),
                "editado_en": d.editado_en.isoformat() if getattr(d, "editado_en", None) else None,
            })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": "No se pudo listar inicio-detalles", "mensaje": str(e)}), 500

# CREAR
@app.route("/api/caja/inicio-detalles", methods=["POST"])
def inicio_detalles_crear():
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err
        data = request.get_json() or {}

        turno_id = data.get("turno_id")
        etiqueta = (data.get("etiqueta") or "").strip()
        importe_total = float(data.get("importe_total") or 0)

        if not turno_id or not etiqueta:
            return jsonify({"error": "turno_id y etiqueta son requeridos"}), 400

        d = CajaInicioDetalle(turno_id=turno_id, etiqueta=etiqueta, importe_total=importe_total)
        s.add(d)
        s.add(AuditoriaEvento(usuario_id=user.id, accion="CREAR_INICIO_DETALLE", entidad="inicio_detalle", entidad_id=None,
                              detalle={"turno_id": turno_id, "etiqueta": etiqueta, "importe_total": importe_total}))
        s.commit()
        return jsonify({"ok": True, "id": d.id}), 201
    except Exception as e:
        s.rollback()
        return jsonify({"error": "No se pudo crear inicio-detalle", "mensaje": str(e)}), 500

# DETALLE
@app.route("/api/caja/inicio-detalles/<int:detalle_id>", methods=["GET"])
def inicio_detalles_detalle(detalle_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        d = s.query(CajaInicioDetalle).get(detalle_id)
        if not d:
            return jsonify({"error": "Detalle no encontrado"}), 404

        return jsonify({
            "id": d.id, "turno_id": d.turno_id, "etiqueta": d.etiqueta,
            "importe_total": float(d.importe_total or 0),
            "es_editado": getattr(d, "es_editado", False),
            "editado_por_id": getattr(d, "editado_por_id", None),
            "editado_en": d.editado_en.isoformat() if getattr(d, "editado_en", None) else None,
        }), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener inicio-detalle", "mensaje": str(e)}), 500

# EDITAR (marca de edición)
@app.route("/api/caja/inicio-detalles/<int:detalle_id>", methods=["PATCH"])
def inicio_detalles_editar(detalle_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        d = s.query(CajaInicioDetalle).get(detalle_id)
        if not d:
            return jsonify({"error": "Detalle no encontrado"}), 404

        data = request.get_json() or {}
        if "etiqueta" in data and (data["etiqueta"] or "").strip():
            d.etiqueta = str(data["etiqueta"]).strip()
        if "importe_total" in data and data["importe_total"] is not None:
            try:
                d.importe_total = float(data["importe_total"])
            except Exception:
                return jsonify({"error": "importe_total inválido"}), 400

        d.es_editado = True
        d.editado_por_id = user.id
        d.editado_en = datetime.utcnow()
        d.motivo_ultima_edicion = data.get("motivo")

        # marcamos en el turno que hubo edición del inicio
        t = s.query(CajaTurno).get(d.turno_id)
        if t:
            t.inicio_editado = True
            t.inicio_editado_por_id = user.id
            t.inicio_editado_en = datetime.utcnow()
            t.motivo_ultima_edicion = d.motivo_ultima_edicion

        s.add(AuditoriaEvento(usuario_id=user.id, accion="EDITAR_INICIO", entidad="inicio_detalle", entidad_id=d.id,
                              detalle={"turno_id": d.turno_id}))
        s.commit()

        return jsonify({"ok": True}), 200
    except Exception as e:
        s.rollback()
        return jsonify({"error": "No se pudo editar inicio-detalle", "mensaje": str(e)}), 500

# BORRAR
@app.route("/api/caja/inicio-detalles/<int:detalle_id>", methods=["DELETE"])
def inicio_detalles_borrar(detalle_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        d = s.query(CajaInicioDetalle).get(detalle_id)
        if not d:
            return jsonify({"error": "Detalle no encontrado"}), 404

        s.delete(d)
        s.add(AuditoriaEvento(usuario_id=user.id, accion="BORRAR_INICIO_DETALLE", entidad="inicio_detalle", entidad_id=detalle_id,
                              detalle={"turno_id": d.turno_id}))
        s.commit()
        return jsonify({"ok": True}), 200
    except Exception as e:
        s.rollback()
        return jsonify({"error": "No se pudo borrar inicio-detalle", "mensaje": str(e)}), 500

# =====================================================================
# ========================  CAJA - MOVIMIENTOS  =======================
# =====================================================================

# LISTAR (?turno_id=, ?tipo=VENTA|SALIDA|AJUSTE|ANULACION, ?metodo=EFECTIVO|...)
@app.route("/api/caja/movimientos", methods=["GET"])
def movimientos_listar():
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        q = s.query(Movimiento).filter(Movimiento.eliminado == False)  # noqa
        turno_id = request.args.get("turno_id", type=int)
        tipo = request.args.get("tipo")
        metodo = request.args.get("metodo")

        if turno_id:
            q = q.filter(Movimiento.turno_id == turno_id)
        if tipo:
            q = q.filter(Movimiento.tipo == tipo)
        if metodo:
            q = q.filter(Movimiento.metodo_pago == metodo)

        q = q.order_by(Movimiento.id.desc())
        out = []
        for m in q.all():
            out.append({
                "id": m.id, "turno_id": m.turno_id, "tipo": m.tipo, "metodo_pago": m.metodo_pago,
                "importe": float(m.importe or 0), "descripcion": m.descripcion,
                "paga_con": float(m.paga_con or 0) if m.paga_con is not None else None,
                "vuelto": float(m.vuelto or 0) if m.vuelto is not None else None,
                "creado_en": m.creado_en.isoformat() if m.creado_en else None,
                "es_anulado": m.es_anulado, "eliminado": m.eliminado,
                "es_editado": getattr(m, "es_editado", False),
                "editado_por_id": getattr(m, "editado_por_id", None),
                "editado_en": m.editado_en.isoformat() if getattr(m, "editado_en", None) else None,
            })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": "No se pudo listar movimientos", "mensaje": str(e)}), 500

# CREAR
@app.route("/api/caja/movimientos", methods=["POST"])
def movimientos_crear():
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        data = request.get_json() or {}
        turno_id = data.get("turno_id")
        if not turno_id:
            return jsonify({"error": "turno_id requerido"}), 400

        t = s.query(CajaTurno).get(turno_id)
        if not t or t.estado != "ABIERTO":
            return jsonify({"error": "Turno no encontrado o no está ABIERTO"}), 404

        tipo = (data.get("tipo") or "").upper()        # "VENTA" | "SALIDA" | "AJUSTE"
        metodo = _map_metodo(data.get("metodo_pago"))  # mapas desde UI o enum
        importe = float(data.get("importe") or 0)

        m = Movimiento(
            turno_id=turno_id, creado_por_id=user.id,
            tipo=tipo, metodo_pago=metodo, importe=importe,
            descripcion=data.get("descripcion"),
            paga_con=float(data["paga_con"]) if data.get("paga_con") not in (None, "") else None,
            vuelto=float(data["vuelto"]) if data.get("vuelto") not in (None, "") else None
        )
        s.add(m)
        s.add(AuditoriaEvento(usuario_id=user.id, accion="CREAR_MOV", entidad="movimiento", entidad_id=None,
                              detalle={"turno_id": turno_id, "tipo": tipo, "metodo": metodo, "importe": importe}))
        s.commit()
        return jsonify({"ok": True, "id": m.id}), 201
    except Exception as e:
        s.rollback()
        return jsonify({"error": "No se pudo crear movimiento", "mensaje": str(e)}), 500

# DETALLE
@app.route("/api/caja/movimientos/<int:mov_id>", methods=["GET"])
def movimiento_detalle(mov_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err
        m = s.query(Movimiento).get(mov_id)
        if not m:
            return jsonify({"error": "Movimiento no encontrado"}), 404
        return jsonify(_mov_to_snapshot(m)), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener movimiento", "mensaje": str(e)}), 500

# EDITAR (descripcion/importe/metodo) + log edición
@app.route("/api/caja/movimientos/<int:mov_id>", methods=["PATCH"])
def movimiento_editar(mov_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        m = s.query(Movimiento).get(mov_id)
        if not m or m.eliminado:
            return jsonify({"error": "Movimiento no encontrado"}), 404
                # 🔒 SOLO el autor del movimiento o 'ricardo_admin' pueden editar
        # (si tenés datos viejos con creado_por_id = None, solo permitirá a ricardo_admin)
        if getattr(user, "username", "") != "ricardo_admin":
            if m.creado_por_id is None or m.creado_por_id != user.id:
                return jsonify({"error": "Solo el autor puede editar este movimiento"}), 403


        data = request.get_json() or {}
        previo = _mov_to_snapshot(m)

        if "descripcion" in data:
            m.descripcion = data["descripcion"]
        if "importe" in data and data["importe"] is not None:
            try:
                m.importe = float(data["importe"])
            except Exception:
                return jsonify({"error": "importe inválido"}), 400
        if "metodo_pago" in data and data["metodo_pago"]:
            m.metodo_pago = _map_metodo(data["metodo_pago"])

        m.es_editado = True
        m.editado_por_id = user.id
        m.editado_en = datetime.utcnow()
        m.motivo_ultima_edicion = data.get("motivo")

        s.add(MovimientoEditado(movimiento_id=m.id, snapshot_previo=previo, editado_por_id=user.id, motivo=data.get("motivo")))
        s.add(AuditoriaEvento(usuario_id=user.id, accion="EDITAR_MOV", entidad="movimiento", entidad_id=m.id,
                              detalle={"campos": [k for k in ("descripcion","importe","metodo_pago") if k in data]}))
        s.commit()
        return jsonify({"ok": True}), 200
    except Exception as e:
        s.rollback()
        return jsonify({"error": "No se pudo editar movimiento", "mensaje": str(e)}), 500

# ANULAR (crea reverso ANULACION y marca original)
@app.route("/api/caja/movimientos/<int:mov_id>/anular", methods=["POST"])
def movimiento_anular(mov_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        original = s.query(Movimiento).get(mov_id)
        if not original or original.eliminado:
            return jsonify({"error": "Movimiento no encontrado"}), 404
        if original.es_anulado:
            return jsonify({"error": "Movimiento ya anulado"}), 409

        data = request.get_json() or {}
        motivo = data.get("motivo") or "Anulación"

        original.es_anulado = True
        original.anulado_por_id = user.id
        original.anulado_en = datetime.utcnow()
        original.motivo_anulacion = motivo

        reverso = Movimiento(
            turno_id=original.turno_id,
            creado_por_id=user.id,
            tipo="ANULACION",
            metodo_pago=original.metodo_pago,
            importe=original.importe,
            descripcion=f"Reverso de movimiento {original.id}",
            revierte_a_id=original.id
        )
        s.add(reverso)
        s.add(AuditoriaEvento(usuario_id=user.id, accion="ANULAR_MOV", entidad="movimiento", entidad_id=original.id,
                              detalle={"motivo": motivo}))
        s.commit()
        return jsonify({"ok": True}), 200
    except Exception as e:
        s.rollback()
        return jsonify({"error": "No se pudo anular movimiento", "mensaje": str(e)}), 500

# BORRADO LÓGICO + log snapshot
@app.route("/api/caja/movimientos/<int:mov_id>", methods=["DELETE"])
def movimiento_borrar(mov_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        m = s.query(Movimiento).get(mov_id)
        if not m or m.eliminado:
            return jsonify({"error": "Movimiento no encontrado"}), 404
                # 🔒 SOLO el autor del movimiento o 'ricardo_admin' pueden borrar
        # (si creado_por_id es None, solo ricardo_admin puede)
        if getattr(user, "username", "") != "ricardo_admin":
            if m.creado_por_id is None or m.creado_por_id != user.id:
                return jsonify({"error": "Solo el autor puede borrar este movimiento"}), 403


        snap = _mov_to_snapshot(m)
        s.add(MovimientoBorrado(movimiento_id=m.id, snapshot=snap, borrado_por_id=user.id, motivo=request.args.get("motivo")))
        m.eliminado = True
        m.eliminado_en = datetime.utcnow()
        m.eliminado_por_id = user.id
        m.motivo_eliminado = request.args.get("motivo")

        s.add(AuditoriaEvento(usuario_id=user.id, accion="BORRAR_MOV", entidad="movimiento", entidad_id=m.id,
                              detalle={"motivo": m.motivo_eliminado}))
        s.commit()
        return jsonify({"ok": True}), 200
    except Exception as e:
        s.rollback()
        return jsonify({"error": "No se pudo borrar movimiento", "mensaje": str(e)}), 500

# =====================================================================
# =========================  CAJA - ARQUEOS  ==========================
# =====================================================================

# LISTAR (?turno_id=)
@app.route("/api/caja/arqueos", methods=["GET"])
def arqueos_listar():
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        q = s.query(Arqueo).order_by(Arqueo.id.desc())
        turno_id = request.args.get("turno_id", type=int)
        if turno_id:
            q = q.filter(Arqueo.turno_id == turno_id)

        out = []
        for a in q.all():
            out.append({
                "id": a.id, "turno_id": a.turno_id, "realizado_por_id": a.realizado_por_id,
                "efectivo_contado": float(a.efectivo_contado or 0),
                "resumen_por_metodo": a.resumen_por_metodo or {},
                "observacion": a.observacion, "es_cierre": a.es_cierre,
                "creado_en": a.creado_en.isoformat() if a.creado_en else None
            })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": "No se pudo listar arqueos", "mensaje": str(e)}), 500

# CREAR (parcial o final — para cierre formal usar /turnos/<id>/cerrar)
@app.route("/api/caja/arqueos", methods=["POST"])
def arqueos_crear():
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        data = request.get_json() or {}
        turno_id = data.get("turno_id")
        if not turno_id:
            return jsonify({"error": "turno_id requerido"}), 400

        a = Arqueo(
            turno_id=turno_id,
            realizado_por_id=user.id,
            efectivo_contado=float(data.get("efectivo_contado", 0)),
            resumen_por_metodo=data.get("resumen_por_metodo"),
            observacion=data.get("observacion"),
            es_cierre=bool(data.get("es_cierre", False))
        )
        s.add(a)
        s.add(AuditoriaEvento(usuario_id=user.id, accion="CREAR_ARQUEO", entidad="arqueo", entidad_id=None,
                              detalle={"turno_id": turno_id, "es_cierre": a.es_cierre}))
        s.commit()
        return jsonify({"ok": True, "id": a.id}), 201
    except Exception as e:
        s.rollback()
        return jsonify({"error": "No se pudo crear arqueo", "mensaje": str(e)}), 500

# DETALLE
@app.route("/api/caja/arqueos/<int:arqueo_id>", methods=["GET"])
def arqueo_detalle(arqueo_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        a = s.query(Arqueo).get(arqueo_id)
        if not a:
            return jsonify({"error": "Arqueo no encontrado"}), 404

        return jsonify({
            "id": a.id, "turno_id": a.turno_id, "realizado_por_id": a.realizado_por_id,
            "efectivo_contado": float(a.efectivo_contado or 0),
            "resumen_por_metodo": a.resumen_por_metodo or {},
            "observacion": a.observacion, "es_cierre": a.es_cierre,
            "creado_en": a.creado_en.isoformat() if a.creado_en else None
        }), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener arqueo", "mensaje": str(e)}), 500

# =====================================================================
# =========================  CAJA - AUDITORÍA  ========================
# =====================================================================

# LISTAR (?entidad=turno/movimiento/arqueo, ?entidad_id=)
@app.route("/api/caja/auditoria", methods=["GET"])
def auditoria_listar():
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        entidad = request.args.get("entidad")
        entidad_id = request.args.get("entidad_id", type=int)
        q = s.query(AuditoriaEvento).order_by(AuditoriaEvento.id.desc())
        if entidad:
            q = q.filter(AuditoriaEvento.entidad == entidad)
        if entidad_id:
            q = q.filter(AuditoriaEvento.entidad_id == entidad_id)

        out = []
        for ev in q.limit(500).all():
            out.append({
                "id": ev.id, "usuario_id": ev.usuario_id, "accion": ev.accion,
                "entidad": ev.entidad, "entidad_id": ev.entidad_id,
                "detalle": ev.detalle or {},
                "creado_en": ev.creado_en.isoformat() if ev.creado_en else None
            })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": "No se pudo listar auditoría", "mensaje": str(e)}), 500

# DETALLE
@app.route("/api/caja/auditoria/<int:aud_id>", methods=["GET"])
def auditoria_detalle(aud_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        ev = s.query(AuditoriaEvento).get(aud_id)
        if not ev:
            return jsonify({"error": "Evento no encontrado"}), 404

        return jsonify({
            "id": ev.id, "usuario_id": ev.usuario_id, "accion": ev.accion,
            "entidad": ev.entidad, "entidad_id": ev.entidad_id,
            "detalle": ev.detalle or {},
            "creado_en": ev.creado_en.isoformat() if ev.creado_en else None
        }), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener auditoría", "mensaje": str(e)}), 500

# =====================================================================
# ==================  CAJA - LOGS BORRADOS/EDITADOS  ==================
# =====================================================================

# BORRADOS: LISTAR (?movimiento_id= &/o ?turno_id=)
@app.route("/api/caja/movimientos-borrados", methods=["GET"])
def mov_borrados_listar():
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        movimiento_id = request.args.get("movimiento_id", type=int)
        turno_id = request.args.get("turno_id", type=int)

        q = s.query(MovimientoBorrado)
        if movimiento_id:
            q = q.filter(MovimientoBorrado.movimiento_id == movimiento_id)
        if turno_id:
            q = q.join(Movimiento, Movimiento.id == MovimientoBorrado.movimiento_id)\
                 .filter(Movimiento.turno_id == turno_id)

        out = []
        for r in q.order_by(MovimientoBorrado.id.desc()).all():
            out.append({
                "id": r.id, "movimiento_id": r.movimiento_id, "snapshot": r.snapshot or {},
                "borrado_por_id": r.borrado_por_id, "motivo": r.motivo,
                "borrado_en": r.borrado_en.isoformat() if r.borrado_en else None
            })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": "No se pudo listar movimientos borrados", "mensaje": str(e)}), 500

# BORRADOS: DETALLE
@app.route("/api/caja/movimientos-borrados/<int:log_id>", methods=["GET"])
def mov_borrado_detalle(log_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        r = s.query(MovimientoBorrado).get(log_id)
        if not r:
            return jsonify({"error": "Registro no encontrado"}), 404

        return jsonify({
            "id": r.id, "movimiento_id": r.movimiento_id, "snapshot": r.snapshot or {},
            "borrado_por_id": r.borrado_por_id, "motivo": r.motivo,
            "borrado_en": r.borrado_en.isoformat() if r.borrado_en else None
        }), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener movimiento borrado", "mensaje": str(e)}), 500

# EDITADOS: LISTAR (?movimiento_id= &/o ?turno_id=)
@app.route("/api/caja/movimientos-editados", methods=["GET"])
def mov_editados_listar():
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        movimiento_id = request.args.get("movimiento_id", type=int)
        turno_id = request.args.get("turno_id", type=int)

        q = s.query(MovimientoEditado)
        if movimiento_id:
            q = q.filter(MovimientoEditado.movimiento_id == movimiento_id)
        if turno_id:
            q = q.join(Movimiento, Movimiento.id == MovimientoEditado.movimiento_id)\
                 .filter(Movimiento.turno_id == turno_id)

        out = []
        for r in q.order_by(MovimientoEditado.id.desc()).all():
            out.append({
                "id": r.id, "movimiento_id": r.movimiento_id, "snapshot_previo": r.snapshot_previo or {},
                "editado_por_id": r.editado_por_id, "motivo": r.motivo,
                "editado_en": r.editado_en.isoformat() if r.editado_en else None
            })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": "No se pudo listar movimientos editados", "mensaje": str(e)}), 500

# EDITADOS: DETALLE
@app.route("/api/caja/movimientos-editados/<int:log_id>", methods=["GET"])
def mov_editado_detalle(log_id):
    s = app.session
    try:
        user, err = _get_user_or_401()
        if err: return err

        r = s.query(MovimientoEditado).get(log_id)
        if not r:
            return jsonify({"error": "Registro no encontrado"}), 404

        return jsonify({
            "id": r.id, "movimiento_id": r.movimiento_id, "snapshot_previo": r.snapshot_previo or {},
            "editado_por_id": r.editado_por_id, "motivo": r.motivo,
            "editado_en": r.editado_en.isoformat() if r.editado_en else None
        }), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener movimiento editado", "mensaje": str(e)}), 500







def run():
    from database import init_db
    init_db()  # Crea las tablas si no existen
    app.run()

if __name__ == '__main__':
    run()
