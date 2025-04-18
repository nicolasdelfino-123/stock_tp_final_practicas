// src/App.js
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";
import { AppProvider } from "./context/appContext";
import Home from "./components/Home";
import AgregarLibro from "./components/AgregarLibro";
import BajarLibro from "./components/BajarLibro";
import BuscarLibro from "./components/BuscarLibro";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agregarlibro" element={<AgregarLibro />} />
          <Route path="/bajarlibro" element={<BajarLibro />} />
          <Route path="/buscarlibro" element={<BuscarLibro />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
