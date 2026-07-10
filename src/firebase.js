import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAJCzjSpIYrUZv5CUPlaZsfwOUV0TqbLjA",
  authDomain: "naveed-zeeshan-traders-mailsi.firebaseapp.com",
  projectId: "naveed-zeeshan-traders-mailsi",
  storageBucket: "naveed-zeeshan-traders-mailsi.firebasestorage.app",
  messagingSenderId: "496124226673",
  appId: "1:496124226673:web:bbbddaff51c976ddcfffd0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);