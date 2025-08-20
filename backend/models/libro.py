from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, Float, DateTime, func, Boolean, ForeignKey
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, Float, DateTime, func, Boolean, ForeignKey, JSON








class Base(DeclarativeBase):
    pass

class Libro(Base):
    __tablename__ = "libros"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(250), nullable=False)
    autor: Mapped[str] = mapped_column(String(250), nullable=False)
    editorial: Mapped[str] = mapped_column(String(100), nullable=True)
    isbn: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    precio: Mapped[float] = mapped_column(Float)
    ubicacion: Mapped[str] = mapped_column(String(40), nullable=False)
    fecha_alta: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_baja: Mapped[datetime] = mapped_column(DateTime, nullable=True)
  

    def __repr__(self):
        return f"<Libro {self.titulo}>"

class Faltante(Base):
    __tablename__ = "faltantes"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    descripcion: Mapped[str] = mapped_column(String, nullable=False)
    eliminado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fecha_creacion: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Faltante {self.descripcion[:20]}...>"


class Pedido(Base):
    __tablename__ = "pedidos"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cliente_nombre: Mapped[str] = mapped_column(String(800), nullable=False)
    seña: Mapped[float] = mapped_column(Float, nullable=False)
    fecha: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    titulo: Mapped[str] = mapped_column(String(800), nullable=False)
    telefono: Mapped[str] = mapped_column(String(90), nullable=True)
    autor: Mapped[str] = mapped_column(String(800), nullable=False)
    editorial: Mapped[str] = mapped_column(String(250), nullable=True)
    comentario: Mapped[str] = mapped_column(String(1000), nullable=True)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    isbn: Mapped[str] = mapped_column(String(60), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=True)  # "VIENE" o "NO_VIENE"
    motivo: Mapped[str] = mapped_column(String(250), nullable=True) # Librería o motivo de no venir
    oculto: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    fecha_viene: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)  # NUEVO



    def __repr__(self):
        return f"<Pedido {self.titulo} para {self.cliente_nombre}>"




class LibroBaja(Base):
    __tablename__ = "libros_bajas"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # Referencia al libro
    libro_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("stock_charles_schema.libros.id"),
        nullable=False,
        index=True
    )

    # Cuándo se realizó la baja
    fecha_baja: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Movimiento
    cantidad_bajada: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    stock_resultante: Mapped[int] = mapped_column(Integer, nullable=False)

    # ---------- SNAPSHOT DEL LIBRO EN EL MOMENTO DE LA BAJA ----------
    titulo: Mapped[str]     = mapped_column(String(250), nullable=False)
    autor: Mapped[str]      = mapped_column(String(250), nullable=False)
    editorial: Mapped[str]  = mapped_column(String(100), nullable=True)
    isbn: Mapped[str]       = mapped_column(String(20),  nullable=False)
    precio: Mapped[float]   = mapped_column(Float,       nullable=True)
    ubicacion: Mapped[str]  = mapped_column(String(40),  nullable=False)


######## modelos caja ##################




# ──────────────────────────── USUARIOS ────────────────────────────
class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(20), nullable=False)  # "DUENO" | "EMPLEADO"
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ──────────────────────────── TURNOS ──────────────────────────────
class CajaTurno(Base):
    __tablename__ = "caja_turnos"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40), nullable=False, index=True)  # ej: "20250101-0900"
    estado: Mapped[str] = mapped_column(String(20), nullable=False)  # "ABIERTO" | "CERRADO"

    abierto_por_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.usuarios.id"), nullable=False, index=True)
    abierto_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    cerrado_por_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.usuarios.id"), nullable=True, index=True)
    cerrado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    observacion_apertura: Mapped[str] = mapped_column(String(400), nullable=True)
    observacion_cierre: Mapped[str] = mapped_column(String(400), nullable=True)

    monto_inicial_efectivo: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    efectivo_contado_cierre: Mapped[float] = mapped_column(Float, nullable=True)
    diferencia_efectivo: Mapped[float] = mapped_column(Float, nullable=True)

        # Marca si se tocó el inicio del turno (cualquier denominación)
    inicio_editado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    inicio_editado_por_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.usuarios.id"), nullable=True, index=True)
    inicio_editado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    motivo_ultima_edicion: Mapped[str] = mapped_column(String(250), nullable=True)



class CajaInicioDetalle(Base):
    __tablename__ = "caja_inicio_detalles"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    turno_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.caja_turnos.id"), nullable=False, index=True)
    etiqueta: Mapped[str] = mapped_column(String(50), nullable=False)  # "50", "100_200", "500", "1000", "otros"
    importe_total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

        # Edición (para cambios posteriores al inicio)
    es_editado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    editado_por_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.usuarios.id"), nullable=True, index=True)
    editado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    motivo_ultima_edicion: Mapped[str] = mapped_column(String(250), nullable=True)



# ──────────────────────────── MOVIMIENTOS ─────────────────────────
class Movimiento(Base):
    __tablename__ = "caja_movimientos"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    turno_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.caja_turnos.id"), nullable=False, index=True)

    tipo: Mapped[str] = mapped_column(String(20), nullable=False)          # "VENTA" | "SALIDA" | "AJUSTE" | "ANULACION"
    metodo_pago: Mapped[str] = mapped_column(String(30), nullable=False)   # "EFECTIVO" | "TRANSF_BANCARIA" | "TRANSF_MP" | "DEBITO" | "CREDITO" | "OTRO"
    importe: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    descripcion: Mapped[str] = mapped_column(String(400), nullable=True)
    paga_con: Mapped[float] = mapped_column(Float, nullable=True)
    vuelto: Mapped[float] = mapped_column(Float, nullable=True)

    creado_por_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.usuarios.id"), nullable=False, index=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

        # Edición (bandera y auditoría rápida)
    es_editado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    editado_por_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.usuarios.id"), nullable=True, index=True)
    editado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    motivo_ultima_edicion: Mapped[str] = mapped_column(String(250), nullable=True)


    # Anulación
    es_anulado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    anulado_por_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.usuarios.id"), nullable=True, index=True)
    anulado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    motivo_anulacion: Mapped[str] = mapped_column(String(250), nullable=True)
    revierte_a_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.caja_movimientos.id"), nullable=True, index=True)  # self FK

    # Borrado lógico
    eliminado: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    eliminado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    eliminado_por_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.usuarios.id"), nullable=True, index=True)
    motivo_eliminado: Mapped[str] = mapped_column(String(250), nullable=True)


# ──────────────────────────── ARQUEOS ─────────────────────────────
class Arqueo(Base):
    __tablename__ = "caja_arqueos"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    turno_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.caja_turnos.id"), nullable=False, index=True)
    realizado_por_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.usuarios.id"), nullable=False, index=True)

    efectivo_contado: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    # Resumen discriminado por método (si preferís columnas separadas, podés reemplazar por 5 Floats)
    resumen_por_metodo: Mapped[dict] = mapped_column(JSON, nullable=True)

    observacion: Mapped[str] = mapped_column(String(400), nullable=True)
    es_cierre: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ──────────────────────────── AUDITORÍA ───────────────────────────
class AuditoriaEvento(Base):
    __tablename__ = "auditoria_eventos"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.usuarios.id"), nullable=False, index=True)
    accion: Mapped[str] = mapped_column(String(50), nullable=False)   # "ABRIR_TURNO", "CREAR_MOV", etc.
    entidad: Mapped[str] = mapped_column(String(50), nullable=False)  # "turno", "movimiento", "arqueo"
    entidad_id: Mapped[int] = mapped_column(Integer, nullable=True, index=True)
    detalle: Mapped[dict] = mapped_column(JSON, nullable=True)        # datos extra del evento
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ──────────────────────────── LOGS DE BORRADO/EDICIÓN ─────────────
class MovimientoBorrado(Base):
    __tablename__ = "caja_movimientos_borrados"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    movimiento_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.caja_movimientos.id"), nullable=False, index=True)
    snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)   # copia del movimiento al momento del borrado
    borrado_por_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.usuarios.id"), nullable=False, index=True)
    motivo: Mapped[str] = mapped_column(String(250), nullable=True)
    borrado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class MovimientoEditado(Base):
    __tablename__ = "caja_movimientos_editados"
    __table_args__ = {'schema': 'stock_charles_schema'}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    movimiento_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.caja_movimientos.id"), nullable=False, index=True)
    snapshot_previo: Mapped[dict] = mapped_column(JSON, nullable=False)  # estado previo
    editado_por_id: Mapped[int] = mapped_column(Integer, ForeignKey("stock_charles_schema.usuarios.id"), nullable=False, index=True)
    motivo: Mapped[str] = mapped_column(String(250), nullable=True)
    editado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
