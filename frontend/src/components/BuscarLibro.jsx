import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/appContext";

const BuscarLibro = () => {
  const navigate = useNavigate();
  const { store, actions } = useAppContext();
  const resultadosRef = useRef(null);

  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    ubicacion: "",
    stock: "",
    editorial: "",
  });

  const [resultados, setResultados] = useState([]);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const scrollToResultados = () => {
    setTimeout(() => {
      resultadosRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const buscarLibro = async () => {
    const { isbn, titulo, autor } = formData;
    setResultados([]);
    setError("");

    try {
      if (isbn.trim()) {
        const libroEncontrado = await actions.buscarLibroPorISBN(isbn.trim());
        if (libroEncontrado) {
          setFormData((prev) => ({
            ...prev,
            id: libroEncontrado.id,
            titulo: libroEncontrado.titulo,
            autor: libroEncontrado.autor,
            stock: libroEncontrado.stock,
            ubicacion: libroEncontrado.ubicacion || "",
            editorial: libroEncontrado.editorial || "",
          }));
          setResultados([libroEncontrado]);
          scrollToResultados();
          return;
        } else {
          setError("No se encontró un libro con ese ISBN");
          return;
        }
      }

      // Si no hay ISBN, buscar por título o autor
      if (!store.libros || store.libros.length === 0) {
        await actions.fetchLibros();
      }

      const librosFiltrados = store.libros.filter((libro) => {
        const matchTitulo =
          titulo.trim() && libro.titulo.toLowerCase().includes(titulo.toLowerCase());
        const matchAutor =
          autor.trim() && libro.autor.toLowerCase().includes(autor.toLowerCase());
        return matchTitulo || matchAutor;
      });

      if (librosFiltrados.length === 0) {
        setError("No se encontraron coincidencias por título o autor.");
      } else {
        setResultados(librosFiltrados);
        scrollToResultados();
      }
    } catch (err) {
      console.error("Error al buscar:", err);
      setError("Hubo un error durante la búsqueda.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await buscarLibro();
  };

  const limpiarPantalla = () => {
    setFormData({
      isbn: "",
      titulo: "",
      autor: "",
      ubicacion: "",
      stock: "",
      editorial: "",
    });
    setResultados([]);
    setError("");
  };

  const handleSelectBook = (libro) => {
    setFormData({
      ...formData,
      isbn: libro.isbn,
      titulo: libro.titulo,
      autor: libro.autor,
      ubicacion: libro.ubicacion || "",
      stock: libro.stock,
      editorial: libro.editorial || "",
    });
    setResultados([]);
  };

  return (
    <div className="container mt-5 bg-primary">
      <div className="card shadow-lg p-4">
        <div className="mb-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/")}
          >
            Volver al inicio
          </button>
        </div>
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
              placeholder="Ej: 9789870000000"
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
              placeholder="Ej: principito"
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
              placeholder="Ej: Borges"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Ubicación:</label>
            <input
              type="text"
              className="form-control"
              name="ubicacion"
              value={formData.ubicacion}
              readOnly
            />
          </div>
          <div className="mb-3">
            <label htmlFor="stock" className="form-label">Stock:</label>
            <input
              type="text"
              className="form-control"
              id="stock"
              name="stock"
              value={formData.stock}
              readOnly
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Editorial:</label>
            <input
              type="text"
              className="form-control"
              name="editorial"
              value={formData.editorial}
              readOnly
            />
          </div>
          <div className="row mt-4">
            <div className="col-6">
              <button type="submit" className="btn btn-primary btn-lg w-100">
                Buscar
              </button>
            </div>
            <div className="col-6">
              <button
                type="button"
                className="btn btn-warning btn-lg w-100"
                onClick={limpiarPantalla}
              >
                Limpiar Pantalla
              </button>
            </div>
          </div>
        </form>

        <div ref={resultadosRef}></div>

        {resultados.length > 0 && (
          <div className="mt-4">
            <h4>Resultados:</h4>
            <ul className="list-group">
              {resultados.map((libro, index) => (
                <li key={index} className="list-group-item">
                  <strong>Título:</strong> {libro.titulo} <br />
                  <strong>Autor:</strong> {libro.autor} <br />
                  <strong>ISBN:</strong> {libro.isbn} <br />
                  <strong>Ubicación:</strong> {libro.ubicacion || "No disponible"} <br />
                  <strong>Stock:</strong> {libro.stock} <br />
                  <strong>Editorial:</strong> {libro.editorial || "No disponible"} <br />
                  <button
                    className="btn btn-success mt-2"
                    onClick={() => handleSelectBook(libro)}
                  >
                    Seleccionar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <div className="mt-4 text-danger">{error}</div>}
      </div>
    </div>
  );
};


export default BuscarLibro;
