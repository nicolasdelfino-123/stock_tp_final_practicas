import React, { useState, useEffect } from "react";

const AgregarLibro = () => {
  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    editorial: "",
    stock: 1, // Stock predeterminado en 1
    precio: 0,
    ubicacion: "",
  });

  const [mensaje, setMensaje] = useState(""); // Estado para el mensaje de éxito

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setMensaje(""); // ← Esto borra el mensaje al editar
  };

  const handleAutocomplete = async () => {
    const { isbn } = formData;

    if (isbn) {
      try {
        const response = await fetch(
          `http://localhost:5000/libros?isbn=${isbn}`
        );
        const data = await response.json();

        if (response.ok && data.length > 0) {
          const libro = data[0];

          setFormData({
            ...formData,
            autor: libro.autor || "",
            editorial: libro.editorial || "",
            stock: libro.stock || 1, // Si stock es 0, establecer a 1
            precio: libro.precio || 0,
            titulo: libro.titulo || "",
            ubicacion: libro.ubicacion || "",
          });
        } else {
          setFormData({
            isbn: formData.isbn,
            titulo: "",
            autor: "",
            editorial: "",
            stock: 1, // Stock predeterminado en 1 para libros nuevos
            precio: 0,
            ubicacion: "",
          });
        }
      } catch (error) {
        console.error("Error al autocompletar los datos:", error);
        alert("Hubo un error al intentar obtener los datos del libro.");
      }
    }
  };

  useEffect(() => {
    if (!formData.isbn) {
      setFormData({
        isbn: "",
        titulo: "",
        autor: "",
        editorial: "",
        stock: 1, // Stock predeterminado en 1
        precio: 0,
        ubicacion: "",
      });
    } else {
      handleAutocomplete();
    }
  }, [formData.isbn]);

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
      // Revisar si el libro ya existe en el sistema
      const response = await fetch(
        `http://localhost:5000/libros?isbn=${formData.isbn}`
      );
      const data = await response.json();

      if (response.ok && data.length > 0) {
        const libroExistente = data[0];

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
        if (formData.stock !== libroExistente.stock) {
          cambios.push(`stock (${libroExistente.stock} → ${formData.stock})`);
        }
        if (formData.precio !== libroExistente.precio) {
          cambios.push("precio");
        }
        if (formData.ubicacion !== libroExistente.ubicacion) {
          cambios.push("ubicación");
        }

        // Si hay cambios, actualizar el libro en la base de datos
        if (cambios.length > 0) {
          // Aquí realizamos la actualización del libro
          const responseActualizar = await fetch(
            `http://localhost:5000/libros/${libroExistente.id}`,
            {
              method: "PUT", // O PATCH, dependiendo de tu API
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(formData),
            }
          );

          if (responseActualizar.ok) {
            // Mensaje de éxito con los campos que se modificaron
            const mensajeExito = `Libro actualizado con éxito. Campos modificados: ${cambios.join(
              ", "
            )}.`;
            setMensaje(mensajeExito);
          } else {
            const errorData = await responseActualizar.json();
            alert(errorData.error || "Hubo un error al actualizar el libro");
          }
        } else {
          setMensaje("No se realizaron cambios en el libro.");
        }
      } else {
        // Si el libro es nuevo
        const responseCrear = await fetch("http://localhost:5000/libros", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        if (responseCrear.ok) {
          setMensaje(
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
        } else {
          const data = await responseCrear.json();
          alert(data.error || "Hubo un error al crear el libro");
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
            <input
              type="text"
              className="form-control"
              id="isbn"
              name="isbn"
              value={formData.isbn}
              onChange={handleChange}
              required
            />
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
                Crear Libro
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
                  setMensaje(""); // ← Esto borra el mensaje
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
