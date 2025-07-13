import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToStores, getStore } from '../services/firebaseService';

function SearchPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loadingStore, setLoadingStore] = useState(null);

  // Load all stores for search
  useEffect(() => {
    const unsubscribeStores = subscribeToStores((stores) => {
      setStores(stores);
    });
    return () => unsubscribeStores();
  }, []);

  // Search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const results = stores.filter(store => {
      const searchLower = query.toLowerCase();
      return (
        store.name.toLowerCase().includes(searchLower) ||
        store.address.toLowerCase().includes(searchLower) ||
        store.description.toLowerCase().includes(searchLower)
      );
    });

    setSearchResults(results);
    setShowSearchResults(true);
  };

  const handleStoreSelect = async (store) => {
    setLoadingStore(store._id);
    try {
      // Fetch the complete store data including currentPreviewId
      const completeStore = await getStore(store._id);
      // Navigate to view-only mall with the complete store data
      navigate('/app', { state: { selectedStore: completeStore, readOnly: true } });
    } catch (error) {
      console.error('Error fetching complete store data:', error);
      // Fallback to the original store data if fetch fails
      navigate('/app', { state: { selectedStore: store, readOnly: true } });
    } finally {
      setLoadingStore(null);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #e0e7ef 0%, #f7fafc 100%)', 
      padding: '40px 20px' 
    }}>
      <div style={{ 
        maxWidth: 800, 
        margin: '0 auto', 
        background: '#fff', 
        borderRadius: 18, 
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)', 
        padding: 40 
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ color: '#2563eb', fontWeight: 800, fontSize: '2.4rem', marginBottom: 8 }}>
            🔍 Search Malls
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
            Find and explore mall layouts created by managers
          </p>
        </div>

        <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by mall name, location, or address..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '1.1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
              onFocus={() => setShowSearchResults(true)}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px'
                }}
              >
                ×
              </button>
            )}
          </div>
          
          {/* Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
              zIndex: 1000,
              maxHeight: '400px',
              overflowY: 'auto',
              marginTop: 8
            }}>
              {searchResults.map(store => (
                <div
                  key={store._id}
                  onClick={() => handleStoreSelect(store)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: loadingStore === store._id ? 'wait' : 'pointer',
                    transition: 'background-color 0.2s',
                    opacity: loadingStore === store._id ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (loadingStore !== store._id) {
                      e.target.style.backgroundColor = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <div style={{ 
                    fontWeight: 700, 
                    color: '#1e293b', 
                    marginBottom: 6, 
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>{store.name}</span>
                    {loadingStore === store._id && (
                      <span style={{ fontSize: '0.9rem', color: '#2563eb' }}>
                        Loading preview...
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#64748b', marginBottom: 4 }}>
                    📍 {store.address}
                  </div>
                  {store.description && (
                    <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                      {store.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {showSearchResults && searchQuery && searchResults.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              color: '#64748b',
              marginTop: 8,
              fontSize: '1rem'
            }}>
              No malls found matching "{searchQuery}"
            </div>
          )}
        </div>

        {!searchQuery && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: 40, 
            padding: '40px 20px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '2px dashed #cbd5e1'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏪</div>
            <h3 style={{ color: '#374151', marginBottom: 8 }}>Ready to explore?</h3>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>
              Start typing to search for malls by name, location, or address
            </p>
          </div>
        )}

        <div style={{ 
          textAlign: 'center', 
          marginTop: 40 
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: '#64748b',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default SearchPage; 