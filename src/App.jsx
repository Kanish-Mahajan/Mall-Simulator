import { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createPortal } from 'react-dom';
import './App.css';
import { Resizable } from 're-resizable';
import InventoryModal from './components/InventoryModal';
import StoreManagerModal from './components/StoreManagerModal';
import Dashboard from './components/Dashboard';
import { auth, onAuthStateChanged } from './firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase/config';
import {
  createStore,
  getStores,
  getStore,
  updateStore,
  deleteStore,
  savePreview,
  getStorePreviews,
  getPreview,
  updatePreview,
  deletePreview,
  setActivePreview,
  getShelfItems,
  addShelfItem,
  updateShelfItem,
  deleteShelfItem,
  saveFloorLayout,
  subscribeToStores,
  subscribeToStore
} from './services/firebaseService';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Modal from './components/Modal';
import LoginRegisterForm from './components/LoginRegisterForm';
import Toast from './components/Toast';
import SearchPage from './components/SearchPage';

const ITEM_TYPES = {
  LAYOUT_ITEM: 'layoutItem',
};

const itemStyles = {
  shelf: {
    width: 120,
    height: 40,
    background: '#f7c873',
    border: '3px solid #bfa14a',
    borderRadius: '8px',
  },
  shelfSmall: {
    width: 100,
    height: 40,
    background: '#f7c873',
    border: '3px solid #bfa14a',
    borderRadius: '8px',
  },
  shelfMedium: {
    width: 140,
    height: 50,
    background: '#f7c873',
    border: '3px solid #bfa14a',
    borderRadius: '8px',
  },
  shelfLarge: {
    width: 180,
    height: 60,
    background: '#f7c873',
    border: '3px solid #bfa14a',
    borderRadius: '8px',
  },
  shelfVeryLarge: {
    width: 220,
    height: 70,
    background: '#f7c873',
    border: '3px solid #bfa14a',
    borderRadius: '8px',
  },
  layout: {
    width: 100,
    height: 36,
    background: '#b3e0ff',
    border: '2px dashed #3b82f6',
    borderRadius: '8px',
  },
  location: {
    width: 80,
    height: 36,
    background: '#c7f7c8',
    border: '2px solid #3bbf6a',
    borderRadius: '8px',
  },

  entry: {
    width: 40,
    height: 40,
    background: '#73f7a1',
    border: '2px solid #1b9c4a',
    borderRadius: '8px',
  },
  exit: {
    width: 40,
    height: 40,
    background: '#f77373',
    border: '2px solid #b91c1c',
    borderRadius: '8px',
  },
};

const DEFAULTS = {
  shelf: { width: 120, height: 40 },
  shelfSmall: { width: 100, height: 40 },
  shelfMedium: { width: 140, height: 50 },
  shelfLarge: { width: 180, height: 60 },
  shelfVeryLarge: { width: 220, height: 70 },
  layout: { width: 100, height: 36 },
  location: { width: 80, height: 36 },

  entry: { width: 40, height: 40 },
  exit: { width: 40, height: 40 },
};

// Enhanced styling functions for user mode
const getEnhancedBackground = (type) => {
  const backgrounds = {
    shelf: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    shelfSmall: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    shelfMedium: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    shelfLarge: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    shelfVeryLarge: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    layout: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)',
    location: 'linear-gradient(135deg, #86efac 0%, #22c55e 100%)',

    entry: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
    exit: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
  };
  return backgrounds[type] || backgrounds.shelf;
};

const getEnhancedBorder = (type) => {
  const borders = {
    shelf: '2px solid #d97706',
    shelfSmall: '2px solid #d97706',
    shelfMedium: '2px solid #d97706',
    shelfLarge: '2px solid #d97706',
    shelfVeryLarge: '2px solid #d97706',
    layout: '2px solid #1d4ed8',
    location: '2px solid #15803d',

    entry: '2px solid #15803d',
    exit: '2px solid #b91c1c',
  };
  return borders[type] || borders.shelf;
};

const DEFAULT_SHELF_WIDTH = 120;
const DEFAULT_SHELF_HEIGHT = 40;

const OBSTACLE_PADDING = 12; // or whatever padding you prefer

// Grid-based A* pathfinding for navigation
const GRID_SIZE = 20;

function buildGrid(width, height, obstacles = []) {
  const cols = Math.ceil(width / GRID_SIZE);
  const rows = Math.ceil(height / GRID_SIZE);
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (const obs of obstacles) {
    const pad = OBSTACLE_PADDING;
    // Handle rotated shelves: swap width and height if rotated
    let obsX = obs.x, obsY = obs.y, obsW = obs.width, obsH = obs.height;
    if (obs.rotated) {
      // Center stays the same, swap width/height
      const cx = obs.x + obs.width / 2;
      const cy = obs.y + obs.height / 2;
      obsW = obs.height;
      obsH = obs.width;
      obsX = cx - obsW / 2;
      obsY = cy - obsH / 2;
    }
    const x0 = Math.floor((obsX - pad) / GRID_SIZE);
    const y0 = Math.floor((obsY - pad) / GRID_SIZE);
    const x1 = Math.ceil((obsX + obsW + pad) / GRID_SIZE);
    const y1 = Math.ceil((obsY + obsH + pad) / GRID_SIZE);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (y >= 0 && y < rows && x >= 0 && x < cols) {
          grid[y][x] = 1; // blocked
        }
      }
    }
  }
  return { grid, cols, rows };
}

function gridAStar(grid, start, end) {
  const [rows, cols] = [grid.length, grid[0].length];
  const open = [];
  const closed = Array.from({ length: rows }, () => Array(cols).fill(false));
  const cameFrom = Array.from({ length: rows }, () => Array(cols).fill(null));
  const gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const fScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
  open.push(start);
  gScore[start.y][start.x] = 0;
  fScore[start.y][start.x] = heuristic(start, end);
  const neighborOffsets = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
  ]; // 8 directions
  while (open.length > 0) {
    open.sort((a, b) => fScore[a.y][a.x] - fScore[b.y][b.x]);
    const current = open.shift();
    if (current.x === end.x && current.y === end.y) {
      // Reconstruct path
      const path = [current];
      let node = current;
      while (cameFrom[node.y][node.x]) {
        node = cameFrom[node.y][node.x];
        path.unshift(node);
      }
      return path;
    }
    closed[current.y][current.x] = true;
    for (const offset of neighborOffsets) {
      const n = { x: current.x + offset.x, y: current.y + offset.y };
      if (
        n.x < 0 || n.x >= cols || n.y < 0 || n.y >= rows ||
        grid[n.y][n.x] === 1 || closed[n.y][n.x]
      ) continue;
      // Prevent diagonal cutting corners through obstacles
      if (Math.abs(offset.x) === 1 && Math.abs(offset.y) === 1) {
        if (grid[current.y][n.x] === 1 || grid[n.y][current.x] === 1) continue;
      }
      const tentativeG = gScore[current.y][current.x] + (Math.abs(offset.x) === 1 && Math.abs(offset.y) === 1 ? 1.4 : 1);
      if (tentativeG < gScore[n.y][n.x]) {
        cameFrom[n.y][n.x] = current;
        gScore[n.y][n.x] = tentativeG;
        fScore[n.y][n.x] = tentativeG + heuristic(n, end);
        if (!open.some(o => o.x === n.x && o.y === n.y)) {
          open.push(n);
        }
      }
    }
  }
  return null; // no path
}

// Convert pixel position to grid cell
function toGridCell(pos) {
  return {
    x: Math.floor(pos.x / GRID_SIZE),
    y: Math.floor(pos.y / GRID_SIZE)
  };
}
// Convert grid cell to pixel position (center of cell)
function toPixel(cell) {
  return {
    x: cell.x * GRID_SIZE + GRID_SIZE / 2,
    y: cell.y * GRID_SIZE + GRID_SIZE / 2
  };
}

// Grid-based pathfinding wrapper
const calculateShortestPath = (start, end, obstacles = [], targetRect = null) => {
  // Get preview area size (assume 800x600 fallback)
  const preview = document.querySelector('.floor-layout');
  const width = preview ? preview.offsetWidth : 800;
  const height = preview ? preview.offsetHeight : 600;
  // If targetRect, find the closest border point to start
  let target = { x: end.x, y: end.y };
  if (targetRect) {
    target = lineRectBorderIntersection(start, end, targetRect);
  }
  const { grid, cols, rows } = buildGrid(width, height, obstacles);
  const startCell = toGridCell(start);
  let endCell = toGridCell(target);
  // If endCell is blocked, find nearest walkable cell around it
  if (grid[endCell.y][endCell.x] === 1) {
    let found = false;
    for (let r = 1; r < 6 && !found; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          const nx = endCell.x + dx, ny = endCell.y + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx] === 0) {
            endCell = { x: nx, y: ny };
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    if (!found) return [start];
  }
  const pathCells = gridAStar(grid, startCell, endCell);
  if (!pathCells) return [start];
  return pathCells.map(toPixel);
};

function Sidebar({ onAddItem, onAddFloor, floors, currentFloor, setCurrentFloor, onOpenStoreManager, onSaveCurrentLayout, onClearLayout, onResetToSaved, hasUnsavedChanges, currentStore }) {
  const [showShelfOptions, setShowShelfOptions] = useState(false);

  const handleAddShelf = (size) => {
    onAddItem(`shelf${size.charAt(0).toUpperCase() + size.slice(1)}`);
    // Remove this line so menu stays open after selecting a shelf size
    // setShowShelfOptions(false);
  };

  // Remove the useEffect that closes menu on outside click
  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (showShelfOptions && !event.target.closest('.shelf-dropdown-container')) {
  //       setShowShelfOptions(false);
  //     }
  //   };

  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => document.removeEventListener('mousedown', handleClickOutside);
  // }, [showShelfOptions]);

  return (
    <div className="sidebar">
      {currentStore && (
        <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#2563eb' }}>
            🏬 {currentStore.name}
          </h2>
          <p style={{ margin: '0', fontSize: '0.9rem', color: '#6b7280' }}>
            📍 {currentStore.address}
          </p>
        </div>
      )}
      <h2>Mall Manager</h2>
      <button onClick={onAddFloor}>Add Floor</button>
      <div className="floor-list">
        {floors.map((floor, idx) => (
          <button
            key={floor.id || idx} // Ensure unique key
            className={currentFloor === idx ? 'active' : ''}
            onClick={() => setCurrentFloor(idx)}
          >
            Floor {idx + 1}
          </button>
        ))}
      </div>
      <hr />
      <h3>Add Items</h3>
      <div style={{ marginBottom: '8px' }}>
        <button 
          onClick={() => setShowShelfOptions(!showShelfOptions)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: showShelfOptions ? '#2563eb' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
            boxShadow: showShelfOptions ? '0 4px 12px rgba(37,99,235,0.3)' : '0 2px 8px rgba(37,99,235,0.15)'
          }}
          onMouseEnter={(e) => {
            if (!showShelfOptions) {
              e.target.style.background = '#2563eb';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!showShelfOptions) {
              e.target.style.background = '#3b82f6';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          <span>Add Shelf</span>
          <span style={{ 
            transform: showShelfOptions ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            fontSize: '12px'
          }}>
            ▼
          </span>
        </button>
        {showShelfOptions && (
          <div style={{
            background: '#f8fafc',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            marginTop: '8px',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1000 // Higher than sections
          }}>
            <div style={{ padding: '8px 0' }}>
              {[
                { size: 'small', label: 'Small Shelf', icon: '📦', dimensions: '100×40' },
                { size: 'medium', label: 'Medium Shelf', icon: '📦', dimensions: '140×50' },
                { size: 'large', label: 'Large Shelf', icon: '📦', dimensions: '180×60' },
                { size: 'veryLarge', label: 'Very Large Shelf', icon: '📦', dimensions: '220×70' }
              ].map((option, index) => (
                <button 
                  key={option.size}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    handleAddShelf(option.size);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    transition: 'all 0.2s ease',
                    borderBottom: index < 3 ? '1px solid #f3f4f6' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e0e7ef';
                    e.target.style.color = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                    e.target.style.color = '#374151';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{option.icon}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>{option.label}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      {option.dimensions} pixels
                    </div>
                  </div>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#9ca3af',
                    fontWeight: '600'
                  }}>
                    +
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button onClick={() => onAddItem('entry')}>Add Entry</button>
      <button onClick={() => onAddItem('exit')}>Add Exit</button>

      <hr />
      <h3>Layout Management</h3>
      {hasUnsavedChanges && (
        <div style={{ 
          background: '#fef3c7', 
          color: '#92400e', 
          padding: '8px 12px', 
          borderRadius: '6px', 
          marginBottom: '12px',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚠️ Unsaved Changes
        </div>
      )}
      <button 
        className="save-layout-btn"
        onClick={onSaveCurrentLayout}
        style={{
          background: hasUnsavedChanges ? '#ef4444' : '#10b981',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontWeight: '600',
          cursor: 'pointer',
          width: '100%',
          marginBottom: '12px'
        }}
      >
        {hasUnsavedChanges ? '💾 Save Changes' : '💾 Save Current Layout'}
      </button>
      <button 
        className="reset-to-saved-btn"
        onClick={onResetToSaved}
        style={{
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontWeight: '600',
          cursor: 'pointer',
          width: '100%',
          marginBottom: '8px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#2563eb';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#3b82f6';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        🔄 Reset to Saved
      </button>
      <button 
        className="clear-layout-btn"
        onClick={onClearLayout}
        style={{
          background: '#ef4444',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontWeight: '600',
          cursor: 'pointer',
          width: '100%',
          marginBottom: '12px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#dc2626';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#ef4444';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        🗑️ Clear Layout
      </button>
      <hr />
      <h3>Store Management</h3>
      <button 
        className="store-manager-btn"
        onClick={onOpenStoreManager}
      >
        🏪 Store Manager
      </button>
    </div>
  );
}

function DraggableItem({ item, index, moveItem, onResize, onRotate, shelfNumber, onRename, onShelfClick, onRemove, readOnly, highlighted, openMenuIndex, menuPos, onContextMenu, closeMenu, inventoryModalOpen, onUserContextMenu }) {
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPES.LAYOUT_ITEM,
    item: { index, ...item },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !readOnly,
  });

  const style = itemStyles[item.type] || itemStyles.shelf;
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  // Remove local menuOpen/menuPos, use props instead
  // const [menuOpen, setMenuOpen] = useState(false);
  // const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  // Focus input when editing
  useEffect(() => {
  if (editing && inputRef.current) {
    inputRef.current.focus();
  }
  }, [editing]);

  // Helper: get default label for type
  const getDefaultLabel = () => {
    if (item.type.startsWith('shelf')) {
      const size = item.type.replace('shelf', '');
      if (size === 'Small') return `Small Shelf ${shelfNumber}`;
      if (size === 'Medium') return `Medium Shelf ${shelfNumber}`;
      if (size === 'Large') return `Large Shelf ${shelfNumber}`;
      if (size === 'VeryLarge') return `Very Large Shelf ${shelfNumber}`;
      return `Shelf ${shelfNumber}`;
    }
    if (item.type === 'section') {
      return item.name || 'Section';
    }
    return item.type.charAt(0).toUpperCase() + item.type.slice(1);
  };

  // Use defaults for all types
  const def = DEFAULTS[item.type] || DEFAULTS.shelf;
  const width = typeof item.width === 'number' && !isNaN(item.width) ? item.width : def.width;
  const height = typeof item.height === 'number' && !isNaN(item.height) ? item.height : def.height;
  const left = typeof item.x === 'number' && !isNaN(item.x) ? item.x : 0;
  const top = typeof item.y === 'number' && !isNaN(item.y) ? item.y : 0;

  // For shelf highlight/scroll
  const itemRef = useRef(null);
  useEffect(() => {
    if (highlighted && itemRef.current && typeof itemRef.current.scrollIntoView === 'function') {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [highlighted]);

  // Custom context menu for managers/admins
  // const handleContextMenu = (e) => {
  //   if (!readOnly && item.type === 'shelf') {
  //     e.preventDefault();
  //     setMenuPos({ x: e.clientX, y: e.clientY });
  //     setMenuOpen(true);
  //   }
  // };

  // Close menu on click elsewhere
  // useEffect(() => {
  //   if (!menuOpen) return;
  //   const close = () => setMenuOpen(false);
  //   window.addEventListener('click', close);
  //   return () => window.removeEventListener('click', close);
  // }, [menuOpen]);

  // Add global click listener to close menu when clicking outside
  useEffect(() => {
    if (openMenuIndex !== index) return;
    const close = (e) => {
      // Only close if click is outside the menu
      if (!e.target.closest('.custom-shelf-menu')) closeMenu();
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [openMenuIndex, index, closeMenu]);

  // Menu actions
  const handleMenuAction = (action) => {
    closeMenu(); // Always close menu first
    
    if (action === 'delete') { 
      onRemove(index); 
    }
    if (action === 'rotateLeft') { 
      onRotate(index); 
    }
    if (action === 'rotateRight') { 
      // Rotate right = 3 rotations left (270° counterclockwise = 90° clockwise)
      onRotate(index); 
      onRotate(index); 
      onRotate(index); 
    }
    if (action === 'viewItems') { 
      onShelfClick(item, index); 
    }
    if (action === 'rename') { 
      if (item.type === 'section') {
        const newName = prompt('Enter section name:', item.name || 'Section');
        if (newName !== null && newName.trim() !== '') {
          onRename(index, newName.trim());
        }
      } else {
        setEditing(true); 
      }
    }

  };

  return (
    <div
      ref={itemRef}
      style={{ position: 'absolute', left, top, zIndex: isDragging ? 1000 : 1 }}
      onMouseEnter={() => !inventoryModalOpen && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={e => {
        e.preventDefault();
        if (!inventoryModalOpen) {
          if (readOnly && onUserContextMenu) {
            onUserContextMenu(e, index, itemRef, item.rotated, width, height);
          } else if (!readOnly && onContextMenu) {
            onContextMenu(e, index, itemRef, item.rotated, width, height);
          }
        }
      }}
      onDoubleClick={readOnly && item.type.startsWith('shelf') && !inventoryModalOpen ? () => setEditing(true) : undefined}
      onClick={e => {
        if (openMenuIndex === index) return;
        if (item.type.startsWith('shelf') && !inventoryModalOpen) onShelfClick(item, index);
      }}
    >
    <Resizable
      size={{ width, height }}
      onResizeStop={readOnly ? undefined : (e, direction, ref, d) => {
        onResize(index, width + d.width, height + d.height);
      }}
      minWidth={30}
      minHeight={24}
      maxWidth={400}
        maxHeight={300}
      style={{
          position: 'relative',
          zIndex: 1,
        transform: item.rotated ? 'rotate(90deg)' : 'none',
        transition: 'box-shadow 0.2s, opacity 0.2s',
          boxShadow: (!inventoryModalOpen && highlighted) ? '0 0 0 4px #2563eb' : undefined,
      }}
      enable={readOnly ? {} : {
        top: false, right: true, bottom: true, left: false, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true
      }}
    >
      <div
        ref={drag}
        className={`layout-item ${item.type}`}
        style={{
          width: '100%',
          height: '100%',
            background: (!inventoryModalOpen && highlighted) 
              ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' 
              : readOnly 
                ? getEnhancedBackground(item.type)
                : (itemStyles[item.type] || itemStyles.shelf).background,
            border: readOnly 
              ? getEnhancedBorder(item.type)
              : (itemStyles[item.type] || itemStyles.shelf).border,
            borderRadius: readOnly ? '12px' : (itemStyles[item.type] || itemStyles.shelf).borderRadius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
            fontWeight: readOnly ? '600' : 'bold',
            fontSize: readOnly ? '14px' : 16,
            color: readOnly ? '#1e293b' : '#22223b',
            boxShadow: readOnly 
              ? '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)' 
              : '0 2px 6px #0002',
          position: 'relative',
          flexDirection: 'column',
            cursor: item.type.startsWith('shelf') && !inventoryModalOpen ? 'pointer' : undefined,
            userSelect: 'none',
            transition: readOnly ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'background 0.2s',
            transform: readOnly ? 'scale(1)' : 'none',
            backdropFilter: readOnly ? 'blur(10px)' : 'none',
            borderWidth: readOnly ? '2px' : undefined,
            ...(readOnly && {
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1)'
              }
            }),

          }}
          onMouseEnter={() => {
            if (readOnly && !inventoryModalOpen) {
              setHovered(true);
            }
          }}
        onMouseLeave={() => setHovered(false)}
      >
          {item.type === 'entry' && <span style={{fontSize: readOnly ? '20px' : 22, marginRight: 4}}>🚪</span>}
          {item.type === 'exit' && <span style={{fontSize: readOnly ? '20px' : 22, marginRight: 4}}>🚪</span>}
          {editing ? (
          <input
            ref={inputRef}
            value={item.name ?? ''}
            onChange={e => onRename(index, e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={e => { if (e.key === 'Enter') setEditing(false); }}
              style={{ 
                fontSize: readOnly ? '14px' : 16, 
                fontWeight: readOnly ? '600' : 'bold', 
                textAlign: 'center', 
                width: '90%', 
                borderRadius: readOnly ? '8px' : 4, 
                border: readOnly ? '2px solid #3b82f6' : '1px solid #aaa', 
                padding: readOnly ? '4px 8px' : '2px 4px',
                background: readOnly ? '#f8fafc' : '#fff',
                color: readOnly ? '#1e293b' : '#22223b'
              }}
          />
        ) : (
            <span
              style={{ 
                cursor: !readOnly ? 'pointer' : 'default', 
                userSelect: 'none',
                textAlign: 'center',
                lineHeight: '1.2',
                padding: readOnly ? '4px 8px' : '0',
                borderRadius: readOnly ? '6px' : '0',
                background: readOnly && hovered ? 'rgba(255,255,255,0.2)' : 'transparent',
                transition: readOnly ? 'all 0.2s ease' : 'none',

              }}
            >
            {item.name === undefined || item.name === '' ? getDefaultLabel() : item.name}
          </span>
        )}
        </div>
      </Resizable>
      
      {/* Context Menu using Portal */}
      <ContextMenu
        isOpen={!readOnly && openMenuIndex === index && !inventoryModalOpen}
        position={menuPos}
        item={item}
        onAction={(action) => handleMenuAction(action)}
        onClose={closeMenu}
      />
    </div>
  );
}

const menuItemStyle = {
  padding: '10px 18px',
              cursor: 'pointer', 
  fontWeight: 500,
  fontSize: '1rem',
  color: '#22223b',
  borderBottom: '1px solid #f1f5f9',
  background: 'none',
  transition: 'background 0.2s',
};

// Context Menu Component using Portal
function ContextMenu({ isOpen, position, item, onAction, onClose }) {
  if (!isOpen) return null;

  const menuContent = (
    <div
      className="custom-shelf-menu"
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        background: '#fff',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        zIndex: 999999,
        minWidth: 160,
        padding: '6px 0',
        transform: 'none !important',
      }}
      onClick={e => e.stopPropagation()}
    >
      {item.type.startsWith('shelf') && (
        <>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('delete')}>Delete Shelf</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('rotateLeft')}>Rotate Left</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('rotateRight')}>Rotate Right</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('viewItems')}>View Items</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('rename')}>Rename Shelf</div>
        </>
      )}
      {item.type === 'entry' && (
        <>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('delete')}>Delete Entry</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('rotateLeft')}>Rotate Left</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('rotateRight')}>Rotate Right</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('rename')}>Rename Entry</div>
        </>
      )}
      {item.type === 'exit' && (
        <>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('delete')}>Delete Exit</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('rotateLeft')}>Rotate Left</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('rotateRight')}>Rotate Right</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('rename')}>Rename Exit</div>
        </>
      )}

      {(item.type === 'location') && (
        <>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('delete')}>Delete {item.type.charAt(0).toUpperCase() + item.type.slice(1)}</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('rotateLeft')}>Rotate Left</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('rotateRight')}>Rotate Right</div>
          <div className="menu-item" style={menuItemStyle} onClick={() => onAction('rename')}>Rename {item.type.charAt(0).toUpperCase() + item.type.slice(1)}</div>
        </>
      )}
      </div>
  );

  return createPortal(menuContent, document.body);
}

// Add hover effect for menu items and sections (injected style)
if (typeof window !== 'undefined' && !document.getElementById('custom-shelf-menu-style')) {
  const style = document.createElement('style');
  style.id = 'custom-shelf-menu-style';
  style.innerHTML = `
    .custom-shelf-menu .menu-item:hover { 
      background: #e0e7ef !important; 
    }
    .custom-shelf-menu {
      transform: none !important;
      z-index: 99999 !important;
    }
    
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes dash {
      to {
        stroke-dashoffset: -15;
      }
    }

  `;
  document.head.appendChild(style);
}

function PreviewArea({ items, moveItem, onDropItem, onResize, onRotate, onRename, onShelfClick, onRemove, readOnly, highlightedShelfIndex, openMenuIndex, menuPos, onContextMenu, closeMenu, inventoryModalOpen, onUserContextMenu, userPosition, navigationPath, showNavigation, isNavigating, onUserPositionChange }) {
  const [, drop] = useDrop({
    accept: ITEM_TYPES.LAYOUT_ITEM,
    drop: (dragged, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (!delta) return;
      const x = Math.round(dragged.x + delta.x);
      const y = Math.round(dragged.y + delta.y);
      onDropItem(dragged.index, x, y);
    },
  });

  // Count shelf numbers for display
  let shelfCount = 0;



  return (
    <div 
      className="PreviewArea" 
      ref={drop} 
      style={{
        flex: 1,
        padding: readOnly ? '0 20px 20px 20px' : '20px',
        background: readOnly ? 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' : '#fff',
        borderRadius: readOnly ? '20px' : '0',
        margin: readOnly ? '0 20px 20px 20px' : '0',
        boxShadow: readOnly ? '0 8px 32px rgba(0,0,0,0.08)' : 'none',
        border: readOnly ? '1px solid rgba(148, 163, 184, 0.2)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background pattern for user mode */}
      {readOnly && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.03) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(147, 51, 234, 0.03) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
      )}
      

      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{
          margin: readOnly ? '0 0 24px 0' : '0 0 20px 0',
          fontSize: readOnly ? '1.8rem' : '1.5rem',
          fontWeight: readOnly ? '800' : '700',
          color: readOnly ? '#1e293b' : '#22223b',
          textAlign: readOnly ? 'center' : 'left',
          letterSpacing: readOnly ? '-0.5px' : 'normal',
          display: 'flex',
          alignItems: 'center',
          justifyContent: readOnly ? 'center' : 'flex-start',
          gap: '12px'
        }}>
          {readOnly ? '🏢 Mall Layout' : 'Floor Preview'}
          {readOnly && (
            <span style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#64748b',
              background: 'rgba(100, 116, 139, 0.1)',
              padding: '4px 12px',
              borderRadius: '20px',
              border: '1px solid rgba(100, 116, 139, 0.2)'
            }}>
              {items.length} items
            </span>
          )}

        </h2>
        
        <div className="floor-layout" style={{
          position: 'relative',
          minHeight: readOnly ? '600px' : '500px',
          background: readOnly ? 'rgba(255, 255, 255, 0.7)' : '#f8f9fa',
          borderRadius: readOnly ? '16px' : '8px',
          border: readOnly ? '2px dashed rgba(148, 163, 184, 0.3)' : '1px solid #e9ecef',
          padding: readOnly ? '20px' : '10px',
          backdropFilter: readOnly ? 'blur(10px)' : 'none',
          boxShadow: readOnly ? 'inset 0 2px 8px rgba(0,0,0,0.05)' : 'none'
        }}>
          {/* User position indicator (only in user mode) */}
          {readOnly && userPosition && (
            <div 
              style={{
                position: 'absolute',
                left: userPosition.x - 10,
                top: userPosition.y - 10,
                width: 20,
                height: 20,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                border: '2px solid #fff',
                borderRadius: '50%',
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                animation: 'pulse 2s infinite',
                cursor: 'grab',
                userSelect: 'none'
              }}
              onMouseDown={(e) => {
                if (!onUserPositionChange) return;
                e.preventDefault();
                e.stopPropagation();
                const startX = e.clientX;
                const startY = e.clientY;
                const startPosX = userPosition.x;
                const startPosY = userPosition.y;
                // Get preview area bounds
                const previewArea = e.target.closest('.floor-layout');
                const previewRect = previewArea ? previewArea.getBoundingClientRect() : { left: 0, top: 0, width: 800, height: 600 };
                const iconSize = 20;
                const minX = 0;
                const minY = 0;
                const maxX = previewRect.width - iconSize;
                const maxY = previewRect.height - iconSize;
                const handleMouseMove = (moveEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  const deltaY = moveEvent.clientY - startY;
                  let newX = startPosX + deltaX;
                  let newY = startPosY + deltaY;
                  newX = Math.max(minX, Math.min(maxX, newX));
                  newY = Math.max(minY, Math.min(maxY, newY));
                  onUserPositionChange({ x: newX, y: newY });
                };
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
              title="Drag to move your position"
            />
          )}
          
          {/* Navigation path visualization */}
          {readOnly && showNavigation && navigationPath.length > 1 && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 999
              }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#3b82f6"
                  />
                </marker>
              </defs>
              {navigationPath.length > 1 && (
                <path
                  d={navigationPath.map((point, index) => {
                    if (index === 0) return `M ${point.x} ${point.y}`;
                    return `L ${point.x} ${point.y}`;
                  }).join(' ')}
                  stroke="#3b82f6"
                  strokeWidth="3"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  strokeDasharray="10,5"
                  style={{
                    animation: 'dash 2s linear infinite'
                  }}
                />
              )}
            </svg>
          )}
          {items.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: '#64748b',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>
                🏪
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: '600' }}>
                {readOnly ? 'No Items on This Floor' : 'Empty Floor'}
              </h3>
              <p style={{ margin: '0', fontSize: '0.95rem', opacity: 0.8 }}>
                {readOnly ? 'This floor appears to be empty or under construction.' : 'Add items to get started with your layout.'}
              </p>
            </div>
          ) : (
            items.map((item, idx) => {
          let shelfNumber = null;
              if (item.type.startsWith('shelf')) shelfNumber = ++shelfCount;
          return (
            <DraggableItem
              key={idx}
              item={item}
              index={idx}
              moveItem={moveItem}
              onResize={onResize}
              onRotate={onRotate}
              shelfNumber={shelfNumber}
              onRename={onRename}
              onShelfClick={onShelfClick}
              onRemove={onRemove}
              readOnly={readOnly}
                  highlighted={inventoryModalOpen ? null : highlightedShelfIndex === idx}
                  openMenuIndex={openMenuIndex}
                  menuPos={menuPos}
                  onContextMenu={onContextMenu}
                  closeMenu={closeMenu}
                  inventoryModalOpen={inventoryModalOpen}
                  onUserContextMenu={onUserContextMenu}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function App({ user, role }) {
  // Determine if user is in read-only mode (moved to top to avoid ReferenceError)
  const readOnly = role !== 'admin' && role !== 'manager';
  
  const [floors, setFloors] = useState([
    { id: 1, items: [] },
  ]);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [inventoryModal, setInventoryModal] = useState({
    isOpen: false,
    shelf: null,
    shelfIndex: null
  });
  const [storeManagerModal, setStoreManagerModal] = useState({
    isOpen: false
  });
  const [currentStore, setCurrentStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [highlightedShelfIndex, setHighlightedShelfIndex] = useState(null);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);

  const [hasUnsavedChangesState, setHasUnsavedChangesState] = useState(false);
  const hasUnsavedChanges = useRef(false); // Set this to true when layout changes
  const [userSelectedStore, setUserSelectedStore] = useState(null); // For user mode
  const [selectedFloorIndex, setSelectedFloorIndex] = useState(0); // NEW: for user preview
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  
  // Navigation state for user role
  const [userPosition, setUserPosition] = useState({ x: 300, y: 200 }); // Default position in middle
  const [navigationPath, setNavigationPath] = useState([]);
  const [showNavigation, setShowNavigation] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Section creation state



  // Check if user selected a store from search
  useEffect(() => {
    const location = window.location;
    
    console.log('Store selection useEffect triggered:', {
      locationState: location.state,
      readOnly,
      role
    });
    
    if (location.state && location.state.selectedStore) {
      // Always fetch the latest store from Firestore by ID
      const selectedStore = location.state.selectedStore;
      getStore(selectedStore._id).then(store => {
        setUserSelectedStore(store);
        localStorage.setItem('selectedStoreId', store._id);
      }).catch(error => {
        localStorage.removeItem('selectedStoreId');
      });
      window.history.replaceState({}, document.title);
    } else {
      const storedStoreId = localStorage.getItem('selectedStoreId');
      if (storedStoreId && readOnly) {
        getStore(storedStoreId).then(store => {
          setUserSelectedStore(store);
        }).catch(error => {
          localStorage.removeItem('selectedStoreId');
        });
      } else if (readOnly) {
        setUserSelectedStore(null);
        setCurrentStore(null);
      }
    }
  }, [role, readOnly]);

  // Store the original saved state for comparison
  const [savedFloors, setSavedFloors] = useState(null);

  // Mark unsaved changes on layout change (only for managers/admins)
  useEffect(() => {
    if (role === 'admin' || role === 'manager' && savedFloors) {
      // Compare current floors with saved floors
      const hasChanges = JSON.stringify(floors) !== JSON.stringify(savedFloors);
      hasUnsavedChanges.current = hasChanges;
      setHasUnsavedChangesState(hasChanges);
    }
  }, [floors, savedFloors, role]);

  // Prompt on refresh/reload (only for managers/admins)
  useEffect(() => {
    if (role !== 'admin' && role !== 'manager') return;

    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges.current) {
        // Show browser's default confirmation dialog
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    // Handle navigation attempts (back/forward buttons)
    const handlePopState = (e) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault();
        setShowRefreshPrompt(true);
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Push initial state to enable popstate detection
    window.history.pushState(null, '', window.location.href);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [role]);

  // Handle refresh modal actions (only for managers/admins)
  const handleRefreshAction = async (action) => {
    setShowRefreshPrompt(false);
    if (action === 'save') {
      // Save current layout as a new preview
      hasUnsavedChanges.current = false;
      setHasUnsavedChangesState(false);
      // Open store manager to save
      setStoreManagerModal({ 
        isOpen: true, 
        showSaveForm: true,
        saveFormMode: 'new'
      });
    } else if (action === 'discard') {
      hasUnsavedChanges.current = false;
      setHasUnsavedChangesState(false);
      // Don't force reload, just let the user continue
    } else {
      // Keep changes in memory, do nothing
    }
  };

  const handleAddFloor = () => {
    setFloors([...floors, { id: Date.now(), items: [] }]);
    setCurrentFloor(floors.length);
  };

  const handleAddItem = (type) => {
    setFloors(floors => floors.map((floor, idx) =>
      idx === currentFloor
        ? {
            ...floor,
            items: [
              ...floor.items,
              {
                type,
                x: 40 + floor.items.length * 40,
                y: 80 + floor.items.length * 40,
                width: DEFAULTS[type]?.width,
                height: DEFAULTS[type]?.height,
                rotated: false,
                name: undefined,
                id: crypto.randomUUID(), // Ensure unique id for every item
                items: type === 'shelf' ? [] : []
              },
            ],
          }
        : floor
    ));
  };

  const handleDropItem = (idx, x, y) => {
    setFloors(floors => floors.map((floor, fIdx) =>
      fIdx === currentFloor
        ? {
            ...floor,
            items: floor.items.map((item, i) =>
              i === idx ? { ...item, x, y } : item
            ),
          }
        : floor
    ));
  };

  const handleResize = (idx, width, height) => {
    setFloors(floors => floors.map((floor, fIdx) =>
      fIdx === currentFloor
        ? {
            ...floor,
            items: floor.items.map((item, i) =>
              i === idx ? { ...item, width, height } : item
            ),
          }
        : floor
    ));
  };

  const handleRotate = (idx) => {
    setFloors(floors => floors.map((floor, fIdx) =>
      fIdx === currentFloor
        ? {
            ...floor,
            items: floor.items.map((item, i) =>
              i === idx ? { ...item, rotated: !item.rotated } : item
            ),
          }
        : floor
    ));
  };

  const handleRename = (idx, name) => {
    setFloors(floors => floors.map((floor, fIdx) =>
      fIdx === currentFloor
        ? {
            ...floor,
            items: floor.items.map((item, i) =>
              i === idx ? { ...item, name } : item
            ),
          }
        : floor
    ));
  };

  const handleShelfClick = (shelf, index) => {
    setInventoryModal({
      isOpen: true,
      shelf: shelf,
      shelfIndex: index
    });
    setHighlightedShelfIndex(index);
  };

  const handleInventoryUpdate = (updatedShelf) => {
    setFloors(floors => floors.map((floor, fIdx) =>
      fIdx === currentFloor
        ? {
            ...floor,
            items: floor.items.map((item, i) =>
              i === inventoryModal.shelfIndex ? updatedShelf : item
            ),
          }
        : floor
    ));
  };

  const closeInventoryModal = () => {
    setInventoryModal({
      isOpen: false,
      shelf: null,
      shelfIndex: null
    });
    setHighlightedShelfIndex(null);
  };

  const openStoreManager = () => {
    setStoreManagerModal({ isOpen: true });
  };

  const handleSaveCurrentLayout = () => {
    // Open the store manager modal and trigger the save form
    setStoreManagerModal({ 
      isOpen: true, 
      showSaveForm: true,
      saveFormMode: 'new'
    });
  };

  const closeStoreManager = () => {
    setStoreManagerModal({ 
      isOpen: false,
      showSaveForm: false,
      saveFormMode: 'new'
    });
  };

  const handleLoadPreview = (preview) => {
    const newFloors = preview.floors || [{ id: 1, items: [] }];
    setFloors(newFloors);
    setSavedFloors(newFloors); // Set the saved state
    hasUnsavedChanges.current = false;
    setHasUnsavedChangesState(false);
  };

  const handleRemoveItem = (idx) => {
    setFloors(floors => floors.map((floor, fIdx) =>
      fIdx === currentFloor
        ? {
            ...floor,
            items: floor.items.filter((_, i) => i !== idx)
        }
      : floor
    ));
  };

  const handleClearLayout = () => {
    if (window.confirm('Are you sure you want to clear the current layout? This will remove all items from the current floor and cannot be undone.')) {
      setFloors(floors => floors.map((floor, fIdx) =>
        fIdx === currentFloor
          ? {
              ...floor,
              items: []
          }
        : floor
      ));
    }
  };

  const handleResetToSaved = async () => {
    if (!currentStore) return;
    
    if (window.confirm('Are you sure you want to reset to the last saved state? This will discard all unsaved changes.')) {
      try {
        // Load the current active preview
        if (currentStore.currentPreviewId) {
          const preview = await getPreview(currentStore.currentPreviewId);
          if (preview && preview.floors) {
            setFloors(preview.floors);
            hasUnsavedChanges.current = false;
            setHasUnsavedChangesState(false);
            return;
          }
        }
        
        // If no active preview, load the most recent preview
        const previews = await getStorePreviews(currentStore._id);
        if (previews.length > 0) {
          const mostRecentPreview = previews[0];
          if (mostRecentPreview.floors) {
            setFloors(mostRecentPreview.floors);
            hasUnsavedChanges.current = false;
            setHasUnsavedChangesState(false);
            return;
          }
        }
        
        // If no previews exist, clear the layout
        setFloors(floors => floors.map((floor, fIdx) =>
          fIdx === currentFloor
            ? {
                ...floor,
                items: []
            }
          : floor
        ));
        hasUnsavedChanges.current = false;
        setHasUnsavedChangesState(false);
      } catch (error) {
        console.error('Error resetting to saved state:', error);
        alert('Failed to reset to saved state. Please try again.');
      }
    }
  };

  // Update handleContextMenu to better handle rotated shelf positioning
  const handleContextMenu = (e, idx, itemRef, rotated, width, height) => {
    e.preventDefault();
    if (itemRef && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      let x, y;
      
      if (rotated) {
        // For rotated shelves, position menu to the right of the rotated bounding box
        // The rotated shelf has width and height swapped
        x = rect.left + rect.height + 2; // 2px gap, align with shelf border
        y = rect.top;
      } else {
        // For normal shelves, position menu to the right
        x = rect.right + 2; // 2px gap, align with shelf border
        y = rect.top;
      }
      
      // Ensure menu doesn't go off-screen
      const menuWidth = 160;
      const menuHeight = 200; // approximate height
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      if (x + menuWidth > screenWidth) {
        // Position to the left instead
        if (rotated) {
          x = rect.left - menuWidth - 2;
        } else {
          x = rect.left - menuWidth - 2;
        }
      }
      
      if (y + menuHeight > screenHeight) {
        y = screenHeight - menuHeight - 10; // position above bottom
      }
      
      setMenuPos({ x, y });
    } else {
      setMenuPos({ x: e.clientX, y: e.clientY });
    }
    setOpenMenuIndex(idx);
  };
  const closeMenu = () => setOpenMenuIndex(null);

  // Navigation functions for user role
  // Use the grid-based A* pathfinding for user navigation
  const calculateUserNavigationPath = (start, end, obstacles = [], targetRect = null) => {
    const preview = document.querySelector('.floor-layout');
    const width = preview ? preview.offsetWidth : 800;
    const height = preview ? preview.offsetHeight : 600;
    let target = { x: end.x, y: end.y };
    if (targetRect) {
      target = lineRectBorderIntersection(start, end, targetRect);
    }
    const { grid, cols, rows } = buildGrid(width, height, obstacles);
    let startCell = toGridCell(start);
    let endCell = toGridCell(target);
    startCell = findNearestWalkableCell(grid, startCell);
    endCell = findNearestWalkableCell(grid, endCell);
    const pathCells = gridAStar(grid, startCell, endCell);
    if (!pathCells) return [start];
    return pathCells.map(toPixel);
  };

  const handleUserNavigation = (targetItem, targetIndex) => {
    if (role !== 'user') return;
    // Use the correct floor index for user mode
    const currentFloor = floors[selectedFloorIndex] || floors[0];
    const currentItems = currentFloor?.items || [];
    let targetPosition;
    let targetRect = null;
    if (targetItem.type === 'entry' || targetItem.type === 'exit' || targetItem.type.startsWith('shelf')) {
      targetPosition = { x: targetItem.x + targetItem.width / 2, y: targetItem.y + targetItem.height / 2 };
      targetRect = {
        x: targetItem.x,
        y: targetItem.y,
        width: targetItem.width,
        height: targetItem.height
      };
    } else {
      return;
    }
    // Get obstacles (all items except the target)
    const obstacles = currentItems.filter((item, idx) => idx !== targetIndex);
    // Calculate path using grid-based A*
    const path = calculateUserNavigationPath(userPosition, targetPosition, obstacles, targetRect);
    console.log('Navigation path:', path);
    setNavigationPath(path);
    setShowNavigation(true);
    setIsNavigating(true);
  };

  const handleUserContextMenu = (e, idx, itemRef, rotated, width, height) => {
    if (role !== 'user') {
      handleContextMenu(e, idx, itemRef, rotated, width, height);
      return;
    }
    
    e.preventDefault();
    const item = floors[selectedFloorIndex]?.items[idx];
    if (!item) return;
    
    // For user role, show navigation options
    if (item.type.startsWith('shelf')) {
      handleUserNavigation(item, idx);
    } else if (item.type === 'entry' || item.type === 'exit') {
      handleUserNavigation(item, idx);
    }
  };

  const clearStoredStore = () => {
    localStorage.removeItem('selectedStoreId');
    setUserSelectedStore(null);
    setCurrentStore(null);
  };

  // Load store data from Firebase with real-time sync
  useEffect(() => {
    let ignore = false;
    let unsubscribeStore = null;
    
    async function loadStoreAndPreview() {
        setLoading(true);
      try {
        let store = null;
        
        // Determine if user is in read-only mode
        const readOnly = role !== 'admin' && role !== 'manager';
        
        if (userSelectedStore) {
          // User has explicitly selected a store (from search or stored preference)
          store = userSelectedStore;
        } else if (!readOnly) {
          // For managers/admins, load the first store if no specific store is selected
          const stores = await getStores();
        if (stores.length > 0) {
            store = stores[0];
          }
        }
        
          setCurrentStore(store);
          
        if (store) {
          // Set up real-time listener for the store to get updates when currentPreviewId changes
          unsubscribeStore = subscribeToStore(store._id, (updatedStore) => {
            if (!ignore && updatedStore) {
              setCurrentStore(updatedStore);
              
              // If currentPreviewId changed, load the new preview
              if (updatedStore.currentPreviewId && updatedStore.currentPreviewId !== store.currentPreviewId) {
                loadPreviewForStore(updatedStore);
              }
            }
          });
          
          // Load initial preview
          await loadPreviewForStore(store);
        } else {
          if (!ignore) setFloors([{ id: 1, items: [] }]);
        }
      } catch (error) {
        console.error('Error loading store/preview:', error);
        if (!ignore) setFloors([{ id: 1, items: [] }]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    
    async function loadPreviewForStore(store) {
      try {
        // Try to load preview
          if (store.currentPreviewId) {
            try {
              const preview = await getPreview(store.currentPreviewId);
            if (!ignore && preview && preview.floors) {
                setFloors(preview.floors);
              return;
              }
            } catch (error) {
            console.error('Error loading preview:', error);
          }
        }
        
        // Fallback: load most recent preview
        await loadMostRecentPreview(store);
      } catch (error) {
        console.error('Error loading preview for store:', error);
        if (!ignore) setFloors([{ id: 1, items: [] }]);
      }
    }
    
    async function loadMostRecentPreview(store) {
      try {
        const previews = await getStorePreviews(store._id);
        if (previews.length > 0) {
          const mostRecentPreview = previews[0];
          if (mostRecentPreview.floors) {
            setFloors(mostRecentPreview.floors);
            // Update the store's currentPreviewId to the most recent preview
            await updateStore(store._id, { currentPreviewId: mostRecentPreview._id });
            setCurrentStore({ ...store, currentPreviewId: mostRecentPreview._id });
          } else {
            setFloors([{ id: 1, items: [] }]);
          }
        } else {
          setFloors([{ id: 1, items: [] }]);
        }
      } catch (error) {
        console.error('Error loading most recent preview:', error);
        setFloors([{ id: 1, items: [] }]);
      }
    }

    loadStoreAndPreview();
    return () => {
      ignore = true; 
      if (unsubscribeStore) {
        unsubscribeStore();
      }
    };
  }, [userSelectedStore, role]);

  // Note: We no longer auto-save floors to the store
  // Users must explicitly save layouts using the "Save Current Layout" button

  // Helper: get default label for type (moved to App for drag layer)
  const getDefaultLabel = (item) => {
    if (item.type.startsWith('shelf')) {
      // Find shelf number for this item
      let shelfCount = 0;
      for (let i = 0; i <= item.index; i++) {
        if (floors[currentFloor].items[i].type.startsWith('shelf')) shelfCount++;
        if (i === item.index) return `Shelf ${shelfCount}`;
      }
    }
    if (item.type === 'section') {
      return item.name || 'Section';
    }
    return item.type.charAt(0).toUpperCase() + item.type.slice(1);
  };





  // Handle user position change (for dragging)
  const handleUserPositionChange = (newPosition) => {
    setUserPosition(newPosition);
    // Clear any existing navigation when user moves
    setShowNavigation(false);
    setIsNavigating(false);
  };

  // Reset user position when store changes
  useEffect(() => {
    if (currentStore && readOnly) {
      setUserPosition({ x: 300, y: 200 });
      setShowNavigation(false);
      setIsNavigating(false);
    }
  }, [currentStore?._id, readOnly]);

  // Handle section creation


  if (loading) {
    return (
      <div className="app-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '1.2rem',
          color: '#22223b'
        }}>
          Loading mall data from database...
        </div>
      </div>
    );
  }



  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-container">
        {/* Merged Mall info and Floor navigation for users */}
        {readOnly && currentStore && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '12px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
            margin: '0 0 16px 0',
            borderRadius: '0 0 12px 12px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background pattern */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              pointerEvents: 'none'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Mall Info Section */}
              <div style={{ marginBottom: floors.length > 1 ? '12px' : '0' }}>
                <h1 style={{
                  margin: '0 0 4px 0', 
                  fontSize: '1.6rem', 
                  fontWeight: 800,
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  letterSpacing: '-0.5px'
                }}>
                  🏬 {currentStore.name}
                </h1>
                <div style={{
                  fontSize: '1rem', 
                  opacity: 0.95,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  📍 {currentStore.address}
                </div>
              </div>
              
              {/* Floor Navigation Section - Only show if multiple floors */}
              {floors.length > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  margin: '0 auto',
                  maxWidth: 'fit-content'
                }}>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: '#fff', 
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}>
                    🏢 Floor
                  </span>
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'center'
                  }}>
                    {floors.map((floor, idx) => (
                      <button
                        key={floor.id || idx}
                        onClick={() => setSelectedFloorIndex(idx)}
                        style={{
                          padding: '6px 12px',
                          background: selectedFloorIndex === idx 
                            ? 'rgba(255, 255, 255, 0.9)' 
                            : 'rgba(255, 255, 255, 0.2)',
                          color: selectedFloorIndex === idx ? '#1e293b' : '#fff',
                          border: selectedFloorIndex === idx 
                            ? 'none' 
                            : '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '6px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          fontSize: '0.85rem',
                          minWidth: '40px',
                          boxShadow: selectedFloorIndex === idx 
                            ? '0 2px 8px rgba(0,0,0,0.2)' 
                            : '0 1px 4px rgba(0,0,0,0.1)',
                          transform: selectedFloorIndex === idx ? 'translateY(-1px)' : 'translateY(0)',
                          textShadow: selectedFloorIndex === idx ? 'none' : '0 1px 2px rgba(0,0,0,0.2)'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedFloorIndex !== idx) {
                            e.target.style.background = 'rgba(255, 255, 255, 0.4)';
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedFloorIndex !== idx) {
                            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)';
                          }
                        }}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Enhanced message when user has no store selected */}
        {readOnly && !currentStore && !loading && (
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            color: '#fff',
            padding: '40px 32px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(245,158,11,0.3)',
            margin: '40px 20px',
            borderRadius: '20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background pattern */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              pointerEvents: 'none'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ 
                fontSize: '4rem', 
                marginBottom: '16px',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }}>
                🔍
              </div>
              <h2 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '2.2rem', 
                fontWeight: 800,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                letterSpacing: '-0.5px'
              }}>
                No Mall Selected
              </h2>
              <p style={{ 
                margin: '0', 
                fontSize: '1.2rem',
                opacity: 0.95,
                fontWeight: 500,
                lineHeight: '1.6'
              }}>
                Use the search bar above to find and select a mall to view its layout.
              </p>
              <div style={{
                marginTop: '24px',
                padding: '16px 24px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>
                  💡 Tip:
                </div>
                <div style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                  Search for malls by name or location to get started exploring their layouts!
                </div>
              </div>
            </div>
          </div>
        )}

        {!readOnly && (
          <Sidebar
            onAddItem={handleAddItem}
            onAddFloor={handleAddFloor}
            floors={floors}
            currentFloor={currentFloor}
            setCurrentFloor={setCurrentFloor}
            onOpenStoreManager={openStoreManager}
            onSaveCurrentLayout={handleSaveCurrentLayout}
            onClearLayout={handleClearLayout}
            onResetToSaved={handleResetToSaved}
            hasUnsavedChanges={hasUnsavedChangesState}
            currentStore={currentStore}
          />
        )}
        <PreviewArea
          key={`preview-${currentStore?._id || 'no-store'}-${selectedFloorIndex}`}
          items={readOnly ? (floors[selectedFloorIndex]?.items || []) : (floors[currentFloor]?.items || [])}
          onDropItem={readOnly ? undefined : handleDropItem}
          onResize={readOnly ? undefined : handleResize}
          onRotate={readOnly ? undefined : handleRotate}
          onRename={readOnly ? undefined : handleRename}
          onShelfClick={handleShelfClick}
          onRemove={readOnly ? undefined : handleRemoveItem}
          readOnly={readOnly}
          highlightedShelfIndex={highlightedShelfIndex}
          openMenuIndex={openMenuIndex}
          menuPos={menuPos}
          onContextMenu={handleContextMenu}
          closeMenu={closeMenu}
          inventoryModalOpen={inventoryModal.isOpen}
          onUserContextMenu={handleUserContextMenu}
          userPosition={userPosition}
          navigationPath={navigationPath}
          showNavigation={showNavigation}
          isNavigating={isNavigating}
          onUserPositionChange={handleUserPositionChange}
        />
      </div>
      
      <InventoryModal
        shelf={inventoryModal.shelf}
        isOpen={inventoryModal.isOpen}
        onClose={closeInventoryModal}
        onUpdate={readOnly ? undefined : handleInventoryUpdate}
        readOnly={readOnly}
      />
      
      {!readOnly && (
      <StoreManagerModal
        isOpen={storeManagerModal.isOpen}
        onClose={closeStoreManager}
        currentFloors={floors}
        onLoadPreview={handleLoadPreview}
        storeManagerModal={storeManagerModal}
          onSaveSuccess={() => {
            hasUnsavedChanges.current = false;
            setHasUnsavedChangesState(false);
          }}
      />
      )}
      
      {!readOnly && (
      <Modal open={showRefreshPrompt} onClose={() => setShowRefreshPrompt(false)}>
        <div style={{ textAlign: 'center', padding: 24 }}>
            <h2>⚠️ Unsaved Changes</h2>
            <p>You have unsaved changes to your mall layout. What would you like to do?</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
              <button 
                onClick={() => handleRefreshAction('save')} 
                style={{ 
                  background: '#2563eb', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: '12px 24px', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  minWidth: 120
                }}
              >
                💾 Save Changes
              </button>
              <button 
                onClick={() => handleRefreshAction('discard')} 
                style={{ 
                  background: '#ef4444', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: '12px 24px', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  minWidth: 120
                }}
              >
                🗑️ Discard Changes
              </button>
              <button 
                onClick={() => handleRefreshAction('keep')} 
                style={{ 
                  background: '#06b6d4', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: '12px 24px', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  minWidth: 120
                }}
              >
                ✏️ Keep Editing
              </button>
            </div>
        </div>
      </Modal>
      )}
    </DndProvider>
  );
}

function AppRouter() {
  return (
    <Router>
      <AppRouterInner />
    </Router>
  );
}

function AppRouterInner() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState({ open: false, message: '' });
  const [storeLocation, setStoreLocation] = useState('');
  const navigate = useNavigate();

  // Function to handle store selection from navbar
  const handleStoreSelection = async (store) => {
    if (!store) return;
    
    // Store the selected store ID in localStorage for persistence
    localStorage.setItem('selectedStoreId', store._id);
    
    // Navigate to the app page with the selected store
    navigate('/app', { state: { selectedStore: store } });
  };

  // Fetch store location for dashboard
  useEffect(() => {
    const unsubscribeStores = subscribeToStores((stores) => {
      if (stores.length > 0) {
        setStoreLocation(stores[0].address || '');
      }
    });
    return () => unsubscribeStores();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        setRole(userDoc.exists() ? userDoc.data().role : 'user');
      } else {
        setRole('');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    setFormLoading(true);
    setFormError('');
    try {
      await import('./firebase/auth').then(({ signIn }) => signIn(email, password));
      setModalOpen(false);
      setToast({ open: true, message: 'Login successful!' });
      // Removed: navigate('/app');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleRegister = async (email, password, registerRole) => {
    setFormLoading(true);
    setFormError('');
    try {
      const { auth } = await import('./firebase/auth');
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const { db } = await import('./firebase/config');
      const { setDoc, doc } = await import('firebase/firestore');
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', cred.user.uid), { role: registerRole });
      setModalOpen(false);
      setToast({ open: true, message: 'Registration successful!' });
      // Removed: navigate('/app');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleLogout = async () => {
    await import('./firebase/auth').then(({ signOut }) => signOut());
    setToast({ open: true, message: 'Logged out successfully.' });
    navigate('/');
  };

  if (loading) return <div style={{textAlign:'center',marginTop:80}}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        user={user}
        role={role}
        onLogin={() => { setModalMode('login'); setModalOpen(true); }}
        onRegister={() => { setModalMode('register'); setModalOpen(true); }}
        onLogout={handleLogout}
        onSearch={query => {}} // Search is now handled in navbar popup
        onSelectRecommendation={handleStoreSelection}
      />
      
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Dashboard user={user} role={role} storeLocation={storeLocation} />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/app" element={user ? <App user={user} role={role} /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      
      <Footer />
      
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <LoginRegisterForm
          isOpen={modalOpen}
          mode={modalMode}
          onClose={() => setModalOpen(false)}
          onSwitchMode={() => setModalMode(modalMode === 'login' ? 'register' : 'login')}
          onSubmit={modalMode === 'login' ? handleLogin : handleRegister}
          loading={formLoading}
          error={formError}
        />
      </Modal>
      
      <Toast 
        open={toast.open} 
        message={toast.message} 
        onClose={() => setToast({ open: false, message: '' })} 
      />
    </div>
  );
}

export default AppRouter;

// Helper: Check if two line segments (p1-p2 and q1-q2) intersect
function doLinesIntersect(p1, p2, q1, q2) {
  function ccw(a, b, c) {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }
  return (
    ccw(p1, q1, q2) !== ccw(p2, q1, q2) &&
    ccw(p1, p2, q1) !== ccw(p1, p2, q2)
  );
}

// Helper: Check if a line (from, to) intersects a rectangle (shelf)
function lineIntersectsRect(from, to, rect) {
  // Expand rect by OBSTACLE_PADDING
  const pad = OBSTACLE_PADDING;
  const corners = [
    { x: rect.x - pad, y: rect.y - pad },
    { x: rect.x + rect.width + pad, y: rect.y - pad },
    { x: rect.x + rect.width + pad, y: rect.y + rect.height + pad },
    { x: rect.x - pad, y: rect.y + rect.height + pad }
  ];
  // Rectangle edges
  const edges = [
    [corners[0], corners[1]],
    [corners[1], corners[2]],
    [corners[2], corners[3]],
    [corners[3], corners[0]]
  ];
  for (const [a, b] of edges) {
    if (doLinesIntersect(from, to, a, b)) return true;
  }
  return false;
}

// Helper: Find the closest corner of a rectangle to a point
function closestRectCorner(point, rect) {
  // Expand rect by OBSTACLE_PADDING
  const pad = OBSTACLE_PADDING;
  const corners = [
    { x: rect.x - pad, y: rect.y - pad },
    { x: rect.x + rect.width + pad, y: rect.y - pad },
    { x: rect.x + rect.width + pad, y: rect.y + rect.height + pad },
    { x: rect.x - pad, y: rect.y + rect.height + pad }
  ];
  let minDist = Infinity;
  let closest = corners[0];
  for (const c of corners) {
    const d = Math.hypot(point.x - c.x, point.y - c.y);
    if (d < minDist) {
      minDist = d;
      closest = c;
    }
  }
  return closest;
}

// Helper: Find intersection of a line (from->to) with a rectangle's border
function lineRectBorderIntersection(from, to, rect) {
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height }
  ];
  const edges = [
    [corners[0], corners[1]],
    [corners[1], corners[2]],
    [corners[2], corners[3]],
    [corners[3], corners[0]]
  ];
  for (const [a, b] of edges) {
    const intersection = getLineIntersection(from, to, a, b);
    if (intersection) return intersection;
  }
  return to; // fallback
}

// Helper: Get intersection point of two line segments (returns null if no intersection)
function getLineIntersection(p1, p2, q1, q2) {
  const s1_x = p2.x - p1.x;
  const s1_y = p2.y - p1.y;
  const s2_x = q2.x - q1.x;
  const s2_y = q2.y - q1.y;
  const s = (-s1_y * (p1.x - q1.x) + s1_x * (p1.y - q1.y)) / (-s2_x * s1_y + s1_x * s2_y);
  const t = ( s2_x * (p1.y - q1.y) - s2_y * (p1.x - q1.x)) / (-s2_x * s1_y + s1_x * s2_y);
  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
    // Intersection detected
    return {
      x: p1.x + (t * s1_x),
      y: p1.y + (t * s1_y)
    };
  }
  return null;
}

// Update the walkable cell search for start/end
const findNearestWalkableCell = (grid, cell) => {
  const [rows, cols] = [grid.length, grid[0].length];
  if (grid[cell.y][cell.x] === 0) return cell;
  for (let r = 1; r < Math.max(rows, cols); r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const nx = cell.x + dx, ny = cell.y + dy;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx] === 0) {
          return { x: nx, y: ny };
        }
      }
    }
  }
  return cell; // fallback
};
