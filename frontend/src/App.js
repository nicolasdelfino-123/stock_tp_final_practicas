// src/App.js
import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import "./App.css";
import { AppProvider } from "./context/appContext";
import Home from "./components/Home";
import AgregarLibro from "./components/AgregarLibro";
import BajarLibro from "./components/BajarLibro";
import BuscarLibro from "./components/BuscarLibro";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import Faltantes from "./components/Faltantes";
import LibrosDadosBaja from "./components/LibrosDadosBaja";

function AppContent() {
  return (
    <Router>
      <Routes>
        {/* Ruta principal */}
        <Route path="/" element={<Home />} />
        <Route path="/agregarlibro" element={<AgregarLibro />} />
        <Route path="/bajarlibro" element={<BajarLibro />} />
        <Route path="/buscarlibro" element={<BuscarLibro />} />
        <Route path="/faltantes" element={<Faltantes />} />
        <Route path="/libros-dados-baja" element={<LibrosDadosBaja />} />

        {/* Redireccionar rutas desconocidas a home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;