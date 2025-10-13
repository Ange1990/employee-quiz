// quiz.js - πλήρης για πολλαπλές ομάδες

let questions = [];
let currentIndex = 0;
const container = document.getElementById("questions-container");
const progressBar = document.getElementById("progress");
const userEmailSpan = document.getElementById("user-email");

// --- Έλεγχος χρήστη ---
auth.onAuthStateChanged(async user => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (!userDoc.exists) throw new Error("Δεν βρέθηκε χρήστης");

        const userGroup = Number(userDoc.data().group);
        if (isNaN(userGroup)) throw new Error("Σφάλμα με την ομάδα χρήστη");

        userEmailSpan.textContent = `Καλώς ήρθες, ${user.email}`;
        loadQuestions(userGroup);
        startTimer(); // αν έχεις timer
    } catch (err) {
        console.error(err);
        container.innerHTML = "<h2>Σφάλμα στη φόρτωση των ερωτήσεων.</h2>";
    }
});

// --- Φόρτωση ερωτήσεων για την ομάδα ---
function loadQuestions(userGroup) {
    db.collection("questions")
      .where("group", "==", userGroup)
      .orderBy("order")
      .get()
      .then(snapshot => {
          questions = [];
          snapshot.forEach(doc => {
              const data = doc.data();
              if (data.type && ["open", "scale-stars", "multiple"].includes(data.type)) {
                  questions.push({ id: doc.id, ...data });
              }
          });

          if (questions.length === 0) {
              container.innerHTML = "<h2>Δεν υπάρχουν διαθέσιμες ερωτήσεις για την ομάδα σας.</h2>";
          } else {
              showQuestion(0);
          }
      })
      .catch(err => {
          console.error("Σφάλμα φόρτωσης ερωτήσεων:", err);
          container.innerHTML = "<h2>Σφάλμα φόρτωσης ερωτήσεων.</h2>";
      });
}

// --- Εμφάνιση ερώτησης ---
function showQuestion(index) {
    currentIndex = index;
    const q = questions[index];
    container.innerHTML = "";

    const card = document.createElement("div");
    card.className = "question-card";

    const textDiv = document.createElement("div");
    textDiv.className = "question-text";
    textDiv.textContent = q.text;
    card.appendChild(textDiv);

    const optionsDiv = document.createElement("div");
    optionsDiv.className = "options";

    if (q.type === "open") {
        const textarea = document.createElement("textarea");
        textarea.name = `answer-${q.id}`;
        textarea.placeholder = "Γράψε την απάντηση εδώ...";
        optionsDiv.appendChild(textarea);
    } else if (q.type === "scale-stars") {
        const starsWrapper = document.createElement("div");
        starsWrapper.className = "stars-wrapper";
        starsWrapper.innerHTML = `
            <div class="stars">
              <span data-value="1">★</span>
              <span data-value="2">★</span>
              <span data-value="3">★</span>
              <span data-value="4">★</span>
              <span data-value="5">★</span>
            </div>
        `;
        optionsDiv.appendChild(starsWrapper);
        // Event listener για επιλογή αστέρων
        const stars = starsWrapper.querySelectorAll(".stars span");
        stars.forEach(s => s.addEventListener("click", e => {
            stars.forEach(star => star.classList.remove("selected"));
            for (let i = 0; i < s.dataset.value; i++) stars[i].classList.add("selected");
        }));
    } else if (q.type === "multiple" && q.options) {
        q.options.forEach((opt, idx) => {
            const label = document.createElement("label");
            label.innerHTML = `<input type="radio" name="answer-${q.id}" value="${opt}"> ${opt}`;
            optionsDiv.appendChild(label);
        });
    }

    card.appendChild(optionsDiv);
    container.appendChild(card);

    // Ενημέρωση progress
    const percent = ((index + 1) / questions.length) * 100;
    progressBar.style.width = percent + "%";
}

// --- Μετακίνηση στην επόμενη ερώτηση ---
function nextQuestion() {
    if (currentIndex < questions.length - 1) showQuestion(currentIndex + 1);
}

// --- Μετακίνηση στην προηγούμενη ερώτηση ---
function prevQuestion() {
    if (currentIndex > 0) showQuestion(currentIndex - 1);
}

// --- Υποβολή απαντήσεων ---
document.getElementById("quiz-form").addEventListener("submit", e => {
    e.preventDefault();
    const answers = {};
    questions.forEach(q => {
        if (q.type === "open") {
            const val = container.querySelector(`textarea[name="answer-${q.id}"]`)?.value || "";
            answers[q.id] = val;
        } else if (q.type === "scale-stars") {
            const selected = container.querySelectorAll(`.stars span.selected`);
            answers[q.id] = selected.length;
        } else if (q.type === "multiple") {
            const selected = container.querySelector(`input[name="answer-${q.id}"]:checked`);
            answers[q.id] = selected ? selected.value : "";
        }
    });

    // Αποθήκευση στο Firestore π.χ. collection "results"
    auth.onAuthStateChanged(user => {
        if (!user) return;
        db.collection("results").add({
            userId: user.uid,
            answers,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => alert("Οι απαντήσεις σας καταχωρήθηκαν!"))
          .catch(err => console.error(err));
    });
});
