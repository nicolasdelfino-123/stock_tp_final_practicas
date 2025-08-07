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
  const [todosLosPedidos, setTodosLosPedidos] = useState([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [showPedidos, setShowPedidos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [ultimaImpresion, setUltimaImpresion] = useState(null);
  const [showHistorialCompleto, setShowHistorialCompleto] = useState(false);
  const imprimirRef = useRef();

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

    ventana.document.open();
    ventana.document.write(`
      <html>
        <head>
          <title>Pedido - Librería Charles</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .logo-container { text-align: center; margin-bottom: 30px; }
            .logo { width: 80px; height: auto; }
            .titulo-libreria { color: #2c3e50; margin: 10px 0; }
            .pedido-container { border: 2px solid #34495e; border-radius: 10px; margin: 20px 0; padding: 20px; background: #f8f9fa; }
            .destinatario { background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #1976d2; }
            .campo { margin: 10px 0; }
            .campo strong { color: #2c3e50; }
            .valor { color: #34495e; font-weight: 500; }
            @media print {
              .pedido-container { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${contenido}
          <script>
            window.onload = function () {
              window.focus();
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  const handleGuardar = async () => {
    if (!nombreCliente || !tituloLibro || !autorLibro || !seña) {
      alert("Por favor complete todos los campos obligatorios");
      return;
    }

    const pedidoData = {
      nombreCliente,
      tituloLibro,
      autorLibro,
      cantidad,
      fecha,
      seña,
      comentario,
      isbn
    };

    setLoading(true);

    try {
      let result;
      if (editandoId) {
        result = await actions.actualizarPedido(editandoId, pedidoData);
      } else {
        result = await actions.crearPedido(pedidoData);

      }

      if (result.success) {
        alert(`Pedido ${editandoId ? 'actualizado' : 'guardado'} con éxito`);
        setEditandoId(null);
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
  };

  const handleVerPedidos = () => {
    setShowPedidos(true);
  };



  const handleImprimirTodos = () => {
    if (pedidosFiltrados.length === 0) {
      alert("No hay pedidos para imprimir");
      return;
    }

    const tabla = document.getElementById('tabla-todos-pedidos');
    const ventana = window.open('', '_blank');
    const tablaClonada = tabla.cloneNode(true);

    // Elimina la columna de Acciones
    const encabezados = tablaClonada.querySelectorAll('th');
    const celdas = tablaClonada.querySelectorAll('td');
    const columnasAEliminar = [8]; // Índice de Acciones
    const cantidadColumnas = 9; // Total de columnas actuales

    columnasAEliminar.forEach(index => {
      if (encabezados[index]) encabezados[index].remove();
      celdas.forEach((celda, i) => {
        if (i % cantidadColumnas === index) celda.remove();
      });
    });

    ventana.document.write(`
      <html>
        <head>
          <title>Todos los Pedidos - Librería Charles</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { width: 80px; height: auto; }
            .titulo { color: #2c3e50; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #3498db; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            tr:hover { background-color: #e8f4fd; }
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

    // Registrar última impresión
    const ultimoPedido = pedidosFiltrados[0];
    setUltimaImpresion({
      fecha: new Date().toLocaleDateString('es-AR'),
      libro: ultimoPedido.titulo,
      autor: ultimoPedido.autor,
      isbn: ultimoPedido.isbn || "N/A"
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

    const columnasAEliminar = [0, 5, 6, 7, 8]; // Seña, Comentarios, Acciones
    const cantidadColumnas = 9;

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
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #6c757d; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 class="titulo">Librería Charles</h2>
            <h3>Las Varillas, Córdoba - 9 de julio 346 </h3>
            <h4>Teléfonos: 03533-420183 / Móvil: 03533-682652<h4>
          </div>
          ${tablaClonada.outerHTML}
        </body>
      </html>
    `);
    ventana.document.close();

    // Registrar última impresión
    const ultimoPedido = pedidosFiltrados[pedidosFiltrados.length - 1];
    setUltimaImpresion({
      fecha: new Date().toLocaleDateString('es-AR'),
      libro: ultimoPedido.titulo,
      autor: ultimoPedido.autor,
      isbn: ultimoPedido.isbn
    });

    ventana.print();
  };

  const handleEditarPedido = async (id) => {
    const pedido = todosLosPedidos.find(p => p.id === id);
    if (pedido) {
      navigate("/pedidos");
      setNombreCliente(pedido.cliente_nombre);
      setTituloLibro(pedido.titulo);
      setAutorLibro(pedido.autor);
      setCantidad(pedido.cantidad || 1);
      setFecha(formatearFechaArgentina(pedido.fecha));
      setSenia(pedido.seña || "");
      setComentario(pedido.comentario || "");
      setEditandoId(id);
      setIsbn(pedido.isbn || "");



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
      const desde = new Date(fechaDesde);
      const hasta = new Date(fechaHasta);

      if (desde > hasta) {
        alert("La fecha 'Desde' no puede ser mayor que la fecha 'Hasta'");
        return;
      }

      const result = await actions.obtenerPedidos();
      if (result.success) {
        const pedidosFiltrados = result.pedidos.filter(pedido => {
          const fechaPedido = new Date(pedido.fecha);
          return fechaPedido >= desde && fechaPedido <= hasta;
        });

        setPedidosFiltrados(pedidosFiltrados);
        alert(`Se encontraron ${pedidosFiltrados.length} pedidos entre las fechas seleccionadas`);
      } else {
        alert("Error al cargar pedidos para filtrar");
      }
    } catch (error) {
      console.error("Error al filtrar por fecha:", error);
      alert("Error al filtrar por fecha");
    }
  };

  const handleVerTodosLosPedidos = async () => {
    setLoading(true);
    try {
      const result = await actions.obtenerPedidos();
      if (result.success) {
        setPedidosFiltrados(result.pedidos);
        setShowHistorialCompleto(true);
      } else {
        alert("Error al cargar todos los pedidos");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al conectar con el servidor");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#e8f5e8',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/chaplin1.png" alt="Logo Charles Chaplin" style={{ width: '80px' }} />
          <h2 style={{ color: '#2c3e50', marginTop: '10px' }}>Formulario de Pedido</h2>
          {editandoId && <p style={{ color: '#ffc107', fontWeight: 'bold' }}>Editando pedido...</p>}
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
                <strong> Libro:</strong> {ultimaImpresion.libro} -
                <strong> Autor:</strong> {ultimaImpresion.autor} -
                <strong> ISBN:</strong> {ultimaImpresion.isbn || 'N/A'}
              </p>
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '10px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>


          {/* Campos del formulario */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', color: '#2c3e50', display: 'block', marginBottom: '5px' }}>
              Nombre del Cliente
            </label>
            <input
              type="text"
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #95a5a6',
                borderRadius: '5px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', color: '#2c3e50', display: 'block', marginBottom: '5px' }}>
              Título del Libro
            </label>
            <input
              type="text"
              value={tituloLibro}
              onChange={(e) => setTituloLibro(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #95a5a6',
                borderRadius: '5px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', color: '#2c3e50', display: 'block', marginBottom: '5px' }}>
              Autor
            </label>
            <input
              type="text"
              value={autorLibro}
              onChange={(e) => setAutorLibro(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #95a5a6',
                borderRadius: '5px',
                fontSize: '16px'
              }}
            />
          </div>
          <div className="col-12">
            <div>
              <div className="" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontWeight: 'bold', color: '#2c3e50', display: 'block', marginBottom: '5px' }}>
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #95a5a6',
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                <div className="col-3" >
                  <label style={{ fontWeight: 'bold', color: '#2c3e50', display: 'block', marginBottom: '5px' }}>
                    Fecha
                  </label>
                  <input
                    type="text"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #95a5a6',
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontWeight: 'bold', color: '#2c3e50', display: 'block', marginBottom: '5px' }}>
                    ISBN
                  </label>
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #95a5a6',
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                <div className="col-3" >
                  <label style={{ fontWeight: 'bold', color: '#2c3e50', display: 'block', marginBottom: '5px' }}>
                    Seña
                  </label>
                  <input
                    type="text"
                    value={seña}
                    onChange={(e) => setSenia(e.target.value)}
                    placeholder="$$"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #95a5a6',
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>
              <div className="col-12 pb-4" >
                <label style={{ fontWeight: 'bold', color: '#2c3e50', display: 'block', marginBottom: '5px' }}>
                  Comentario
                </label>
                <input
                  type="text"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #95a5a6',
                    borderRadius: '5px',
                    fontSize: '16px'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleGuardar}
              disabled={loading}
              style={{
                backgroundColor: editandoId ? '#ffc107' : '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? "Guardando..." : editandoId ? "Actualizar Pedido" : "Guardar Pedido"}
            </button>
            <button
              onClick={handleImprimir}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Imprimir Boleta Cliente
            </button>
            <button
              onClick={handleVerPedidos}
              style={{
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
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
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                fontSize: '16px',
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
                    <strong>Seña:</strong> <span className="valor">{seña}</span>
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
            color: 'black'
          }}>
            <div className="container-pedidos-cargados" style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '10px',
              maxWidth: '1500px',
              maxHeight: '80%',
              overflow: 'auto',
              width: '1500px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3><strong>Pedidos Cargados</strong></h3>
                <button
                  onClick={() => setShowPedidos(false)}
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
                  Filtrar por Fecha
                </button>
                <button
                  onClick={handleVerTodosLosPedidos}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    height: '40px',
                    alignSelf: 'flex-end',

                  }}
                >
                  Ver Historial Completo
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
                  Imprimir Todos (Librería)
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
                  Imprimir Para Ricardo
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
                  Mostrar Todos
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table
                  id="tabla-todos-pedidos"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #ddd'
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Cliente</th>
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
                    {pedidosFiltrados.length > 0 ? (
                      pedidosFiltrados.map((pedido, idx) => (
                        <tr key={pedido.id || idx} style={{
                          backgroundColor: idx % 2 === 0 ? '#f8f9fa' : 'white'
                        }}>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '180px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            {pedido.cliente_nombre}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '180px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            {pedido.titulo}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '180px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            {pedido.autor}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '100px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            {pedido.cantidad || 1}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '180px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            {pedido.isbn || '-'}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #adacac' }}>
                            {formatearFechaArgentina(pedido.fecha)}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #adacac' }}>
                            ${pedido.seña || 0}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', width: '200px',            // ancho fijo
                            maxWidth: '210px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
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
                                cursor: 'pointer'
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
                                cursor: 'pointer'
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
                          {loading ? "Cargando pedidos..." : "No hay pedidos cargados"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showHistorialCompleto && (
          <div className="container-fluid " style={{
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

          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '10px',
              maxWidth: '3000px',
              maxHeight: '80%',
              overflow: 'auto',
              width: '1800px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3>Historial Completo de Pedidos</h3>
                <button
                  onClick={() => setShowHistorialCompleto(false)}
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

              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #ddd'
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#28a745', color: 'white' }}>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Cliente</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Título</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Autor</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Cantidad</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>ISBN</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Fecha</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Seña</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Comentarios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosFiltrados.length > 0 ? (
                      pedidosFiltrados.map((pedido, idx) => (
                        <tr key={pedido.id || idx} style={{
                          backgroundColor: idx % 2 === 0 ? '#f8f9fa' : 'white'
                        }}>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '180px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            {pedido.cliente_nombre}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '180px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            {pedido.titulo}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '180px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            {pedido.autor}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '180px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            {pedido.cantidad || 1}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '180px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            {pedido.isbn || "N/A"}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '180px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            {formatearFechaArgentina(pedido.fecha)}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '180px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            ${pedido.seña || 0}
                          </td>
                          <td style={{
                            padding: '12px', border: '1px solid #adacac', padding: '12px', border: '1px solid #adacac', width: '100px',            // ancho fijo
                            maxWidth: '180px',         // opcional, refuerza el límite
                            wordWrap: 'break-word',   // permite cortar palabras si son largas
                            whiteSpace: 'normal',     // permite saltos de línea
                            overflowWrap: 'break-word'
                          }}>
                            {pedido.comentario || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="7"
                          style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#6c757d',
                            border: '1px solid #ddd'
                          }}
                        >
                          {loading ? "Cargando pedidos..." : "No hay pedidos en el historial"}
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
    </div>
  );
};



export default PedidoForm;