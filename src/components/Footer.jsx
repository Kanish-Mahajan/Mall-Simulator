import React from 'react';

function Footer() {
  return (
    <footer style={{
      width: '100%',
      background: '#f1f5f9',
      color: '#64748b',
      textAlign: 'center',
      padding: '18px 0',
      fontSize: 15,
      borderTop: '1.5px solid #e5e7eb',
      marginTop: 40
    }}>
      &copy; {new Date().getFullYear()} Mall Simulator. All rights reserved.
    </footer>
  );
}

export default Footer; 