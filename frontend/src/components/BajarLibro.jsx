import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/appContext"; // Asegúrate de ajustar la ruta

const BajarLibro = () => {
  const navigate = useNavigate();
  const { actions } = useAppContext(); // Obtenemos actions del contexto

  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    editorial: "",
    stock: "",
    cantidad: "",
    id: null,
  });
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState("");
  const [resultados, setResultados] = useState([]);

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
      // Usamos la función del contexto para buscar por ISBN
      const libroEncontrado = await actions.buscarLibroPorISBN(formData.isbn);

      if (libroEncontrado) {
        setFormData({
          ...formData,
          id: libroEncontrado.id,
          titulo: libroEncontrado.titulo,
          autor: libroEncontrado.autor,
          editorial: libroEncontrado.editorial || "",
          stock: libroEncontrado.stock,
        });
        setError("");
        setResultado("");
        setResultados([]);
      } else {
        setError("No se encontró un libro con ese ISBN");
        setResultado("");
        setResultados([]);
      }
    } catch (err) {
      console.error("Error al buscar el libro:", err);
      setError("Error al buscar el libro.");
      setResultado("");
      setResultados([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.id || !formData.cantidad) {
      alert("Por favor, complete todos los campos obligatorios.");
      return;
    }

    const cantidad = Number(formData.cantidad);

    if (isNaN(cantidad) || cantidad <= 0) {
      alert("La cantidad debe ser un número mayor que 0.");
      return;
    }

    try {
      // Usamos la función del contexto para bajar stock
      const response = await actions.bajarStockLibro(formData.id, cantidad);

      if (response.success) {
        setResultado("✅ Stock actualizado exitosamente.");
        const nuevoStock = formData.stock - cantidad;
        setFormData((prev) => ({
          ...prev,
          stock: nuevoStock,
          cantidad: "",
        }));

        // Guardar en resultados para mostrar el resumen
        setResultados([
          {
            titulo: formData.titulo,
            autor: formData.autor,
            editorial: formData.editorial,
            stock: nuevoStock,
            ubicacion: response.ubicacion || "", // Usamos la ubicación devuelta por la API
          },
        ]);
      } else {
        setResultado(`❌ ${response.error || "Error al bajar el stock"}`);
        setResultados([]);
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      setResultado("❌ Error de red: " + error.message);
      setResultados([]);
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

  return (
    <div className="container bajar mt-5 bg-danger">
      <div className="card shadow p-4">
        <button
          type="button"
          className="btn btn-secondary w-auto mx-auto ms-0"
          onClick={() => navigate("/")}
        >
          Volver al Inicio
        </button>
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
            <label className="form-label">Editorial:</label>
            <input
              type="text"
              className="form-control"
              value={formData.editorial}
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

          <div className="d-flex justify-content-between mb-3">
            <button
              type="submit"
              className="btn btn-danger px-5 btn-lg w-100 mx-3"
            >
              Bajar Stock
            </button>
            <button
              type="button"
              className="btn btn-warning px-5 btn-lg w-100"
              onClick={limpiarPantalla}
            >
              Limpiar Pantalla
            </button>
          </div>
          {resultado && (
            <div
              className={`mt-3 ${
                resultado.includes("✅") ? "text-success" : "text-danger"
              }`}
            >
              {resultado}
            </div>
          )}

          {resultados.length > 0 && (
            <div className="mt-4">
              <h4>Resultado:</h4>
              <ul className="list-group">
                {resultados.map((libro, index) => (
                  <li key={index} className="list-group-item">
                    <strong>Título:</strong> {libro.titulo} <br />
                    <strong>Autor:</strong> {libro.autor} <br />
                    <strong>Ubicación:</strong>{" "}
                    {libro.ubicacion || "No disponible"} <br />
                    <strong>Stock:</strong> {libro.stock} <br />
                    <strong>Editorial:</strong>{" "}
                    {libro.editorial || "No disponible"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default BajarLibro;
