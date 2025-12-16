import React, { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import { Satellite, Cpu, MapPin, ArrowRight, Droplets, Sun, Thermometer, Sprout, Activity, X, Calendar, Lock, Home } from 'lucide-react';
import Scene from '../components/Scene';
import GaugeChart from '../components/GaugeChart';

// CONFIGURACIÓN MQTT
const MQTT_URL = 'wss://xe11171c.ala.us-east-1.emqxsl.com:8084/mqtt';
const MQTT_OPTIONS = { clientId: 'Eco-' + Math.random(), username: 'Ecoguardian', password: 'somosecoguardian$1', clean: true };

// URL DEL BACKEND
const API_URL = 'https://ecoguardian-apii.onrender.com';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('selector'); 
  const [gpsData, setGpsData] = useState(null);
  const [hwData, setHwData] = useState({ humedad_aire: 0, temp_aire: 0, temp_agua: 0, humedad_suelo: 0 });
  const [mqttConnected, setMqttConnected] = useState(false);
  const [modelPrediction, setModelPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Historial
  const [historial, setHistorial] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // --- LÓGICA DE RIESGO ---
  const calcularRiesgo = (temp, hum) => {
    const t = parseFloat(temp || 0); const h = parseFloat(hum || 0);
    if (t === 0 && h === 0) return { nivel: 'ESPERANDO...', code: 'optimo' };
    const tIdeal = t >= 15 && t <= 26; const tAlert = (t >= 12 && t < 15) || (t > 26 && t <= 28);
    if (tIdeal && h > 95) return { nivel: 'MUY FAVORABLE (Riesgo Alto)', code: 'muy_favorable' };
    if (tIdeal && h > 90) return { nivel: 'FAVORABLE (Riesgo Medio)', code: 'favorable' };
    if ((tAlert || tIdeal) && h >= 80) return { nivel: 'ALERTA RANCHA', code: 'rancha' }; 
    return { nivel: 'CLIMA ÓPTIMO', code: 'optimo' };
  };

  // --- MQTT ---
  useEffect(() => {
    let client;
    let watchdog; 
    if (mode === 'hardware') {
      try {
        setMqttConnected(false); 
        client = mqtt.connect(MQTT_URL, MQTT_OPTIONS);
        client.on('connect', () => { 
            console.log("🌐 Conectado al Broker MQTT");
            client.subscribe('ecoguardian/datos'); 
        });
        client.on('message', async (topic, message) => { 
            try { 
                const datos = JSON.parse(message.toString());
                setHwData(datos); 
                setMqttConnected(true); 
                // Guardar en BD (Silencioso)
                try {
                    await fetch(`${API_URL}/api/guardar-sensor`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ temp: datos.temp_aire || 0, hum: datos.humedad_aire || 0, precip: datos.precipitacion || 0 })
                    });
                } catch (err) { console.error("Error BD:", err); }
                clearTimeout(watchdog);
                watchdog = setTimeout(() => { setMqttConnected(false); }, 5000); 
            } catch(e) { console.error("Error msg:", e); } 
        });
        client.on('offline', () => setMqttConnected(false));
        client.on('error', () => setMqttConnected(false));
      } catch (error) { setMqttConnected(false); }
    }
    return () => { if (client) client.end(); clearTimeout(watchdog); };
  }, [mode]);

  // --- HANDLERS ---
  const handleGPS = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`${API_URL}/api/predict`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude })
          });
          const d = await res.json();
          const r = calcularRiesgo(d.datos_climaticos?.temp_promedio_semanal, d.datos_climaticos?.humedad_promedio_semanal);
          setGpsData({ ...d, ...r }); setMode('gps'); setShowResults(false);
        } catch (error) { alert("Error API"); } finally { setLoading(false); }
      }, () => { alert("Activa tu GPS"); setLoading(false); });
    }
  };

  const handleHardwareAccess = () => {
    setShowPasswordModal(true);
    setInputPassword('');
    setPasswordError('');
  };

  const verifyPassword = () => {
    if (inputPassword === 'admin') {
      setShowPasswordModal(false);
      setLoading(true); 
      setTimeout(() => { setMode('hardware'); setLoading(false); }, 800);
    } else {
      setPasswordError('Contraseña incorrecta');
    }
  };

  const handleModelPrediction = async () => {
    if (!gpsData) return;
    setPredicting(true);
    try {
      const datos = gpsData.datos_climaticos;
      const res = await fetch(`${API_URL}/api/predict-model`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperatura: datos.temp_promedio_semanal, humedad: datos.humedad_promedio_semanal, precipitacion: datos.precipitacion_diaria_promedio })
      });
      const data = await res.json();
      setModelPrediction(data); setShowResults(true);
    } catch (e) { alert(e.message); } finally { setPredicting(false); }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    setShowHistory(true);
    try {
        const res = await fetch(`${API_URL}/api/historial`);
        const data = await res.json();
        if(data.error) throw new Error(data.error);
        setHistorial(data);
    } catch (e) { alert("Error: " + e.message); setShowHistory(false); } finally { setLoadingHistory(false); }
  };

  const riesgoHW = calcularRiesgo(hwData.temp_aire, hwData.humedad_aire);
  const activeCode = mode === 'hardware' ? (mqttConnected ? riesgoHW.code : 'optimo') : (gpsData ? gpsData.codigo_riesgo : 'optimo');

  return (
    <div className="app-container">
      {/* --- ESTILOS RESPONSIVE INTERNOS (Adaptados a tu index.css) --- */}
      <style>{`
        /* Usamos las variables de tu index.css */
        .app-container {
            min-height: 100vh;
            background-color: var(--bg-body);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        /* LAYOUT PRINCIPAL (PC) */
        .dashboard-grid {
            display: grid;
            grid-template-columns: 380px 1fr; /* Panel izq fijo, escena 3D flexible */
            width: 100%;
            max-width: 1400px;
            height: 85vh;
            background: white;
            border-radius: 32px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.08);
            overflow: hidden;
            border: 1px solid #eef2eb;
        }

        /* PANEL LATERAL */
        .sidebar {
            padding: 30px;
            overflow-y: auto;
            border-right: 1px solid #f0f0f0;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        /* AREA 3D */
        .scene-area {
            position: relative;
            background: linear-gradient(to bottom, #edf7fc, #eaf4e2);
            overflow: hidden;
        }

        /* TARJETAS DE SELECCIÓN */
        .selector-container {
            text-align: center;
            max-width: 800px;
            width: 100%;
        }
        .selector-cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 40px;
        }
        .option-card {
            background: white;
            padding: 30px;
            border-radius: 24px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 2px solid transparent;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
        .option-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary);
            box-shadow: 0 15px 40px rgba(131, 176, 95, 0.15);
        }

        /* --- RESPONSIVE MOBILE (CELULARES) --- */
        @media (max-width: 768px) {
            .app-container {
                padding: 10px;
                align-items: flex-start; /* Evita centrado vertical forzado */
            }

            /* En móvil, cambiamos Grid a Flex Columna */
            .dashboard-grid {
                display: flex;
                flex-direction: column-reverse; /* IMPORTANTE: Datos abajo, 3D arriba */
                height: auto;
                min-height: 100vh;
                border-radius: 20px;
            }

            .sidebar {
                width: 100%;
                height: auto;
                border-right: none;
                border-top: 1px solid #f0f0f0;
                padding: 20px;
                order: 1; /* Datos abajo */
            }

            .scene-area {
                width: 100%;
                height: 45vh; /* Altura fija para el 3D en celular */
                min-height: 350px;
                order: 2; /* 3D Arriba */
            }

            .selector-cards {
                grid-template-columns: 1fr; /* Una columna */
            }
            
            h2 { font-size: 1.8rem; }
        }

        /* ELEMENTOS UI */
        .badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge-gps { background: #eaf4e2; color: var(--primary-dark); }
        .badge-iot { background: #f9f6e8; color: var(--secondary); }

        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 16px;
            text-align: center;
        }
        .stat-label { font-size: 0.75rem; font-weight: 700; color: var(--text-light); text-transform: uppercase; margin-bottom: 5px; }
        .stat-value { font-size: 1.6rem; font-weight: 800; color: var(--text-main); }

        .btn-action {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: 0.2s;
        }
        .btn-green { background: var(--primary); color: white; }
        .btn-white { background: white; border: 1px solid #ddd; color: var(--text-main); }

        .floating-label {
            position: absolute;
            top: 20px; left: 20px;
            background: rgba(255,255,255,0.9);
            padding: 8px 16px;
            border-radius: 30px;
            font-weight: 600;
            color: var(--text-main);
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            z-index: 10;
        }
      `}</style>

      {/* --- MODO SELECTOR (PANTALLA DE INICIO) --- */}
      {mode === 'selector' ? (
        <div className="selector-container">
          <h1 style={{ fontSize: '2.5rem', color: 'var(--text-main)', marginBottom: '10px' }}>EcoGuardian 🌱</h1>
          <p style={{ color: 'var(--text-light)' }}>Selecciona tu fuente de monitoreo</p>
          
          <div className="selector-cards">
            {/* GPS */}
            <div className="option-card" onClick={handleGPS}>
              <div style={{ background: '#eaf4e2', width: 70, height: 70, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                <Satellite size={32} color="var(--primary-dark)" />
              </div>
              <h3 style={{ color: 'var(--text-main)' }}>Vía Satélite</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginTop: '5px' }}>Datos climáticos globales (NASA)</p>
            </div>

            {/* IOT */}
            <div className="option-card" onClick={handleHardwareAccess}>
              <div style={{ background: '#f9f6e8', width: 70, height: 70, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                <Cpu size={32} color="var(--secondary)" />
              </div>
              <h3 style={{ color: 'var(--text-main)' }}>Sensores IoT</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginTop: '5px' }}>Conexión a dispositivo local</p>
            </div>
          </div>
          {loading && <div style={{ marginTop: '20px', color: 'var(--primary)', fontWeight: 'bold' }}>Cargando sistema...</div>}
        </div>
      ) : (
        /* --- MODO DASHBOARD (MONITOR) --- */
        <div className="dashboard-grid">
          
          {/* 1. SIDEBAR DE DATOS */}
          <div className="sidebar">
            <button onClick={() => setMode('selector')} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
              <Home size={18} /> Volver al Inicio
            </button>

            <div>
                <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', margin: 0 }}>Monitor</h2>
                <div style={{ marginTop: '10px' }}>
                    <span className={`badge ${mode === 'gps' ? 'badge-gps' : 'badge-iot'}`}>
                        {mode === 'gps' ? '🛰️ SATELITAL' : '📡 SENSORES IOT'}
                    </span>
                </div>
            </div>

            {/* DATOS GPS */}
            {mode === 'gps' && gpsData && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                  <MapPin size={16} /> {gpsData.ubicacion}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="stat-card">
                    <div className="stat-label">Temperatura</div>
                    <div className="stat-value">{gpsData.datos_climaticos.temp_promedio_semanal}°</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Humedad</div>
                    <div className="stat-value">{gpsData.datos_climaticos.humedad_promedio_semanal}%</div>
                  </div>
                </div>

                <button onClick={handleModelPrediction} disabled={predicting} className="btn-action btn-green">
                  {predicting ? 'Analizando...' : 'Analizar Riesgo con IA'}
                </button>

                {showResults && modelPrediction && (
                   <div style={{ padding: '20px', borderRadius: '16px', background: modelPrediction.prediccion_modelo?.codigo_riesgo === 'rancha' ? '#fff5f5' : '#f0fdf4', border: '1px solid', borderColor: modelPrediction.prediccion_modelo?.codigo_riesgo === 'rancha' ? '#fed7d7' : '#bbf7d0' }}>
                     <div style={{ fontSize: '0.8rem', fontWeight: '700', color: modelPrediction.prediccion_modelo?.codigo_riesgo === 'rancha' ? '#c53030' : '#2f855a', marginBottom: '5px' }}>DIAGNÓSTICO</div>
                     <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>{modelPrediction.prediccion_modelo?.nivel_riesgo}</div>
                   </div>
                )}
              </>
            )}

            {/* DATOS IOT */}
            {mode === 'hardware' && (
              <>
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: mqttConnected ? '#f0fdf4' : '#fff5f5', borderRadius: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Estado Conexión</span>
                    <span style={{ fontWeight: '700', color: mqttConnected ? '#2f855a' : '#c53030' }}>{mqttConnected ? 'ONLINE' : 'OFFLINE'}</span>
                 </div>
                 
                 {mqttConnected ? (
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <GaugeChart title="Aire Hum." value={hwData.humedad_aire} max={100} unit="%" color="var(--primary)" icon={Droplets} />
                      <GaugeChart title="Temp." value={hwData.temp_aire} max={50} unit="°C" color="var(--secondary)" icon={Sun} />
                      <GaugeChart title="Suelo" value={hwData.humedad_suelo} max={100} unit="%" color="#d7a56c" icon={Sprout} />
                   </div>
                 ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-light)' }}>
                        Esperando datos del sensor...
                    </div>
                 )}
                 
                 <div style={{ marginTop: 'auto' }}>
                    <div style={{ padding: '15px', borderRadius: '16px', background: 'var(--text-main)', color: 'white', textAlign: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: '5px' }}>ESTADO GENERAL DEL CULTIVO</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{riesgoHW.nivel}</div>
                    </div>

                    <button onClick={loadHistory} className="btn-action btn-white">
                        <Calendar size={18} /> Ver Historial Diario
                    </button>
                 </div>
              </>
            )}
          </div>

          {/* 2. ESCENA 3D (VISUAL PANEL) */}
          <div className="scene-area">
            <div className="floating-label">
              <Activity size={18} color="var(--primary)" /> Visualización Digital
            </div>
            {/* El Canvas se ajustará automáticamente al tamaño del contenedor .scene-area */}
            <Scene status={activeCode} />
          </div>

        </div>
      )}

      {/* --- MODALES (CONTRASEÑA E HISTORIAL) --- */}
      
      {/* Modal Contraseña */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <div style={{ background: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '350px', textAlign: 'center' }}>
              <div style={{ background: '#f9f6e8', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Lock color="var(--secondary)" size={30}/>
              </div>
              <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>Acceso IoT</h3>
              <input 
                type="password" placeholder="Contraseña (admin)" value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ccc', marginBottom: '10px', fontSize: '1rem' }}
              />
              {passwordError && <div style={{ color: 'red', fontSize: '0.8rem', marginBottom: '10px' }}>{passwordError}</div>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowPasswordModal(false)} className="btn-action btn-white">Cancelar</button>
                <button onClick={verifyPassword} className="btn-action btn-green">Entrar</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Historial */}
      {showHistory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: '90%', maxWidth: '600px', background: 'white', borderRadius: '24px', padding: '25px', maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Historial</h3>
                    <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X/></button>
                </div>
                {loadingHistory ? <p>Cargando...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee', color: 'var(--text-light)' }}>
                                <th style={{ textAlign: 'left', padding: '10px' }}>Fecha</th>
                                <th style={{ padding: '10px' }}>Temp</th>
                                <th style={{ padding: '10px' }}>Hum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historial.map((dia, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                    <td style={{ padding: '12px 10px', fontWeight: '600' }}>{dia.fecha}</td>
                                    <td style={{ textAlign: 'center', color: 'var(--secondary)' }}>{dia.temperatura}°</td>
                                    <td style={{ textAlign: 'center', color: 'var(--primary)' }}>{dia.humedad}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;