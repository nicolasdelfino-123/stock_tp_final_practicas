import React from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Search, PlusCircle, PackageOpen, BookOpenCheck, TriangleAlert } from "lucide-react";

const Inicio = () => {
  const navigate = useNavigate();
  const fondoURL = "/fondoo.webp";

  return (
    <>
      <style>
        {`
          .btn-futurista {
            font-weight: 700;
            color: white !important;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.4);
            transition: all 0.3s ease;
            border: none;
            box-shadow: none !important;
            position: relative;
            z-index: 1;
          }

          .btn-futurista:hover {
            box-shadow:
              0 0 8px 3px rgba(57, 255, 20, 0.4),
              0 0 12px 6px rgba(57, 255, 20, 0.3),
              0 0 16px 8px rgba(57, 255, 20, 0.2) !important;
            transform: scale(1.03);
            cursor: pointer;
            border-color: #39ff14 !important;
            z-index: 10;
          }

          .btn-futurista::after {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            border-radius: inherit;
            z-index: -1;
            opacity: 0;
            transition: opacity 0.0s ease;
            background: rgba(57, 255, 20, 0.1);
          }

          .btn-futurista:hover::after {
            opacity: 0.5;
          }
        `}
      </style>

      <div
        className="d-flex align-items-center justify-content-center vh-100"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${fondoURL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          className="d-flex flex-column vh-100 vw-100"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${fondoURL})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Contenedor para el botón arriba a la derecha */}
          <div className="d-flex justify-content-end align-items-start" style={{ padding: 0, margin: 0 }}>
            <button
              onClick={() => navigate("/libros-dados-baja")}
              className="btn-baja btn-lg gap-2 px-4 py-3 btn-futurista"
              style={{
                borderRadius: "10px",
                padding: "10px 30px",
                minWidth: "150px",
                margin: 50,
              }}
            >
              <PackageOpen size={45} color="black" />
              <span style={{ color: "white", marginLeft: "13px", fontSize: '19px' }}>Libros dados de baja</span>
            </button>

          </div>


          {/* Botones del medio */}
          <div className="row">
            <div className="col-12 d-flex flex-wrap justify-content-center gap-5">
              <button
                onClick={() => navigate("/bajarlibro")}
                className="btn btn-danger btn-lg d-flex align-items-center gap-2 px-4 py-4 btn-futurista"
              >
                <Trash2 size={45} />
                <span>Bajar Libro</span>
              </button>

              <button
                onClick={() => navigate("/buscarlibro")}
                className="btn btn-primary btn-lg d-flex align-items-center gap-2 px-4 py-3 btn-futurista"
              >
                <Search size={45} />
                <span>Buscar Libro</span>
              </button>

              <button
                onClick={() => navigate("/agregarlibro")}
                className="btn btn-success btn-lg d-flex align-items-center gap-2 px-4 py-3 btn-futurista"
              >
                <PlusCircle size={45} />
                <span>Agregar Libro</span>
              </button>
            </div>
          </div>

          {/* Botones inferiores */}
          <div className="row mt-5">
            <div
              className="col-12 d-flex justify-content-center align-items-center flex-wrap"
              style={{ minHeight: "200px" }}
            >
              <button
                onClick={() => navigate("/faltantes")}
                className="btn-faltantes-color btn-lg d-flex align-items-center justify-content-center gap-2 px-4 py-3 btn-futurista m-5"
                style={{
                  borderRadius: "40px",
                  padding: "10px 30px",
                  minWidth: "150px",
                }}
              >
                <TriangleAlert size={45} color="black" />
                <span style={{ color: "white", fontSize: '25px' }}>Faltantes Stock</span>
              </button>

              <button
                onClick={() => navigate("/pedidos")}
                className="btn-pedidos btn-lg d-flex align-items-center justify-content-center gap-2 px-4 py-3 btn-futurista m-5"
                style={{
                  borderRadius: "50px",
                  padding: "10px 30px",
                  minWidth: "150px",
                }}
              >
                <BookOpenCheck size={45} color="black" />
                <span style={{ color: "white", fontSize: '25px' }}>Pedidos libros</span>
              </button>
            </div>
          </div>
          <div className="d-flex justify-content-center" style={{ marginTop: '-50px' }}>
            <button
              onClick={() => navigate("/caja")}
              className="btn btn-success btn-lg gap-2 px-4 py-3 btn-futurista"
              style={{
                borderRadius: "10px",
                padding: "10px 30px",
                minWidth: "150px",
                margin: 50,
              }}
            >
              <PackageOpen size={45} color="black" />
              <span style={{ color: "white", marginLeft: "13px", fontSize: '19px' }}>Caja</span>
            </button>
          </div>
        </div>
      </div >
    </>
  );
};

export default Inicio;
