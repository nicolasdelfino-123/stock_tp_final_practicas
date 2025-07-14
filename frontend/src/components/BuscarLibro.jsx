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

  // Función para navegar a BajarLibro con los datos del formulario
  const irABajarLibro = () => {
    // Verificar que hay datos suficientes para bajar el libro
    if (!formData.isbn || !formData.titulo || !formData.stock) {
      alert("Primero debe buscar un libro para poder bajar su stock.");
      return;
    }

    // Navegar a BajarLibro pasando los datos como state
    navigate("/bajarlibro", {
      state: {
        isbn: formData.isbn,
        titulo: formData.titulo,
        autor: formData.autor,
        editorial: formData.editorial,
        stock: formData.stock,
        id: formData.id,
      }
    });
  };

  const fondoURL = "/fondo-3.jpg"

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${fondoURL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100%",
        paddingTop: "10px", // rompe el colapso del margin
        boxSizing: "border-box",
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: "800px",
          backgroundColor: "#e3f2fd", // azul pastel claro
          borderRadius: "12px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
          padding: "30px 25px 20px 25px", // reducido padding bottom
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          marginBottom: resultados.length > 0 ? "20px" : "0", // margin bottom solo si hay resultados
        }}
      >
        {/* Contenedor para botón y título en línea */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
              color: "#114470", // azul fuerte
              fontWeight: "900",
              margin: 0,
              fontSize: "1.8rem",
              userSelect: "none",
              zIndex: 1,
            }}
          >
            Buscar Libro
          </h2>

          {/* Botón Bajar Libro a la derecha */}
          <button
            type="button"
            className="btn"
            onClick={irABajarLibro}
            style={{
              background: "linear-gradient(135deg, #d95c5c 0%, #b83232 100%)",
              color: "white",
              fontWeight: "700",
              padding: "10px 20px",
              borderRadius: "8px",
              boxShadow: "0 4px 8px rgba(184,50,50,0.3)",
              transition: "background 0.3s ease",
              zIndex: 2,
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "linear-gradient(135deg, #b83232 0%, #a12a2a 100%)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "linear-gradient(135deg, #d95c5c 0%, #b83232 100%)";
            }}
          >
            Bajar Libro
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {[
            {
              label: "ISBN:",
              name: "isbn",
              type: "text",
              readOnly: false,
              placeholder: "Ej: 9789870000000",
              onBlur: async (e) => {
                const valor = e.target.value.trim();
                if (valor) {
                  await buscarLibro();
                }
              },
            },
            { label: "Título:", name: "titulo", type: "text", readOnly: false, placeholder: "Ej: principito" },
            { label: "Autor:", name: "autor", type: "text", readOnly: false, placeholder: "Ej: Borges" },
            { label: "Ubicación:", name: "ubicacion", type: "text", readOnly: true },
            { label: "Stock:", name: "stock", type: "text", readOnly: true },
            { label: "Editorial:", name: "editorial", type: "text", readOnly: true },
          ].map(({ label, name, type, readOnly, placeholder, onBlur }) => (
            <div className="mb-3" key={name}>
              <label
                className="form-label"
                style={{ color: "black", fontWeight: "800" }}
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
                onBlur={onBlur}
                autoFocus={name === "isbn"}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: `1.5px solid #1e88e5`,
                  backgroundColor: readOnly ? "#d3e3fc" : "#e8f1fc",
                  color: readOnly ? "black" : "black",
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

          <div className="d-flex gap-3" style={{ marginBottom: "0" }}>
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
        </form>
      </div>

      {/* Sección de resultados en una línea */}
      {resultados.length > 0 && (
        <div
          style={{
            marginTop: "24px",
            marginLeft: "10px",
            marginRight: "10px",
            marginBottom: "60px",
            backgroundColor: "#e3f2fd",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 4px 10px rgba(30,136,229,0.1)",
          }}
        >
          <h4
            style={{
              fontWeight: "700",
              color: "#114470",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Resultados:
          </h4>

          <ul
            className="list-group"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {resultados.map((libro, index) => (
              <li
                key={index}
                className="list-group-item"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "15px 20px",
                  border: "1px solid #90caf9",
                  backgroundColor: "#bbdefb",
                  borderRadius: "12px",
                  boxShadow: "0 4px 8px rgba(30, 136, 229, 0.1)",
                  fontSize: "0.95rem",
                  color: "black",
                  fontWeight: "500",
                }}
              >
                <div style={{
                  flex: "1 1 auto",
                  minWidth: "0",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px 30px",
                  alignItems: "center"
                }}>
                  <div style={{
                    wordWrap: "break-word",
                    wordBreak: "break-word",
                    overflowWrap: "break-word"
                  }}>
                    <strong>Título:</strong> 📘 {libro.titulo}
                  </div>

                  <div style={{
                    wordWrap: "break-word",
                    wordBreak: "break-word",
                    overflowWrap: "break-word"
                  }}>
                    <strong>Autor:</strong> {libro.autor}
                  </div>

                  <div style={{
                    wordWrap: "break-word",
                    wordBreak: "break-word",
                    overflowWrap: "break-word"
                  }}>
                    <strong>Editorial:</strong> {libro.editorial || "No disponible"}
                  </div>

                  <div style={{
                    wordWrap: "break-word",
                    wordBreak: "break-word",
                    overflowWrap: "break-word"
                  }}>
                    <strong>ISBN:</strong> {libro.isbn}
                  </div>

                  <div style={{
                    wordWrap: "break-word",
                    wordBreak: "break-word",
                    overflowWrap: "break-word"
                  }}>
                    <strong>Stock:</strong> {libro.stock}
                  </div>

                  <div style={{
                    wordWrap: "break-word",
                    wordBreak: "break-word",
                    overflowWrap: "break-word"
                  }}>
                    <strong style={{ fontWeight: "900" }}>Ubicación:</strong> {libro.ubicacion || "No disponible"}
                  </div>
                </div>

                <button
                  className="btn btn-sm btn-success"
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    borderRadius: "6px",
                    whiteSpace: "nowrap",
                    flexShrink: 0
                  }}
                  onClick={() => handleSelectBook(libro)}
                >
                  Seleccionar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Mensaje de error separado */}
      {error && resultados.length === 0 && (
        <div
          style={{
            color: "#1565c0",
            fontWeight: "700",
            textAlign: "center",
            marginTop: "20px",
            padding: "0 20px"
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
export default BuscarLibro;