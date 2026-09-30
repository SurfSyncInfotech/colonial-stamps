import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App caught an error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, maxWidth: 640, margin: '60px auto', background: '#fff', border: '1px solid #d5e7e4', borderRadius: 16, textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#203431', marginBottom: 12 }}>Something interrupted the cabinet view</h2>
          <p style={{ color: '#627875', marginBottom: 24 }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button style={{ background: '#DDFCAE', color: '#203431', border: '1px solid rgba(32,52,49,0.2)', padding: '10px 24px', borderRadius: 999, fontWeight: 600, cursor: 'pointer' }} onClick={() => window.location.reload()}>
            Reload Cabinet
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
