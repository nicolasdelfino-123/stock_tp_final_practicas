import React, { useState } from 'react';
import { useAppContext } from '../context/appContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { actions } = useAppContext();
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [isHover, setIsHover] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await actions.loginUser(username, password);

            if (result.success) {
                // Espera un ciclo de renderizado para asegurar que el estado se actualizó
                setTimeout(() => {
                    navigate('/');
                }, 0);
            } else {
                setError(result.error || 'Error al iniciar sesión');
            }
        } catch (err) {
            setError('Error inesperado al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    const baseColor = '#1976d2'; // Color base para el botón y otros elementos
    const hoverColor = '#115293'; // Color al pasar el mouse
    const disabledColor = '#ccc'; // Color para el botón deshabilitado

    return (
        <div style={styles.container}>
            <div style={styles.blurBackground}></div>
            <form style={styles.form} onSubmit={handleSubmit}>
                <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Iniciar Sesión</h2>
                {error && <p style={styles.error}>{error}</p>}
                <input
                    style={styles.input}
                    type="text"
                    placeholder="Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                />
                <input
                    style={styles.input}
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                />
                <button
                    style={{
                        ...styles.button,
                        backgroundColor: loading ? disabledColor : (isHover ? hoverColor : baseColor),
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                    type="submit"
                    disabled={loading}
                    onMouseEnter={(e) => { setIsHover(true); }}
                    onMouseLeave={(e) => { setIsHover(false); }}



                >
                    {loading ? 'Iniciando...' : 'Entrar'}
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: {
        position: 'relative',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    blurBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        backgroundImage: `url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1470&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(8px)',
        zIndex: 1,
    },
    form: {
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.3)',
        zIndex: 2,
        width: '320px',
        display: 'flex',
        flexDirection: 'column',
    },
    input: {
        padding: '12px 15px',
        marginBottom: '20px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        fontSize: '16px',
    },
    button: {
        padding: '12px',
        borderRadius: '4px',
        border: 'none',
        backgroundColor: '#1976d2',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    error: {
        color: 'red',
        marginBottom: '10px',
        textAlign: 'center',
        fontSize: '14px',
        padding: '8px',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderRadius: '4px',
        border: '1px solid rgba(255, 0, 0, 0.3)',
    }
};

export default Login;