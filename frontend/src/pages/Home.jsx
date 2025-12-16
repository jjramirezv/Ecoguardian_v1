import React from 'react';
import Scene from '../components/Scene';
import { ShieldCheck, Sprout, Bell, ArrowRight, Activity, CloudRain, Smartphone } from 'lucide-react';

const Home = ({ onStart }) => {
  const sectionBg = '#ffffff';
  const textColor = '#3d4c3d';
  const textLight = '#788575';

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#f4f7f0' }}>
      
      {/* HERO SECTION (Claro y Luminoso) */}
      <section style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '60px 8%', minHeight: '85vh', gap: '50px',
        background: 'linear-gradient(180deg, #ffffff 0%, #f4f8f1 100%)',
        borderBottomRightRadius: '40px', borderBottomLeftRadius: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.03)'
      }}>
        <div style={{ flex: 1, maxWidth: '600px', textAlign: 'left' }}>
          <div style={{ 
            display: 'inline-block', padding: '6px 16px', borderRadius: '30px',
            background: '#eaf4e2', color: '#6e964e', fontWeight: '700', fontSize: '0.9rem', marginBottom: '20px'
          }}>
            🌱 Tecnología para el campo
          </div>
          <h1 style={{ fontSize: '3.5rem', lineHeight: '1.1', color: textColor, marginBottom: '25px' }}>
            Tu cosecha segura,<br/><span style={{ color: '#83b05f' }}>tu futuro protegido.</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: textLight, marginBottom: '40px', lineHeight: '1.6' }}>
            Inteligencia artificial y satelital para prevenir la <strong>Rancha</strong> antes de que ataque. Ahorra dinero y duerme tranquilo.
          </p>
          <button className="btn-primary" onClick={onStart} style={{ padding: '18px 40px', fontSize: '1.2rem' }}>
            Comenzar Ahora <ArrowRight size={22} />
          </button>
        </div>

        {/* 3D PREVIEW CARD */}
        <div style={{ 
          flex: 1, height: '500px', background: '#eaf4e2', borderRadius: '40px',
          overflow: 'hidden', position: 'relative', boxShadow: '0 20px 50px -20px rgba(131, 176, 95, 0.4)'
        }}>
          <Scene status="optimo" />
        </div>
      </section>

      {/* --- NUEVA SECCIÓN: ¿QUÉ ES ECOGUARDIAN? (VERSIÓN CLARA Y VIBRANTE) --- */}
      <section style={{ padding: '100px 8%', background: sectionBg }}>
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 60px auto' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '15px', color: textColor }}>¿Cómo funciona?</h2>
          <p style={{ fontSize: '1.1rem', color: textLight }}>Un sistema de vigilancia 24/7 en 3 pasos simples.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px' }}>
          
          {/* Paso 1 */}
          <div style={{ textAlign: 'center', padding: '30px', borderRadius: '24px', background: '#f8f9fa' }}>
            <div style={{ width: '80px', height: '80px', background: '#eaf4e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#83b05f' }}>
              <Activity size={36} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px', color: textColor }}>1. Conectamos</h3>
            <p style={{ color: textLight, fontSize: '0.95rem', lineHeight: '1.6' }}>Usamos datos de satélites y tus sensores IoT para vigilar la chacra.</p>
          </div>

          {/* Paso 2 */}
          <div style={{ textAlign: 'center', padding: '30px', borderRadius: '24px', background: '#f8f9fa' }}>
             <div style={{ width: '80px', height: '80px', background: '#f9f6e8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#aaab56' }}>
              <CloudRain size={36} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px', color: textColor }}>2. Analizamos</h3>
            <p style={{ color: textLight, fontSize: '0.95rem', lineHeight: '1.6' }}>La IA predice cuándo la Rancha atacará días antes de que sea visible.</p>
          </div>

          {/* Paso 3 */}
          <div style={{ textAlign: 'center', padding: '30px', borderRadius: '24px', background: '#f8f9fa' }}>
             <div style={{ width: '80px', height: '80px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#d7a56c' }}>
              <Smartphone size={36} />
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px', color: textColor }}>3. Te Alertamos</h3>
            <p style={{ color: textLight, fontSize: '0.95rem', lineHeight: '1.6' }}>Recibes un aviso simple al celular. Solo fumigas cuando es necesario.</p>
          </div>

        </div>
      </section>

      {/* CARACTERÍSTICAS (Beneficios) */}
      <section style={{ padding: '100px 8%', background: '#f4f7f0' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 80px auto' }}>
          <h2 style={{ fontSize: '2.5rem', color: textColor, marginBottom: '15px' }}>Resultados Reales</h2>
          <p style={{ fontSize: '1.1rem', color: textLight }}>Tecnología compleja, uso sencillo.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          {[
            { icon: Sprout, color: '#83b05f', title: 'Ahorro Garantizado', text: 'Reduce hasta un 30% el uso de fungicidas innecesarios.' },
            { icon: ShieldCheck, color: '#aaab56', title: 'Mejor Calidad', text: 'Papa sana, con mejor peso y mejor precio en el mercado.' },
            { icon: Bell, color: '#dea480', title: 'Sin Internet', text: 'No necesitas Wi-Fi en la chacra. El sistema funciona offline.' }
          ].map((item, i) => (
            <div key={i} style={{ 
              padding: '40px', borderRadius: '24px', background: '#ffffff',
              transition: 'transform 0.3s', cursor: 'default', border: '2px solid transparent',
              boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-10px)'; e.currentTarget.style.borderColor = item.color; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <div style={{ 
                width: '60px', height: '60px', borderRadius: '16px', background: `${item.color}20`, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '25px', color: item.color 
              }}>
                <item.icon size={30} />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '15px', color: textColor }}>{item.title}</h3>
              <p style={{ color: textLight, lineHeight: '1.6' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;