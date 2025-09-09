// js/firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyD_MPxHrzLs2vd677t3Nr8vXKFtQEuLI2g",
  authDomain: "quiz-aa480.firebaseapp.com",
  projectId: "quiz-aa480",
  storageBucket: "quiz-aa480.firebasestorage.app",
  messagingSenderId: "913659290274",
  appId: "1:913659290274:web:412b6ca878f15d094f6dfb",
  measurementId: "G-Q3X66T9MJF"
};

// Initialize Firebase μία φορά
firebase.initializeApp(firebaseConfig);

// Κοινά exports για όλα τα scripts
const auth = firebase.auth();
const db = firebase.firestore();
