const container = document.getElementById("questions-container");
const form = document.getElementById("quiz-form");
const userEmailSpan = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");

// Έλεγχος αν είναι συνδεδεμένος ο χρήστης
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    userEmailSpan.textContent = `Καλώς ήρθες, ${user.email}`;
    loadQuestions();
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
});

// Φόρτωση ερωτήσεων από Firestore
function loadQuestions() {
  db.collection("questions").get().then(snapshot => {
    container.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "question-card";

      const qText = document.createElement("div");
      qText.className = "question-text";
      qText.textContent = data.text;
      card.appendChild(qText);

      const optionsDiv = document.createElement("div");
      optionsDiv.className = "options";

      data.options.forEach(opt => {
        const label = document.createElement("label");
        label.innerHTML = `<input type="radio" name="${doc.id}" value="${opt}" /> ${opt}`;
        optionsDiv.appendChild(label);
      });

      card.appendChild(optionsDiv);
      container.appendChild(card);
    });
  }).catch(err => console.error(err));
}

// Υποβολή & εμφάνιση ολοκληρωμένου τεστ με confirm και alert
form.addEventListener("submit", (e) => {
  e.preventDefault();

  // Confirm πριν την υποβολή
  const confirmSubmit = confirm("Θέλεις σίγουρα να υποβάλεις τις απαντήσεις σου;");
  if (!confirmSubmit) return; // Αν πατήσει Όχι, ακυρώνουμε

  let score = 0;
  let total = 0;
  const resultsHTML = [];

  db.collection("questions").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      total++;

      const selected = form.querySelector(`input[name="${doc.id}"]:checked`);
      const answer = selected ? selected.value : "Δεν απαντήθηκε";

      if(answer === data.correct) score++;

      resultsHTML.push(`
        <div class="question-card">
          <div class="question-text">${data.text}</div>
          <div>Η απάντηση σου: <b>${answer}</b></div>
          <div>Σωστή απάντηση: <b>${data.correct}</b></div>
        </div>
      `);
    });

    // Εμφάνιση αποτελεσμάτων
    container.innerHTML = `
      <h2>Αποτελέσματα: ${score}/${total}</h2>
      ${resultsHTML.join("")}
    `;

    // Αποθήκευση στο Firestore
    const user = auth.currentUser;
    if(user){
      db.collection("results").add({
        uid: user.uid,
        email: user.email,
        score: score,
        total: total,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        alert("Ολοκληρώθηκε η αποστολή απαντήσεων!");
      });
    } else {
      alert("Ολοκληρώθηκε η υποβολή απαντήσεων!");
    }
  });
});
