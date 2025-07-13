import React, { useState } from 'react';

function LoginRegisterForm({ mode, onSubmit, onSwitchMode, loading, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('user');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'register') {
      onSubmit(email, password, registerRole);
    } else {
      onSubmit(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ color: '#2563eb', fontWeight: 800, fontSize: '1.4rem', marginBottom: 18 }}>
        {mode === 'register' ? 'Register' : 'Login'}
      </h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #cbd5e1', marginBottom: 12 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #cbd5e1', marginBottom: 12 }}
      />
      {mode === 'register' && (
        <div style={{ marginBottom: 12, textAlign: 'left' }}>
          <label style={{ fontWeight: 600, color: '#2563eb', marginRight: 8 }}>Register as:</label>
          <select value={registerRole} onChange={e => setRegisterRole(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1.5px solid #cbd5e1' }}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      )}
      <button type="submit" disabled={loading} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
        {loading ? (mode === 'register' ? 'Registering...' : 'Logging in...') : (mode === 'register' ? 'Register' : 'Login')}
      </button>
      <button type="button" onClick={onSwitchMode} style={{ background: '#06b6d4', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 8 }}>
        {mode === 'register' ? 'Back to Login' : 'Register'}
      </button>
      {error && <div style={{ color: '#ef4444', marginTop: 12 }}>{error}</div>}
    </form>
  );
}

export default LoginRegisterForm; 