import React, { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/appContext";

const turnoLabel = (t) => (t === "MANANA" ? "Mañana" : t === "TARDE" ? "Tarde" : "—");
const moneda = (n) => Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const hora = (iso) => {
    try { return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }); }
    catch { return "—"; }
};

// Fecha visible de un turno (YYYY-MM-DD)
const getFechaTurno = (t) =>
    t?.fecha
        ? String(t.fecha).slice(0, 10)
        : (t?.abierto_en ? String(t.abierto_en).slice(0, 10) : "");

// Mapa letra -> nombre (igual que en Caja)
const USUARIOS = { f: "Flor", y: "Yani", n: "Nico", r: "Ricardo" };

// De "Venta (f1234) - ..." o "Salida (y2222) - ..." extrae la letra
function parseUserLetterFromDesc(descripcion = "") {
    const m = /\(\s*([fyrn])\s*[a-zA-Z0-9]{3,5}\s*\)/i.exec(String(descripcion || ""));
    return m ? m[1].toLowerCase() : null;
}

// Nombre visible del autor a partir de la descripción del movimiento
function usuarioDesdeDescripcion(descripcion = "") {
    const letter = parseUserLetterFromDesc(descripcion);
    return letter ? (USUARIOS[letter] || letter.toUpperCase()) : "—";
}

// Normaliza username -> nombre (para logs de ediciones/borrados)
function nombreDesdeUsername(u = "") {
    const s = String(u || "").toLowerCase();
    if (s === "f" || s === "flor") return "Flor";
    if (s === "y" || s === "yani") return "Yani";
    if (s === "n" || s === "nico") return "Nico";
    if (s === "r" || s === "ricardo" || s === "ricardo_admin") return "Ricardo";
    return u || "—";
}

// Intenta sacar un nombre a partir de cualquier descripción disponible
function nombreDesdeCualquierDescripcion(r = {}) {
    const desc =
        r.descripcion ||
        r.detalle ||
        r.snapshot_previo?.descripcion ||
        r.snapshot?.descripcion ||
        "";
    const letter = parseUserLetterFromDesc(desc);
    return letter ? (USUARIOS[letter] || letter.toUpperCase()) : null;
}

// EDITADO POR: usa username/nombre si está; sino intenta desde la descripción; último recurso: #id
function nombreEditorDeLog(r = {}) {
    if (r.editado_por_nombre) return r.editado_por_nombre;
    if (r.editado_por_username) return nombreDesdeUsername(r.editado_por_username);
    if (r.editado_por) return nombreDesdeUsername(r.editado_por);
    if (r.editor) return nombreDesdeUsername(r.editor);

    const fromDesc = nombreDesdeCualquierDescripcion(r);
    if (fromDesc) return fromDesc;

    return r.editado_por_id != null ? `#${r.editado_por_id}` : "—";
}

// BORRADO POR: misma lógica
function nombreBorradorDeLog(r = {}) {
    if (r.borrado_por_nombre) return r.borrado_por_nombre;
    if (r.borrado_por_username) return nombreDesdeUsername(r.borrado_por_username);
    if (r.borrado_por) return nombreDesdeUsername(r.borrado_por);
    if (r.borrador) return nombreDesdeUsername(r.borrador);

    const fromDesc = nombreDesdeCualquierDescripcion(r);
    if (fromDesc) return fromDesc;

    return r.borrado_por_id != null ? `#${r.borrado_por_id}` : "—";
}


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
        const params = { estado: "CERRADO" };
        // (si tu backend ya filtra, dejamos estos por compatibilidad; si no, filtramos acá)
        if (fFecha) params.fecha = fFecha;
        if (fTurno) params.turno = fTurno;

        const res = await actions.cajaListarTurnos(params);

        let lista = res?.success ? (res.turnos || []) : [];

        // ✅ Filtro en frontend para asegurarnos:
        if (fFecha) {
            lista = lista.filter((t) => getFechaTurno(t) === fFecha);
        }
        if (fTurno) {
            lista = lista.filter((t) => t.turno === fTurno);
        }

        setTurnos(lista);
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

    // ⬇️ PONER DESPUÉS DE "ventas" y "salidas"

    // Totales por método
    const totalEfectivo = useMemo(
        () => ventas
            .filter(v => v.metodo_pago === "EFECTIVO")
            .reduce((a, b) => a + Number(b.importe || 0), 0),
        [ventas]
    );

    // Reemplaza el viejo "totalTransf" por este que incluye QR
    const totalTransferencias = useMemo(
        () => ventas
            .filter(v => v.metodo_pago?.startsWith("TRANSF") || v.metodo_pago === "QR")
            .reduce((a, b) => a + Number(b.importe || 0), 0),
        [ventas]
    );

    const totalDebito = useMemo(
        () => ventas
            .filter(v => v.metodo_pago === "DEBITO")
            .reduce((a, b) => a + Number(b.importe || 0), 0),
        [ventas]
    );

    const totalCredito = useMemo(
        () => ventas
            .filter(v => v.metodo_pago === "CREDITO")
            .reduce((a, b) => a + Number(b.importe || 0), 0),
        [ventas]
    );

    const totalSalidas = useMemo(
        () => salidas.reduce((a, b) => a + Number(b.importe || 0), 0),
        [salidas]
    );

    // Inicio de caja (si no viene monto_inicial_efectivo, suma denominaciones)
    const inicioTotal = useMemo(() => {
        const base = Number(sel?.monto_inicial_efectivo || 0);
        if (base > 0) return base;
        const den = detalle?.denominaciones || [];
        return den.reduce((acc, d) => acc + Number(d.importe_total || 0), 0);
    }, [sel, detalle]);

    // Total vendido (bruto): efectivo + transferencias (incl. QR) + débito + crédito
    const totalVentas = useMemo(
        () => Number(totalEfectivo + totalTransferencias + totalDebito + totalCredito),
        [totalEfectivo, totalTransferencias, totalDebito, totalCredito]
    );

    // Balance EFECTIVO: inicio + efectivo - salidas
    const balanceCaja = useMemo(
        () => Number((inicioTotal + totalEfectivo - totalSalidas).toFixed(2)),
        [inicioTotal, totalEfectivo, totalSalidas]
    );

    // Balance TOTAL: inicio + (todos los ingresos) - salidas
    const balanceCajaTotal = useMemo(
        () => Number((inicioTotal + totalVentas - totalSalidas).toFixed(2)),
        [inicioTotal, totalVentas, totalSalidas]
    );
    // Denominaciones para mostrar en la tabla de "Inicio de caja":
    // ocultamos la fila "20" si su importe_total es 0 (porque ya está sumado en "10")
    const denominacionesUI = useMemo(() => {
        const den = detalle?.denominaciones || [];
        return den.filter(d => !(String(d.etiqueta).trim() === "20" && Number(d.importe_total || 0) === 0));
    }, [detalle]);

    // (opcional) si querés renombrar la etiqueta "10" a "10 y 20", descomentar:
    const etiquetaUI = (etiqueta) => (String(etiqueta).trim() === "10" ? "10 y 20" : etiqueta);


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
                                <td style={td}>{getFechaTurno(t) || "—"}</td>
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
                                        {denominacionesUI.map(d => (
                                            <tr key={d.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                                                <td style={td}>{etiquetaUI(d.etiqueta)}</td>
                                                <td style={td}>{moneda(d.importe_total)}</td>
                                            </tr>
                                        ))}


                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Resumen rápido */}
                    {/* Resumen rápido (match con el componente padre) */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 10, marginTop: 12 }}>
                        <Box label="Inicio de caja" value={moneda(inicioTotal)} />
                        <Box label="Ventas Efectivo" value={moneda(totalEfectivo)} />
                        <Box label="Total Transferencias" value={moneda(totalTransferencias)} />
                        <Box label="Débito" value={moneda(totalDebito)} />
                        <Box label="Crédito" value={moneda(totalCredito)} />
                        <Box label="Total vendido (bruto)" value={moneda(totalVentas)} />
                        <Box label="Salidas" value={moneda(totalSalidas)} />

                        {/* Balance de EFECTIVO */}
                        <div style={{ background: "#0f766e", color: "white", borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 12, opacity: .9 }}>Balance Caja (efectivo)</div>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>{moneda(balanceCaja)}</div>
                        </div>

                        {/* Balance TOTAL */}
                        <div style={{ background: "#111827", color: "white", borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 12, opacity: .9 }}>Balance Caja (total)</div>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>{moneda(balanceCajaTotal)}</div>
                        </div>
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
                        <th style={th}>Usuario</th>
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
                            <td style={td}>{usuarioDesdeDescripcion(r.descripcion)} {r.creado_por_id != null ? `(#${r.creado_por_id})` : ""}</td>
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
                        <th style={th}>Usuario</th>
                        <th style={th}>Importe</th>
                        <th style={th}>Descripción</th>
                    </tr>
                </thead>

                <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={4} style={{ padding: 16, textAlign: "center", color: "#64748b" }}>{empty}</td>
                        </tr>
                    )}
                    {rows.map(r => (
                        <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                            <td style={td}>{r.creado_en ? hora(r.creado_en) : "—"}</td>
                            <td style={td}>
                                {usuarioDesdeDescripcion(r.descripcion)}
                                {r.creado_por_id != null ? ` (#${r.creado_por_id})` : ""}
                            </td>
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
                        <th style={th}>Editado por</th>
                        <th style={th}>Motivo</th>
                        <th style={th}>Snapshot previo (importe / método / desc)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => {
                        const s = r.snapshot_previo || {};
                        return (
                            <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                                <td style={td}>{r.editado_en ? new Date(r.editado_en).toLocaleString("es-AR") : "—"}</td>
                                <td style={td}>#{r.movimiento_id}</td>
                                <td style={td}>
                                    {nombreEditorDeLog(r)}{r.editado_por_id != null ? ` (#${r.editado_por_id})` : ""}
                                </td>
                                <td style={td}>{r.motivo || "—"}</td>
                                <td style={td}>
                                    {`${s.importe != null ? moneda(s.importe) : "—"} / ${s.metodo_pago || "—"} / ${s.descripcion || "—"}`}
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
                        <th style={th}>Borrado por</th>
                        <th style={th}>Motivo</th>
                        <th style={th}>Snapshot (tipo / importe / método / desc)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => {
                        const s = r.snapshot || {};
                        return (
                            <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                                <td style={td}>{r.borrado_en ? new Date(r.borrado_en).toLocaleString("es-AR") : "—"}</td>
                                <td style={td}>#{r.movimiento_id}</td>
                                <td style={td}>
                                    {nombreBorradorDeLog(r)}{r.borrado_por_id != null ? ` (#${r.borrado_por_id})` : ""}
                                </td>
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
