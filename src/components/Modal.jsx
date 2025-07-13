import React from 'react';

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(30,41,59,0.32)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.2s'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(37,99,235,0.13)',
        minWidth: 340,
        maxWidth: 400,
        width: '100%',
        padding: 32,
        position: 'relative',
        animation: 'modalIn 0.2s'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'none',
          border: 'none',
          fontSize: 22,
          color: '#64748b',
          cursor: 'pointer',
          fontWeight: 700
        }}>&times;</button>
        {children}
      </div>
    </div>
  );
}

export default Modal; 