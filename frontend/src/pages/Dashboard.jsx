import React, { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import { Satellite, Cpu, MapPin, ArrowRight, Droplets, Sun, Thermometer, Sprout, Activity, X, Calendar } from 'lucide-react';
import Scene from '../components/Scene';
import GaugeChart from '../components/GaugeChart';

// CONFIGURACIÓN MQTT
const MQTT_URL = 'wss://xe11171c.ala.us-east-1.emqxsl.com:8084/mqtt';
const MQTT_OPTIONS = { clientId: 'Eco-' + Math.random(), username: 'Ecoguardian', password: 'somosecoguardian$1', clean: true };

// URL DEL BACKEND (Cambia esto por tu URL de Render cuando subas a producción)
const API_URL = 'https://ecoguardian-apii.onrender.com'; // Asegúrate que coincida con el puerto de tu backend (5000 o 8000)

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('selector'); 
  const [gpsData, setGpsData] = useState(null);
  const [hwData, setHwData] = useState({ humedad_aire: 0, temp_aire: 0, temp_agua: 0, humedad_suelo: 0 });
  const [mqttConnected, setMqttConnected] = useState(false);
  const [modelPrediction, setModelPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // --- NUEVOS ESTADOS PARA HISTORIAL ---
  const [historial, setHistorial] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // --- MQTT & HANDLERS MEJORADOS ---
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

                // ENVIAR A LA BASE DE DATOS
                try {
                    await fetch(`${API_URL}/api/guardar-sensor`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            temp: datos.temp_aire || 0,
                            hum: datos.humedad_aire || 0,
                            precip: datos.precipitacion || 0 
                        })
                    });
                } catch (err) {
                    console.error("Error guardando en BD:", err);
                }

                clearTimeout(watchdog);
                watchdog = setTimeout(() => {
                    setMqttConnected(false);
                    console.log("⚠️ Sensor dejó de enviar datos");
                }, 5000); 

            } catch(e) { console.error("Error procesando mensaje:", e); } 
        });

        client.on('offline', () => setMqttConnected(false));
        client.on('error', () => setMqttConnected(false));
      } catch (error) { setMqttConnected(false); }
    }
    
    return () => { 
        if (client) client.end(); 
        clearTimeout(watchdog);
    };
  }, [mode]);

  // --- FUNCIONES DE BOTONES ---
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

  // --- NUEVA FUNCIÓN: CARGAR HISTORIAL ---
  const loadHistory = async () => {
    setLoadingHistory(true);
    setShowHistory(true);
    try {
        const res = await fetch(`${API_URL}/api/historial`);
        const data = await res.json();
        if(data.error) throw new Error(data.error);
        setHistorial(data);
    } catch (e) {
        alert("Error cargando historial: " + e.message);
        setShowHistory(false);
    } finally {
        setLoadingHistory(false);
    }
  };

  const riesgoHW = calcularRiesgo(hwData.temp_aire, hwData.humedad_aire);
  const activeCode = mode === 'hardware' ? (mqttConnected ? riesgoHW.code : 'optimo') : (gpsData ? gpsData.codigo_riesgo : 'optimo');

  const cardStyle = {
    background: 'white', borderRadius: '24px', padding: '30px', 
    boxShadow: '0 10px 40px -5px rgba(0,0,0,0.05)', cursor: 'pointer',
    transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
    border: '2px solid transparent'
  };

  return (
    <div style={{ paddingTop: '80px', height: '100vh', background: '#f4f7f0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      
      {mode === 'selector' ? (
        <div style={{ width: '100%', maxWidth: '900px', padding: '20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', color: '#3d4c3d', marginBottom: '10px' }}>¿Cómo quieres trabajar hoy?</h2>
          <p style={{ color: '#788575', marginBottom: '50px' }}>Selecciona la fuente de datos para tus cultivos.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            <div style={cardStyle} 
              onClick={handleGPS}
              onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = '#83b05f'}}
              onMouseLeave={(e) => {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'}}
            >
              <div style={{ padding: '25px', background: '#eaf4e2', borderRadius: '50%', color: '#6e964e' }}><Satellite size={40} /></div>
              <div>
                <h3 style={{ fontSize: '1.4rem', color: '#3d4c3d' }}>Vía Satélite (GPS)</h3>
                <p style={{ color: '#788575', marginTop: '5px' }}>Usar ubicación actual y datos de la NASA.</p>
              </div>
            </div>

            <div style={cardStyle} 
              onClick={() => { setLoading(true); setTimeout(() => { setMode('hardware'); setLoading(false); }, 800); }}
              onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = '#aaab56'}}
              onMouseLeave={(e) => {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'}}
            >
              <div style={{ padding: '25px', background: '#f9f6e8', borderRadius: '50%', color: '#b0ab62' }}><Cpu size={40} /></div>
              <div>
                <h3 style={{ fontSize: '1.4rem', color: '#3d4c3d' }}>Sensores IoT</h3>
                <p style={{ color: '#788575', marginTop: '5px' }}>Conexión directa con tu equipo EcoGuardian.</p>
              </div>
            </div>
          </div>
          {loading && <div style={{ marginTop: '30px', fontWeight: '600', color: '#83b05f' }}>Cargando sistema...</div>}
        </div>
      ) : (
        <div style={{ 
          width: '95%', maxWidth: '1400px', height: '85vh', 
          background: 'white', borderRadius: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
          display: 'flex', overflow: 'hidden', border: '1px solid #eef2eb', position: 'relative'
        }}>
          
          <div style={{ width: '400px', padding: '30px', background: '#ffffff', display: 'flex', flexDirection: 'column', borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}>
            <button onClick={() => setMode('selector')} style={{ background: 'none', border: 'none', color: '#788575', cursor: 'pointer', textAlign: 'left', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
              <ArrowRight size={16} style={{transform: 'rotate(180deg)'}}/> Cambiar Modo
            </button>

            <h2 style={{ fontSize: '1.8rem', color: '#3d4c3d', marginBottom: '5px' }}>Monitor</h2>
            <div style={{ display: 'inline-block', padding: '5px 12px', background: mode === 'gps' ? '#eaf4e2' : '#f9f6e8', color: mode === 'gps' ? '#6e964e' : '#b0ab62', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700', alignSelf: 'flex-start', marginBottom: '25px' }}>
              {mode === 'gps' ? '🛰️ SATELITAL' : '📡 SENSORES IOT'}
            </div>

            {mode === 'gps' && gpsData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#788575', fontSize: '0.9rem' }}>
                  <MapPin size={16} /> {gpsData.ubicacion}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#aaab56', fontWeight: '700' }}>TEMPERATURA</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#3d4c3d' }}>{gpsData.datos_climaticos.temp_promedio_semanal}°</div>
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#83b05f', fontWeight: '700' }}>HUMEDAD</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#3d4c3d' }}>{gpsData.datos_climaticos.humedad_promedio_semanal}%</div>
                  </div>
                </div>

                <button onClick={handleModelPrediction} disabled={predicting} className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                  {predicting ? 'Analizando...' : 'Analizar Riesgo IA'}
                </button>

                {showResults && modelPrediction && (
                   <div style={{ marginTop: '20px', padding: '20px', borderRadius: '20px', background: modelPrediction.prediccion_modelo?.codigo_riesgo === 'rancha' ? '#fff5f5' : '#f0fdf4', border: '1px solid', borderColor: modelPrediction.prediccion_modelo?.codigo_riesgo === 'rancha' ? '#fed7d7' : '#bbf7d0' }}>
                     <div style={{ fontSize: '0.8rem', fontWeight: '700', color: modelPrediction.prediccion_modelo?.codigo_riesgo === 'rancha' ? '#c53030' : '#2f855a', marginBottom: '5px' }}>DIAGNÓSTICO</div>
                     <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#3d4c3d' }}>{modelPrediction.prediccion_modelo?.nivel_riesgo}</div>
                   </div>
                )}
              </div>
            )}

            {mode === 'hardware' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: mqttConnected ? '#f0fdf4' : '#fff5f5', borderRadius: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: '#3d4c3d' }}>Estado Conexión</span>
                    <span style={{ fontWeight: '700', color: mqttConnected ? '#2f855a' : '#c53030' }}>{mqttConnected ? 'ONLINE' : 'OFFLINE'}</span>
                 </div>
                 
                 {mqttConnected && (
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <GaugeChart title="Aire Hum." value={hwData.humedad_aire} max={100} unit="%" color="#83b05f" icon={Droplets} />
                      <GaugeChart title="Temp." value={hwData.temp_aire} max={50} unit="°C" color="#aaab56" icon={Sun} />
                      <GaugeChart title="Suelo" value={hwData.humedad_suelo} max={100} unit="%" color="#d7a56c" icon={Sprout} />
                      <GaugeChart title="Agua" value={hwData.temp_agua} max={40} unit="°C" color="#5a86ad" icon={Thermometer} />
                   </div>
                 )}
                 
                 <div style={{ padding: '20px', borderRadius: '16px', background: '#3d4c3d', color: 'white', textAlign: 'center', marginTop: 'auto' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '5px' }}>ESTADO GENERAL</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>{riesgoHW.nivel}</div>
                 </div>

                 {/* --- NUEVO BOTÓN HISTORIAL --- */}
                 <button onClick={loadHistory} style={{
                    marginTop: '10px', padding: '12px', border: '1px solid #ddd', borderRadius: '12px',
                    background: 'white', color: '#3d4c3d', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                 }}>
                    <Calendar size={18} /> Ver Historial Diario
                 </button>
              </div>
            )}
          </div>

          <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(to bottom, #edf7fc, #eaf4e2)' }}>
            <Scene status={activeCode} />
            <div style={{ position: 'absolute', top: '30px', right: '30px', padding: '10px 20px', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(5px)', borderRadius: '30px', fontWeight: '600', color: '#3d4c3d', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}>
              <Activity size={18} color="#83b05f" /> Visualización Digital
            </div>
          </div>

          {/* --- MODAL DE HISTORIAL --- */}
          {showHistory && (
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                <div style={{
                    width: '80%', maxWidth: '600px', background: 'white', borderRadius: '24px', padding: '30px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '80%', overflowY: 'auto'
                }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                        <h3 style={{margin:0, color:'#3d4c3d', fontSize:'1.5rem'}}>Historial de Promedios</h3>
                        <button onClick={() => setShowHistory(false)} style={{background:'none', border:'none', cursor:'pointer'}}><X/></button>
                    </div>

                    {loadingHistory ? (
                        <p>Cargando datos...</p>
                    ) : (
                        <table style={{width:'100%', borderCollapse:'collapse'}}>
                            <thead>
                                <tr style={{borderBottom:'2px solid #eee', color:'#888', fontSize:'0.9rem'}}>
                                    <th style={{padding:'10px', textAlign:'left'}}>Fecha</th>
                                    <th style={{padding:'10px', textAlign:'center'}}>Temp Prom.</th>
                                    <th style={{padding:'10px', textAlign:'center'}}>Hum Prom.</th>
                                    <th style={{padding:'10px', textAlign:'center'}}>Lluvia Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historial.map((dia, i) => (
                                    <tr key={i} style={{borderBottom:'1px solid #f0f0f0'}}>
                                        <td style={{padding:'15px 10px', fontWeight:'600'}}>{dia.fecha}</td>
                                        <td style={{padding:'15px 10px', textAlign:'center', color:'#aaab56'}}>{dia.temperatura}°C</td>
                                        <td style={{padding:'15px 10px', textAlign:'center', color:'#83b05f'}}>{dia.humedad}%</td>
                                        <td style={{padding:'15px 10px', textAlign:'center', color:'#5a86ad'}}>{dia.precipitacion}mm</td>
                                    </tr>
                                ))}
                                {historial.length === 0 && (
                                    <tr><td colSpan="4" style={{padding:'20px', textAlign:'center', color:'#999'}}>No hay datos guardados aún.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default Dashboard;