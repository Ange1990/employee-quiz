// Firebase config από το project σου
const firebaseConfig = {
  apiKey: "AIzaSyD_MPxHrzLs2vd677t3Nr8vXKFtQEuLI2g",
  authDomain: "quiz-aa480.firebaseapp.com",
  projectId: "quiz-aa480",
  storageBucket: "quiz-aa480.firebasestorage.app",
  messagingSenderId: "913659290274",
  appId: "1:913659290274:web:412b6ca878f15d094f6dfb",
  measurementId: "G-Q3X66T9MJF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Πρώτα ελέγχουμε αν ο χρήστης είναι συνδεδεμένος
auth.onAuthStateChanged(user => {
  if (!user) {
    // Αν δεν είναι συνδεδεμένος, επιστροφή στο login
    window.location.href = "index.html";
  } else {
    loadQuestions(user.uid);
  }
});

// Φόρτωση ερωτήσεων από Firestore
async function loadQuestions(userId) {
  try {
    const snapshot = await db.collection('questions').get();
    const allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Διαλέγουμε τυχαίες 10 ερωτήσεις
    const quizQuestions = getRandomQuestions(allQuestions, 10);

    displayQuestions(quizQuestions, userId);
  } catch (error) {
    console.error("Σφάλμα στη φόρτωση ερωτήσεων:", error);
  }
}

// Συνάρτηση για τυχαίες ερωτήσεις
function getRandomQuestions(pool, count = 10) {
  const shuffled = pool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Εμφάνιση ερωτήσεων στη σελίδα
function displayQuestions(questions, userId) {
  const container = document.getElementById('questions-container');
  questions.forEach((q, index) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
      <div class="question-text">${index + 1}. ${q.text}</div>
      <div class="options">
        ${q.options.map((opt, i) => `
          <label>
            <input type="radio" name="q${index}" value="${opt}" required />
            ${opt}
          </label>
        `).join('')}
      </div>
    `;
    container.appendChild(card);
  });

  // Όταν πατήσει submit
  const form = document.getElementById('quiz-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const answers = {};
    questions.forEach((q, i) => {
      const selected = form[`q${i}`].value;
      answers[q.id] = selected;
    });

    try {
      await db.collection('answers').doc(userId).set({
        answers: answers,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert("Οι απαντήσεις σας υποβλήθηκαν με επιτυχία!");
      window.location.href = "index.html"; // ή σε dashboard αν υπάρχει
    } catch (err) {
      console.error("Σφάλμα στην αποθήκευση:", err);
      alert("Κάτι πήγε στραβά. Προσπάθησε ξανά.");
    }
  });
}
