// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCqWrEJwnBMCXgAJjE51I7Aztw2gJJ-iT4",
  authDomain: "registro-f6d53.firebaseapp.com",
  databaseURL: "https://registro-f6d53.firebaseio.com",
  projectId: "registro-f6d53",
  storageBucket: "registro-f6d53.firebasestorage.app",
  messagingSenderId: "791248783244",
  appId: "1:791248783244:web:43c5dc9b77b7e9296538a9",
  measurementId: "G-L46MEC3BVL"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();