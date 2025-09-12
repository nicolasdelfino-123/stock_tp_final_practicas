from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, Float, DateTime, func, Boolean, ForeignKey, Date
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, Float, DateTime, func, Boolean, ForeignKey, JSON
from datetime import datetime, date








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






