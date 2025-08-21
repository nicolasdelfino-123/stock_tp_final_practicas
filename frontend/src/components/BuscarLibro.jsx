import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/appContext";
import { useEffect } from "react";

const BuscarLibro = () => {
  const navigate = useNavigate();
  const { store, actions, API_BASE } = useAppContext();
  const resultadosRef = useRef(null);
  const entendidoBtnRef = useRef(null);


  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    ubicacion: "",
    stock: "",
    precio: "",
    editorial: "",
  });

  const [resultados, setResultados] = useState([]);
  const [error, setError] = useState("");



  useEffect(() => {
    if (error && entendidoBtnRef.current) {
      entendidoBtnRef.current.focus();
    }
  }, [error]);


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
        // 1. Primero busca en los libros ya cargados en el contexto (store.libros)
        const libroEnStore = store.libros?.find(libro =>
          libro.isbn === isbn.trim().replace(/-/g, "")
        );

        if (libroEnStore) {
          setFormData((prev) => ({
            ...prev,
            id: libroEnStore.id,
            titulo: libroEnStore.titulo,
            autor: libroEnStore.autor,
            stock: libroEnStore.stock,
            precio: libroEnStore.precio,
            ubicacion: libroEnStore.ubicacion || "",
            editorial: libroEnStore.editorial || "",
          }));
          setResultados([libroEnStore]);
          scrollToResultados();
          return;
        }

        // 2. Si no está en el store, consulta la API local directamente
        const response = await fetch(`${API_BASE}/libros?isbn=${isbn.trim().replace(/-/g, "")}`);
        const data = await response.json();

        if (response.ok && data.length > 0) {
          const libroEncontrado = data[0];
          setFormData((prev) => ({
            ...prev,
            id: libroEncontrado.id,
            titulo: libroEncontrado.titulo,
            autor: libroEncontrado.autor,
            stock: libroEncontrado.stock,
            precio: libroEncontrado.precio,
            ubicacion: libroEncontrado.ubicacion || "",
            editorial: libroEncontrado.editorial || "",
          }));
          setResultados([libroEncontrado]);
          scrollToResultados();
          return;
        } else {
          setError("No se encontró un libro con ese ISBN en nuestro stock");
          return;
        }
      }

      // Búsqueda por título/autor (mantenemos la lógica original)
      if (!store.libros || store.libros.length === 0) {
        await actions.fetchLibros();
      }

      const librosFiltrados = store.libros.filter((libro) => {
        const matchTitulo = titulo.trim() && libro.titulo.toLowerCase().includes(titulo.toLowerCase());
        const matchAutor = autor.trim() && libro.autor.toLowerCase().includes(autor.toLowerCase());
        return matchTitulo || matchAutor;
      });

      if (librosFiltrados.length === 0) {
        setError("No se encontraron coincidencias en nuestro stock");
      } else {
        setResultados(librosFiltrados);
        scrollToResultados();
      }
    } catch (err) {
      console.error("Error al buscar:", err);
      setError("ISBN no existente en nuestra base de datos");
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
      precio: "",
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
      precio: libro.precio || 0,
      editorial: libro.editorial || "",
    });
    setResultados([]);
  };

  // Función para navegar a BajarLibro con los datos del formulario
  const irABajarLibro = () => {
    // Verificar que hay datos suficientes para bajar el libro
    if (!formData.isbn || !formData.titulo || !formData.stock) {
      alert("El libro debe tener, ISBN, Título y Stock no debe cero.");
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
        ubicacion: formData.ubicacion
      }
    });
  };

  const fondoURL = "/fondoo.webp"
  // Mapeo de ubicación => color pastel
  const coloresUbicacion = {
    rosa: "#fa8eb4ff",
    turquesa: "#17c1d7ff",
    rojo: "#d63131ff",
    lila: "#c31be0ff",
    negro: "#151718ff",
    amarillo: "#FFFF00",
    naranja: "#f7a308ff",
    verde: "#00FF00",
    blanco: "#f5f5f5"
  };


  return (
    <>
      {error && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") setError("");
          }}
          tabIndex={-1} // permite que escuche eventos de teclado
        >
          <div
            style={{
              backgroundColor: "#d4edda",
              color: "#155724",
              padding: "25px 30px",
              borderRadius: "12px",
              fontSize: "1.1rem",
              fontWeight: "600",
              maxWidth: "90%",
              width: "500px",
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
              outline: "none",
            }}
          >
            <p style={{ marginBottom: "20px" }}>{error}</p>
            <button
              ref={entendidoBtnRef}
              type="button"
              className="btn btn-success"
              onClick={() => setError("")}
              style={{
                borderRadius: "8px",
                fontWeight: "700",
                padding: "8px 18px",
                fontSize: "0.95rem",
                backgroundColor: "#28a745",
                border: "none",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}


      <div
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${fondoURL})`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom", // siempre anclada al borde inferior
          backgroundRepeat: "no-repeat",
          height: "100vh",                     // fijo al alto de pantalla
          width: "100%",                       // ocupa todo el ancho
          overflow: "auto",                    // permite scrollear el contenido si se pasa
          paddingTop: "10px",
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
            {
              (() => {
                const rows = [];
                let currentRow = [];
                let totalCols = 0;

                const fields = [
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
                    col: 12,
                  },
                  { label: "Título:", name: "titulo", type: "text", readOnly: false, placeholder: "Ej: principito", col: 12 },
                  { label: "Autor:", name: "autor", type: "text", readOnly: false, placeholder: "Ej: Borges", col: 12 },
                  { label: "Editorial:", name: "editorial", type: "text", readOnly: true, col: 12 },
                  { label: "Stock:", name: "stock", type: "text", readOnly: true, col: 4 },
                  { label: "Precio:", name: "precio", type: "number", readOnly: true, col: 4 },
                  { label: "Ubicación:", name: "ubicacion", type: "text", readOnly: true, col: 4 },
                ];

                for (const field of fields) {
                  const colSize = field.col || 12;
                  if (totalCols + colSize > 12) {
                    rows.push([...currentRow]);
                    currentRow = [];
                    totalCols = 0;
                  }
                  currentRow.push(field);
                  totalCols += colSize;
                }
                if (currentRow.length > 0) rows.push(currentRow);

                return rows.map((row, i) => (
                  <div className="row" key={i}>
                    {row.map(({ label, name, type, readOnly, placeholder, onBlur, col }) => (
                      <div className={`col-md-${col || 12} mb-3`} key={name}>
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
                          autoFocus={name === "isbn"}
                          onBlur={onBlur}
                          style={{

                            width: "100%",
                            padding: "10px 15px",
                            borderRadius: "8px",
                            border: `1.5px solid #000000`,
                            backgroundColor:
                              name === "stock" && formData.stock !== ""
                                ? formData.stock == 0  // Usar == para comparación flexible
                                  ? "#e94444ff"  // Rojo claro para stock 0
                                  : "#51c651ff"  // Verde claro para stock > 0
                                : readOnly
                                  ? "#d3e3fc"
                                  : "#e8f1fc",
                            color: "black",
                            fontWeight: "600",
                            fontSize: "1rem",
                            boxShadow: "inset 1px 1px 3px rgba(30, 136, 229, 0.15)",
                            transition: "border-color 0.3s ease",
                          }}
                          onFocus={(e) => {

                            e.target.style.borderColor = "#1565c0";
                            e.target.style.borderWidth = "3px"; // Aumenta el grosor

                          }}
                          onBlurCapture={(e) => {

                            e.target.style.borderColor = "#031228ff";
                            e.target.style.borderWidth = "1.5px"; // Vuelve al original

                          }}
                        />
                      </div>
                    ))}
                  </div>
                ));
              })()
            }

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

        </div >


        {/* Sección de resultados en una línea */}
        {
          resultados.length > 0 && (
            <div
              ref={resultadosRef}
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
                      border: "1px solid black",
                      backgroundColor: coloresUbicacion[libro.ubicacion?.toLowerCase()] || "#FFFFFF", // Color por defecto
                      borderRadius: "12px",
                      boxShadow: "0 4px 8px rgba(30, 136, 229, 0.1)",
                      fontSize: "0.95rem",
                      color: ["rojo", "negro"].includes(libro.ubicacion?.toLowerCase()) ? "white" : "black",
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
                        overflowWrap: "break-word",


                      }}>
                        <div>

                          <strong style={{
                            textDecoration: "underline", fontStyle: "italic",
                            fontWeight: "900", color: ["rojo", "negro"].includes(libro.ubicacion?.toLowerCase()) ? "white" : "black", marginRight: "8px", fontFamily: "'Roboto', 'Verdana', sans-serif"
                          }}>TÍTULO:</strong>

                          <span style={{
                            fontWeight: "900"
                          }}>📘 {libro.titulo} </span>

                        </div>
                      </div>

                      <div style={{
                        wordWrap: "break-word",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",

                      }}>
                        <strong style={{
                          textDecoration: "underline", marginRight: "8px", fontStyle: "italic",
                          fontWeight: "900", color: ["rojo", "negro"].includes(libro.ubicacion?.toLowerCase()) ? "white" : "black", fontFamily: "'Roboto', 'Verdana', sans-serif"
                        }}>AUTOR:</strong>
                        <span style={{
                          fontWeight: "900"
                        }}>{libro.autor}</span>
                      </div>

                      <div style={{
                        wordWrap: "break-word",
                        wordBreak: "break-word",
                        overflowWrap: "break-word"
                      }}>
                        <strong style={{
                          textDecoration: "underline", fontStyle: "italic",
                          fontWeight: "900", color: ["rojo", "negro"].includes(libro.ubicacion?.toLowerCase()) ? "white" : "black", marginRight: "8px", fontFamily: "'Roboto', 'Verdana', sans-serif"
                        }}>EDITORIAL:</strong ><span style={{ fontWeight: "900" }}>{libro.editorial || "No disponible"}</span>
                      </div>

                      <div style={{
                        wordWrap: "break-word",
                        wordBreak: "break-word",
                        overflowWrap: "break-word"
                      }}>
                        <strong style={{
                          textDecoration: "underline", fontStyle: "italic",
                          fontWeight: "900", color: ["rojo", "negro"].includes(libro.ubicacion?.toLowerCase()) ? "white" : "black", marginRight: "8px", fontFamily: "'Roboto', 'Verdana', sans-serif"
                        }}>ISBN:</strong> <span style={{ fontWeight: "900" }}>{libro.isbn}</span>
                      </div>

                      <div style={{
                        wordWrap: "break-word",
                        wordBreak: "break-word",
                        overflowWrap: "break-word"
                      }}>
                        <strong style={{
                          textDecoration: "underline", fontStyle: "italic",
                          fontWeight: "900", color: ["rojo", "negro"].includes(libro.ubicacion?.toLowerCase()) ? "white" : "black", marginRight: "8px", fontFamily: "'Roboto', 'Verdana', sans-serif"
                        }}>STOCK:</strong> <span style={{ fontWeight: "900" }}>{libro.stock}</span>
                      </div>

                      <div style={{
                        wordWrap: "break-word",
                        wordBreak: "break-word",
                        overflowWrap: "break-word"
                      }}>
                        <strong style={{
                          textDecoration: "underline", fontStyle: "italic",
                          fontWeight: "900", color: ["rojo", "negro"].includes(libro.ubicacion?.toLowerCase()) ? "white" : "black", marginRight: "8px", fontFamily: "'Roboto', 'Verdana', sans-serif"
                        }}>UBICACIÓN:</strong> <span style={{ fontWeight: "900" }}>{libro.ubicacion || "No disponible"}</span>
                      </div>

                      <div style={{
                        wordWrap: "break-word",
                        wordBreak: "break-word",
                        overflowWrap: "break-word"
                      }}>
                        <strong style={{
                          textDecoration: "underline", fontStyle: "italic",
                          fontWeight: "900", color: ["rojo", "negro"].includes(libro.ubicacion?.toLowerCase()) ? "white" : "black", marginRight: "8px", fontFamily: "'Roboto', 'Verdana', sans-serif"
                        }} >PRECIO:</strong> <span style={{ fontWeight: "900" }}>{libro.precio}</span>
                      </div>

                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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

                      {parseInt(libro.stock) === 0 && (
                        <div
                          style={{
                            width: "46px",
                            height: "46px",
                            borderRadius: "50%",
                            backgroundColor: "#d32f2f",
                            color: "white",
                            border: "2px solid black",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            fontSize: "1.9rem",
                            boxShadow: "0 0 4px rgba(0,0,0,0.4)",
                          }}
                          title="Sin stock"
                        >
                          ×
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        {/* Mensaje de error separado */}
        {
          error && resultados.length === 0 && (
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
          )
        }
      </div >
    </>
  );
}
export default BuscarLibro;