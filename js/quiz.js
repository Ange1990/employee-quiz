// --- Στοιχεία DOM ---
const container = document.getElementById("questions-container");
const form = document.getElementById("quiz-form");
const userEmailSpan = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const progressBar = document.getElementById("progress");

// --- Ρυθμίσεις ---
const TIMER_TOTAL = 15 * 60; // 15 λεπτά

// --- Timer UI ---
const timerDisplay = document.createElement("div");
timerDisplay.style.marginBottom = "15px";
timerDisplay.style.fontWeight = "600";
form.prepend(timerDisplay);

// --- State ---
let questions = [];
let currentIndex = 0;
let answers = {};
let timerInterval = null;
let quizSubmitted = false;

// --- Shuffle ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// --- Auth ---
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  userEmailSpan.textContent = `Καλώς ήρθες, ${user.email}`;
  container.innerHTML = "<h3 style='text-align:center;'>Φόρτωση δεδομένων...</h3>";

  try {
    const resultSnap = await db.collection("results")
      .where("uid", "==", user.uid)
      .limit(1)
      .get();

    if (!resultSnap.empty) {
      const data = resultSnap.docs[0].data();
      if (data.scorePercent !== undefined) {
        quizSubmitted = true;
        answers = data.answers || {};
        await loadQuestions(true);
        showResultsScreen(
          data.correctCount,
          data.totalMultiple,
          data.scorePercent,
          data.passed
        );
        return;
      }
    }

    await loadQuestions(false);
    startTimer();

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p style='color:red;text-align:center;'>Σφάλμα φόρτωσης.</p>";
  }
});

// --- Logout ---
logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => window.location.href = "index.html");
});

// --- Φόρτωση ερωτήσεων ---
async function loadQuestions(hideQuestions = false) {
  const user = auth.currentUser;
  if (!user) return;

  const ORDER_KEY = `quizQuestionOrder_${user.uid}`;

  const userDoc = await db.collection("users").doc(user.uid).get();
  const userGroup = userDoc.exists ? userDoc.data().group : null;

  const snapshot = await db.collection("questions").orderBy("order").get();
  questions = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log("Firestore Question:", doc.id, data);
    if (
      (data.group === undefined || data.group === null || data.group === userGroup) &&
      ["open", "scale-stars", "multiple"].includes(data.type)
    ) {
      questions.push({ id: doc.id, ...data });
    }
  });

  // --- Τυχαία σειρά ανά χρήστη ---
  const savedOrder = localStorage.getItem(ORDER_KEY);

  if (savedOrder) {
    const order = JSON.parse(savedOrder);
    questions.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  } else {
    shuffleArray(questions);
    localStorage.setItem(
      ORDER_KEY,
      JSON.stringify(questions.map(q => q.id))
    );
  }

console.log("User group:", userGroup);
console.log("Questions loaded:", questions);

if (!hideQuestions) {

  if (questions.length === 0) {
    container.innerHTML = "<h3 style='color:red;text-align:center;'>Δεν βρέθηκαν ερωτήσεις.</h3>";
    return;
  }

  showQuestion(0);
}}

// --- Timer (ΑΝΑ ΧΡΗΣΤΗ) ---
function startTimer() {
  const user = auth.currentUser;
  if (!user) return;

  const TIMER_KEY = `quizStartTime_${user.uid}`;
  let startTime = localStorage.getItem(TIMER_KEY);

  if (!startTime) {
    startTime = Date.now();
    localStorage.setItem(TIMER_KEY, startTime);
  } else {
    startTime = parseInt(startTime);
  }

  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = TIMER_TOTAL - elapsed;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerDisplay.textContent = "Χρόνος: 00:00";
      localStorage.removeItem(TIMER_KEY);
      submitQuiz();
      return;
    }

    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    timerDisplay.textContent = `Χρόνος: ${m}:${String(s).padStart(2, "0")}`;
  }, 1000);
}

// --- Εμφάνιση ερώτησης ---
function showQuestion(index) {

  console.log("showQuestion index:", index);
  console.log("questions:", questions);

  currentIndex = index;
  const q = questions[index];

  console.log("Current Question:", q);

  if (!q) {
    container.innerHTML = "<h3 style='color:red;text-align:center;'>Η ερώτηση δεν βρέθηκε.</h3>";
    return;
  }

  container.innerHTML = "";

  const card = document.createElement("div");
  card.className = "question-card";
  card.innerHTML = `<div class="question-text">${q.text}</div>`;

  if (q.type === "open") {
    const t = document.createElement("textarea");
    t.value = answers[q.id] || "";
    t.oninput = () => answers[q.id] = t.value;
    card.appendChild(t);
  }

  if (q.type === "scale-stars") {
    const wrap = document.createElement("div");
    wrap.className = "stars";
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement("span");
      s.textContent = i <= (answers[q.id] || 0) ? "★" : "☆";
      s.onclick = () => { answers[q.id] = i; showQuestion(currentIndex); };
      wrap.appendChild(s);
    }
    card.appendChild(wrap);
  }

  if (q.type === "multiple") {
    q.options.forEach(opt => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = q.id;
      input.checked = answers[q.id] === opt;
      input.onchange = () => answers[q.id] = opt;
      label.appendChild(input);
      label.append(opt);
      card.appendChild(label);
    });
  }

  container.appendChild(card);
  renderNavigation();
  updateProgress();
}

// --- Navigation ---
function renderNavigation() {
  const nav = document.createElement("div");
  nav.style.display = "flex";
  nav.style.justifyContent = "space-between";
  nav.style.marginTop = "25px";

  if (currentIndex > 0) {
    const prev = document.createElement("button");
    prev.textContent = "⬅ Προηγούμενο";
    prev.className = "nav-btn prev";
    prev.onclick = () => showQuestion(currentIndex - 1);
    nav.appendChild(prev);
  }

  if (currentIndex < questions.length - 1) {
    const next = document.createElement("button");
    next.textContent = "Επόμενο ➡";
    next.className = "nav-btn next";
    next.onclick = () => showQuestion(currentIndex + 1);
    nav.appendChild(next);
  }

  container.appendChild(nav);
}

// --- Progress ---
function updateProgress() {
  progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
}

// --- Υποβολή ---
function submitQuiz() {
  if (quizSubmitted) return;
  quizSubmitted = true;
  clearInterval(timerInterval);

  let correct = 0, total = 0;
  questions.forEach(q => {
    if (q.type === "multiple" && q.correctAnswer) {
      total++;
      if (answers[q.id] === q.correctAnswer) correct++;
    }
  });

  const percent = total ? Math.round((correct / total) * 100) : 0;
  const passed = percent >= 85;

  answers._meta = { questionOrder: questions.map(q => q.id) };

  db.collection("results").add({
    uid: auth.currentUser.uid,
    email: auth.currentUser.email,
    answers,
    correctCount: correct,
    totalMultiple: total,
    scorePercent: percent,
    passed,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  localStorage.removeItem(`quizQuestionOrder_${auth.currentUser.uid}`);
  localStorage.removeItem(`quizStartTime_${auth.currentUser.uid}`);

  showResultsScreen(correct, total, percent, passed);
}

// --- Αποτελέσματα ---
function showResultsScreen(c, t, p, passed) {
  container.innerHTML = `
    <div class="question-card" style="text-align:center;">
      <h2>${passed ? "✅ Επιτυχία" : "❌ Αποτυχία"}</h2>
      <p>Σωστές: ${c}/${t}</p>
      <h3>${p}%</h3>
    </div>`;
}

// --- Submit ---
form.addEventListener("submit", e => {
  e.preventDefault();
  if (confirm("Θέλεις σίγουρα να υποβάλεις;")) submitQuiz();
});
