import React, { useState, useEffect } from "react";

const AgregarLibro = () => {
  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    editorial: "",
    stock: 0,
    precio: 0,
    ubicacion: "",
  });

  // Función para manejar los cambios de los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Función para autocompletar los datos basados en el ISBN
  const handleAutocomplete = async () => {
    const { isbn } = formData;

    // Realizamos la búsqueda por ISBN
    if (isbn) {
      try {
        const response = await fetch(
          `http://localhost:5000/libros?isbn=${isbn}`
        );
        const data = await response.json();

        if (response.ok && data.length > 0) {
          const libro = data[0]; // Suponemos que devolvemos solo un libro

          // Autocompletar los campos
          setFormData({
            ...formData,
            autor: libro.autor || "", // Validación de autor
            editorial: libro.editorial || "", // Validación de editorial
            stock: libro.stock || 0, // Validación de stock
            precio: libro.precio || 0, // Validación de precio
            titulo: libro.titulo || "", // Validación de título
            ubicacion: libro.ubicacion || "", // Validación de ubicación
          });
        } else {
          // Si no hay libro con ese ISBN, limpiar los campos para un nuevo libro
          setFormData({
            isbn: formData.isbn,
            titulo: "",
            autor: "",
            editorial: "",
            stock: 0,
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

  // Detectar el cambio del ISBN y hacer autocompletado
  useEffect(() => {
    // Si el ISBN está vacío, resetear los campos
    if (!formData.isbn) {
      setFormData({
        isbn: "",
        titulo: "",
        autor: "",
        editorial: "",
        stock: 0,
        precio: 0,
        ubicacion: "",
      });
    } else {
      handleAutocomplete(); // Si el ISBN tiene valor, autocompletar
    }
  }, [formData.isbn]); // Solo se ejecuta cuando cambia el ISBN

  // Función para manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar que todos los campos obligatorios estén presentes
    if (!formData.isbn || !formData.titulo || !formData.autor) {
      alert("Por favor, complete todos los campos obligatorios.");
      return;
    }

    // Validaciones adicionales para los campos numéricos
    if (formData.stock < 0 || formData.precio < 0) {
      alert("El stock y el precio no pueden ser negativos.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/libros", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Libro creado con éxito");
        setFormData({
          isbn: "",
          titulo: "",
          autor: "",
          editorial: "",
          stock: 0,
          precio: 0,
          ubicacion: "", // Reseteamos el campo de ubicación
        });
      } else {
        const data = await response.json();
        alert(data.error || "Hubo un error al crear el libro");
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
              Stock:
            </label>
            <input
              type="number"
              className="form-control"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
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

          <div className="d-grid gap-2">
            <button type="submit" className="btn btn-primary btn-lg">
              Crear Libro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgregarLibro;
