import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const BajarLibro = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    stock: "",
    cantidad: "",
    id: null,
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = async () => {
    if (!formData.isbn) return;

    try {
      const response = await fetch("http://127.0.0.1:5000/libros");

      if (!response.ok) throw new Error("No se pudo obtener la lista");

      const libros = await response.json();

      const libroEncontrado = libros.find(
        (libro) => libro.isbn === formData.isbn
      );

      if (libroEncontrado) {
        setFormData({
          ...formData,
          id: libroEncontrado.id,
          titulo: libroEncontrado.titulo,
          autor: libroEncontrado.autor,
          stock: libroEncontrado.stock,
        });
        setError("");
      } else {
        setError("No se encontró un libro con ese ISBN");
      }
    } catch (err) {
      console.error("Error al buscar el libro:", err);
      setError("Error al buscar el libro.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.id || !formData.cantidad) {
      alert("Por favor, complete todos los campos obligatorios.");
      return;
    }

    // Asegurarse de que 'cantidad' sea un número
    const cantidad = Number(formData.cantidad);

    if (isNaN(cantidad) || cantidad <= 0) {
      alert("La cantidad debe ser un número mayor que 0.");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/bajar-libro/${formData.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cantidad }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Stock actualizado exitosamente");
        navigate("/");
      } else {
        alert(data.error || "Error al bajar el stock");
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      alert("Error de red: " + error.message);
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow p-4">
        <h2 className="mb-4 text-center">Bajar Libro</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">ISBN:</label>
            <input
              type="text"
              className="form-control"
              name="isbn"
              value={formData.isbn}
              onChange={handleChange}
              onBlur={handleSearch}
              placeholder="Ingrese el ISBN del libro"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Título:</label>
            <input
              type="text"
              className="form-control"
              value={formData.titulo}
              readOnly
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Autor:</label>
            <input
              type="text"
              className="form-control"
              value={formData.autor}
              readOnly
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Stock actual:</label>
            <input
              type="number"
              className="form-control"
              value={formData.stock}
              readOnly
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Cantidad a bajar:</label>
            <input
              type="number"
              className="form-control"
              name="cantidad"
              min="1"
              value={formData.cantidad}
              onChange={handleChange}
              required
              placeholder="Ingrese la cantidad a descontar"
            />
          </div>

          {error && <div className="text-danger mb-3">{error}</div>}

          <div className="d-flex justify-content-between">
            <button type="submit" className="btn btn-warning">
              Bajar Stock
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/")}
            >
              Volver al Inicio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BajarLibro;
