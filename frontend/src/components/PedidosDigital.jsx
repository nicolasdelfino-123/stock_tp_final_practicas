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


// ✅ Parser robusto: acepta DD/MM/YYYY, YYYY-MM-DD (sin hora) e ISO con hora
function parseFechaFlexible(valor) {
    if (valor == null) return null;
    const s = String(valor).trim();

    // DD/MM/YYYY
    const mDMY = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const dmy = s.match(mDMY);
    if (dmy) {
        const [_, dd, mm, yyyy] = dmy;
        const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0, 0);
        return dt;
    }

    // YYYY-MM-DD (sin hora)
    const mYMD = /^(\d{4})-(\d{2})-(\d{2})(?!T)/;
    const ymd = s.match(mYMD);
    if (ymd) {
        const [_, yyyy, mm, dd] = ymd;
        return new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0, 0);
    }

    // ISO completo (con/sin TZ)
    const dt = new Date(s);
    if (!isNaN(dt)) return dt;

    return null;
}

function formatearFechaArgentina(valor) {
    if (!valor) return "";

    // Si viene como string conteniendo la fecha especial
    if (typeof valor === "string" && valor.includes("1900-01-01")) {
        return "sin fecha";
    }

    const dt = parseFechaFlexible(valor);
    if (!dt) return "";

    // Si el año es 1900 => es nuestro marcador de “sin fecha”
    if (dt.getFullYear() === 1900) {
        return "sin fecha";
    }

    return dt.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
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
    // 👇 NUEVO: guarda el primer proveedor elegido en VIENE durante la sesión actual
    const [proveedorPorDefecto, setProveedorPorDefecto] = useState("");


    // NUEVO: tras "Resetear", en la vista TODOS ocultamos los que están en VIENE
    const [excluirVienen, setExcluirVienen] = useState(false);
    // Añadir al inicio del componente, junto a los otros estados
    const [pedidosMarcadosRecien, setPedidosMarcadosRecien] = useState(new Set());
    const [editorial, setEditorialLibro] = useState("");
    const [ordenFechaVieneAsc, setOrdenFechaVieneAsc] = useState(true);


    useEffect(() => { setExcluirVienen(true); }, []);


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

    // esta funcion filtra los pedidos por fecha.
    // Si no hay fechas, devuelve el arreglo original.
    // Si hay fechas, convierte las cadenas a objetos Date y filtra los pedidos
    // que caen dentro del rango especificado.
    // Si la fecha es inválida, se ignora ese pedido.
    // Si la fecha "hasta" está definida, se ajusta para incluir todo el día
    // (hasta las 23:59:59.999).
    // Si la fecha "desde" está definida, se filtran los pedidos que son mayores
    // o iguales a esa fecha.
    // Si la fecha "hasta" está definida, se filtran los pedidos que son menores
    // o iguales a esa fecha.
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
            // 👇 Si estoy en pestaña "VIENE", uso fecha_viene; si no, uso fecha
            const baseDate = filtroEstado === "VIENE" ? p.fecha_viene : p.fecha;
            if (!baseDate) return false;

            const fp = new Date(baseDate);
            if (Number.isNaN(fp.getTime())) return false;
            if (desde && fp < desde) return false;
            if (hasta && fp > hasta) return false;
            return true;
        });
    };

    // ⬇️ REEMPLAZA COMPLETO tu handleOrdenarPorFechaViene por este
    const handleOrdenarPorFechaViene = () => {
        // ❗ No pisamos `pedidos` con un subset. Solo cambiamos la dirección del orden.
        setOrdenFechaVieneAsc(prev => !prev);
    };




    // cuando cambia fechaDesde
    const handleFechaDesdeChange = (e) => {
        const nuevaDesde = e.target.value;
        setFechaDesde(nuevaDesde);

        // si la hasta ya existe y es menor que la desde, la igualo
        if (fechaHasta && nuevaDesde > fechaHasta) {
            setFechaHasta(nuevaDesde);
        }
    };

    // cuando cambia fechaHasta
    const handleFechaHastaChange = (e) => {
        const nuevaHasta = e.target.value;
        setFechaHasta(nuevaHasta);

        // si la desde ya existe y es mayor que la hasta, la igualo
        if (fechaDesde && nuevaHasta < fechaDesde) {
            setFechaDesde(nuevaHasta);
        }
    };



    // 📌 pedidosFiltrados:
    // - siempre parte de `pedidos`
    // - aplica búsqueda y fechas si están definidas (ambas opcionales) 
    // - luego aplica el filtroEstado (Todos/Viene/No viene) y excluirVienen si corresponde         
    // - si filtroEstado es "VIENE", ordena por fecha_viene según ordenFechaVieneAsc 
    // - si filtroEstado es "TODOS" y excluirVienen es true, quita los que están en VIENE
    const pedidosFiltrados = useMemo(() => {
        let base = filtrarPorBusqueda(filtrarPorFechas(pedidos));

        // Botones "Todos / Vienen / No vienen"
        if (filtroEstado === "VIENE") {
            const soloVienen = base.filter(p => (p.estado || "") === "VIENE");

            // ✅ ordenar aquí, sin tocar el estado global `pedidos`
            return soloVienen.slice().sort((a, b) => {
                const fechaA = a.fecha_viene ? new Date(a.fecha_viene) : null;
                const fechaB = b.fecha_viene ? new Date(b.fecha_viene) : null;

                if (!fechaA && !fechaB) return 0;
                if (!fechaA) return 1;
                if (!fechaB) return -1;

                return ordenFechaVieneAsc ? (fechaA - fechaB) : (fechaB - fechaA);
            });
        }

        if (filtroEstado === "NO_VIENE") {
            return base.filter(p => (p.estado || "") === "NO_VIENE");
        }

        if (filtroEstado === "TODOS" && excluirVienen) {
            return base.filter(p => {
                // Si fue marcado en este ciclo, mostrarlo igual
                if (pedidosMarcadosRecien.has(p.id)) return true;
                // Ocultar los que están en VIENE
                return (p.estado || "") !== "VIENE";
            });
        }

        // Sin filtro especial: devolver base (ya filtrada por búsqueda/fechas)
        return base;
    }, [
        pedidos,
        terminoBusqueda,
        fechaDesde,
        fechaHasta,
        filtroEstado,
        excluirVienen,
        pedidosMarcadosRecien,
        ordenFechaVieneAsc, // 👈 IMPORTANTE: agrega esta dependencia
    ]);


    // Cambia el estado de un pedido y (según el caso) lo persiste en el backend.
    // - Si nuevoEstado === "VIENE": solo actualiza el estado en memoria y limpia el motivo,
    //   pero NO guarda todavía: espera a que el usuario elija un motivo.
    // - Para cualquier otro estado: actualiza en memoria y luego persiste inmediatamente.
    const setEstado = async (id, nuevoEstado) => {
        sessionStorage.setItem("pd_preservarEstados", "1");

        const pedidoActual = pedidos.find(p => p.id === id);

        if (nuevoEstado === "VIENE") {
            setPedidosMarcadosRecien(prev => new Set(prev).add(id));

            const ahoraISO = new Date().toISOString();
            // 👇 si ya hay proveedorPorDefecto, lo aplicamos automáticamente
            const motivoAplicado = proveedorPorDefecto || "";

            setPedidos(prev => prev.map(p =>
                p.id === id ? { ...p, estado: "VIENE", motivo: motivoAplicado, fecha_viene: ahoraISO } : p
            ));

            await actions.actualizarPedido(id, {
                ...pedidoActual,
                estado: "VIENE",
                motivo: motivoAplicado,
                fecha_viene: ahoraISO
            });

            return;
        }

        // para otros estados:
        const motivo = pedidoActual?.motivo || "";
        const patch = (nuevoEstado === "NO_VIENE")
            ? { estado: "NO_VIENE", motivo, fecha_viene: "" }
            : { estado: nuevoEstado, motivo };

        setPedidos(prev => prev.map(p =>
            p.id === id ? { ...p, ...patch } : p
        ));

        await actions.actualizarPedido(id, { ...pedidoActual, ...patch });
    };

    const setMotivoViene = async (id, motivo) => {
        sessionStorage.setItem("pd_preservarEstados", "1");

        // 👇 si es el primer motivo elegido en la sesión, lo guardamos como defecto
        if (!proveedorPorDefecto && motivo) {
            setProveedorPorDefecto(motivo);
        }

        const pedidoActual = pedidos.find(p => p.id === id);
        const fechaV = pedidoActual?.fecha_viene || new Date().toISOString();

        setPedidos(prev => prev.map(p =>
            p.id === id ? { ...p, estado: "VIENE", motivo, fecha_viene: fechaV } : p
        ));

        await actions.actualizarPedido(id, {
            ...pedidoActual,
            estado: "VIENE",
            motivo,
            fecha_viene: fechaV
        });

        setPedidosMarcadosRecien(prev => new Set(prev).add(id));
    };
    //Esta funcion cuenta cuantos pedidos tienen el estado NO_VIENE
    const totalNoVienen = pedidos.filter(p => (p.estado || "") === "NO_VIENE").length;

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
    // Vienen filtrados por fechas y búsqueda
    const pedidosVienen = useMemo(() => {
        const base = filtrarPorBusqueda(filtrarPorFechas(pedidos));
        return base.filter(p => (p.estado || "") === "VIENE");
    }, [pedidos, terminoBusqueda, fechaDesde, fechaHasta]);

    const pedidosVienenTodos = useMemo(() =>
        pedidos.filter(p => (p.estado || "") === "VIENE"),
        [pedidos]);

    /* // No vienen filtrados por fechas y búsqueda
    const pedidosNoVienen = useMemo(
        () => pedidosFiltrados.filter(p => (p.estado || "") === "NO_VIENE"),
        [pedidosFiltrados]
    ); */

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
        <td>${p.editorial || "-"}</td>  <!-- ⬅️ NUEVO -->
        <td style="text-align:center">${p.cantidad || 1}</td>
        <td>${motivo}</td>
      </tr>
    `;
        }).join("");

        const vent = window.open("", "_blank");
        const fechaImpresion = new Date().toLocaleDateString('es-AR');
        const totalLibros = lista.length;

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
    <h5>Fecha de impresión: ${fechaImpresion} &nbsp;|&nbsp; Cantidad de títulos en página: ${totalLibros}</h5>
  <table>
    <thead>
      <tr>
        <th>Cliente</th>
        <th>Título</th>
        <th>Autor</th>
        <th>Editorial</th>  <!-- ⬅️ NUEVO -->
        <th>Cant.</th>
        <th>Viene de:</th>
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


    // Imprime como "Para Ricardo" usando la vista TODOS (excluyendo VIENE)
    const imprimirParaRicardoDesdeDigital = () => {
        const base = filtrarPorBusqueda(filtrarPorFechas(pedidos));
        const lista = base.filter(p => (p.estado || "") !== "VIENE");

        if (!lista.length) {
            alert("No hay pedidos para imprimir.");
            return;
        }

        const rows = lista.map(p => `
    <tr>
      <td class="hyph">${p.titulo || "-"}</td>
      <td class="hyph">${p.autor || "-"}</td>
      <td class="hyph">${p.editorial || "-"}</td>
      <td style="text-align:center">${p.cantidad || 1}</td>
      <td>${p.isbn || "-"}</td>
    </tr>
  `).join("");

        const vent = window.open("", "_blank");
        const fechaImpresion = new Date().toLocaleDateString('es-AR');
        const visibles = filtrarPorBusqueda(pedidosFiltrados);
        const totalLibros = visibles.length;

        vent.document.write(`
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Pedidos Ricardo Delfino - Librería Charles</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 10px; }
    .header { text-align: center; margin-bottom: 15px; }
    .titulo { color: #2c3e50; margin: 10px 0; }

    table {
      border-collapse: collapse; width: 100%; table-layout: fixed;
      font-size: 10px; border: 1px solid black !important;
    }
    th, td {
      border: 1px solid black !important; padding: 4px 6px; text-align: left;
      /* 👉 habilitamos cortes por sílaba */
      word-break: normal;
      overflow-wrap: normal;
      hyphens: auto;
      -webkit-hyphens: auto;
      -ms-hyphens: auto;
      white-space: normal;
      box-sizing: border-box; vertical-align: top;
    }

    /* columnas clave que pueden partir por sílaba */
    .hyph {
      word-break: normal;
      overflow-wrap: normal;
      hyphens: auto;
      -webkit-hyphens: auto;
      -ms-hyphens: auto;
    }

    /* ✅ Fuerza que la columna 5 (ISBN) NUNCA desborde: envuelve siempre */
    td:nth-child(5) {
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    th { background-color: white; color: black; font-weight: bold; white-space: nowrap; }

    tr:nth-child(even) { background-color: #f2f2f2; }
    tr:hover { background-color: #e8f4fd; }

    @media print {
      body { margin: 0.5cm; }
      table { font-size: 8pt; width: 100% !important; min-width: 100% !important; }
      th, td {
        padding: 2px 4px; color: black !important; border: 1px solid black !important;
        /* ❌ quitamos break-all y dejamos cortes por sílaba */
        word-break: normal !important;
        overflow-wrap: normal !important;
        hyphens: auto !important;
        -webkit-hyphens: auto !important;
        -ms-hyphens: auto !important;
      }
      /* ✅ Asegurar lo mismo en impresión para ISBN */
      td:nth-child(5) {
        white-space: normal !important;
        word-break: break-word !important;
        overflow-wrap: anywhere !important;
      }

      th { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 class="titulo">Librería Charles</h2>
    <h3>Las Varillas, Córdoba - 9 de julio 346</h3>
    <h4>Teléfonos: 03533-420183 / Móvil: 03533-682652</h4>
    <h5>Fecha de impresión: ${fechaImpresion} &nbsp;|&nbsp; Cantidad de títulos en página: ${totalLibros}</h5>
  </div>

  <table>
    <!-- ✅ colgroup va AQUÍ, antes de THEAD -->
    <colgroup>
      <col style="width: 25%;">   <!-- Título -->
      <col style="width: 30%;">   <!-- Autor -->
      <col style="width: 20%;">   <!-- Editorial -->
      <col style="width: 10%;">   <!-- Cantidad -->
      <col style="width: 15%;">   <!-- ISBN -->
    </colgroup>

    <thead>
      <tr>
        <th>Título</th>
        <th>Autor</th>
        <th>Editorial</th>
        <th>Cantidad</th>
        <th>ISBN</th>
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


    const fondoURL = "/fondoo.webp";

    const totalVienen = pedidos.filter(p => p.estado === "VIENE").length;
    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#7ec27e",
            padding: "20px",
            backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)),url(${fondoURL})`,
            backgroundSize: "cover"
        }}>
            <div className="d-flex align-items-center mb-3" style={{ position: "relative", minHeight: 44 }}>
                <button
                    type="button"
                    className="btn"
                    onClick={() => navigate(-1)}
                    style={{
                        borderRadius: "8px",
                        padding: "10px 20px",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                        transition: "background-color 0.3s ease",
                        backgroundColor: "#fcf00cff",
                        fontWeight: "bold",
                        height: "44px",
                        marginRight: "10px",
                        zIndex: 2
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = "#e4f00aff")}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = "#fcf00cff")}
                >
                    Volver a pedidos cargados
                </button>

                <h2
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        margin: 0,
                        color: "white",
                        fontSize: "40px",
                        fontWeight: 700,
                        textShadow: "4px 4px 22px rgba(0,0,0,0.9)",
                        pointerEvents: "none" // opcional: evita capturar clicks
                    }}
                >
                    <strong>Pedidos Digital – Ricardo</strong>
                </h2>
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
                    <div className="d-flex flex-wrap gap-3" style={{ flexGrow: 1, minWidth: "300px" }}>
                        <div>
                            <label style={{ display: "block", fontWeight: "bold", marginBottom: 4 }}>Desde</label>
                            <input
                                type="date"
                                value={fechaDesde}
                                onChange={handleFechaDesdeChange}
                                style={{ padding: "8px", borderRadius: "6px", border: "2px solid #95a5a6" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontWeight: "bold", marginBottom: 4 }}>Hasta</label>
                            <input
                                type="date"
                                value={fechaHasta}
                                onChange={handleFechaHastaChange}
                                style={{ padding: "8px", borderRadius: "6px", border: "2px solid #95a5a6" }}
                                min={fechaDesde || undefined}  // evita warning si es cadena vacía
                            />
                        </div>
                        <div className="d-flex align-items-center justify-content-center">
                            <button
                                onClick={() => { setFechaDesde(""); setFechaHasta(""); setTerminoBusqueda(""); }}
                                style={{
                                    backgroundColor: '#ec1814ff',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    marginTop: "25px",

                                }}
                            >
                                <strong>

                                    Limpiar búsqueda
                                </strong>
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button
                            onClick={() => { setFiltroEstado("TODOS"); setExcluirVienen(true) }}

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
                        <div className="boton-reset-div d-flex">
                            <button
                                onClick={async () => {

                                    // 🚦 Bloqueo visual si hay filtros activos
                                    if ((terminoBusqueda && terminoBusqueda.trim() !== "") || fechaDesde || fechaHasta) {
                                        alert("Primero debe hacer clic en 'Limpiar búsqueda' para quitar filtros de texto y fecha. Luego podrá 'Resetear para nuevo pedido'.");
                                        return; // no sigue con el reseteo
                                    }
                                    // Paso 1) Reseteo en BACKEND de todos los pedidos que NO son "VIENE".
                                    const aResetear = pedidos.filter(p => (p.estado || "") !== "VIENE");
                                    for (const p of pedidos.filter(p => (p.estado || "") === "VIENE")) {
                                        await actions.actualizarPedido(p.id, p);
                                    }



                                    if (aResetear.length) {
                                        for (const p of aResetear) {
                                            // ✅ Conservar cualquier motivo existente, sin importar el estado previo
                                            const conservarMotivo = !!p.motivo;
                                            await actions.actualizarPedido(
                                                p.id,
                                                { ...p, estado: "", motivo: conservarMotivo ? p.motivo : "" }
                                            );
                                        }
                                    }


                                    // Paso 2) Reseteo en MEMORIA (estado local) y QUITAMOS los que son "VIENE" de la tabla actual
                                    setPedidos(prev =>
                                        prev.map(p => {
                                            if ((p.estado || "") === "VIENE") return p; // intactos
                                            // ✅ Conservar el motivo si existe, aunque el estado quede vacío
                                            return { ...p, estado: "", motivo: p.motivo || "" };
                                        })
                                    );



                                    // Limpiar pedidos marcados recientemente
                                    setPedidosMarcadosRecien(new Set());
                                    setProveedorPorDefecto(""); // 👈 limpia el proveedor por defecto al comenzar nuevo pedido


                                    // Paso 3) Ajusta la vista (código existente)
                                    setFiltroEstado("TODOS");
                                    setExcluirVienen(true);
                                    alert("Comenzará un NUEVO PEDIDO, los pedidos que VIENEN se excluyeron de la lista para no volverlos a pedir");
                                }
                                }



                                style={{
                                    backgroundColor: "#f06610ff",
                                    color: "white",
                                    border: "none",
                                    padding: "10px 20px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    marginBottom: "1px",
                                    marginLeft: "100px",
                                    marginTop: "0px",
                                    display: "flex-end"
                                }}
                            >
                                🔄 Resetear para nuevo pedido
                            </button>

                        </div>
                    </div>
                </div>

                {/* Acciones de impresión */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <button
                        onClick={() => {
                            alert("📋 Se va a imprimir la lista de pedidos que VIENEN");
                            imprimirLista(pedidosVienen, "Pedidos que VIENEN");
                        }}
                        style={{
                            backgroundColor: "#198754",
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


                    {/* NUEVO BOTÓN */}
                    <button
                        onClick={imprimirParaRicardoDesdeDigital}
                        style={{ backgroundColor: "#7952b3", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                    >
                        Imprimir / Enviar Librerías
                    </button>

                    <span style={{ alignSelf: "center", fontWeight: "bold", color: "#333" }}>
                        Total en vista: {pedidosFiltrados.length} — VIENEN: {totalVienen} — NO VIENEN: {totalNoVienen} - SIN MARCAR: {pedidosFiltrados.filter(p => !p.estado).length}
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
                            background: "blue",
                            tableLayout: "fixed", // 👈 evita que el contenido estire columnas
                        }}
                    >
                        {/* ⬇️ NUEVO: colgroup fija anchos de columnas */}
                        <colgroup>
                            <col style={{ width: 120 }} />   {/* Cliente (fixed(100)) */}
                            <col style={{ width: 200 }} />   {/* Título  (fixed(200)) */}
                            <col />                          {/* Autor (auto) */}
                            <col style={{ width: 120 }} />   {/* Editorial (fixed(120)) */}
                            <col style={{ width: 65 }} />    {/* Cant. (fixed(65)) */}
                            <col style={{ width: 140 }} />                          {/* ISBN (auto) */}
                            <col style={{ width: 110 }} />   {/* Fecha pedido (110) */}
                            {filtroEstado === "VIENE" && <col style={{ width: 110 }} />}{/* Fecha viene (110) */}
                            <col style={{ width: 160 }} />   {/* Coment. (fixed(110)) */}
                            <col style={{ width: 90 }} />    {/* 👉 ESTADO (achicado) */}
                            <col />                          {/* Motivo (auto) */}
                            <col style={{ width: 120 }} />   {/* Acciones (fixed(120)) */}
                        </colgroup>

                        <thead>
                            <tr style={{ backgroundColor: "#0655a8ff", color: "white" }}>
                                <th style={{ ...thStyle, ...fixed(100) }}>Cliente</th>
                                <th style={{ ...thStyle, ...fixed(200) }}>Título</th>
                                <th style={thStyle}>Autor</th>
                                <th style={{ ...thStyle, ...fixed(120) }}>Editorial</th>
                                <th style={{ ...thStyle, ...fixed(65) }}>Cant.</th>
                                <th style={thStyle}>ISBN</th>
                                <th style={thStyleCenter}>Fecha pedido</th>
                                {filtroEstado === "VIENE" && (
                                    <th
                                        style={{ ...thStyleCenter, cursor: "pointer" }}
                                        onClick={handleOrdenarPorFechaViene}
                                    >
                                        Fecha viene {ordenFechaVieneAsc ? "⬆️" : "⬇️"}
                                    </th>
                                )}
                                <th style={{ ...thStyle, ...fixed(110) }}>Coment.</th>
                                {/* 👉 TH de ESTADO: ancho fijo + permite wrap */}
                                <th style={{ ...thStyle, ...fixed(90), whiteSpace: "normal", textAlign: "start" }}>
                                    Estado
                                </th>
                                <th style={{ ...thStyle, ...fixed(90) }}>Motivo</th>
                                <th style={{ ...thStyleCenter, ...fixed(120) }}>Acciones</th>
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
                                        <tr key={p.id || idx} style={{
                                            backgroundColor:
                                                getEstado(p.id) === "VIENE"
                                                    ? "#93d5a2ff" // verde clarito
                                                    : getEstado(p.id) === "NO_VIENE"
                                                        ? "#e8949bff" // rojo clarito
                                                        : "#ffffff" // por defecto sin color
                                        }}>
                                            <td style={tdStyle}>{p.cliente_nombre || "-"}</td>
                                            <td style={tdStyle}>{p.titulo || "-"}</td>
                                            <td style={tdStyle}>{p.autor || "-"}</td>
                                            <td style={tdStyle}>{p.editorial || "-"}</td> {/* ⬅️ NUEVO */}
                                            <td style={{ ...tdStyle, textAlign: "center", width: 60 }}>{p.cantidad || 1}</td>

                                            <td style={tdStyle}>{p.isbn || "-"}</td>
                                            <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{formatearFechaArgentina(p.fecha)}</td>
                                            {filtroEstado === "VIENE" && (
                                                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                                                    {formatearFechaArgentina(p.fecha_viene)}
                                                </td>
                                            )}
                                            <td style={tdStyle}>{p.comentario || "-"}</td>
                                            <td style={tdStyle}>
                                                {estado === "VIENE" ? "VIENE" : estado === "NO_VIENE" ? "NO VIENE" : "-"}
                                            </td>
                                            <td style={tdStyle}>
                                                {/* Cuando estado está vacío: 
      - si NO hay motivo → mostrar select deshabilitado
      - si hay motivo     → mostrar motivo en rojo */}
                                                {getEstado(p.id) === "" && !getMotivo(p.id) && (
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

                                                {getEstado(p.id) === "" && getMotivo(p.id) && (
                                                    <div style={{
                                                        color: "#dc3545",
                                                        fontWeight: "bold",
                                                        fontSize: "14px",
                                                        whiteSpace: "pre-wrap",
                                                        wordBreak: "break-word"
                                                    }}>
                                                        {getMotivo(p.id)}
                                                    </div>
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


                                            <td style={{ ...tdStyle, ...fixed(120), whiteSpace: "normal" }}>
                                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                                                    <button
                                                        className="btn-viene-tabla-principal"
                                                        onClick={() => setEstado(p.id, "VIENE")}
                                                        style={btnOk}
                                                    >
                                                        VIENE
                                                    </button>
                                                    {filtroEstado === "VIENE" ? (
                                                        <button
                                                            onClick={() => {
                                                                const ok = window.confirm(
                                                                    "Ojo!! Estás a punto de agregar el pedido a la lista para pedirlo de nuevo.\n\n¿Confirmás?"
                                                                );
                                                                if (!ok) return;
                                                                setEstado(p.id, "NO_VIENE");
                                                            }}
                                                            style={btnNo}
                                                        >
                                                            NO TOCAR
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setEstado(p.id, "NO_VIENE")}
                                                            style={btnNo}
                                                        >
                                                            NO VIENE
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div >
        </div >
    );
}

// ⬇️ Helper para columna de ancho fijo (ajustá los px a gusto)
const fixed = (px) => ({
    width: px,
    minWidth: px,
    maxWidth: px,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    whiteSpace: "normal",
    boxSizing: "border-box",
});

/* Estilos inline compartidos */
const thStyle = {
    padding: "10px",
    border: "1px solid #adacac",
    fontWeight: "bold",
    textAlign: "left",
    whiteSpace: "normal",       // 👈 permite partir el texto del header
    position: "sticky",
    top: 0,
    zIndex: 2,
    backgroundColor: "#0655a8ff",
    color: "white",
    minWidth: 0,                // 👈 habilita que pueda achicarse
    overflowWrap: "anywhere",   // 👈 por si hay palabras largas
    wordBreak: "break-word",
    boxSizing: "border-box",
};


const thStyleCenter = { ...thStyle, textAlign: "center" };
const tdStyle = {
    padding: "10px",
    border: "1px solid #907575ff",
    color: "black",
    fontWeight: "bold",
    verticalAlign: "top",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    whiteSpace: "normal",
    boxSizing: "border-box",
    minWidth: 0,          // 👈 clave para que el contenido no “empuje” la columna
    maxWidth: "100%",
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
