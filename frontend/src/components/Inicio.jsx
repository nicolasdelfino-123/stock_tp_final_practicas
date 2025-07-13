import React from "react";
import { useNavigate } from "react-router-dom";

const Inicio = () => {
  const navigate = useNavigate();

  const irABajarLibro = () => {
    navigate("/bajarlibro");
  };

  const irABuscarLibro = () => {
    navigate("/buscarlibro");
  };

  const irAAgregarLibro = () => {
    navigate("/agregarlibro");
  };
  const fondoURL = "/fondo-3.jpg"

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${fondoURL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: "100vh",
      }}
    >
      <div className="container d-flex justify-content-center align-items-center gap-4" style={{ height: "100vh" }}>
        <button
          type="button"
          className="btn btn-danger btn-lg p-4"
          onClick={irABajarLibro}
          style={{ fontSize: "1.5rem" }}
        >
          <i className="fas fa-trash me-3" style={{ fontSize: "2rem" }}></i>
          Bajar Libro
        </button>

        <button
          type="button"
          className="btn btn-primary btn-lg p-4"
          onClick={irABuscarLibro}
          style={{ fontSize: "1.5rem" }}
        >
          <i className="fas fa-search me-3" style={{ fontSize: "2rem" }}></i>
          Buscar Libro
        </button>

        <button
          type="button"
          className="btn btn-success btn-lg p-4"
          onClick={irAAgregarLibro}
          style={{ fontSize: "1.5rem" }}
        >
          <i className="fas fa-plus me-3" style={{ fontSize: "2rem" }}></i>
          Agregar Libro
        </button>
      </div>
    </div>
  );
};

export default Inicio;
