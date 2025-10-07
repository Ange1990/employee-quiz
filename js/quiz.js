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

// --- DOM elements ---
const userEmailSpan = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const form = document.getElementById("quiz-form");
const container = document.getElementById("questions-container");

// --- Timer κάτω από logout ---
const timerDisplay = document.createElement("div");
timerDisplay.id = "timer";
timerDisplay.style.color = "#fff";
timerDisplay.style.fontWeight = "600";
timerDisplay.style.marginTop = "8px";
logoutBtn.parentElement.appendChild(timerDisplay);

const TIMER_TOTAL = 10 * 60; // 10 λεπτά
let timerInterval = null;

// --- Quiz State ---
let questions = [];
let currentIndex = 0;
let answers = {};

// --- Έλεγχος σύνδεσης ---
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        userEmailSpan.textContent = `Καλώς ήρθες, ${user.email}`;
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

// --- Load Questions ---
function loadQuestions() {
    db.collection("questions").orderBy("order").get()
      .then(snapshot => {
        questions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === "open" || data.type === "scale-stars") {
                questions.push({ id: doc.id, ...data });
            }
        });

        if (questions.length === 0) {
            container.innerHTML = "<h2>Δεν υπάρχουν ερωτήσεις διαθέσιμες.</h2>";
        } else {
            showQuestion(0);
        }
      })
      .catch(err => console.error("Σφάλμα φόρτωσης:", err));
}

// --- Show Question ---
function showQuestion(index) {
    currentIndex = index;
    const q = questions[index];
    container.innerHTML = "";

    const card = document.createElement("div");
    card.className = "question-card";
    card.style.minHeight = "180px";

    // Question text
    const qText = document.createElement("div");
    qText.className = "question-text";
    qText.textContent = q.text;
    card.appendChild(qText);

    // Open or Stars
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

            star.addEventListener("mouseover", () => {
                for (let j = 0; j < numStars; j++) {
                    starsDiv.children[j].textContent = j < i ? "★" : "☆";
                    starsDiv.children[j].style.transform = j < i ? "scale(1.3)" : "scale(1)";
                }
            });

            star.addEventListener("mouseout", () => {
                const sel = answers[q.id] || 0;
                for (let j = 0; j < numStars; j++) {
                    starsDiv.children[j].textContent = j < sel ? "★" : "☆";
                    starsDiv.children[j].style.transform = "scale(1)";
                }
            });

            star.addEventListener("click", () => {
                answers[q.id] = i;
                showQuestion(currentIndex);
            });

            starsDiv.appendChild(star);
        }

        starsWrapper.appendChild(starsDiv);

        const labelsDiv = document.createElement("div");
        labelsDiv.className = "stars-labels";
        for (let i = 1; i <= numStars; i++) {
            const lbl = document.createElement("span");
            lbl.textContent = i;
            labelsDiv.appendChild(lbl);
        }
        starsWrapper.appendChild(labelsDiv);

        card.appendChild(starsWrapper);
    }

    container.appendChild(card);
    renderNavigation();
    updateProgress();
    updateSubmitButton();
}

// --- Navigation ---
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

// --- Submit button visibility ---
function updateSubmitButton() {
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.style.display = (currentIndex === questions.length - 1) ? "block" : "none";
}

// --- Save answer and move ---
function saveAnswerAndMove(step) {
    const q = questions[currentIndex];
    if (!q) return;

    if (q.type === "open") {
        const textarea = form.querySelector(`textarea[name="${q.id}"]`);
        if (textarea) answers[q.id] = textarea.value.trim();
    }

    if (step !== 0) showQuestion(currentIndex + step);
}

// --- Progress bar ---
function updateProgress() {
    const percent = ((currentIndex + 1) / questions.length) * 100;
    document.getElementById("progress").style.width = `${percent}%`;
}

// --- Submit Answers ---
form.addEventListener("submit", e => {
    e.preventDefault();
    saveAnswerAndMove(0);

    if (!confirm("Θέλεις σίγουρα να υποβάλεις τις απαντήσεις σου;")) return;

    sendAnswersAndLock();
});

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
            sendAnswersAndLock();
            return;
        }

        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        timerDisplay.textContent = `Χρόνος: ${minutes}:${seconds.toString().padStart(2,"0")}`;
    }, 1000);
}

// --- Send answers and lock ---
function sendAnswersAndLock() {
    const user = auth.currentUser;
    if (!user) return;

    saveCurrentAnswer();

    db.collection("results").add({
        uid: user.uid,
        email: user.email,
        answers: answers,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        lockQuiz();
    }).catch(err => console.error("Σφάλμα αποστολής:", err));
}

// --- Lock quiz ---
function lockQuiz() {
    form.querySelectorAll("textarea, .stars span, button").forEach(el => el.disabled = true);
    const msg = document.createElement("div");
    msg.textContent = "⏰ Ο χρόνος έληξε! Οι απαντήσεις σας υποβλήθηκαν αυτόματα.";
    msg.style.textAlign = "center";
    msg.style.fontSize = "18px";
    msg.style.fontWeight = "600";
    container.appendChild(msg);
}

// --- Save current answer ---
function saveCurrentAnswer() {
    const q = questions[currentIndex];
    if (!q) return;
    if (q.type === "open") {
        const textarea = form.querySelector(`textarea[name="${q.id}"]`);
        if (textarea) answers[q.id] = textarea.value.trim();
    }
    // scale-stars αποθηκεύεται onClick
}
