import React, { useEffect } from "react";
import { useAppContext } from "../context/appContext";
import { useNavigate } from "react-router-dom";

export const LibrosDadosBaja = () => {
    const { actions, store } = useAppContext();
    const navigate = useNavigate();

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

            <table style={tableStyle}>
                <thead>
                    <tr>
                        <th style={thStyle}>Título</th>
                        <th style={thStyle}>Autor</th>
                        <th style={thStyle}>Editorial</th>
                        <th style={thStyle}>ISBN</th>
                        <th style={thStyle}>Fecha de Baja</th>
                        <th style={thStyle}>Cantidad Bajada</th>   {/* 👈 agregado */}
                        <th style={thStyle}>Cantidad Actual</th>
                    </tr>
                </thead>
                <tbody>
                    {store.librosDadosBaja.length === 0 ? (
                        <tr>
                            <td colSpan="7" style={emptyStyle}>
                                No hay libros dados de baja
                            </td>
                        </tr>
                    ) : (
                        [...store.librosDadosBaja]
                            .sort((a, b) => new Date(b.fecha_baja) - new Date(a.fecha_baja))
                            .map((libro) => (
                                <tr key={libro.id} style={rowStyle}>
                                    <td style={tdStyle}>{libro.titulo}</td>
                                    <td style={tdStyle}>{libro.autor}</td>
                                    <td style={tdStyle}>{libro.editorial || "-"}</td>
                                    <td style={tdStyle}>{libro.isbn}</td>
                                    <td style={tdStyle}>
                                        {libro.fecha_baja
                                            ? new Date(libro.fecha_baja).toLocaleString()
                                            : "-"}
                                    </td>
                                    <td style={tdStyle}>{libro.cantidad_bajada}</td>   {/* 👈 agregado */}
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
    fontSize: "24px",
    userSelect: "none",
    color: "#f0db4f",
    textShadow: "0 0 8px #f0db4f",
};

const tableStyle = {
    width: "100%",
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
    // Redondeo sólo en las esquinas de la tabla (th primera y última)
    borderTopLeftRadius: "12px",
};

const tdStyle = {
    padding: "12px 16px",
    borderBottom: "1px solid #333",
    fontWeight: "500",
    color: "#ddd",
    borderRight: "1px solid #333",
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


export default LibrosDadosBaja;
