// js/firebase-config.js
// --------------------
// Αντέγραψε εδώ το firebaseConfig που πήρες από το Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyD_MPxHrzLs2vd677t3Nr8vXKFtQEuLI2g",
  authDomain: "quiz-aa480.firebaseapp.com",
  projectId: "quiz-aa480",
  storageBucket: "quiz-aa480.firebasestorage.app",
  messagingSenderId: "913659290274",
  appId: "1:913659290274:web:412b6ca878f15d094f6dfb",
  measurementId: "G-Q3X66T9MJF"
};

// Αν δεν έχει ήδη γίνει initialize (αποφεύγει το σφάλμα "app already exists")
if (!firebase.apps || !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Εξάγουμε αντικείμενα που θα χρησιμοποιούν τα υπόλοιπα scripts
const auth = firebase.auth();
const db = firebase.firestore();
