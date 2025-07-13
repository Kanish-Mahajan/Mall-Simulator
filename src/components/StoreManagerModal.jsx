import { useState, useEffect } from 'react';
import './StoreManagerModal.css';
import {
  getStores,
  createStore,
  updateStore,
  deleteStore,
  getStorePreviews,
  savePreview,
  updatePreview,
  deletePreview,
  setActivePreview,
  subscribeToStores,
  subscribeToStorePreviews,
  getShelfItems,
  addShelfItem,
  deleteShelfItem
} from '../services/firebaseService';
import Modal from './Modal'; // Assuming you have a Modal component

// Utility to safely convert Firestore Timestamps to Date objects
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  
  try {
    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    }
    
    // Handle regular Date objects or date strings
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

// Utility to remove undefined values recursively
function removeUndefined(obj) {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefined(v)])
    );
  }
  return obj;
}

function StoreManagerModal({ isOpen, onClose, currentFloors, onLoadPreview, storeManagerModal, onSaveSuccess }) {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveFormMode, setSaveFormMode] = useState('new'); // 'new' or 'update'
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    createdAt: '',
    useCurrentTime: true
  });
  const [updatingPreviewId, setUpdatingPreviewId] = useState(null);
  const [showSaveTypeModal, setShowSaveTypeModal] = useState(false);
  const [saveType, setSaveType] = useState('update'); // 'update' or 'new'
  const [showImportModal, setShowImportModal] = useState(false);
  const [newStore, setNewStore] = useState(null);
  const [allStores, setAllStores] = useState([]);
  const [selectedImportStore, setSelectedImportStore] = useState(null);
  const [selectedImportPreview, setSelectedImportPreview] = useState(null);
  const [importStorePreviews, setImportStorePreviews] = useState([]);

  // Handle external save form trigger
  useEffect(() => {
    if (storeManagerModal?.showSaveForm) {
      setShowSaveForm(true);
      setSaveFormMode(storeManagerModal.saveFormMode || 'new');
      setFormData({ name: '', description: '', createdAt: '', useCurrentTime: true });
      setUpdatingPreviewId(null);
    }
  }, [storeManagerModal?.showSaveForm, storeManagerModal?.saveFormMode]);

  useEffect(() => {
    if (isOpen) {
      // Set up real-time listener for stores
      const unsubscribeStores = subscribeToStores((stores) => {
        setStores(stores);
        setLoading(false);
        
        // Auto-select first store if none selected
        if (stores.length > 0 && !selectedStore) {
          setSelectedStore(stores[0]);
        }
        
        // Update selectedStore if it exists in the new stores data
        if (selectedStore && stores.length > 0) {
          const updatedStore = stores.find(store => store._id === selectedStore._id);
          if (updatedStore && JSON.stringify(updatedStore) !== JSON.stringify(selectedStore)) {
            setSelectedStore(updatedStore);
          }
        }
        
        // Clear selected store if it no longer exists in the stores list
        if (selectedStore && stores.length > 0 && !stores.find(store => store._id === selectedStore._id)) {
          setSelectedStore(null);
          setPreviews([]);
        }
      });

      return () => {
        unsubscribeStores();
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedStore && selectedStore._id) {
      // Set up real-time listener for previews
      const unsubscribePreviews = subscribeToStorePreviews(selectedStore._id, (previews) => {
        setPreviews(previews);
        setLoading(false);
      });

      return () => {
        unsubscribePreviews();
      };
    } else {
      setPreviews([]);
    }
  }, [selectedStore]);



  const handleSelectStore = (store) => {
    setSelectedStore(store);
  };

  const handleDeleteStore = async (storeId) => {
    if (!window.confirm('Delete this store and all its previews?')) return;
    try {
      await deleteStore(storeId);
      
      // Clear selected store if it was the one that was deleted
      if (selectedStore && selectedStore._id === storeId) {
        setSelectedStore(null);
        setPreviews([]);
      }
      
      // Real-time listener will automatically update the UI
    } catch (e) {
      console.error('Error deleting store:', e);
      alert('Failed to delete store');
    }
  };

  const handleLoadPreview = async (preview) => {
    if (!window.confirm('Loading this preview will overwrite all shelf inventory with the saved snapshot. Continue?')) return;
    // Restore shelf inventory for each shelf in each floor
    for (const floor of preview.floors || []) {
      for (const item of floor.items || []) {
        if (item.type === 'shelf' && Array.isArray(item.inventory)) {
          // Overwrite shelf inventory in Firestore
          const shelfId = item._id || item.id;
          // Delete all current items
          const currentItems = await getShelfItems(shelfId);
          for (const ci of currentItems) {
            await deleteShelfItem(shelfId, ci._id);
          }
          // Add all items from preview
          for (const inv of item.inventory) {
            // Remove _id to let Firestore generate a new one
            const { _id, ...rest } = inv;
            await addShelfItem(shelfId, rest);
          }
        }
      }
    }
    if (onLoadPreview) onLoadPreview(preview);
    onClose();
  };

  const handleActivatePreview = async (previewId) => {
    if (!selectedStore) {
      return;
    }
    
    const isCurrentlyActive = selectedStore.currentPreviewId === previewId;
    
    if (isCurrentlyActive) {
      alert('This preview is already active!');
      return;
    }
    
    const confirmMessage = selectedStore.currentPreviewId 
      ? 'Are you sure you want to activate this preview? This will replace the current active preview and delete the old one.'
      : 'Are you sure you want to activate this preview?';
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      // Find the preview that was just activated
      const activatedPreview = previews.find(p => p._id === previewId);
      if (!activatedPreview) {
        throw new Error('Preview not found');
      }
      
      // First, set it as the active preview to ensure it persists
      await setActivePreview(selectedStore._id, previewId);
      
      // Then load the activated preview into the current layout
      if (onLoadPreview) {
        onLoadPreview(activatedPreview);
      }
      
      // Finally, delete the old preview if it exists and is different
      if (selectedStore.currentPreviewId && selectedStore.currentPreviewId !== previewId) {
        try {
          await deletePreview(selectedStore._id, selectedStore.currentPreviewId);
        } catch (deleteError) {
          console.error('Error deleting old preview:', deleteError);
          // Don't fail the activation if deletion fails
        }
      }
      
      // Real-time listeners will also update the UI
    } catch (e) {
      console.error('Error activating preview:', e);
      alert('Failed to activate preview: ' + e.message);
    }
  };

  const handleDeletePreview = async (previewId) => {
    if (!window.confirm('Delete this preview?')) return;
    try {
      await deletePreview(selectedStore._id, previewId);
      // Real-time listeners will automatically update the UI
    } catch (e) {
      console.error('Error deleting preview:', e);
      alert('Failed to delete preview');
    }
  };

  const openSaveForm = (mode = 'new', preview = null) => {
    setSaveFormMode(mode);
    setFormError('');
    if (mode === 'update' && preview) {
      setFormData({ name: preview.name, description: preview.description, createdAt: formatDate(preview.createdAt), useCurrentTime: false });
      setUpdatingPreviewId(preview._id);
    } else {
      setFormData({ name: '', description: '', createdAt: '', useCurrentTime: true });
      setUpdatingPreviewId(null);
    }
    setShowSaveForm(true);
  };

  const closeSaveForm = () => {
    setShowSaveForm(false);
    setFormError('');
    setFormData({ name: '', description: '', createdAt: '', useCurrentTime: true });
    setUpdatingPreviewId(null);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleSavePreview = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!selectedStore || !selectedStore._id) {
      setFormError('Please select a store first');
      return;
    }
    try {
      // Deep copy floors and fetch shelf items for each shelf (including new shelves)
      const floorsWithInventory = await Promise.all((currentFloors || []).map(async (floor) => {
        const itemsWithInventory = await Promise.all((floor.items || []).map(async (item) => {
          if (item.type.startsWith('shelf')) {
            // Always use item.id (guaranteed to exist for new/existing shelves)
            const shelfItems = await getShelfItems(item.id);
            return { ...item, inventory: shelfItems, id: item.id };
          }
          return { ...item, id: item.id };
        }));
        return { ...floor, items: itemsWithInventory };
      }));
      const previewData = {
        name: formData.name,
        description: formData.description,
        floors: removeUndefined(floorsWithInventory)
      };
      let savedPreview;
      if (saveFormMode === 'update' && updatingPreviewId) {
        savedPreview = await updatePreview(selectedStore._id, updatingPreviewId, previewData);
      } else {
        // Fallback: create new if no active preview
        const customDate = formData.useCurrentTime ? null : formData.createdAt;
        savedPreview = await savePreview(selectedStore._id, previewData, customDate);
      }
      closeSaveForm();
      // Immediately refresh the previews list to show the new preview
      if (savedPreview) {
        const updatedPreviews = await getStorePreviews(selectedStore._id);
        setPreviews(updatedPreviews);
      }
      alert(`Preview "${formData.name}" saved successfully!`);
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (e) {
      console.error('Error saving preview:', e);
      setFormError(`Failed to save preview: ${e.message}`);
    }
  };

  // When user clicks save, show the save type modal if there is an active preview
  const handleSaveClick = () => {
    if (selectedStore && selectedStore.currentPreviewId) {
      setShowSaveTypeModal(true);
    } else {
      // No active preview, just open save as new
      openSaveForm('new');
    }
  };

  // When user selects save type and confirms
  const handleSaveTypeConfirm = () => {
    setShowSaveTypeModal(false);
    if (saveType === 'update') {
      // Find the current preview and pre-fill
      const currentPreview = previews.find(p => p._id === selectedStore.currentPreviewId);
      openSaveForm('update', currentPreview);
    } else {
      openSaveForm('new');
    }
  };

  // When a new store is created, show the import modal
  const handleNewStoreCreated = async (store) => {
    setNewStore(store);
    setSelectedStore(store);
    setShowImportModal(true);
    
    // Fetch all stores for import options
    try {
      const stores = await getStores();
      setAllStores(stores.filter(s => s._id !== store._id)); // Exclude the new store
    } catch (error) {
      console.error('Error fetching stores for import:', error);
    }
  };

  // Fetch previews when import store is selected
  const handleImportStoreChange = async (storeId) => {
    const store = allStores.find(s => s._id === storeId);
    setSelectedImportStore(store);
    setSelectedImportPreview(null);
    
    if (store) {
      try {
        const previews = await getStorePreviews(store._id);
        setImportStorePreviews(previews);
      } catch (error) {
        console.error('Error fetching store previews:', error);
        setImportStorePreviews([]);
      }
    } else {
      setImportStorePreviews([]);
    }
  };

  // Handle import selection
  const handleImportConfirm = async () => {
    if (selectedImportStore && selectedImportPreview) {
      // Import the selected preview to the new store
      try {
        const previewData = {
          name: `${selectedImportPreview.name} (Imported)`,
          description: `Imported from ${selectedImportStore.name}`,
          floors: selectedImportPreview.floors
        };
        
        // Ensure storeId is properly set
        if (!newStore._id) {
          throw new Error('Store ID is undefined. Cannot save preview.');
        }
        
        const savedPreview = await savePreview(newStore._id, previewData);
        
        // Set as active preview using the new preview's ID
        await setActivePreview(newStore._id, savedPreview._id);
        
        // Close modal first
        setShowImportModal(false);
        setNewStore(null);
        setSelectedImportStore(null);
        setSelectedImportPreview(null);
        setImportStorePreviews([]);
        
        // Load the imported layout after modal is closed
        setTimeout(() => {
          if (onLoadPreview) {
            onLoadPreview(savedPreview);
          }
        }, 100);
        
        alert('Layout imported successfully!');
      } catch (error) {
        console.error('Error importing layout:', error);
        alert('Failed to import layout: ' + error.message);
      }
    } else {
      // Create a new empty preview
      try {
        const emptyPreviewData = {
          name: 'Empty Layout',
          description: 'Starting with empty layout',
          floors: [{ id: 1, items: [] }]
        };
        
        // Ensure storeId is properly set
        if (!newStore._id) {
          throw new Error('Store ID is undefined. Cannot save preview.');
        }
        
        const savedPreview = await savePreview(newStore._id, emptyPreviewData);
        
        // Close modal first
        setShowImportModal(false);
        setNewStore(null);
        setSelectedImportStore(null);
        setSelectedImportPreview(null);
        setImportStorePreviews([]);
        
        // Load the empty layout after modal is closed
        setTimeout(() => {
          if (onLoadPreview) {
            onLoadPreview(savedPreview);
          }
        }, 100);
        
        alert('Empty layout created successfully!');
      } catch (error) {
        console.error('Error creating empty layout:', error);
        alert('Failed to create empty layout: ' + error.message);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="store-manager-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Store Manager</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
        ) : (
          <>
            <div className="stores-list">
              <h3>Stores</h3>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <button
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginBottom: '12px',
                  }}
                  onClick={async () => {
                    const name = prompt('Enter new store name:');
                    if (!name) return;
                    const description = prompt('Enter store description:') || '';
                    const address = prompt('Enter store address:') || '';
                    try {
                      const newStore = await createStore({ name, description, address });
                      handleNewStoreCreated(newStore);
                    } catch (error) {
                      alert('Failed to create store: ' + error.message);
                    }
                  }}
                >
                  + Add New Store
                </button>
              </div>
              {stores.length === 0 ? (
                <div className="no-stores">
                  No stores found.
                </div>
              ) : (
                <div className="stores-grid">
                  {stores.map(store => (
                    <div className={`store-card${selectedStore?._id === store._id ? ' selected' : ''}`} key={store._id}>
                      <div className="store-header">
                        <h4>{store.name}</h4>
                        <span className="store-date">{formatDate(store.createdAt)}</span>
                        {selectedStore?._id === store._id && (
                          <span className="selected-indicator" style={{ background: '#10b981', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                            ✓ SELECTED
                          </span>
                        )}
                      </div>
                      <div className="store-details">
                        <p><strong>Description:</strong> {store.description}</p>
                        <p><strong>Address:</strong> {store.address}</p>
                      </div>
                      <div className="store-actions">
                        <button className="select-btn" onClick={() => handleSelectStore(store)} disabled={selectedStore?._id === store._id}>
                          {selectedStore?._id === store._id ? 'Selected' : 'Select'}
                        </button>
                        <button className="delete-btn" onClick={() => handleDeleteStore(store._id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedStore && (
              <div className="previews-list">
                <h3>Previews for {selectedStore.name}</h3>
                {previews.length === 0 ? (
                  <div className="no-previews">No previews found.</div>
                ) : (
                  <div className="previews-grid">
                    {previews.map(preview => (
                      <div className={`preview-card${selectedStore.currentPreviewId === preview._id ? ' active' : ''}`} key={preview._id}>
                        <div className="preview-header">
                          <h4>{preview.name}</h4>
                          <span className={`preview-status${selectedStore.currentPreviewId === preview._id ? ' active' : ' inactive'}`}>
                            {selectedStore.currentPreviewId === preview._id ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="preview-details">
                          <p><strong>Description:</strong> {preview.description}</p>
                          <p><strong>Version:</strong> {preview.version}</p>
                          <p><strong>Created:</strong> {formatDate(preview.createdAt)}</p>
                        </div>
                        <div className="preview-actions">
                          <button className="load-btn" onClick={() => handleLoadPreview(preview)}>Load</button>
                          <button className="activate-btn" onClick={() => handleActivatePreview(preview._id)} disabled={selectedStore.currentPreviewId === preview._id}>Activate</button>
                          <button className="delete-btn" onClick={() => handleDeletePreview(preview._id)} disabled={selectedStore.currentPreviewId === preview._id}>Delete</button>
                          <button className="update-btn" onClick={() => openSaveForm('update', preview)}>Update This Preview</button>
                          {selectedStore.currentPreviewId === preview._id && (
                            <button className="update-current-btn" style={{ background: '#2563eb', color: '#fff', marginLeft: 8 }} onClick={() => openSaveForm('update', preview)}>
                              Update Current Preview
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button
                    className="save-preview-btn"
                    onClick={() => {
                      // Always open save form in update mode for the active preview
                      const currentPreview = previews.find(p => p._id === selectedStore.currentPreviewId);
                      if (currentPreview) {
                        openSaveForm('update', currentPreview);
                      } else {
                        // If no active preview, fallback to new
                        openSaveForm('new');
                      }
                    }}
                  >
                    Save Current Layout
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {(showSaveForm) && (
          <div className="save-form-modal">
            <form className="save-form" onSubmit={handleSavePreview}>
              <h3>{saveFormMode === 'new' ? 'Save as New Preview' : 'Update Preview'}</h3>
              {formError && <div className="form-error">{formError}</div>}
              
              {!selectedStore ? (
                <div className="form-error" style={{ background: '#fef3c7', color: '#92400e', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
                  ⚠️ Please select a store first before saving a preview.
                </div>
              ) : (
                <div className="selected-store-info" style={{ background: '#dbeafe', color: '#1e40af', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
                  <strong>Selected Store:</strong> {selectedStore.name}
                  <br />
                  <small>{selectedStore.description}</small>
                </div>
              )}
              
              <div className="form-group">
                <label>Name</label>
                <input name="name" value={formData.name} onChange={handleFormChange} placeholder="Preview name" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleFormChange} placeholder="Description (optional)" />
              </div>
              
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    name="useCurrentTime" 
                    checked={formData.useCurrentTime} 
                    onChange={handleFormChange}
                  />
                  Use current date and time
                </label>
              </div>
              
              {!formData.useCurrentTime && (
                <div className="form-group">
                  <label>Created Date & Time</label>
                  <input 
                    type="datetime-local" 
                    name="createdAt" 
                    value={formData.createdAt} 
                    onChange={handleFormChange}
                    placeholder="Select date and time"
                  />
                </div>
              )}
              
              <div className="form-actions">
                <button className="save-btn" type="submit" disabled={!selectedStore}>{saveFormMode === 'new' ? 'Save Preview' : 'Update Preview'}</button>
                <button className="cancel-btn" type="button" onClick={closeSaveForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        {/* Save Type Modal */}
        {showSaveTypeModal && (
          <Modal open={showSaveTypeModal} onClose={() => setShowSaveTypeModal(false)}>
            <div style={{ padding: 24, textAlign: 'center' }}>
              <h3>How would you like to save?</h3>
              <div style={{ margin: '16px 0' }}>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <input
                    type="radio"
                    name="saveType"
                    value="update"
                    checked={saveType === 'update'}
                    onChange={() => setSaveType('update')}
                  />
                  {' '}Replace current preview (update active preview)
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <input
                    type="radio"
                    name="saveType"
                    value="new"
                    checked={saveType === 'new'}
                    onChange={() => setSaveType('new')}
                  />
                  {' '}Save as new preview
                </label>
              </div>
              <button
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginRight: 8,
                }}
                onClick={handleSaveTypeConfirm}
              >
                Continue
              </button>
              <button
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                onClick={() => setShowSaveTypeModal(false)}
              >
                Cancel
              </button>
            </div>
          </Modal>
        )}
        {/* Import Layout Modal */}
        {showImportModal && (
          <Modal open={showImportModal} onClose={() => setShowImportModal(false)}>
            <div style={{ padding: 24, maxWidth: 600 }}>
              <h3>Choose Layout for {newStore?.name}</h3>
              <p style={{ marginBottom: 16, color: '#666' }}>
                Would you like to import a layout from another store or start with an empty layout?
              </p>
              
              <div style={{ marginBottom: 20 }}>
                <h4>Import from Store:</h4>
                <select
                  value={selectedImportStore?._id || ''}
                  onChange={(e) => handleImportStoreChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginBottom: 8,
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                >
                  <option value="">Select a store...</option>
                  {allStores.map(store => (
                    <option key={store._id} value={store._id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                
                {selectedImportStore && (
                  <div>
                    <h5>Select Preview:</h5>
                    <select
                      value={selectedImportPreview?._id || ''}
                      onChange={(e) => {
                        const preview = importStorePreviews.find(p => p._id === e.target.value);
                        setSelectedImportPreview(preview);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        marginBottom: 8,
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                    >
                      <option value="">Select a preview...</option>
                      {importStorePreviews.map(preview => (
                        <option key={preview._id} value={preview._id}>
                          {preview.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                  onClick={handleImportConfirm}
                >
                  {selectedImportPreview ? 'Import Layout' : 'Start Empty'}
                </button>
                <button
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowImportModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

export default StoreManagerModal; 