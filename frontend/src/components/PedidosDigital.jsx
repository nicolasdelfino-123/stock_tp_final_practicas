import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/appContext";

const MOTIVOS_VIENE = [
    "SBS",
    "Cúspide",
    "Casassa",
    "Leas",
    "El Emporio",
    "Estari",
    "Otra librería"
];

const MOTIVOS_NO_VIENE = [
    "Falta de stock",
    "Descatalogado",
    "Demora unos días",
    "Edición agotada",
    "Edición en reimpresión",
    "Otros"
];

function formatearFechaArgentina(fecha) {
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function PedidosDigital() {
    const navigate = useNavigate();
    const { actions } = useAppContext();

    const [loading, setLoading] = useState(false);
    const [pedidos, setPedidos] = useState([]);
    const [terminoBusqueda, setTerminoBusqueda] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("TODOS"); // "TODOS" | "VIENE" | "NO_VIENE"

    // NUEVO: tras "Resetear", en la vista TODOS ocultamos los que están en VIENE
    const [excluirVienen, setExcluirVienen] = useState(false);

    // Cargar pedidos al montar (sin "mostrarOcultos")
    useEffect(() => {
        (async () => {
            setLoading(true);
            const res = await actions.obtenerPedidos(); // <— sin parámetro
            if (res.success) {
                setPedidos((res.pedidos || []).map(p => ({
                    ...p,
                    estado: p.estado || "",
                    motivo: p.motivo || ""
                })));

            } else {
                alert(res.error || "Error al cargar pedidos");
            }
            setLoading(false);
        })();
    }, [actions]);

    // Filtro por texto
    const filtrarPorBusqueda = (arr) => {
        if (!terminoBusqueda) return arr;
        const t = terminoBusqueda.toLowerCase();
        return arr.filter((p) =>
            (p.cliente_nombre?.toLowerCase().includes(t)) ||
            (p.titulo?.toLowerCase().includes(t)) ||
            (p.autor?.toLowerCase().includes(t)) ||
            (p.isbn?.toLowerCase().includes(t))
        );
    };

    // Filtro por fechas
    const filtrarPorFechas = (arr) => {
        if (!fechaDesde && !fechaHasta) return arr;

        const parseISODate = (yyyy_mm_dd) => {
            const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
            return new Date(y, (m || 1) - 1, d || 1);
        };

        const desde = fechaDesde ? parseISODate(fechaDesde) : null;
        const hasta = fechaHasta ? parseISODate(fechaHasta) : null;
        if (hasta) hasta.setHours(23, 59, 59, 999);

        return arr.filter((p) => {
            const fp = new Date(p.fecha);
            if (Number.isNaN(fp.getTime())) return false;
            if (desde && fp < desde) return false;
            if (hasta && fp > hasta) return false;
            return true;
        });
    };

    const pedidosFiltrados = useMemo(() => {
        let base = filtrarPorBusqueda(filtrarPorFechas(pedidos));

        // Botones "Todos / Vienen / No vienen"
        if (filtroEstado === "VIENE") return base.filter(p => (p.estado || "") === "VIENE");
        if (filtroEstado === "NO_VIENE") return base.filter(p => (p.estado || "") === "NO_VIENE");

        // Vista "TODOS"
        // Si excluirVienen está activo (tras "Resetear"), ocultamos los que ya están en VIENE
        if (excluirVienen) {
            return base.filter(p => (p.estado || "") !== "VIENE");
        }
        return base;
    }, [pedidos, terminoBusqueda, fechaDesde, fechaHasta, filtroEstado, excluirVienen]);

    const setEstado = async (id, nuevoEstado) => {
        sessionStorage.setItem("pd_preservarEstados", "1");

        const pedidoActual = pedidos.find(p => p.id === id);
        const motivo = pedidoActual?.motivo || "";

        if (nuevoEstado === "VIENE") {
            // Solo mostrar el select, sin persistir aún
            setPedidos(prev => prev.map(p =>
                p.id === id ? { ...p, estado: "VIENE", motivo: "" } : p
            ));
            return; // el guardado real será al elegir el motivo
        }

        setPedidos(prev => prev.map(p =>
            p.id === id ? { ...p, estado: nuevoEstado, motivo } : p
        ));

        await actions.actualizarPedido(id, {
            ...pedidoActual,
            estado: nuevoEstado,
            motivo
        });

    };

    const setMotivoViene = async (id, motivo) => {
        sessionStorage.setItem("pd_preservarEstados", "1");

        const pedidoActual = pedidos.find(p => p.id === id);

        setPedidos(prev => prev.map(p =>
            p.id === id ? { ...p, estado: "VIENE", motivo } : p
        ));

        await actions.actualizarPedido(id, {
            ...pedidoActual,
            estado: "VIENE",
            motivo
        });
    };

    const setMotivoNoViene = async (id, motivo) => {
        sessionStorage.setItem("pd_preservarEstados", "1");

        const pedidoActual = pedidos.find(p => p.id === id);

        setPedidos(prev => prev.map(p =>
            p.id === id ? { ...p, estado: "NO_VIENE", motivo } : p
        ));

        await actions.actualizarPedido(id, {
            ...pedidoActual,
            estado: "NO_VIENE",
            motivo
        });
    };

    const getPedidoById = (id) => pedidos.find(p => p.id === id);
    const getEstado = (id) => getPedidoById(id)?.estado || "";
    const getMotivo = (id) => getPedidoById(id)?.motivo || "";

    // Conjuntos para imprimir (se apoyan en la vista filtrada actual)
    const pedidosVienen = useMemo(
        () => pedidosFiltrados.filter(p => (p.estado || "") === "VIENE"),
        [pedidosFiltrados]
    );

    const pedidosNoVienen = useMemo(
        () => pedidosFiltrados.filter(p => (p.estado || "") === "NO_VIENE"),
        [pedidosFiltrados]
    );

    const imprimirLista = (lista, titulo) => {
        if (lista.length === 0) {
            alert("No hay pedidos marcados para imprimir.");
            return;
        }

        const rows = lista.map((p) => {
            const estado = getEstado(p.id);
            const motivo = estado ? (getMotivo(p.id) || "-") : "-";

            return `
        <tr>
          <td>${p.cliente_nombre || "-"}</td>
          <td>${p.titulo || "-"}</td>
          <td>${p.autor || "-"}</td>
          <td style="text-align:center">${p.cantidad || 1}</td>
          <td>${motivo}</td>
        </tr>
      `;
        }).join("");

        const vent = window.open("", "_blank");
        vent.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${titulo}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 12px; }
    h2 { margin: 0 0 8px 0; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #000; padding: 6px; }
    th { background: #eee; }
    @media print {
      body { margin: 8mm; }
      th, td { border: 1px solid #000; }
    }
  </style>
</head>
<body>
  <h2>${titulo}</h2>
  <p>Fecha de impresión: ${new Date().toLocaleString("es-AR")}</p>
  <table>
    <thead>
      <tr>
        <th>Cliente</th>
        <th>Título</th>
        <th>Autor</th>
        <th>Cant.</th>
        <th>Motivo (si NO VIENE)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <script>
    setTimeout(() => { window.print(); window.close(); }, 300);
  </script>
</body>
</html>
    `);
        vent.document.close();
    };

    const fondoURL = "/fondo-3.jpg";

    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#7ec27e",
            padding: "20px",
            backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)),url(${fondoURL})`,
            backgroundSize: "cover"
        }}>
            <div className="d-flex align-items-center mb-3">
                <button
                    type="button"
                    className="btn"
                    onClick={() => navigate("/pedidos")}
                    style={{
                        borderRadius: "8px",
                        padding: "10px 20px",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                        transition: "background-color 0.3s ease",
                        backgroundColor: "#fcf00cff",
                        fontWeight: "bold",
                        height: "44px",
                        marginRight: "10px"
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = "#e4f00aff")}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = "#fcf00cff")}
                >
                    Volver al Inicio
                </button>

                <div style={{ textAlign: "center", flexGrow: 1 }}>
                    <h2 style={{
                        color: "white",
                        marginTop: "10px",
                        fontSize: "40px",
                        fontWeight: "700",
                        textShadow: "4px 4px 22px rgba(0,0,0,0.9)"
                    }}>
                        <strong>Pedidos Digital – Ricardo</strong>
                    </h2>
                </div>
            </div>

            <div style={{
                backgroundColor: "#bbf5b6ff",
                padding: "20px",
                borderRadius: "10px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
            }}>
                {/* Filtros */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px", alignItems: "flex-end" }}>
                    <input
                        type="text"
                        placeholder="🔍 Cliente, Libro, Autor o ISBN"
                        value={terminoBusqueda}
                        onChange={(e) => setTerminoBusqueda(e.target.value)}
                        style={{
                            padding: "12px 12px",
                            borderRadius: "6px",
                            border: "2px solid #95a5a6",
                            minWidth: "260px",
                            fontWeight: 700,
                            lineHeight: "normal",
                            height: "44px",
                            boxSizing: "border-box"
                        }}
                    />
                    <div>
                        <label style={{ display: "block", fontWeight: "bold", marginBottom: 4 }}>Desde</label>
                        <input
                            type="date"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                            style={{ padding: "8px", borderRadius: "6px", border: "2px solid #95a5a6" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", fontWeight: "bold", marginBottom: 4 }}>Hasta</label>
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                            style={{ padding: "8px", borderRadius: "6px", border: "2px solid #95a5a6" }}
                        />
                    </div>
                    <button
                        onClick={() => { setFechaDesde(""); setFechaHasta(""); setTerminoBusqueda(""); }}
                        style={{
                            backgroundColor: "#ffc107",
                            color: "black",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            height: "42px",
                            alignSelf: "end",
                            fontWeight: "bold"
                        }}
                    >
                        Limpiar filtros
                    </button>

                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button
                            onClick={() => { setFiltroEstado("TODOS"); setExcluirVienen(false); }}
                            style={{
                                backgroundColor: filtroEstado === "TODOS" ? "#0d6efd" : "#e9ecef",
                                color: filtroEstado === "TODOS" ? "white" : "black",
                                border: "none",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "bold"
                            }}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => { setFiltroEstado("VIENE"); setExcluirVienen(false); }}
                            style={{
                                backgroundColor: filtroEstado === "VIENE" ? "#198754" : "#e9ecef",
                                color: filtroEstado === "VIENE" ? "white" : "black",
                                border: "none",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "bold"
                            }}
                        >
                            Vienen
                        </button>
                        <button
                            onClick={() => { setFiltroEstado("NO_VIENE"); setExcluirVienen(false); }}
                            style={{
                                backgroundColor: filtroEstado === "NO_VIENE" ? "#dc3545" : "#e9ecef",
                                color: filtroEstado === "NO_VIENE" ? "white" : "black",
                                border: "none",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "bold"
                            }}
                        >
                            No vienen
                        </button>

                        {/* Botón Resetear: deja en TODOS PERO excluyendo los que están en VIENE */}
                        <button
                            onClick={async () => {
                                // 1) Persistir limpieza en backend para los que NO son VIENE (NO_VIENE o vacíos)
                                const aResetear = pedidos.filter(p => (p.estado || "") !== "VIENE");
                                if (aResetear.length) {
                                    await Promise.all(
                                        aResetear.map(p =>
                                            actions.actualizarPedido(p.id, { ...p, estado: "", motivo: "" })
                                        )
                                    );
                                }

                                // 2) Limpiar en memoria (sin tocar los VIENE)
                                setPedidos(prev => prev.map(p =>
                                    (p.estado || "") === "VIENE" ? p : { ...p, estado: "", motivo: "" }
                                ));

                                // 3) Vista general excluyendo los VIENE (no aparecen para no pedirlos de nuevo)
                                setFiltroEstado("TODOS");
                                setExcluirVienen(true);
                            }}

                            style={{
                                backgroundColor: "#ff5722",
                                color: "white",
                                border: "none",
                                padding: "10px 20px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                marginBottom: "12px"
                            }}
                        >
                            🔄 Comenzar / Resetear para nuevo pedido
                        </button>

                        {/* SOLO en vista TODOS: botón para "pasar" a la vista Vienen */}
                        {filtroEstado === "TODOS" && (
                            <button
                                onClick={() => { setFiltroEstado("VIENE"); setExcluirVienen(false); }}
                                style={{
                                    backgroundColor: "#17a2b8",
                                    color: "white",
                                    border: "none",
                                    padding: "10px 20px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    marginBottom: "12px"
                                }}
                            >
                                Ver los que VIENEN
                            </button>
                        )}
                    </div>
                </div>

                {/* Acciones de impresión */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <button
                        onClick={() => imprimirLista(pedidosVienen, "Pedidos que VIENEN")}
                        style={{
                            backgroundColor: "#0c62beff",
                            color: "white",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        Imprimir los que VIENEN
                    </button>
                    <button
                        onClick={() => imprimirLista(pedidosNoVienen, "Pedidos que NO VIENEN")}
                        style={{
                            backgroundColor: "#6c757d",
                            color: "white",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "bold"
                        }}
                    >
                        Imprimir los que NO VIENEN
                    </button>

                    <span style={{ alignSelf: "center", fontWeight: "bold", color: "#333" }}>
                        Total en vista: {pedidosFiltrados.length} — Marcados VIENEN: {pedidosVienen.length} — NO VIENEN: {pedidosNoVienen.length} - SIN MARCAR: {pedidosFiltrados.filter(p => !p.estado).length}
                    </span>
                </div>

                {/* Tabla */}
                <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "70vh" }}>
                    <table
                        style={{
                            width: "100%",
                            minWidth: "1100px",
                            borderCollapse: "collapse",
                            border: "1px solid #adb5bd",
                            background: "blue"
                        }}
                    >
                        <thead>
                            <tr style={{ backgroundColor: "#0655a8ff", color: 'white' }}>
                                <th style={thStyle}>Cliente</th>
                                <th style={thStyle}>Título</th>
                                <th style={thStyle}>Autor</th>
                                <th style={thStyleCenter}>Cant.</th>
                                <th style={thStyle}>ISBN</th>
                                <th style={thStyleCenter}>Fecha</th>
                                <th style={thStyle}>Comentarios</th>
                                <th style={thStyle}>Estado</th>
                                <th style={thStyle}>Motivo</th>
                                <th style={thStyleCenter}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} style={tdLoading}>Cargando...</td></tr>
                            ) : pedidosFiltrados.length === 0 ? (
                                <tr><td colSpan={10} style={tdLoading}>Sin resultados</td></tr>
                            ) : (
                                pedidosFiltrados.map((p, idx) => {
                                    const estado = getEstado(p.id);
                                    return (
                                        <tr key={p.id || idx} style={{ background: idx % 2 === 0 ? "#f8f9fa" : "white" }}>
                                            <td style={tdStyle}>{p.cliente_nombre || "-"}</td>
                                            <td style={tdStyle}>{p.titulo || "-"}</td>
                                            <td style={tdStyle}>{p.autor || "-"}</td>
                                            <td style={{ ...tdStyle, textAlign: "center", width: 60 }}>{p.cantidad || 1}</td>
                                            <td style={tdStyle}>{p.isbn || "-"}</td>
                                            <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{formatearFechaArgentina(p.fecha)}</td>
                                            <td style={tdStyle}>{p.comentario || "-"}</td>
                                            <td style={tdStyle}>
                                                {estado === "VIENE" ? "VIENE" : estado === "NO_VIENE" ? "NO VIENE" : "-"}
                                            </td>
                                            <td style={tdStyle}>
                                                {/* Si no eligió estado todavía, el select está deshabilitado */}
                                                {getEstado(p.id) === "" && (
                                                    <select
                                                        disabled
                                                        value=""
                                                        style={{
                                                            width: "100%",
                                                            padding: "6px 8px",
                                                            border: "1px solid #95a5a6",
                                                            borderRadius: "6px",
                                                            background: "#e9ecef"
                                                        }}
                                                    >
                                                        <option value="">— Seleccione VIENE o NO VIENE —</option>
                                                    </select>
                                                )}

                                                {/* Si marcó VIENE, mostrar opciones de librerías */}
                                                {getEstado(p.id) === "VIENE" && (
                                                    <select
                                                        value={getMotivo(p.id)}
                                                        onChange={(e) => setMotivoViene(p.id, e.target.value)}
                                                        style={{
                                                            width: "100%",
                                                            padding: "6px 8px",
                                                            border: "1px solid #95a5a6",
                                                            borderRadius: "6px",
                                                            background: "white"
                                                        }}
                                                    >
                                                        <option value="">— Seleccione proveedor —</option>
                                                        {MOTIVOS_VIENE.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                )}

                                                {/* Si marcó NO VIENE, mostrar motivos de no disponibilidad */}
                                                {getEstado(p.id) === "NO_VIENE" && (
                                                    <select
                                                        value={getMotivo(p.id)}
                                                        onChange={(e) => setMotivoNoViene(p.id, e.target.value)}
                                                        style={{
                                                            width: "100%",
                                                            padding: "6px 8px",
                                                            border: "1px solid #95a5a6",
                                                            borderRadius: "6px",
                                                            background: "white"
                                                        }}
                                                    >
                                                        <option value="">— Seleccione motivo —</option>
                                                        {MOTIVOS_NO_VIENE.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                )}
                                            </td>

                                            <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <button
                                                        onClick={() => setEstado(p.id, "VIENE")}
                                                        style={btnOk}
                                                    >
                                                        VIENE
                                                    </button>
                                                    <button
                                                        onClick={() => setEstado(p.id, "NO_VIENE")}
                                                        style={btnNo}
                                                    >
                                                        NO VIENE
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* Estilos inline compartidos */
const thStyle = {
    padding: "10px",
    border: "1px solid #adacac",
    fontWeight: "bold",
    textAlign: "left",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 2,
    backgroundColor: "#0655a8ff",
    color: "white",
};

const thStyleCenter = { ...thStyle, textAlign: "center" };
const tdStyle = {
    padding: "10px",
    border: "1px solid #adacac",
    color: "black",
    fontWeight: "bold",
    verticalAlign: "top"
};
const tdLoading = {
    padding: "16px",
    textAlign: "center",
    color: "#6c757d",
    border: "1px solid #adacac"
};
const btnOk = {
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: "pointer"
};
const btnNo = {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: "pointer"
};
