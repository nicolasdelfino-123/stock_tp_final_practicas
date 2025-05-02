import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/appContext"; // Importamos el contexto

const AgregarLibro = () => {
  const { store, actions } = useAppContext(); // Usamos el contexto

  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    editorial: "",
    stock: 1, // Stock predeterminado en 1
    precio: 0,
    ubicacion: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);
  const [origen, setOrigen] = useState(""); // Para indicar de dónde vienen los datos ("local" o "externo")

  // Usamos el mensaje del contexto
  const mensaje = store.mensaje;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Si cambiamos manualmente el ISBN, reiniciamos el estado de origen
    if (name === "isbn") {
      setOrigen("");
      setDatosCargados(false);
    }

    actions.setMensaje(""); // Borra el mensaje al editar usando el contexto
  };

  const handleAutocomplete = async () => {
    const { isbn } = formData;

    if (!isbn) return; // Verifica que el ISBN tenga al menos 10 caracteres

    setIsLoading(true);
    setOrigen("");

    try {
      // Primero buscamos en nuestra base de datos local
      const libroLocal = await actions.buscarLibroPorISBN(isbn);

      if (libroLocal) {
        // Si encontramos el libro en nuestra BD, usamos esos datos
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
          // Si lo encontramos en fuentes externas, usamos esos datos
          setFormData({
            ...formData,
            titulo: libroExterno.titulo || "",
            autor: libroExterno.autor || "",
            editorial: libroExterno.editorial || "",
            // Mantenemos los valores predeterminados para stock y precio
          });
          setOrigen("externo");
          setDatosCargados(true);
          actions.setMensaje(
            `Datos obtenidos de ${
              libroExterno.fuente || "fuente externa"
            }. Puede editar si es necesario.`
          );
        } else {
          // Si no lo encontramos en ninguna parte
          actions.setMensaje(
            "No se encontró información para este ISBN. Puede ingresar los datos manualmente."
          );
          setOrigen("");
          setDatosCargados(false);
        }
      }
    } catch (error) {
      console.error("Error al autocompletar los datos:", error);
      actions.setMensaje("Hubo un error al buscar información del libro.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resto del componente se mantiene exactamente igual...
  // Cuando el campo ISBN pierde el foco, intentamos autocompletar
  const handleIsbnBlur = () => {
    if (formData.isbn && !datosCargados) {
      handleAutocomplete();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.isbn || !formData.titulo || !formData.autor) {
      alert("Por favor, complete todos los campos obligatorios.");
      return;
    }

    // Verificar que el stock no sea menor que 1
    if (formData.stock < 1) {
      alert("El stock debe ser de al menos 1 unidad.");
      return;
    }

    if (formData.precio < 0) {
      alert("El precio no puede ser negativo.");
      return;
    }

    try {
      // Revisar si el libro ya existe en el sistema usando el contexto
      const libroExistente = await actions.buscarLibroPorISBN(formData.isbn);

      if (libroExistente) {
        // Comparamos campos solo para mostrar mensaje
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

        // Si hay cambios, actualizar el libro en la base de datos
        if (cambios.length > 0) {
          // Aquí realizamos la actualización del libro usando el contexto
          const resultado = await actions.actualizarLibro(
            libroExistente.id,
            formData
          );

          if (resultado.success) {
            // Mensaje de éxito con los campos que se modificaron
            const mensajeExito = `Libro actualizado con éxito. Campos modificados: ${cambios.join(
              ", "
            )}.`;
            actions.setMensaje(mensajeExito);
            setOrigen("local"); // Ahora el libro está en la BD local
          } else {
            alert(resultado.error || "Hubo un error al actualizar el libro");
          }
        } else {
          actions.setMensaje("No se realizaron cambios en el libro.");
        }
      } else {
        // Si el libro es nuevo, usamos el contexto
        const resultado = await actions.crearLibro(formData);

        if (resultado.success) {
          actions.setMensaje(
            `Libro creado con éxito con stock de ${formData.stock} unidad(es).`
          );
          setFormData({
            isbn: "",
            titulo: "",
            autor: "",
            editorial: "",
            stock: 1, // Restablecer a 1 después de crear
            precio: 0,
            ubicacion: "",
          });
          setOrigen("");
          setDatosCargados(false);
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
    <div className="container mt-5">
      <div className="card shadow-lg p-4">
        <h2 className="mb-4 text-center">Crear Nuevo Libro</h2>
        {mensaje && <div className="alert alert-info">{mensaje}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="isbn" className="form-label">
              ISBN:
            </label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                id="isbn"
                name="isbn"
                value={formData.isbn}
                onChange={handleChange}
                onBlur={handleIsbnBlur}
                required
              />
              {isLoading && (
                <span className="input-group-text">
                  <div
                    className="spinner-border spinner-border-sm"
                    role="status"
                  >
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </span>
              )}
              {!isLoading && origen && (
                <span
                  className={`input-group-text ${
                    origen === "local"
                      ? "bg-success text-white"
                      : "bg-info text-white"
                  }`}
                >
                  {origen === "local" ? "BD Local" : "API Externa"}
                </span>
              )}
            </div>
            <small className="text-muted">
              Al ingresar el ISBN, se intentará autocompletar la información del
              libro.
            </small>
          </div>

          <div className="mb-3">
            <label htmlFor="titulo" className="form-label">
              Título:
            </label>
            <input
              type="text"
              className="form-control"
              id="titulo"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="autor" className="form-label">
              Autor:
            </label>
            <input
              type="text"
              className="form-control"
              id="autor"
              name="autor"
              value={formData.autor}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="editorial" className="form-label">
              Editorial:
            </label>
            <input
              type="text"
              className="form-control"
              id="editorial"
              name="editorial"
              value={formData.editorial}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="stock" className="form-label">
              Stock (mínimo 1):
            </label>
            <input
              type="number"
              className="form-control"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              min="1"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="precio" className="form-label">
              Precio:
            </label>
            <input
              type="number"
              className="form-control"
              id="precio"
              name="precio"
              value={formData.precio}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="ubicacion" className="form-label">
              Ubicación:
            </label>
            <input
              type="text"
              className="form-control"
              id="ubicacion"
              name="ubicacion"
              value={formData.ubicacion}
              onChange={handleChange}
            />
          </div>

          <div className="row mt-4">
            <div className="col-9">
              <button type="submit" className="btn btn-primary btn-lg w-100">
                {formData.id ? "Actualizar Libro" : "Crear Libro"}
              </button>
            </div>
            <div className="col-3">
              <button
                type="button"
                className="btn btn-warning btn-lg w-100"
                onClick={() => {
                  setFormData({
                    isbn: "",
                    titulo: "",
                    autor: "",
                    editorial: "",
                    stock: 1, // Restablecer a 1
                    precio: 0,
                    ubicacion: "",
                  });
                  setOrigen("");
                  setDatosCargados(false);
                  actions.setMensaje(""); // Borrar mensaje usando el contexto
                }}
              >
                Refrescar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgregarLibro;
