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

      if (data.type === "mcq" && Array.isArray(data.options)) {
        // Ερώτηση πολλαπλής επιλογής
        data.options.forEach(opt => {
          const label = document.createElement("label");
          label.innerHTML = `<input type="radio" name="${doc.id}" value="${opt}" /> ${opt}`;
          optionsDiv.appendChild(label);
        });
        card.appendChild(optionsDiv);
      } else if (data.type === "open") {
        // Ερώτηση ανάπτυξης
        const textarea = document.createElement("textarea");
        textarea.name = doc.id;
        textarea.rows = 4;
        textarea.cols = 50;
        textarea.placeholder = "Γράψε την απάντησή σου εδώ...";
        card.appendChild(textarea);
      }

      container.appendChild(card);
    });
  }).catch(err => console.error(err));
}

// Υποβολή απαντήσεων
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const confirmSubmit = confirm("Θέλεις σίγουρα να υποβάλεις τις απαντήσεις σου;");
  if (!confirmSubmit) return;

  const user = auth.currentUser;
  const answers = {};

  db.collection("questions").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      let answer = "";

      if (data.type === "mcq") {
        const selected = form.querySelector(`input[name="${doc.id}"]:checked`);
        answer = selected ? selected.value : "Δεν απαντήθηκε";
      } else if (data.type === "open") {
        const textarea = form.querySelector(`textarea[name="${doc.id}"]`);
        answer = textarea ? textarea.value.trim() : "";
      }

      answers[doc.id] = {
        question: data.text,
        answer: answer
      };
    });

    // Αποθήκευση στο Firestore
    if (user) {
      db.collection("results").add({
        uid: user.uid,
        email: user.email,
        answers: answers,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        alert("Οι απαντήσεις σου καταχωρήθηκαν με επιτυχία!");
        container.innerHTML = "<h2>Ευχαριστούμε για τη συμμετοχή!</h2>";
      }).catch(err => console.error("Σφάλμα αποθήκευσης:", err));
    }
  });
});
