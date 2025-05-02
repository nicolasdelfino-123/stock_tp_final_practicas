import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/appContext"; // Importamos el contexto

const BuscarLibro = () => {
  const navigate = useNavigate();
  const { store, actions } = useAppContext(); // Usamos el contexto

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
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSearch = async () => {
    if (!formData.isbn) return;

    try {
      // Usamos la función del contexto para buscar por ISBN
      const libroEncontrado = await actions.buscarLibroPorISBN(formData.isbn);

      if (libroEncontrado) {
        setFormData({
          ...formData,
          id: libroEncontrado.id,
          titulo: libroEncontrado.titulo,
          autor: libroEncontrado.autor,
          stock: libroEncontrado.stock,
          ubicacion: libroEncontrado.ubicacion || "",
          editorial: libroEncontrado.editorial || "",
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

    try {
      // Usamos el store del contexto para obtener los libros
      const libros = store.libros;

      // Si el store está vacío, intentamos obtener los libros
      if (!libros || libros.length === 0) {
        await actions.fetchLibros();
      }

      // Filtro por coincidencia parcial en el título
      if (formData.titulo) {
        const filtro = formData.titulo.toLowerCase();
        const librosFiltrados = store.libros.filter((libro) =>
          libro.titulo.toLowerCase().includes(filtro)
        );

        if (librosFiltrados.length === 0) {
          setError("No se encontraron coincidencias por título.");
        } else {
          setError("");
        }

        setResultados(librosFiltrados);
      } else {
        setError("Ingrese al menos un título para buscar");
      }
    } catch (error) {
      console.error("Error en la búsqueda:", error);
      alert("Hubo un error: " + error.message);
    }
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

  // Función para seleccionar un libro de los resultados
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
    setResultados([]); // Limpiar resultados después de seleccionar
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
              onBlur={handleSearch}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">
              Título (buscar por palabra clave):
            </label>
            <input
              type="text"
              className="form-control"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              placeholder="Ej: princip"
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
              readOnly
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Ubicación:</label>
            <input
              type="text"
              className="form-control"
              name="ubicacion"
              value={formData.ubicacion}
              onChange={handleChange}
              readOnly
            />
          </div>
          <div className="mb-3">
            <label htmlFor="stock" className="form-label">
              Stock:
            </label>
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
              onChange={handleChange}
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

        {resultados.length > 0 && (
          <div className="mt-4">
            <h4>Resultados:</h4>
            <ul className="list-group">
              {resultados.map((libro, index) => (
                <li key={index} className="list-group-item">
                  <strong>Título:</strong> {libro.titulo} <br />
                  <strong>Autor:</strong> {libro.autor} <br />
                  <strong>ISBN:</strong> {libro.isbn} <br />
                  <strong>Ubicación:</strong>{" "}
                  {libro.ubicacion || "No disponible"} <br />
                  <strong>Stock:</strong> {libro.stock} <br />
                  <strong>Editorial:</strong>{" "}
                  {libro.editorial || "No disponible"} <br />
                  {/* Botón para seleccionar el libro */}
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
