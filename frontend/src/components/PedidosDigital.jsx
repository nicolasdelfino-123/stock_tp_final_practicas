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
    if (!fecha) return "";   // 👈 si viene null, undefined o "", devuelve vacío
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
    // 👇 NUEVO: guarda el primer proveedor elegido en VIENE durante la sesión actual
    const [proveedorPorDefecto, setProveedorPorDefecto] = useState("");


    // NUEVO: tras "Resetear", en la vista TODOS ocultamos los que están en VIENE
    const [excluirVienen, setExcluirVienen] = useState(false);
    // Añadir al inicio del componente, junto a los otros estados
    const [pedidosMarcadosRecien, setPedidosMarcadosRecien] = useState(new Set());
    const [editorial, setEditorialLibro] = useState("");

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
    // Calcula y memoriza la lista final de pedidos según:
    // 1. Filtrado por fechas y por texto de búsqueda.
    // 2. Estado seleccionado en los botones ("VIENE", "NO_VIENE" o "TODOS").
    // 3. Si está activado "excluirVienen", quita los pedidos con estado "VIENE".
    // Devuelve el arreglo resultante ya filtrado, evitando recalcularlo
    // innecesariamente gracias a useMemo.
    const pedidosFiltrados = useMemo(() => {
        let base = filtrarPorBusqueda(filtrarPorFechas(pedidos));

        // Botones "Todos / Vienen / No vienen"
        if (filtroEstado === "VIENE") return base.filter(p => (p.estado || "") === "VIENE");
        if (filtroEstado === "NO_VIENE") return base.filter(p => (p.estado || "") === "NO_VIENE");

        if (filtroEstado === "TODOS" && excluirVienen) {
            return base.filter(p => {
                // Si fue marcado en este ciclo (sin importar su estado o motivo), SIEMPRE mostrarlo
                if (pedidosMarcadosRecien.has(p.id)) {
                    return true;
                }
                // Ocultar TODOS los pedidos con estado "VIENE"
                return (p.estado || "") !== "VIENE";
            });
        }
        // Si no hay filtro de estado, devuelve todos los pedidos filtrados por texto y fechas.
        return base;
    }, [pedidos, terminoBusqueda, fechaDesde, fechaHasta, filtroEstado, excluirVienen, pedidosMarcadosRecien]);

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
      <td>${p.titulo || "-"}</td>
      <td>${p.autor || "-"}</td>
      <td>${p.editorial || "-"}</td>   <!-- ⬅️ NUEVO -->
      <td style="text-align:center">${p.cantidad || 1}</td>
      <td>${p.isbn || "-"}</td>
    </tr>
  `).join("");

        const vent = window.open("", "_blank");
        const fechaImpresion = new Date().toLocaleDateString('es-AR');
        const visibles = filtrarPorBusqueda(pedidosFiltrados);
        const totalLibros = visibles.length;

        vent.document.write(`
<html>
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
      word-wrap: break-word; overflow-wrap: break-word; white-space: normal;
      box-sizing: border-box; vertical-align: top;
    }
    th { background-color: white; color: black; font-weight: bold; white-space: nowrap; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    tr:hover { background-color: #e8f4fd; }
    @media print {
      body { margin: 0.5cm; }
      table { font-size: 8pt; width: 100% !important; min-width: 100% !important; }
      th, td {
        padding: 2px 4px; color: black !important; border: 1px solid black !important;
        word-break: break-all !important;
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
    <thead>
      <tr>
        <th>Título</th>
        <th>Autor</th>
        <th>Editorial</th>   <!-- ⬅️ NUEVO -->
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
                            background: "blue"
                        }}
                    >
                        <thead>
                            <tr style={{ backgroundColor: "#0655a8ff", color: 'white' }}>
                                <th style={thStyle}>Cliente</th>
                                <th style={thStyle}>Título</th>
                                <th style={thStyle}>Autor</th>
                                <th style={thStyle}>Editorial</th> {/* ⬅️ NUEVO */}
                                <th style={thStyleCenter}>Cant.</th>
                                <th style={thStyle}>ISBN</th>
                                <th style={thStyleCenter}>Fecha pedido</th>
                                {filtroEstado === "VIENE" && (
                                    <th style={thStyleCenter}>Fecha viene</th>
                                )}
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


                                            <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <button className="btn-viene-tabla-principal"
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
            </div >
        </div >
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
    border: "1px solid #907575ff",
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
