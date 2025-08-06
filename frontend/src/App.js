// src/App.js
import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import "./App.css";
import { AppProvider, useAppContext } from "./context/appContext";
import Home from "./components/Home";
import AgregarLibro from "./components/AgregarLibro";
import BajarLibro from "./components/BajarLibro";
import BuscarLibro from "./components/BuscarLibro";
import Login from "./components/Login";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import Faltantes from "./components/Faltantes"

// Componente para proteger rutas
const ProtectedRoute = ({ children }) => {
  const { store, actions } = useAppContext();
  
  if (store.isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Cargando...</div>
      </div>
    );
  }
  
  const isAuthenticated = actions.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Componente para redireccionar si ya está logueado
const PublicRoute = ({ children }) => {
  const { store, actions } = useAppContext();
  
  if (store.isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Cargando...</div>
      </div>
    );
  }
  
  const isAuthenticated = actions.isAuthenticated();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppContent() {
  const { store, actions } = useAppContext();
  
  if (store.isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Cargando aplicación...</div>
      </div>
    );
  }
  
  return (
    <Router>
      <Routes>
        {/* Ruta pública - si ya está logueado, redirige a home */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        {/* Rutas protegidas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agregarlibro"
          element={
            <ProtectedRoute>
              <AgregarLibro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bajarlibro"
          element={
            <ProtectedRoute>
              <BajarLibro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buscarlibro"
          element={
            <ProtectedRoute>
              <BuscarLibro />
            </ProtectedRoute>
          }
        />

        <Route
          path="/faltantes"
          element={
            <ProtectedRoute>
              <Faltantes />
            </ProtectedRoute>
          }
        />
        
        {/* Redireccionar rutas desconocidas */}
        <Route
          path="*"
          element={
            actions.isAuthenticated() ? 
              <Navigate to="/" replace /> : 
              <Navigate to="/login" replace />
          }
        />
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