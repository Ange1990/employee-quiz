// --- Στοιχεία DOM ---
const container = document.getElementById("questions-container");
const form = document.getElementById("quiz-form");
const userEmailSpan = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const progressBar = document.getElementById("progress");

const TIMER_TOTAL = 15 * 60; // ⏱️ 15 λεπτά
const timerDisplay = document.createElement("div");
timerDisplay.style.marginBottom = "15px";
timerDisplay.style.fontWeight = "600";
form.prepend(timerDisplay);

let questions = [];
let currentIndex = 0;
let answers = {};
let timerInterval = null;

// --- Έλεγχος σύνδεσης χρήστη ---
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  userEmailSpan.textContent = `Καλώς ήρθες, ${user.email}`;
  await loadQuestions();
  startTimer();
});

// --- Logout ---
logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => {
    localStorage.removeItem("quizStartTime");
    window.location.href = "index.html";
  });
});

// --- Φόρτωση ερωτήσεων ---
async function loadQuestions() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userGroup = userDoc.exists ? userDoc.data().group : null;

    const snapshot = await db.collection("questions").orderBy("order").get();
    questions = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.group === undefined || data.group === null || data.group === userGroup) {
        if (["open", "scale-stars", "multiple"].includes(data.type)) {
          questions.push({ id: doc.id, ...data });
        }
      }
    });

    if (questions.length === 0) {
      container.innerHTML = "<h2>Δεν υπάρχουν διαθέσιμες ερωτήσεις για την ομάδα σας.</h2>";
    } else {
      showQuestion(0);
    }

  } catch (err) {
    console.error("Σφάλμα φόρτωσης ερωτήσεων:", err);
    alert("Σφάλμα φόρτωσης ερωτήσεων.");
  }
}

// --- Timer ---
function startTimer() {
  let startTime = localStorage.getItem("quizStartTime");
  if (!startTime) {
    startTime = Date.now();
    localStorage.setItem("quizStartTime", startTime);
  } else startTime = parseInt(startTime);

  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = TIMER_TOTAL - elapsed;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerDisplay.textContent = "Χρόνος: 00:00";
      localStorage.removeItem("quizStartTime");
      submitQuiz();
      return;
    }

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timerDisplay.textContent = `Χρόνος: ${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, 1000);
}

// --- Κλείδωμα Quiz ---
function lockQuiz() {
  form.querySelectorAll("textarea, .stars span, input[type=radio], button").forEach(el => el.disabled = true);
}

// --- Εμφάνιση ερώτησης ---
function showQuestion(index) {
  currentIndex = index;
  const q = questions[index];
  container.innerHTML = "";

  const card = document.createElement("div");
  card.className = "question-card";
  card.style.minHeight = "180px";

  const qText = document.createElement("div");
  qText.className = "question-text";
  qText.textContent = q.text;
  card.appendChild(qText);

  if (q.type === "open") {
    const textarea = document.createElement("textarea");
    textarea.name = q.id;
    textarea.rows = 4;
    textarea.placeholder = "Γράψε την απάντησή σου εδώ...";
    textarea.value = answers[q.id] || "";
    card.appendChild(textarea);
  } 
  else if (q.type === "scale-stars") {
    const starsWrapper = document.createElement("div");
    starsWrapper.className = "stars-wrapper";
    const numStars = 5;
    const selected = parseInt(answers[q.id]) || 0;
    const starsDiv = document.createElement("div");
    starsDiv.className = "stars";

    for (let i = 1; i <= numStars; i++) {
      const star = document.createElement("span");
      star.textContent = i <= selected ? "★" : "☆";
      star.dataset.value = i;
      star.className = i <= selected ? "selected" : "";
      star.addEventListener("click", () => {
        answers[q.id] = i;
        showQuestion(currentIndex);
      });
      starsDiv.appendChild(star);
    }

    starsWrapper.appendChild(starsDiv);
    card.appendChild(starsWrapper);
  } 
  else if (q.type === "multiple") {
    const optionsDiv = document.createElement("div");
    optionsDiv.className = "options";

    q.options.forEach(opt => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = q.id;
      input.value = opt;
      if (answers[q.id] === opt) input.checked = true;

      input.addEventListener("change", () => {
        answers[q.id] = opt;
      });

      label.appendChild(input);
      label.appendChild(document.createTextNode(opt));
      optionsDiv.appendChild(label);
    });

    card.appendChild(optionsDiv);
  }

  container.appendChild(card);
  renderNavigation();
  updateProgress();
  updateSubmitButton();
}

// --- Navigation buttons ---
function renderNavigation() {
  const nav = document.createElement("div");
  nav.style.display = "flex";
  nav.style.justifyContent = "space-between";
  nav.style.marginTop = "25px";

  if (currentIndex > 0) {
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.textContent = "⬅ Προηγούμενο";
    prevBtn.className = "nav-btn prev";
    prevBtn.onclick = () => saveAnswerAndMove(-1);
    nav.appendChild(prevBtn);
  }

  if (currentIndex < questions.length - 1) {
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.textContent = "Επόμενο ➡";
    nextBtn.className = "nav-btn next";
    nextBtn.onclick = () => saveAnswerAndMove(1);
    nav.appendChild(nextBtn);
  }

  container.appendChild(nav);
}

// --- Submit button εμφάνιση ---
function updateSubmitButton() {
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.style.display = (currentIndex === questions.length - 1) ? "block" : "none";
}

// --- Save απάντησης ---
function saveAnswerAndMove(step) {
  const q = questions[currentIndex];

  if (q.type === "open") {
    const textarea = form.querySelector(`textarea[name="${q.id}"]`);
    if (textarea) answers[q.id] = textarea.value.trim();
  }

  if (step !== 0) showQuestion(currentIndex + step);
}

// --- Progress bar ---
function updateProgress() {
  const percent = ((currentIndex + 1) / questions.length) * 100;
  progressBar.style.width = `${percent}%`;
}

// --- Υποβολή Quiz + Αναλυτικά Αποτελέσματα ---
function submitQuiz() {
  saveAnswerAndMove(0);
  lockQuiz();
  clearInterval(timerInterval);

  let correctCount = 0;
  let multipleCount = 0;

  // Υπολογισμός αποτελεσμάτων
  questions.forEach(q => {
    if (q.type === "multiple") {
      multipleCount++;
      const userAnswer = answers[q.id];
      const correct = q.correctAnswer;
      if (userAnswer && correct && userAnswer === correct) correctCount++;
    }
  });

  const scorePercent = multipleCount > 0 ? Math.round((correctCount / multipleCount) * 100) : 0;
  const passed = scorePercent >= 80;

  // --- Εμφάνιση συνολικών αποτελεσμάτων ---
  container.innerHTML = `
    <div class="result-card" style="
      text-align:center;
      background: rgba(255,255,255,0.15);
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
      animation: fadeIn 0.8s ease;
    ">
      <h2>Αποτελέσματα Ερωτηματολογίου</h2>
      <p style="font-size:22px;margin-top:20px;">Σωστές απαντήσεις: ${correctCount} / ${multipleCount}</p>
      <h3 style="font-size:28px;margin-top:10px;">Ποσοστό: <strong>${scorePercent}%</strong></h3>
      <h2 style="
        color:${passed ? 'lightgreen' : 'red'};
        font-size:32px;
        margin-top:20px;
      ">
        ${passed ? '✅ Επιτυχία' : '❌ Αποτυχία'}
      </h2>
      <button id="toggle-results" style="
        margin-top:30px;
        padding:10px 20px;
        border:none;
        border-radius:10px;
        background:linear-gradient(135deg,#00c6ff,#0072ff);
        color:#fff;
        font-size:16px;
        cursor:pointer;
        transition:0.3s;
      ">📄 Προβολή Αναλυτικών Αποτελεσμάτων</button>
    </div>
    <div id="detailed-results" style="margin-top:40px; display:none;"></div>
  `;

  // --- Αναλυτικά αποτελέσματα ---
  const detailsDiv = document.getElementById("detailed-results");
  detailsDiv.innerHTML = "<h3 style='text-align:center;margin-bottom:20px;'>Αναλυτικά Αποτελέσματα</h3>";

  questions.forEach(q => {
    const userAnswer = answers[q.id] ?? "—";
    const correctAnswer = q.correctAnswer ?? null;

    let isCorrect = false;
    if (q.type === "multiple" && correctAnswer) {
      isCorrect = userAnswer === correctAnswer;
    }

    const qDiv = document.createElement("div");
    qDiv.className = "question-review";
    qDiv.style = `
      background: rgba(255,255,255,0.12);
      padding: 18px 22px;
      border-radius: 14px;
      margin-bottom: 15px;
      border-left: 6px solid ${isCorrect ? 'lightgreen' : q.type === 'multiple' ? 'red' : '#0072ff'};
      box-shadow: 0 3px 10px rgba(0,0,0,0.2);
    `;

    if (q.type === "multiple") {
      qDiv.innerHTML = `
        <p style="font-size:18px;font-weight:600;margin-bottom:8px;">${q.text}</p>
        <p><strong>Η απάντησή σου:</strong> <span style="color:${isCorrect ? 'lightgreen' : 'red'}">${userAnswer}</span></p>
        <p><strong>Σωστή απάντηση:</strong> <span style="color:gold">${correctAnswer}</span></p>
      `;
    } else if (q.type === "open") {
      qDiv.innerHTML = `
        <p style="font-size:18px;font-weight:600;margin-bottom:8px;">${q.text}</p>
        <p><strong>Η απάντησή σου:</strong></p>
        <div style="background:rgba(255,255,255,0.1);padding:10px;border-radius:10px;color:#fff;margin-top:5px;">${userAnswer || "(καμία απάντηση)"}</div>
      `;
    } else if (q.type === "scale-stars") {
      const stars = '★'.repeat(userAnswer) + '☆'.repeat(5 - userAnswer);
      qDiv.innerHTML = `
        <p style="font-size:18px;font-weight:600;margin-bottom:8px;">${q.text}</p>
        <p><strong>Η αξιολόγησή σου:</strong> <span style="font-size:24px;color:gold">${stars}</span></p>
      `;
    }

    detailsDiv.appendChild(qDiv);
  });

  // --- Toggle εμφάνισης ---
  const toggleBtn = document.getElementById("toggle-results");
  toggleBtn.addEventListener("click", () => {
    const visible = detailsDiv.style.display === "block";
    detailsDiv.style.display = visible ? "none" : "block";
    toggleBtn.textContent = visible ? "📄 Προβολή Αναλυτικών Αποτελεσμάτων" : "📄 Απόκρυψη Αναλυτικών Αποτελεσμάτων";
  });

  // --- Αποθήκευση αποτελεσμάτων στη Firestore ---
  const user = auth.currentUser;
  if (user) {
    db.collection("results").add({
      uid: user.uid,
      email: user.email,
      answers,
      correctCount,
      totalMultiple: multipleCount,
      scorePercent,
      passed,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  progressBar.style.width = "100%";
  localStorage.removeItem("quizStartTime");
}

// --- Submit event ---
form.addEventListener("submit", e => {
  e.preventDefault();
  if (!confirm("Θέλεις σίγουρα να υποβάλεις τις απαντήσεις σου;")) return;
  submitQuiz();
});
