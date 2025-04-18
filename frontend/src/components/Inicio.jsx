// src/components/Inicio.jsx
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

  return (
    <div className="container d-flex justify-content-center my-3">
      <button
        type="button"
        className="btn btn-primary me-5"
        onClick={irABajarLibro}
      >
        Bajar Libro
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={irABuscarLibro}
      >
        Buscar Libro
      </button>
    </div>
  );
};

export default Inicio;
