import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Volume2, VolumeX } from 'lucide-react';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: '¡Hola! Soy experto en papas. Pregúntame sobre la Rancha o cuidados.' }]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true); // Nuevo estado para controlar audio
  const messagesEndRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis); // Referencia al sintetizador

  // Efecto para hacer scroll al fondo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Función para cancelar audio al cerrar o desmontar
  useEffect(() => {
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  // --- FUNCIÓN PARA HABLAR ---
  const speakText = (text) => {
    if (!soundEnabled || !synthRef.current) return;
    
    // Cancelar cualquier audio anterior
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES'; // Español
    utterance.rate = 1.0;     // Velocidad normal
    utterance.pitch = 1.0;    // Tono normal
    
    synthRef.current.speak(utterance);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMsgText = inputMessage;
    const userMsg = { role: 'user', content: userMsgText };
    
    setMessages(prev => [...prev, userMsg]); 
    setInputMessage(''); 
    setIsLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/assistant_text', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ message: userMsgText })
      });
      
      const data = await res.json();
      const botResponse = data.assistant_response || 'No tengo respuesta ahora.';
      
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
      
      // --- El bot habla ---
      speakText(botResponse);

    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión.' }]);
    } finally { 
      setIsLoading(false); 
    }
  };

  // --- NUEVA FUNCIÓN: Convierte asteriscos en Negrita ---
  const renderMessage = (text) => {
    // Si no hay texto, retornar nada
    if (!text) return null;
    
    // Divide el texto buscando bloques entre asteriscos (* o **)
    const parts = text.split(/\*{1,2}/); 

    return parts.map((part, index) => {
      // Los elementos en posiciones impares (1, 3, 5...) son los que estaban entre asteriscos
      if (index % 2 === 1) {
        return <strong key={index} style={{fontWeight: '700'}}>{part}</strong>;
      }
      // El resto es texto normal
      return part;
    });
  };

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} style={{
          position: 'fixed', bottom: '30px', right: '30px', width: '65px', height: '65px',
          borderRadius: '50%', background: '#83b05f', color: 'white', border: 'none',
          boxShadow: '0 10px 30px rgba(131, 176, 95, 0.4)', cursor: 'pointer', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s'
        }}>
          <MessageCircle size={32} />
        </button>
      )}

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '100px', right: '30px', width: '360px', height: '550px',
          background: 'white', borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden', border: '1px solid #f0f0f0'
        }}>
          {/* HEADER */}
          <div style={{ padding: '20px', background: '#83b05f', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>Asistente EcoGuardian</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Experto en Rancha</div>
            </div>
            <div style={{display:'flex', gap:'10px'}}>
                {/* Botón Mute */}
                <button onClick={() => {
                    setSoundEnabled(!soundEnabled);
                    if(soundEnabled) synthRef.current.cancel();
                }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                    {soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}
                </button>
                <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>
          </div>

          {/* MESSAGES */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f9f9f9', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? '#83b05f' : 'white',
                color: msg.role === 'user' ? 'white' : '#3d4c3d',
                padding: '12px 18px', borderRadius: '18px',
                borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '18px',
                maxWidth: '85%', boxShadow: '0 2px 5px rgba(0,0,0,0.03)', fontSize: '0.95rem', lineHeight: '1.4'
              }}>
                {/* AQUÍ ESTÁ EL CAMBIO PARA VISUALIZAR NEGRITA */}
                {renderMessage(msg.content)}
              </div>
            ))}
            {isLoading && <div style={{ alignSelf: 'flex-start', background: 'white', padding: '10px 15px', borderRadius: '15px', color: '#aaa', fontSize: '0.8rem' }}>Escribiendo...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div style={{ padding: '15px', background: 'white', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
            <input 
              type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)} 
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              placeholder="Pregunta algo..." 
              style={{ flex: 1, border: '1px solid #eee', borderRadius: '25px', padding: '12px 20px', outline: 'none', fontSize: '0.95rem', background: '#f8f9fa' }} 
            />
            <button onClick={sendMessage} style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#83b05f', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;