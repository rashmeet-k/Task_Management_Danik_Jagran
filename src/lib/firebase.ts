import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCwtCIGSFLSHPbL_lo30ZZJbNQEDGW_gMQ",
  authDomain: "task-management-a59ab.firebaseapp.com",
  projectId: "task-management-a59ab",
  storageBucket: "task-management-a59ab.firebasestorage.app",
  messagingSenderId: "753821248",
  appId: "1:753821248:web:a2820f9b6173a921fbe1a5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
