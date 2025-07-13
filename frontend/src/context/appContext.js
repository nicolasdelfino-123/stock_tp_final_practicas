import { createContext, useState, useContext, useEffect, useMemo } from "react";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [libros, setLibros] = useState([]);
  const [mensaje, setMensaje] = useState("");

  // Función para buscar en librerías argentinas usando nuestro backend
  const buscarEnLibreriasArgentinas = async (isbn) => {
    try {
      const [cuspide, santafe, tematika] = await Promise.allSettled([
        buscarEnCuspide(isbn),
        buscarEnSantaFe(isbn),
        buscarEnTematika(isbn),
      ]);

      if (cuspide.status === "fulfilled" && cuspide.value) {
        console.log("DATOS TRAIDOS DE CUSPIDE:", cuspide.value);
        return cuspide.value;
      }
      if (santafe.status === "fulfilled" && santafe.value) {
        console.log("DATOS TRAIDOS DE SANTAFE:", santafe.value);
        return santafe.value;
      }
      if (tematika.status === "fulfilled" && tematika.value) {
        console.log("DATOS TRAIDOS DE TEMATIKA:", tematika.value);
        return tematika.value;
      }

      return null;
    } catch (error) {
      console.error("ERROR AL BUSCAR EN LIBRERÍAS ARGENTINAS:", error);
      return null;
    }
  };

  const buscarEnCuspide = async (isbn) => {
    try {
      const response = await fetch(`http://localhost:5001/api/cuspide/${isbn}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("ERROR AL BUSCAR EN CÚSPIDE:", error);
      return null;
    }
  };

  const buscarEnSantaFe = async (isbn) => {
    try {
      const response = await fetch(`http://localhost:5001/api/santafe/${isbn}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("ERROR AL BUSCAR EN SANTA FE:", error);
      return null;
    }
  };

  const buscarEnTematika = async (isbn) => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/tematika/${isbn}`
      );
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("ERROR AL BUSCAR EN TEMATIKA:", error);
      return null;
    }
  };

  const actions = useMemo(
    () => ({
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

      buscarLibroPorISBN: async (isbn) => {
        if (!isbn) return null;
        try {
          const response = await fetch(
            `http://localhost:5000/libros?isbn=${isbn}`
          );
          const data = await response.json();
          if (response.ok && data.length > 0) {
            console.log("LIBRO ENCONTRADO EN BD LOCAL:", data[0]);
            return data[0];
          }
          console.log("LIBRO NO ENCONTRADO EN BD LOCAL");
          return null;
        } catch (error) {
          console.error("Error al buscar libro por ISBN:", error);
          return null;
        }
      },

      generarIsbnAutomatico: async () => {
        try {
          const response = await fetch("http://127.0.0.1:5000/generar-isbn", {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
      
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
      
          const data = await response.json();
      
          if (data.error) {
            throw new Error(data.error);
          }
      
          return {
            success: true,
            isbn: data.isbn,
          };
        } catch (error) {
          console.error("Error al generar ISBN desde servidor:", error);
          return {
            success: false,
            error: "No se pudo conectar al backend para generar ISBN."
          };
        }
      },
      

      actualizarLibro: async (id, formData) => {
        try {
          const response = await fetch(`http://localhost:5000/libros/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });

          if (response.ok) {
            await actions.fetchLibros();
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

      crearLibro: async (formData) => {
        try {
          const response = await fetch("http://localhost:5000/libros", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });

          if (response.ok) {
            await actions.fetchLibros();
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

      setMensaje: (msg) => {
        setMensaje(msg);
      },

      bajarStockLibro: async (id, cantidad) => {
        try {
          const response = await fetch(
            `http://localhost:5000/bajar-libro/${id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cantidad }),
            }
          );

          const data = await response.json();

          if (response.ok) {
            await actions.fetchLibros();
            return {
              success: true,
              ubicacion: data.ubicacion || "",
            };
          } else {
            return {
              success: false,
              error: data.error || "Error al bajar el stock",
            };
          }
        } catch (error) {
          console.error("Error en la solicitud:", error);
          return { success: false, error: error.message };
        }
      },

      buscarEnLibrerias: async (isbn) => {
        try {
          const fuentes = ["cuspide", "santafe", "tematika"];
          const resultados = [];

          for (let fuente of fuentes) {
            const res = await fetch(
              `http://localhost:5001/api/${fuente}/${isbn}`
            );
            if (res.ok) {
              const data = await res.json();
              resultados.push(data);
            }
          }

          return resultados;
        } catch (error) {
          console.error("Error al buscar en librerías:", error);
          return [];
        }
      },

      buscarLibroExterno: async (isbn) => {
        const isbnLimpio = isbn.replace(/-/g, "");
        console.log("BUSCANDO LIBRO EXTERNO CON ISBN:", isbnLimpio);

        // PRIMERO verificamos si está en la base de datos local
        console.log("BUSCANDO PRIMERO EN BD LOCAL...");
        const libroLocal = await actions.buscarLibroPorISBN(isbnLimpio);

        if (libroLocal) {
          console.log("LIBRO ENCONTRADO EN BD LOCAL:", libroLocal);
          return {
            ...libroLocal,
            fuente: "Base de datos local",
          };
        }

        // Si no está localmente, buscamos en APIs externas
        console.log("INTENTANDO CON LIBRERÍAS ARGENTINAS...");
        const resultadoLocal = await buscarEnLibreriasArgentinas(isbnLimpio);
        if (resultadoLocal && !resultadoLocal.error) {
          console.log(
            "DATOS OBTENIDOS DE:",
            resultadoLocal.fuente,
            resultadoLocal
          );
          return resultadoLocal;
        }

        console.log("INTENTANDO CON GOOGLE BOOKS...");
        try {
          const googleResponse = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnLimpio}`
          );
          const googleData = await googleResponse.json();

          if (googleData.items && googleData.items.length > 0) {
            const libro = googleData.items[0].volumeInfo;
            console.log("DATOS OBTENIDOS DE GOOGLE BOOKS:", libro);
            return {
              titulo: libro.title || "",
              autor: libro.authors ? libro.authors.join(", ") : "Desconocido",
              editorial: libro.publisher || "Desconocida",
              precio: libro.saleInfo?.listPrice?.amount || 0,
              fuente: "Google Books",
            };
          }
        } catch (error) {
          console.error("Error al buscar en Google Books:", error);
        }

        console.log("NO SE ENCONTRÓ EL LIBRO EN NINGUNA FUENTE");
        return null;
      },
    }),
    []
  );

  useEffect(() => {
    actions.fetchLibros();
  }, [actions]);

  const store = {
    libros,
    mensaje,
  };

  return (
    <AppContext.Provider value={{ store, actions }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
