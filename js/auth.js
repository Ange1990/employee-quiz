loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      // Αν είναι ο CEO, πάει στο dashboard, αλλιώς στο quiz
      if (email === "nafpliotis@sspc.gr") {
        window.location.href = "dashboard.html";
      } else {
        window.location.href = "quiz.html";
      }
    })
    .catch((error) => {
      alert("Σφάλμα: " + error.message);
    });
});
