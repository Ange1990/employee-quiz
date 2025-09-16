const container = document.getElementById("questions-container");
const form = document.getElementById("quiz-form");
const userEmailSpan = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const progressBar = document.getElementById("progress");

let questions = [];
let currentIndex = 0;
let answers = {};

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

// Φόρτωση ερωτήσεων
function loadQuestions() {
  db.collection("questions").get().then(snapshot => {
    questions = [];
    snapshot.forEach(doc => {
      questions.push({ id: doc.id, ...doc.data() });
    });
    showQuestion(0);
  });
}

// Εμφάνιση μιας ερώτησης
function showQuestion(index) {
  currentIndex = index;
  const q = questions[index];

  container.innerHTML = "";

  const card = document.createElement("div");
  card.className = "question-card";

  const qText = document.createElement("div");
  qText.className = "question-text";
  qText.textContent = q.text;
  card.appendChild(qText);

  const optionsDiv = document.createElement("div");
  optionsDiv.className = "options";

  if (q.type === "mcq" && Array.isArray(q.options)) {
    q.options.forEach(opt => {
      const label = document.createElement("label");
      const checked = answers[q.id] === opt ? "checked" : "";
      label.innerHTML = `<input type="radio" name="${q.id}" value="${opt}" ${checked}/> ${opt}`;
      optionsDiv.appendChild(label);
    });
    card.appendChild(optionsDiv);
  } else if (q.type === "open") {
    const textarea = document.createElement("textarea");
    textarea.name = q.id;
    textarea.rows = 4;
    textarea.placeholder = "Γράψε την απάντησή σου εδώ...";
    textarea.value = answers[q.id] || "";
    card.appendChild(textarea);
  }

  container.appendChild(card);

  renderNavigation();
  updateProgress();
}

// Κουμπιά πλοήγησης
function renderNavigation() {
  let nav = document.createElement("div");
  nav.style.display = "flex";
  nav.style.justifyContent = "space-between";
  nav.style.marginTop = "20px";

  if (currentIndex > 0) {
    let prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.textContent = "⬅ Προηγούμενο";
    prevBtn.onclick = () => saveAnswerAndMove(-1);
    nav.appendChild(prevBtn);
  }

  if (currentIndex < questions.length - 1) {
    let nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.textContent = "Επόμενο ➡";
    nextBtn.onclick = () => saveAnswerAndMove(1);
    nav.appendChild(nextBtn);
  } else {
    let submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = "Υποβολή Απαντήσεων";
    nav.appendChild(submitBtn);
  }

  container.appendChild(nav);
}

// Αποθήκευση τρέχουσας απάντησης πριν τη μετάβαση
function saveAnswerAndMove(step) {
  const q = questions[currentIndex];

  if (q.type === "mcq") {
    const selected = form.querySelector(`input[name="${q.id}"]:checked`);
    if (selected) answers[q.id] = selected.value;
  } else if (q.type === "open") {
    const textarea = form.querySelector(`textarea[name="${q.id}"]`);
    if (textarea) answers[q.id] = textarea.value.trim();
  }

  showQuestion(currentIndex + step);
}

// Progress bar
function updateProgress() {
  const percent = ((currentIndex + 1) / questions.length) * 100;
  progressBar.style.width = `${percent}%`;
}

// Υποβολή απαντήσεων
form.addEventListener("submit", (e) => {
  e.preventDefault();

  // σώζουμε την τελευταία απάντηση
  saveAnswerAndMove(0);

  const confirmSubmit = confirm("Θέλεις σίγουρα να υποβάλεις τις απαντήσεις σου;");
  if (!confirmSubmit) return;

  const user = auth.currentUser;
  if (user) {
    db.collection("results").add({
      uid: user.uid,
      email: user.email,
      answers: answers,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      container.innerHTML = "<h2>Ευχαριστούμε για τη συμμετοχή!</h2>";
      progressBar.style.width = "100%";
    }).catch(err => console.error("Σφάλμα αποθήκευσης:", err));
  }
});
