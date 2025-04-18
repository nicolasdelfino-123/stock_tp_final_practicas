// BuscarLibro.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const BuscarLibro = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
  });

  const [resultados, setResultados] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const query = new URLSearchParams(formData).toString();

    try {
      const response = await fetch(`http://localhost:5000/libros?${query}`);
      const data = await response.json();

      if (response.ok) {
        setResultados(data);
      } else {
        alert(data.error || "Error al buscar libros");
      }
    } catch (error) {
      console.error("Error en la búsqueda:", error);
      alert("Hubo un error: " + error.message);
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow-lg p-4">
        <h2 className="mb-4 text-center">Buscar Libro</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">ISBN:</label>
            <input
              type="text"
              className="form-control"
              name="isbn"
              value={formData.isbn}
              onChange={handleChange}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Título:</label>
            <input
              type="text"
              className="form-control"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Autor:</label>
            <input
              type="text"
              className="form-control"
              name="autor"
              value={formData.autor}
              onChange={handleChange}
            />
          </div>

          <div className="d-flex justify-content-between">
            <button type="submit" className="btn btn-primary">
              Buscar
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

        {resultados.length > 0 && (
          <div className="mt-4">
            <h4>Resultados:</h4>
            <ul className="list-group">
              {resultados.map((libro, index) => (
                <li key={index} className="list-group-item">
                  <strong>Título:</strong> {libro.titulo} <br />
                  <strong>Autor:</strong> {libro.autor} <br />
                  <strong>ISBN:</strong> {libro.isbn} <br />
                  <strong>Stock:</strong> {libro.stock}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuscarLibro;
