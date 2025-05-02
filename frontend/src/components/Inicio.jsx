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

  return (
    <div className="container d-flex justify-content-center my-3 gap-3">
      <button type="button" className="btn btn-danger" onClick={irABajarLibro}>
        <i className="fas fa-trash me-2"></i>Bajar Libro
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={irABuscarLibro}
      >
        <i className="fas fa-search me-2"></i>Buscar Libro
      </button>
      <button
        type="button"
        className="btn btn-success"
        onClick={irAAgregarLibro}
      >
        <i className="fas fa-plus me-2"></i>Agregar Libro
      </button>
    </div>
  );
};

export default Inicio;
