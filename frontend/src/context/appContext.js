import { createContext, useState, useContext, useEffect } from "react";

// Creamos el contexto
export const AppContext = createContext();

// Proveedor del contexto
export const AppProvider = ({ children }) => {
  // Estado global (store)
  const [libros, setLibros] = useState([]);
  const [mensaje, setMensaje] = useState("");

  // Cargar libros al iniciar
  useEffect(() => {
    actions.fetchLibros();
  }, []);

  // Acciones (actions)
  const store = {
    libros,
    mensaje,
  };

  const actions = {
    // Cargar todos los libros
    fetchLibros: async () => {
      try {
        const response = await fetch("http://localhost:5000/libros");
        if (response.ok) {
          const data = await response.json();
          setLibros(data);
        }
      } catch (error) {
        console.error("Error al cargar libros:", error);
      }
    },

    // Buscar libro por ISBN
    buscarLibroPorISBN: async (isbn) => {
      if (!isbn) return null;

      try {
        const response = await fetch(
          `http://localhost:5000/libros?isbn=${isbn}`
        );
        const data = await response.json();

        if (response.ok && data.length > 0) {
          return data[0];
        }
        return null;
      } catch (error) {
        console.error("Error al buscar libro por ISBN:", error);
        return null;
      }
    },

    // Actualizar libro existente
    actualizarLibro: async (id, formData) => {
      try {
        const response = await fetch(`http://localhost:5000/libros/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          // Actualizar la lista de libros
          actions.fetchLibros();
          return { success: true };
        } else {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.error || "Error al actualizar libro",
          };
        }
      } catch (error) {
        console.error("Error en la solicitud de actualización:", error);
        return { success: false, error: error.message };
      }
    },

    // Crear nuevo libro
    crearLibro: async (formData) => {
      try {
        const response = await fetch("http://localhost:5000/libros", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          // Actualizar la lista de libros
          actions.fetchLibros();
          return { success: true };
        } else {
          const data = await response.json();
          return {
            success: false,
            error: data.error || "Error al crear libro",
          };
        }
      } catch (error) {
        console.error("Error en la solicitud de creación:", error);
        return { success: false, error: error.message };
      }
    },

    // Establecer mensaje
    setMensaje: (msg) => {
      setMensaje(msg);
    },
  };

  return (
    <AppContext.Provider value={{ store, actions }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook personalizado para facilitar el uso del contexto
export const useAppContext = () => useContext(AppContext);
