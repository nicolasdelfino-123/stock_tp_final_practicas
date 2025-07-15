import { createContext, useState, useContext, useEffect, useMemo } from "react";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [libros, setLibros] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [editoriales, setEditoriales] = useState([]);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const API_BASE = process.env.REACT_APP_API_BASE;


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


      obtenerEditoriales: async () => {
        try {
          const response = await fetch("http://localhost:5000/api/editoriales"); // o getStore().apiUrl si lo tienes
          const data = await response.json();
    
          if (data.success) {
            setEditoriales(data.editoriales); // actualizo el estado directamente
            return { success: true, editoriales: data.editoriales };
          } else {
            return { success: false, error: data.error };
          }
        } catch (error) {
          console.error("Error al obtener editoriales:", error);
          return { success: false, error: error.message };
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

 

    loginUser: async (username, password) => {
        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                // Guardamos token en localStorage y store
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", data.user);
                setUser(data.user);
                setToken(data.token);

                return { success: true };
            } else {
                return { success: false, error: data.error || "Login fallido" };
            }
        } catch (err) {
            return { success: false, error: "Error de red o servidor" };
        }
    },

    logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setToken(null);
    },

    isAuthenticated: () => {
        const token = localStorage.getItem("token");
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000;
            return Date.now() < exp;
        } catch (e) {
            return false;
        }
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
