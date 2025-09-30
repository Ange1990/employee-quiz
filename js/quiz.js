// Στοιχεία DOM
const container = document.getElementById("questions-container");
const form = document.getElementById("quiz-form");
const userEmailSpan = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const progressBar = document.getElementById("progress");

// Κατάσταση Quiz
let questions = [];
let currentIndex = 0;
let answers = {};

// --- Έλεγχος σύνδεσης χρήστη ---
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        userEmailSpan.textContent = `Καλώς ήρθες, ${user.email}`;
        loadQuestions();
    }
});

// --- Logout ---
logoutBtn.addEventListener("click", () => {
    auth.signOut().then(() => window.location.href = "index.html");
});

// --- Φόρτωση ερωτήσεων από Firestore με ταξινόμηση order ---
function loadQuestions() {
    db.collection("questions").orderBy("order").get()
        .then(snapshot => {
            questions = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Μόνο open και scale-stars
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
        .catch(err => console.error("Σφάλμα φόρτωσης ερωτήσεων:", err));
}

// --- Εμφάνιση μιας ερώτησης ---
function showQuestion(index) {
    currentIndex = index;
    const q = questions[index];
    container.innerHTML = "";

    const card = document.createElement("div");
    card.className = "question-card";
    card.style.minHeight = "180px"; // Σταθερό ύψος για όλες τις κάρτες

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
            
            // Hover effect
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

        // Αριθμοί κάτω από τα αστεράκια
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
    // scale-stars αποθηκεύεται onClick

    if (step !== 0) showQuestion(currentIndex + step);
}

// --- Progress bar ---
function updateProgress() {
    const percent = ((currentIndex + 1) / questions.length) * 100;
    progressBar.style.width = `${percent}%`;
}

// --- Υποβολή απαντήσεων ---
form.addEventListener("submit", e => {
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
