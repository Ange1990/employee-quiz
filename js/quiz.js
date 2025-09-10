// js/quiz.js

// Firestore & Auth
const db = firebase.firestore();
const auth = firebase.auth();

const container = document.getElementById("questions-container");
const form = document.getElementById("quiz-form");

// ------------------
// Έλεγχος αν είναι συνδεδεμένος ο χρήστης
// ------------------
auth.onAuthStateChanged(user => {
  if (!user) {
    // Αν δεν είναι συνδεδεμένος → redirect στο login
    window.location.href = "index.html";
  } else {
    // Φόρτωσε τις ερωτήσεις όταν είναι συνδεδεμένος
    loadQuestions();
  }
});

// ------------------
// Φόρτωση ερωτήσεων από Firestore
// ------------------
function loadQuestions() {
  db.collection("questions").get().then(snapshot => {
    container.innerHTML = ""; // καθάρισμα container

    snapshot.forEach(doc => {
      const data = doc.data();

      // Δημιουργία card
      const card = document.createElement("div");
      card.className = "question-card";

      // Ερώτηση
      const qText = document.createElement("div");
      qText.className = "question-text";
      qText.textContent = data.text;
      card.appendChild(qText);

      // Επιλογές
      const optionsDiv = document.createElement("div");
      optionsDiv.className = "options";

      data.options.forEach(opt => {
        const label = document.createElement("label");
        label.innerHTML = `
          <input type="radio" name="${doc.id}" value="${opt}" />
          ${opt}
        `;
        optionsDiv.appendChild(label);
      });

      card.appendChild(optionsDiv);
      container.appendChild(card);
    });
  });
}

// ------------------
// Υποβολή απαντήσεων
// ------------------
form.addEventListener("submit", (e) => {
  e.preventDefault();

  let score = 0;
  let total = 0;

  db.collection("questions").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      total++;

      // Απάντηση που έδωσε ο χρήστης
      const selected = form.querySelector(`input[name="${doc.id}"]:checked`);
      if (selected && selected.value === data.correct) {
        score++;
      }
    });

    // Εμφάνιση αποτελέσματος
    alert(`Το σκορ σου: ${score}/${total}`);

    // Αποθήκευση στο Firestore (collection: results)
    const user = auth.currentUser;
    if (user) {
      db.collection("results").add({
        uid: user.uid,
        email: user.email,
        score: score,
        total: total,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  });
});
