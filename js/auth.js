// js/auth.js

// Παίρνουμε το auth από το firebase-config.js (δεν ξανακάνουμε initialize εδώ)
const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      // Επιτυχής σύνδεση → πάμε quiz.html
      window.location.href = "quiz.html";
    })
    .catch((error) => {
      alert("Σφάλμα: " + error.message);
    });
});
