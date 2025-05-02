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
    <div className="container d-flex justify-content-center my-5 gap-4">
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
  );
};

export default Inicio;
