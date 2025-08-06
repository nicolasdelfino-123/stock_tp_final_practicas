import { createContext, useState, useContext, useEffect, useMemo } from "react";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [libros, setLibros] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [editoriales, setEditoriales] = useState([]);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  // Inicializar datos desde localStorage al cargar la aplicación
  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        // Verificar si el token no ha expirado
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          const exp = payload.exp * 1000;

          if (Date.now() < exp) {
            setToken(storedToken);
            setUser(storedUser);
          } else {
            // Token expirado, limpiar localStorage
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        } catch (e) {
          // Token inválido, limpiar localStorage
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const actions = useMemo(
    () => ({
      fetchLibros: async () => {
        try {
          const response = await fetch(`${API_BASE}/libros`);
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
          const response = await fetch(`${API_BASE}/api/editoriales`);
          const data = await response.json();

          if (data.success) {
            setEditoriales(data.editoriales);
            return { success: true, editoriales: data.editoriales };
          } else {
            return { success: false, error: data.error };
          }
        } catch (error) {
          console.error("Error al obtener editoriales:", error);
          return { success: false, error: error.message };
        }
      },



      generarIsbnAutomatico: async () => {
        try {
          const response = await fetch(`${API_BASE}/generar-isbn`, {
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
          const response = await fetch(`${API_BASE}/libros/${id}`, {
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
          const response = await fetch(`${API_BASE}/libros`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });

          if (response.ok) {
            const data = await response.json();
            await actions.fetchLibros();
            return { success: true, libro: data.libro || null };
          } else {
            const errorData = await response.json();
            return {
              success: false,
              error: errorData.error || "Error al crear libro",
            };
          }
        } catch (error) {
          console.error("Error en la solicitud de creación:", error);
          return {
            success: false,
            error: error.message || "Error de conexión al crear libro"
          };
        }
      },

      setMensaje: (msg) => {
        setMensaje(msg);
      },

      loginUser: async (username, password) => {
        try {
          console.log("Intentando login con:", { username, API_BASE });

          const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
          });

          console.log("Respuesta del servidor:", res.status);

          const data = await res.json();
          console.log("Datos recibidos:", data);

          if (res.ok) {
            // Guardamos token en localStorage y store
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", data.user);
            setUser(data.user);
            setToken(data.token);

            // Forzar una actualización del estado
            setIsLoading(false);

            return { success: true, user: data.user };
          } else {
            return { success: false, error: data.error || "Login fallido" };
          }
        } catch (err) {
          console.error("Error en loginUser:", err);
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
          const response = await fetch(`${API_BASE}/bajar-libro/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cantidad }),
          });

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


      getFaltantes: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/faltantes`);
      if (res.ok) {
        const data = await res.json();
        return { success: true, faltantes: data };
      }
      return { success: false, error: "Error cargando faltantes" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  crearFaltante: async (descripcion) => {
    try {
      const res = await fetch(`${API_BASE}/api/faltantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion }),
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, faltante: data.faltante };
      }
      const errorData = await res.json();
      return { success: false, error: errorData.error || "Error creando faltante" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  limpiarFaltantes: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/faltantes`, {
        method: "DELETE",
      });
      if (res.ok) {
        return { success: true };
      }
      const errorData = await res.json();
      return { success: false, error: errorData.error || "Error limpiando faltantes" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

editarFaltante: async (id, descripcion) => {
  try {
    const res = await fetch(`${API_BASE}/api/faltantes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ descripcion }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return { success: false, error: errorData.message || "Error al editar" };
    }

    const data = await res.json();
    return { success: true, faltante: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
},

eliminarFaltante: async (id) => {
  try {
    const res = await fetch(`${API_BASE}/api/faltantes/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errorData = await res.json();
      return { success: false, error: errorData.message || "Error al eliminar" };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
},

// Actions para agregar a tu contexto existente (sin const ni export)

crearPedido: async (pedidoData) => {
  try {
    const response = await fetch(`${API_BASE}/api/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_nombre: pedidoData.nombreCliente,
        titulo: pedidoData.tituloLibro,
        autor: pedidoData.autorLibro,
        cantidad: pedidoData.cantidad,
        fecha: pedidoData.fecha,
        seña: pedidoData.seña || 0 // Agregar campo seña si es necesario
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, pedido: data.pedido };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.error || "Error al crear pedido" };
    }
  } catch (error) {
    console.error("Error al crear pedido:", error);
    return { success: false, error: error.message };
  }
},

obtenerPedidos: async () => {
  try {
    const res = await fetch(`${API_BASE}/api/pedidos`);
    if (res.ok) {
      const data = await res.json();
      return { success: true, pedidos: data };
    }
    const errorData = await res.json();
    return { success: false, error: errorData.error || "Error al obtener pedidos" };
  } catch (error) {
    return { success: false, error: error.message };
  }
},

eliminarPedido: async (id) => {
  try {
    const res = await fetch(`${API_BASE}/api/pedidos/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      return { success: true };
    } else {
      const errorData = await res.json();
      return { success: false, error: errorData.error || "Error al eliminar pedido" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
},




      buscarLibroPorISBN: async (isbn) => {
        if (!isbn) return null;

        const isbnLimpio = isbn.replace(/-/g, "");
        console.log("🔍 Buscando libro por ISBN:", isbnLimpio);

        // Paso 1: buscar en tu base de datos local
        try {
          const response = await fetch(`${API_BASE}/libros?isbn=${isbnLimpio}`);
          const data = await response.json();

          if (response.ok && data.length > 0) {
            console.log("✅ Libro encontrado en BD local:", data[0]);
            return {
              ...data[0],
              fuente: "Base de datos local",
            };
          }
          // Si no hay datos, continuamos con Google Books
        } catch (error) {
          console.error("⚠️ Error consultando BD local:", error);
        }

        // Resto del código permanece igual...
        // Paso 2: buscar en Google Books si no está en la base local
        try {
          console.log("📚 Buscando en Google Books...");
          const googleResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnLimpio}`);
          const googleData = await googleResponse.json();

          if (googleData.items && googleData.items.length > 0) {
            const libro = googleData.items[0].volumeInfo;
            console.log("✅ Datos obtenidos de Google Books:", libro);

            return {
              titulo: libro.title || "",
              autor: libro.authors ? libro.authors.join(", ") : "Desconocido",
              editorial: libro.publisher || "Desconocida",
              precio: googleData.items[0].saleInfo?.listPrice?.amount || 0,
              fuente: "Google Books",
            };
          }
        } catch (error) {
          console.error("⚠️ Error al buscar en Google Books:", error);
        }

        return null;
      },
    }),
    [API_BASE]);

  useEffect(() => {
    if (token) {
      actions.fetchLibros();
    }
  }, [token, actions]);


  const store = {
    libros,
    mensaje,
    editoriales,
    user,
    token,
    isLoading,
  };

  return (
    <AppContext.Provider value={{ store, actions }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);