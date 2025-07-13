import React, { useEffect } from 'react';

function Toast({ message, open, onClose, duration = 3000 }) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 24,
      right: 24,
      background: '#22c55e',
      color: '#fff',
      padding: '16px 32px',
      borderRadius: 12,
      boxShadow: '0 4px 16px rgba(34,197,94,0.18)',
      fontWeight: 700,
      fontSize: 17,
      zIndex: 3000,
      minWidth: 180,
      textAlign: 'center',
      transition: 'opacity 0.2s',
      opacity: open ? 1 : 0
    }}>
      {message}
    </div>
  );
}

export default Toast; 