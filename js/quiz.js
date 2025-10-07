// --- Firebase Ρυθμίσεις ---
const firebaseConfig = {
  apiKey: "AIzaSyD_MPxHrzLs2vd677t3Nr8vXKFtQEuLI2g",
  authDomain: "quiz-aa480.firebaseapp.com",
  projectId: "quiz-aa480",
  storageBucket: "quiz-aa480.appspot.com",
  messagingSenderId: "913659290274",
  appId: "1:913659290274:web:412b6ca878f15d094f6dfb"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const userEmailSpan = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const quizForm = document.getElementById("quiz-form");
const submitBtn = document.getElementById("submit-btn");
const messageDiv = document.getElementById("message");
const timerDisplay = document.getElementById("timer");

let timerInterval = null;

// --- Έλεγχος Σύνδεσης ---
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    userEmailSpan.textContent = user.email;
    loadQuestions();
    startTimer();
  }
});

// --- Logout ---
logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => {
    localStorage.removeItem("quizStartTime");
    window.location.href = "index.html";
  });
});

// --- Φόρτωση Ερωτήσεων ---
function loadQuestions() {
  db.collection("questions").orderBy("order").get().then(snapshot => {
    quizForm.innerHTML = "";
    snapshot.forEach(doc => {
      const q = doc.data();
      const questionDiv = document.createElement("div");
      questionDiv.className = "question";

      const label = document.createElement("h3");
      label.textContent = q.text;
      questionDiv.appendChild(label);

      if (q.type === "open") {
        const textarea = document.createElement("textarea");
        textarea.name = doc.id;
        textarea.required = true;
        questionDiv.appendChild(textarea);
      }

      if (q.type === "scale-stars") {
        const starContainer = document.createElement("div");
        starContainer.className = "stars";
        for (let i = 1; i <= 5; i++) {
          const star = document.createElement("span");
          star.className = "star";
          star.innerHTML = "★";
          star.dataset.value = i;
          star.addEventListener("click", () => {
            starContainer.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
            for (let j = 0; j < i; j++) starContainer.children[j].classList.add("selected");
            starContainer.dataset.selected = i;
          });
          starContainer.appendChild(star);
        }
        starContainer.dataset.name = doc.id;
        questionDiv.appendChild(starContainer);
      }

      quizForm.appendChild(questionDiv);
    });
  });
}

// --- Υποβολή ---
submitBtn.addEventListener("click", e => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const answers = {};
  quizForm.querySelectorAll("textarea").forEach(t => {
    answers[t.name] = t.value.trim();
  });
  quizForm.querySelectorAll(".stars").forEach(div => {
    answers[div.dataset.name] = div.dataset.selected || "";
  });

  db.collection("answers").add({
    user: user.email,
    timestamp: new Date(),
    answers
  }).then(() => {
    messageDiv.textContent = "✅ Οι απαντήσεις σας υποβλήθηκαν!";
    submitBtn.disabled = true;
    quizForm.querySelectorAll("input, textarea, button, .star").forEach(el => el.disabled = true);
    clearInterval(timerInterval);
    localStorage.removeItem("quizStartTime");
  });
});

// --- Αντίστροφη Μέτρηση 10 Λεπτών με αποθήκευση ---
function startTimer() {
  const totalSeconds = 10 * 60; // 10 λεπτά
  const storedStart = localStorage.getItem("quizStartTime");
  let startTime;

  if (storedStart) {
    startTime = new Date(parseInt(storedStart));
  } else {
    startTime = new Date();
    localStorage.setItem("quizStartTime", startTime.getTime());
  }

  timerInterval = setInterval(() => {
    const now = new Date();
    const elapsed = Math.floor((now - startTime) / 1000);
    const remaining = totalSeconds - elapsed;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      lockQuiz();
      localStorage.removeItem("quizStartTime");
      timerDisplay.textContent = "Υπόλοιπο χρόνος: 00:00";
      return;
    }

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timerDisplay.textContent = `Υπόλοιπο χρόνος: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

// --- Κλείδωμα Quiz όταν τελειώσει ο χρόνος ---
function lockQuiz() {
  quizForm.querySelectorAll("input, textarea, button, .star").forEach(el => el.disabled = true);
  submitBtn.disabled = true;
  const msg = document.createElement("div");
  msg.textContent = "⏰ Ο χρόνος έληξε! Δεν μπορείτε να απαντήσετε πλέον.";
  msg.style.textAlign = "center";
  msg.style.fontSize = "18px";
  msg.style.marginTop = "20px";
  msg.style.fontWeight = "600";
  quizForm.appendChild(msg);
}
