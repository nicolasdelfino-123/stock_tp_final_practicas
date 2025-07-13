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
    <div
      className="container my-4"
      style={{
        maxWidth: "800px",
        backgroundColor: "#e3f2fd", // azul pastel claro
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
          height: "40px",
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
            color: "#1e88e5", // azul fuerte
            fontWeight: "700",
            margin: 0,
            fontSize: "1.8rem",
            userSelect: "none",
            zIndex: 1,
          }}
        >
          Buscar Libro
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        {[
          {
            label: "ISBN:",
            name: "isbn",
            type: "text",
            readOnly: false,
            placeholder: "Ej: 9789870000000",
          },
          { label: "Título:", name: "titulo", type: "text", readOnly: false, placeholder: "Ej: principito" },
          { label: "Autor:", name: "autor", type: "text", readOnly: false, placeholder: "Ej: Borges" },
          { label: "Ubicación:", name: "ubicacion", type: "text", readOnly: true },
          { label: "Stock:", name: "stock", type: "text", readOnly: true },
          { label: "Editorial:", name: "editorial", type: "text", readOnly: true },
        ].map(({ label, name, type, readOnly, placeholder }) => (
          <div className="mb-3" key={name}>
            <label
              className="form-label"
              style={{ color: "#1e88e5", fontWeight: "600" }}
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
              style={{
                width: "100%",
                padding: "10px 15px",
                borderRadius: "8px",
                border: `1.5px solid #1e88e5`,
                backgroundColor: readOnly ? "#d3e3fc" : "#e8f1fc",
                color: readOnly ? "#3563a1" : "#1e88e5",
                fontWeight: "500",
                fontSize: "1rem",
                boxShadow: "inset 1px 1px 3px rgba(30, 136, 229, 0.15)",
                transition: "border-color 0.3s ease",
              }}
              onFocus={(e) => {
                if (!readOnly) e.target.style.borderColor = "#1565c0";
              }}
              onBlurCapture={(e) => {
                if (!readOnly) e.target.style.borderColor = "#1e88e5";
              }}
            />
          </div>
        ))}

        {error && (
          <div
            className="mb-3"
            style={{ color: "#1565c0", fontWeight: "700", fontSize: "1rem" }}
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
              background: "linear-gradient(135deg, #64b5f6 0%, #1e88e5 100%)",
              color: "white",
              fontWeight: "700",
              fontSize: "1.25rem",
              padding: "12px 0",
              borderRadius: "10px",
              boxShadow: "0 6px 12px rgba(30,136,229,0.5)",
              transition: "background 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.background =
                "linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background =
                "linear-gradient(135deg, #64b5f6 0%, #1e88e5 100%)";
            }}
          >
            Buscar
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

        {resultados.length > 0 && (
          <div className="mt-4" style={{ color: "#1e88e5" }}>
            <h4 style={{ fontWeight: "700", marginBottom: "15px" }}>Resultados:</h4>
            <ul
              className="list-group"
              style={{
                borderRadius: "10px",
                boxShadow: "0 3px 10px rgba(30,136,229,0.2)",
                backgroundColor: "#e3f2fd",
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
                    border: "1px solid #90caf9",
                    backgroundColor: "#90caf9",
                    color: "#1565c0",
                  }}
                >
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

        {error && (
          <div className="mt-4" style={{ color: "#1565c0", fontWeight: "700" }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
export default BuscarLibro;
