import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../context/appContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faCheck, faTrash, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";

const Faltantes = () => {
  const { actions } = useAppContext();
  const [nota, setNota] = useState("");
  const [faltantes, setFaltantes] = useState([]);
  const [tachados, setTachados] = useState(new Set());
  const [editandoId, setEditandoId] = useState(null);
  const [editTexto, setEditTexto] = useState("");
  const listaRef = useRef();
  const navigate = useNavigate();
  const [faltantesEliminados, setFaltantesEliminados] = useState([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [mostrandoEliminados, setMostrandoEliminados] = useState(false);

  // Función para cargar faltantes activos (la usaremos en useEffect y luego para recargar)
  const cargarFaltantes = async () => {
    const res = await actions.getFaltantes();
    if (res.success) setFaltantes(res.faltantes);
    else alert("Error al cargar faltantes: " + res.error);
  };

  useEffect(() => {
    cargarFaltantes();
  }, [actions]);

  const guardarNota = async () => {
    if (nota.trim() === "") return;
    const res = await actions.crearFaltante(nota.trim());
    if (res.success) {
      setFaltantes([res.faltante, ...faltantes]);
      setNota("");
    } else {
      alert("Error al guardar: " + res.error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      guardarNota();
    }
  };

  const toggleTachado = (id) => {
    const nuevosTachados = new Set(tachados);
    if (nuevosTachados.has(id)) {
      nuevosTachados.delete(id);
    } else {
      nuevosTachados.add(id);
    }
    setTachados(nuevosTachados);
  };

  const limpiarTodo = async () => {
    if (window.confirm("¿Seguro que deseas limpiar todos los faltantes?")) {
      const res = await actions.limpiarFaltantes();
      if (res.success) {
        setFaltantes([]);
        setTachados(new Set());
        setNota("");
      } else {
        alert("Error limpiando faltantes: " + res.error);
      }
    }
  };

  const imprimir = () => {
    const contenido = faltantes
      .map(f => {
        const style = tachados.has(f.id)
          ? 'text-decoration: line-through; color: #666;'
          : '';
        const descripcion = f.descripcion.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<li style="${style}">${descripcion}</li>`;
      })
      .join("");

    const ventana = window.open("", "_blank");
    ventana.document.write(`
    <html>
      <head>
        <title>Imprimir faltantes</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          ul { list-style-type: disc; }
          li { margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <h2>Faltantes de stock</h2>
        <ul>${contenido}</ul>
      </body>
    </html>
  `);
    ventana.document.close();
    ventana.focus();
    ventana.print();
    ventana.close();
  };

  const comenzarEdicion = (id, texto) => {
    setEditandoId(id);
    setEditTexto(texto);
  };

  const guardarEdicion = async (id) => {
    if (editTexto.trim() === "") {
      alert("El texto no puede estar vacío.");
      return;
    }
    const res = await actions.editarFaltante(id, editTexto.trim());
    if (res.success) {
      setFaltantes(
        faltantes.map((f) =>
          f.id === id ? { ...f, descripcion: editTexto.trim() } : f
        )
      );
      setEditandoId(null);
      setEditTexto("");
    } else {
      alert("Error al editar: " + res.error);
    }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditTexto("");
  };

  const eliminarItem = async (id) => {
    if (!window.confirm("¿Eliminar este faltante?")) return;
    const res = await actions.eliminarFaltante(id);
    if (res.success) {
      setFaltantes(faltantes.filter((f) => f.id !== id));
      setTachados((prev) => {
        const nuevo = new Set(prev);
        nuevo.delete(id);
        return nuevo;
      });
    } else {
      alert("Error eliminando faltante: " + res.error);
    }
  };


  // Función robusta para normalizar fechas a medianoche local (evita problemas de zona horaria)
  function fechaSinHora(fecha) {
    if (!fecha) return NaN;

    // Si viene del input[type=date] como 'YYYY-MM-DD', parsear manualmente
    if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [year, month, day] = fecha.split('-').map(Number);
      const d = new Date(year, month - 1, day, 0, 0, 0, 0); // mes es 0-indexed
      return d.getTime();
    }

    // Para fechas ISO del backend, extraer solo la parte de fecha y parsear manualmente
    if (typeof fecha === "string" && fecha.includes('T')) {
      const fechaParte = fecha.split('T')[0]; // "2024-01-15T10:30:45" -> "2024-01-15"
      const [year, month, day] = fechaParte.split('-').map(Number);
      const d = new Date(year, month - 1, day, 0, 0, 0, 0);
      return d.getTime();
    }

    // Para otros formatos, crear Date y normalizar
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return NaN;
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  // --- NOTA: removí la línea que provocaba `res is not defined` aquí ---
  // Antes había: const filtrados = res.faltantesEliminados.filter(...)
  // Esa línea estaba fuera de contexto y tiraba el error. (Se maneja correctamente dentro del onClick abajo.)

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "20px auto",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        backgroundColor: "#f9f9f9",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            backgroundColor: "#fcf00cff",
            color: "#333",
            border: "none",
            borderRadius: "6px",
            padding: "11px 12px",
            cursor: "pointer",
            fontWeight: "600",
            marginRight: "10px",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#e4f00aff")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#fcf00cff")}
        >
          <span style={{ fontSize: "16px" }}>⬅ Volver al inicio</span>
        </button>

        <h3
          style={{
            textAlign: "center",
            color: "#114470",
            flexGrow: 1,
            margin: 0,
            fontWeight: "900",
            fontSize: "40px",
            textShadow: "2px 2px 30px rgba(0,0,0,0.5)",
          }}
        >
          Faltantes de stock
        </h3>
      </div>

      <textarea
        placeholder="Anotá aquí los productos faltantes..."
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          height: "100px",
          padding: "10px",
          fontSize: "1rem",
          borderRadius: "6px",
          border: "1px solid #ccc",
          resize: "vertical",
          marginBottom: "12px",
          fontFamily: "inherit",
        }}
      />

      <button
        onClick={guardarNota}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "#114470",
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontWeight: "700",
          cursor: "pointer",
          transition: "background-color 0.3s",
          marginBottom: "12px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0d365d")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#114470")}
      >
        Guardar
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "10px",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={imprimir}
            style={{
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            Imprimir
          </button>

          <button
            onClick={limpiarTodo}
            style={{
              backgroundColor: "#e53935",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            Limpiar Todo
          </button>
        </div>

        {/* Inputs fechas para filtrar */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="fechaDesde" style={{ fontWeight: "700" }}>
              Desde:
            </label>
            <input
              id="fechaDesde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
              max={fechaHasta || undefined}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="fechaHasta" style={{ fontWeight: "700" }}>
              Hasta:
            </label>
            <input
              id="fechaHasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
              min={fechaDesde || undefined}
            />
          </div>
        </div>

        {/* Botón Recuperar Eliminados con filtro corregido */}
        <button
          onClick={async () => {
            if (!fechaDesde || !fechaHasta) {
              alert("Por favor seleccioná ambas fechas: desde y hasta.");
              return;
            }

            const res = await actions.obtenerFaltantesEliminados();

            if (res.success) {
              console.log("Datos recibidos:", res.faltantesEliminados); // Para debug

              // Si no hay filtro de fechas, mostrar todos los eliminados
              let filtrados = res.faltantesEliminados;

              // Solo filtrar si tenemos fechas válidas
              if (fechaDesde && fechaHasta) {
                const desdeDate = new Date(fechaDesde + 'T00:00:00');
                const hastaDate = new Date(fechaHasta + 'T23:59:59');

                filtrados = res.faltantesEliminados.filter(item => {
                  // Si no tiene fecha_creacion, incluirlo (registros viejos)
                  if (!item.fecha_creacion) return true;

                  const fechaItem = new Date(item.fecha_creacion);
                  return fechaItem >= desdeDate && fechaItem <= hastaDate;
                });
              }

              alert(`Hay ${filtrados.length} faltantes eliminados entre esas fechas.`);
              setFaltantes(filtrados);
              setTachados(new Set());
              setMostrandoEliminados(true);
            } else {
              alert("Error al obtener faltantes eliminados: " + res.error);
            }
          }}
          style={{
            backgroundColor: "#f0c330",
            color: "black",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            cursor: "pointer",
            fontWeight: "700",
            width: "100%",
          }}
        >
          Recuperar Eliminados
        </button>



        {/* Botón para volver a los faltantes activos si está mostrando eliminados */}
        {mostrandoEliminados && (
          <button
            onClick={async () => {
              await cargarFaltantes(); // Usar la función que ya existe
              setTachados(new Set()); // Limpiar tachados
              setMostrandoEliminados(false);
              setFechaDesde(""); // Limpiar filtros de fecha
              setFechaHasta("");
            }}
            style={{
              marginTop: "10px",
              backgroundColor: "#114470",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: "700",
              width: "100%",
            }}
          >
            Volver a faltantes activos
          </button>
        )}
      </div>

      {faltantes.length > 0 ? (
        <ul
          ref={listaRef}
          style={{ marginTop: "10px", paddingLeft: "20px", listStyleType: "none", fontWeight: "bold" }}
        >
          {faltantes.map((item) => (
            <li
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
                textDecoration: tachados.has(item.id) ? "line-through" : "none",
                color: tachados.has(item.id) ? "#666" : "black",
              }}
            >
              <span style={{ marginRight: "10px", fontSize: "20px", lineHeight: "1" }}>•</span>

              {editandoId === item.id ? (
                <>
                  <input
                    type="text"
                    value={editTexto}
                    onChange={(e) => setEditTexto(e.target.value)}
                    className="form-control me-2"
                    style={{ flexGrow: 1, maxWidth: "60%" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") guardarEdicion(item.id);
                      if (e.key === "Escape") cancelarEdicion();
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => guardarEdicion(item.id)}
                    className="btn btn-success btn-sm me-2"
                    title="Guardar"
                  >
                    Guardar
                  </button>
                  <button onClick={cancelarEdicion} className="btn btn-secondary btn-sm" title="Cancelar">
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span
                    onClick={() => toggleTachado(item.id)}
                    style={{ cursor: "pointer", flexGrow: 1 }}
                    title="Tachar / Destachar"
                  >
                    {item.descripcion}
                  </span>
                  <div style={{ marginLeft: "10px", whiteSpace: "nowrap" }}>
                    <button
                      title="Editar"
                      onClick={() => comenzarEdicion(item.id, item.descripcion)}
                      style={{
                        marginRight: "6px",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                        outline: "none",
                        color: "#114470",
                      }}
                    >
                      <FontAwesomeIcon icon={faPen} size="lg" />
                    </button>
                    <button
                      title="Tachar"
                      onClick={() => toggleTachado(item.id)}
                      style={{
                        marginRight: "6px",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                        outline: "none",
                        color: tachados.has(item.id) ? "#4caf50" : "#000",
                      }}
                    >
                      <FontAwesomeIcon icon={faCheck} size="lg" />
                    </button>
                    <button
                      title="Eliminar"
                      onClick={() => eliminarItem(item.id)}
                      style={{
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                        outline: "none",
                        color: "red",
                      }}
                    >
                      <FontAwesomeIcon icon={faTrash} size="lg" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ textAlign: "center", color: "#777" }}>No hay faltantes registrados.</p>
      )}
    </div>
  );
}
export default Faltantes;
