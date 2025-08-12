import React, { useEffect, useContext } from "react";
import { useAppContext } from "../context/appContext";
import { Navigate, useNavigate } from "react-router-dom";


export const LibrosDadosBaja = () => {

    const { actions, store } = useAppContext();
    const navigate = useNavigate();


    useEffect(() => {
        actions.getLibrosDadosBaja();
    }, []);

    return (
        <div style={{ padding: "20px" }}>
            <div style={{ display: "flex", marginBottom: "20px", alignItems: "center", position: 'relative' }}>
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
                <h2 style={{ color: 'white', fontWeight: 'bold', textAlign: 'center', flex: '1', margin: '0', position: 'absolute', left: '50%', transform: 'translateX(-50%)', }}>📚 Libros dados de baja</h2>
            </div>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                    <tr>
                        <th style={thStyle}>Título</th>
                        <th style={thStyle}>Autor</th>
                        <th style={thStyle}>Editorial</th>
                        <th style={thStyle}>ISBN</th>
                        <th style={thStyle}>Fecha de Baja</th>
                        <th style={thStyle}>Cantidad Actual</th>
                    </tr>
                </thead>
                <tbody>
                    {store.librosDadosBaja.length === 0 ? (
                        <tr>
                            <td colSpan="5" style={{ textAlign: "center", padding: "10px" }}>
                                No hay libros dados de baja
                            </td>
                        </tr>
                    ) : (
                        store.librosDadosBaja.map((libro) => (
                            <tr key={libro.id}>
                                <td style={tdStyle}>{libro.titulo}</td>
                                <td style={tdStyle}>{libro.autor}</td>
                                <td style={tdStyle}>{libro.editorial || "-"}</td>
                                <td style={tdStyle}>{libro.isbn}</td>

                                <td style={tdStyle}>
                                    {libro.fecha_baja
                                        ? new Date(libro.fecha_baja).toLocaleString()
                                        : "-"}
                                </td>
                                <td style={tdStyle}>{libro.cantidad}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

const thStyle = {
    border: "1px solid black",
    padding: "8px",
    backgroundColor: "#ead9d9ff",
    fontWeight: "bold"
};

const tdStyle = {
    border: "1px solid black",
    padding: "8px",
    backgroundColor: "#f9f9f9",
    fontWeight: "600"
};

export default LibrosDadosBaja;