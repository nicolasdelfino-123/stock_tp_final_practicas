import React, { useMemo, useState, useEffect } from "react";
import { useAppContext } from "../context/appContext";
import { useNavigate } from "react-router-dom";


// Usuarios “letra” -> nombre
const USUARIOS = { f: "Flor", y: "Yani", r: "Ricardo", n: "Nico" };
const METODOS = [
    "Efectivo",
    "Transferencia - Bancaria",
    "Transferencia - Mercado Pago",
    "Débito",
    "Crédito",
];

// Mapa letra -> username real (para PIN de 4 dígitos)
const LETTER_TO_USERNAME = { f: "flor", y: "yani", r: "ricardo", n: "nico" };

// Base de API
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";


/** ---------- Helpers de autenticación ---------- **/

/** Login de Ricardo ADMIN para APERTURA/CIERRE (password largo) */
async function pedirLoginRicardoAdmin(actions, titulo = "Autenticación requerida (Ricardo)") {
    const password = window.prompt(`${titulo}\nContraseña de Ricardo (ADMIN):`) || "";
    if (!password) return { ok: false, error: "Cancelado" };

    const r = await actions.cajaVerificarPassword({
        username: "ricardo_admin",
        password,            // password largo
    });

    if (r?.ok || r?.success) return { ok: true };
    return { ok: false, error: r?.error || r?.message || "Credenciales inválidas de Ricardo (ADMIN)" };
}


/** Login con letra+PIN de 4 dígitos (ej: f1234) para firmar movimientos/ediciones/borrados */
async function loginWithLetterAndPin(actions, letter, pin) {
    const username = String(letter || "").trim().toLowerCase(); // usa la letra directa
    // aceptar 4+ dígitos por si el PIN nuevo es más largo
    if (!username || !/^\d{4,}$/.test(pin || "")) {
        return { ok: false, error: "Formato de credenciales inválido (letra + PIN)" };
    }


    const r = await actions.cajaVerificarPassword({
        username,            // f / y / r / n  ← clave del fix
        password: pin,       // el action ya lo manda como pin4 al backend
    });

    if (r?.ok || r?.success) return { ok: true };
    return { ok: false, error: r?.error || r?.message || "Credenciales inválidas" };
}



/** f123420000 => { userLetter:'f', pass4:'1234', importe:Number } */
function parseLineaVenta(txt) {

    const m = /^\s*([fyrn])\s*(\d{4,})\s*(\d+(?:[.,]\d{1,2})?)\s*$/.exec(txt || "");

    if (!m) return null;
    return {
        userLetter: m[1].toLowerCase(),
        pass4: m[2],
        importe: Number(String(m[3]).replace(",", ".")),
    };
}

/** f1234 => { letter:'f', pin:'1234' } */
function parseCred(txt) {
    const m = /^\s*([fyrn])\s*(\d{4,})\s*$/.exec(txt || "");

    return m ? { letter: m[1].toLowerCase(), pin: m[2] } : null;
}


/** Crea o asegura un usuario con {username,password} en el backend.
 * Intenta endpoints comunes: /register, /api/users, /users (ajustable a tu backend).
 * Si el usuario ya existe, considera OK.
 */


/** Bootstrap inicial: crea 5 cuentas:
 * - ricardo_admin (password largo para apertura/cierre)
 * - ricardo, flor, yani, nico (cada uno con PIN de 4 dígitos como password)
 */
async function bootstrapUsuarios({ florPin, yaniPin, nicoPin, ricPin, ricAdminPass }, actions) {
    const r = await actions.cajaUsuariosBootstrap({
        florPin,
        yaniPin,
        nicoPin,
        ricPin,
        ricAdminPass,
    });
    return r.ok ? { success: true } : { success: false, error: r.error || "No se pudo crear usuarios" };
}

// Traducciones tolerantes para username
const USER_ALIASES = {
    f: ["f", "flor"],
    flor: ["flor", "f"],
    y: ["y", "yani"],
    yani: ["yani", "y"],
    n: ["n", "nico"],
    nico: ["nico", "n"],
    r: ["r", "ricardo"],
    ricardo: ["ricardo", "r"],
    ricardo_admin: ["ricardo_admin", "admin"],
    admin: ["admin", "ricardo_admin"],
};

// Reemplaza la función verifyCredsFlexible en tu componente por esta versión simplificada:

async function verifyCredsSimple({ username, password, isAdmin = false }) {
    try {
        const body = {
            username: username.toLowerCase(),
            password: password
        };

        const res = await fetch(`${API_BASE}/api/caja/passwords/verificar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data?.ok === true) {
            return { ok: true };
        }

        return { ok: false, error: data.error || "Credenciales inválidas" };

    } catch (e) {
        return { ok: false, error: e.message };
    }
}




/** ================= Componente caja ================= **/
export default function Caja() {
    const { store, actions } = useAppContext();
    // --- Descubre si hay un turno ABIERTO en el backend (post-refresh) ---
    const [turnoServer, setTurnoServer] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const navigate = useNavigate();


    function getAuthToken() {
        // ajustá si tu token vive en otro lado
        return store?.token || localStorage.getItem("token") || "";
    }

    async function syncTurnoAbierto() {
        try {
            const token = getAuthToken();
            const r = await fetch(
                `${API_BASE}/api/caja/turnos?estado=ABIERTO`,
                { headers: token ? { Authorization: `Bearer ${token}` } : {} }
            );
            const arr = await r.json();
            if (Array.isArray(arr) && arr.length > 0) setTurnoServer(arr[0]);
            else setTurnoServer(null);
        } catch (e) {
            // no rompas la UI si falla
        }
    }

    // al montar, sincroniza contra el backend
    useEffect(() => { syncTurnoAbierto(); }, []);


    // --------- Estados de setup y visibilidad ---------
    const [needsSetup, setNeedsSetup] = useState(true); // primera vez → mostrar setup
    const [showSetup, setShowSetup] = useState(false);
    const [showResumen, setShowResumen] = useState(false); // Resumen oculto hasta autenticación de cierre


    // campos del setup
    const [florPin, setFlorPin] = useState("");
    const [yaniPin, setYaniPin] = useState("");
    const [nicoPin, setNicoPin] = useState("");
    const [ricPin, setRicPin] = useState(""); // PIN 4 dígitos de Ricardo (para ventas/salidas)
    const [ricAdminPass, setRicAdminPass] = useState(""); // contraseña larga de Ricardo (ADMIN)
    const [selectedUser, setSelectedUser] = useState("");
    const [oldPass, setOldPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [showPassModal, setShowPassModal] = useState(false);
    const [resetFromZero, setResetFromZero] = useState(false);
    const [cajaFecha, setCajaFecha] = useState(() => new Date().toISOString().slice(0, 10)); // "YYYY-MM-DD"
    const [cajaTurno, setCajaTurno] = useState("MANANA"); // "MANANA" | "TARDE"







    // --------- Inicio de caja (importe por billetes) ---------
    const [inicioCounts, setInicioCounts] = useState({
        10: 0,
        20: 0,
        50: 0,
        "100_200": 0,
        500: 0,
        1000: 0,
        otros: 0,
    });
    const inicioTotal = useMemo(
        () =>
            Number(inicioCounts[10] || 0) +
            Number(inicioCounts[20] || 0) +
            Number(inicioCounts[50] || 0) +
            Number(inicioCounts["100_200"] || 0) +
            Number(inicioCounts[500] || 0) +
            Number(inicioCounts[1000] || 0) +
            Number(inicioCounts["otros"] || 0),
        [inicioCounts]
    );

    // --------- Entradas (Ventas) ---------
    const [entradaRapida, setEntradaRapida] = useState(""); // ej: f123420000
    const [pagaCon, setPagaCon] = useState(""); // opcional
    const [metodo, setMetodo] = useState("Efectivo");
    const [ventas, setVentas] = useState([]); // {id, dbId, usuario, userLetter, pass4, importe, pago, vuelto, metodo, ts}

    // --------- Salidas (Gastos) ---------
    const [salidaDesc, setSalidaDesc] = useState("");
    const [salidaImporte, setSalidaImporte] = useState("");
    const [salidaRespCode, setSalidaRespCode] = useState(""); // ej: f1234
    const [salidas, setSalidas] = useState([]); // {id, dbId, desc, importe, ts, respLetter, respPass4}

    // --------- Totales ---------
    const totalEfectivo = useMemo(
        () => ventas.filter((v) => v.metodo === "Efectivo").reduce((a, v) => a + v.importe, 0),
        [ventas]
    );
    const totalTransferencias = useMemo(
        () =>
            ventas
                .filter((v) => v.metodo.startsWith("Transferencia"))
                .reduce((a, v) => a + v.importe, 0),
        [ventas]
    );
    const totalDebito = useMemo(
        () => ventas.filter((v) => v.metodo === "Débito").reduce((a, v) => a + v.importe, 0),
        [ventas]
    );
    const totalCredito = useMemo(
        () => ventas.filter((v) => v.metodo === "Crédito").reduce((a, v) => a + v.importe, 0),
        [ventas]
    );
    const totalVentas = useMemo(
        () => totalEfectivo + totalTransferencias + totalDebito + totalCredito,
        [totalEfectivo, totalTransferencias, totalDebito, totalCredito]
    );

    const totalSalidas = useMemo(() => salidas.reduce((acc, s) => acc + s.importe, 0), [salidas]);

    // --------- Balance EFECTIVO ---------
    const balanceCaja = useMemo(
        () => Number((inicioTotal + totalEfectivo - totalSalidas).toFixed(2)),
        [inicioTotal, totalEfectivo, totalSalidas]
    );

    // --------- Balance TOTAL (ingresos por todos los métodos - salidas) ---------
    const balanceCajaTotal = useMemo(
        () => Number((totalEfectivo + totalTransferencias + totalDebito + totalCredito - totalSalidas).toFixed(2)),
        [totalEfectivo, totalTransferencias, totalDebito, totalCredito, totalSalidas]
    );

    // --------- Turno ---------
    const turnoId = (store?.turnoActual?.id || turnoServer?.id) || null;
    const turnoAbierto = !!turnoId;

    const moneda = (n) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
    const hora = (ts) =>
        new Date(ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

    async function bootstrapSiHaceFalta() {
        const r = await actions.cajaUsuariosBootstrap({
            flor: { username: "flor", password: "1111" },
            yani: { username: "yani", password: "2222" },
            ricardo: { username: "ricardo", password: "3333" },
            nico: { username: "nico", password: "4444" },
            ricardo_admin: { username: "ricardo_admin", password: "R-2024-CAJA!!" },
        });
        if (r?.error && !r?.success && !r?.ok) {
            alert("Bootstrap: " + r.error);
        }
    }



    /** ---------- Apertura / Cierre ---------- **/

    async function iniciarCaja() {
        // Si ya hay uno abierto (local o detectado en servidor), no dejes abrir
        if (turnoAbierto) {
            alert("Ya hay una caja abierta. Debés cerrarla primero.");
            return;
        }

        // Primera vez → mostrar setup
        if (needsSetup) {
            setShowSetup(true);
            return;
        }

        // Autenticación (Ricardo ADMIN, password largo)
        const auth = await pedirLoginRicardoAdmin(actions, "Iniciar caja");
        if (!auth.ok) {
            alert(auth.error || "No autenticado");
            return;
        }

        // Denominaciones para backend
        const denominaciones = [
            { etiqueta: "10", importe_total: Number(inicioCounts[10] || 0) },
            { etiqueta: "20", importe_total: Number(inicioCounts[20] || 0) },
            { etiqueta: "50", importe_total: Number(inicioCounts[50] || 0) },
            { etiqueta: "100_200", importe_total: Number(inicioCounts["100_200"] || 0) },
            { etiqueta: "500", importe_total: Number(inicioCounts[500] || 0) },
            { etiqueta: "1000", importe_total: Number(inicioCounts[1000] || 0) },
            { etiqueta: "otros", importe_total: Number(inicioCounts["otros"] || 0) },
        ];

        // Código del turno
        const codigo = new Date()
            .toISOString()
            .slice(0, 16)
            .replace(/[-:T]/g, "")
            .replace(/^(\d{8})(\d{4}).*$/, "$1-$2"); // YYYYMMDD-HHMM

        const res = await actions.cajaAbrirTurno({
            codigo,
            observacion: "Apertura desde componente",
            denominaciones,
            fecha: cajaFecha,        // NUEVO
            turno: cajaTurno,        // NUEVO
        });


        if (res?.success) {
            alert("Turno abierto.");
        } else {
            // si la API respondió que ya hay un turno abierto, sincroniza y avisa
            const msg = (res?.error || "").toString();
            if (/ABIERTO/i.test(msg)) {
                await syncTurnoAbierto();
                alert("Ya existe una caja abierta. Cerrala primero.");
            } else {
                // fallback genérico
                await syncTurnoAbierto(); // por si se abrió desde otro navegador
                alert(res?.error || "No se pudo abrir el turno");
            }
        }
    }

    // Click en "Cerrar caja" → pedir pass de Ricardo ADMIN, mostrar Resumen y habilitar "Confirmar cierre"
    async function pedirMostrarResumenCierre() {
        // Si la app no cree que hay turno, chequeá en el backend antes de bloquear
        if (!turnoAbierto) {
            await syncTurnoAbierto();
            if (!turnoServer?.id) {
                alert("No hay turno abierto.");
                return;
            }
        }

        if (!turnoAbierto) {
            alert("No hay turno abierto.");
            return;
        }
        const auth = await pedirLoginRicardoAdmin(actions, "Cerrar caja (mostrar resumen)");
        if (!auth.ok) {
            alert(auth.error || "No autenticado");
            return;
        }
        setShowResumen(true);
    }

    async function confirmarCierreCaja() {
        if (!turnoAbierto) {
            await syncTurnoAbierto();
            if (!turnoServer?.id) {
                alert("No hay turno abierto.");
                return;
            }
        }

        if (!turnoAbierto) {
            alert("No hay turno abierto.");
            return;
        }
        // por seguridad, revalidamos
        const auth = await pedirLoginRicardoAdmin(actions, "Confirmar cierre de caja");
        if (!auth.ok) {
            alert(auth.error || "No autenticado");
            return;
        }
        const res = await actions.cajaCerrarTurno(turnoId, {
            efectivo_contado: balanceCaja,
            observacion: "Cierre desde componente",
        });
        if (res?.success) {
            alert("Turno cerrado.");
            setShowResumen(false);
            setTurnoServer(null);

        } else {
            alert(res?.error || "No se pudo cerrar el turno");
        }
    }

    /** ---------- Entradas ---------- **/
    async function agregarVenta() {
        if (!turnoAbierto) {
            alert("Primero iniciá la caja.");
            return;
        }
        const parsed = parseLineaVenta(entradaRapida);
        if (!parsed) {
            alert("Formato inválido. Usá f123420000 (letra + 4 dígitos + importe).");
            return;
        }

        // Autenticar autor con letra+PIN (firma)
        const auth = await loginWithLetterAndPin(actions, parsed.userLetter, parsed.pass4);
        if (!auth.ok) {
            alert(auth.error || "Credenciales inválidas");
            return;
        }

        const pago = pagaCon ? Number(String(pagaCon).replace(",", ".")) : null;
        const vuelto = pago != null ? Number((pago - parsed.importe).toFixed(2)) : null;

        const res = await actions.cajaCrearMovimiento({
            turno_id: turnoId,
            tipo: "VENTA",
            metodo_pago: metodo,
            importe: parsed.importe,
            descripcion: `Venta (${parsed.userLetter}${parsed.pass4})`,
            paga_con: pago,
            vuelto: vuelto,
        });
        if (!res?.success) {
            alert(res?.error || "No se pudo registrar la venta");
            return;
        }
        const dbId = res.movimiento?.id;

        setVentas((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                dbId,
                usuario: USUARIOS[parsed.userLetter],
                userLetter: parsed.userLetter,
                pass4: parsed.pass4,
                importe: parsed.importe,
                pago,
                vuelto,
                metodo,
                ts: Date.now(),
            },
        ]);
        setEntradaRapida("");
        setPagaCon("");
        setMetodo("Efectivo");
    }

    async function editarVenta(row) {
        const credTxt = window.prompt(`Credencial del autor (ej ${row.userLetter}1234):`);
        const cred = parseCred(credTxt);
        if (!cred) {
            alert("Formato inválido (usa letra + 4 dígitos)");
            return;
        }

        // 🔒 NUEVO: el que edita debe ser el MISMO autor del registro
        if (cred.letter !== row.userLetter || cred.pin !== row.pass4) {
            alert("Solo puede editarlo quien lo registró con su PIN original.");
            return;
        }

        const auth = await loginWithLetterAndPin(actions, cred.letter, cred.pin);
        if (!auth.ok) {
            alert(auth.error || "Credenciales inválidas");
            return;
        }

        const nuevo = window.prompt(`Nuevo importe (actual ${moneda(row.importe)}):`, String(row.importe));
        if (!nuevo) return;
        const nuevoImporte = Number(String(nuevo).replace(",", "."));
        if (!(nuevoImporte > 0)) {
            alert("Importe inválido");
            return;
        }

        if (row.dbId) {
            const r = await actions.cajaEditarMovimiento(row.dbId, {
                importe: nuevoImporte,
                motivo: "Edición desde componente",
            });
            if (!r?.success) {
                alert(r?.error || "No se pudo editar en backend");
                return;
            }
        }

        setVentas((prev) => prev.map((v) => (v.id === row.id ? { ...v, importe: nuevoImporte } : v)));
    }


    async function eliminarVenta(row) {
        const credTxt = window.prompt(`Credencial para eliminar (ej ${row.userLetter}1234):`);
        const cred = parseCred(credTxt);
        if (!cred) {
            alert("Formato inválido (letra + 4 dígitos)");
            return;
        }

        // 🔒 NUEVO: solo el autor original puede borrar
        if (cred.letter !== row.userLetter || cred.pin !== row.pass4) {
            alert("Solo puede eliminarlo quien lo registró con su PIN original.");
            return;
        }

        const auth = await loginWithLetterAndPin(actions, cred.letter, cred.pin);
        if (!auth.ok) {
            alert(auth.error || "Credenciales inválidas");
            return;
        }
        if (!window.confirm("¿Eliminar venta?")) return;

        if (row.dbId) {
            const r = await actions.cajaBorrarMovimiento(row.dbId, "Eliminado desde componente");
            if (!r?.success) {
                alert(r?.error || "No se pudo eliminar en backend");
                return;
            }
        }
        setVentas((prev) => prev.filter((v) => v.id !== row.id));
    }


    /** ---------- Salidas ---------- **/
    async function agregarSalida() {
        if (!turnoAbierto) {
            alert("Primero iniciá la caja.");
            return;
        }
        const imp = Number(String(salidaImporte).replace(",", "."));
        if (!imp || imp <= 0) {
            alert("Importe de salida inválido");
            return;
        }
        const cred = parseCred(salidaRespCode);
        if (!cred) {
            alert("Responsable inválido. Usá f1234 / y1234 / r1234 / n1234");
            return;
        }
        const auth = await loginWithLetterAndPin(actions, cred.letter, cred.pin);
        if (!auth.ok) {
            alert(auth.error || "Credenciales inválidas");
            return;
        }

        const res = await actions.cajaCrearMovimiento({
            turno_id: turnoId,
            tipo: "SALIDA",
            metodo_pago: "Efectivo",
            importe: imp,
            descripcion: `Salida (${cred.letter}${cred.pin}) - ${salidaDesc || "Salida"}`,
        });
        if (!res?.success) {
            alert(res?.error || "No se pudo registrar la salida");
            return;
        }
        const dbId = res.movimiento?.id;

        setSalidas((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                dbId,
                desc: salidaDesc.trim() || "Salida",
                importe: imp,
                ts: Date.now(),
                respLetter: cred.letter,
                respPass4: cred.pin,
            },
        ]);
        setSalidaDesc("");
        setSalidaImporte("");
        setSalidaRespCode("");
    }

    async function editarSalida(row) {
        const credTxt = window.prompt(`Credencial del responsable (ej ${row.respLetter}1234):`);
        const cred = parseCred(credTxt);
        if (!cred) {
            alert("Formato inválido (letra + 4 dígitos)");
            return;
        }

        // 🔒 NUEVO: solo el responsable original puede editar
        if (cred.letter !== row.respLetter || cred.pin !== row.respPass4) {
            alert("Solo puede editarla quien la registró con su PIN original.");
            return;
        }

        const auth = await loginWithLetterAndPin(actions, cred.letter, cred.pin);
        if (!auth.ok) {
            alert(auth.error || "Credenciales inválidas");
            return;
        }

        const nuevo = window.prompt(`Nuevo importe (actual ${moneda(row.importe)}):`, String(row.importe));
        if (!nuevo) return;
        const nuevoImporte = Number(String(nuevo).replace(",", "."));
        if (!(nuevoImporte > 0)) {
            alert("Importe inválido");
            return;
        }

        if (row.dbId) {
            const r = await actions.cajaEditarMovimiento(row.dbId, {
                importe: nuevoImporte,
                motivo: "Edición salida",
            });
            if (!r?.success) {
                alert(r?.error || "No se pudo editar en backend");
                return;
            }
        }

        setSalidas((prev) => prev.map((s) => (s.id === row.id ? { ...s, importe: nuevoImporte } : s)));
    }


    async function eliminarSalida(row) {
        const credTxt = window.prompt(`Credencial para eliminar (ej ${row.respLetter}1234):`);
        const cred = parseCred(credTxt);
        if (!cred) {
            alert("Formato inválido (letra + 4 dígitos)");
            return;
        }

        // 🔒 NUEVO: solo el responsable original puede borrar
        if (cred.letter !== row.respLetter || cred.pin !== row.respPass4) {
            alert("Solo puede eliminarla quien la registró con su PIN original.");
            return;
        }

        const auth = await loginWithLetterAndPin(actions, cred.letter, cred.pin);
        if (!auth.ok) {
            alert(auth.error || "Credenciales inválidas");
            return;
        }
        if (!window.confirm("¿Eliminar salida?")) return;

        if (row.dbId) {
            const r = await actions.cajaBorrarMovimiento(row.dbId, "Eliminado salida");
            if (!r?.success) {
                alert(r?.error || "No se pudo eliminar en backend");
                return;
            }
        }
        setSalidas((prev) => prev.filter((s) => s.id !== row.id));
    }
    const styles = {
        wrap: {
            width: "calc(100vw - 1cm)",
            maxWidth: 1600,
            margin: "0px auto",
            padding: 66,
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif",
            background: isDarkMode ? '#1f2937' : '#ffffff',
            color: isDarkMode ? '#f9fafb' : '#111827',
            minHeight: '100vh',
            transition: 'all 0.3s ease'
        },
        header: {
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 8,
        },
        card: {
            background: isDarkMode ? '#374151' : '#fff',
            border: `1px solid ${isDarkMode ? '#4b5563' : '#e2e8f0'}`,
            borderRadius: 12,
            padding: 12,
            boxShadow: isDarkMode ? "0 1px 2px rgba(0,0,0,.2)" : "0 1px 2px rgba(0,0,0,.04)",
            marginBottom: 12,
            color: isDarkMode ? '#f9fafb' : '#111827',
            transition: 'all 0.3s ease'
        },
        cardHeader: {
            fontWeight: 800,
            marginBottom: 10,
            color: isDarkMode ? '#f9fafb' : '#111827'
        },
        controlsRow: {
            display: "grid",
            gridTemplateColumns: "2fr 1fr auto",
            gap: 10,
        },
        input: {
            width: "100%",
            padding: "10px 12px",
            borderRadius: 20,
            border: `1px solid ${isDarkMode ? '#4b5563' : '#cbd5e1'}`,
            outline: "none",
            background: isDarkMode ? '#4b5563' : '#97c8d7ff',
            color: isDarkMode ? '#f9fafb' : '#111827',
            transition: 'all 0.3s ease'
        },
        countBox: {
            background: isDarkMode ? '#4b5563' : '#f8fafc',
            border: `1px solid ${isDarkMode ? '#6b7280' : '#e2e8f0'}`,
            borderRadius: 10,
            padding: 10,
            color: isDarkMode ? '#f9fafb' : '#111827',
            transition: 'all 0.3s ease'
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
            transition: 'all 0.3s ease'
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
            transition: 'all 0.3s ease'
        },
        tableWrap: {
            overflowX: "auto",
            marginTop: 10,
            borderRadius: 10,
            border: `1px solid ${isDarkMode ? '#4b5563' : '#e2e8f0'}`,
            background: isDarkMode ? '#374151' : '#fff',
            transition: 'all 0.3s ease'
        },
        table: {
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            background: isDarkMode ? '#374151' : '#fff',
        },
        th: {
            textAlign: "left",
            fontWeight: 700,
            padding: 10,
            background: isDarkMode ? '#4b5563' : '#f8fafc',
            borderBottom: `1px solid ${isDarkMode ? '#6b7280' : '#e2e8f0'}`,
            color: isDarkMode ? '#f9fafb' : '#111827',
            transition: 'all 0.3s ease'
        },
        td: {
            padding: 10,
            borderBottom: `1px solid ${isDarkMode ? '#4b5563' : '#eef2f7'}`,
            background: isDarkMode ? '#374151' : '#fff',
            color: isDarkMode ? '#f9fafb' : '#111827',
            transition: 'all 0.3s ease'
        },
        tdRight: {
            padding: 10,
            borderBottom: `1px solid ${isDarkMode ? '#4b5563' : '#eef2f7'}`,
            textAlign: "right",
            background: isDarkMode ? '#374151' : '#fff',
            color: isDarkMode ? '#f9fafb' : '#111827',
            transition: 'all 0.3s ease'
        },
        tdEmpty: {
            padding: 16,
            textAlign: "center",
            color: isDarkMode ? '#9ca3af' : '#64748b',
            background: isDarkMode ? '#374151' : '#fff',
            transition: 'all 0.3s ease'
        },
        iconBtn: {
            border: `1px solid ${isDarkMode ? '#4b5563' : '#e2e8f0'}`,
            borderRadius: 8,
            background: isDarkMode ? '#4b5563' : 'white',
            color: isDarkMode ? '#f9fafb' : '#111827',
            padding: "6px 8px",
            cursor: "pointer",
            transition: 'all 0.3s ease'
        },
        summaryRow: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: 10,
            alignItems: "stretch",
        },
        summaryBox: {
            background: isDarkMode ? '#1f2937' : '#0b1729',
            color: isDarkMode ? '#e5e7eb' : '#c7d2fe',
            borderRadius: 12,
            padding: 12,
            transition: 'all 0.3s ease'
        },
        summaryLabel: {
            fontSize: 12,
            opacity: 0.8
        },
        summaryValue: {
            fontSize: 18,
            fontWeight: 800
        },
    };

    /** ---------- BLOQUE RETURN ---------- **/
    return (
        <div style={styles.wrap}>
            {/* Cambiar contraseñas */}
            <div style={{ top: 70, right: 20, zIndex: 1000 }}>
                <select
                    style={styles.input}
                    value={selectedUser}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                            setSelectedUser(val);
                            setShowPassModal(true);
                        }
                    }}
                >
                    <option value="">Cambiar contraseña…</option>
                    <option value="ricardo_admin">Ricardo (ADMIN)</option>
                    <option value="r">Ricardo (user)</option>
                    <option value="f">Flor</option>
                    <option value="y">Yani</option>
                    <option value="n">Nico</option>
                </select>
            </div>

            <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
                <button
                    style={{
                        ...styles.iconBtn,
                        padding: '10px',
                        fontSize: '18px',
                        borderRadius: '50%',
                        background: isDarkMode ? '#374151' : '#f3f4f6',
                        color: isDarkMode ? '#f9fafb' : '#111827'
                    }}
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    title={isDarkMode ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
                >
                    {isDarkMode ? '☀️' : '🌙'}
                </button>


            </div>
            {/* Inicio de caja */}
            <section style={styles.card}>
                <div style={{ ...styles.cardHeader, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Inicio de caja (importe por billetes)</span>
                    <div style={{ display: "flex", gap: 8 }}>
                        {!turnoAbierto && (
                            <button style={styles.primaryBtn} onClick={iniciarCaja}>
                                Iniciar caja
                            </button>
                        )}
                        {turnoAbierto && (
                            <span style={{ fontWeight: 700, color: isDarkMode ? "#f7f8f8ff" : "#0f766e" }}>
                                Turno abierto #{turnoId}
                            </span>
                        )}
                    </div>
                </div>

                {/* Bloque de SETUP inicial (primera vez) */}
                {showSetup && (
                    <div style={{ ...styles.countBox, borderColor: "#1d4ed8" }}>
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>Configurar usuarios (primera vez)</div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                            <div>
                                <div style={{ fontSize: 12, opacity: 0.75 }}>Flor — PIN (4 dígitos)</div>
                                <input style={styles.input} value={florPin} onChange={(e) => setFlorPin(e.target.value)} placeholder="Ej: 1234" />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, opacity: 0.75 }}>Yani — PIN (4 dígitos)</div>
                                <input style={styles.input} value={yaniPin} onChange={(e) => setYaniPin(e.target.value)} placeholder="Ej: 4321" />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, opacity: 0.75 }}>Nico — PIN (4 dígitos)</div>
                                <input style={styles.input} value={nicoPin} onChange={(e) => setNicoPin(e.target.value)} placeholder="Ej: 5678" />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, opacity: 0.75 }}>Ricardo — PIN (4 dígitos) (para ingresos/salidas)</div>
                                <input style={styles.input} value={ricPin} onChange={(e) => setRicPin(e.target.value)} placeholder="Ej: 2468" />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, opacity: 0.75 }}>Ricardo ADMIN — Contraseña larga (apertura/cierre)</div>
                                <input style={styles.input} value={ricAdminPass} onChange={(e) => setRicAdminPass(e.target.value)} placeholder="Mín. 6 caracteres" />
                            </div>
                        </div>

                        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                            <button
                                style={styles.primaryBtn}
                                onClick={async () => {
                                    const r = await bootstrapUsuarios({ florPin, yaniPin, nicoPin, ricPin, ricAdminPass }, actions);
                                    if (r.success) {
                                        setNeedsSetup(false);
                                        setShowSetup(false);
                                        alert("Usuarios configurados. Ahora podés iniciar la caja.");
                                    } else {
                                        alert(r.error || "No se pudo configurar usuarios.");
                                    }
                                }}

                            >
                                Crear usuarios
                            </button>
                            <button
                                style={{ ...styles.iconBtn, padding: "10px 12px" }}
                                onClick={() => {
                                    setNeedsSetup(false);
                                    setShowSetup(false);
                                }}
                                title="Si ya están creados en tu DB"
                            >
                                Ya están creados
                            </button>
                        </div>
                    </div>
                )}

                {/* Inputs de inicio */}
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
                    {/* 10 */}
                    <div style={styles.countBox}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Importe en billetes de</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                            <div>
                                <div style={{ fontSize: 12, opacity: 0.75 }}>Fecha de caja</div>
                                <input
                                    type="date"
                                    style={styles.input}
                                    value={cajaFecha}
                                    onChange={(e) => setCajaFecha(e.target.value)}
                                    disabled={turnoAbierto}
                                />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, opacity: 0.75 }}>Turno</div>
                                <select
                                    style={styles.input}
                                    value={cajaTurno}
                                    onChange={(e) => setCajaTurno(e.target.value)}
                                    disabled={turnoAbierto}
                                >
                                    <option value="MANANA">Mañana</option>
                                    <option value="TARDE">Tarde</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ fontWeight: 800 }}>ARS 10</div>
                        <input
                            type="number"
                            min={0}
                            className="inicio-input"
                            value={inicioCounts[10] || 0}
                            onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }}
                            onBlur={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, 10: val })); }}
                            onChange={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, 10: val })); }}
                            style={styles.input}
                        />
                    </div>

                    {/* 20 */}
                    <div style={styles.countBox}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Importe en billetes de</div>
                        <div style={{ fontWeight: 800 }}>ARS 20</div>
                        <input
                            type="number"
                            min={0}
                            className="inicio-input"
                            value={inicioCounts[20] || 0}
                            onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }}
                            onBlur={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, 20: val })); }}
                            onChange={(e) => { const val = e.target.value === "" ? 0 : Number(e.target.value); setInicioCounts((p) => ({ ...p, 20: val })); }}
                            style={styles.input}
                        />
                    </div>

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

                    {/* 100 y 200 */}
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

                <div style={{ marginTop: 10, fontWeight: 800 }}>
                    Efectivo inicial: {moneda(inicioTotal)}
                </div>
            </section>

            {/* Entradas (Ventas) */}
            <section style={styles.card}>
                <div style={styles.cardHeader}>Entradas</div>
                <div style={{ ...styles.controlsRow, gridTemplateColumns: "2fr 1.6fr 1fr auto" }}>
                    <input
                        style={{ ...styles.input, border: "2px solid black" }}
                        placeholder="f1234 2000 / f12345 2000 (letra + PIN + importe)"
                        value={entradaRapida}
                        onChange={(e) => setEntradaRapida(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarVenta()}
                        disabled={!turnoAbierto}
                    />
                    <input
                        style={{ ...styles.input, border: "2px solid black" }}
                        placeholder="Paga con (opcional)"
                        value={pagaCon}
                        onChange={(e) => setPagaCon(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarVenta()}
                        disabled={!turnoAbierto}
                    />
                    <select
                        style={styles.input}
                        value={metodo}
                        onChange={(e) => setMetodo(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarVenta()}
                        disabled={!turnoAbierto}
                    >
                        {METODOS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <button style={styles.primaryBtn} onClick={agregarVenta} disabled={!turnoAbierto}>
                        Agregar
                    </button>
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
                                        <button style={styles.iconBtn} title="Editar" onClick={() => editarVenta(v)}>✏️</button>{" "}
                                        <button style={styles.iconBtn} title="Eliminar" onClick={() => eliminarVenta(v)}>🗑️</button>
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
                <div style={{ ...styles.controlsRow, gridTemplateColumns: "2fr 1fr 1fr auto" }}>
                    <input
                        style={styles.input}
                        placeholder="Descripción (proveedor, gasto, etc.)"
                        value={salidaDesc}
                        onChange={(e) => setSalidaDesc(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarSalida()}
                        disabled={!turnoAbierto}
                    />
                    <input
                        style={styles.input}
                        placeholder="Importe"
                        value={salidaImporte}
                        onChange={(e) => setSalidaImporte(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarSalida()}
                        disabled={!turnoAbierto}
                    />
                    <input
                        style={styles.input}
                        placeholder="Responsable (f1234 / y1234 / r1234 / n1234)"
                        value={salidaRespCode}
                        onChange={(e) => setSalidaRespCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarSalida()}
                        disabled={!turnoAbierto}
                    />
                    <button style={styles.warnBtn} onClick={agregarSalida} disabled={!turnoAbierto}>
                        Agregar salida
                    </button>
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
                                        <button style={styles.iconBtn} title="Editar" onClick={() => editarSalida(s)}>✏️</button>{" "}
                                        <button style={styles.iconBtn} title="Eliminar" onClick={() => eliminarSalida(s)}>🗑️</button>
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

            {/* Cierre / Resumen (OCULTO hasta pass de Ricardo ADMIN) */}
            <section style={styles.card}>
                <div style={styles.cardHeader}>Cierre</div>

                {!showResumen && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button style={styles.primaryBtn} onClick={pedirMostrarResumenCierre} disabled={!turnoAbierto}>
                            Cerrar caja
                        </button>
                    </div>
                )}
                {showResumen && (
                    <>
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
                                <div style={styles.summaryLabel}>Salidas</div>
                                <div style={styles.summaryValue}>{moneda(totalSalidas)}</div>
                            </div>

                            {/* Balance de EFECTIVO */}
                            <div style={{ ...styles.summaryBox, background: "#0f766e", color: "white" }}>
                                <div style={{ ...styles.summaryLabel, color: "#e0fffb" }}>
                                    Balance Caja (efectivo)
                                </div>
                                <div style={styles.summaryValue}>{moneda(balanceCaja)}</div>
                            </div>

                            {/* Balance TOTAL = efectivo + transf + débito + crédito - salidas */}
                            <div style={{ ...styles.summaryBox, background: "#111827", color: "white" }}>
                                <div style={{ ...styles.summaryLabel, color: "#cbd5e1" }}>
                                    Balance Caja (total)
                                </div>
                                <div style={styles.summaryValue}>
                                    {moneda(
                                        Number(
                                            (
                                                inicioTotal +
                                                totalEfectivo +
                                                totalTransferencias +
                                                totalDebito +
                                                totalCredito -
                                                totalSalidas
                                            ).toFixed(2)
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                            <button
                                style={styles.iconBtn}
                                onClick={() => setShowResumen(false)}
                                title="Ocultar resumen"
                            >
                                Ocultar resumen
                            </button>

                            {/* NUEVO: aparece sólo cuando showResumen es true (tras pass de ADMIN) */}
                            <button
                                style={styles.iconBtn}
                                onClick={() => navigate("/historial-cajas")}
                                title="Ver historial de cajas (ir a HistorialCajas)"
                            >
                                Ver historial
                            </button>

                            <button style={styles.primaryBtn} onClick={confirmarCierreCaja} disabled={!turnoAbierto}>
                                Confirmar cierre ahora
                            </button>
                        </div>
                    </>
                )}

            </section>
            {showPassModal && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0,
                    width: "100vw", height: "100vh",
                    background: "rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 2000
                }}>
                    <div style={{
                        background: isDarkMode ? "#1f2937" : "white",
                        color: isDarkMode ? "#f9fafb" : "#111827",
                        padding: 20,
                        borderRadius: 12,
                        width: "90%", maxWidth: 400
                    }}>
                        <h3 style={{ marginBottom: 12 }}>Cambiar contraseña: {selectedUser}</h3>

                        <input
                            style={{ ...styles.input, marginBottom: 10 }}
                            type="password"
                            placeholder="Contraseña/PIN actual"
                            value={oldPass}
                            onChange={(e) => setOldPass(e.target.value)}
                        />
                        <input
                            style={{ ...styles.input, marginBottom: 10 }}
                            type="password"
                            placeholder="Nueva contraseña/PIN"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                        />
                        <div style={{ marginBottom: 10 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                                <input
                                    type="checkbox"
                                    checked={resetFromZero}
                                    onChange={(e) => setResetFromZero(e.target.checked)}
                                    disabled={selectedUser === "ricardo_admin"} // ADMIN no puede saltar verificación
                                />
                                Crear nueva contraseña desde cero (sin recordar la anterior)
                            </label>
                            {selectedUser === "ricardo_admin" && (
                                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                                    Para Ricardo ADMIN siempre se exige la contraseña actual.
                                </div>
                            )}
                        </div>


                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button
                                style={styles.iconBtn}
                                onClick={() => {
                                    setShowPassModal(false);
                                    setOldPass(""); setNewPass(""); setSelectedUser("");
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                style={styles.primaryBtn}
                                // En tu componente, reemplaza la parte del onClick del botón "Guardar" en el modal por esto:
                                // REEMPLAZA TODA la sección del onClick del botón "Guardar" por esto:

                                onClick={async () => {
                                    // Validaciones básicas
                                    if (!newPass) {
                                        alert("Ingresá la nueva contraseña/PIN");
                                        return;
                                    }

                                    const isAdmin = selectedUser === "ricardo_admin";

                                    // Si NO es admin y quiere crear desde cero: pedir autorización de ADMIN
                                    if (!isAdmin && resetFromZero) {
                                        const adminPw = window.prompt("Autorización requerida.\nContraseña de Ricardo (ADMIN):") || "";
                                        if (!adminPw) {
                                            alert("Operación cancelada");
                                            return;
                                        }

                                        // Verificar ADMIN directamente
                                        try {
                                            const adminRes = await fetch(`${API_BASE}/api/caja/passwords/verificar`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    username: "ricardo_admin",
                                                    password: adminPw
                                                }),
                                            });
                                            const adminData = await adminRes.json().catch(() => ({}));

                                            if (!adminRes.ok || !adminData?.ok) {
                                                alert("Autorización ADMIN inválida");
                                                return;
                                            }
                                        } catch (e) {
                                            alert("Error verificando ADMIN: " + e.message);
                                            return;
                                        }

                                        // Setear NUEVO PIN/PASSWORD directamente
                                        const endpoint = isAdmin ?
                                            `${API_BASE}/api/caja/usuarios/set-pass-largo` :
                                            `${API_BASE}/api/caja/usuarios/set-pin4`;

                                        const body = isAdmin ?
                                            { username: selectedUser, pass: newPass } :
                                            { username: selectedUser, pin4: newPass };

                                        try {
                                            const res = await fetch(endpoint, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify(body),
                                            });

                                            const data = await res.json().catch(() => ({}));
                                            if (res.ok && data.ok) {
                                                alert("Contraseña actualizada con éxito");
                                                setShowPassModal(false);
                                                setOldPass(""); setNewPass(""); setSelectedUser(""); setResetFromZero(false);
                                            } else {
                                                alert(data.error || "No se pudo actualizar");
                                            }
                                        } catch (e) {
                                            alert("Error actualizando contraseña: " + e.message);
                                        }
                                        return;
                                    }

                                    // Flujo normal: verificar contraseña actual
                                    if (!oldPass) {
                                        alert(isAdmin ? "Ingresá la contraseña actual de ADMIN" : "Ingresá el PIN actual");
                                        return;
                                    }

                                    // Verificar contraseña actual DIRECTAMENTE
                                    try {
                                        const verifRes = await fetch(`${API_BASE}/api/caja/passwords/verificar`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                username: selectedUser,
                                                password: oldPass
                                            }),
                                        });

                                        const verifData = await verifRes.json().catch(() => ({}));

                                        if (!verifRes.ok || !verifData?.ok) {
                                            alert("La contraseña/PIN actual es incorrecta");
                                            return;
                                        }
                                    } catch (e) {
                                        alert("Error verificando contraseña actual: " + e.message);
                                        return;
                                    }

                                    // Si llegamos acá, la verificación fue exitosa - cambiar contraseña
                                    const endpoint = isAdmin ?
                                        `${API_BASE}/api/caja/usuarios/set-pass-largo` :
                                        `${API_BASE}/api/caja/usuarios/set-pin4`;

                                    const body = isAdmin ?
                                        { username: selectedUser, pass: newPass } :
                                        { username: selectedUser, pin4: newPass };

                                    try {
                                        const res = await fetch(endpoint, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify(body),
                                        });

                                        const data = await res.json().catch(() => ({}));
                                        if (res.ok && data.ok) {
                                            alert("Contraseña/PIN actualizado con éxito");
                                            setShowPassModal(false);
                                            setOldPass(""); setNewPass(""); setSelectedUser(""); setResetFromZero(false);
                                        } else {
                                            alert(data.error || "No se pudo actualizar");
                                        }
                                    } catch (e) {
                                        alert("Error actualizando contraseña: " + e.message);
                                    }
                                }}
                            >
                                Guardar
                            </button>


                        </div>
                    </div>
                </div>
            )
            }

        </div >
    );
}

