import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC5mjep7grYQSYbFNNRNmd9X72n-yHfm5U",
  authDomain: "uniable-9b31d.firebaseapp.com",
  projectId: "uniable-9b31d",
  storageBucket: "uniable-9b31d.firebasestorage.app",
  messagingSenderId: "773136514728",
  appId: "1:773136514728:web:33941a2c4b1453a9dfcc9d",
  measurementId: "G-6F5S1BPVQS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };