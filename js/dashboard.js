// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD_MPxHrzLs2vd677t3Nr8vXKFtQEuLI2g",
  authDomain: "quiz-aa480.firebaseapp.com",
  projectId: "quiz-aa480",
  storageBucket: "quiz-aa480.firebasestorage.app",
  messagingSenderId: "913659290274",
  appId: "1:913659290274:web:412b6ca878f15d094f6dfb",
  measurementId: "G-Q3X66T9MJF"
};

// Init Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Φέρνουμε όλες τις απαντήσεις
async function loadDashboard() {
  const snapshot = await db.collection("answers").get();
  const answersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Εμφανίζουμε λίστα χρηστών
  const userList = document.getElementById("userList");
  answersData.forEach(entry => {
    const li = document.createElement("li");
    li.textContent = `User: ${entry.id} - Υπέβαλε ${Object.keys(entry.answers).length} απαντήσεις`;
    userList.appendChild(li);
  });

  // Στατιστικά: Πόσες φορές επιλέχθηκε κάθε απάντηση
  const answerCounts = {};
  answersData.forEach(entry => {
    Object.values(entry.answers).forEach(ans => {
      answerCounts[ans] = (answerCounts[ans] || 0) + 1;
    });
  });

  // Φτιάχνουμε Chart.js γράφημα
  const ctx = document.getElementById("answersChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(answerCounts),
      datasets: [{
        label: "Συχνότητα Απαντήσεων",
        data: Object.values(answerCounts),
        backgroundColor: "rgba(255, 99, 132, 0.7)"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Φόρτωση dashboard
loadDashboard();
