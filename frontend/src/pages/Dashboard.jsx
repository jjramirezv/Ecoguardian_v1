import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import { Thermometer, Droplets, Wind, Activity, Wifi, Lock, Smartphone, Signal } from 'lucide-react';
import * as THREE from 'three';

// --- COMPONENTE MODELO 3D (Papa) ---
const PotatoPlant = ({ healthStatus }) => {
  // Asegúrate de que la ruta al modelo sea correcta en tu carpeta public
  const { scene } = useGLTF('/potato_plant.glb'); 
  const clone = React.useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    clone.traverse((child) => {
      if (child.isMesh) {
        // Cambiar color según salud
        if (healthStatus === 'danger') {
            child.material = new THREE.MeshStandardMaterial({ color: '#8B4513' }); // Café (Muriendo)
        } else if (healthStatus === 'warning') {
            child.material = new THREE.MeshStandardMaterial({ color: '#D4AF37' }); // Amarillento
        } else {
            child.material = new THREE.MeshStandardMaterial({ color: '#228B22' }); // Verde Sano
        }
      }
    });
  }, [healthStatus, clone]);

  return <primitive object={clone} scale={2} position={[0, -2, 0]} />;
};

const Dashboard = () => {
  // --- ESTADOS ---
  const [mode, setMode] = useState(null); // 'satellite' o 'iot'
  const [sensorData, setSensorData] = useState({ temp: 24, hum: 60, soil: 400 });
  const [prediction, setPrediction] = useState(null);
  
  // --- ESTADOS PARA LA CONEXIÓN WIFI ---
  const [wifiStep, setWifiStep] = useState('hidden'); // 'hidden', 'scanning', 'list', 'password', 'connected'
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiError, setWifiError] = useState('');

  // URL DE TU BACKEND EN LA NUBE (Con doble i)
  const API_URL = 'https://ecoguardian-apii.onrender.com';

  // --- LÓGICA DE CONEXIÓN WIFI ---
  const startWifiScan = () => {
    setMode('iot');
    setWifiStep('scanning');
    
    // Simular escaneo de 2 segundos
    setTimeout(() => {
      setWifiStep('list');
    }, 2500);
  };

  const handleConnect = () => {
    if (wifiPassword === 'admin123') { // CONTRASEÑA DE EJEMPLO
      setWifiStep('connecting');
      setTimeout(() => {
        setWifiStep('connected'); // ¡Éxito!
        // Aquí podrías iniciar la conexión MQTT real si quisieras
      }, 1500);
    } else {
      setWifiError('Contraseña incorrecta');
    }
  };

  // --- LÓGICA DE DATOS (Simulada o Real) ---
  const fetchData = async () => {
    try {
      // Aquí iría tu fetch real al backend
      // const res = await fetch(`${API_URL}/api/sensors`);
      // const data = await res.json();
      
      // Por ahora simulamos variación para que se mueva el 3D
      setSensorData({
        temp: 20 + Math.random() * 5,
        hum: 50 + Math.random() * 10,
        soil: 300 + Math.random() * 100
      });
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  useEffect(() => {
    if (mode === 'satellite' || wifiStep === 'connected') {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [mode, wifiStep]);

  // Calcular estado de salud visual
  const getHealthStatus = () => {
    if (sensorData.hum > 90 || sensorData.temp > 28) return 'danger';
    if (sensorData.hum > 80 || sensorData.temp > 25) return 'warning';
    return 'healthy';
  };

  // --- RENDERIZADO DEL MODAL WIFI ---
  const renderWifiModal = () => {
    if (wifiStep === 'hidden' || wifiStep === 'connected') return null;

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
      }}>
        <div className="wifi-modal" style={{
          background: 'white', padding: '30px', borderRadius: '24px',
          width: '90%', maxWidth: '400px', textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}>
          
          {/* PASO 1: ESCANEANDO */}
          {wifiStep === 'scanning' && (
            <>
              <Signal className="animate-pulse" size={48} color="#83b05f" style={{margin:'0 auto 20px'}}/>
              <h3 style={{fontSize:'1.2rem', marginBottom:'10px'}}>Escaneando Sensores...</h3>
              <p style={{color:'#666'}}>Buscando dispositivos EcoGuardian cercanos.</p>
            </>
          )}

          {/* PASO 2: LISTA DE DISPOSITIVOS */}
          {wifiStep === 'list' && (
            <>
              <h3 style={{marginBottom:'20px'}}>Dispositivos Encontrados</h3>
              <div 
                onClick={() => setWifiStep('password')}
                style={{
                  display:'flex', alignItems:'center', gap:'15px', padding:'15px',
                  background:'#f5f5f5', borderRadius:'12px', cursor:'pointer', border:'1px solid #ddd'
                }}>
                <Wifi color="#83b05f" />
                <div style={{textAlign:'left'}}>
                  <div style={{fontWeight:'bold'}}>EcoGuardian-Module-01</div>
                  <div style={{fontSize:'0.8rem', color:'#666'}}>Señal fuerte</div>
                </div>
              </div>
            </>
          )}

          {/* PASO 3: CONTRASEÑA */}
          {wifiStep === 'password' && (
            <>
              <Lock size={48} color="#83b05f" style={{margin:'0 auto 10px'}}/>
              <h3>Autenticación Requerida</h3>
              <p style={{fontSize:'0.9rem', color:'#666', marginBottom:'20px'}}>
                Ingresa la clave del dispositivo IoT
              </p>
              
              <input 
                type="password" 
                placeholder="Contraseña (admin123)"
                value={wifiPassword}
                onChange={(e) => {setWifiPassword(e.target.value); setWifiError('');}}
                style={{
                  width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #ccc',
                  marginBottom:'10px', fontSize:'1rem'
                }}
              />
              {wifiError && <div style={{color:'red', fontSize:'0.8rem', marginBottom:'10px'}}>{wifiError}</div>}
              
              <button 
                onClick={handleConnect}
                style={{
                  background:'#83b05f', color:'white', border:'none', padding:'12px 30px',
                  borderRadius:'30px', width:'100%', fontSize:'1rem', fontWeight:'bold', cursor:'pointer'
                }}>
                Conectar
              </button>
            </>
          )}
          
           {/* PASO 4: CONECTANDO */}
           {wifiStep === 'connecting' && (
            <>
              <div style={{width:'40px', height:'40px', border:'4px solid #f3f3f3', borderTop:'4px solid #83b05f', borderRadius:'50%', margin:'0 auto 20px', animation:'spin 1s linear infinite'}}></div>
              <h3>Estableciendo enlace seguro...</h3>
            </>
          )}
        </div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        `}</style>
      </div>
    );
  };

  // --- PANTALLA DE SELECCIÓN ---
  if (!mode) {
    return (
      <div style={{ 
        minHeight: '100vh', display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', padding: '20px' 
      }}>
        <h1 style={{ color: '#2d6a4f', marginBottom: '10px', textAlign:'center' }}>EcoGuardian 🌱</h1>
        <p style={{ color: '#666', marginBottom: '40px', textAlign:'center' }}>Selecciona tu fuente de datos</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '400px' }}>
          
          {/* BOTÓN SATÉLITE */}
          <button 
            onClick={() => setMode('satellite')}
            style={{
              padding: '25px', borderRadius: '20px', border: 'none', background: 'white',
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: '20px', transition: 'transform 0.2s'
            }}>
            <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '50%' }}>
              <Smartphone size={32} color="#2d6a4f" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ margin: 0, color: '#333' }}>Vía Satélite / App</h3>
              <p style={{ margin: '5px 0 0', color: '#888', fontSize: '0.9rem' }}>Datos simulados o API externa</p>
            </div>
          </button>

          {/* BOTÓN IOT (WIFI) */}
          <button 
            onClick={startWifiScan}
            style={{
              padding: '25px', borderRadius: '20px', border: 'none', background: 'white',
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: '20px', transition: 'transform 0.2s'
            }}>
            <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '50%' }}>
              <Wifi size={32} color="#e67e22" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ margin: 0, color: '#333' }}>Sensores IoT (WiFi)</h3>
              <p style={{ margin: '5px 0 0', color: '#888', fontSize: '0.9rem' }}>Conectar a dispositivo físico</p>
            </div>
          </button>

        </div>
        {renderWifiModal()}
      </div>
    );
  }

  // --- DASHBOARD PRINCIPAL (Si ya conectó) ---
  if (mode === 'iot' && wifiStep !== 'connected') {
     // Si estamos en modo IoT pero aun no conectamos (está en el modal), mostramos el modal sobre el fondo
     return renderWifiModal(); 
  }

  return (
    <div className="dashboard-container" style={{ 
      minHeight: '100vh', background: '#f0f2f5', padding: '20px', 
      display: 'flex', gap: '20px' // Flexbox para layout
    }}>
      
      {/* 1. PANEL DE CONTROL (Izquierda/Arriba) */}
      <div className="control-panel" style={{ flex: 1, display:'flex', flexDirection:'column', gap:'20px' }}>
        
        {/* Header */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, color: '#2d6a4f' }}>Campo: Sector 7G</h2>
              <p style={{ margin: '5px 0 0', color: '#888' }}>
                {mode === 'iot' ? '🟢 Conectado vía WiFi (ESP32)' : '📡 Datos Satelitales'}
              </p>
            </div>
            <button onClick={() => {setMode(null); setWifiStep('hidden');}} style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid #ddd', background: 'transparent', cursor:'pointer' }}>
              Salir
            </button>
          </div>
        </div>

        {/* Tarjetas de Sensores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
          <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '20px' }}>
            <Thermometer color="#1976d2" />
            <h3>{sensorData.temp.toFixed(1)}°C</h3>
            <p>Temperatura</p>
          </div>
          <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '20px' }}>
            <Droplets color="#2e7d32" />
            <h3>{sensorData.hum.toFixed(1)}%</h3>
            <p>Humedad Aire</p>
          </div>
          <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '20px' }}>
            <Activity color="#f57c00" />
            <h3>{sensorData.soil.toFixed(0)}</h3>
            <p>Humedad Suelo</p>
          </div>
        </div>

        {/* Alerta IA */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '20px', borderLeft: '5px solid #e74c3c' }}>
          <h3 style={{marginTop:0}}>🤖 Análisis de Riesgo</h3>
          <p>La probabilidad de Rancha (Phytophthora) es del <strong>12%</strong>.</p>
          <p style={{fontSize:'0.9rem', color:'#666'}}>Condiciones estables por el momento.</p>
        </div>
      </div>

      {/* 2. PANEL VISUAL (Derecha/Abajo) */}
      <div className="visual-panel canvas-container" style={{ flex: 1, minHeight: '500px', background: 'linear-gradient(180deg, #87CEEB 0%, #E0F7FA 100%)', borderRadius: '24px', overflow: 'hidden', position:'relative' }}>
        <div style={{ position: 'absolute', top: 20, left: 20, background: 'white', padding: '8px 15px', borderRadius: '20px', fontWeight: 'bold', zIndex: 10 }}>
          ⚡ Gemelo Digital
        </div>
        <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
          <ambientLight intensity={0.7} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
          <Environment preset="sunset" />
          <OrbitControls enableZoom={true} />
          <PotatoPlant healthStatus={getHealthStatus()} />
        </Canvas>
      </div>
    </div>
  );
};

export default Dashboard;