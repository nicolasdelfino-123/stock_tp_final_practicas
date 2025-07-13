import React, { useState } from "react";
import { useAppContext } from "../context/appContext";
import { useNavigate } from "react-router-dom";

const AgregarLibro = () => {
  // Evita submit con Enter y mueve al siguiente input
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form = e.target.form;
      const index = Array.prototype.indexOf.call(form, e.target);
      if (form.elements[index + 1]) {
        form.elements[index + 1].focus();
      }
    }
  };

  const { store, actions } = useAppContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    editorial: "",
    stock: 1,
    precio: 0,
    ubicacion: "",
  });

  const [sinIsbn, setSinIsbn] = useState(false);
  const [isbnGenerado, setIsbnGenerado] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);
  const [origen, setOrigen] = useState("");
  const [generandoIsbn, setGenerandoIsbn] = useState(false);

  const mensaje = store.mensaje;

  // Función para limpiar los datos del libro excepto el ISBN
  const limpiarDatosLibro = (isbnValue = formData.isbn) => {
    setFormData({
      isbn: isbnValue,
      titulo: "",
      autor: "",
      editorial: "",
      stock: 1,
      precio: 0,
      ubicacion: "",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Si cambiamos manualmente el ISBN, reiniciamos el estado
    if (name === "isbn") {
      setOrigen("");
      setDatosCargados(false);
      limpiarDatosLibro(value);
    }

    actions.setMensaje("");
  };

  // Función mejorada para generar ISBN automáticamente
  const generarYMostrarIsbn = async () => {
    try {
      setGenerandoIsbn(true);
      actions.setMensaje("Generando ISBN automáticamente...");

      const resultado = await actions.generarIsbnAutomatico();

      if (resultado.success) {
        setIsbnGenerado(resultado.isbn);
        setFormData({
          ...formData,
          isbn: resultado.isbn,
        });
        actions.setMensaje(`✅ ISBN generado automáticamente: ${resultado.isbn}`);
        setOrigen("servidor");
      } else {
        actions.setMensaje(`❌ ${resultado.error}`);
        setOrigen("");
        setSinIsbn(false); // Desactiva el checkbox si falla
        setFormData({
          ...formData,
          isbn: "",
        });
      }
    } catch (error) {
      console.error("Error al generar ISBN:", error);
      actions.setMensaje("❌ Error inesperado al generar ISBN.");
      setOrigen("");
      setSinIsbn(false);
    } finally {
      setGenerandoIsbn(false);
    }
  };


  const handleAutocomplete = async () => {
    const { isbn } = formData;

    if (!isbn) return;

    setIsLoading(true);
    setOrigen("");

    try {
      // Primero buscamos en nuestra base de datos local
      const libroLocal = await actions.buscarLibroPorISBN(isbn);

      if (libroLocal) {
        setFormData({
          ...formData,
          autor: libroLocal.autor || "",
          editorial: libroLocal.editorial || "",
          stock: libroLocal.stock || 1,
          precio: libroLocal.precio || 0,
          titulo: libroLocal.titulo || "",
          ubicacion: libroLocal.ubicacion || "",
        });
        setOrigen("local");
        setDatosCargados(true);
      } else {
        // Si no lo encontramos localmente, buscamos en las fuentes externas
        const libroExterno = await actions.buscarLibroExterno(isbn);

        if (libroExterno) {
          setFormData({
            ...formData,
            titulo: libroExterno.titulo || "",
            autor: libroExterno.autor || "",
            editorial: libroExterno.editorial || "",
          });
          setOrigen("externo");
          setDatosCargados(true);
          actions.setMensaje(
            `Datos obtenidos de ${libroExterno.fuente || "fuente externa"}. Puede editar si es necesario.`
          );
        } else {
          actions.setMensaje(
            "No se encontró información para este ISBN. Puede ingresar los datos manualmente."
          );
          setOrigen("");
          setDatosCargados(false);
          limpiarDatosLibro(isbn);
        }
      }
    } catch (error) {
      console.error("Error al autocompletar los datos:", error);
      actions.setMensaje("Hubo un error al buscar información del libro.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIsbnBlur = () => {
    if (formData.isbn && !datosCargados && !sinIsbn) {
      handleAutocomplete();
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { isbn, titulo, autor, ubicacion, stock } = formData;

    if (!isbn || !titulo || !autor || !ubicacion) {
      alert("Por favor, complete los campos obligatorios: ISBN, título, autor y ubicación.");
      return;
    }

    if (stock < 1) {
      alert("El stock debe ser al menos 1.");
      return;
    }

    if (formData.precio < 0) {
      alert("El precio no puede ser negativo.");
      return;
    }

    try {
      const libroExistente = await actions.buscarLibroPorISBN(formData.isbn);

      if (libroExistente) {
        let cambios = [];

        if (formData.titulo !== libroExistente.titulo) {
          cambios.push("título");
        }
        if (formData.autor !== libroExistente.autor) {
          cambios.push("autor");
        }
        if (formData.editorial !== libroExistente.editorial) {
          cambios.push("editorial");
        }
        if (parseInt(formData.stock) !== parseInt(libroExistente.stock)) {
          cambios.push(`stock (${libroExistente.stock} → ${formData.stock})`);
        }
        if (parseFloat(formData.precio) !== parseFloat(libroExistente.precio)) {
          cambios.push("precio");
        }
        if (formData.ubicacion !== libroExistente.ubicacion) {
          cambios.push("ubicación");
        }

        if (cambios.length > 0) {
          const resultado = await actions.actualizarLibro(
            libroExistente.id,
            formData
          );

          if (resultado.success) {
            const mensajeExito = `Libro actualizado con éxito. Campos modificados: ${cambios.join(", ")}.`;
            actions.setMensaje(mensajeExito);

            // Borrar mensaje luego de 5 segundos
            setTimeout(() => {
              actions.setMensaje("");
            }, 10000);

            setOrigen("local");
          } else {
            alert(resultado.error || "Hubo un error al actualizar el libro");
          }
        } else {
          actions.setMensaje("No se realizaron cambios en el libro.");

          // Borrar mensaje luego de 5 segundos
          setTimeout(() => {
            actions.setMensaje("");
          }, 10000);
        }
      } else {
        const resultado = await actions.crearLibro(formData);

        if (resultado.success) {
          actions.setMensaje(
            `Libro creado con éxito con stock de ${formData.stock} unidad(es).`
          );

          // Borrar mensaje luego de 5 segundos
          setTimeout(() => {
            actions.setMensaje("");
          }, 10000);

          // Resetear formulario
          setFormData({
            isbn: "",
            titulo: "",
            autor: "",
            editorial: "",
            stock: 1,
            precio: 0,
            ubicacion: "",
          });
          setOrigen("");
          setDatosCargados(false);
          setSinIsbn(false);
          setIsbnGenerado("");
        } else {
          alert(resultado.error || "Hubo un error al crear el libro");
        }
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      alert("Hubo un error con la solicitud: " + error.message);
    }
  };

  return (
    <div
      className="container my-4"
      style={{
        maxWidth: "800px",
        backgroundColor: "#d7f0d7", // verde pastel suave
        borderRadius: "12px",
        boxShadow: "0 8px 20px rgba(0, 100, 0, 0.1)", // sombra verde suave
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
            boxShadow: "0 4px 8px rgba(0, 100, 0, 0.1)",
            transition: "background-color 0.3s ease",
            zIndex: 2,

          }}

        >
          Volver al Inicio
        </button>

        {/* Título centrado */}
        <h2
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            color: "#2e7d32", // verde más oscuro
            fontWeight: "700",
            margin: 0,
            fontSize: "1.8rem",
            userSelect: "none",
            zIndex: 1,
          }}
        >
          Crear Nuevo Libro
        </h2>

        {/* Para que el botón "Volver" no empuje el título */}
        <div style={{ width: "130px" }}></div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Checkbox para crear sin ISBN */}
        <div className="mb-3">
          <label
            htmlFor="isbn"
            className="form-label"
            style={{ color: "#2e7d32", fontWeight: "600" }}
          >
            ISBN:
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ flexGrow: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1.5px solid #2e7d32",
                  borderRadius: "8px",
                  boxShadow: "inset 1px 1px 4px rgba(46, 125, 50, 0.15)",
                  backgroundColor: sinIsbn ? "#d7f0d7" : "#e8f5e9",
                  overflow: "hidden",
                }}
              >
                <input
                  type="text"
                  id="isbn"
                  name="isbn"
                  value={formData.isbn}
                  onChange={handleChange}
                  onBlur={handleIsbnBlur}
                  required
                  onKeyDown={handleInputKeyDown}
                  readOnly={sinIsbn}
                  placeholder={
                    sinIsbn
                      ? "Se generará automáticamente..."
                      : "Ingrese el ISBN"
                  }
                  style={{
                    flexGrow: 1,
                    border: "none",
                    outline: "none",
                    padding: "10px 15px",
                    backgroundColor: "transparent",
                    color: "#2e7d32",
                    fontWeight: "500",
                    fontSize: "1rem",
                  }}
                />

                {!isLoading && origen && (
                  <span
                    style={{
                      padding: "0 12px", // un poco más de espacio para que quede bonito
                      fontWeight: "600",
                      fontSize: "0.9rem",
                      userSelect: "none",
                      backgroundColor:
                        origen === "local"
                          ? "#a6d8a8"
                          : origen === "servidor"
                            ? "#81c784"
                            : origen === "fallback"
                              ? "#c5e1a5"
                              : "#aed581",
                      color:
                        origen === "fallback" ? "#4a4a1a" : "#2e7d32",
                      borderLeft: "1.5px solid #2e7d32",
                      display: "flex",
                      alignItems: "center",
                      height: "100%",
                      whiteSpace: "nowrap",
                      borderTopLeftRadius: "8px",
                      borderBottomLeftRadius: "8px",
                    }}
                  >
                    {origen === "local"
                      ? "BD Local"
                      : origen === "servidor"
                        ? "Servidor"
                        : origen === "fallback"
                          ? "Fallback"
                          : "API Externa"}
                  </span>
                )}

                {isLoading && !sinIsbn && (
                  <span
                    style={{
                      padding: "0 10px",
                      display: "flex",
                      alignItems: "center",
                      borderLeft: "1.5px solid #2e7d32",
                    }}
                  >
                    <div
                      className="spinner-border spinner-border-sm"
                      role="status"
                      style={{ color: "#2e7d32" }}
                    >
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginLeft: "10px",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                id="crearSinIsbn"
                className="form-check-input"
                checked={sinIsbn}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  if (checked) {
                    await generarYMostrarIsbn();
                    setSinIsbn(true);
                    setDatosCargados(false);
                  } else {
                    setFormData({ ...formData, isbn: "" });
                    setIsbnGenerado("");
                    setOrigen("");
                    setDatosCargados(false);
                    setSinIsbn(false);
                    actions.setMensaje("");
                  }
                }}
                disabled={generandoIsbn}
              />
              <label
                htmlFor="crearSinIsbn"
                className="form-check-label small"
                style={{ color: "#2e7d32" }}
              >
                Crear sin ISBN
              </label>
              {generandoIsbn && (
                <span style={{ marginLeft: "8px" }}>
                  <div
                    className="spinner-border spinner-border-sm"
                    role="status"
                    style={{ color: "#2e7d32" }}
                  >
                    <span className="visually-hidden">Generando...</span>
                  </div>
                </span>
              )}
            </div>
          </div>

          <small
            className="text-muted"
            style={{ color: "#4a7f4a", display: "block", marginTop: "5px" }}
          >
            {sinIsbn
              ? "ISBN generado automáticamente. Se asignará el próximo número disponible."
              : ""}
          </small>
        </div>

        {[
          {
            label: "Título:",
            name: "titulo",
            type: "text",
            required: true,
            placeholder: "Ingrese el título del libro",
          },
          {
            label: "Autor:",
            name: "autor",
            type: "text",
            required: true,
            placeholder: "Ingrese el autor",
          },
          {
            label: "Editorial:",
            name: "editorial",
            type: "text",
            required: false,
            placeholder: "Ingrese la editorial",
          },
          {
            label: "Stock (mínimo 1):",
            name: "stock",
            type: "number",
            required: false,
            min: 1,
            placeholder: "Ingrese la cantidad en stock",
          },
          {
            label: "Precio:",
            name: "precio",
            type: "number",
            required: false,
            placeholder: "Ingrese el precio",
          },
          {
            label: "Ubicación:",
            name: "ubicacion",
            type: "text",
            required: false,
            placeholder: "Ingrese la ubicación",
          },
        ].map(({ label, name, type, required, placeholder, min }) => (
          <div className="mb-3" key={name}>
            <label
              htmlFor={name}
              className="form-label"
              style={{ color: "#2e7d32", fontWeight: "600" }}
            >
              {label}
            </label>
            <input
              type={type}
              id={name}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              required={required}
              placeholder={placeholder}
              min={min}
              onKeyDown={handleInputKeyDown}
              style={{
                width: "100%",
                padding: "10px 15px",
                borderRadius: "8px",
                border: "1.5px solid #2e7d32",
                backgroundColor: "#e8f5e9",
                color: "#2e7d32",
                fontWeight: "500",
                fontSize: "1rem",
                boxShadow: "inset 1px 1px 3px rgba(46, 125, 50, 0.15)",
                transition: "border-color 0.3s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#1b4d1b";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#2e7d32";
              }}
            />
          </div>
        ))}

        {mensaje && (
          <div
            className="mb-3"
            style={{ color: "#2e7d32", fontWeight: "700", fontSize: "1rem" }}
          >
            ℹ️ {mensaje}
          </div>
        )}

        <div className="d-flex gap-3 mb-3">
          <button
            type="submit"
            className="btn"
            style={{
              flex: 1,
              background:
                "linear-gradient(135deg, #a8d5a8 0%, #6aaa6a 100%)",
              color: "white",
              fontWeight: "700",
              fontSize: "1.25rem",
              padding: "12px 0",
              borderRadius: "10px",
              boxShadow: "0 6px 12px rgba(106, 170, 106, 0.5)",
              transition: "background 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.background =
                "linear-gradient(135deg, #6aaa6a 0%, #4d8b4d 100%)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background =
                "linear-gradient(135deg, #a8d5a8 0%, #6aaa6a 100%)";
            }}
          >
            {formData.id ? "Actualizar Libro" : "Crear Libro"}
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
              backgroundColor: "#fff9c4", // un amarillo pastel suave para contraste
              color: "#827717",
            }}
            onClick={() => {
              setFormData({
                isbn: "",
                titulo: "",
                autor: "",
                editorial: "",
                stock: 1,
                precio: 0,
                ubicacion: "",
              });
              setOrigen("");
              setDatosCargados(false);
              setSinIsbn(false);
              setIsbnGenerado("");
              actions.setMensaje("");
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#f0f4c3")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#fff9c4")}
          >
            Refrescar
          </button>
        </div>
      </form>
    </div>
  );

};

export default AgregarLibro;