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
        starContainer.dataset.name = doc.id;
        starContainer.dataset.selected = 0;

        for (let i = 1; i <= 5; i++) {
          const star = document.createElement("span");
          star.className = "star";
          star.innerHTML = "★";
          star.dataset.value = i;

          star.addEventListener("mouseenter", () => {
            highlightStars(starContainer, i);
          });
          star.addEventListener("mouseleave", () => {
            highlightStars(starContainer, parseInt(starContainer.dataset.selected));
          });
          star.addEventListener("click", () => {
            starContainer.dataset.selected = i;
            highlightStars(starContainer, i);
          });

          starContainer.appendChild(star);
        }

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

  // Απαντήσεις text
  quizForm.querySelectorAll("textarea").forEach(t => {
    answers[t.name] = t.value.trim();
  });

  // Απαντήσεις αστέρια
  quizForm.querySelectorAll(".stars").forEach(div => {
    answers[div.dataset.name] = div.dataset.selected || 0;
  });

  db.collection("answers").add({
    user: user.email,
    timestamp: new Date(),
    answers
  }).then(() => {
    messageDiv.textContent = "✅ Οι απαντήσεις σας υποβλήθηκαν!";
    disableQuiz();
    clearInterval(timerInterval);
    localStorage.removeItem("quizStartTime");
  });
});

// --- Highlight αστέρια ---
function highlightStars(container, count) {
  const stars = container.querySelectorAll(".star");
  stars.forEach((s, i) => {
    if (i < count) s.classList.add("selected");
    else s.classList.remove("selected");
  });
}

// --- Αντίστροφη Μέτρηση 10 Λεπτών ---
function startTimer() {
  const totalSeconds = 10 * 60;
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
    timerDisplay.textContent = `Υπόλοιπο χρόνος: ${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
  }, 1000);
}

// --- Κλείδωμα Quiz όταν τελειώσει ο χρόνος ---
function lockQuiz() {
  disableQuiz();
  const msg = document.createElement("div");
  msg.textContent = "⏰ Ο χρόνος έληξε! Δεν μπορείτε να απαντήσετε πλέον.";
  msg.style.textAlign = "center";
  msg.style.fontSize = "18px";
  msg.style.marginTop = "20px";
  msg.style.fontWeight = "600";
  quizForm.appendChild(msg);
}

// --- Απενεργοποίηση Quiz ---
function disableQuiz() {
  quizForm.querySelectorAll("textarea, .star").forEach(el => el.disabled = true);
  submitBtn.disabled = true;
}
