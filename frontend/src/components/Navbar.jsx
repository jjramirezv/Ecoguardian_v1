import React from 'react';
// --- IMPORTANTE: Asegúrate de que el nombre del archivo coincida ---
// Si tu logo es .svg o .jpg, cambia la extensión aquí abajo:
import logoImg from '../assets/images/logo.png'; 

const Navbar = ({ onViewChange, currentView }) => {
  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 5%',
      zIndex: 100,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 30px rgba(0,0,0,0.03)'
    }}>
      
      {/* --- AQUÍ ESTÁ EL LOGO Y EL NOMBRE --- */}
      <div 
        onClick={() => onViewChange('home')} // Opcional: Clic para ir al inicio
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          cursor: 'pointer' 
        }}
      >
        {/* 1. LA IMAGEN DEL LOGO */}
        <img 
          src={logoImg} 
          alt="EcoGuardian Logo" 
          style={{ 
            height: '45px', // Ajusta este número para cambiar el tamaño del logo
            width: 'auto',
            objectFit: 'contain'
          }} 
        />

        {/* 2. EL NOMBRE DE LA APP */}
        <span style={{ 
          fontSize: '2rem', 
          fontWeight: '800', 
          color: '#83b05f', // Color Café Oscuro (según tu paleta)
          letterSpacing: '2px', // Espaciado elegante
 // FUERZA MAYÚSCULAS
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          EcoGuardian
        </span>
      </div>

      {/* Botón de navegación (Lado derecho) */}
      {currentView === 'app' && (
        <button 
          onClick={() => onViewChange('home')} 
          style={{
            background: 'transparent',
            border: '2px solid #f0f0f0',
            padding: '8px 20px',
            borderRadius: '12px',
            fontWeight: '600',
            color: '#788575',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {e.target.style.borderColor = '#6B8E23'; e.target.style.color = '#6B8E23'}}
          onMouseLeave={(e) => {e.target.style.borderColor = '#f0f0f0'; e.target.style.color = '#788575'}}
        >
          Volver al Inicio
        </button>
      )}
    </nav>
  );
};

export default Navbar;