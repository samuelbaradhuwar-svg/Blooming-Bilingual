import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import App from './App';
import { configMissing } from './lib/supabase';
import './styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

if (configMissing) {
  root.render(
    <div style={{ maxWidth: 520, margin: '12vh auto', padding: 24, fontFamily: 'sans-serif', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: '1.4rem' }}>This site is not set up yet</h1>
      <p>The site settings <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are missing from this build.
        The site owner needs to add them in the hosting settings and redeploy.</p>
    </div>
  );
} else root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
