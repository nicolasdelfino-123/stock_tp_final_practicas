import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/appContext";

const BajarLibro = () => {
  const navigate = useNavigate();
  const { actions } = useAppContext();

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
      const libroEncontrado = await actions.buscarLibroPorISBN(formData.isbn);

      if (libroEncontrado) {
        setFormData((prev) => ({
          ...prev,
          id: libroEncontrado.id,
          titulo: libroEncontrado.titulo,
          autor: libroEncontrado.autor,
          editorial: libroEncontrado.editorial || "",
          stock: libroEncontrado.stock,
        }));
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
      const response = await actions.bajarStockLibro(formData.id, cantidad);

      if (response.success) {
        setResultado("✅ Stock actualizado exitosamente.");
        const nuevoStock = formData.stock - cantidad;
        setFormData((prev) => ({
          ...prev,
          stock: nuevoStock,
          cantidad: "",
        }));

        setResultados([
          {
            titulo: formData.titulo,
            autor: formData.autor,
            editorial: formData.editorial,
            stock: nuevoStock,
            ubicacion: response.ubicacion || "",
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
      editorial: "",
      stock: "",
      cantidad: "",
      id: null,
    });
    setResultados([]);
    setError("");
    setResultado("");
  };

  const fondoURL = "/fondo-3.jpg"


  return (
    <div
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${fondoURL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        paddingTop: "10px", // rompe el colapso del margin
        boxSizing: "border-box",

      }}
    >
      <div
        className="container"
        style={{
          maxWidth: "800px",
          backgroundColor: "#F9E6E6",
          borderRadius: "12px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
          padding: "30px 25px",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        {/* Contenedor para botón y título en línea */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            marginBottom: "25px",
            height: "40px", // altura fija para facilitar alineación
          }}
        >
          {/* Botón a la izquierda */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/")}
            style={{
              borderRadius: "8px",
              fontWeight: "600",
              padding: "10px 20px",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              transition: "background-color 0.3s ease",
              zIndex: 2,
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#495057")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "")}
          >
            Volver al Inicio
          </button>

          {/* Título centrado */}
          <h2
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              color: "#a83232",
              fontWeight: "700",
              margin: 0,
              fontSize: "1.8rem",
              userSelect: "none",
              zIndex: 1,
            }}
          >
            Bajar Libro
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          {[
            {
              label: "ISBN:",
              name: "isbn",
              type: "text",
              readOnly: false,
              placeholder: "Ingrese el ISBN del libro",
              required: true,
            },
            { label: "Título:", name: "titulo", type: "text", readOnly: true },
            { label: "Autor:", name: "autor", type: "text", readOnly: true },
            { label: "Editorial:", name: "editorial", type: "text", readOnly: true },
            { label: "Stock actual:", name: "stock", type: "number", readOnly: true },
            {
              label: "Cantidad a bajar:",
              name: "cantidad",
              type: "number",
              readOnly: false,
              min: 1,
              placeholder: "Cantidad a descontar",
              required: true,
            },
          ].map(({ label, name, type, readOnly, placeholder, required, min }) => (
            <div className="mb-3" key={name}>
              <label
                className="form-label"
                style={{ color: "black", fontWeight: "600" }}
              >
                {label}
              </label>
              <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                readOnly={readOnly}
                placeholder={placeholder}
                required={required}
                min={min}
                onBlur={name === "isbn" ? handleSearch : undefined}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "1.5px solid #a83232",
                  backgroundColor: readOnly ? "#f4dede" : "#fff0f0",
                  color: "#000", // ✅ texto siempre negro
                  fontWeight: "500",
                  fontSize: "1rem",
                  boxShadow: "inset 1px 1px 3px rgba(168,50,50,0.15)",
                  transition: "border-color 0.3s ease",
                }}
                onFocus={(e) => {
                  if (!readOnly) e.target.style.borderColor = "#7a1f1f";
                }}
                onBlurCapture={(e) => {
                  if (!readOnly) e.target.style.borderColor = "#a83232";
                }}
              />
            </div>
          ))}

          {error && (
            <div
              className="mb-3"
              style={{ color: "#b22e2e", fontWeight: "700", fontSize: "1rem" }}
            >
              ❌ {error}
            </div>
          )}

          <div className="d-flex gap-3 mb-3">
            <button
              type="submit"
              className="btn"
              style={{
                flex: 1,
                background: "linear-gradient(135deg, #d95c5c 0%, #b83232 100%)",
                color: "white",
                fontWeight: "700",
                fontSize: "1.25rem",
                padding: "12px 0",
                borderRadius: "10px",
                boxShadow: "0 6px 12px rgba(184,50,50,0.5)",
                transition: "background 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background =
                  "linear-gradient(135deg, #b83232 0%, #a12a2a 100%)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background =
                  "linear-gradient(135deg, #d95c5c 0%, #b83232 100%)";
              }}
            >
              Bajar Stock
            </button>

            <button
              type="button"
              className="btn btn-warning"
              style={{
                flex: 1,
                fontWeight: "700",
                fontSize: "1.25rem",
                borderRadius: "10px",
                boxShadow: "0 6px 12px rgba(184,136,50,0.5)",
                transition: "background-color 0.3s ease",
              }}
              onClick={limpiarPantalla}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#d4a417")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "")}
            >
              Limpiar Pantalla
            </button>
          </div>

          {resultado && (
            <div
              className="mt-3"
              style={{
                color: resultado.includes("✅") ? "#2e7d32" : "#b22e2e",
                fontWeight: "700",
                fontSize: "1.1rem",
              }}
            >
              {resultado}
            </div>
          )}

          {resultados.length > 0 && (
            <div className="mt-4" style={{ color: "#a83232" }}>
              <h4 style={{ fontWeight: "700", marginBottom: "15px" }}>
                Resultado:
              </h4>
              <ul
                className="list-group"
                style={{
                  borderRadius: "10px",
                  boxShadow: "0 3px 10px rgba(168,50,50,0.2)",
                  backgroundColor: "#f9e6e6",
                  padding: "15px",
                  fontWeight: "600",
                  fontSize: "1rem",
                }}
              >
                {resultados.map((libro, index) => (
                  <li
                    key={index}
                    className="list-group-item"
                    style={{
                      borderRadius: "8px",
                      marginBottom: "10px",
                      border: "1px solid #dca1a1",
                      backgroundColor: "#fff0f0",
                      color: "#7a1f1f",
                    }}
                  >
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
