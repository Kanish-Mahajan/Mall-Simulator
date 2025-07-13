import React, { useState, useEffect, useRef } from 'react';
import { getStores, getStore } from '../services/firebaseService';

function Navbar({ user, role, onLogin, onRegister, onLogout, onSearch, onSelectRecommendation }) {
  const [searchValue, setSearchValue] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const justSelectedFromDropdown = useRef(false);

  useEffect(() => {
    if (user && searchValue.trim()) {
      getStores().then(stores => {
        const query = searchValue.trim().toLowerCase();
        const filtered = stores.filter(store =>
          (store.name && store.name.toLowerCase().includes(query)) ||
          (store.address && store.address.toLowerCase().includes(query))
        );
        setRecommendations(filtered);
        setShowDropdown(true);
      });
    } else {
      setRecommendations([]);
      setShowDropdown(false);
    }
  }, [searchValue, user]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (justSelectedFromDropdown.current) {
      justSelectedFromDropdown.current = false;
      // Force a full page reload after mall selection
      window.location.reload();
      return;
    }
    if (!user) {
      onLogin();
      return;
    }
    if (searchValue.trim()) {
      try {
        const stores = await getStores();
        const query = searchValue.trim().toLowerCase();
        const results = stores.filter(store =>
          (store.name && store.name.toLowerCase().includes(query)) ||
          (store.address && store.address.toLowerCase().includes(query)) ||
          (store.description && store.description.toLowerCase().includes(query))
        );
        if (results.length > 0) {
          // Load the first result directly (current preview)
          const selectedStore = results[0];
          if (onSelectRecommendation) {
            const completeStore = await getStore(selectedStore._id);
            await onSelectRecommendation(completeStore);
          }
          setSearchValue('');
          setShowDropdown(false);
          // Force a full page reload after mall selection
          window.location.reload();
        } else {
          alert('No malls found. Please check your spelling or try a different search term.');
        }
      } catch (error) {
        alert('Error searching for malls. Please try again.');
      }
    }
  };

  const handleRecommendationClick = async (store) => {
    justSelectedFromDropdown.current = true;
    setSearchValue(''); // Clear search input
    setRecommendations([]); // Clear recommendations
    setShowDropdown(false);
    if (onSelectRecommendation) {
      try {
        const completeStore = await getStore(store._id);
        await onSelectRecommendation(completeStore);
      } catch (error) {
        onSelectRecommendation(store);
      }
    }
  };



  return (
    <header style={{
      width: '100%',
      background: 'linear-gradient(90deg, #2563eb 0%, #06b6d4 100%)',
      color: '#fff',
      padding: '0 0',
      boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <nav style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        padding: '0 32px',
        position: 'relative'
      }}>
        <div style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: 1 }}>
          Mall Simulator
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }} autoComplete="off">
          <input
            type="text"
            placeholder="Search malls..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onFocus={() => user && recommendations.length > 0 && setShowDropdown(true)}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: '1.5px solid #cbd5e1',
              fontSize: '1.1rem',
              outline: 'none',
              minWidth: 320,
              width: 340,
              marginRight: 6
            }}
          />
          <button
            type="submit"
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '1.1rem'
            }}
          >
            Search
          </button>
          {user && showDropdown && recommendations.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 48,
              left: 0,
              width: '100%',
              background: '#fff',
              color: '#22223b',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(37,99,235,0.13)',
              zIndex: 1000,
              maxHeight: 260,
              overflowY: 'auto',
              border: '1.5px solid #cbd5e1',
            }}>
              {recommendations.map(store => (
                <div
                  key={store._id}
                  onClick={() => handleRecommendationClick(store)}
                  style={{
                    padding: '12px 18px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f1f5f9',
                    fontWeight: 500
                  }}
                  onMouseDown={e => e.preventDefault()}
                >
                  <div style={{ fontWeight: 700 }}>{store.name}</div>
                  <div style={{ fontSize: '0.95rem', color: '#64748b' }}>{store.address}</div>
                </div>
              ))}
            </div>
          )}
        </form>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {user ? (
            <>
              <span style={{ fontWeight: 500, fontSize: '1rem', marginRight: 8 }}>
                {user.email} ({role})
              </span>
              <button onClick={onLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Logout</button>
            </>
          ) : (
            <>
              <button onClick={onLogin} style={{ background: '#fff', color: '#2563eb', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer', marginRight: 8 }}>Login</button>
              <button onClick={onRegister} style={{ background: '#06b6d4', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}>Register</button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar; 