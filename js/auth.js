// Firebase config από το project σου
const firebaseConfig = {
  apiKey: "AIzaSyD_MPxHrzLs2vd677t3Nr8vXKFtQEuLI2g",
  authDomain: "quiz-aa480.firebaseapp.com",
  projectId: "quiz-aa480",
  storageBucket: "quiz-aa480.firebasestorage.app",
  messagingSenderId: "913659290274",
  appId: "1:913659290274:web:412b6ca878f15d094f6dfb",
  measurementId: "G-Q3X66T9MJF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Login λειτουργία
const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Login επιτυχής, προχωράμε στο quiz
      window.location.href = "quiz.html";
    })
    .catch((error) => {
      alert("Σφάλμα: " + error.message);
    });
});
