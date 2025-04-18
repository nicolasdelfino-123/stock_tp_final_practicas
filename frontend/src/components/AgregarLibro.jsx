import React, { useState, useEffect } from "react";

const AgregarLibro = () => {
  const [formData, setFormData] = useState({
    isbn: "",
    titulo: "",
    autor: "",
    editorial: "",
    stock: 0,
    precio: 0,
    ubicacion: "", // Nuevo campo de ubicación
  });

  // Función para manejar los cambios de los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Función para autocompletar los datos basados en el ISBN o Título
  const handleAutocomplete = async () => {
    const { isbn, titulo } = formData;

    // Realizamos la búsqueda por ISBN o Título
    if (isbn || titulo) {
      try {
        const response = await fetch(
          `http://localhost:5000/libros?isbn=${isbn}&titulo=${titulo}`
        );
        const data = await response.json();

        if (response.ok && data.length > 0) {
          const libro = data[0]; // Suponemos que devolvemos solo un libro

          // Autocompletar los campos
          setFormData({
            ...formData,
            autor: libro.autor,
            editorial: libro.editorial,
            stock: libro.stock,
            precio: libro.precio,
            titulo: libro.titulo, // Agregar el título en caso de que se haya dejado vacío
          });
        }
      } catch (error) {
        console.error("Error al autocompletar los datos:", error);
      }
    }
  };

  // Detectar cambios en ISBN o Título y hacer autocompletado
  useEffect(() => {
    if (formData.isbn || formData.titulo) {
      handleAutocomplete();
    }
  }, [formData.isbn, formData.titulo]); // Se ejecuta cuando cambian los valores de ISBN o Título

  // Función para manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar que todos los campos obligatorios estén presentes
    if (!formData.isbn || !formData.titulo || !formData.autor) {
      alert("Por favor, complete todos los campos obligatorios.");
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
