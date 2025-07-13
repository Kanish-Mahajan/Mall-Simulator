# Firebase Setup Guide for Mall Simulator

This guide will help you set up Firebase for real-time data synchronization in the Mall Simulator project.

## Prerequisites

- A Google account
- Node.js and npm installed
- Firebase CLI (optional, for local development)

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "mall-simulator")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Set Up Firestore Database

1. In your Firebase project console, click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Select a location for your database (choose the closest to your users)
5. Click "Done"

## Step 3: Get Your Firebase Configuration

1. In the Firebase console, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "mall-simulator-web")
6. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## Step 4: Update Firebase Configuration

1. Open `src/firebase/config.js`
2. Replace the placeholder configuration with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-actual-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-actual-project.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

## Step 5: Set Up Firestore Security Rules (Optional)

For development, you can use the default test mode. For production, you should set up proper security rules:

1. In Firestore Database, go to the "Rules" tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents for now
    // In production, you should implement proper authentication and authorization
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Step 6: Install Firebase CLI (Optional)

For local development with Firebase emulator:

```bash
npm install -g firebase-tools
firebase login
firebase init
```

## Step 7: Run the Application

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

## Data Structure

The Firebase Firestore will have the following collections:

### Stores Collection
```javascript
{
  _id: "auto-generated",
  name: "My Shopping Mall",
  description: "Default shopping mall",
  address: "123 Main Street",
  currentPreviewId: "preview-id",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Previews Collection
```javascript
{
  _id: "auto-generated",
  storeId: "store-id",
  name: "Layout Version 1",
  description: "First floor layout",
  floors: [...], // Array of floor objects with items
  version: 1,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Shelf Items Collection
```javascript
{
  _id: "auto-generated",
  shelfId: "shelf-id",
  name: "Product Name",
  quantity: 10,
  price: 29.99,
  category: "Electronics",
  description: "Product description",
  isOutOfStock: false,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Real-time Features

The application now includes real-time synchronization:

- **Store Management**: Changes to stores are reflected immediately across all connected clients
- **Preview Management**: Layout changes and preview updates are synchronized in real-time
- **Inventory Management**: Shelf inventory changes are updated instantly

## Troubleshooting

### Common Issues

1. **"Firebase: Error (auth/unauthorized-domain)"**
   - Add your domain to the authorized domains in Firebase Console > Authentication > Settings

2. **"Firebase: Error (auth/api-key-not-valid)"**
   - Check that your API key is correct in the configuration

3. **"Firebase: Error (permission-denied)"**
   - Check your Firestore security rules
   - Make sure you're in test mode for development

4. **Real-time updates not working**
   - Check your internet connection
   - Verify that the Firebase configuration is correct
   - Check the browser console for any errors

### Development Tips

- Use the Firebase Console to monitor your data in real-time
- Check the browser's Network tab to see Firebase requests
- Use the browser console to debug Firebase operations
- Consider using Firebase emulator for local development

## Next Steps

1. **Authentication**: Add user authentication with Firebase Auth
2. **Security Rules**: Implement proper Firestore security rules
3. **Offline Support**: Enable offline persistence for better user experience
4. **Analytics**: Add Firebase Analytics to track user behavior
5. **Hosting**: Deploy your app using Firebase Hosting

## Support

If you encounter any issues:
1. Check the [Firebase Documentation](https://firebase.google.com/docs)
2. Review the [Firebase Console](https://console.firebase.google.com/) for any error messages
3. Check the browser console for detailed error information 