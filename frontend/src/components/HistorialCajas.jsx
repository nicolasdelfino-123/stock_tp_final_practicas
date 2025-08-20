import React, { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/appContext";

const turnoLabel = (t) => (t === "MANANA" ? "Mañana" : t === "TARDE" ? "Tarde" : "—");
const moneda = (n) => Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const hora = (iso) => {
    try { return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }); }
    catch { return "—"; }
};

export default function HistorialCajas() {
    const { actions } = useAppContext();

    // Filtros
    const [fFecha, setFFecha] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
    const [fTurno, setFTurno] = useState(""); // "", "MANANA", "TARDE"

    // Turnos listados y seleccionado
    const [turnos, setTurnos] = useState([]);
    const [sel, setSel] = useState(null); // turno seleccionado (objeto)

    // Detalle del turno
    const [detalle, setDetalle] = useState(null);  // cajaObtenerTurno (denominaciones, etc.)
    const [movs, setMovs] = useState([]);          // movimientos no eliminados
    const [editados, setEditados] = useState([]);  // logs de ediciones
    const [borrados, setBorrados] = useState([]);  // logs de borrados

    // Cargar turnos cerrados según filtros
    async function cargarTurnos() {
        const params = {};
        params.estado = "CERRADO";
        if (fFecha) params.fecha = fFecha;
        if (fTurno) params.turno = fTurno;

        const res = await actions.cajaListarTurnos(params);
        if (res?.success) setTurnos(res.turnos || []);
        else setTurnos([]);
        setSel(null);
        setDetalle(null);
        setMovs([]);
        setEditados([]);
        setBorrados([]);
    }

    useEffect(() => { cargarTurnos(); /* eslint-disable-next-line */ }, []);

    const ventas = useMemo(
        () => (movs || []).filter(m => m.tipo === "VENTA"),
        [movs]
    );
    const salidas = useMemo(
        () => (movs || []).filter(m => m.tipo === "SALIDA"),
        [movs]
    );

    const totalEfectivo = useMemo(() => ventas.filter(v => v.metodo_pago === "EFECTIVO").reduce((a, b) => a + Number(b.importe || 0), 0), [ventas]);
    const totalTransf = useMemo(() => ventas.filter(v => v.metodo_pago?.startsWith("TRANSF")).reduce((a, b) => a + Number(b.importe || 0), 0), [ventas]);
    const totalDebito = useMemo(() => ventas.filter(v => v.metodo_pago === "DEBITO").reduce((a, b) => a + Number(b.importe || 0), 0), [ventas]);
    const totalCredito = useMemo(() => ventas.filter(v => v.metodo_pago === "CREDITO").reduce((a, b) => a + Number(b.importe || 0), 0), [ventas]);
    const totalSalidas = useMemo(() => salidas.reduce((a, b) => a + Number(b.importe || 0), 0), [salidas]);

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
            <h2>Historial de Cajas</h2>

            {/* Filtros */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, marginTop: 12, marginBottom: 12 }}>
                <div>
                    <div style={{ fontSize: 12, opacity: .7 }}>Fecha</div>
                    <input type="date" value={fFecha} onChange={e => setFFecha(e.target.value)} style={{ width: "100%", padding: 8 }} />
                </div>
                <div>
                    <div style={{ fontSize: 12, opacity: .7 }}>Turno</div>
                    <select value={fTurno} onChange={e => setFTurno(e.target.value)} style={{ width: "100%", padding: 8 }}>
                        <option value="">Todos</option>
                        <option value="MANANA">Mañana</option>
                        <option value="TARDE">Tarde</option>
                    </select>
                </div>
                <div style={{ display: "flex", alignItems: "end" }}>
                    <button onClick={cargarTurnos} style={{ padding: "10px 14px", fontWeight: 700 }}>Buscar</button>
                </div>
            </div>

            {/* Lista de turnos */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#f8fafc" }}>
                            <th style={th}>#</th>
                            <th style={th}>Fecha</th>
                            <th style={th}>Turno</th>
                            <th style={th}>Abierto</th>
                            <th style={th}>Cerrado</th>
                            <th style={th}>Inicial Efectivo</th>
                            <th style={th}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {turnos.length === 0 && (
                            <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#64748b" }}>Sin resultados</td></tr>
                        )}
                        {turnos.map(t => (
                            <tr key={t.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                                <td style={td}>{t.id}</td>
                                <td style={td}>{t.fecha || (t.abierto_en ? t.abierto_en.slice(0, 10) : "—")}</td>
                                <td style={td}>{turnoLabel(t.turno)}</td>
                                <td style={td}>{t.abierto_en ? new Date(t.abierto_en).toLocaleString("es-AR") : "—"}</td>
                                <td style={td}>{t.cerrado_en ? new Date(t.cerrado_en).toLocaleString("es-AR") : "—"}</td>
                                <td style={td}>{moneda(t.monto_inicial_efectivo)}</td>
                                <td style={{ ...td, textAlign: "right" }}>
                                    <button
                                        onClick={async () => {
                                            setSel(t);
                                            // Detalle + movimientos + logs
                                            const det = await actions.cajaObtenerTurno(t.id);
                                            setDetalle(det.success ? det : null);

                                            const m = await actions.cajaListarMovimientos({ turno_id: t.id });
                                            setMovs(m.success ? (m.movimientos || []) : []);

                                            const e = await actions.cajaListarMovimientosEditados(t.id);
                                            setEditados(e.success ? (e.editados || []) : []);

                                            const b = await actions.cajaListarMovimientosBorrados(t.id);
                                            setBorrados(b.success ? (b.borrados || []) : []);
                                        }}
                                        style={{ padding: "8px 12px", fontWeight: 700 }}
                                    >
                                        Ver detalle
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Detalle del turno seleccionado */}
            {sel && (
                <div style={{ marginTop: 20 }}>
                    <h3>
                        Caja día {sel.fecha || (sel.abierto_en ? sel.abierto_en.slice(0, 10) : "—")} — Turno {turnoLabel(sel.turno)}
                    </h3>

                    {/* Inicio de caja */}
                    <div style={{ marginTop: 10, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Inicio de caja</div>
                        <div>Importe inicial efectivo: <strong>{moneda(sel.monto_inicial_efectivo)}</strong></div>
                        {detalle?.denominaciones?.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: "#f8fafc" }}>
                                            <th style={th}>Etiqueta</th>
                                            <th style={th}>Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detalle.denominaciones.map(d => (
                                            <tr key={d.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                                                <td style={td}>{d.etiqueta}</td>
                                                <td style={td}>{moneda(d.importe_total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Resumen rápido */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 10, marginTop: 12 }}>
                        <Box label="Ventas Efectivo" value={moneda(totalEfectivo)} />
                        <Box label="Transferencias" value={moneda(totalTransf)} />
                        <Box label="Débito" value={moneda(totalDebito)} />
                        <Box label="Crédito" value={moneda(totalCredito)} />
                        <Box label="Salidas" value={moneda(totalSalidas)} />
                    </div>

                    {/* Entradas (VENTAS) */}
                    <Card title="Entradas (Ventas)">
                        <TableMovs rows={ventas} empty="Sin ventas registradas" />
                    </Card>

                    {/* Salidas */}
                    <Card title="Salidas">
                        <TableSalidas rows={salidas} empty="Sin salidas registradas" />
                    </Card>

                    {/* Ediciones */}
                    <Card title="Movimientos editados">
                        <TableEditados rows={editados} empty="Sin ediciones" />
                    </Card>

                    {/* Eliminados */}
                    <Card title="Movimientos eliminados">
                        <TableBorrados rows={borrados} empty="Sin eliminaciones" />
                    </Card>
                </div>
            )}
        </div>
    );
}

const th = { textAlign: "left", padding: 10, fontWeight: 700, borderBottom: "1px solid #e5e7eb" };
const td = { padding: 10, borderBottom: "1px solid #eef2f7" };

function Card({ title, children }) {
    return (
        <div style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ padding: 12, fontWeight: 800, background: "#f8fafc" }}>{title}</div>
            <div style={{ padding: 12 }}>{children}</div>
        </div>
    );
}

function Box({ label, value }) {
    return (
        <div style={{ background: "#0b1729", color: "#c7d2fe", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 12, opacity: .8 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
        </div>
    );
}

function TableMovs({ rows, empty }) {
    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ background: "#f8fafc" }}>
                        <th style={th}>Hora</th>
                        <th style={th}>Usuario (ID)</th>
                        <th style={th}>Importe</th>
                        <th style={th}>Pagó con</th>
                        <th style={th}>Vuelto</th>
                        <th style={th}>Método</th>
                        <th style={th}>Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (<tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#64748b" }}>{empty}</td></tr>)}
                    {rows.map(r => (
                        <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                            <td style={td}>{r.creado_en ? hora(r.creado_en) : "—"}</td>
                            <td style={td}>{r.creado_por_id != null ? `#${r.creado_por_id}` : "—"}</td>
                            <td style={td}>{moneda(r.importe)}</td>
                            <td style={td}>{r.paga_con != null ? moneda(r.paga_con) : "—"}</td>
                            <td style={td}>{r.vuelto != null ? moneda(Math.max(0, r.vuelto)) : "—"}</td>
                            <td style={td}>{r.metodo_pago}</td>
                            <td style={td}>{r.descripcion || "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TableSalidas({ rows, empty }) {
    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ background: "#f8fafc" }}>
                        <th style={th}>Hora</th>
                        <th style={th}>Importe</th>
                        <th style={th}>Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (<tr><td colSpan={3} style={{ padding: 16, textAlign: "center", color: "#64748b" }}>{empty}</td></tr>)}
                    {rows.map(r => (
                        <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                            <td style={td}>{r.creado_en ? hora(r.creado_en) : "—"}</td>
                            <td style={td}>{moneda(r.importe)}</td>
                            <td style={td}>{r.descripcion || "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TableEditados({ rows, empty }) {
    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ background: "#f8fafc" }}>
                        <th style={th}>Editado en</th>
                        <th style={th}>Movimiento ID</th>
                        <th style={th}>Editado por (ID)</th>
                        <th style={th}>Motivo</th>
                        <th style={th}>Snapshot previo (importe / método / desc)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (<tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#64748b" }}>{empty}</td></tr>)}
                    {rows.map(r => {
                        const s = r.snapshot_previo || {};
                        return (
                            <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                                <td style={td}>{r.editado_en ? new Date(r.editado_en).toLocaleString("es-AR") : "—"}</td>
                                <td style={td}>#{r.movimiento_id}</td>
                                <td style={td}>{r.editado_por_id != null ? `#${r.editado_por_id}` : "—"}</td>
                                <td style={td}>{r.motivo || "—"}</td>
                                <td style={td}>
                                    {`${s.importe != null ? moneda(s.importe) : "—"
                                        } / ${s.metodo_pago || "—"} / ${s.descripcion || "—"}`}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function TableBorrados({ rows, empty }) {
    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ background: "#f8fafc" }}>
                        <th style={th}>Borrado en</th>
                        <th style={th}>Movimiento ID</th>
                        <th style={th}>Borrado por (ID)</th>
                        <th style={th}>Motivo</th>
                        <th style={th}>Snapshot (tipo / importe / método / desc)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (<tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#64748b" }}>{empty}</td></tr>)}
                    {rows.map(r => {
                        const s = r.snapshot || {};
                        return (
                            <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                                <td style={td}>{r.borrado_en ? new Date(r.borrado_en).toLocaleString("es-AR") : "—"}</td>
                                <td style={td}>#{r.movimiento_id}</td>
                                <td style={td}>{r.borrado_por_id != null ? `#${r.borrado_por_id}` : "—"}</td>
                                <td style={td}>{r.motivo || "—"}</td>
                                <td style={td}>
                                    {`${s.tipo || "—"} / ${s.importe != null ? moneda(s.importe) : "—"} / ${s.metodo_pago || "—"} / ${s.descripcion || "—"}`}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
