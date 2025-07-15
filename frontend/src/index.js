import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// SOLUCIÓN PARA PRODUCCIÓN - Verificar si el servidor se reinició
const checkServerReset = () => {
  const lastServerReset = localStorage.getItem('lastServerReset');
  const currentServerReset = process.env.REACT_APP_SERVER_START_TIME || new Date().getTime().toString();
  
  if (!lastServerReset || lastServerReset !== currentServerReset) {
    localStorage.clear();
    localStorage.setItem('lastServerReset', currentServerReset);
  }
};

checkServerReset(); // Ejecuta la verificación

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();