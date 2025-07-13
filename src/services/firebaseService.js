import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Collection names
const COLLECTIONS = {
  STORES: 'stores',
  PREVIEWS: 'previews',
  SHELF_ITEMS: 'shelfItems'
};

// Store Management
export const createStore = async (storeData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.STORES), {
      ...storeData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { _id: docRef.id, ...storeData };
  } catch (error) {
    console.error('Error creating store:', error);
    throw error;
  }
};

export const getStores = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.STORES));
    return querySnapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting stores:', error);
    throw error;
  }
};

export const getStore = async (id) => {
  try {
    const docRef = doc(db, COLLECTIONS.STORES, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { _id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Store not found');
    }
  } catch (error) {
    console.error('Error getting store:', error);
    throw error;
  }
};

export const updateStore = async (id, storeData) => {
  try {
    const docRef = doc(db, COLLECTIONS.STORES, id);
    await updateDoc(docRef, {
      ...storeData,
      updatedAt: serverTimestamp()
    });
    return { _id: id, ...storeData };
  } catch (error) {
    console.error('Error updating store:', error);
    throw error;
  }
};

export const deleteStore = async (id) => {
  try {
    // Delete all previews for this store first
    const previewsQuery = query(
      collection(db, COLLECTIONS.PREVIEWS),
      where('storeId', '==', id)
    );
    const previewsSnapshot = await getDocs(previewsQuery);
    const deletePromises = previewsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Delete the store
    await deleteDoc(doc(db, COLLECTIONS.STORES, id));
    return { success: true };
  } catch (error) {
    console.error('Error deleting store:', error);
    throw error;
  }
};

// Real-time store listeners
export const subscribeToStores = (callback) => {
  const q = query(collection(db, COLLECTIONS.STORES), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const stores = querySnapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    }));
    callback(stores);
  });
};

export const subscribeToStore = (storeId, callback) => {
  const docRef = doc(db, COLLECTIONS.STORES, storeId);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({ _id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

// Preview Management
export const savePreview = async (storeId, previewData, customDate = null) => {
  try {
    // Handle custom date if provided
    let createdAt;
    if (customDate && customDate.trim()) {
      try {
        const date = new Date(customDate);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format');
        }
        createdAt = Timestamp.fromDate(date);
      } catch (error) {
        console.error('Error parsing custom date:', error);
        createdAt = serverTimestamp();
      }
    } else {
      createdAt = serverTimestamp();
    }

    const docRef = await addDoc(collection(db, COLLECTIONS.PREVIEWS), {
      ...previewData,
      storeId,
      createdAt,
      updatedAt: serverTimestamp(),
      version: 1
    });
    
    // Update store's current preview if this is the first preview
    const storeRef = doc(db, COLLECTIONS.STORES, storeId);
    const storeSnap = await getDoc(storeRef);
    if (storeSnap.exists() && !storeSnap.data().currentPreviewId) {
      await updateDoc(storeRef, {
        currentPreviewId: docRef.id,
        updatedAt: serverTimestamp()
      });
    }
    
    return { _id: docRef.id, ...previewData };
  } catch (error) {
    console.error('Error saving preview:', error);
    throw error;
  }
};

export const getStorePreviews = async (storeId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PREVIEWS),
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting store previews:', error);
    throw error;
  }
};

export const getPreview = async (previewId) => {
  try {
    const docRef = doc(db, COLLECTIONS.PREVIEWS, previewId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { _id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Preview not found');
    }
  } catch (error) {
    console.error('Error getting preview:', error);
    throw error;
  }
};

export const updatePreview = async (storeId, previewId, previewData) => {
  try {
    const docRef = doc(db, COLLECTIONS.PREVIEWS, previewId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Preview not found');
    }
    
    const currentData = docSnap.data();
    await updateDoc(docRef, {
      ...previewData,
      version: (currentData.version || 1) + 1,
      updatedAt: serverTimestamp()
    });
    
    return { _id: previewId, ...previewData };
  } catch (error) {
    console.error('Error updating preview:', error);
    throw error;
  }
};

export const deletePreview = async (storeId, previewId) => {
  try {
    const docRef = doc(db, COLLECTIONS.PREVIEWS, previewId);
    await deleteDoc(docRef);
    
    // Check if this was the current preview and update store if needed
    const storeRef = doc(db, COLLECTIONS.STORES, storeId);
    const storeSnap = await getDoc(storeRef);
    if (storeSnap.exists() && storeSnap.data().currentPreviewId === previewId) {
      // Find another preview to set as current, or clear it
      const remainingPreviews = await getStorePreviews(storeId);
      const newCurrentPreviewId = remainingPreviews.length > 0 ? remainingPreviews[0]._id : null;
      await updateDoc(storeRef, {
        currentPreviewId: newCurrentPreviewId,
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting preview:', error);
    throw error;
  }
};

export const setActivePreview = async (storeId, previewId) => {
  try {
    const storeRef = doc(db, COLLECTIONS.STORES, storeId);
    await updateDoc(storeRef, {
      currentPreviewId: previewId,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error setting active preview:', error);
    throw error;
  }
};

// Real-time preview listeners
export const subscribeToStorePreviews = (storeId, callback) => {
  const q = query(
    collection(db, COLLECTIONS.PREVIEWS),
    where('storeId', '==', storeId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (querySnapshot) => {
    const previews = querySnapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    }));
    callback(previews);
  });
};

// Shelf Inventory Management
export const getShelfItems = async (shelfId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.SHELF_ITEMS),
      where('shelfId', '==', shelfId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting shelf items:', error);
    throw error;
  }
};

export const addShelfItem = async (shelfId, itemData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.SHELF_ITEMS), {
      ...itemData,
      shelfId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { _id: docRef.id, ...itemData };
  } catch (error) {
    console.error('Error adding shelf item:', error);
    throw error;
  }
};

export const updateShelfItem = async (shelfId, itemId, itemData) => {
  try {
    const docRef = doc(db, COLLECTIONS.SHELF_ITEMS, itemId);
    await updateDoc(docRef, {
      ...itemData,
      updatedAt: serverTimestamp()
    });
    return { _id: itemId, ...itemData };
  } catch (error) {
    console.error('Error updating shelf item:', error);
    throw error;
  }
};

export const deleteShelfItem = async (shelfId, itemId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.SHELF_ITEMS, itemId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting shelf item:', error);
    throw error;
  }
};

// Real-time shelf items listener
export const subscribeToShelfItems = (shelfId, callback) => {
  const q = query(
    collection(db, COLLECTIONS.SHELF_ITEMS),
    where('shelfId', '==', shelfId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (querySnapshot) => {
    const items = querySnapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    }));
    callback(items);
  });
};

// Floor Layout Management (saved as part of previews)
export const saveFloorLayout = async (floorId, items) => {
  // This is now handled through previews
  // You can create a preview with the current floor layout
  console.log('Floor layout saving is now handled through previews');
  return { success: true };
}; 