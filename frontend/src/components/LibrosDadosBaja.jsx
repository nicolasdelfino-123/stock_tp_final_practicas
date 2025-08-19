import React, { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/appContext";
import { useNavigate } from "react-router-dom";

export const LibrosDadosBaja = () => {
    const { actions, store } = useAppContext();
    const navigate = useNavigate();

    // --- Filtros (locales y aplicados) ---
    const [fechaInput, setFechaInput] = useState("");  // campo date
    const [qInput, setQInput] = useState("");          // campo texto

    const [fechaFiltro, setFechaFiltro] = useState(""); // valor aplicado
    const [q, setQ] = useState("");                    // valor aplicado

    // Solo fecha local YYYY-MM-DD, ignorando hora
    const toLocalISODate = (d) => {
        const dt = d instanceof Date ? d : new Date(d);
        if (isNaN(dt)) return "";
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, "0");
        const day = String(dt.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    // Lista filtrada y ordenada por fecha_baja desc
    const dataFiltrada = useMemo(() => {
        let lista = Array.isArray(store.librosDadosBaja) ? [...store.librosDadosBaja] : [];

        if (fechaFiltro) {
            lista = lista.filter(
                (libro) => libro.fecha_baja && toLocalISODate(libro.fecha_baja) === fechaFiltro
            );
        }

        if (q) {
            const needle = q.trim().toLowerCase();
            if (needle) {
                lista = lista.filter((libro) =>
                    [libro.titulo, libro.autor, libro.isbn]
                        .map((v) => (v ?? "").toString().toLowerCase())
                        .some((s) => s.includes(needle))
                );
            }
        }

        return lista.sort((a, b) => new Date(b.fecha_baja) - new Date(a.fecha_baja));
    }, [store.librosDadosBaja, fechaFiltro, q]);


    useEffect(() => {
        actions.getLibrosDadosBaja();
    }, []);

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <button
                    onClick={() => navigate("/")}
                    style={buttonStyle}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = "#e4f00aff")}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = "#fcf00cff")}
                >
                    <span style={{ fontSize: "16px" }}>⬅ Volver al inicio</span>
                </button>
                <h2 style={titleStyle}>📚 Libros dados de baja</h2>
            </div>
            {/* --- Barra de filtros --- */}
            <div style={filtersBarStyle}>
                <div style={filterGroupStyle}>
                    <label style={labelStyle}>Fecha de baja</label>
                    <input
                        type="date"
                        value={fechaInput}
                        onChange={(e) => setFechaInput(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <div style={filterGroupStyle}>
                    <label style={labelStyle}>Palabra clave (título / autor / ISBN)</label>
                    <input
                        type="text"
                        placeholder="Ej: Borges, Harry, 978..."
                        value={qInput}
                        onChange={(e) => setQInput(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <button
                    onClick={() => { setFechaFiltro(fechaInput); setQ(qInput); }}
                    style={applyButtonStyle}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = "#e4f00aff")}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = "#fcf00cff")}
                >
                    Aplicar filtros
                </button>
                <button
                    onClick={() => {
                        setFechaInput("");
                        setQInput("");
                        setFechaFiltro("");
                        setQ("");
                    }}
                    style={secondaryButtonStyle}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = "#333")}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = "#2c2c2c")}
                >
                    Limpiar filtros
                </button>
                <button
                    onClick={() => {
                        const hoy = toLocalISODate(new Date());
                        setFechaInput(hoy);
                        setQInput("");
                        setFechaFiltro(hoy);
                        setQ("");
                    }}
                    style={secondaryButtonStyle}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = "#333")}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = "#2c2c2c")}
                >
                    Ver bajas de hoy
                </button>


            </div>
            {/* --- Fin barra de filtros --- */}


            <table style={tableStyle}>
                <colgroup>
                    <col style={{ width: "22%" }} /> {/* Título */}
                    <col style={{ width: "14%" }} /> {/* Autor */}
                    <col style={{ width: "14%" }} /> {/* Editorial */}
                    <col style={{ width: "12%" }} /> {/* ISBN */}
                    <col style={{ width: "18%" }} /> {/* Fecha de Baja */}
                    <col style={{ width: "10%" }} /> {/* Cantidad Bajada */}
                    <col style={{ width: "10%" }} /> {/* Cantidad Actual */}
                </colgroup>
                <thead>
                    <tr>
                        <th style={thStyle}>Título</th>
                        <th style={thStyle}>Autor</th>
                        <th style={thStyle}>Editorial</th>
                        <th style={thStyle}>ISBN</th>
                        <th style={thStyle}>Fecha de Baja</th>
                        <th style={thStyle}>Cantidad Bajada</th>
                        <th style={thStyle}>Cantidad Actual</th>
                    </tr>
                </thead>
                <tbody>
                    {dataFiltrada.length === 0 ? (
                        <tr>
                            <td colSpan="7" style={emptyStyle}>
                                No hay libros dados de baja
                            </td>
                        </tr>
                    ) : (
                        dataFiltrada.map((libro) => (
                            <tr key={libro.id} style={rowStyle}>
                                <td style={tdStyle}>{libro.titulo}</td>
                                <td style={tdStyle}>{libro.autor}</td>
                                <td style={tdStyle}>{libro.editorial || "-"}</td>
                                <td style={tdStyle}>{libro.isbn}</td>
                                <td style={tdStyle}>
                                    {libro.fecha_baja ? new Date(libro.fecha_baja).toLocaleString() : "-"}
                                </td>
                                <td style={tdStyle}>{libro.cantidad_bajada}</td>
                                <td style={tdStyle}>{libro.cantidad}</td>
                            </tr>
                        ))
                    )}
                </tbody>

            </table>
        </div>
    );
};

// Estilos

const containerStyle = {
    padding: "20px",
    backgroundColor: "#121212",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: "#e0e0e0",
};

const headerStyle = {
    display: "flex",
    marginBottom: "20px",
    alignItems: "center",
    position: "relative",
};

const buttonStyle = {
    backgroundColor: "#fcf00cff",
    color: "#333",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: "600",
    marginRight: "10px",
    transition: "background-color 0.3s ease",
    boxShadow: "0 2px 6px rgba(252, 240, 12, 0.4)",
};

const titleStyle = {
    fontWeight: "bold",
    textAlign: "center",
    flex: "1",
    margin: "0",
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: "44px",
    userSelect: "none",
    color: "#f0db4f",
    textShadow: "0 0 2px #f0db4f",
    tableLayout: "fixed",
};

const tableStyle = {
    width: "100%",
    tableLayout: "fixed",     // 👈 respeta los anchos del <colgroup>
    borderCollapse: "separate",
    borderSpacing: 0,
    borderRadius: "12px",
    overflow: "hidden",
    backgroundColor: "#1e1e1e",
    boxShadow: "0 0 5px rgba(0,0,0,0.3)",
    border: "1px solid #444",
};


const thStyle = {
    padding: "12px 16px",
    backgroundColor: "#2c2c2c",
    fontWeight: "700",
    textAlign: "left",
    color: "#f0db4f",
    borderBottom: "2px solid #444",
    userSelect: "none",
    borderRight: "1px solid #444",
    borderTopLeftRadius: "12px",
    whiteSpace: "normal",        // 👈 permite múltiples líneas
    overflowWrap: "anywhere",    // 👈 corta donde sea necesario
    wordBreak: "break-word",     // 👈 fuerza corte en palabras largas
};


const tdStyle = {
    padding: "12px 16px",
    borderBottom: "1px solid #333",
    fontWeight: "500",
    color: "#ddd",
    borderRight: "1px solid #333",
    whiteSpace: "normal",        // 👈 permite salto de línea
    overflowWrap: "anywhere",    // 👈 evita desborde
    wordBreak: "break-word",     // 👈 corta palabras largas
};


// Ajustes para las esquinas en th y td para que el redondeo se vea limpio
thStyle.borderTopLeftRadius = "12px";
thStyle.borderTopRightRadius = "12px";
tdStyle.borderRight = "1px solid #333";

// Para que la última celda no tenga borderRight (evitar doble línea)
const lastThStyle = {
    ...thStyle,
    borderTopRightRadius: "12px",
    borderRight: "none",
};

const lastTdStyle = {
    ...tdStyle,
    borderRight: "none",
};

const emptyStyle = {
    padding: "20px",
    textAlign: "center",
    color: "#888",
    fontStyle: "italic",

};

const rowStyle = {
    transition: "background-color 0.25s ease",
    cursor: "default",
};

const filtersBarStyle = {
    display: "flex",
    gap: "12px",
    alignItems: "flex-end",
    flexWrap: "wrap",
    marginBottom: "12px",
};

const filterGroupStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
};

const labelStyle = {
    fontSize: "12px",
    color: "#aaa",
};

const inputStyle = {
    backgroundColor: "#1e1e1e",
    color: "#e0e0e0",
    border: "1px solid #444",
    borderRadius: "8px",
    padding: "10px 12px",
    outline: "none",
};

const applyButtonStyle = {
    ...buttonStyle,
    whiteSpace: "nowrap",
};

const secondaryButtonStyle = {
    backgroundColor: "#2c2c2c",
    color: "#eee",
    border: "1px solid #444",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: "600",
    boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
    whiteSpace: "nowrap",
};



export default LibrosDadosBaja;
