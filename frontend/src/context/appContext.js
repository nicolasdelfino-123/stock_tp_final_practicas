// src/context/AppContext.js
import React, { createContext, useState, useContext } from "react";

const AppContext = createContext();

export const useAppContext = () => {
  return useContext(AppContext);
};

export const AppProvider = ({ children }) => {
  const [libros, setLibros] = useState([]);

  return (
    <AppContext.Provider value={{ libros, setLibros }}>
      {children}
    </AppContext.Provider>
  );
};
