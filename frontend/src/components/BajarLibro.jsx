import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppContext } from "../context/appContext";

const BajarLibro = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { actions } = useAppContext();
  const [alerta, setAlerta] = useState(""); // NUEVO estado para alerta
  const [alertaCantidad, setAlertaCantidad] = useState("");


  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    editorial: "",
    ubicacion: "",
    stock: "",
    precio: "",
    cantidad: "",
    id: null,
  });
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState("");
  const [resultados, setResultados] = useState([]);
  const resultadosRef = React.useRef(null);


  // 1) Este useEffect se ejecuta una sola vez al montar el componente,
  // carga los datos que vienen por location.state (desde BuscarLibro)
  useEffect(() => {
    if (location.state) {
      setFormData({
        isbn: location.state.isbn || "",
        titulo: location.state.titulo || "",
        autor: location.state.autor || "",
        editorial: location.state.editorial || "",
        ubicacion: location.state.ubicacion || "",
        stock: location.state.stock || "",
        precio: location.state.precio || 0,
        cantidad: "",
        id: location.state.id || null,
      });
    }
  }, []); // OJO: arreglo de dependencias vacío => se ejecuta solo 1 vez

  useEffect(() => {
    if (alerta || alertaCantidad) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [alerta, alertaCantidad]);



  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value, // Elimina la conversión a null
    }));
  };

  const handleSearch = async () => {
    if (!formData.isbn) {
      setAlertaCantidad("❌ Por favor, ingrese un ISBN para buscar");
      return;
    }

    try {
      const libroEncontrado = await actions.buscarLibroPorISBN(formData.isbn);

      if (libroEncontrado && libroEncontrado.fuente === "Base de datos local") {
        setFormData((prev) => ({
          ...prev,
          id: libroEncontrado.id,
          titulo: libroEncontrado.titulo,
          autor: libroEncontrado.autor,
          editorial: libroEncontrado.editorial || "",
          ubicacion: libroEncontrado.ubicacion || "",
          stock: libroEncontrado.stock,
          precio: libroEncontrado.precio ?? 0,
        }));
        setError("");
        setResultado("");
        setResultados([]);
      } else {
        setAlertaCantidad("❌ No se encontró un libro con ese ISBN");
        setError("");
        setResultado("");
        setResultados([]);
      }
    } catch (err) {
      console.error("Error al buscar el libro:", err);
      setAlertaCantidad("❌ Error al buscar el libro");
      setError("");
      setResultado("");
      setResultados([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación de libro buscado
    if (!formData.id) {
      setAlertaCantidad("❌ Por favor, primero busque un libro por ISBN");
      return;
    }

    // Validación de stock
    if (!formData.stock || formData.stock === 0) {
      setAlertaCantidad("❌ No hay stock disponible para este libro");
      return;
    }

    // Validación de cantidad - ESTA ES LA PARTE CLAVE MODIFICADA
    if (!formData.cantidad || formData.cantidad.trim() === "") {
      setAlertaCantidad("❌ Por favor, ingrese la cantidad a bajar");
      return;
    }

    // Convertir a número
    const cantidad = Number(formData.cantidad);
    const stockActual = Number(formData.stock);

    // Validar que sea un número válido
    if (isNaN(cantidad)) {
      setAlertaCantidad("❌ La cantidad debe ser un número");
      return;
    }

    // Validar que sea mayor que 0
    if (cantidad <= 0) {
      setAlertaCantidad("❌ La cantidad debe ser mayor que 0");
      return;
    }

    // Validar stock suficiente
    if (cantidad > stockActual) {
      setAlertaCantidad(`❌ No hay suficiente stock. Stock actual: ${stockActual}`);
      return;
    }

    try {
      const response = await actions.bajarStockLibro(formData.id, cantidad);

      if (response.success) {
        const nuevoStock = stockActual - cantidad;
        setFormData((prev) => ({
          ...prev,
          stock: nuevoStock,
          cantidad: "",
        }));

        const mensaje = (
          <>
            ✅ Stock actualizado correctamente. Se dio de baja la cantidad{" "}
            <span style={{ color: "black", fontWeight: 'bold' }}>{cantidad}</span> del libro "
            <span style={{ color: "black", fontWeight: 'bold' }}>{formData.titulo}</span>" de{" "}
            <span style={{ color: "black", fontWeight: 'bold' }}>{formData.autor}</span>.
          </>
        );
        setAlerta(mensaje);

        setResultados([
          {
            titulo: formData.titulo,
            autor: formData.autor,
            editorial: formData.editorial,
            ubicacion: formData.ubicacion,
            stock: nuevoStock,
            precio: formData.precio,
            ubicacion: response.ubicacion || "",
          },
        ]);
      } else {
        setAlertaCantidad(`❌ ${response.error || "Error al bajar el stock"}`);
        setResultados([]);
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      setAlertaCantidad("❌ Error de red: " + error.message);
      setResultados([]);
    }
  };

  const limpiarPantalla = () => {
    setFormData({
      isbn: "",
      titulo: "",
      autor: "",
      editorial: "",
      ubicacion: "",
      stock: "",
      precio: "",
      cantidad: "",
      id: null,
    });
    setResultados([]);
    setError("");
    setResultado("");
  };

  const fondoURL = "/fondo-3.jpg"




  return (
    <>
      {/* Modal para alerta de cantidad */}
      {alertaCantidad && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            zIndex: 9998,
            display: "flex",
            backdropFilter: "blur(3px)",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "auto"
          }}
          onClick={(e) => {
            if (!e.target.closest('[role="dialog"]')) {
              e.stopPropagation();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();

                setAlertaCantidad("");
              }
            }}
            style={{
              backgroundColor: "#f8d7da",
              color: "#721c24",
              padding: "25px 30px",
              borderRadius: "12px",
              fontSize: "1.1rem",
              fontWeight: "600",
              zIndex: 9999,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
              textAlign: "center",
              border: "1px solid #f5c6cb",
              maxWidth: "90%",
              width: "500px",
              outline: "none",
              pointerEvents: "auto"
            }}
            autoFocus
          >
            <p style={{ marginBottom: "20px" }}>{alertaCantidad}</p>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setAlertaCantidad("")}
              style={{
                borderRadius: "8px",
                fontWeight: "700",
                padding: "8px 18px",
                fontSize: "0.95rem",
                backgroundColor: "#dc3545",
                border: "none",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
              autoFocus
            >
              Entendido
            </button>
          </div>
        </div>
      )}


      {alerta && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.6)", // Fondo más oscuro
            zIndex: 9998,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "auto" // Asegura que captura todos los clicks
          }}
          onClick={(e) => {
            // Solo permitir cerrar haciendo click en el botón
            if (!e.target.closest('[role="dialog"]')) {
              e.stopPropagation();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                setAlerta("");
              }
            }}
            style={{
              backgroundColor: "#d4edda",
              color: "#155724",
              padding: "25px 30px",
              borderRadius: "12px",
              fontSize: "1.1rem",
              fontWeight: "600",
              zIndex: 9999,
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
              textAlign: "center",
              border: "1px solid #c3e6cb",
              maxWidth: "90%",
              width: "500px",
              outline: "none",
              pointerEvents: "auto" // Permite interacción con el modal
            }}
            autoFocus
          >
            <p style={{ marginBottom: "20px" }}>{alerta}</p>
            <button
              type="button"
              className="btn btn-success"
              onClick={() => {
                setAlerta("");
                setTimeout(() => {
                  resultadosRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              style={{
                borderRadius: "8px",
                fontWeight: "700",
                padding: "8px 18px",
                fontSize: "0.95rem",
                backgroundColor: "#28a745",
                border: "none",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
              autoFocus
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
          {/* Contenedor para botón volver al inicio y título en línea */}
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

          <form onSubmit={(e) => {
            e.preventDefault();
            if (document.activeElement.name !== "isbn") {
              handleSubmit(e);
            }
          }}>
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
                    placeholder: "Ingrese el ISBN del libro",
                    required: false,
                    col: 12,
                  },
                  { label: "Título:", name: "titulo", type: "text", readOnly: true, col: 12 },
                  { label: "Autor:", name: "autor", type: "text", readOnly: true, col: 12 },
                  { label: "Editorial:", name: "editorial", type: "text", readOnly: true, col: 6 },
                  { label: "Ubicación:", name: "ubicacion", type: "text", readOnly: true, col: 6 },
                  { label: "Stock actual:", name: "stock", type: "number", readOnly: true, col: 4 },
                  { label: "Precio", name: "precio", type: "number", readOnly: true, col: 4 },
                  {
                    label: "Cantidad a bajar:",
                    name: "cantidad",
                    type: "number",
                    readOnly: false,
                    min: 1,
                    placeholder: "Cantidad a descontar",
                    required: false,
                    col: 4,
                  },
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
                    {row.map(({ label, name, type, readOnly, placeholder, required, min, col }) => (
                      <div className={`col-md-${col || 12} mb-3`} key={name}>
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
                          autoFocus={name === "isbn"}
                          min={min}
                          onBlur={name === "isbn" ? () => {
                            if (formData.isbn.trim() !== "") {
                              handleSearch();
                            }
                          } : undefined}
                          onKeyDown={name === "isbn" ? (e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.stopPropagation(); // evita que se propague al form
                              handleSearch();
                            }
                          }) : undefined}
                          style={{
                            width: "100%",
                            padding: "10px 15px",
                            borderRadius: "8px",
                            border: "1.5px solid #000000",
                            backgroundColor: readOnly ? "#f4dede" : "#fff0f0",
                            color: "#000000",
                            fontWeight: "600",
                            fontSize: "1rem",
                            boxShadow: "inset 1px 1px 3px rgba(168,50,50,0.15)",
                            transition: "border-color 0.3s ease",
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = "#7a1f1f";
                            e.target.style.borderWidth = "3px"; // Aumenta el grosor

                          }}
                          onBlurCapture={(e) => {
                            e.target.style.borderColor = "#a83232";
                            e.target.style.borderWidth = "1.5px"; // Vuelve al original
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ));
              })()
            }

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
              <div ref={resultadosRef} className="mt-4" style={{ color: "#a83232" }}>

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
                      <strong>Precio:</strong> {libro.precio} <br />
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
    </>
  );
};

export default BajarLibro;
