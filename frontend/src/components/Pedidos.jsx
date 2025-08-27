import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useNavigationType } from "react-router-dom";
import { useAppContext } from "../context/appContext";

const PedidoForm = () => {
  const navigate = useNavigate();
  const { actions, modalPedidosAbierto, setModalPedidosAbierto } = useAppContext();
  const [nombreCliente, setNombreCliente] = useState("");
  const [tituloLibro, setTituloLibro] = useState("");
  const [autorLibro, setAutorLibro] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [seña, setSenia] = useState("");
  const [isbn, setIsbn] = useState("");
  const [comentario, setComentario] = useState("");
  const [fecha, setFecha] = useState(() => {
    const hoy = new Date();
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    return hoy.toISOString().split('T')[0].split('-').reverse().join('/');
  });
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [todosLosPedidos, setTodosLosPedidos] = useState([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [showPedidos, setShowPedidos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const imprimirRef = useRef();
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [ultimoNombreCliente, setUltimoNombreCliente] = useState(localStorage.getItem('ultimoNombreCliente') || "");
  const [ultimoTelefono, setUltimoTelefono] = useState(localStorage.getItem('ultimoTelefono') || "");
  const inputRef = useRef([]);
  const inputModalRef = useRef(null);
  const modalRef = useRef(null);
  const navType = useNavigationType();  // "PUSH", "POP" o "REPLACE"
  const firstRunRef = useRef(true);
  const [editorial, setEditorialLibro] = useState("");

  useEffect(() => {
    if (nombreCliente?.trim()) {
      const v = nombreCliente.trim();
      localStorage.setItem('ultimoNombreCliente', v);
      setUltimoNombreCliente(v);
    }
  }, [nombreCliente]);

  useEffect(() => {
    if (telefonoCliente?.trim()) {
      const v = telefonoCliente.trim();
      localStorage.setItem('ultimoTelefono', v);
      setUltimoTelefono(v);
    }
  }, [telefonoCliente]);



  // 🔑 Controlar apertura del modal según cómo llegamos a esta pantalla
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;

      if (navType === "POP") {
        // Volviste con atrás (-1): respetamos el flag global
        setShowPedidos(!!modalPedidosAbierto);
      } else {
        // Llegaste "desde cero" (PUSH/REPLACE): forzar cerrado
        setShowPedidos(false);
        setModalPedidosAbierto(false);
      }
      return;
    }

    // En cambios posteriores del flag, sincronizamos normalmente
    setShowPedidos(!!modalPedidosAbierto);
  }, [modalPedidosAbierto, navType, setModalPedidosAbierto]);


  // XXX PEGAR ARRIBA DE formatearFechaArgentina: helper robusto
  const parseFechaFlexible = (valor) => {
    if (valor == null) return null;
    const s = String(valor).trim();

    // DD/MM/YYYY
    const mDMY = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const dmy = s.match(mDMY);
    if (dmy) {
      const [_, dd, mm, yyyy] = dmy;
      const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0, 0); // mediodía local
      return dt;
    }

    // YYYY-MM-DD (sin hora)
    const mYMD = /^(\d{4})-(\d{2})-(\d{2})(?!T)/; // asegura que NO haya 'T'
    const ymd = s.match(mYMD);
    if (ymd) {
      const [_, yyyy, mm, dd] = ymd;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd)); // local, sin TZ
    }

    // ISO completo con hora -> dejá que JS lo parsee (puede traer TZ)
    const dt = new Date(s);
    if (!isNaN(dt)) return dt;

    return null;
  };

  // XXX REEMPLAZAR tu formatearFechaArgentina por esta
  const formatearFechaArgentina = (valor) => {
    const dt = parseFechaFlexible(valor);
    if (!dt) return valor ?? "";
    return dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };





  useEffect(() => {
    cargarPedidos();
  }, []);

  useEffect(() => {
    if (showPedidos && modalRef.current) {
      modalRef.current.focus();
    }
  }, [showPedidos]);


  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const result = await actions.obtenerPedidos();
      if (result.success) {
        setTodosLosPedidos(result.pedidos);
        setPedidosFiltrados(result.pedidos);
      } else {
        console.error("Error al cargar pedidos:", result.error);
        alert("Error al cargar los pedidos");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al conectar con el servidor");
    }
    setLoading(false);
  };


  const handleImprimir = () => {
    const contenido = imprimirRef.current.innerHTML;
    const ventana = window.open('', '_blank');

    ventana.document.write(`
    <html>
      <head>
        <title>Pedido - Librería Charles</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 0;
          }
          .page-container {
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .copias-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            page-break-inside: avoid;
          }
          .logo-container { 
            text-align: center; 
            margin-bottom: 10px;
          }
          .pedido-container {
            border: 2px solid #34495e; 
            border-radius: 10px; 
            margin: 10px 0;
            padding: 15px;
            background: #f8f9fa;
            flex: 1;
            page-break-inside: avoid;
          }
          .destinatario { 
            background: #e3f2fd; 
            padding: 10px;
            border-radius: 8px; 
            border-left: 4px solid #1976d2;
            margin-bottom: 10px;
          }
          .campo { 
            margin: 8px 0; 
            font-size: 14px;
          }
          .campo strong { 
            color: #2c3e50; 
          }
          .valor { 
            color: #34495e; 
            font-weight: 500; 
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .page-container {
              height: auto;
            }
            .pedido-container {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <div class="copias-container">
            ${contenido}
          </div>
        </div>
        <script>
          window.onload = function() {
            // Ajustar tamaño de fuentes si es necesario
            const pedidoContainers = document.querySelectorAll('.pedido-container');
            const pageHeight = window.innerHeight;
            const contentHeight = document.querySelector('.copias-container').scrollHeight;
            
            if (contentHeight > pageHeight * 0.9) {
              const scaleFactor = (pageHeight * 0.9) / contentHeight;
              document.body.style.transform = 'scale(' + scaleFactor + ')';
              document.body.style.transformOrigin = 'top center';
            }
            
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
    ventana.document.close();
  };


  // NUEVO: imprime solo los pedidos que VIENEN usando la vista actual (con búsqueda aplicada)
  const handleImprimirVienen = () => {
    // Base: lo que estás viendo en el modal con el filtro de búsqueda
    const visibles = filtrarPorBusqueda(pedidosFiltrados);
    const lista = visibles.filter(p => (p.estado || "") === "VIENE" && !p.oculto);


    if (!lista.length) {
      alert("No hay pedidos marcados como VIENE para imprimir.");
      return;
    }

    const rows = lista.map((p) => `
    <tr>
      <td>${p.cliente_nombre || "-"}</td>
      <td>${p.titulo || "-"}</td>
      <td>${p.autor || "-"}</td>
      <td>${p.editorial || "-"}</td>
      <td style="text-align:center">${p.cantidad || 1}</td>
      <td>${p.motivo || "-"}</td>
    </tr>
  `).join("");

    const vent = window.open("", "_blank");
    const fechaImpresion = new Date().toLocaleDateString('es-AR');
    const totalLibros = lista.length;

    vent.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pedidos que VIENEN</title>
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
  <h2>Pedidos que VIENEN</h2>
  <h5>Fecha de impresión: ${fechaImpresion} &nbsp;|&nbsp; Cantidad de títulos en página: ${totalLibros}</h5>
  <table>
    <thead>
      <tr>
        <th>Cliente</th>
        <th>Título</th>
        <th>Autor</th>
        <th>Editorial</th>
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



  const guardadoEnEstaImpresion = useRef(false);
  const editadoConExito = useRef(false);
  const ultimoPedidoGuardado = useRef(null); // <-- NUEVO

  const limpiarFormulario = () => {
    setNombreCliente('');
    setTituloLibro('');
    setAutorLibro('');
    setCantidad(0);
    setFecha('');
    setSenia('');
    setComentario('');
    setIsbn('');
    setTelefonoCliente('');
    setEditandoId(null);
    setEditorialLibro('');
    guardadoEnEstaImpresion.current = false;
    editadoConExito.current = false;
    ultimoPedidoGuardado.current = null;  // <-- LIMPIAMOS también aquí
  };

  const verificarDatosYResetearFlags = () => {
    // 👉 Normalizar seña IGUAL que en handleGuardar
    const señaNumero = Number(String(seña).replace(/\D/g, ''));

    const datosActuales = {
      nombreCliente,
      tituloLibro,
      autorLibro,
      editorial,
      cantidad,
      fecha,
      seña: isNaN(señaNumero) ? 0 : señaNumero, // ← numérica
      comentario,
      isbn,
      telefonoCliente
    };

    const sonDistintos = JSON.stringify(datosActuales) !== JSON.stringify(ultimoPedidoGuardado.current);
    if (sonDistintos) {
      guardadoEnEstaImpresion.current = false;
      editadoConExito.current = false;
    }
  };

  // esta función se llama desde el botón Guardar y desde Imprimir (si no está guardado)
  // por eso la lógica de verificación de cambios se separó en verificarDatosYResetearFlags
  const handleGuardar = async () => {
    const señaNumero = Number(String(seña).replace(/\D/g, ''));
    const datosActuales = {
      nombreCliente,
      tituloLibro,
      autorLibro,
      editorial,
      cantidad,
      fecha,
      seña: isNaN(señaNumero) ? 0 : señaNumero,  // 👈 preserva 0
      comentario,
      isbn,
      telefonoCliente
    };

    // Si los datos actuales son distintos al último pedido guardado,
    // reseteamos los flags para permitir guardar otra vez
    const sonDistintos = JSON.stringify(datosActuales) !== JSON.stringify(ultimoPedidoGuardado.current);
    if (sonDistintos) {
      guardadoEnEstaImpresion.current = false;
      editadoConExito.current = false;
    }

    if (!editandoId && guardadoEnEstaImpresion.current) {
      alert("Este pedido ya fue guardado");
      return;
    }
    if (editandoId && editadoConExito.current) {
      alert("Este pedido ya fue actualizado. Para crear uno nuevo, comienza un pedido desde cero.");
      return;
    }

    if (
      !nombreCliente ||
      !tituloLibro ||
      !autorLibro ||
      seña === "" || seña === null || seña === undefined ||   // 👈 ahora 0 es válido
      !telefonoCliente
    ) {
      alert("Por favor complete todos los campos obligatorios");
      return;
    }

    if (cantidad === 0) {
      alert("La cantidad no puede ser cero");
      return;
    }

    setUltimoNombreCliente(nombreCliente);
    setUltimoTelefono(telefonoCliente);
    localStorage.setItem('ultimoNombreCliente', nombreCliente);
    localStorage.setItem('ultimoTelefono', telefonoCliente);

    setLoading(true);

    try {
      let result;
      if (editandoId) {
        result = await actions.actualizarPedido(editandoId, datosActuales);
      } else {
        result = await actions.crearPedido(datosActuales);
      }

      if (result.success) {
        ultimoPedidoGuardado.current = datosActuales; // <-- Guardamos para comparar después

        if (editandoId) {
          alert("Pedido editado con éxito.");
          editadoConExito.current = true;

        } else {
          alert("Pedido guardado con éxito");
          guardadoEnEstaImpresion.current = true;

        }
        await cargarPedidos();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error al guardar el pedido:", error);
      alert("Error al conectar con el servidor");
    }

    setLoading(false);
  };

  const handleImprimirClick = async () => {
    verificarDatosYResetearFlags();  // <--- esta es la mejora clave acá

    if (!editandoId) {
      if (!guardadoEnEstaImpresion.current) {
        const confirmar = window.confirm("Antes debes guardar el pedido. ¿Quieres guardarlo?");
        if (!confirmar) return;

        await handleGuardar();

        // Luego de guardar nuevo pedido, si no se guardó bien no imprimir:
        if (!guardadoEnEstaImpresion.current) return;
      } else {
        alert("Este pedido ya fue guardado");
        // Si ya guardado, puede imprimir sin problemas
      }
    } else {
      // Si estamos editando, permitir imprimir sin bloqueos
    }

    handleImprimir();
  };

  // Cuando cargas pedido para editar, resetear flags para que pueda guardar:
  useEffect(() => {
    if (editandoId) {
      guardadoEnEstaImpresion.current = false;
      editadoConExito.current = false;
    }
  }, [editandoId]);





  const handleLimpiarFormulario = () => {
    setNombreCliente("");
    setTituloLibro("");
    setAutorLibro("");
    setCantidad(1);
    const hoy = new Date();
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    setFecha(hoy.toISOString().split('T')[0].split('-').reverse().join('/'));
    setSenia("");
    setComentario("");
    setEditandoId(null);
    setIsbn("");
    setTelefonoCliente("");
    setEditorialLibro("");
  };

  const handleVerPedidos = () => {
    setShowPedidos(true);
    setModalPedidosAbierto(true);
  };

  const handleCerrarPedidos = () => {
    setShowPedidos(false);
    setModalPedidosAbierto(false);
  };


  useEffect(() => {
    if (inputModalRef.current) {
      inputModalRef.current.focus(); // Le da foco al input cuando el componente carga
    }
  }, []);



  const handleImprimirTodos = () => {
    if (pedidosFiltrados.length === 0) {
      alert("No hay pedidos para imprimir");
      return;
    }

    const tabla = document.getElementById('tabla-todos-pedidos');
    const ventana = window.open('', '_blank');
    const tablaClonada = tabla.cloneNode(true);

    // Ajustes de encabezados (ahora con Editorial)
    const thCant = tablaClonada.querySelector('thead tr th:nth-child(6)'); // Cant. es col 6
    if (thCant) thCant.textContent = 'Cant.';

    const thComentario = tablaClonada.querySelector('thead tr th:nth-child(11)'); // Coment. es col 11
    if (thComentario) thComentario.textContent = 'Coment.';

    // Eliminar la última columna (Acciones) de encabezados y filas (ahora es la 12)
    const encabezados = tablaClonada.querySelectorAll('th');
    const filas = tablaClonada.querySelectorAll('tr');
    const ultimaCol = encabezados.length - 1; // 12

    if (encabezados[ultimaCol]) {
      encabezados[ultimaCol].remove();
    }
    filas.forEach(fila => {
      const celdas = fila.querySelectorAll('td');
      if (celdas.length > ultimaCol) {
        celdas[ultimaCol].remove();
      }
    });

    const fechaImpresion = new Date().toLocaleDateString('es-AR');
    const visibles = filtrarPorBusqueda(pedidosFiltrados);
    const totalLibros = visibles.length;

    ventana.document.write(`
<html lang="es">
  <head>
    <title>Todos los Pedidos - Librería Charles</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 10px; }
      .header { text-align: center; margin-bottom: 15px; }
      .titulo { color: #2c3e50; margin: 10px 0; }

      table {
        border-collapse: collapse; width: 100%; max-width: 100%;
        table-layout: fixed; font-size: 10px; border: 1px solid black !important;
      }
      th, td {
        border: 1px solid black !important; padding: 4px 6px; text-align: left;
        white-space: normal; box-sizing: border-box; vertical-align: top;
        hyphens: auto; -webkit-hyphens: auto; -ms-hyphens: auto;
        overflow-wrap: anywhere; word-break: normal;
      }
      th {
        background-color: white; color: black; font-weight: bold;
        border: 1px solid black !important; white-space: normal;
      }

      /* —— ANCHOS COLUMNAS EN PANTALLA (11 columnas, SIN “Acciones”) —— 
         1: CLIENTE
         2: TELÉFONO
         3: TÍTULO
         4: AUTOR
         5: EDITORIAL (NUEVO)
         6: CANTIDAD
         7: ISBN
         8: FECHA
         9: FECHA PEDIDO
        10: SEÑA
        11: COMENTARIOS
      */
      th:nth-child(1),  td:nth-child(1)  { width: 11% !important; }
      th:nth-child(2),  td:nth-child(2)  { width: 10% !important; }
      th:nth-child(3),  td:nth-child(3)  { width: 13% !important; }
      th:nth-child(4),  td:nth-child(4)  { width: 12% !important; }
      th:nth-child(5),  td:nth-child(5)  { width: 10% !important; } /* Editorial */
      th:nth-child(6),  td:nth-child(6)  { width: 6%  !important; } /* Cant. */
      th:nth-child(7),  td:nth-child(7)  { width: 8%  !important; } /* ISBN */
      th:nth-child(8),  td:nth-child(8)  { width: 8%  !important; } /* Fecha */
      th:nth-child(9),  td:nth-child(9)  { width: 8%  !important; } /* Fecha Pedido */
      th:nth-child(10), td:nth-child(10) { width: 6%  !important; } /* Seña */
      th:nth-child(11), td:nth-child(11) { width: 8%  !important; } /* Coment. */

      tr:nth-child(even) { background-color: #f2f2f2; }
      tr:hover { background-color: #e8f4fd; }

      @media print {
        body { margin: 0.5cm; }
        table {
          font-size: 8pt; width: 100% !important; max-width: 100% !important; min-width: 100% !important;
          table-layout: fixed; page-break-inside: auto; border: 1px solid black !important;
        }
        th, td {
          padding: 2px 4px; white-space: normal; color: black !important; border: 1px solid black !important;
          hyphens: auto; -webkit-hyphens: auto; -ms-hyphens: auto; overflow-wrap: anywhere; word-break: normal !important;
        }
        th { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        tr { page-break-inside: avoid; page-break-after: auto; }

        /* —— ANCHOS EN IMPRESIÓN (11 columnas) —— */
        th:nth-child(1),  td:nth-child(1)  { width: 10% !important; }/* Cliente */
        th:nth-child(2),  td:nth-child(2)  { width: 10% !important; }/* Tel */
        th:nth-child(3),  td:nth-child(3)  { width: 10% !important; }/* titulo */
        th:nth-child(4),  td:nth-child(4)  { width: 9% !important; }/* autor */
        th:nth-child(5),  td:nth-child(5)  { width: 10% !important; } /* Editorial */
        th:nth-child(6),  td:nth-child(6)  { width: 8%  !important; } /* Cant. */
        th:nth-child(7),  td:nth-child(7)  { width: 8%  !important; }/* isbn */
        th:nth-child(8),  td:nth-child(8)  { width: 8%  !important; }/* fecha */
        th:nth-child(9),  td:nth-child(9)  { width: 8%  !important; }/* fecha pedido */
        th:nth-child(10), td:nth-child(10) { width: 9%  !important; }/* seña */
        th:nth-child(11), td:nth-child(11) { width: 10%  !important; }/* comentarios */
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h2 class="titulo">Pedidos Librería Charles</h2>
      <h5>Fecha de impresión: ${fechaImpresion} &nbsp;|&nbsp; Cantidad de libros en página: ${totalLibros}</h5>
    </div>
    ${tablaClonada.outerHTML}
  </body>
</html>
  `);
    ventana.document.close();
    ventana.print();
  };


  const handleImprimirParaRicardo = () => {
    if (pedidosFiltrados.length === 0) {
      alert("No hay pedidos para imprimir");
      return;
    }

    const tabla = document.getElementById('tabla-todos-pedidos');
    const tablaClonada = tabla.cloneNode(true);

    const encabezados = tablaClonada.querySelectorAll('th');
    const celdas = tablaClonada.querySelectorAll('td');

    // Con Editorial, hay 12 columnas en total:
    // 1 Cliente, 2 Teléfono, 3 Título, 4 Autor, 5 Editorial, 6 Cantidad, 7 ISBN, 8 Fecha, 9 Fecha Pedido, 10 Seña, 11 Comentarios, 12 Acciones
    // Queremos conservar: 3,4,5,6,7 -> Título, Autor, Editorial, Cantidad, ISBN
    const columnasAEliminar = [0, 1, 7, 8, 9, 10, 11]; // (0-based) quitamos: Cliente, Teléfono, Fecha, Fecha Pedido, Seña, Comentarios, Acciones
    const cantidadColumnas = 12;

    columnasAEliminar.forEach(index => {
      if (encabezados[index]) encabezados[index].remove();
      celdas.forEach((celda, i) => {
        if (i % cantidadColumnas === index) celda.remove();
      });
    });

    const ventana = window.open('', '_blank');
    const fechaImpresion = new Date().toLocaleDateString('es-AR');

    const visibles = filtrarPorBusqueda(pedidosFiltrados);
    const totalLibros = visibles.length;

    ventana.document.write(`
<html lang="es">
<head>
  <title>Pedidos Ricardo Delfino - Librería Charles</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 10px; }
    .header { text-align: center; margin-bottom: 15px; }
    .titulo { color: #2c3e50; margin: 10px 0; }

    table {
      border-collapse: collapse; width: 100%; max-width: 100%;
      table-layout: fixed; font-size: 10px; border: 1px solid black !important;
    }
    th, td {
      border: 1px solid black !important; padding: 4px 6px; text-align: left;
      white-space: normal; box-sizing: border-box; vertical-align: top;
      hyphens: auto; -webkit-hyphens: auto; -ms-hyphens: auto;
      overflow-wrap: anywhere; word-break: normal;
    }
    th {
      background-color: white; color: black; font-weight: bold;
      border: 1px solid black !important; white-space: normal;
    }

    /* —— Anchos PANTALLA (5 columnas) ——
       1: TÍTULO
       2: AUTOR
       3: EDITORIAL
       4: CANTIDAD
       5: ISBN
    */
    th:nth-child(1), td:nth-child(1) { width: 34% !important; } /* Título */
    th:nth-child(2), td:nth-child(2) { width: 22% !important; } /* Autor */
    th:nth-child(3), td:nth-child(3) { width: 16% !important; } /* Editorial */
    th:nth-child(4), td:nth-child(4) { width: 10% !important; } /* Cantidad */
    th:nth-child(5), td:nth-child(5) {
      width: 18% !important;         /* ISBN */
      border-right: 1px solid black !important; white-space: normal;
    }

    tr:nth-child(even) { background-color: #f2f2f2; }
    tr:hover { background-color: #e8f4fd; }

    @media print {
      body { margin: 0.5cm; }
      table {
        font-size: 8pt; width: 100% !important; max-width: 100% !important; min-width: 100% !important;
        table-layout: fixed; page-break-inside: auto; border: 1px solid black !important;
      }
      th, td {
        padding: 2px 4px; white-space: normal; color: black !important; border: 1px solid black !important;
        hyphens: auto; -webkit-hyphens: auto; -ms-hyphens: auto; overflow-wrap: anywhere; word-break: normal !important;
      }
      th { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr { page-break-inside: avoid; page-break-after: auto; }

      /* —— Anchos IMPRESIÓN (5 columnas) —— */
      th:nth-child(1), td:nth-child(1) { width: 36% !important; } /* Título */
      th:nth-child(2), td:nth-child(2) { width: 22% !important; } /* Autor */
      th:nth-child(3), td:nth-child(3) { width: 16% !important; } /* Editorial */
      th:nth-child(4), td:nth-child(4) { width: 10% !important; } /* Cantidad */
      th:nth-child(5), td:nth-child(5) {
        width: 16% !important;        /* ISBN */
        border-right: 1px solid black !important; white-space: normal;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 class="titulo">Librería Charles</h2>
    <h3>Las Varillas, Córdoba - 9 de julio 346</h3>
    <h4>Teléfonos: 03533-420183 / Móvil: 03533-682652</h4>
    <h5>Fecha de impresión: ${fechaImpresion} &nbsp;|&nbsp; Cantidad de libros en página: ${totalLibros}</h5>
  </div>

  ${tablaClonada.outerHTML}
</body>
</html>
  `);
    ventana.document.close();
    ventana.print();
  };

  const handleEditarPedido = async (id) => {
    const pedido = todosLosPedidos.find(p => p.id === id);
    if (pedido) {
      // 1. Cerrar el modal de pedidos primero
      setShowPedidos(false);

      // 2. Esperar un momento para que se cierre el modal
      await new Promise(resolve => setTimeout(resolve, 100));

      // 3. Llenar los datos del formulario
      setNombreCliente(pedido.cliente_nombre);
      setTituloLibro(pedido.titulo);
      setAutorLibro(pedido.autor);
      setCantidad(pedido.cantidad || 1);
      setFecha(formatearFechaArgentina(pedido.fecha));
      setSenia(
        pedido.seña !== null && pedido.seña !== undefined
          ? String(pedido.seña)
          : ""
      );
      setComentario(pedido.comentario || "");
      setIsbn(pedido.isbn || "");
      setTelefonoCliente(pedido.telefonoCliente || "");
      setEditandoId(id);
      setEditorialLibro(pedido.editorial || "");

      // 4. Navegar al formulario (si es necesario)
      navigate("/pedidos"); // Asegúrate que esta ruta sea correcta para tu formulario

      // 5. Hacer scroll al formulario para mejor experiencia de usuario
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // ⬇️ DEBAJO de handleEditarPedido
  const handleOcultarPedido = async (id) => {
    if (!window.confirm("Solo ocultar si el libro ya fue entregado, ¿Deseas ocultarlo?")) return;
    setLoading(true);
    try {
      const result = await actions.ocultarPedidos([id]); // ya existe en actions
      if (result.success) {
        alert("Pedido ocultado");
        await cargarPedidos(); // recarga visibles
      } else {
        alert(`Error al ocultar: ${result.error}`);
      }
    } catch (error) {
      console.error("Error al ocultar:", error);
      alert("Error al conectar con el servidor");
    }
    setLoading(false);
  };

  // ⬇️ DEBAJO de handleOcultarPedido
  const handleRecuperarPedido = async (pedido) => {
    // Usamos actualizarPedido con TODOS los datos actuales + oculto:false
    // para no pisar campos con ""/0 (por cómo arma el body tu action).
    setLoading(true);
    try {
      const bodyParaActualizar = {
        nombreCliente: pedido.cliente_nombre,
        tituloLibro: pedido.titulo,
        telefonoCliente: pedido.telefonoCliente || "",
        autorLibro: pedido.autor,
        editorial: pedido.editorial || "",
        cantidad: pedido.cantidad,
        fecha: pedido.fecha,               // ISO del backend -> ok
        seña: pedido.seña || 0,
        comentario: pedido.comentario || "",
        isbn: pedido.isbn || "",
        fecha_viene: pedido.fecha_viene || null,
        estado: pedido.estado || "",
        motivo: pedido.motivo || "",
        oculto: false                      // 🚀 clave para recuperar
      };

      const result = await actions.actualizarPedido(pedido.id, bodyParaActualizar);
      if (result.success) {
        alert("Pedido recuperado");
        await cargarPedidos(); // vuelve a mostrar visibles
      } else {
        alert(`Error al recuperar: ${result.error}`);
      }
    } catch (error) {
      console.error("Error al recuperar:", error);
      alert("Error al conectar con el servidor");
    }
    setLoading(false);
  };



  const handleEliminarPedido = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este pedido?")) {
      setLoading(true);
      try {
        const result = await actions.eliminarPedido(id);
        if (result.success) {
          alert("Pedido eliminado con éxito");
          await cargarPedidos();
        } else {
          alert(`Error al eliminar: ${result.error}`);
        }
      } catch (error) {
        console.error("Error al eliminar el pedido:", error);
        alert("Error al conectar con el servidor");
      }
      setLoading(false);
    }
  };

  const handleFiltrarPorFecha = async () => {
    if (!fechaDesde || !fechaHasta) {
      alert("Por favor seleccione ambas fechas");
      return;
    }

    try {
      // Convertir las fechas del input a formato DD/MM/YYYY
      const parseInputDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-');
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      };

      // Convertir fechas a objetos Date ignorando la zona horaria
      const createDate = (dateStr) => {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
      };

      const desdeFormatted = parseInputDate(fechaDesde);
      const hastaFormatted = parseInputDate(fechaHasta);

      const desdeDate = createDate(desdeFormatted);
      desdeDate.setHours(0, 0, 0, 0);

      const hastaDate = createDate(hastaFormatted);
      hastaDate.setHours(23, 59, 59, 999);

      if (desdeDate > hastaDate) {
        alert("La fecha 'Desde' no puede ser mayor que la fecha 'Hasta'");
        return;
      }

      const result = await actions.obtenerPedidos();
      if (result.success) {
        const pedidosFiltrados = result.pedidos.filter(pedido => {
          // Convertir la fecha del pedido a objeto Date
          const fechaPedido = parseFechaFlexible(pedido.fecha);

          if (!isNaN(fechaPedido)) {
            // Fijamos al mediodía local para que no se corra al día anterior por UTC
            fechaPedido.setHours(12, 0, 0, 0);
          }
          return fechaPedido >= desdeDate && fechaPedido <= hastaDate;
        });


        setPedidosFiltrados(pedidosFiltrados);

        // Mostrar alerta con las fechas en formato DD/MM/YYYY
        if (desdeFormatted === hastaFormatted) {
          alert(`Se encontraron ${pedidosFiltrados.length} pedidos para el día ${desdeFormatted}`);
        } else {
          alert(`Se encontraron ${pedidosFiltrados.length} pedidos entre ${desdeFormatted} y ${hastaFormatted}`);
        }
      } else {
        alert("Error al cargar pedidos para filtrar");
      }
    } catch (error) {
      console.error("Error al filtrar por fecha:", error);
      alert("Error al filtrar por fecha");
    }
  };


  const filtrarPorBusqueda = (pedidos) => {
    if (!terminoBusqueda) return pedidos;

    const termino = terminoBusqueda.toLowerCase();
    return pedidos.filter(pedido =>
    (pedido.cliente_nombre?.toLowerCase().includes(termino) ||
      (pedido.titulo?.toLowerCase().includes(termino)) ||
      (pedido.autor?.toLowerCase().includes(termino)) ||
      (pedido.isbn?.toLowerCase().includes(termino))
    ));
  };



  const formatNumberWithDots = (value) => {
    // Si es número, convertirlo a string
    if (typeof value === 'number') {
      value = value.toString();
    }
    // Si no es string, devolver vacío
    if (typeof value !== 'string') {
      return '';
    }
    // Eliminar todo lo que no sea dígito
    const numericValue = value.replace(/\D/g, '');
    // Formatear con puntos cada 3 dígitos desde el final
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleSeniaChange = (e) => {
    const rawValue = e.target.value;
    // Guardamos el valor formateado en el estado
    setSenia(formatNumberWithDots(rawValue.replace(/\D/g, '')));
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = inputRef.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }

    }
  };

  const fondoURL = "/fondoo.webp"


  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;

    if (checked) {
      const ultNombre =
        localStorage.getItem('ultimoNombreCliente') || ultimoNombreCliente || "";
      const ultTel =
        localStorage.getItem('ultimoTelefono') || ultimoTelefono || "";

      setNombreCliente(ultNombre);
      setTelefonoCliente(ultTel);
    } else {
      // al destildar, limpiar los inputs (no borra lo guardado en localStorage)
      setNombreCliente("");
      setTelefonoCliente("");
    }
  };


  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#7ec27e',
      padding: '20px',
      backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)),url(${fondoURL})`,
      backgroundSize: "cover",
    }}>
      <div
      >

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div className="d-flex ">
            <button
              type="button"
              className="btn"
              onClick={() => navigate("/")}
              style={{
                borderRadius: "8px",
                padding: "10px 20px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                transition: "background-color 0.3s ease",
                zIndex: 2,
                backgroundColor: "#fcf00cff",
                fontWeight: 'bold',
                height: '50px',

              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#e4f00aff")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#fcf00cff")}
            >
              Volver al Inicio
            </button>
            <div style={{ textAlign: 'center', flexGrow: 1 }}>
              <h2
                style={{
                  color: 'white',
                  fontSize: '50px',
                  fontWeight: 700,                // ← estaba "700px"
                  textShadow: '4px 4px 22px rgba(0,0,0,0.9)',
                  lineHeight: 1,                  // compacta el alto
                  transform: 'translateY(-3px)'  // ← sube el título (ajustá -18 a gusto)
                }}
              >
                <strong>Formulario de Pedido</strong>
              </h2>
            </div>
          </div>


        </div>

        <div style={{
          backgroundColor: '#bbf5b6ff',
          padding: '30px',
          borderRadius: '10px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>







          {/* Campos del formulario */}
          <div style={{ marginBottom: '20px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">

            </div>
            <div style={{ marginBottom: '20px' }}>
              {/* Fila de etiquetas y checkbox - TODOS EN LA MISMA LÍNEA */}
              <div className="row align-items-center mb-2">
                {/* Nombre del Cliente */}
                <div className="col-12 col-md-6" style={{ padding: 0 }}>
                  <label
                    style={{
                      fontWeight: 'bold',
                      color: 'black',
                      fontSize: '22px',
                      fontFamily: 'Roboto',
                      marginBottom: 0,
                      display: 'block',
                      marginLeft: '15px',
                    }}
                  >
                    Nombre y Apellido
                  </label>
                </div>

                {/* Teléfono */}
                <div className="col-12 col-md-4" style={{ padding: 0 }}>
                  <label

                    style={{
                      fontWeight: 'bold',
                      color: 'black',
                      fontSize: '22px',
                      fontFamily: 'Roboto',
                      marginBottom: 0,
                      display: 'block',
                      marginLeft: '10px',
                    }}
                  >
                    Teléfono
                  </label>
                </div>

                {/* Checkbox - Usar nombre escrito */}
                <div className="col-12 col-md-2 d-flex justify-content-end align-items-center"
                  style={{ gap: '10px', padding: 0 }}>
                  <input
                    type="checkbox"
                    onChange={handleCheckboxChange}
                    style={{
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      accentColor: '#4caf50',
                    }}
                    id="usarNombreCheckbox"
                  />
                  <label
                    htmlFor="usarNombreCheckbox"
                    style={{
                      fontWeight: 'bold',
                      color: 'black',
                      fontSize: '18px',
                      fontFamily: 'Roboto',
                      marginBottom: 0,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap' // Evita que el texto se divida en dos líneas
                    }}
                  >
                    Usar nombre escrito
                  </label>
                </div>
              </div>

              {/* Fila de inputs - 6 columnas cada uno */}
              <div className="row mb-0">
                {/* Input Nombre */}
                <div className="col-12 col-md-6 mb-3" style={{ paddingRight: '10px' }}>
                  <input
                    type="text"
                    ref={el => inputRef.current[0] = el}
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    onKeyDown={(e) => { handleKeyDown(e, 0) }}
                    placeholder="Ingrese el nombre y apellido del cliente"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #95a5a6',
                      borderRadius: '14px',
                      fontSize: '20px',
                      color: 'black',
                      fontWeight: '700',
                    }}
                  />
                </div>

                {/* Input Teléfono */}
                <div className="col-12 col-md-6 mb-3" style={{ paddingLeft: '10px' }}>
                  <input
                    ref={el => inputRef.current[1] = el}
                    onKeyDown={(e) => handleKeyDown(e, 1)}
                    type="text"
                    value={telefonoCliente}
                    onChange={(e) => setTelefonoCliente(e.target.value)}
                    placeholder="Ingrese el teléfono del cliente"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #95a5a6',
                      borderRadius: '14px',
                      fontSize: '20px',
                      fontWeight: '700',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>





          <label style={{ fontWeight: 'bold', color: 'black', display: 'block', marginBottom: '5px', marginTop: '-15px', fontSize: "22px", fontFamily: 'Roboto' }}>
            Título del Libro
          </label>
          <input
            type="text"
            ref={el => inputRef.current[2] = el}
            onKeyDown={(e) => handleKeyDown(e, 2)}
            value={tituloLibro}
            onChange={(e) => setTituloLibro(e.target.value)}
            placeholder="Ingrese el título del libro"
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #95a5a6',
              borderRadius: '14px',
              fontSize: '20px',
              fontWeight: '700'
            }}
          />



          <div className="row">
            <div className="col-md-6" style={{ marginBottom: '20px' }}>
              <label
                style={{ fontWeight: 'bold', color: 'black', display: 'block', marginBottom: '5px', marginTop: '15px', fontSize: "22px", fontFamily: 'Roboto' }}>
                Autor
              </label>
              <input
                ref={el => inputRef.current[3] = el}
                onKeyDown={(e) => handleKeyDown(e, 3)}
                type="text"
                value={autorLibro}
                onChange={(e) => setAutorLibro(e.target.value)}
                placeholder="Ingrese el autor del libro"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #95a5a6',
                  borderRadius: '14px',
                  fontSize: '20px',
                  fontWeight: '700'
                }}
              />
            </div>

            <div className="col-md-6" style={{ marginBottom: '20px' }}>
              <label
                style={{ fontWeight: 'bold', color: 'black', display: 'block', marginBottom: '5px', marginTop: '15px', fontSize: "22px", fontFamily: 'Roboto' }}>
                Editorial
              </label>
              <input
                ref={el => inputRef.current[4] = el}
                onKeyDown={(e) => handleKeyDown(e, 4)}
                type="text"
                value={editorial}
                onChange={(e) => setEditorialLibro(e.target.value)}
                placeholder="Ingrese la editorial del libro"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #95a5a6',
                  borderRadius: '14px',
                  fontSize: '20px',
                  fontWeight: '700'
                }}
              />
            </div>
          </div>



          <div className="row g-3 mb-3">
            <div className="col-6 col-md-1">
              <label className="fw-bold text-black d-block mb-1" style={{ fontSize: '22px', fontFamily: 'Roboto' }}>Cantidad</label>
              <input
                ref={el => inputRef.current[5] = el}
                onKeyDown={(e) => handleKeyDown(e, 5)}
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}

                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #95a5a6',
                  borderRadius: '14px',
                  fontSize: '20px',
                  fontWeight: '700',



                }}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="fw-bold text-black d-block mb-1" style={{ fontSize: '22px', fontFamily: 'Roboto' }}>Fecha</label>
              <input
                ref={el => inputRef.current[6] = el}
                onKeyDown={(e) => handleKeyDown(e, 6)}
                type="text"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                placeholder="DD/MM/YYYY"

                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #95a5a6',
                  borderRadius: '14px',
                  fontSize: '20px',
                  color: 'black',
                  fontWeight: '700'

                }}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="fw-bold text-black d-block mb-1" style={{ fontSize: '22px', fontFamily: 'Roboto' }}>ISBN</label>
              <input
                ref={el => inputRef.current[7] = el}
                onKeyDown={(e) => handleKeyDown(e, 7)}
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="Ingrese el ISBN"

                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #95a5a6',
                  borderRadius: '14px',
                  fontSize: '20px',
                  color: 'black',
                  fontWeight: '700'
                }}
              />
            </div>
            <div className="col-6 col-md-1">
              <label className="fw-bold text-black d-block mb-1" style={{ fontSize: '22px', fontFamily: 'Roboto' }}>Seña</label>
              <input
                ref={el => inputRef.current[8] = el}
                onKeyDown={(e) => handleKeyDown(e, 8)}
                type="text"
                value={formatNumberWithDots(seña)}
                onChange={(e) => setSenia(e.target.value.replace(/\D/g, ''))}
                placeholder="$$"

                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #95a5a6',
                  borderRadius: '14px',
                  fontSize: '20px',
                  color: 'black',
                  fontWeight: '700'
                }}
              />
            </div>

            {/* Comentario en fila propia, ancho total */}
            <div className="col-12 col-md-6">
              <label className="fw-bold text-black d-block mb-1" style={{ fontSize: '22px', fontFamily: 'Roboto' }}>
                Comentario
              </label>
              <input
                ref={el => inputRef.current[9] = el}
                onKeyDown={(e) => handleKeyDown(e, 9)}
                type="text"
                value={comentario}
                onFocus={() => {
                  // Si está vacío cuando el usuario entra al campo, le ponemos el prefijo
                  if (!comentario) setComentario("Pedido tomado por: ");
                }}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Pedido tomado por: (nombre) - (otro comentario)"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #95a5a6',
                  borderRadius: '14px',
                  fontSize: '20px',
                  color: 'black',
                  fontWeight: '700'
                }}
              />

            </div>
          </div>




          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              ref={ele => inputRef.current[10] = ele}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGuardar()
                }
              }}
              onClick={handleGuardar}
              disabled={loading}
              style={{
                backgroundColor: editandoId ? '#ffc107' : '#3cae23ff',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? "Guardando..." : editandoId ? "Actualizar Pedido" : "Guardar Pedido"}
            </button>
            <button
              ref={ele => inputRef.current[11] = ele}
              onClick={handleImprimirClick}
              style={{
                backgroundColor: '#0c62beff',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Imprimir Boleta Cliente
            </button>
            <button
              onClick={handleVerPedidos}
              style={{
                backgroundColor: '#0f4d57ff',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                fontWeight: 'bold',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Ver Pedidos Cargados
            </button>
            <button
              onClick={handleLimpiarFormulario}
              style={{
                backgroundColor: '#ec182dff',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {editandoId ? 'Cancelar Edición' : 'Limpiar Formulario'}
            </button>
          </div>
        </div>

        <div ref={imprimirRef} style={{ display: 'none' }}>
          <div className="logo-container">
            <h2 className="titulo-libreria">Librería Charles</h2>
          </div>

          {["Cliente", "Librería"].map((destinatario, index) => (
            <div key={index} className="pedido-container" style={{ position: "relative" }}>
              <img
                src="/chaplin1.png"
                alt="Logo Charles Chaplin"
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  width: "60px",
                  height: "auto"
                }}
              />

              <div className="destinatario">
                <h4>Copia para: {destinatario}</h4>
              </div>

              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="campo">
                    <strong>Cliente:</strong> <span
                      className="valor"
                      style={{ display: "inline-block", maxWidth: "85%", wordBreak: "break-word", verticalAlign: "top" }}
                    >
                      {nombreCliente}
                    </span>

                  </div>
                  <div className="campo">
                    <strong>Teléfono:</strong> <span className="valor">{telefonoCliente}</span>
                  </div>
                  <div className="campo">
                    <strong>Título:</strong> <span className="valor">{tituloLibro}</span>
                  </div>
                  <div className="campo">
                    <strong>Autor:</strong> <span className="valor">{autorLibro}</span>
                  </div>
                  <div className="campo">
                    <strong>Editorial:</strong> <span className="valor">{editorial}</span>
                  </div>
                  <div className="campo">
                    <strong>Cantidad:</strong> <span className="valor">{cantidad}</span>
                  </div>
                  <div className="campo">
                    <strong>Fecha:</strong> <span className="valor">{fecha}</span>
                  </div>
                  <div className="campo">
                    <strong>Seña:</strong> <span className="valor">$ {formatNumberWithDots(seña.replace(/\D/g, ''))}</span>
                  </div>
                  <div className="campo">
                    <strong>Comentario:</strong> <span className="valor">{comentario}</span>
                  </div>
                  <div className="campo">
                    <strong>ISBN:</strong> <span className="valor">{isbn}</span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>



        {showPedidos && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            color: 'black',
          }}>
            <div
              ref={modalRef}
              tabIndex={-1}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCerrarPedidos();
                }
              }}
              className="container-pedidos-cargados"
              style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '10px',
                maxWidth: '95vw',
                width: 'max-content',
                maxHeight: '80vh',
                overflow: 'auto',
                overscrollBehavior: 'contain',
                margin: '0 auto',
                scrollbarColor: '#888 #f1f1f1',
                minWidth: '80vw'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <div>
                  <h3><strong>Pedidos Cargados</strong></h3>

                </div>
                <button
                  ref={inputModalRef}
                  onClick={(e) => setShowPedidos(false)}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Cerrar
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',       // 👉 poné 'nowrap' si lo querés SIEMPRE en una sola línea
                  marginTop: '6px'
                }}
              >
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



                {/* Desde */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ margin: 0, fontWeight: 'bold' }}>Desde:</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd', height: '44px' }}
                  />
                </div>

                {/* Hasta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ margin: 0, fontWeight: 'bold' }}>Hasta:</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd', height: '44px' }}
                  />
                </div>
                <button
                  onClick={handleFiltrarPorFecha}
                  style={{
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    height: '44px'
                  }}
                >
                  <strong>Filtrar por Fecha</strong>
                </button>
                <button
                  onClick={() => {
                    setTerminoBusqueda("");
                    setFechaDesde("");
                    setFechaHasta("");
                    setPedidosFiltrados(todosLosPedidos);
                  }}
                  style={{
                    backgroundColor: '#ec1814ff',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    height: '44px'
                  }}
                >
                  <strong>Limpiar búsqueda</strong>
                </button>



                <button
                  onClick={() => navigate("/pedidos-digital")}
                  style={{
                    backgroundColor: '#7952b3',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    height: '44px'
                  }}
                >
                  <strong>Pedidos Ricardo (Digital)</strong>
                </button>


                {/* 👇 Fuerza salto de línea dentro del contenedor flex existente */}
                <div style={{ flexBasis: '100%' }} />

                {/* 👇 Nueva fila con los dos botones, uno al lado del otro */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px', marginBottom: '10px' }}>
                  <button
                    onClick={async () => {
                      await cargarPedidos(); // recarga VISIBLES desde el backend
                      setTerminoBusqueda("");
                      setFechaDesde("");
                      setFechaHasta("");
                    }}

                    style={{
                      backgroundColor: '#ffc107',
                      color: 'black',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      marginBottom: 0, // 👈 quitamos el negativo
                    }}
                  >
                    <strong>Mostrar Todos</strong>
                  </button>
                  <button
                    onClick={async () => {
                      const res = await actions.obtenerPedidos(true); // 🔎 trae SOLO ocultos
                      if (res.success) {
                        setTodosLosPedidos(res.pedidos);
                        setPedidosFiltrados(res.pedidos);
                        setTerminoBusqueda("");
                        setFechaDesde("");
                        setFechaHasta("");
                        alert(`Mostrando ${res.pedidos.length} pedidos ocultos`);
                      } else {
                        alert(`Error al cargar ocultos: ${res.error}`);
                      }
                    }}
                    style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      marginBottom: 0,
                    }}
                  >
                    <strong>Ver Ocultos</strong>
                  </button>


                  <button
                    onClick={() => {
                      const vienen = todosLosPedidos.filter(p => p.estado === "VIENE");
                      setPedidosFiltrados(vienen);
                      setTerminoBusqueda("");
                      setFechaDesde("");
                      setFechaHasta("");
                    }}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '9px 20px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      marginBottom: 0, // 👈 quitamos el negativo
                    }}
                  >
                    <strong>Ver los que VIENEN</strong>
                  </button>

                  <button
                    onClick={handleImprimirTodos}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <strong>
                      Imprimir Filtrados (Librería)

                    </strong>
                  </button>

                  <button
                    onClick={handleImprimirParaRicardo}
                    style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <strong>

                      Imprimir Filtrados Para Ricardo
                    </strong>
                  </button>
                  <button
                    onClick={handleImprimirVienen}
                    style={{
                      backgroundColor: '#198754',
                      color: 'white',
                      border: 'none',
                      padding: '9px 20px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      marginBottom: 0, // 👈 quitamos el negativo

                    }}
                  >
                    <strong>Imprimir los que VIENEN</strong>
                  </button>





                </div>




                <span style={{
                  marginLeft: '10px',
                  fontWeight: 'bold',
                  color: '#333',
                  alignSelf: 'center'
                }}>
                  Pedidos en página: {filtrarPorBusqueda(pedidosFiltrados).length}
                </span>
              </div>

              <div style={{
                overflowX: 'auto',
                width: 'max-content',
                minWidth: '100%'
              }}>
                <table
                  id="tabla-todos-pedidos"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #ddd',
                    minWidth: '1200px', // Asegura que la tabla sea más ancha que el contenedor
                    marginTop: '10px',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#0655a8ff', color: 'white' }}>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Cliente</th>           {/* 1 */}
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Teléfono</th>          {/* 2 */}
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Título</th>            {/* 3 */}
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Autor</th>             {/* 4 */}
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Editorial</th>         {/* 5 (NUEVO) */}
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Cant.</th>          {/* 6 (se corre) */}
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>ISBN</th>              {/* 7 */}
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Fecha</th>             {/* 8 */}
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Fecha Pedido</th>      {/* 9 */}
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Seña</th>              {/* 10 */}
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Comentarios</th>       {/* 11 */}
                      <th
                        style={{
                          padding: '12px',
                          border: '1px solid #ddd',
                          width: '96px',
                          minWidth: '96px',
                          whiteSpace: 'normal',   // 👈 permite que “Acciones” se parta si hace falta
                          textAlign: 'center'
                        }}
                      >
                        Acciones
                      </th>

                    </tr>
                  </thead>

                  <tbody>
                    {filtrarPorBusqueda(pedidosFiltrados).length > 0 ? (
                      filtrarPorBusqueda(pedidosFiltrados).map((pedido, idx) => (
                        <tr
                          key={pedido.id || idx}
                          style={{
                            backgroundColor: pedido.estado === "VIENE" ? '#80e06cff' : 'white',
                            opacity: pedido.oculto ? 0.55 : 1
                          }}
                        >

                          <td style={{
                            padding: '12px', border: '1px solid #270d0dff', width: '100px',
                            maxWidth: '180px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.cliente_nombre}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #3c2828ff', width: '100px',
                            maxWidth: '180px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>

                            {pedido.telefonoCliente ? pedido.telefonoCliente.toString() : '-'}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #3c2828ff', width: '100px',
                            maxWidth: '180px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.titulo}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #3c2828ff', width: '100px',
                            maxWidth: '180px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.autor}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #3c2828ff', width: '100px',
                            maxWidth: '180px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.editorial || '-'}     {/* ⬅️ NUEVO: EDITORIAL */}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #3c2828ff', width: '50px',
                            maxWidth: '100px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.cantidad || 1}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #3c2828ff', width: '100px',
                            maxWidth: '180px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.isbn || '-'}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #3c2828ff', color: 'black', fontWeight: 'bold' }}>
                            {formatearFechaArgentina(pedido.fecha)}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #3c2828ff', color: 'black', fontWeight: 'bold' }}>
                            {pedido.estado === 'VIENE' && pedido.fecha_viene ? formatearFechaArgentina(pedido.fecha_viene) : '-'}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #3c2828ff', color: 'black', fontWeight: 'bold' }}>
                            ${pedido.seña || 0}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #3c2828ff', width: '200px',
                            maxWidth: '210px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.comentario || '-'}
                          </td>

                          <td
                            style={{
                              padding: '12px',
                              border: '1px solid #3c2828ff',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              alignItems: 'stretch',
                              width: '96px',
                              minWidth: '96px',
                              maxWidth: '96px',          // 👈 tope duro
                              boxSizing: 'border-box',
                              overflow: 'hidden'         // 👈 evita que algo se salga
                            }}
                          >
                            <button
                              onClick={() => handleEditarPedido(pedido.id)}
                              style={{
                                backgroundColor: '#ffc107',
                                color: 'black',
                                border: 'none',
                                padding: '6px 6px',      // 👈 un pelín menos horizontal
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                width: '100%',
                                display: 'block',
                                boxSizing: 'border-box',
                                whiteSpace: 'normal',     // 👈 permite salto de línea
                                wordBreak: 'break-word',  // 👈 por si “Editar” cambia
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => handleOcultarPedido(pedido.id)}
                              disabled={pedido.oculto === true}
                              title={pedido.oculto ? "Ya está oculto" : "Ocultar"}
                              style={{
                                backgroundColor: pedido.oculto ? '#adb5bd' : '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '6px 6px',
                                borderRadius: '3px',
                                cursor: pedido.oculto ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                width: '100%',
                                display: 'block',
                                boxSizing: 'border-box',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              Ocultar
                            </button>

                            <button
                              onClick={() => handleRecuperarPedido(pedido)}
                              disabled={pedido.oculto !== true}
                              title={pedido.oculto ? "Recuperar (volver a mostrar)" : "Sólo para pedidos ocultos"}
                              style={{
                                backgroundColor: pedido.oculto ? '#198754' : '#adb5bd',
                                color: 'black',
                                border: 'none',
                                padding: '6px 6px',
                                borderRadius: '3px',
                                cursor: pedido.oculto ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold',
                                width: '100%',
                                display: 'block',
                                boxSizing: 'border-box',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              Recuperar
                            </button>
                          </td>


                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="8"
                          style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#6c757d',
                            border: '1px solid #ddd'
                          }}
                        >
                          {terminoBusqueda
                            ? "No hay pedidos que coincidan con la búsqueda"
                            : (loading ? "Cargando pedidos..." : "No hay pedidos cargados")
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


      </div>
    </div >
  );
};


export default PedidoForm;