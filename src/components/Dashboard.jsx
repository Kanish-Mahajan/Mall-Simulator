import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    title: 'Design Your Mall',
    desc: 'Drag and drop shelves, entries, exits, and more to create your perfect layout.'
  },
  {
    title: 'Real-time Inventory',
    desc: 'Manage and view inventory instantly with real-time updates.'
  },
  {
    title: 'Role-based Access',
    desc: 'Admins can edit layouts and inventory. Users can view and navigate only.'
  },
  {
    title: 'Cloud Sync',
    desc: 'All your data is securely stored and synced in the cloud.'
  }
];

const Dashboard = ({ user, role, storeLocation }) => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', background: 'linear-gradient(135deg, #e0e7ef 0%, #f7fafc 100%)', padding: 0 }}>
      <div style={{ maxWidth: 800, margin: '48px auto', background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: 40, textAlign: 'center' }}>
        <h1 style={{ color: '#2563eb', fontWeight: 800, fontSize: '2.4rem', marginBottom: 8 }}>Mall Simulator</h1>
        <div style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: 18 }}>
          The ultimate tool for mall layout and inventory management
        </div>
        {storeLocation && (
          <div style={{ color: '#0e7490', fontWeight: 600, marginBottom: 12, fontSize: '1.08rem' }}>
            <span style={{ marginRight: 6 }}>📍</span>{storeLocation}
          </div>
        )}
        <blockquote style={{ fontStyle: 'italic', color: '#64748b', margin: '24px 0', fontSize: '1.1rem' }}>
          "The best way to predict the future is to create it."<br />
          <span style={{ fontSize: 14, color: '#94a3b8' }}>– Peter Drucker</span>
        </blockquote>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center', margin: '32px 0' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#f1f5f9', borderRadius: 12, padding: 18, minWidth: 180, maxWidth: 220, boxShadow: '0 2px 8px rgba(37,99,235,0.06)' }}>
              <div style={{ color: '#2563eb', fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>{f.title}</div>
              <div style={{ color: '#334155', fontSize: '0.98rem' }}>{f.desc}</div>
            </div>
          ))}
        </div>
        {user && (
          <>
            <div style={{ margin: '18px 0', color: '#22223b', fontSize: '1.1rem' }}>
              <strong>Logged in as:</strong> {user.email}<br />
              <strong>Role:</strong> {role}
            </div>
            
            {role === 'admin' || role === 'manager' ? (
              <button
                onClick={() => navigate('/app')}
                style={{
                  background: role === 'admin' ? '#2563eb' : '#06b6d4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 32px',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  margin: '12px 0 0 0',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.08)'
                }}
              >
                {role === 'admin' ? 'Customize Mall' : 'Manage Mall'}
              </button>
            ) : (
              // Info for users about search functionality
              <div style={{ marginTop: 24 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: '2px solid #0ea5e9',
                  borderRadius: 12,
                  padding: '20px',
                  color: '#0c4a6e'
                }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>
                    🔍 Search Malls
                  </div>
                  <div style={{ fontSize: '0.95rem', marginBottom: 12 }}>
                    Use the search bar in the navigation to find and explore mall layouts created by managers
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    💡 Simply type a mall name, location, or address and click "Search"
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 