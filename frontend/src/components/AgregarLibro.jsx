import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../context/appContext";
import { useNavigate } from "react-router-dom";

// Estilos reutilizables para los inputs
const inputStyle = {
  width: "100%",
  padding: "10px 15px",
  borderRadius: "8px",
  border: "1.5px solid #2e7d32",
  backgroundColor: "#e8f5e9",
  color: "black",
  fontWeight: "500",
  fontSize: "1rem",
  boxShadow: "inset 1px 1px 3px rgba(46, 125, 50, 0.15)",
  transition: "border-color 0.3s ease",
}

const AgregarLibro = () => {
  // Obtiene el contexto de la aplicación y la función de navegación
  const { store, actions } = useAppContext();
  const navigate = useNavigate();

  // Estado para los datos del formulario
  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    editorial: "",
    stock: 1,
    precio: 0,
    ubicacion: "",
  });

  // Estados para controlar la creación sin ISBN
  const [sinIsbn, setSinIsbn] = useState(false);
  const [isbnGenerado, setIsbnGenerado] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);
  const [origen, setOrigen] = useState(""); // 'externo', 'local' o 'servidor'
  const [generandoIsbn, setGenerandoIsbn] = useState(false);
  const isbnInputRef = useRef(null);

  // Estados para el autocompletado de editoriales
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [editorialesFiltradas, setEditorialesFiltradas] = useState([]);
  const editorialInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(-1);

  // Referencias para manejar el foco y el modal
  const stockInputRef = useRef(null);
  const modalActivoRef = useRef(false);

  // Mensaje del store
  const mensaje = store.mensaje;

  const handlerFocus = (e) => {

    e.target.style.border = "3px solid #1b4d1b";

    // Limpiar el dataset cuando se hace focus en el input ISBN
    if (e.target.name === "isbn" && e.target.dataset.lastSearched) {
      delete e.target.dataset.lastSearched;
    }

    // Resetear datosCargados solo cuando se hace focus en ISBN y hay datos cargados
    if (e.target.name === "isbn" && datosCargados) {
      setDatosCargados(false);
    }
  };

  const handlerBlur = (e) => {
    e.target.style.border = "1.5px solid #2e7d32";
  }

  const handlerFocusEditorial = (e) => {
    handlerFocus(e);

    if (formData.editorial.trim() !== "" && editorialesFiltradas.length > 0) {
      setMostrarDropdown(true);
    }
  }

  /**
   * Función para mover el foco al siguiente campo del formulario
   * @param {HTMLElement} currentTarget - El elemento actual que dispara el evento
   */
  const moveToNextField = (currentTarget) => {
    const form = currentTarget.form;
    const index = Array.prototype.indexOf.call(form, currentTarget);

    // Saltar campos readonly
    let nextIndex = index + 1;
    while (form.elements[nextIndex] && form.elements[nextIndex].readOnly) {
      nextIndex++;
    }

    const nextElement = form.elements[nextIndex];

    if (nextElement) {
      nextElement.focus();

      // Seleccionar texto en campos editables que lo soporten
      const tag = nextElement.tagName.toLowerCase();
      const isSelectable = (tag === "input" || tag === "textarea") && typeof nextElement.select === "function";

      if (!nextElement.readOnly && isSelectable) {
        setTimeout(() => {
          nextElement.select();
        }, 0);
      }
    }
  };


  /**
  * Maneja el evento keyDown en los inputs del formulario
  * @param {Event} e - Evento del teclado
  */
  const handleInputKeyDown = (e) => {
    // Si el modal está activo, bloqueamos cualquier acción con Enter
    if (modalActivoRef.current && e.key === "Enter") {
      e.preventDefault();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      const fieldName = e.target.name;

      // Casos especiales por campo
      switch (fieldName) {
        case "isbn":
          // Para ISBN, verificar si tiene contenido y si debe hacer búsqueda
          const isbnValue = formData.isbn.trim();

          // CAMBIO 2: Simplificar la condición - solo buscar si hay ISBN, no es generado automáticamente, NO se han cargado datos aún
          if (isbnValue && !sinIsbn && !datosCargados) {
            // Solo buscar si no se ha buscado este valor específico
            if (e.target.dataset.lastSearched !== isbnValue) {
              e.target.dataset.lastSearched = isbnValue;
              handleAutocomplete();
            } else {
              // Si ya se buscó este ISBN, mover al siguiente campo
              moveToNextField(e.target);
            }
          } else {
            // En todos los demás casos, mover al siguiente campo
            moveToNextField(e.target);
          }
          break;

        case "editorial":
          // Si hay una selección en el dropdown, aplicarla
          if (mostrarDropdown && indiceSeleccionado >= 0) {
            const seleccion = editorialesFiltradas[indiceSeleccionado];
            handleEditorialSelect(seleccion);
            setIndiceSeleccionado(-1);
            if (stockInputRef.current) {
              stockInputRef.current.focus();
            }
          } else {
            // Si no hay selección, mover al siguiente campo
            setMostrarDropdown(false);
            moveToNextField(e.target);
          }
          break;

        default:
          // Para todos los demás campos, mover al siguiente
          moveToNextField(e.target);
          break;
      }
    }
  };

  // Función modificada para manejar el blur del ISBN
  const handleIsbnBlur = (e) => {
    handlerBlur(e);
    // Solo hacer autocomplete si no hay datos cargados y no es sin ISBN
    if (formData.isbn && !sinIsbn && !datosCargados) {
      handleAutocomplete();
    }
  };

  // Efecto para cargar editoriales al montar el componente
  useEffect(() => {
    actions.obtenerEditoriales();
  }, []);

  // Efecto para filtrar editoriales cuando cambia el input o las editoriales disponibles
  useEffect(() => {
    if (formData.editorial && store.editoriales) {
      const filtradas = store.editoriales.filter(editorial =>
        editorial.toLowerCase().includes(formData.editorial.toLowerCase())
      );
      setEditorialesFiltradas(filtradas);
    } else {
      setEditorialesFiltradas([]);
    }
  }, [formData.editorial, store.editoriales]);

  // Efecto para cerrar el dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        editorialInputRef.current && !editorialInputRef.current.contains(event.target)) {
        setMostrarDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Limpia los datos del libro excepto el ISBN
   * @param {string} isbnValue - Valor del ISBN a mantener
   */
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

  /**
 * Maneja los cambios en los campos del formulario
 * @param {Event} e - Evento de cambio
 */
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
      // Limpiar el marcador de última búsqueda cuando cambia el ISBN
      if (e.target.dataset.lastSearched) {
        delete e.target.dataset.lastSearched;
      }
    }

    // Si estamos escribiendo en editorial, mostrar dropdown
    if (name === "editorial") {
      setMostrarDropdown(true);
    }
  };
  /**
   * Maneja la selección de una editorial del dropdown
   * @param {string} editorial - Editorial seleccionada
   */
  const handleEditorialSelect = (editorial) => {
    setFormData({
      ...formData,
      editorial: editorial
    });
    setMostrarDropdown(false);
    setIndiceSeleccionado(-1); // Resetear índice de selección
    // No hacer focus automático aquí, dejar que el flujo normal continúe
  };

  /**
   * Función para hacer scroll automático al item seleccionado en el dropdown
   * @param {number} index - Índice del item seleccionado
   */
  const scrollToSelectedItem = (index) => {
    if (dropdownRef.current) {
      const dropdown = dropdownRef.current;
      const selectedItem = dropdown.children[index];
      if (selectedItem) {
        const dropdownRect = dropdown.getBoundingClientRect();
        const itemRect = selectedItem.getBoundingClientRect();

        if (itemRect.bottom > dropdownRect.bottom) {
          dropdown.scrollTop += itemRect.bottom - dropdownRect.bottom;
        } else if (itemRect.top < dropdownRect.top) {
          dropdown.scrollTop -= dropdownRect.top - itemRect.top;
        }
      }
    }
  };

  /**
   * Maneja las teclas especiales en el input de editorial
   * @param {Event} e - Evento del teclado
   */
  const handleEditorialKeyDown = (e) => {
    if (!mostrarDropdown || editorialesFiltradas.length === 0) {
      // Si no hay dropdown activo, usar la función general
      handleInputKeyDown(e);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = indiceSeleccionado < editorialesFiltradas.length - 1 ? indiceSeleccionado + 1 : 0;
      setIndiceSeleccionado(newIndex);
      scrollToSelectedItem(newIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = indiceSeleccionado > 0 ? indiceSeleccionado - 1 : editorialesFiltradas.length - 1;
      setIndiceSeleccionado(newIndex);
      scrollToSelectedItem(newIndex);
    } else if (e.key === "Enter") {
      // Usar la función general que ya maneja el caso de editorial
      handleInputKeyDown(e);
    }
  };

  /**
   * Genera un ISBN automáticamente y lo muestra en el formulario
   */
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
        setSinIsbn(false);
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

  /**
   * Busca y autocompleta los datos del libro basado en el ISBN
   */
  const handleAutocomplete = async () => {
    const { isbn } = formData;

    if (!isbn) return;

    setIsLoading(true);
    setOrigen("");
    actions.setMensaje("🔍 Buscando datos del libro...");

    try {
      const libro = await actions.buscarLibroPorISBN(isbn);

      if (libro) {
        setFormData({
          ...formData,
          titulo: libro.titulo || "",
          autor: libro.autor || "",
          editorial: libro.editorial || "",
          stock: libro.stock || 1,
          precio: libro.precio || 0,
          ubicacion: libro.ubicacion || "",
        });

        const origenDetectado = libro.fuente === "Google Books" ? "externo" : "local";
        setOrigen(origenDetectado);
        setDatosCargados(true);

        // Enfocar título después de un pequeño retraso
        setTimeout(() => {
          const tituloInput = document.getElementById("titulo");
          if (tituloInput) {
            tituloInput.focus();
            tituloInput.select();
          }
        }, 100);

        actions.setMensaje(origenDetectado === "externo"
          ? "✅ Datos obtenidos de Google Books. Puede editar si es necesario."
          : "");
      } else {
        actions.setMensaje("✅ No se encontró información para este ISBN. Puede ingresar los datos manualmente.");
        setOrigen("");
        setDatosCargados(false);
        limpiarDatosLibro(isbn);

        // Enfocar título cuando no se encuentran datos
        setTimeout(() => {
          const tituloInput = document.getElementById("titulo");
          if (tituloInput) tituloInput.focus();
        }, 100);
      }
    } catch (error) {
      console.error("❌ Error al autocompletar los datos:", error);
      actions.setMensaje("❌ Hubo un error al buscar información del libro.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Limpia completamente el formulario
   */
  const limpiarFormularioCompleto = () => {
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
  };

  /**
   * Maneja el envío del formulario
   * @param {Event} e - Evento de submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { isbn, titulo, autor, ubicacion, stock } = formData;

    // Validaciones básicas
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
      // Primero verificamos si el libro existe en NUESTRA base de datos
      let libroExistente = null;
      try {
        const resultadoBusqueda = await actions.buscarLibroPorISBN(formData.isbn);
        // Solo consideramos que existe si viene de nuestra BD local
        if (resultadoBusqueda && resultadoBusqueda.fuente === "Base de datos local") {
          libroExistente = resultadoBusqueda;
        }
      } catch (error) {
        console.log("No se encontró el libro en BD local, continuamos con creación");
      }

      if (libroExistente) {
        // Lógica de actualización
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
            const mensajeExito = `✅ Libro actualizado con éxito. Campos modificados: ${cambios.join(", ")}.`;
            actions.setMensaje(mensajeExito);
            setOrigen("local");
            limpiarFormularioCompleto();

            if (formData.editorial) {
              actions.obtenerEditoriales();
            }
          } else {
            alert(resultado.error || "Hubo un error al actualizar el libro");
          }
        } else {
          actions.setMensaje("✅ No se realizaron cambios en el libro.");
          limpiarFormularioCompleto();
        }
      } else {
        // Creación de nuevo libro
        const resultado = await actions.crearLibro(formData);

        if (resultado.success) {
          actions.setMensaje(
            `✅ Libro creado con éxito con stock de ${formData.stock} unidad(es).`
          );

          if (formData.editorial) {
            actions.obtenerEditoriales();
          }

          // Resetear formulario
          limpiarFormularioCompleto();
        } else {
          alert(resultado.error || "Hubo un error al crear el libro");
        }
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      alert("Hubo un error con la solicitud: " + (error.message || "Intente nuevamente"));
    }
  };

  // Efecto para manejar la tecla Enter cuando hay un mensaje activo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mensaje && e.key === "Enter") {
        // Evitar cerrar el mensaje si es un mensaje de búsqueda
        if (mensaje.startsWith("🔍")) return;

        e.preventDefault();
        e.stopPropagation();
        actions.setMensaje("");

        setTimeout(() => {
          console.log("el modal esta en estado:", modalActivoRef.current)
          modalActivoRef.current = false;
        }, 100);
      }
    };

    if (mensaje && !mensaje.startsWith("🔍")) {
      modalActivoRef.current = true;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mensaje]);

  useEffect(() => {
    if (mensaje) {
      document.body.style.overflow = "hidden";
      // Bloquear interacción con el formulario
      modalActivoRef.current = true;
    } else {
      document.body.style.overflow = "auto";
      // Permitir interacción nuevamente
      modalActivoRef.current = false;
    }

    return () => {
      document.body.style.overflow = "auto";
      modalActivoRef.current = false;
    };
  }, [mensaje]);

  const fondoURL = "/fondo-3.jpg";

  return (
    <>
      {/* Modal de mensaje */}
      {mensaje && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: "300px",
            pointerEvents: "auto"
          }}
          onClick={(e) => {
            if (!e.target.closest('.alert')) {
              e.stopPropagation();
            }
          }}
        >
          <div
            className="alert alert-success"
            role="alert"
            style={{
              maxWidth: "500px",
              width: "90%",
              borderRadius: "12px",
              padding: "25px 30px",
              fontSize: "1.1rem",
              fontWeight: "600",
              backgroundColor: "#d4edda",
              color: "#155724",
              border: "1px solid #c3e6cb",
              boxShadow: "0 10px 20px rgba(0,0,0,0.25)",
              textAlign: "center",
              pointerEvents: "auto"
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              {mensaje}
            </div>
            <button
              type="button"
              className="btn btn-success"
              style={{
                borderRadius: "8px",
                fontWeight: "700",
                padding: "10px 20px",
                fontSize: "1rem",
                backgroundColor: "#28a745",
                border: "none"
              }}
              onClick={() => actions.setMensaje("")}
            >
              Ok
            </button>
          </div>
        </div>
      )}

      {/* Contenedor principal */}
      <div
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${fondoURL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "100vh",
          paddingTop: "10px",
          boxSizing: "border-box",
        }}
      >
        <div
          className="container"
          style={{
            maxWidth: "800px",
            backgroundColor: "#d7f0d7",
            borderRadius: "12px",
            boxShadow: "0 8px 20px rgba(0, 100, 0, 0.1)",
            padding: "30px 25px",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}
        >
          <div className="top-bar">
            <button
              type="button"
              className="back-button"
              onClick={() => navigate("/")}
            >
              Volver al Inicio
            </button>

            <h2 className="page-title">Agregar Libro</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="isbn" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                ISBN:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flexGrow: 1 }}>
                  <input
                    type="text"
                    id="isbn"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleChange}
                    autoFocus
                    required
                    ref={isbnInputRef}
                    onKeyDown={handleInputKeyDown}
                    readOnly={sinIsbn}
                    onFocus={handlerFocus}
                    onBlur={handleIsbnBlur}
                    placeholder={
                      sinIsbn
                        ? "Se generará automáticamente..."
                        : "Ingrese el ISBN y presione Enter o haga clic fuera"
                    }
                    style={{
                      ...inputStyle,
                      backgroundColor: sinIsbn ? "#d7f0d7" : "#e8f5e9",
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "10px" }}>
                  <input
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "2px solid #b0bec5",
                      borderRadius: "4px",
                      accentColor: "#4caf50",
                    }}
                    type="checkbox"
                    id="crearSinIsbn"
                    className="form-check-input"
                    checked={sinIsbn}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        await generarYMostrarIsbn();
                        setSinIsbn(true);
                        setDatosCargados(true);
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
                  <label htmlFor="crearSinIsbn" className="form-check-label small" style={{ color: "black" }}>
                    Crear sin ISBN
                  </label>
                  {generandoIsbn && (
                    <span style={{ marginLeft: "8px" }}>
                      <div className="spinner-border spinner-border-sm" role="status" style={{ color: "#2e7d32" }}>
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
                  : "Ingrese el ISBN y presione Enter para buscar automáticamente"}
              </small>
            </div>

            <div className="row">
              <div className="mb-3 col-12">
                <label htmlFor="titulo" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                  Título:
                </label>
                <input
                  type="text"
                  id="titulo"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  required
                  placeholder="Ingrese el título del libro"
                  onKeyDown={handleInputKeyDown}
                  style={inputStyle}
                  onFocus={handlerFocus}
                  onBlur={handlerBlur}
                />
              </div>

              <div className="mb-3 col-12">
                <label htmlFor="autor" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                  Autor:
                </label>
                <input
                  type="text"
                  id="autor"
                  name="autor"
                  value={formData.autor}
                  onChange={handleChange}
                  required
                  placeholder="Ingrese el autor"
                  onKeyDown={handleInputKeyDown}
                  onFocus={handlerFocus}
                  onBlur={handlerBlur}
                  style={inputStyle}
                />
              </div>

              <div className="mb-3 col-12">
                <label htmlFor="editorial" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                  Editorial:
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    ref={editorialInputRef}
                    type="text"
                    id="editorial"
                    autoComplete="off"
                    name="editorial"
                    value={formData.editorial}
                    onChange={handleChange}
                    placeholder="Ingrese la editorial"
                    onKeyDown={handleEditorialKeyDown}
                    onFocus={handlerFocusEditorial}
                    onBlur={handlerBlur}
                    style={inputStyle}
                  />
                  {mostrarDropdown && editorialesFiltradas.length > 0 && (
                    <div
                      ref={dropdownRef}
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        backgroundColor: "#fff",
                        border: "1px solid #2e7d32",
                        borderRadius: "8px",
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                        zIndex: 1000,
                        maxHeight: "150px",
                        overflowY: "auto",
                      }}
                    >
                      {editorialesFiltradas.map((editorial, index) => (
                        <div
                          key={index}
                          onClick={() => handleEditorialSelect(editorial)}
                          style={{
                            padding: "8px 15px",
                            cursor: "pointer",
                            borderBottom: index < editorialesFiltradas.length - 1 ? "1px solid #eee" : "none",
                            fontSize: "1rem",
                            color: "black",
                            backgroundColor: index === indiceSeleccionado ? "#9bc29c" : "#fff",
                            transition: "background-color 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (index !== indiceSeleccionado) {
                              e.target.style.backgroundColor = "#f5f5f5";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (index !== indiceSeleccionado) {
                              e.target.style.backgroundColor = "#fff";
                            }
                          }}
                        >
                          {editorial}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-3 col-6">
                <label htmlFor="stock" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                  Stock (mínimo 1):
                </label>
                <input
                  type="number"
                  ref={stockInputRef}
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  placeholder="Ingrese la cantidad en stock"
                  min="1"
                  onKeyDown={handleInputKeyDown}
                  style={inputStyle}
                  onFocus={handlerFocus}
                  onBlur={handlerBlur}
                />
              </div>

              <div className="mb-3 col-6">
                <label htmlFor="precio" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                  Precio:
                </label>
                <input
                  type="number"
                  id="precio"
                  name="precio"
                  value={formData.precio}
                  onChange={handleChange}
                  placeholder="Ingrese el precio"
                  onKeyDown={handleInputKeyDown}
                  style={inputStyle}
                  onFocus={handlerFocus}
                  onBlur={handlerBlur}
                />
              </div>

              <div className="mb-3 col-12">
                <label htmlFor="ubicacion" className="form-label" style={{ color: "black", fontWeight: "600" }}>
                  Ubicación:
                </label>
                <input
                  type="text"
                  id="ubicacion"
                  name="ubicacion"
                  value={formData.ubicacion}
                  onChange={handleChange}
                  placeholder="Ingrese la ubicación"
                  onKeyDown={handleInputKeyDown}
                  style={inputStyle}
                  onFocus={handlerFocus}
                  onBlur={handlerBlur}
                />
              </div>
            </div>

            <div className="d-flex gap-3 mb-3">
              <button
                type="submit"
                className="btn"
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #a8d5a8 0%, #6aaa6a 100%)",
                  color: "black",
                  fontWeight: "700",
                  fontSize: "1.25rem",
                  padding: "12px 0",
                  borderRadius: "10px",
                  boxShadow: "0 6px 12px rgba(106, 170, 106, 0.5)",
                  transition: "background 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.border = "3px solid #1b4d1b";
                  e.target.style.boxShadow = "0 0 0 3px rgba(46, 125, 50, 0.5)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "3px solid transparent";
                  e.target.style.boxShadow = "0 6px 12px rgba(106, 170, 106, 0.5)";
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "linear-gradient(135deg, #6aaa6a 0%, #4d8b4d 100%)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "linear-gradient(135deg, #a8d5a8 0%, #6aaa6a 100%)";
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
                  backgroundColor: "#fff933",
                  color: "black",
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
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#c26f3c")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#fff933")}
              >
                Limpiar Pantalla
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default AgregarLibro;