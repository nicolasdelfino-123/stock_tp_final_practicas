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
  const [senia, setSenia] = useState("");
  const [comentario, setComentario] = useState("")
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('es-AR'));
  const [historialPedidos, setHistorialPedidos] = useState([]);
  const [todosLosPedidos, setTodosLosPedidos] = useState([]);
  const [showPedidos, setShowPedidos] = useState(false);
  const [loading, setLoading] = useState(false);
  const imprimirRef = useRef();

  // Formatear fecha en formato argentino
  const formatearFechaArgentina = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Cargar pedidos al montar el componente
  useEffect(() => {
    cargarPedidos();
  }, []);

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const result = await actions.obtenerPedidos();
      if (result.success) {
        setTodosLosPedidos(result.pedidos);
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
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.print();
  };

  const handleGuardar = async () => {
    if (!nombreCliente || !tituloLibro || !autorLibro) {
      alert("Por favor complete todos los campos obligatorios");
      return;
    }

    const nuevoPedido = {
      nombreCliente,
      tituloLibro,
      autorLibro,
      cantidad,
      fecha,
      senia,
      comentario
    };

    setHistorialPedidos([...historialPedidos, nuevoPedido]);
    setLoading(true);

    try {
      const result = await actions.crearPedido(nuevoPedido);
      if (result.success) {
        alert("Pedido guardado con éxito");
        // Limpiar formulario
        setNombreCliente("");
        setTituloLibro("");
        setAutorLibro("");
        setCantidad(1);
        setFecha(new Date().toLocaleDateString('es-AR'));
        setSenia(0)
        setComentario("")
        // Recargar pedidos
        await cargarPedidos();
      } else {
        alert(`Error al guardar: ${result.error}`);
      }
    } catch (error) {
      console.error("Error al guardar el pedido:", error);
      alert("Error al conectar con el servidor");
    }
    setLoading(false);
  };

  const handleVerPedidos = () => {
    setShowPedidos(true);
  };

  const handleImprimirTodos = () => {
    const tabla = document.getElementById('tabla-todos-pedidos');
    const ventana = window.open('', '_blank');
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
            
            <h2 class="titulo">Librería Charles</h2>
            <h3>Las Varillas, Córdoba - 9 de julio 346 </h3>
            <h4>Teléfonos: 03533-420183 // Móvil: 03533-15682652<h4>
            <h5>Fecha de impresión: ${formatearFechaArgentina(new Date())}</h5>
          </div>
          ${tabla.outerHTML}
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.print();
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#e8f5e8', 
      padding: '20px' 
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/chaplin1.png" alt="Logo Charles Chaplin" style={{ width: '80px' }} />
          <h2 style={{ color: '#2c3e50', marginTop: '10px' }}>Formulario de Pedido</h2>
        </div>
        
        {/* Formulario */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '10px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
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
          <div className=" container col-12"> 
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
            <div  className="col-4" >
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
            <div  className="col-4" >
              <label style={{ fontWeight: 'bold', color: '#2c3e50', display: 'block', marginBottom: '5px' }}>
                Seña
              </label>
              <input
                type="text"
                value={senia}
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
            <div  className="col-12 pb-4" >
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
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? "Guardando..." : "Guardar Pedido"}
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
          </div>
        </div>

        {/* Contenido para imprimir (oculto) */}
        <div ref={imprimirRef} style={{ display: 'none' }}>
          <div className="logo-container">
            
            <h2 className="titulo-libreria">Librería Charles</h2>
          </div>
          
          {["Cliente", "Librería"].map((destinatario, index) => (
  <div key={index} className="pedido-container" style={{ position: "relative" }}>
    
    {/* Logo arriba a la derecha */}
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
      {/* Columna izquierda con los datos */}
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
          <strong>Seña:</strong> <span className="valor">{senia}</span>
        </div>
        <div className="campo">
         <strong>Comentario:</strong> <span className="valor">{comentario}</span>
        </div>
      </div>
    </div>
  </div>
))}

        </div>

        <HistorialPedidos pedidos={historialPedidos} />

        {/* Modal para ver todos los pedidos */}
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
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '10px',
              maxWidth: '90%',
              maxHeight: '80%',
              overflow: 'auto',
              width: '800px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '20px' 
              }}>
                <h3>Pedidos Cargados</h3>
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
              
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                marginBottom: '20px' 
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
                  Imprimir Todos
                </button>
                <button 
                  onClick={cargarPedidos}
                  disabled={loading}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? "Cargando..." : "Actualizar"}
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
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Fecha</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Comentarios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todosLosPedidos.length > 0 ? (
                      todosLosPedidos.map((pedido, idx) => (
                        <tr key={pedido.id || idx} style={{
                          backgroundColor: idx % 2 === 0 ? '#f8f9fa' : 'white'
                        }}>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                            {pedido.cliente_nombre}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                            {pedido.titulo}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                            {pedido.autor}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                            {pedido.cantidad || 1}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                            {formatearFechaArgentina(pedido.fecha)}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                            {pedido.comentario || 1}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td 
                          colSpan="5" 
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
      </div>
    </div>
  );
};

const HistorialPedidos = ({ pedidos }) => {
  const tablaRef = useRef();

  const handleImprimirHistorial = () => {
    const tabla = tablaRef.current;
    const ventana = window.open("", "_blank");
    ventana.document.write(`
      <html>
        <head>
          <title>Historial de Pedidos</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { width: 80px; height: auto; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #3498db; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/chaplin1.png" alt="Logo Charles Chaplin" class="logo" />
            <h2>Librería Charles</h2>
            <h3>Historial de Sesión</h3>
          </div>
          ${tabla.outerHTML}
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.print();
  };

  if (pedidos.length === 0) return null;

  return (
    <div style={{ marginTop: '30px' }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <h3 style={{ color: '#2c3e50' }}>Historial de esta Sesión</h3>
          <button 
            onClick={handleImprimirHistorial}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Imprimir Historial
          </button>
        </div>
        
        <table 
          ref={tablaRef}
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
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido, idx) => (
              <tr key={idx} style={{
                backgroundColor: idx % 2 === 0 ? '#f8f9fa' : 'white'
              }}>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  {pedido.nombreCliente}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  {pedido.tituloLibro}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  {pedido.autorLibro}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  {pedido.cantidad}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  {pedido.fecha}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PedidoForm;