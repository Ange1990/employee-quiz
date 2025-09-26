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
  auth.signOut().then(() => window.location.href = "index.html");
});

// Φόρτωση ερωτήσεων από Firestore
function loadQuestions() {
  db.collection("questions").orderBy("order").get().then(snapshot => {
    questions = [];
    snapshot.forEach(doc => questions.push({ id: doc.id, ...doc.data() }));
    if (questions.length > 0) showQuestion(0);
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

  // MCQ
  if (q.type === "mcq" && Array.isArray(q.options)) {
    q.options.forEach(opt => {
      const label = document.createElement("label");
      const checked = answers[q.id] === opt ? "checked" : "";
      label.innerHTML = `<input type="radio" name="${q.id}" value="${opt}" ${checked}/> ${opt}`;
      optionsDiv.appendChild(label);
    });
    card.appendChild(optionsDiv);
  }
  // Multi-select
  else if (q.type === "multi" && Array.isArray(q.options)) {
    q.options.forEach(opt => {
      const label = document.createElement("label");
      const checked = (answers[q.id] || []).includes(opt) ? "checked" : "";
      label.innerHTML = `<input type="checkbox" name="${q.id}" value="${opt}" ${checked}/> ${opt}`;
      optionsDiv.appendChild(label);
    });
    card.appendChild(optionsDiv);
  }
  // Open-ended
  else if (q.type === "open") {
    const textarea = document.createElement("textarea");
    textarea.name = q.id;
    textarea.rows = 4;
    textarea.placeholder = "Γράψε την απάντησή σου εδώ...";
    textarea.value = answers[q.id] || "";
    card.appendChild(textarea);
  }
  // Number input
  else if (q.type === "number") {
    const input = document.createElement("input");
    input.type = "number";
    input.name = q.id;
    input.value = answers[q.id] ?? "";
    card.appendChild(input);
  }
  // Scale 1-5 slider με animated tooltip
  else if (q.type === "scale") {
    const scaleWrapper = document.createElement("div");
    scaleWrapper.style.position = "relative";
    scaleWrapper.style.width = "100%";
    scaleWrapper.style.marginTop = "20px";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.name = q.id;
    slider.min = 1;
    slider.max = 5;
    slider.step = 1;
    slider.value = answers[q.id] || 3;
    slider.style.width = "100%";
    slider.style.height = "12px";
    slider.style.borderRadius = "6px";
    slider.style.appearance = "none";
    slider.style.background = getSliderGradient(slider.value);

    const tooltip = document.createElement("div");
    tooltip.textContent = slider.value;
    tooltip.style.position = "absolute";
    tooltip.style.top = "-30px";
    tooltip.style.padding = "5px 10px";
    tooltip.style.borderRadius = "6px";
    tooltip.style.backgroundColor = getTooltipColor(slider.value);
    tooltip.style.color = "#fff";
    tooltip.style.fontWeight = "600";
    tooltip.style.transform = "translateX(-50%)";
    tooltip.style.transition = "all 0.2s ease";

    updateTooltipPosition(slider, tooltip);

    slider.addEventListener("input", () => {
      tooltip.textContent = slider.value;
      slider.style.background = getSliderGradient(slider.value);
      tooltip.style.backgroundColor = getTooltipColor(slider.value);
      updateTooltipPosition(slider, tooltip);
    });

    scaleWrapper.appendChild(tooltip);
    scaleWrapper.appendChild(slider);
    card.appendChild(scaleWrapper);

    function getSliderGradient(val) {
      const percent = ((val - 1) / 4) * 100;
      return `linear-gradient(to right, #ff4b2b ${percent}%, #ffd700 ${percent}%, #00c853 ${percent}%)`;
    }

    function getTooltipColor(val) {
      if (val <= 2) return "#ff4b2b";
      if (val == 3) return "#ffd700";
      return "#00c853";
    }

    function updateTooltipPosition(slider, tooltip) {
      const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
      tooltip.style.left = `${percent}%`;
    }
  }
  // Fallback για τύπους που δεν αναγνωρίζονται
  else {
    const unknown = document.createElement("div");
    unknown.textContent = "Αυτός ο τύπος ερώτησης δεν υποστηρίζεται.";
    card.appendChild(unknown);
  }

  container.appendChild(card);

  renderNavigation();
  updateProgress();
  updateSubmitButton();
}

// Navigation buttons
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

// Εμφάνιση/απόκρυψη submit button
function updateSubmitButton() {
  const submitBtn = form.querySelector('button[type="submit"]');
  if (!submitBtn) return;
  submitBtn.style.display = currentIndex === questions.length - 1 ? "block" : "none";
}

// Αποθήκευση απάντησης πριν μεταβούμε στην επόμενη ερώτηση
function saveAnswerAndMove(step) {
  const q = questions[currentIndex];

  try {
    if (q.type === "mcq") {
      const selected = form.querySelector(`input[name="${q.id}"]:checked`);
      if (selected) answers[q.id] = selected.value;
    } else if (q.type === "multi") {
      const selected = [...form.querySelectorAll(`input[name="${q.id}"]:checked`)];
      answers[q.id] = selected.length ? selected.map(el => el.value) : [];
    } else if (q.type === "open") {
      const textarea = form.querySelector(`textarea[name="${q.id}"]`);
      if (textarea) answers[q.id] = textarea.value.trim();
    } else if (q.type === "number") {
      const input = form.querySelector(`input[name="${q.id}"]`);
      if (input) answers[q.id] = parseFloat(input.value) || "";
    } else if (q.type === "scale") {
      const input = form.querySelector(`input[name="${q.id}"]`);
      if (input) answers[q.id] = parseInt(input.value) || 3;
    }
  } catch (err) {
    console.error("Σφάλμα στην αποθήκευση απάντησης:", err);
  }

  if (step !== 0) showQuestion(currentIndex + step);
}

// Progress bar
function updateProgress() {
  if (questions.length === 0) return;
  const percent = ((currentIndex + 1) / questions.length) * 100;
  progressBar.style.width = `${percent}%`;
}

// Υποβολή απαντήσεων
form.addEventListener("submit", (e) => {
  e.preventDefault();
  saveAnswerAndMove(0);

  if (!confirm("Θέλεις σίγουρα να υποβάλεις τις απαντήσεις σου;")) return;

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
