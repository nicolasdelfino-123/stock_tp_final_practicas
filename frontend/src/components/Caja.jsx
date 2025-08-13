import React, { useMemo, useState } from "react";

// Caja.jsx — versión moderna tipo cuaderno (ajustada para balance de EFECTIVO y discriminación de métodos)
// - Inicio de caja por IMPORTE (no cantidad), con 50 / 100+200 / 500 / 1000 / Otros (2000/10000)
// - Entradas rápidas: f2000 / y1500 / r1000 / n1200 (Flor, Yani, Ricardo, Nico)
// - "Paga con" opcional para calcular vuelto (solo informativo)
// - Método al lado de la entrada (Efectivo por defecto). Opciones:
//   Efectivo, Transferencia - Bancaria, Transferencia - Mercado Pago, Débito, Crédito
// - Salidas con descripción
// - Resumen discriminado: Efectivo, Transferencias (total), Débito, Crédito y Total Ventas general
// - Balance de CAJA (físico) = Inicio de caja + Ventas en EFECTIVO − Salidas
// - Ancho: deja ~5cm de margen a cada lado en pantallas grandes

const USUARIOS = { f: "Flor", y: "Yani", r: "Ricardo", n: "Nico" };
const METODOS = [
    "Efectivo",
    "Transferencia - Bancaria",
    "Transferencia - Mercado Pago",
    "Débito",
    "Crédito",
];

export default function Caja() {
    // Inicio de caja (importe por billetes)
    const [inicioCounts, setInicioCounts] = useState({ 50: 0, "100_200": 0, 500: 0, 1000: 0, otros: 0 });
    const inicioTotal = useMemo(() => (
        Number(inicioCounts[50] || 0) +
        Number(inicioCounts["100_200"] || 0) +
        Number(inicioCounts[500] || 0) +
        Number(inicioCounts[1000] || 0) +
        Number(inicioCounts["otros"] || 0)
    ), [inicioCounts]);

    // Ventas (ingresos)
    const [entradaRapida, setEntradaRapida] = useState(""); // ej: f2000
    const [pagaCon, setPagaCon] = useState(""); // opcional
    const [metodo, setMetodo] = useState("Efectivo");
    const [ventas, setVentas] = useState([]);

    // Salidas (gastos)
    const [salidaDesc, setSalidaDesc] = useState("");
    const [salidaImporte, setSalidaImporte] = useState("");
    const [salidas, setSalidas] = useState([]);

    // Totales discriminados por método
    const totalEfectivo = useMemo(() => ventas.filter(v => v.metodo === "Efectivo").reduce((a, v) => a + v.importe, 0), [ventas]);
    const totalTransferencias = useMemo(() => ventas.filter(v => v.metodo.startsWith("Transferencia")).reduce((a, v) => a + v.importe, 0), [ventas]);
    const totalDebito = useMemo(() => ventas.filter(v => v.metodo === "Débito").reduce((a, v) => a + v.importe, 0), [ventas]);
    const totalCredito = useMemo(() => ventas.filter(v => v.metodo === "Crédito").reduce((a, v) => a + v.importe, 0), [ventas]);
    const totalVentas = useMemo(() => totalEfectivo + totalTransferencias + totalDebito + totalCredito, [totalEfectivo, totalTransferencias, totalDebito, totalCredito]);

    const totalSalidas = useMemo(() => salidas.reduce((acc, s) => acc + s.importe, 0), [salidas]);
    const [balanceCaja, setBalanceCaja] = useState(0); // efectivo físico

    const moneda = (n) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
    const hora = (ts) => new Date(ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

    function parseEntradaRapida(txt) {
        // Acepta coma o punto: f2000, y1500.50, r1200, n1000, etc
        const m = /^\s*([fyrn])\s*(\d+(?:[.,]\d{1,2})?)\s*$/i.exec(txt);
        if (!m) return null;
        const usuario = USUARIOS[m[1].toLowerCase()];
        const importe = Number(String(m[2]).replace(",", "."));
        return { usuario, importe };
    }

    function agregarVenta() {
        const parsed = parseEntradaRapida(entradaRapida);
        if (!parsed) {
            alert("Formato inválido. Usá f2000 / y1500 / r1000 / n1200");
            return;
        }
        const pago = pagaCon ? Number(String(pagaCon).replace(",", ".")) : null;
        const vuelto = pago != null ? Number((pago - parsed.importe).toFixed(2)) : null;

        setVentas((prev) => [
            ...prev,
            { id: crypto.randomUUID(), usuario: parsed.usuario, importe: parsed.importe, pago, vuelto, metodo, ts: Date.now() },
        ]);
        setEntradaRapida("");
        setPagaCon("");
        setMetodo("Efectivo");
    }

    function eliminarVenta(id) {
        if (window.confirm("¿Eliminar venta?")) {
            setVentas((prev) => prev.filter((v) => v.id !== id));
        }
    }

    function agregarSalida() {
        const imp = Number(String(salidaImporte).replace(",", "."));
        if (!imp || imp <= 0) {
            alert("Importe de salida inválido");
            return;
        }
        setSalidas((prev) => [...prev, { id: crypto.randomUUID(), desc: salidaDesc.trim() || "Salida", importe: imp, ts: Date.now() }]);
        setSalidaDesc("");
        setSalidaImporte("");
    }

    function eliminarSalida(id) {
        if (window.confirm("¿Eliminar salida?")) {
            setSalidas((prev) => prev.filter((s) => s.id !== id));
        }
    }

    function calcBalance() {
        // Balance de EFECTIVO físico: inicio + entradas en efectivo − salidas
        setBalanceCaja(Number((inicioTotal + totalEfectivo - totalSalidas).toFixed(2)));
    }

    return (
        <div style={styles.wrap}>
            {/* Título */}
            <div style={styles.header}>
                <h2 style={{ margin: 0 }}>📒 Caja del día</h2>
                <small style={{ opacity: 0.7 }}>Atajos: f=Flor, y=Yani, r=Ricardo, n=Nico</small>
            </div>

            {/* Inicio de caja (importe por billetes) */}
            <section style={styles.card}>
                <div style={styles.cardHeader}>Inicio de caja (importe por billetes)</div>

                <div
                    style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target.classList.contains("inicio-input")) {
                            e.preventDefault();
                            const inputs = Array.from(e.currentTarget.querySelectorAll("input.inicio-input"));
                            const idx = inputs.indexOf(e.target);
                            const next = inputs[idx + 1];
                            if (next) next.focus();
                        }
                    }}
                >
                    {/* 50 */}
                    <div style={styles.countBox}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Importe en billetes de</div>
                        <div style={{ fontWeight: 800 }}>ARS 50</div>
                        <input
                            type="number"
                            min={0}
                            className="inicio-input"
                            value={inicioCounts[50] || 0}
                            onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }}
                            onBlur={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, 50: val })); }}
                            onChange={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, 50: val })); }}
                            style={styles.input}
                        />
                    </div>

                    {/* 100 y 200 combinados */}
                    <div style={styles.countBox}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Importe en billetes de</div>
                        <div style={{ fontWeight: 800 }}>ARS 100 y 200</div>
                        <input
                            type="number"
                            min={0}
                            className="inicio-input"
                            value={inicioCounts["100_200"] || 0}
                            onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }}
                            onBlur={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, "100_200": val })); }}
                            onChange={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, "100_200": val })); }}
                            style={styles.input}
                        />
                    </div>

                    {/* 500 */}
                    <div style={styles.countBox}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Importe en billetes de</div>
                        <div style={{ fontWeight: 800 }}>ARS 500</div>
                        <input
                            type="number"
                            min={0}
                            className="inicio-input"
                            value={inicioCounts[500] || 0}
                            onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }}
                            onBlur={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, 500: val })); }}
                            onChange={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, 500: val })); }}
                            style={styles.input}
                        />
                    </div>

                    {/* 1000 */}
                    <div style={styles.countBox}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Importe en billetes de</div>
                        <div style={{ fontWeight: 800 }}>ARS 1000</div>
                        <input
                            type="number"
                            min={0}
                            className="inicio-input"
                            value={inicioCounts[1000] || 0}
                            onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }}
                            onBlur={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, 1000: val })); }}
                            onChange={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, 1000: val })); }}
                            style={styles.input}
                        />
                    </div>

                    {/* Otros (2000/10000) */}
                    <div style={styles.countBox}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Importe en billetes</div>
                        <div style={{ fontWeight: 800 }}>Otros (2000 / 10000)</div>
                        <input
                            type="number"
                            min={0}
                            className="inicio-input"
                            value={inicioCounts["otros"] || 0}
                            onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }}
                            onBlur={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, otros: val })); }}
                            onChange={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, otros: val })); }}
                            style={styles.input}
                        />
                    </div>
                </div>

                <div style={{ marginTop: 10, fontWeight: 800 }}>Efectivo inicial: {moneda(inicioTotal)}</div>
            </section>

            {/* Entradas (Ventas) */}
            <section style={styles.card}>
                <div style={styles.cardHeader}>Entradas</div>
                <div style={{ ...styles.controlsRow, gridTemplateColumns: "2fr 1.6fr 1fr auto" }}>
                    <input
                        style={{ ...styles.input, border: '2px solid black' }}
                        placeholder="f2000 / y1500 / r1000 / n1200"
                        value={entradaRapida}
                        onChange={(e) => setEntradaRapida(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarVenta()}
                    />
                    <input
                        style={{ ...styles.input, border: "2px solid black" }}
                        placeholder="Paga con (opcional)"
                        value={pagaCon}
                        onChange={(e) => setPagaCon(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarVenta()}
                    />
                    <select
                        style={styles.input}
                        value={metodo}
                        onChange={(e) => setMetodo(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarVenta()}
                    >
                        {METODOS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <button style={styles.primaryBtn} onClick={agregarVenta}>Agregar</button>
                </div>

                <div style={styles.tableWrap}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Hora</th>
                                <th style={styles.th}>Usuario</th>
                                <th style={styles.th}>Importe</th>
                                <th style={styles.th}>Pagó con</th>
                                <th style={styles.th}>Vuelto</th>
                                <th style={styles.th}>Método</th>
                                <th style={styles.th}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.map((v) => (
                                <tr key={v.id}>
                                    <td style={styles.td}>{hora(v.ts)}</td>
                                    <td style={styles.td}>{v.usuario}</td>
                                    <td style={styles.td}>{moneda(v.importe)}</td>
                                    <td style={styles.td}>{v.pago != null ? moneda(v.pago) : "-"}</td>
                                    <td style={styles.td}>{v.vuelto != null ? moneda(Math.max(0, v.vuelto)) : "-"}</td>
                                    <td style={styles.td}>{v.metodo}</td>
                                    <td style={styles.tdRight}>
                                        <button style={styles.iconBtn} title="Eliminar" onClick={() => eliminarVenta(v.id)}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                            {ventas.length === 0 && (
                                <tr>
                                    <td style={styles.tdEmpty} colSpan={7}>Sin ventas registradas</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Salidas */}
            <section style={styles.card}>
                <div style={styles.cardHeader}>Salidas</div>
                <div style={{ ...styles.controlsRow, gridTemplateColumns: "2fr 1fr auto" }}>
                    <input
                        style={styles.input}
                        placeholder="Descripción (proveedor, gasto, etc.)"
                        value={salidaDesc}
                        onChange={(e) => setSalidaDesc(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarSalida()}
                    />
                    <input
                        style={styles.input}
                        placeholder="Importe"
                        value={salidaImporte}
                        onChange={(e) => setSalidaImporte(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarSalida()}
                    />
                    <button style={styles.warnBtn} onClick={agregarSalida}>Agregar salida</button>
                </div>

                <div style={styles.tableWrap}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Hora</th>
                                <th style={styles.th}>Descripción</th>
                                <th style={styles.th}>Importe</th>
                                <th style={styles.th}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {salidas.map((s) => (
                                <tr key={s.id}>
                                    <td style={styles.td}>{hora(s.ts)}</td>
                                    <td style={styles.td}>{s.desc}</td>
                                    <td style={styles.td}>{moneda(s.importe)}</td>
                                    <td style={styles.tdRight}>
                                        <button style={styles.iconBtn} title="Eliminar" onClick={() => eliminarSalida(s.id)}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                            {salidas.length === 0 && (
                                <tr>
                                    <td style={styles.tdEmpty} colSpan={4}>Sin salidas registradas</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Resumen y Balance */}
            <section style={styles.card}>
                <div style={styles.cardHeader}>Resumen</div>
                <div style={styles.summaryRow}>
                    <div style={styles.summaryBox}>
                        <div style={styles.summaryLabel}>Inicio de caja</div>
                        <div style={styles.summaryValue}>{moneda(inicioTotal)}</div>
                    </div>
                    <div style={styles.summaryBox}>
                        <div style={styles.summaryLabel}>Ventas Efectivo</div>
                        <div style={styles.summaryValue}>{moneda(totalEfectivo)}</div>
                    </div>
                    <div style={styles.summaryBox}>
                        <div style={styles.summaryLabel}>Total Transferencias</div>
                        <div style={styles.summaryValue}>{moneda(totalTransferencias)}</div>
                    </div>
                    <div style={styles.summaryBox}>
                        <div style={styles.summaryLabel}>Débito</div>
                        <div style={styles.summaryValue}>{moneda(totalDebito)}</div>
                    </div>
                    <div style={styles.summaryBox}>
                        <div style={styles.summaryLabel}>Crédito</div>
                        <div style={styles.summaryValue}>{moneda(totalCredito)}</div>
                    </div>
                    <div style={styles.summaryBox}>
                        <div style={styles.summaryLabel}>Total Ventas (general)</div>
                        <div style={styles.summaryValue}>{moneda(totalVentas)}</div>
                    </div>
                    <div style={{ ...styles.summaryBox, background: "#0f766e", color: "white" }}>
                        <div style={{ ...styles.summaryLabel, color: "#e0fffb" }}>Balance Caja (efectivo)</div>
                        <div style={styles.summaryValue}>{moneda(balanceCaja)}</div>
                    </div>
                    <button style={styles.primaryBtn} onClick={calcBalance}>Calcular balance</button>
                </div>
            </section>
        </div>
    );
}

const styles = {
    wrap: {
        width: "calc(100vw - 10cm)", // deja ~5cm por lado en pantallas grandes
        maxWidth: 1600,
        margin: "22px auto",
        padding: 66,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif",
    },
    header: {
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    card: {
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        boxShadow: "0 1px 2px rgba(0,0,0,.04)",
        marginBottom: 12,
    },
    cardHeader: { fontWeight: 800, marginBottom: 10 },
    controlsRow: { display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10 },
    input: {
        width: "100%",
        padding: "10px 12px",
        borderRadius: 20,
        border: "1px solid #cbd5e1",
        outline: "none",
        background: "#fff",
    },
    countBox: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 10,
    },
    primaryBtn: {
        padding: "10px 14px",
        borderRadius: 10,
        border: "none",
        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
        color: "white",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    warnBtn: {
        padding: "10px 14px",
        borderRadius: 10,
        border: "none",
        background: "linear-gradient(135deg, #d95c5c, #b83232)",
        color: "white",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    tableWrap: {
        overflowX: "auto",
        marginTop: 10,
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        background: "#fff",
    },
    table: {
        width: "100%",
        borderCollapse: "separate",
        borderSpacing: 0,
        background: "#fff",
    },
    th: {
        textAlign: "left",
        fontWeight: 700,
        padding: 10,
        background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
    },
    td: {
        padding: 10,
        borderBottom: "1px solid #eef2f7",
        background: "#fff",
    },
    tdRight: {
        padding: 10,
        borderBottom: "1px solid #eef2f7",
        textAlign: "right",
        background: "#fff",
    },
    tdEmpty: {
        padding: 16,
        textAlign: "center",
        color: "#64748b",
        background: "#fff",
    },
    iconBtn: {
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        background: "white",
        padding: "6px 8px",
        cursor: "pointer",
    },
    summaryRow: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
        gap: 10,
        alignItems: "stretch",
    },
    summaryBox: {
        background: "#0b1729",
        color: "#c7d2fe",
        borderRadius: 12,
        padding: 12,
    },
    summaryLabel: { fontSize: 12, opacity: 0.8 },
    summaryValue: { fontSize: 18, fontWeight: 800 },
};