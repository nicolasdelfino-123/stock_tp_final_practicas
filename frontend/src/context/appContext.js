import { createContext, useState, useContext, useEffect, useMemo } from "react";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [libros, setLibros] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [editoriales, setEditoriales] = useState([]);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [librosDadosBaja, setLibrosDadosBaja] = useState([]);
  const [ultimaCantidadBajada, setUltimaCantidadBajada] = useState(null);
  const [modalPedidosAbierto, setModalPedidosAbierto] = useState(false);

  // --- ESTADO CAJA ---
  const [turnoActual, setTurnoActual] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [denominacionesInicio, setDenominacionesInicio] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [arqueos, setArqueos] = useState([]);
  const [resumenTurno, setResumenTurno] = useState(null);
  const [auditoria, setAuditoria] = useState([]);
  // --- FIN ESTADO CAJA ---


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


      // Obtener faltantes activos (no eliminados)
      getFaltantes: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/faltantes`);
          if (res.ok) {
            const data = await res.json();
            return { success: true, faltantes: data };
          }
          const errorData = await res.json();
          return { success: false, error: errorData.error || "Error al obtener faltantes" };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      // Crear un faltante nuevo
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
          return { success: false, error: errorData.error || "Error al crear faltante" };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      // Editar un faltante existente
      editarFaltante: async (id, descripcion) => {
        try {
          const res = await fetch(`${API_BASE}/api/faltantes/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descripcion }),
          });
          if (res.ok) {
            const data = await res.json();
            return { success: true, faltante: data.faltante };
          }
          const errorData = await res.json();
          return { success: false, error: errorData.error || "Error al editar faltante" };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      // Borrado lógico: marcar faltante como eliminado
      eliminarFaltante: async (id) => {
        try {
          const res = await fetch(`${API_BASE}/api/faltantes/${id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            return { success: true };
          }
          const errorData = await res.json();
          return { success: false, error: errorData.error || "Error al eliminar faltante" };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      // Obtener faltantes eliminados (para listar y recuperar)
      obtenerFaltantesEliminados: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/faltantes/eliminados`);
          if (res.ok) {
            const data = await res.json();
            return { success: true, faltantesEliminados: data };
          }
          const errorData = await res.json();
          return { success: false, error: errorData.error || "Error al obtener faltantes eliminados" };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      // Recuperar un faltante eliminado (borrado lógico inverso)
      recuperarFaltante: async (id) => {
        try {
          const res = await fetch(`${API_BASE}/api/faltantes/recuperar/${id}`, {
            method: "PUT",
          });
          if (res.ok) {
            const data = await res.json();
            return { success: true, faltante: data.faltante };
          }
          const errorData = await res.json();
          return { success: false, error: errorData.error || "Error al recuperar faltante" };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      // Limpiar todo — ojo, deberías decidir si limpiar también solo los activos o todos (activos + eliminados)
      limpiarFaltantes: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/faltantes`, {
            method: "DELETE",
          });
          if (res.ok) {
            return { success: true };
          }
          const errorData = await res.json();
          return { success: false, error: errorData.error || "Error al limpiar faltantes" };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },


      // Actions para agregar a tu contexto existente (sin const ni export)

      crearPedido: async (pedidoData) => {
        try {
          console.log("Datos que se envían al backend:", pedidoData);

          const response = await fetch(`${API_BASE}/api/pedidos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cliente_nombre: pedidoData.nombreCliente,
              telefonoCliente: pedidoData.telefonoCliente || "",
              titulo: pedidoData.tituloLibro,
              autor: pedidoData.autorLibro,
              editorial: pedidoData.editorial || "",
              cantidad: pedidoData.cantidad,
              fecha: pedidoData.fecha,
              seña: pedidoData.seña || 0,
              comentario: pedidoData.comentario || "",
              isbn: pedidoData.isbn || "",
              estado: pedidoData.estado || "",
              motivo: pedidoData.motivo || ""
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

      obtenerPedidos: async (incluirOcultos = false) => {
        try {
          const url = `${API_BASE}/api/pedidos?include_ocultos=${incluirOcultos ? 1 : 0}`;
          const res = await fetch(url);

          if (res.ok) {
            const data = await res.json();
            console.log("Datos recibidos del backend:", data);
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

      actualizarPedido: async (id, pedidoActualizado) => {
        try {
          const res = await fetch(`${API_BASE}/api/pedidos/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              cliente_nombre: pedidoActualizado.nombreCliente,
              titulo: pedidoActualizado.tituloLibro,
              telefonoCliente: pedidoActualizado.telefonoCliente || "",
              autor: pedidoActualizado.autorLibro,
              editorial: pedidoActualizado.editorial || "",
              cantidad: pedidoActualizado.cantidad,
              fecha: pedidoActualizado.fecha,
              seña: pedidoActualizado.seña || 0,
              comentario: pedidoActualizado.comentario || "",
              isbn: pedidoActualizado.isbn || "",
              // ⬇️ NUEVO (permite enviar fecha o null; si no está, no la manda)
              fecha_viene: pedidoActualizado.fecha_viene || undefined,
              estado: pedidoActualizado.estado || "",
              motivo: pedidoActualizado.motivo || "",
              oculto: typeof pedidoActualizado.oculto === "boolean" ? pedidoActualizado.oculto : undefined
            })
          });

          if (res.ok) {
            const data = await res.json();
            return { success: true, mensaje: data.mensaje };
          } else {
            const errorData = await res.json();
            return { success: false, error: errorData.error || "Error al actualizar pedido" };
          }
        } catch (error) {
          return { success: false, error: error.message };
        }
      },



      ocultarPedidos: async (ids) => {
        try {
          const res = await fetch(`${API_BASE}/api/pedidos/ocultar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids })
          });

          if (res.ok) {
            return { success: true };
          } else {
            const errorData = await res.json();
            return { success: false, error: errorData.error || "Error al ocultar pedidos" };
          }
        } catch (error) {
          return { success: false, error: error.message };
        }
      },



      // Reemplaza estas funciones en tu flux.js existente:

      // Función corregida para bajar stock (mantiene tu endpoint actual)
      bajarStockLibro: async (id, cantidad) => {
        try {
          console.log(`Bajando stock del libro ${id}, cantidad: ${cantidad}`);
          const response = await fetch(`${API_BASE}/bajar-libro/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cantidad: parseInt(cantidad, 10) }),
          });

          const data = await response.json();

          if (response.ok) {
            // Guardar la cantidad bajada para usar después
            setUltimaCantidadBajada(cantidad);
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

      // Reemplaza SOLO esta función en flux.js
      marcarBaja: async (libroId, cantidadForzada) => {
        try {
          console.log("marcarBaja llamada con libroId:", libroId, "cantidadForzada:", cantidadForzada);

          // 1) Prioriza la cantidad que viene del componente (evita closure stale).
          // 2) Si no viene, usa la última guardada en el estado.
          // 3) Último recurso: 1.
          const cantidadAEnviar = Number.isFinite(Number(cantidadForzada)) && Number(cantidadForzada) > 0
            ? Number(cantidadForzada)
            : (ultimaCantidadBajada ?? 1);

          const resp = await fetch(`${API_BASE}/libros/${libroId}/marcar-baja`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cantidad: cantidadAEnviar })
          });

          console.log(`Respuesta marcarBaja status: ${resp.status}`);

          if (!resp.ok) {
            const errorText = await resp.text();
            console.error("Error al marcar baja - cuerpo de error:", errorText);
            throw new Error("Error al marcar baja");
          }

          const data = await resp.json();
          console.log("Libro marcado como baja (data recibida):", data);
          const fechaBaja = data.fecha_baja || data?.movimiento?.fecha_baja || data?.libro?.fecha_baja || null;

          // Limpio la cantidad guardada tras usarla
          setUltimaCantidadBajada(null);

          return { ...data, fecha_baja: fechaBaja };
        } catch (error) {
          console.error("Error en marcarBaja:", error);
          throw error;
        }
      },


      // Función getLibrosDadosBaja sin cambios (ya estaba bien)
      getLibrosDadosBaja: async () => {
        try {
          const resp = await fetch(`${API_BASE}/libros/dados-baja`);

          console.log(`Respuesta getLibrosDadosBaja status: ${resp.status}`);

          if (!resp.ok) {
            const errorText = await resp.text();
            console.error("Error al obtener libros dados de baja - cuerpo de error:", errorText);
            throw new Error("Error al obtener libros dados de baja");
          }

          const data = await resp.json();
          console.log("Libros dados de baja recibidos:", data);
          setLibrosDadosBaja(data);
          return data;
        } catch (error) {
          console.error("Error en getLibrosDadosBaja:", error);
          throw error;
        }
      },

      /* ACCIONES CAJA */

      // ===========================
      // USUARIOS (bcrypt + JWT caja)
      // ===========================
      usuariosRegister: async (username, password, rol = "EMPLEADO") => {
        try {
          const res = await fetch(`${API_BASE}/api/usuarios/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, rol }),
          });
          const data = await res.json();
          if (res.ok) return { success: true, user: data };
          return { success: false, error: data.error || "No se pudo registrar" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      usuariosLogin: async (username, password) => {
        try {
          const res = await fetch(`${API_BASE}/api/usuarios/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });
          const data = await res.json();
          if (res.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", data.user);
            setUser(data.user);
            setToken(data.token);
            setIsLoading(false);
            return { success: true, user: data.user, rol: data.rol };
          }
          return { success: false, error: data.error || "Login inválido" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      usuariosMe: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/usuarios/me`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) return { success: true, me: data };
          return { success: false, error: data.error || "No se pudo validar" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      usuariosListar: async (soloActivos = false) => {
        try {
          const url = `${API_BASE}/api/usuarios${soloActivos ? "?activos=1" : ""}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) return { success: true, usuarios: data };
          return { success: false, error: data.error || "No se pudo listar usuarios" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      usuariosDetalle: async (userId) => {
        try {
          const res = await fetch(`${API_BASE}/api/usuarios/${userId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) return { success: true, usuario: data };
          return { success: false, error: data.error || "No se pudo obtener usuario" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      usuariosActualizar: async (userId, payload) => {
        try {
          const res = await fetch(`${API_BASE}/api/usuarios/${userId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || token || ""}`,
            },
            body: JSON.stringify(payload),
          });
          if (res.ok) return { success: true };
          const data = await res.json();
          return { success: false, error: data.error || "No se pudo actualizar" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      usuariosEliminar: async (userId) => {
        try {
          const res = await fetch(`${API_BASE}/api/usuarios/${userId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          if (res.ok) return { success: true };
          const data = await res.json();
          return { success: false, error: data.error || "No se pudo desactivar usuario" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      // ======================
      // CAJA - helpers locales
      // ======================
      _mapMetodoUItoEnum: (metodo) => {
        const m = (metodo || "").toString().toLowerCase();
        if (m.includes("efectivo")) return "EFECTIVO";
        if (m.includes("bancaria")) return "TRANSF_BANCARIA";
        if (m.includes("mercado")) return "TRANSF_MP";
        if (m.includes("débito") || m.includes("debito")) return "DEBITO";
        if (m.includes("crédito") || m.includes("credito")) return "CREDITO";
        return "OTRO";
      },
      _mapTipoUItoEnum: (tipo) => {
        const t = (tipo || "").toString().toLowerCase();
        if (t.includes("venta")) return "VENTA";
        if (t.includes("salida")) return "SALIDA";
        if (t.includes("ajuste")) return "AJUSTE";
        if (t.includes("anul")) return "ANULACION";
        return "VENTA";
      },





      // ======================
      // CAJA - TURNOS
      // ======================

      // POST /api/caja/usuarios/bootstrap
      cajaUsuariosBootstrap: async (payload) => {
        try {
          // Soporta AMBOS formatos:
          // A) { flor:{username,password}, ... ricardo_admin:{username,password} }
          // B) { florPin,yaniPin,nicoPin,ricPin,ricAdminPass }  (lo transformamos)
          let body;

          if (payload?.flor && payload?.yani && payload?.nico && payload?.ricardo && payload?.ricardo_admin) {
            // Formato A → usamos el otro endpoint para compatibilidad plena
            // Pero el backend que maneja PIN4 y pass largo es /api/caja/usuarios/bootstrap,
            // así que convertimos a pins + pass_largo.
            body = {
              pins: {
                f: String(payload.flor.password || ""),
                y: String(payload.yani.password || ""),
                n: String(payload.nico.password || ""),
                r: String(payload.ricardo.password || ""),
              },
              ricardo_pass_largo: String(payload.ricardo_admin.password || ""),
              admin_username: "admin",
            };
          } else {
            // Formato B
            body = {
              pins: {
                f: String(payload.florPin || ""),
                y: String(payload.yaniPin || ""),
                n: String(payload.nicoPin || ""),
                r: String(payload.ricPin || ""),
              },
              ricardo_pass_largo: String(payload.ricAdminPass || ""),
              admin_username: "admin",
            };
          }

          const res = await fetch(`${API_BASE}/api/caja/usuarios/bootstrap`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) return { ok: true, success: true, data };
          return { ok: false, success: false, error: data.error || "No se pudo bootstrapear usuarios" };
        } catch (e) {
          return { ok: false, success: false, error: e.message };
        }
      },

      // POST /api/caja/passwords/verificar
      cajaVerificarPassword: async ({ username, password, pin } = {}) => {
        try {
          const user = (username || "").trim().toLowerCase();

          // Heurística mínima:
          // - Si nos pasan un PIN de 4 dígitos (o password de 4 dígitos): tipo = pin4
          // - Si es admin/ricardo_admin o password largo: tipo = apertura_cierre
          const passOrPin = pin ?? password ?? "";
          const is4 = /^\d{4}$/.test(String(passOrPin));

          const tipo =
            (!is4 || user.includes("admin") || user === "r" || user === "ricardo")
              ? "apertura_cierre"
              : "pin4";

          const body =
            tipo === "pin4"
              ? { tipo, username: user[0], pin4: String(passOrPin) }   // f / y / n / r
              : { tipo, username: user, pass: String(passOrPin) };     // p.ej. "ricardo_admin"


          const res = await fetch(`${API_BASE}/api/caja/passwords/verificar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && (data.ok === true)) return { ok: true, success: true };
          return { ok: false, success: false, error: data.error || "Credenciales inválidas" };
        } catch (e) {
          return { ok: false, success: false, error: e.message };
        }
      },


      cajaAbrirTurno: async ({ codigo, observacion, denominaciones = [] }) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/turnos/abrir`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || token || ""}`,
            },
            body: JSON.stringify({
              codigo,
              observacion,
              denominaciones, // [{ etiqueta, importe_total }]
            }),
          });
          const data = await res.json();
          if (res.ok) {
            setTurnoActual(data.turno || null);
            return { success: true, turno: data.turno };
          }
          return { success: false, error: data.error || "No se pudo abrir turno" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaListarTurnos: async (filtros = {}) => {
        try {
          const params = new URLSearchParams();
          if (filtros.estado) params.set("estado", filtros.estado);
          if (filtros.desde) params.set("desde", filtros.desde);
          if (filtros.hasta) params.set("hasta", filtros.hasta);
          const url = `${API_BASE}/api/caja/turnos${params.toString() ? `?${params}` : ""}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) {
            setTurnos(data);
            return { success: true, turnos: data };
          }
          return { success: false, error: data.error || "No se pudo listar turnos" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaObtenerTurno: async (turnoId) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/turnos/${turnoId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) {
            setTurnoActual(data || null);
            setDenominacionesInicio(data.denominaciones || []);
            return { success: true, ...data };
          }
          return { success: false, error: data.error || "No se pudo obtener turno" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaCerrarTurno: async (turnoId, { efectivo_contado, resumen_por_metodo, observacion } = {}) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/turnos/${turnoId}/cerrar`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || token || ""}`,
            },
            body: JSON.stringify({ efectivo_contado, resumen_por_metodo, observacion }),
          });
          const data = await res.json();
          if (res.ok) {
            setTurnoActual(null);
            return { success: true, diferencia_efectivo: data.diferencia_efectivo };
          }
          return { success: false, error: data.error || "No se pudo cerrar turno" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaResumenTurno: async (turnoId) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/turnos/${turnoId}/resumen`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) {
            setResumenTurno(data);
            return { success: true, resumen: data };
          }
          return { success: false, error: data.error || "No se pudo obtener resumen" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      // ======================
      // CAJA - MOVIMIENTOS
      // ======================
      cajaCrearMovimiento: async (payloadUI) => {
        try {
          const body = {
            turno_id: payloadUI.turno_id,
            tipo: actions._mapTipoUItoEnum(payloadUI.tipo),
            metodo_pago: actions._mapMetodoUItoEnum(payloadUI.metodo_pago),
            importe: Number(payloadUI.importe),
            descripcion: payloadUI.descripcion || "",
            paga_con: payloadUI.paga_con ?? null,
            vuelto: payloadUI.vuelto ?? null,
          };
          const res = await fetch(`${API_BASE}/api/caja/movimientos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || token || ""}`,
            },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (res.ok) {
            // opcional: refrescar lista
            // await actions.cajaListarMovimientos({ turno_id: body.turno_id });
            return { success: true, movimiento: { id: data.id } };
          }
          return { success: false, error: data.error || "No se pudo crear movimiento" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaListarMovimientos: async (filtros = {}) => {
        try {
          const params = new URLSearchParams();
          if (filtros.turno_id) params.set("turno_id", filtros.turno_id);
          if (filtros.tipo) params.set("tipo", actions._mapTipoUItoEnum(filtros.tipo));
          if (filtros.metodo) params.set("metodo", actions._mapMetodoUItoEnum(filtros.metodo));
          const url = `${API_BASE}/api/caja/movimientos${params.toString() ? `?${params}` : ""}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) {
            setMovimientos(data);
            return { success: true, movimientos: data };
          }
          return { success: false, error: data.error || "No se pudo listar movimientos" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaMovimientoDetalle: async (movId) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/movimientos/${movId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) return { success: true, movimiento: data };
          return { success: false, error: data.error || "No se pudo obtener movimiento" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaAnularMovimiento: async (movId, motivo = "Anulación") => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/movimientos/${movId}/anular`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || token || ""}`,
            },
            body: JSON.stringify({ motivo }),
          });
          const data = await res.json();
          if (res.ok) return { success: true, original: data.original, reverso: data.reverso };
          return { success: false, error: data.error || "No se pudo anular movimiento" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaBorrarMovimiento: async (movId, motivo = "") => {
        try {
          const qs = motivo ? `?motivo=${encodeURIComponent(motivo)}` : "";
          const res = await fetch(`${API_BASE}/api/caja/movimientos/${movId}${qs}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = res.ok ? null : await res.json();
          if (res.ok) return { success: true };
          return { success: false, error: (data && data.error) || "No se pudo borrar movimiento" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaEditarMovimiento: async (movId, payloadUI = {}) => {
        try {
          const payload = { ...payloadUI };
          if (payload.metodo_pago) payload.metodo_pago = actions._mapMetodoUItoEnum(payload.metodo_pago);
          if (payload.tipo) payload.tipo = actions._mapTipoUItoEnum(payload.tipo); // por si en el futuro permitís
          const res = await fetch(`${API_BASE}/api/caja/movimientos/${movId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || token || ""}`,
            },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (res.ok) return { success: true, movimiento: data.movimiento };
          return { success: false, error: data.error || "No se pudo editar movimiento" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      // ======================
      // CAJA - INICIO DETALLES
      // ======================
      cajaListarInicioDetalles: async (turno_id) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/inicio-detalles?turno_id=${turno_id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) {
            setDenominacionesInicio(data);
            return { success: true, detalles: data };
          }
          return { success: false, error: data.error || "No se pudo listar inicio-detalles" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaCrearInicioDetalle: async ({ turno_id, etiqueta, importe_total }) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/inicio-detalles`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || token || ""}`,
            },
            body: JSON.stringify({ turno_id, etiqueta, importe_total }),
          });
          const data = await res.json();
          if (res.ok) {
            // refrescar lista
            await actions.cajaListarInicioDetalles(turno_id);
            return { success: true, id: data.id };
          }
          return { success: false, error: data.error || "No se pudo crear inicio-detalle" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaInicioDetalleDetalle: async (detalle_id) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/inicio-detalles/${detalle_id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) return { success: true, detalle: data };
          return { success: false, error: data.error || "No se pudo obtener inicio-detalle" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaEditarInicioDetalle: async (detalle_id, { etiqueta, importe_total, motivo }) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/inicio-detalles/${detalle_id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || token || ""}`,
            },
            body: JSON.stringify({ etiqueta, importe_total, motivo }),
          });
          const data = await res.json();
          if (res.ok) {
            // si querés, podés refrescar con el turno_id, pero no lo tenemos acá
            return { success: true, detalle: data.detalle };
          }
          return { success: false, error: data.error || "No se pudo editar inicio-detalle" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaBorrarInicioDetalle: async (detalle_id) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/inicio-detalles/${detalle_id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          if (res.ok) return { success: true };
          const data = await res.json();
          return { success: false, error: data.error || "No se pudo borrar inicio-detalle" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      // ======================
      // CAJA - ARQUEOS
      // ======================
      cajaCrearArqueo: async ({ turno_id, efectivo_contado, resumen_por_metodo, observacion, es_cierre = false }) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/arqueos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || token || ""}`,
            },
            body: JSON.stringify({ turno_id, efectivo_contado, resumen_por_metodo, observacion, es_cierre }),
          });
          const data = await res.json();
          if (res.ok) return { success: true, arqueo_id: data.arqueo_id };
          return { success: false, error: data.error || "No se pudo crear arqueo" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaListarArqueos: async (turno_id) => {
        try {
          const url = `${API_BASE}/api/caja/arqueos${turno_id ? `?turno_id=${turno_id}` : ""}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) {
            setArqueos(data);
            return { success: true, arqueos: data };
          }
          return { success: false, error: data.error || "No se pudo listar arqueos" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaArqueoDetalle: async (arqueo_id) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/arqueos/${arqueo_id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) return { success: true, arqueo: data };
          return { success: false, error: data.error || "No se pudo obtener arqueo" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      // ======================
      // CAJA - AUDITORÍA
      // ======================
      cajaListarAuditoria: async (filtros = {}) => {
        try {
          const params = new URLSearchParams();
          if (filtros.entidad) params.set("entidad", filtros.entidad);
          if (filtros.entidad_id) params.set("entidad_id", filtros.entidad_id);
          const res = await fetch(`${API_BASE}/api/caja/auditoria${params.toString() ? `?${params}` : ""}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) {
            setAuditoria(data);
            return { success: true, auditoria: data };
          }
          return { success: false, error: data.error || "No se pudo listar auditoría" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      cajaAuditoriaDetalle: async (aud_id) => {
        try {
          const res = await fetch(`${API_BASE}/api/caja/auditoria/${aud_id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || token || ""}` },
          });
          const data = await res.json();
          if (res.ok) return { success: true, evento: data };
          return { success: false, error: data.error || "No se pudo obtener evento de auditoría" };
        } catch (e) {
          return { success: false, error: e.message };
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
    librosDadosBaja,
    // --- CAJA ---
    turnoActual,
    turnos,
    denominacionesInicio,
    movimientos,
    arqueos,
    resumenTurno,
    auditoria,
    // --- FIN CAJA ---
  };

  return (
    <AppContext.Provider value={{
      store, actions, modalPedidosAbierto,
      setModalPedidosAbierto
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);