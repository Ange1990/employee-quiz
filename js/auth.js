loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      // Λίστα με emails CEO
      const ceoEmails = [
        "nafpliotis@sspc.gr",
        "tzanetopoulou@sspc.gr", // ← πρόσθεσε εδώ τον 2ο
        "nafpliotou@sspc.gr"  // ← και εδώ τον 3ο
      ];

      if (ceoEmails.includes(email)) {
        window.location.href = "dashboard.html";
      } else {
        window.location.href = "quiz.html";
      }
    })
    .catch((error) => {
      alert("Σφάλμα: " + error.message);
    });
});

