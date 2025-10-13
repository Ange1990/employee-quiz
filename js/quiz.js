// quiz.js

let questions = [];
let currentQuestionIndex = 0;

const container = document.getElementById("questions-container");
const userEmailSpan = document.getElementById("user-email");

// Έλεγχος σύνδεσης και φόρτωση ερωτήσεων
auth.onAuthStateChanged(async user => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        // Παίρνουμε το group του χρήστη
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (!userDoc.exists) throw new Error("Δεν βρέθηκε χρήστης");
        const userGroup = userDoc.data().group || 0; // default 0 αν δεν υπάρχει

        userEmailSpan.textContent = `Καλώς ήρθες, ${user.email}`;

        // Φόρτωση ερωτήσεων μόνο της ομάδας του χρήστη
        await loadQuestions(userGroup);
        startTimer();
    } catch (err) {
        console.error(err);
        alert("Σφάλμα στη φόρτωση των ερωτήσεων.");
    }
});

// Φόρτωση ερωτήσεων με βάση το group
async function loadQuestions(userGroup) {
    try {
        const snapshot = await db.collection("questions").orderBy("order").get();
        questions = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            // Αγνόησε ερωτήσεις χωρίς group ή που δεν ανήκουν στην ομάδα του χρήστη
            if (data.group === undefined) return;
            if (data.group !== userGroup) return;
            if (!["open","scale-stars","multiple"].includes(data.type)) return;

            questions.push({ id: doc.id, ...data });
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

// Εμφάνιση ερώτησης με βάση τον δείκτη
function showQuestion(index) {
    currentQuestionIndex = index;
    const q = questions[index];
    container.innerHTML = "";

    const card = document.createElement("div");
    card.className = "question-card";

    const textDiv = document.createElement("div");
    textDiv.className = "question-text";
    textDiv.textContent = q.text;
    card.appendChild(textDiv);

    // Εμφάνιση επιλογών
    const optionsDiv = document.createElement("div");
    optionsDiv.className = "options";

    if (q.type === "multiple" && q.options) {
        q.options.forEach((opt, i) => {
            const label = document.createElement("label");
            const input = document.createElement("input");
            input.type = "radio";
            input.name = "q" + index;
            input.value = opt;
            label.appendChild(input);
            label.appendChild(document.createTextNode(opt));
            optionsDiv.appendChild(label);
        });
    } else if (q.type === "scale-stars") {
        const starsWrapper = document.createElement("div");
        starsWrapper.className = "stars-wrapper";
        const stars = document.createElement("div");
        stars.className = "stars";
        for (let i = 1; i <= 5; i++) {
            const span = document.createElement("span");
            span.textContent = "★";
            span.dataset.value = i;
            span.addEventListener("click", () => selectStar(i, stars));
            stars.appendChild(span);
        }
        starsWrapper.appendChild(stars);
        optionsDiv.appendChild(starsWrapper);
    } else if (q.type === "open") {
        const textarea = document.createElement("textarea");
        textarea.name = "q" + index;
        optionsDiv.appendChild(textarea);
    }

    card.appendChild(optionsDiv);
    container.appendChild(card);
}

// Επιλογή αστέρων
function selectStar(value, starsDiv) {
    starsDiv.querySelectorAll("span").forEach(span => {
        if (span.dataset.value <= value) span.classList.add("selected");
        else span.classList.remove("selected");
    });
}

// Timer (προαιρετικό)
function startTimer() {
    // Υλοποίηση χρόνου αν θέλεις
}

// Υποβολή φόρμας
const quizForm = document.getElementById("quiz-form");
quizForm.addEventListener("submit", async e => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    const answers = {};

    questions.forEach((q, idx) => {
        const name = "q" + idx;
        const elem = quizForm.querySelector(`[name="${name}"]`);
        if (!elem) return;

        if (q.type === "open") answers[q.id] = elem.value.trim();
        else if (q.type === "multiple") {
            const checked = quizForm.querySelector(`[name="${name}"]:checked`);
            answers[q.id] = checked ? checked.value : "";
        } else if (q.type === "scale-stars") {
            const selectedStar = quizForm.querySelector(`[name="${name}"].selected`);
            answers[q.id] = selectedStar ? selectedStar.dataset.value : 0;
        }
    });

    try {
        await db.collection("results").add({
            userId: user.uid,
            timestamp: new Date(),
            answers
        });
        alert("Οι απαντήσεις σας υποβλήθηκαν!");
        quizForm.reset();
        container.innerHTML = "<h2>Το ερωτηματολόγιο ολοκληρώθηκε.</h2>";
    } catch (err) {
        console.error(err);
        alert("Σφάλμα υποβολής.");
    }
});
