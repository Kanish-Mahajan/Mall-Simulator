import { useState, useEffect } from 'react';
import './InventoryModal.css';
import {
  getShelfItems,
  addShelfItem,
  updateShelfItem,
  deleteShelfItem,
  subscribeToShelfItems
} from '../services/firebaseService';

function InventoryModal({ shelf, isOpen, onClose, onUpdate, readOnly }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: 0,
    price: 0,
    category: 'General',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);

  useEffect(() => {
    const shelfId = shelf?._id || shelf?.id;
    if (isOpen && shelfId) {
      setLoading(true);
      const unsubscribeItems = subscribeToShelfItems(shelfId, (items) => {
        setItems(items);
        setFilteredItems(items);
        setLoading(false);
        setSubmitting(false); // re-enable form after Firestore update
      });
      return () => unsubscribeItems();
    } else {
      setItems([]);
      setFilteredItems([]);
    }
  }, [isOpen, shelf]);

  // Filter items based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
    setFilteredItems(filtered);
  }, [searchQuery, items]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const newItem = {
      ...formData,
      isOutOfStock: formData.quantity === 0
    };
    try {
      await addShelfItem(shelf._id || shelf.id, newItem);
      setFormData({
        name: '',
        quantity: 0,
        price: 0,
        category: 'General',
        description: ''
      });
      setShowAddForm(false);
      // Do not manually update items; let Firestore listener update
    } catch (error) {
      setSubmitting(false);
      console.error('Error adding item:', error);
    }
  };

  const handleEditItem = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const updatedItem = {
      ...editingItem,
      ...formData,
      isOutOfStock: formData.quantity === 0
    };
    try {
      await updateShelfItem(shelf._id || shelf.id, editingItem._id, updatedItem);
      setEditingItem(null);
      setFormData({
        name: '',
        quantity: 0,
        price: 0,
        category: 'General',
        description: ''
      });
      // Do not manually update items; let Firestore listener update
    } catch (error) {
      setSubmitting(false);
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    setSubmitting(true);
    try {
      await deleteShelfItem(shelf._id || shelf.id, itemId);
      // Do not manually update items; let Firestore listener update
    } catch (error) {
      setSubmitting(false);
      console.error('Error deleting item:', error);
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      category: item.category,
      description: item.description || ''
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setShowAddForm(false);
    setFormData({
      name: '',
      quantity: 0,
      price: 0,
      category: 'General',
      description: ''
    });
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Inventory - {shelf?.name || 'Shelf'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading">Loading items...</div>
          ) : (
            <>
              {/* Search bar for users */}
              {readOnly && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search items by name, category, or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          fontSize: '18px',
                          cursor: 'pointer',
                          color: '#64748b'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {searchQuery && (
                    <div style={{ marginTop: 8, fontSize: '0.9rem', color: '#64748b' }}>
                      Found {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}

              {!readOnly && (
                <div className="inventory-actions">
                  <button 
                    className="add-item-btn"
                    onClick={() => setShowAddForm(true)}
                    disabled={submitting}
                  >
                    + Add Item
                  </button>
                </div>
              )}
              {/* Add/Edit Form */}
              {!readOnly && (showAddForm || editingItem) && (
                <div className="item-form">
                  <h3>{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
                  <form onSubmit={editingItem ? handleEditItem : handleAddItem}>
                    <div className="form-group">
                      <label>Name:</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div className="form-group">
                      <label>Quantity:</label>
                      <input
                        type="number"
                        value={formData.quantity === 0 ? (formData.quantity === '' ? '' : '0') : formData.quantity}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData({
                            ...formData,
                            quantity: val === '' ? '' : Math.max(0, parseInt(val) || 0)
                          });
                        }}
                        min="0"
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div className="form-group">
                      <label>Price:</label>
                      <input
                        type="number"
                        value={formData.price === 0 ? (formData.price === '' ? '' : '0') : formData.price}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData({
                            ...formData,
                            price: val === '' ? '' : parseFloat(val) || 0
                          });
                        }}
                        min="0"
                        step="0.01"
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div className="form-group">
                      <label>Category:</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        disabled={submitting}
                      >
                        <option value="General">General</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Clothing">Clothing</option>
                        <option value="Food">Food</option>
                        <option value="Books">Books</option>
                        <option value="Home">Home</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Description:</label>
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        disabled={submitting}
                      />
                    </div>
                    <div className="form-actions">
                      <button className="save-btn" type="submit" disabled={submitting}>
                        {editingItem ? 'Update Item' : 'Add Item'}
                      </button>
                      <button className="cancel-btn" type="button" onClick={cancelEdit} disabled={submitting}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {/* Items List */}
              <div className="items-list">
                <h3>Items {readOnly && searchQuery && `(${filteredItems.length} found)`}</h3>
                {filteredItems.length === 0 ? (
                  <div className="no-items">
                    {searchQuery ? `No items found matching "${searchQuery}"` : 'No items found.'}
                  </div>
                ) : (
                  <div className="items-grid">
                    {filteredItems.map(item => (
                      <div className="item-card" key={item._id}>
                        <div className="item-header">
                          <h4>{item.name}</h4>
                          <span className={`stock-status ${item.isOutOfStock ? 'out' : 'in'}`}>
                            {item.isOutOfStock ? 'Out of Stock' : 'In Stock'}
                          </span>
                        </div>
                        <div className="item-details">
                          <p><strong>Quantity:</strong> {item.quantity}</p>
                          <p><strong>Price:</strong> ${item.price}</p>
                          <p><strong>Category:</strong> {item.category}</p>
                          <p><strong>Description:</strong> {item.description}</p>
                        </div>
                        {!readOnly && (
                          <div className="item-actions">
                            <button className="edit-btn" onClick={() => startEdit(item)} disabled={submitting}>Edit</button>
                            <button className="delete-btn" onClick={() => handleDeleteItem(item._id)} disabled={submitting}>Delete</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default InventoryModal; 