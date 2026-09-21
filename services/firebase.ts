import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { HistoryItem } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.info("Client is currently offline; Firestore will operate locally.");
      return;
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.code === 'unavailable' || (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable')))) {
      console.info("Firestore client is offline or unavailable. Operating with local offline fallback.");
    } else {
      console.debug("Firestore test connection check completed (expected if rules deny unauthenticated read):", error);
    }
  }
}
testConnection();

export async function saveHistoryItemToFirestore(userId: string, item: HistoryItem): Promise<void> {
  const path = `users/${userId}/history/${item.id}`;
  try {
    // Ensure payload fits within security rules constraints and storage boundaries
    const safeData: Record<string, any> = {
      id: item.id,
      userId,
      timestamp: item.timestamp,
      tabId: item.tabId,
      tabLabel: item.tabLabel,
      inputs: item.inputs || {}
    };

    if (item.resultImage) safeData.resultImage = item.resultImage;
    if (item.resultImages) safeData.resultImages = item.resultImages;
    if (item.resultVideo) safeData.resultVideo = item.resultVideo;

    await setDoc(doc(db, 'users', userId, 'history', item.id), safeData);
  } catch (error) {
    console.warn("Could not sync item to Firestore (offline or permissions error):", error);
  }
}

export async function loadHistoryFromFirestore(userId: string): Promise<HistoryItem[]> {
  const path = `users/${userId}/history`;
  try {
    const q = query(collection(db, 'users', userId, 'history'), orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    const items: HistoryItem[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      items.push({
        id: data.id || docSnap.id,
        timestamp: data.timestamp || Date.now(),
        tabId: data.tabId || 'retro-cel',
        tabLabel: data.tabLabel || 'Retro Cel',
        resultImage: data.resultImage,
        resultImages: data.resultImages,
        resultVideo: data.resultVideo,
        inputs: data.inputs || {}
      });
    });
    return items;
  } catch (error) {
    console.warn("Could not load history from Firestore, falling back to local history:", error);
    return [];
  }
}

export async function deleteHistoryItemFromFirestore(userId: string, itemId: string): Promise<void> {
  const path = `users/${userId}/history/${itemId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'history', itemId));
  } catch (error) {
    console.warn("Could not delete item from Firestore:", error);
  }
}

