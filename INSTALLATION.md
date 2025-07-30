# Mall Simulator - Installation Guide

A React + Firebase-based mall layout and inventory management simulator.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Git](https://git-scm.com/)
- A [Firebase](https://firebase.google.com/) project (for authentication, Firestore, etc.)

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd mall-simulator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project (or use an existing one).
2. In your project, add a new Web App and copy the Firebase config.
3. In the project directory, create a `.env` file and add your Firebase config:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Enable **Authentication** (Email/Password) and **Cloud Firestore** in the Firebase Console.
5. (Optional) Set up Firestore rules and indexes as needed. See `firestore.rules` and `firestore.indexes.json` in the repo.

### 4. Run the App

```bash
npm run dev
```

- The app will be available at `http://localhost:5173` (or the port shown in your terminal).

## Project Structure

- `src/` - Main source code (React components, Firebase integration, services)
- `public/` - Static assets
- `firebase.json`, `firestore.rules`, `firestore.indexes.json` - Firebase config and security
- `.env` - Your local Firebase credentials (not committed to git)

## Firebase Integration Notes
- The app expects Firebase config via environment variables (see above).
- All Firestore collections and authentication are created automatically on first use.
- For local development, you can use Firebase emulators (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md)).

## Deployment
- For production, build the app with `npm run build` and deploy the `dist/` folder to your preferred static hosting (e.g., Firebase Hosting, Vercel, Netlify).

## Contributing
- Fork the repo, create a branch, and submit a pull request!

## License
MIT 
