import React, { useMemo, useState, useEffect } from "react";
import { useAppContext } from "../context/appContext";
import { useNavigate } from "react-router-dom";


// Usuarios “letra” -> nombre
const USUARIOS = { f: "Flor", y: "Yani", r: "Ricardo", n: "Nico" };
const METODOS = [
    "Efectivo",
    "Transferencia - Taca Taca",
    "Transferencia - Mercado Pago",
    "Transferencia - Bancor",
    "Débito",
    "Crédito",
    "QR",
    "Juan Pablo"
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
    if (!username || !/^[a-zA-Z0-9]{3,5}$/.test(pin || "")) {
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

    const m = /^\s*([fyrn])\s*([a-zA-Z0-9]{3,5})\s*(\d+(?:[.,]\d{1,2})?)\s*$/.exec(txt || "");



    if (!m) return null;
    return {
        userLetter: m[1].toLowerCase(),
        pass4: m[2],
        importe: Number(String(m[3]).replace(",", ".")),
    };
}

/** f1234 => { letter:'f', pin:'1234' } */
function parseCred(txt) {
    const m = /^\s*([fyrn])\s*([a-zA-Z0-9]{3,5})\s*$/.exec(txt || "");



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

// --- NUEVO: actualiza PINs/clave si fueron escritos en el setup ---
// Solo cambia lo que NO esté vacío; valida f/y/n/r como dígitos 3–5.
// ricardo_admin: si viene, se setea como pass largo.
// --- NUEVO (fix no-undef): recibe los valores como parámetros ---
async function aplicarCambiosDeSetupSiCorresponde(opts = {}) {
    const {
        florPin = "",
        yaniPin = "",
        nicoPin = "",
        ricPin = "",
        ricAdminPass = "",
        API_BASE: passedBase,
    } = opts;

    const base = passedBase || API_BASE; // fallback

    try {
        const isPinValido = (v) => /^\d{3,5}$/.test(String(v || "").trim());
        const ops = [];

        if (isPinValido(florPin)) {
            ops.push(fetch(`${base}/api/caja/usuarios/set-pin4`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: "f", pin4: String(florPin).trim() }),
            }));
        }
        if (isPinValido(yaniPin)) {
            ops.push(fetch(`${base}/api/caja/usuarios/set-pin4`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: "y", pin4: String(yaniPin).trim() }),
            }));
        }
        if (isPinValido(nicoPin)) {
            ops.push(fetch(`${base}/api/caja/usuarios/set-pin4`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: "n", pin4: String(nicoPin).trim() }),
            }));
        }
        if (isPinValido(ricPin)) {
            ops.push(fetch(`${base}/api/caja/usuarios/set-pin4`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: "r", pin4: String(ricPin).trim() }),
            }));
        }
        if (String(ricAdminPass || "").trim() !== "") {
            ops.push(fetch(`${base}/api/caja/usuarios/set-pass-largo`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: "ricardo_admin", pass: String(ricAdminPass).trim() }),
            }));
        }

        if (ops.length === 0) return { ok: true, cambios: 0 };

        const resps = await Promise.all(ops.map(p => p.then(r => r.json().catch(() => ({})))));
        const algunError = resps.find(r => r && r.ok === false);
        if (algunError) return { ok: false, error: algunError.error || "Error actualizando credenciales" };

        return { ok: true, cambios: ops.length };
    } catch (e) {
        return { ok: false, error: e.message };
    }
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
    // ---- edición inline de ventas ----
    const [editVentaId, setEditVentaId] = useState(null);
    const [editVentaDraft, setEditVentaDraft] = useState({
        importe: 0,
        pago: "",           // string para permitir vacío
        metodo: "Efectivo",
        comentario: "",
    });
    const [editVentaPin, setEditVentaPin] = useState("");      // PIN del autor (3–5)
    const [editVentaError, setEditVentaError] = useState("");  // mensaje inline
    const [savingVenta, setSavingVenta] = useState(false);
    const [salidaMetodo, setSalidaMetodo] = useState("Efectivo");
    // --- edición inline de salidas ---
    const [editSalidaId, setEditSalidaId] = useState(null);
    const [editSalidaDraft, setEditSalidaDraft] = useState({
        desc: "",
        importe: 0,
        metodo: "Efectivo",
        comentario: "",
    });



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

    const [ventaComentario, setVentaComentario] = useState("");

    // --- NUEVO: para mostrar el comentario de la última venta
    const [salidaComentario, setSalidaComentario] = useState("");

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

    function resetUIParaNuevoTurno() {
        // inicio (conteo de billetes)
        setInicioCounts({ 10: 0, 20: 0, 50: 0, "100_200": 0, 500: 0, 1000: 0, otros: 0 });

        // entradas
        setEntradaRapida("");
        setPagaCon("");
        setVentaComentario("");
        setMetodo("Efectivo");
        setVentas([]);

        // salidas
        setSalidaDesc("");
        setSalidaImporte("");
        setSalidaRespCode("");
        setSalidaComentario("");
        setSalidas([]);

        // UI de cierre
        setShowResumen(false);

        // (opcional mínimo) fecha por defecto al día de hoy
        setCajaFecha(new Date().toISOString().slice(0, 10));
    }




    // --------- Turno ---------
    // después (solo confía en lo que dice el backend)
    const turnoId = turnoServer?.id || null;

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
        if (turnoAbierto) {
            alert("Ya hay una caja abierta. Debés cerrarla primero.");
            return;
        }

        const resSetup = await aplicarCambiosDeSetupSiCorresponde({
            florPin, yaniPin, nicoPin, ricPin, ricAdminPass, API_BASE,
        });
        if (resSetup && resSetup.ok === false) {
            alert(resSetup.error || "No se pudieron aplicar cambios de credenciales");
            return;
        }

        if (needsSetup) {
            setShowSetup(true);
            return;
        }

        const auth = await pedirLoginRicardoAdmin(actions, "Iniciar caja");
        if (!auth.ok) {
            alert(auth.error || "No autenticado");
            return;
        }

        const denominaciones = [
            { etiqueta: "10", importe_total: Number(inicioCounts[10] || 0) },
            { etiqueta: "20", importe_total: Number(inicioCounts[20] || 0) },
            { etiqueta: "50", importe_total: Number(inicioCounts[50] || 0) },
            { etiqueta: "100_200", importe_total: Number(inicioCounts["100_200"] || 0) },
            { etiqueta: "500", importe_total: Number(inicioCounts[500] || 0) },
            { etiqueta: "1000", importe_total: Number(inicioCounts[1000] || 0) },
            { etiqueta: "otros", importe_total: Number(inicioCounts["otros"] || 0) },
        ];

        const codigo = new Date().toISOString().slice(0, 16)
            .replace(/[-:T]/g, "")
            .replace(/^(\d{8})(\d{4}).*$/, "$1-$2"); // YYYYMMDD-HHMM

        const res = await actions.cajaAbrirTurno({
            codigo,
            observacion: "Apertura desde componente",
            denominaciones,
            fecha: cajaFecha,
            turno: cajaTurno,
        });

        if (res?.success) {
            alert("Turno abierto.");
            // ✅ forzamos que la UI muestre “Turno abierto #…”
            if (res.turno?.id) {
                setTurnoServer(res.turno);
            } else if (res.data?.turno?.id) {
                setTurnoServer(res.data.turno);
            } else if (res.id) {            // fallback por si viene plano
                setTurnoServer({ id: res.id });
            } else {
                await syncTurnoAbierto();     // último recurso: consultar backend
            }
            return;
        }

        // ⛑️ manejo de error mínimo (incluye caso “ya hay un ABIERTO”)
        const msg = (res?.error || "").toString();
        if (/ABIERTO/i.test(msg)) {
            await syncTurnoAbierto();
            alert("Ya existe una caja abierta. Cerrala primero.");
        } else {
            await syncTurnoAbierto(); // por si se abrió desde otra pestaña
            alert(res?.error || "No se pudo abrir el turno");
        }
    }


    // Click en "Cerrar caja" → pedir pass de Ricardo ADMIN, mostrar Resumen y habilitar "Confirmar cierre"
    async function pedirMostrarResumenCierre() {
        // 1) Pedir pass de Ricardo ADMIN SIEMPRE
        const auth = await pedirLoginRicardoAdmin(actions, "Cerrar caja (mostrar resumen)");
        if (!auth.ok) {
            alert(auth.error || "No autenticado");
            return;
        }

        // 2) Mostrar el resumen SIEMPRE para poder ir a 'Ver historial'
        setShowResumen(true);

        // 3) Si no hay turno abierto, avisar que no se puede cerrar
        if (!turnoAbierto) {
            // por las dudas sincronizamos antes de avisar
            await syncTurnoAbierto();
            if (!turnoServer?.id) {
                alert("No puede cerrar la caja si no la ha abierto.");
                // Nota: dejamos el resumen visible para que puedas usar 'Ver historial'
                return;
            }
        }

        // Si había turno abierto, simplemente queda visible el resumen y el botón Confirmar.
    }


    async function confirmarCierreCaja() {
        // asegurar que el estado venga del backend
        if (!turnoAbierto) {
            await syncTurnoAbierto();
            if (!turnoServer?.id) {
                alert("No hay turno abierto.");
                return;
            }
        }

        // revalidar admin
        const auth = await pedirLoginRicardoAdmin(actions, "Confirmar cierre de caja");
        if (!auth.ok) {
            alert(auth.error || "No autenticado");
            return;
        }

        // UNA sola variable para la respuesta (evitar doble 'const res')
        const result = await actions.cajaCerrarTurno(turnoId, {
            efectivo_contado: balanceCaja,
            observacion: "Cierre desde componente",
        });

        if (result?.success) {
            alert("Turno cerrado.");
            setTurnoServer(null);     // -> turnoAbierto = false (porque depende de turnoServer)
            resetUIParaNuevoTurno();  // -> deja la UI limpia para un nuevo turno
        } else {
            alert(result?.error || "No se pudo cerrar el turno");
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
            alert("Formato inválido. Usá f123420000 (letra + 3–5 dígitos + importe).");
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
        const comentarioV = ventaComentario.trim();
        const descVenta = `Venta (${parsed.userLetter}${parsed.pass4})${comentarioV ? ` - ${comentarioV}` : ""}`;


        const res = await actions.cajaCrearMovimiento({
            turno_id: turnoId,
            tipo: "VENTA",
            metodo_pago: metodo,
            importe: parsed.importe,

            paga_con: pago,
            descripcion: descVenta,        // <-- se guarda en DB
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
                comentario: comentarioV || "",   // <-- para la tabla
                vuelto,
                metodo,
                ts: Date.now(),
            },
        ]);
        setEntradaRapida("");
        setPagaCon("");
        setVentaComentario("");  // <-- limpiar comentario
        setMetodo("Efectivo");
    }

    async function editarVenta(row) {
        const credTxt = window.prompt(`Credencial del autor (ej ${row.userLetter}1234):`);
        const cred = parseCred(credTxt);
        if (!cred) {
            alert("Formato inválido (usa letra + 4 dígitos)");
            return;
        }
        if (cred.letter !== row.userLetter || cred.pin !== row.pass4) {
            alert("Solo puede editarlo quien lo registró con su PIN original.");
            return;
        }
        const auth = await loginWithLetterAndPin(actions, cred.letter, cred.pin);
        if (!auth.ok) {
            alert(auth.error || "Credenciales inválidas");
            return;
        }

        // activar modo edición inline
        setEditVentaId(row.id);
        setEditVentaDraft({
            importe: row.importe,
            pago: row.pago ?? "",
            metodo: row.metodo || "Efectivo",
            comentario: row.comentario || "",
        });
    }

    async function guardarEdicionVenta(row) {
        try {
            const nuevoImporte = Number(editVentaDraft.importe);
            if (!(nuevoImporte > 0)) {
                alert("Importe inválido");
                return;
            }

            // reconstruir la descripción como se guarda en DB
            const comentarioV = (editVentaDraft.comentario || "").trim();
            const nuevaDescripcion =
                `Venta (${row.userLetter}${row.pass4})` + (comentarioV ? ` - ${comentarioV}` : "");

            if (row.dbId) {
                const r = await actions.cajaEditarMovimiento(row.dbId, {
                    importe: nuevoImporte,
                    metodo_pago: editVentaDraft.metodo,
                    descripcion: nuevaDescripcion,
                });
                if (!r?.success) {
                    alert(r?.error || "No se pudo editar en backend");
                    return;
                }
            }

            // actualizar UI
            setVentas(prev => prev.map(v => v.id === row.id
                ? { ...v, importe: nuevoImporte, metodo: editVentaDraft.metodo, comentario: comentarioV }
                : v
            ));
            setEditVentaId(null);
        } catch (e) {
            alert(e.message);
        }
    }

    function cancelarEdicionVenta() {
        setEditVentaId(null);
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
        const comentarioS = salidaComentario.trim();
        const descSalida = `Salida (${cred.letter}${cred.pin}) - ${salidaDesc || "Salida"}${comentarioS ? ` | ${comentarioS}` : ""}`;
        const res = await actions.cajaCrearMovimiento({
            turno_id: turnoId,
            tipo: "SALIDA",
            metodo_pago: salidaMetodo,   // usar el método elegido
            descripcion: descSalida,     // <-- se guarda en DB
            importe: imp,
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
                comentario: comentarioS || "",
                respLetter: cred.letter,
                respPass4: cred.pin,
                usuario: USUARIOS[cred.letter] || cred.letter.toUpperCase(), // 👈 para la columna Usuario
                metodo: salidaMetodo,                                        // 👈 para la columna Método
            },
        ]);

        setSalidaDesc("");
        setSalidaComentario("");  // <-- limpiar comentario
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
        if (cred.letter !== row.respLetter || cred.pin !== row.respPass4) {
            alert("Solo puede editarla quien la registró con su PIN original.");
            return;
        }
        const auth = await loginWithLetterAndPin(actions, cred.letter, cred.pin);
        if (!auth.ok) {
            alert(auth.error || "Credenciales inválidas");
            return;
        }

        // activar modo edición inline
        setEditSalidaId(row.id);
        setEditSalidaDraft({
            desc: row.desc || "Salida",
            importe: row.importe,
            metodo: row.metodo || "Efectivo",
            comentario: row.comentario || "",
        });
    }

    async function guardarEdicionSalida(row) {
        try {
            const nuevoImporte = Number(editSalidaDraft.importe);
            if (!(nuevoImporte > 0)) {
                alert("Importe inválido");
                return;
            }
            const comentarioS = (editSalidaDraft.comentario || "").trim();
            const descArmadaBase = editSalidaDraft.desc?.trim() || "Salida";
            // mantener firma del responsable visible en la descripción que va a DB
            const nuevaDescripcion = `Salida (${row.respLetter}${row.respPass4}) - ${descArmadaBase}` + (comentarioS ? ` | ${comentarioS}` : "");

            if (row.dbId) {
                const r = await actions.cajaEditarMovimiento(row.dbId, {
                    importe: nuevoImporte,
                    metodo_pago: editSalidaDraft.metodo,
                    descripcion: nuevaDescripcion,
                });
                if (!r?.success) {
                    alert(r?.error || "No se pudo editar en backend");
                    return;
                }
            }

            setSalidas(prev => prev.map(s => s.id === row.id
                ? { ...s, desc: descArmadaBase, importe: nuevoImporte, metodo: editSalidaDraft.metodo, comentario: comentarioS }
                : s
            ));
            setEditSalidaId(null);
        } catch (e) {
            alert(e.message);
        }
    }

    function cancelarEdicionSalida() {
        setEditSalidaId(null);
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
            margin: "-10px auto",
            padding: 66,
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif",
            background: isDarkMode ? '#1f2937' : '#ffffff',
            color: isDarkMode ? '#f9fafb' : '#111827',
            minHeight: '100vh',
            transition: 'all 0.3s ease',
            marginBottom: '40px',
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
            border: `2px solid ${isDarkMode ? " white" : "  black"}`,
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
        pass: {
            width: "100%",

        },


    };

    /** ---------- BLOQUE RETURN ---------- **/
    return (
        <div style={styles.wrap}>
            {/* Cambiar contraseñas */}
            <div style={{ top: 70, right: 20, zIndex: 1000 }}>
                <select
                    style={{ ...styles.input, width: '200px', marginBottom: '10px', marginTop: '-10px' }}
                    value={selectedUser}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                            setSelectedUser(val);
                            // --- NUEVO: limpiar campos al abrir el modal
                            setOldPass("");
                            setNewPass("");
                            setResetFromZero(false);
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
                    <span>Inicio de caja (importe por billetes)</span>
                    <div style={{ display: "flex", gap: 8 }}>
                        {!turnoAbierto && (
                            <button
                                style={{
                                    ...styles.primaryBtn,
                                    // 🔹 Estilo gris cuando está deshabilitado
                                    background: (inicioTotal === 0)
                                        ? "#9ca3af"                    // gris
                                        : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                                    cursor: (inicioTotal === 0) ? "not-allowed" : "pointer",
                                    opacity: (inicioTotal === 0) ? 0.8 : 1
                                }}
                                onClick={iniciarCaja}
                                disabled={turnoAbierto || inicioTotal === 0}   // 🔒 bloqueo por UI
                                title={inicioTotal === 0 ? "Ingresá algún importe inicial para abrir la caja" : "Iniciar caja"}
                            >
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

                    {/* 10 (usar para 10 y 20) */}
                    <div style={styles.countBox}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Importe en billetes de</div>
                        <div style={{ fontWeight: 800 }}>ARS 10 y 20</div>
                        <input
                            type="number"
                            min={0}
                            className="inicio-input"
                            value={inicioCounts[10] || 0}
                            onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }}
                            onBlur={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setInicioCounts((p) => ({ ...p, 10: val }));     // 10 toma el total
                                // opcional: aseguramos 20 en 0
                                setInicioCounts((p) => ({ ...p, 20: 0 }));
                            }}
                            onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setInicioCounts((p) => ({ ...p, 10: val }));
                                // opcional: aseguramos 20 en 0
                                setInicioCounts((p) => ({ ...p, 20: 0 }));
                            }}
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
                <div style={{ ...styles.controlsRow, gridTemplateColumns: "2fr 1.2fr 1.4fr 1fr auto" }}>
                    <input
                        className={`input ${isDarkMode ? "dark" : "light"}`}
                        style={{ ...styles.input, border: isDarkMode ? "2px solid white" : "2px solid black" }}
                        placeholder="f123 2000 / f12345 2000 (letra + PIN 3–5 + importe)"
                        value={entradaRapida}
                        onChange={(e) => setEntradaRapida(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarVenta()}
                        disabled={!turnoAbierto}
                    />
                    <input
                        className={`input ${isDarkMode ? "dark" : "light"}`}
                        style={{ ...styles.input }}
                        placeholder="Paga con (opcional)"
                        value={pagaCon}
                        onChange={(e) => setPagaCon(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarVenta()}
                        disabled={!turnoAbierto}
                    />
                    {/* NUEVO: comentario venta */}
                    <input
                        className={`input ${isDarkMode ? "dark" : "light"}`}
                        style={styles.input}
                        placeholder="Comentario (opcional)"
                        value={ventaComentario}
                        onChange={(e) => setVentaComentario(e.target.value)}
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
                                <th style={styles.th}>Comentario</th>   {/* NUEVO */}
                                <th style={styles.th}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.map((v) => (
                                <tr key={v.id}>
                                    <td style={styles.td}>{hora(v.ts)}</td>
                                    <td style={styles.td}>{v.usuario}</td>

                                    {/* IMPORTE */}
                                    <td style={styles.td}>
                                        {editVentaId === v.id ? (
                                            <input
                                                type="number"
                                                style={styles.input}
                                                value={editVentaDraft.importe}
                                                onChange={(e) => setEditVentaDraft(d => ({ ...d, importe: e.target.value }))}
                                            />
                                        ) : (
                                            moneda(v.importe)
                                        )}
                                    </td>

                                    {/* PAGO CON (lo dejamos solo lectura por ahora para no cambiar lógicas de vuelto) */}
                                    <td style={styles.td}>{v.pago != null ? moneda(v.pago) : "-"}</td>

                                    {/* VUELTO (derivado) */}
                                    <td style={styles.td}>{v.vuelto != null ? moneda(Math.max(0, v.vuelto)) : "-"}</td>

                                    {/* METODO */}
                                    <td style={styles.td}>
                                        {editVentaId === v.id ? (
                                            <select
                                                style={styles.input}
                                                value={editVentaDraft.metodo}
                                                onChange={(e) => setEditVentaDraft(d => ({ ...d, metodo: e.target.value }))}
                                            >
                                                {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        ) : (
                                            v.metodo
                                        )}
                                    </td>

                                    {/* COMENTARIO */}
                                    <td style={styles.td}>
                                        {editVentaId === v.id ? (
                                            <input
                                                style={styles.input}
                                                value={editVentaDraft.comentario}
                                                onChange={(e) => setEditVentaDraft(d => ({ ...d, comentario: e.target.value }))}
                                                placeholder="Comentario (opcional)"
                                            />
                                        ) : (
                                            v.comentario || "-"
                                        )}
                                    </td>

                                    {/* ACCIONES */}
                                    <td style={styles.tdRight}>
                                        {editVentaId === v.id ? (
                                            <>
                                                <button style={styles.primaryBtn} onClick={() => guardarEdicionVenta(v)}>Guardar</button>
                                                <button style={{ ...styles.iconBtn, marginLeft: 6 }} onClick={cancelarEdicionVenta}>Cancelar</button>
                                            </>
                                        ) : (
                                            <>
                                                <button style={styles.iconBtn} onClick={() => editarVenta(v)} disabled={!turnoAbierto} title="Editar">✏️</button>
                                                <button
                                                    style={{ ...styles.iconBtn, marginLeft: 6, borderColor: '#ef4444', color: '#ef4444' }}
                                                    onClick={() => eliminarVenta(v)} disabled={!turnoAbierto} title="Eliminar"
                                                >🗑️</button>
                                            </>
                                        )}
                                    </td>
                                </tr>

                            ))}
                            {ventas.length === 0 && (
                                <tr>
                                    <td style={styles.tdEmpty} colSpan={8}>Sin ventas registradas</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Salidas */}
            {/* Salidas */}
            <section style={styles.card}>
                <div style={styles.cardHeader}>Salidas</div>

                {/* Controles: desc, importe, comentario, usuario (PIN), método, botón */}
                <div style={{ ...styles.controlsRow, gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1.2fr auto" }}>
                    <input
                        className={`input ${isDarkMode ? "dark" : "light"}`}
                        style={styles.input}
                        placeholder="Descripción (proveedor, gasto, etc.)"
                        value={salidaDesc}
                        onChange={(e) => setSalidaDesc(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarSalida()}
                        disabled={!turnoAbierto}
                    />
                    <input
                        className={`input ${isDarkMode ? "dark" : "light"}`}
                        style={styles.input}
                        placeholder="Importe"
                        value={salidaImporte}
                        onChange={(e) => setSalidaImporte(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarSalida()}
                        disabled={!turnoAbierto}
                    />
                    <input
                        className={`input ${isDarkMode ? "dark" : "light"}`}
                        style={styles.input}
                        placeholder="Comentario (opcional)"
                        value={salidaComentario}
                        onChange={(e) => setSalidaComentario(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarSalida()}
                        disabled={!turnoAbierto}
                    />
                    {/* Usuario (PIN) */}
                    <input
                        className={`input ${isDarkMode ? "dark" : "light"}`}
                        style={styles.input}
                        placeholder="Usuario (f1234 / y1234 / r1234 / n1234)"
                        value={salidaRespCode}
                        onChange={(e) => setSalidaRespCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarSalida()}
                        disabled={!turnoAbierto}
                    />
                    {/* Método de pago (default EFECTIVO) */}
                    <select
                        style={styles.input}
                        value={salidaMetodo}
                        onChange={(e) => setSalidaMetodo(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && agregarSalida()}
                        disabled={!turnoAbierto}
                    >
                        {METODOS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>

                    <button
                        style={styles.warnBtn}
                        onClick={agregarSalida}
                        disabled={!turnoAbierto}
                    >
                        Agregar salida
                    </button>
                </div>

                {/* Tabla */}
                <div style={styles.tableWrap}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Hora</th>
                                <th style={styles.th}>Usuario</th>
                                <th style={styles.th}>Importe</th>
                                <th style={styles.th}>Método</th>
                                <th style={styles.th}>Comentario</th>
                                <th style={styles.th}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {salidas.map((s) => (
                                <tr key={s.id}>
                                    <td style={styles.td}>{hora(s.ts)}</td>
                                    <td style={styles.td}>{s.usuario}</td>

                                    {/* IMPORTE */}
                                    <td style={styles.td}>
                                        {editSalidaId === s.id ? (
                                            <input
                                                type="number"
                                                style={styles.input}
                                                value={editSalidaDraft.importe}
                                                onChange={(e) => setEditSalidaDraft(d => ({ ...d, importe: e.target.value }))}
                                            />
                                        ) : (
                                            moneda(s.importe)
                                        )}
                                    </td>

                                    {/* METODO */}
                                    <td style={styles.td}>
                                        {editSalidaId === s.id ? (
                                            <select
                                                style={styles.input}
                                                value={editSalidaDraft.metodo}
                                                onChange={(e) => setEditSalidaDraft(d => ({ ...d, metodo: e.target.value }))}
                                            >
                                                {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        ) : (
                                            s.metodo
                                        )}
                                    </td>

                                    {/* COMENTARIO (y abajo la descripción editable) */}
                                    <td style={styles.td}>
                                        {editSalidaId === s.id ? (
                                            <div style={{ display: "grid", gap: 6 }}>
                                                <input
                                                    style={styles.input}
                                                    value={editSalidaDraft.comentario}
                                                    onChange={(e) => setEditSalidaDraft(d => ({ ...d, comentario: e.target.value }))}
                                                    placeholder="Comentario (opcional)"
                                                />
                                                <input
                                                    style={styles.input}
                                                    value={editSalidaDraft.desc}
                                                    onChange={(e) => setEditSalidaDraft(d => ({ ...d, desc: e.target.value }))}
                                                    placeholder="Descripción (proveedor, gasto, etc.)"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div>{s.comentario || "-"}</div>
                                                <div style={{ fontSize: 12, opacity: 0.7 }}>{s.desc}</div>
                                            </>
                                        )}
                                    </td>

                                    <td style={styles.tdRight}>
                                        {editSalidaId === s.id ? (
                                            <>
                                                <button style={styles.primaryBtn} onClick={() => guardarEdicionSalida(s)}>Guardar</button>
                                                <button style={{ ...styles.iconBtn, marginLeft: 6 }} onClick={cancelarEdicionSalida}>Cancelar</button>
                                            </>
                                        ) : (
                                            <>
                                                <button style={styles.iconBtn} onClick={() => editarSalida(s)} disabled={!turnoAbierto} title="Editar">✏️</button>
                                                <button
                                                    style={{ ...styles.iconBtn, marginLeft: 6, borderColor: '#ef4444', color: '#ef4444' }}
                                                    onClick={() => eliminarSalida(s)} disabled={!turnoAbierto} title="Eliminar"
                                                >🗑️</button>
                                            </>
                                        )}
                                    </td>
                                </tr>

                            ))}

                            {salidas.length === 0 && (
                                <tr>
                                    <td style={styles.tdEmpty} colSpan={6}>Sin salidas registradas</td>
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
                        <button
                            style={styles.primaryBtn}
                            onClick={pedirMostrarResumenCierre}
                            title="Cerrar caja / Ver resumen e historial"
                        >
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

                        {/* INPUT: contraseña/PIN ACTUAL */}
                        {/* INPUT: contraseña/PIN ACTUAL */}
                        <input
                            style={{ ...styles.input, marginBottom: 10 }}
                            type="password"
                            placeholder={
                                selectedUser === "ricardo_admin"
                                    ? "Contraseña actual (mín. 6 caracteres)"
                                    : "Contraseña/PIN actual (3 a 5 caracteres)"
                            }
                            value={oldPass}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (selectedUser === "ricardo_admin") {
                                    // admin → cualquier alfanumérico, mínimo 6, sin tope
                                    const limpio = v.replace(/[^a-zA-Z0-9]/g, "");
                                    setOldPass(limpio);
                                } else {
                                    // resto → alfanumérico de hasta 5
                                    const limpio = v.replace(/[^a-zA-Z0-9]/g, "").slice(0, selectedUser === "ricardo_admin" ? 64 : 5);

                                    setOldPass(limpio);
                                }
                            }}
                            autoComplete="current-password"
                            name={`${selectedUser || "user"}-current-password`}
                            inputMode="text"
                        />

                        {/* INPUT: NUEVA contraseña/PIN */}
                        <input
                            style={{ ...styles.input, marginBottom: 10 }}
                            type="password"
                            placeholder={
                                selectedUser === "ricardo_admin"
                                    ? "Nueva contraseña (mín. 6 caracteres)"
                                    : "Nuevo PIN (3 a 5 caracteres)"
                            }
                            value={newPass}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (selectedUser === "ricardo_admin") {
                                    const limpio = v.replace(/[^a-zA-Z0-9]/g, "");
                                    setNewPass(limpio);
                                } else {
                                    const limpio = v.replace(/[^a-zA-Z0-9]/g, "").slice(0, selectedUser === "ricardo_admin" ? 64 : 5);


                                    setNewPass(limpio);
                                }
                            }}
                            autoComplete="new-password"
                            name={`${selectedUser || "user"}-new-password`}
                            inputMode="text"
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

                                    // Validación según usuario
                                    if (isAdmin) {
                                        if (!/^[a-zA-Z0-9]{6,}$/.test(newPass)) {
                                            alert("La nueva contraseña de ADMIN debe tener al menos 6 caracteres alfanuméricos");
                                            return;
                                        }
                                        if (oldPass && !/^[a-zA-Z0-9]{6,}$/.test(oldPass)) {
                                            alert("La contraseña actual de ADMIN debe tener al menos 6 caracteres alfanuméricos");
                                            return;
                                        }
                                    } else {
                                        if (!/^[a-zA-Z0-9]{3,5}$/.test(newPass)) {
                                            alert("El nuevo PIN debe tener entre 3 y 5 caracteres alfanuméricos");
                                            return;
                                        }
                                        if (oldPass && !/^[a-zA-Z0-9]{3,5}$/.test(oldPass)) {
                                            alert("El PIN actual debe tener entre 3 y 5 caracteres alfanuméricos");
                                            return;
                                        }
                                    }

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
                                        const endpoint = isAdmin
                                            ? `${API_BASE}/api/caja/usuarios/set-pass-largo`
                                            : `${API_BASE}/api/caja/usuarios/set-pin4`;

                                        const body = isAdmin
                                            ? { username: selectedUser, pass: newPass }
                                            : { username: selectedUser, pin4: newPass };

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
                                    const endpoint = isAdmin
                                        ? `${API_BASE}/api/caja/usuarios/set-pass-largo`
                                        : `${API_BASE}/api/caja/usuarios/set-pin4`;

                                    const body = isAdmin
                                        ? { username: selectedUser, pass: newPass }
                                        : { username: selectedUser, pin4: newPass };

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
                                }} >

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

