// Στοιχεία DOM
const container = document.getElementById("questions-container");
const form = document.getElementById("quiz-form");
const userEmailSpan = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const progressBar = document.getElementById("progress");

const TIMER_TOTAL = 10 * 60; // 10 λεπτά
const timerDisplay = document.createElement("div");
timerDisplay.style.marginBottom = "15px";
timerDisplay.style.fontWeight = "600";
form.prepend(timerDisplay);

let questions = [];
let currentIndex = 0;
let answers = {};
let timerInterval = null;

// --- Έλεγχος σύνδεσης χρήστη ---
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

// --- Φόρτωση ερωτήσεων από Firestore ---
function loadQuestions() {
    db.collection("questions").orderBy("order").get()
        .then(snapshot => {
            questions = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (["open", "scale-stars", "multiple"].includes(data.type)) {
                    questions.push({ id: doc.id, ...data });
                }
            });

            if (questions.length === 0) {
                container.innerHTML = "<h2>Δεν υπάρχουν ερωτήσεις διαθέσιμες.</h2>";
            } else {
                showQuestion(0);
            }
        })
        .catch(err => console.error("Σφάλμα φόρτωσης ερωτήσεων:", err));
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
    const msg = document.createElement("div");
    msg.textContent = "⏰ Ο χρόνος έληξε! Δεν μπορείτε να απαντήσετε πλέον.";
    msg.style.textAlign = "center";
    msg.style.fontSize = "18px";
    msg.style.fontWeight = "600";
    container.appendChild(msg);
}

// --- Εμφάνιση μιας ερώτησης ---
function showQuestion(index) {
    currentIndex = index;
    const q = questions[index];
    container.innerHTML = "";

    const card = document.createElement("div");
    card.className = "question-card";
    card.style.minHeight = "180px";

    // Κείμενο ερώτησης
    const qText = document.createElement("div");
    qText.className = "question-text";
    qText.textContent = q.text;
    card.appendChild(qText);

    // Δημιουργία επιλογών
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

// --- Κουμπιά πλοήγησης ---
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

// --- Εμφάνιση/απόκρυψη submit button ---
function updateSubmitButton() {
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.style.display = (currentIndex === questions.length - 1) ? "block" : "none";
}

// --- Αποθήκευση απάντησης πριν μετάβαση ---
function saveAnswerAndMove(step) {
    const q = questions[currentIndex];

    if (q.type === "open") {
        const textarea = form.querySelector(`textarea[name="${q.id}"]`);
        if (textarea) answers[q.id] = textarea.value.trim();
    }
    // multiple & scale-stars αποθηκεύεται onChange/onClick

    if (step !== 0) showQuestion(currentIndex + step);
}

// --- Progress bar ---
function updateProgress() {
    const percent = ((currentIndex + 1) / questions.length) * 100;
    progressBar.style.width = `${percent}%`;
}

// --- Υποβολή απαντήσεων ---
function submitQuiz() {
    saveAnswerAndMove(0);
    lockQuiz();

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
            clearInterval(timerInterval);
            localStorage.removeItem("quizStartTime");
        }).catch(err => console.error("Σφάλμα αποθήκευσης:", err));
    }
}

// Submit από button
form.addEventListener("submit", e => {
    e.preventDefault();
    if (!confirm("Θέλεις σίγουρα να υποβάλεις τις απαντήσεις σου;")) return;
    submitQuiz();
});
