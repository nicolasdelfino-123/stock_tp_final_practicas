import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/appContext";

const PedidoForm = () => {
  const navigate = useNavigate();
  const { actions } = useAppContext();
  const [nombreCliente, setNombreCliente] = useState("");
  const [tituloLibro, setTituloLibro] = useState("");
  const [autorLibro, setAutorLibro] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [seña, setSenia] = useState("");
  const [isbn, setIsbn] = useState("");
  const [comentario, setComentario] = useState("");
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('es-AR'));
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [todosLosPedidos, setTodosLosPedidos] = useState([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [showPedidos, setShowPedidos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [ultimaImpresion, setUltimaImpresion] = useState(null);
  const imprimirRef = useRef();
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [ultimoNombreCliente, setUltimoNombreCliente] = useState("");
  const [ultimoTelefono, setUltimoTelefono] = useState(localStorage.getItem('ultimoTelefono') || "");
  const inputRef = useRef([]);
  const inputModalRef = useRef(null);
  const modalRef = useRef(null);



  const formatearFechaArgentina = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
    guardadoEnEstaImpresion.current = false;
    editadoConExito.current = false;
    ultimoPedidoGuardado.current = null;  // <-- LIMPIAMOS también aquí
  };

  const verificarDatosYResetearFlags = () => {
    const datosActuales = {
      nombreCliente,
      tituloLibro,
      autorLibro,
      cantidad,
      fecha,
      seña,
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

  const handleGuardar = async () => {
    const datosActuales = {
      nombreCliente,
      tituloLibro,
      autorLibro,
      cantidad,
      fecha,
      seña,
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

    if (!nombreCliente || !tituloLibro || !autorLibro || !seña || !telefonoCliente) {
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
          alert("Pedido editado con éxito. El formulario se limpiará para crear un pedido nuevo.");
          editadoConExito.current = true;
          limpiarFormulario();
        } else {
          alert("Pedido guardado con éxito");
          guardadoEnEstaImpresion.current = true;
          setUltimaImpresion(prev => ({
            ...prev,
            newPedidosCount: (prev?.newPedidosCount || 0) + 1
          }));
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
    setFecha(new Date().toLocaleDateString('es-AR'));
    setSenia("");
    setComentario("");
    setEditandoId(null);
    setIsbn("");
    setTelefonoCliente("");
  };

  const handleVerPedidos = () => {
    setShowPedidos(true);
  };

  const handleCerrarPedidos = () => {
    setShowPedidos(false);
  }

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

    // Eliminar la última columna (acciones) de encabezados y filas
    const encabezados = tablaClonada.querySelectorAll('th');
    const filas = tablaClonada.querySelectorAll('tr');

    // Índice de la última columna
    const ultimaCol = encabezados.length - 1;

    // Remover el th de la última columna
    if (encabezados[ultimaCol]) {
      encabezados[ultimaCol].remove();
    }

    // Remover la celda td correspondiente en cada fila (excepto la fila de encabezados)
    filas.forEach(fila => {
      const celdas = fila.querySelectorAll('td');
      if (celdas.length > ultimaCol) {
        celdas[ultimaCol].remove();
      }
    });

    ventana.document.write(`
  <html>
  <head>
    <title>Todos los Pedidos - Librería Charles</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 10px;
      }
      .header {
        text-align: center;
        margin-bottom: 15px;
      }
      .titulo {
        color: #2c3e50;
        margin: 10px 0;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        table-layout: fixed;
        font-size: 10px;
      }
      th, td {
        border: 1px solid black;
        padding: 4px 6px;
        text-align: left;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: normal;
      }
      th {
        background-color: white;
        color: black;
        font-weight: bold;
        border: 1px solid black;
      }

      /* ********************************************** */
      /* AJUSTES DE ANCHO DE COLUMNAS - MODIFICAR AQUÍ */
      /* ********************************************** */
      
      /* Columna 1: Cliente - nth-child(1) */
      th:nth-child(1), td:nth-child(1) {
        width: 15% !important; /* Ajustar porcentaje según necesidad */
      }
      
      /* Columna 2: Título - nth-child(2) */
      th:nth-child(2), td:nth-child(2) {
        width: 20% !important; /* Ajustar porcentaje según necesidad */
      }
      
      /* Columna 3: Autor - nth-child(3) */
      th:nth-child(3), td:nth-child(3) {
        width: 15% !important; /* Ajustar porcentaje según necesidad */
      }
      
      /* Columna 4: Cantidad - nth-child(4) */
      th:nth-child(4), td:nth-child(4) {
        width: 4% !important;  /* Columna más estrecha */
        max-width: 50px;
      }
      
      /* Columna 5: ISBN - nth-child(5) */
      th:nth-child(5), td:nth-child(5) {
        width: 10% !important; /* Ajustar porcentaje según necesidad */
      }
      
      /* Columna 6: Fecha - nth-child(6) */
      th:nth-child(6), td:nth-child(6) {
        width: 8% !important; /* Ajustar porcentaje según necesidad */
      }
      
      /* Columna 7: Seña - nth-child(7) */
      th:nth-child(7), td:nth-child(7) {
        width: 10% !important; /* Ajustar porcentaje según necesidad */
      }
      
      /* Columna 8: Comentarios - nth-child(8) */
      th:nth-child(8), td:nth-child(8) {
        width: 18% !important; /* Columna más ancha */
      }

      tr:nth-child(even) {
        background-color: #f2f2f2;
      }
      tr:hover {
        background-color: #e8f4fd;
      }
      @media print {
        body {
          margin: 0.5cm;
        }
        table {
          font-size: 8pt;
          width: 100%;
          table-layout: fixed;
          page-break-inside: auto;
        }
        th, td {
          padding: 2px 4px;
          white-space: normal;
          color: black !important;
          border: 1px solid black !important;
        }
        th {
          background-color: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        
        /* ********************************************** */
        /* AJUSTES DE IMPRESIÓN (opcional) */
        /* ********************************************** */
        th:nth-child(4), td:nth-child(4) {
          width: 5% !important;
        }
        th:nth-child(8), td:nth-child(8) {
          width: 25% !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h2 class="titulo">Pedidos Librería Charles</h2>
      <h5>Fecha de impresión: ${formatearFechaArgentina(new Date())}</h5>
    </div>
    ${tablaClonada.outerHTML}
  </body>
</html>
  `);
    ventana.document.close();


    // Tomar el ÚLTIMO pedido de la lista filtrada
    const ultimoPedido = pedidosFiltrados[0];
    setUltimaImpresion({
      fecha: new Date().toLocaleString('es-AR'),
      libro: pedidosFiltrados[0].titulo, // Primer pedido como referencia
      autor: pedidosFiltrados[0].autor,
      isbn: pedidosFiltrados[0].isbn || "N/A",
      telefonoCliente: pedidosFiltrados[0].telefonoCliente || "N/A",
      newPedidosCount: 0,
      lastPrinted: new Date().getTime(),
      ultimoImpresoId: pedidosFiltrados[0].id,
      // Guardamos TODOS los IDs de los pedidos que se están imprimiendo
      lastPrintedIds: pedidosFiltrados.map(p => p.id),
      // También guardamos la cantidad de pedidos impresos
      cantidadImpresos: pedidosFiltrados.length
    });

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

    const columnasAEliminar = [0, 1, 6, 7, 8, 9]; // Seña, Comentarios, Acciones
    const cantidadColumnas = 10;

    columnasAEliminar.forEach(index => {
      if (encabezados[index]) encabezados[index].remove();
      celdas.forEach((celda, i) => {
        if (i % cantidadColumnas === index) celda.remove();
      });
    });

    const ventana = window.open('', '_blank');
    ventana.document.write(`
<html>
<head>
  <title>Pedidos Ricardo Delfino - Librería Charles</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .titulo { color: #2c3e50; margin: 10px 0; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 20px;
      border: 1px solid black;
      table-layout: fixed; /* clave para impresión */
    }
    th, td { 
      border: 1px solid black;
      padding: 12px; 
      text-align: left; 
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    th { 
      background-color: white;
      color: black;
      font-weight: bold; 
      border-bottom: 2px solid black;
    }

    /* ***************************************** */
    /* ANCHOS POR DEFECTO (PANTALLA) */
    th:nth-child(1), td:nth-child(1) { width: 20% !important; } /* Título */
    th:nth-child(2), td:nth-child(2) { width: 20% !important; } /* Autor */
    th:nth-child(3), td:nth-child(3) { width: 10% !important; } /* Cantidad */
    th:nth-child(4), td:nth-child(4) { width: 20% !important; } /* ISBN */
    /* ***************************************** */

    tr:nth-child(even) { 
      background-color: #f2f2f2;
    }
    
    @media print {
      th {
        background-color: white !important;
        color: black !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      table {
        table-layout: fixed !important;
      }
      th:nth-child(1), td:nth-child(1) { width: 25% !important; }
      th:nth-child(2), td:nth-child(2) { width: 20% !important; }
      th:nth-child(3), td:nth-child(3) { width: 10% !important; }
      th:nth-child(4), td:nth-child(4) { width: 20% !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 class="titulo">Librería Charles</h2>
    <h3>Las Varillas, Córdoba - 9 de julio 346 </h3>
    <h4>Teléfonos: 03533-420183 / Móvil: 03533-682652</h4>
  </div>
  ${tablaClonada.outerHTML}
</body>
</html>
  `);
    ventana.document.close();



    // Tomar el ÚLTIMO pedido de la lista filtrada
    const ultimoPedido = pedidosFiltrados[0];
    setUltimaImpresion({
      fecha: new Date().toLocaleString('es-AR'),
      libro: pedidosFiltrados[0].titulo, // Primer pedido como referencia
      autor: pedidosFiltrados[0].autor,
      isbn: pedidosFiltrados[0].isbn || "N/A",
      newPedidosCount: 0,
      telefonoLibro: pedidosFiltrados[0].telefonoLibro || "N/A",
      lastPrinted: new Date().getTime(),
      ultimoImpresoId: pedidosFiltrados[0].id,
      // Guardamos TODOS los IDs de los pedidos que se están imprimiendo
      lastPrintedIds: pedidosFiltrados.map(p => p.id),
      // También guardamos la cantidad de pedidos impresos
      cantidadImpresos: pedidosFiltrados.length
    });

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
      setSenia(pedido.seña ? pedido.seña.toString() : "");
      setComentario(pedido.comentario || "");
      setIsbn(pedido.isbn || "");
      setTelefonoCliente(pedido.telefonoCliente || "");
      setEditandoId(id);

      // 4. Navegar al formulario (si es necesario)
      navigate("/pedidos"); // Asegúrate que esta ruta sea correcta para tu formulario

      // 5. Hacer scroll al formulario para mejor experiencia de usuario
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const handleImprimirDesdeUltimaImpresion = async () => {
    if (!ultimaImpresion?.lastPrinted) {
      alert("No hay registro de última impresión");
      return;
    }

    setLoading(true);
    try {
      const result = await actions.obtenerPedidos();
      if (!result.success) {
        alert("Error al cargar pedidos");
        return;
      }

      // 1. Verificamos si hay pedidos nuevos desde la última impresión
      const pedidosPosteriores = result.pedidos.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha).getTime();
        return fechaPedido > ultimaImpresion.lastPrinted;
      });

      if (pedidosPosteriores.length > 0) {
        // Si hay pedidos nuevos, los mostramos
        setPedidosFiltrados(pedidosPosteriores);
        await new Promise(resolve => setTimeout(resolve, 300));
        handleImprimirParaRicardo();
      } else {
        // Si no hay pedidos nuevos, preguntamos si quiere reimprimir los mismos
        const confirmar = window.confirm(
          `No hay nuevos pedidos desde la última impresión. ¿Desea reimprimir los mismos ${ultimaImpresion.cantidadImpresos || ''} pedidos?`
        );

        if (confirmar) {
          // Filtramos los pedidos actuales que coincidan con los IDs guardados
          const pedidosAReimprimir = result.pedidos.filter(pedido =>
            ultimaImpresion.lastPrintedIds?.includes(pedido.id)
          );

          if (pedidosAReimprimir.length === 0) {
            alert("No se encontraron los pedidos de la última impresión");
            return;
          }

          setPedidosFiltrados(pedidosAReimprimir);
          await new Promise(resolve => setTimeout(resolve, 300));
          handleImprimirParaRicardo();
        }
      }

      // Actualizamos el estado de última impresión
      setUltimaImpresion(prev => ({
        ...prev,
        fecha: new Date().toLocaleString('es-AR'),
        newPedidosCount: 0,
        lastPrinted: new Date().getTime(),
        // Mantenemos los mismos IDs de la última impresión
        lastPrintedIds: prev.lastPrintedIds || [],
        // Mantenemos la misma cantidad
        cantidadImpresos: prev.cantidadImpresos || 0,
        libro: prev.libro,
        autor: prev.autor,
        isbn: prev.isbn,
        ultimoImpresoId: prev.ultimoImpresoId
      }));

    } catch (error) {
      console.error("Error en impresión desde última:", error);
      alert("Ocurrió un error al procesar la impresión");
    } finally {
      setLoading(false);
    }
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
          // Convertir fecha del pedido a objeto Date
          const fechaPedido = new Date(pedido.fecha);
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

  const fondoURL = "/fondo-3.jpg"



  const handleCheckboxChange = (e) => {
    if (e.target.checked && ultimoNombreCliente) {
      setNombreCliente(ultimoNombreCliente);
      setTelefonoCliente(ultimoTelefono);  // Limpiamos el teléfono si se usa el nombre del último cliente
    } else {
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
              <h2 style={{ color: 'white', marginTop: '10px', fontSize: "50px", fontWeight: "700px", textShadow: '4px 4px 22px rgba(0,0,0,0.9)' }}><strong>Formulario de Pedido</strong></h2>
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
                    value={telefonoCliente}
                    onChange={handleCheckboxChange}
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



          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', color: 'black', display: 'block', marginBottom: '5px', marginTop: '15px', fontSize: "22px", fontFamily: 'Roboto' }}>
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



          <div className="row g-3 mb-3">
            <div className="col-6 col-md-1">
              <label className="fw-bold text-black d-block mb-1" style={{ fontSize: '22px', fontFamily: 'Roboto' }}>Cantidad</label>
              <input
                ref={el => inputRef.current[4] = el}
                onKeyDown={(e) => handleKeyDown(e, 4)}
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
                ref={el => inputRef.current[5] = el}
                onKeyDown={(e) => handleKeyDown(e, 5)}
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
                ref={el => inputRef.current[6] = el}
                onKeyDown={(e) => handleKeyDown(e, 6)}
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
                ref={el => inputRef.current[7] = el}
                onKeyDown={(e) => handleKeyDown(e, 7)}
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
              <label className="fw-bold text-black d-block mb-1" style={{ fontSize: '22px', fontFamily: 'Roboto' }}>Comentario</label>
              <input
                ref={el => inputRef.current[8] = el}
                onKeyDown={(e) => handleKeyDown(e, 8)}
                type="text"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ingrese un comentario (opcional)"

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
              ref={ele => inputRef.current[9] = ele}
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
              ref={ele => inputRef.current[10] = ele}
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
                    <strong>Cliente:</strong> <span className="valor">{nombreCliente}</span>
                  </div>
                  <div className="campo">
                    <strong>Título:</strong> <span className="valor">{tituloLibro}</span>
                  </div>
                  <div className="campo">
                    <strong>Autor:</strong> <span className="valor">{autorLibro}</span>
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
                maxWidth: '90vw',
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
                  {ultimaImpresion && (
                    <div style={{
                      backgroundColor: '#e8f5e9',
                      padding: '10px',
                      borderRadius: '5px',
                      marginTop: '10px',
                      border: '1px solid #c8e6c9'
                    }}>
                      <p style={{ margin: '0', color: '#2e7d32' }}>
                        <strong>Última impresión:</strong> {ultimaImpresion.fecha} -
                        <strong> Libro:</strong> {
                          todosLosPedidos.find(p => p.id === ultimaImpresion.ultimoImpresoId)?.titulo || ultimaImpresion.libro
                        } -
                        <strong> Pedidos nuevos:</strong> {ultimaImpresion.newPedidosCount || 0}
                      </p>
                    </div>
                  )}
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



              {/* Filtro por fechas */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Desde:</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Hasta:</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
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
                    height: '40px',
                    alignSelf: 'flex-end'
                  }}
                >
                  <strong>Filtrar por Fecha</strong>

                </button>

              </div>

              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                flexWrap: 'wrap'
              }}>
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
                    Imprimir Todos (Librería)

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

                    Imprimir Para Ricardo
                  </strong>
                </button>

                <button
                  onClick={() => {
                    setPedidosFiltrados(todosLosPedidos);
                    setFechaDesde("");
                    setFechaHasta("");
                  }}
                  style={{
                    backgroundColor: '#ffc107',
                    color: 'black',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  <strong>

                    Mostrar Todos
                  </strong>
                </button>
                <button
                  onClick={handleImprimirDesdeUltimaImpresion}
                  style={{
                    backgroundColor: '#9c27b0',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  <strong>

                    Imprimir desde última impresión
                  </strong>
                </button>
                <input
                  type="text"
                  placeholder="🔍 Cliente, libro, autor..."
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '2px solid black',
                    width: '250px'
                  }}
                />
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
                    minWidth: '1200px' // Asegura que la tabla sea más ancha que el contenedor
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#0655a8ff', color: 'white' }}>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Cliente</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Teléfono</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Título</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Autor</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Cantidad</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>ISBN</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Fecha</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Seña</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Comentarios</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrarPorBusqueda(pedidosFiltrados).length > 0 ? (
                      filtrarPorBusqueda(pedidosFiltrados).map((pedido, idx) => (
                        <tr key={pedido.id || idx} style={{
                          backgroundColor: idx % 2 === 0 ? '#f8f9fa' : 'white'
                        }}>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', width: '100px',
                            maxWidth: '180px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.cliente_nombre}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', width: '100px',
                            maxWidth: '180px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>

                            {pedido.telefonoCliente ? pedido.telefonoCliente.toString() : '-'}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', width: '100px',
                            maxWidth: '180px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.titulo}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', width: '100px',
                            maxWidth: '180px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.autor}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', width: '100px',
                            maxWidth: '100px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.cantidad || 1}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', width: '100px',
                            maxWidth: '180px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.isbn || '-'}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #adacac', color: 'black', fontWeight: 'bold' }}>
                            {formatearFechaArgentina(pedido.fecha)}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #adacac', color: 'black', fontWeight: 'bold' }}>
                            ${pedido.seña || 0}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', width: '200px',
                            maxWidth: '210px', wordWrap: 'break-word',
                            whiteSpace: 'normal', overflowWrap: 'break-word', color: 'black', fontWeight: 'bold'
                          }}>
                            {pedido.comentario || '-'}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #adacac', display: 'flex', gap: '5px' }}>
                            <button
                              onClick={() => handleEditarPedido(pedido.id)}
                              style={{
                                backgroundColor: '#ffc107',
                                color: 'black',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleEliminarPedido(pedido.id)}
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontWeight: 'bold'

                              }}
                            >
                              Eliminar
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