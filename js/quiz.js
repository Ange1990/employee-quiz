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
let quizSubmitted = false;

// --- Έλεγχος σύνδεσης χρήστη ---
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  userEmailSpan.textContent = `Καλώς ήρθες, ${user.email}`;
  container.innerHTML = "<h3 style='text-align:center;'>Φόρτωση δεδομένων...</h3>";

  try {
    // 🔍 Έλεγχος αν έχει ήδη κάνει quiz
    const resultSnap = await db.collection("results")
      .where("uid", "==", user.uid)
      .limit(1)
      .get();

    if (!resultSnap.empty) {
      const data = resultSnap.docs[0].data();

      // Αν έχει υπολογισμένο score, σημαίνει πως έχει τελειώσει το quiz
      if (data.scorePercent !== undefined && data.scorePercent !== null) {
        quizSubmitted = true;
        answers = data.answers || {};
        showResultsScreen(
          data.correctCount,
          data.totalMultiple,
          data.scorePercent,
          data.passed
        );
        return; // Δεν φορτώνουμε ξανά τις ερωτήσεις
      }
    }

    // Αν δεν έχει κάνει quiz, κανονικά ξεκινά
    await loadQuestions();
    startTimer();

  } catch (err) {
    console.error("Σφάλμα φόρτωσης δεδομένων:", err);
    container.innerHTML = "<p style='text-align:center;color:red;'>⚠️ Σφάλμα φόρτωσης δεδομένων. Δοκιμάστε ξανά.</p>";
  }
});

// --- Logout ---
logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => {
    // Δεν καθαρίζουμε το quizStartTime για να συνεχίσει αν ξαναμπεί
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
    container.innerHTML = "<p style='text-align:center;color:red;'>⚠️ Σφάλμα φόρτωσης ερωτήσεων.</p>";
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
  } else if (q.type === "scale-stars") {
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
  } else if (q.type === "multiple") {
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

// --- Υποβολή Quiz ---
function submitQuiz() {
  saveAnswerAndMove(0);
  lockQuiz();
  clearInterval(timerInterval);

  let correctCount = 0;
  let multipleCount = 0;

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

  showResultsScreen(correctCount, multipleCount, scorePercent, passed);

  if (!quizSubmitted) {
    quizSubmitted = true;
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
    localStorage.removeItem("quizStartTime");
  }
}

// --- Εμφάνιση συνολικών αποτελεσμάτων ---
function showResultsScreen(correctCount, multipleCount, scorePercent, passed) {
  container.innerHTML = `
    <div class="result-card" style="text-align:center;background:rgba(255,255,255,0.15);
    padding:40px;border-radius:20px;box-shadow:0 6px 20px rgba(0,0,0,0.3);animation:fadeIn 0.8s ease;">
      <h2>Αποτελέσματα Ερωτηματολογίου</h2>
      <p style="font-size:22px;margin-top:20px;">Σωστές απαντήσεις: ${correctCount} / ${multipleCount}</p>
      <h3 style="font-size:28px;margin-top:10px;">Ποσοστό: <strong>${scorePercent}%</strong></h3>
      <h2 style="color:${passed ? 'lightgreen' : 'red'};font-size:32px;margin-top:20px;">
        ${passed ? '✅ Επιτυχία' : '❌ Αποτυχία'}
      </h2>
      <button id="view-answers" type="button" class="nav-btn submit" style="margin-top:25px;">
        📄 Προβολή Αναλυτικών Αποτελεσμάτων
      </button>
    </div>
  `;

  document.getElementById("view-answers").addEventListener("click", showDetailedResults);
}

// --- Προβολή αναλυτικών απαντήσεων ---
function showDetailedResults() {
  container.innerHTML = "<h2 style='text-align:center;margin-bottom:25px;'>Αναλυτικά Αποτελέσματα</h2>";

  questions.forEach(q => {
    const userAnswer = answers[q.id];
    const correct = q.correctAnswer || null;
    const isCorrect = q.type === "multiple" && userAnswer === correct;

    const card = document.createElement("div");
    card.className = "question-card";

    const qText = document.createElement("div");
    qText.className = "question-text";
    qText.textContent = q.text;
    card.appendChild(qText);

    if (q.type === "open") {
      card.innerHTML += `<p><strong>Η απάντησή σου:</strong> ${userAnswer || "<em>Δεν απάντησες</em>"}</p>`;
    } else if (q.type === "scale-stars") {
      card.innerHTML += `<p><strong>Η βαθμολογία σου:</strong> ${userAnswer ? userAnswer + " ⭐" : "<em>Δεν βαθμολόγησες</em>"}</p>`;
    } else if (q.type === "multiple") {
      card.innerHTML += `
        <p><strong>Η απάντησή σου:</strong> ${userAnswer || "<em>Δεν απάντησες</em>"} ${userAnswer ? (isCorrect ? "✅" : "❌") : ""}
        </p>
        ${correct ? `<p><strong>Σωστή απάντηση:</strong> ${correct}</p>` : ""}
      `;
    }

    container.appendChild(card);
  });

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = "⬅ Επιστροφή στα αποτελέσματα";
  backBtn.className = "nav-btn prev";
  backBtn.style.marginTop = "25px";
  backBtn.onclick = () => showResultsScreen(
    questions.filter(q => q.type === "multiple" && answers[q.id] === q.correctAnswer).length,
    questions.filter(q => q.type === "multiple").length,
    Math.round(
      (questions.filter(q => q.type === "multiple" && answers[q.id] === q.correctAnswer).length /
        questions.filter(q => q.type === "multiple").length) * 100
    ),
    Math.round(
      (questions.filter(q => q.type === "multiple" && answers[q.id] === q.correctAnswer).length /
        questions.filter(q => q.type === "multiple").length) * 100
    ) >= 80
  );
  container.appendChild(backBtn);
}

// --- Submit event ---
form.addEventListener("submit", e => {
  e.preventDefault();
  if (!confirm("Θέλεις σίγουρα να υποβάλεις τις απαντήσεις σου;")) return;
  submitQuiz();
});
