import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/appContext';

const ProtectedRoute = ({ children }) => {
    const { store, actions } = useAppContext();

    if (store.isLoading) {
        return <div>Cargando...</div>;
    }

    if (!actions.isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;