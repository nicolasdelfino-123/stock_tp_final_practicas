from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from models import Libro
from database import get_engine

libros_bp = Blueprint("libros", __name__)

@libros_bp.route("/libros", methods=["GET"])
def get_libros():
    engine = get_engine()
    with Session(engine) as session:
        libros = session.query(Libro).all()
        resultado = [
            {
                "id": l.id,
                "titulo": l.titulo,
                "autor": l.autor,
                "editorial": l.editorial,
                "isbn": l.isbn,
                "stock": l.stock,
                "precio": l.precio
            }
            for l in libros
        ]
        return jsonify(resultado), 200

@libros_bp.route("/libros", methods=["POST"])
def crear_libro():
    data = request.json
    engine = get_engine()
    with Session(engine) as session:
        nuevo = Libro(
            titulo=data["titulo"],
            autor=data["autor"],
            editorial=data.get("editorial"),
            isbn=data.get("isbn"),
            stock=data.get("stock", 0),
            precio=data["precio"]
        )
        session.add(nuevo)
        session.commit()
        return jsonify({"mensaje": "Libro creado"}), 201
