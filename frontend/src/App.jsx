import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ChatBot from './components/ChatBot'; // Asumiendo que está en components

function App() {
  const [view, setView] = useState('home');

  return (
    <>
      <Navbar currentView={view} onViewChange={setView} />
      
      <main>
        {view === 'home' ? (
          <Home onStart={() => setView('app')} />
        ) : (
          <Dashboard />
        )}
      </main>

      {/* Chatbot siempre visible */}
      <ChatBot />
    </>
  );
}

export default App;