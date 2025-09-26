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

// --- Φόρτωση ερωτήσεων από Firestore ---
function loadQuestions() {
    db.collection("questions").get()
        .then(snapshot => {
            questions = [];
            snapshot.forEach(doc => questions.push({ id: doc.id, ...doc.data() }));
            showQuestion(0);
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

    // Κείμενο ερώτησης
    const qText = document.createElement("div");
    qText.className = "question-text";
    qText.textContent = q.text;
    card.appendChild(qText);

    // Δημιουργία επιλογών
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
    } else if (q.type === "multi" && Array.isArray(q.options)) {
        q.options.forEach(opt => {
            const label = document.createElement("label");
            const checked = (answers[q.id] || []).includes(opt) ? "checked" : "";
            label.innerHTML = `<input type="checkbox" name="${q.id}" value="${opt}" ${checked}/> ${opt}`;
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
    } else if (q.type === "number") {
        const input = document.createElement("input");
        input.type = "number";
        input.name = q.id;
        input.value = answers[q.id] || "";
        card.appendChild(input);
    } else if (q.type === "scale") {
        const scaleWrapper = document.createElement("div");
        scaleWrapper.style.marginTop = "20px";

        const label = document.createElement("label");
        label.textContent = "Επίλεξε τιμή από 1 έως 5:";
        scaleWrapper.appendChild(label);

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = 1;
        slider.max = 5;
        slider.step = 1;
        slider.name = q.id;
        slider.value = answers[q.id] || 3; // default στο 3
        slider.style.width = "100%";
        scaleWrapper.appendChild(slider);

        card.appendChild(scaleWrapper);
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

    if (q.type === "mcq") {
        const selected = form.querySelector(`input[name="${q.id}"]:checked`);
        if (selected) answers[q.id] = selected.value;
    } else if (q.type === "multi") {
        const selected = [...form.querySelectorAll(`input[name="${q.id}"]:checked`)];
        answers[q.id] = selected.map(el => el.value);
    } else if (q.type === "open") {
        const textarea = form.querySelector(`textarea[name="${q.id}"]`);
        if (textarea) answers[q.id] = textarea.value.trim();
    } else if (q.type === "number") {
        const input = form.querySelector(`input[name="${q.id}"]`);
        if (input) answers[q.id] = input.value;
    } else if (q.type === "scale") {
        const slider = form.querySelector(`input[name="${q.id}"]`);
        if (slider) answers[q.id] = parseInt(slider.value);
    }

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
