// firebase.js

// Import the functions you need from the SDKs you need
// Importando as funções diretamente da CDN do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// A configuração do Firebase do seu aplicativo da web
const firebaseConfig = {
  apiKey: "AIzaSyAgBoawub_n3J6huWOgdQDPzAAIVPnclcM", // Mantenha suas chaves originais
  authDomain: "gamerec-70408.firebaseapp.com",
  projectId: "gamerec-70408",
  storageBucket: "gamerec-70408.firebasestorage.app",
  messagingSenderId: "312396256333",
  appId: "1:312396256333:web:38194de1547476fc493804",
  measurementId: "G-MX29CKGP85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicialize e exporte os serviços para uso em todo o aplicativo
export const auth = getAuth(app);
export const db = getFirestore(app);