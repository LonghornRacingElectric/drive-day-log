import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load .env.local to get project ID
let projectId = 'drive-day-log';
try {
  dotenv.config({ path: '.env.local' });
  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  }
} catch (e) {
  // Ignored
}

async function main() {
  console.log(`Starting local admin clean for Firebase project: ${projectId}`);
  console.log('To run this successfully, ensure you have exported GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON.');
  console.log('Alternatively, you can provide the path to your service key as an argument: npm run clean:db ./serviceAccountKey.json\n');

  let credential = admin.credential.applicationDefault();
  
  // Check if a path to a service account key was provided as a CLI argument
  const customKeyPath = process.argv[2];
  if (customKeyPath && existsSync(customKeyPath)) {
    console.log(`Using custom service account key from: ${customKeyPath}`);
    credential = admin.credential.cert(customKeyPath);
  } else if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('⚠️ Warning: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
    console.log('Firebase Admin SDK may fail to initialize unless you ran `gcloud auth application-default login`.');
  }

  try {
    admin.initializeApp({
      credential,
      projectId
    });
  } catch (err) {
    console.error('Failed to initialize Admin SDK:', err.message);
    process.exit(1);
  }

  const db = admin.firestore();
  
  try {
    console.log('Gathering collections...');
    const collections = await db.listCollections();
    
    if (collections.length === 0) {
      console.log('No collections found. The database is already clean.');
      process.exit(0);
    }

    for (const collection of collections) {
      console.log(`Recursively deleting collection: ${collection.id}...`);
      await db.recursiveDelete(collection);
    }
    
    console.log('Successfully deleted all Firestore data!');
  } catch (error) {
    console.error('Error while cleaning the database:', error);
    process.exit(1);
  }
}

main();
