const resultsBody = document.getElementById("results-body");
const logoutBtn = document.getElementById("logout-btn");
const exportBtn = document.getElementById("export-btn");
const searchInput = document.getElementById("search-input");
const manageBtn = document.getElementById("manage-questions-btn");

let allResults = [];
let allQuestions = {}; // {id: {text, type, options, correctAnswer}}
let questionsOrder = [];

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    if (user.email !== "nafpliotis@sspc.gr") {
      alert("Δεν έχετε πρόσβαση σε αυτή τη σελίδα.");
      window.location.href = "index.html";
    } else {
      loadQuestions().then(() => loadResults());
    }
  }
});

logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => window.location.href = "index.html");
});

manageBtn.addEventListener("click", () => {
  window.location.href = "questions.html";
});

// --- Load all questions ---
function loadQuestions() {
  return db.collection("questions").orderBy("order").get()
    .then(snapshot => {
      allQuestions = {};
      questionsOrder = [];
      snapshot.forEach(doc => {
        const qData = doc.data();
        allQuestions[doc.id] = { 
          text: qData.text, 
          type: qData.type, 
          options: qData.options || [], 
          correctAnswer: qData.correctAnswer || null 
        };
        questionsOrder.push(doc.id);
      });
    });
}

// --- Load results ---
function loadResults() {
  db.collection("results").orderBy("timestamp", "desc").get()
    .then(snapshot => {
      allResults = [];
      snapshot.forEach(doc => {
        allResults.push({ id: doc.id, data: doc.data() });
      });
      renderResults(allResults);
    })
    .catch(error => console.error("Σφάλμα κατά τη φόρτωση αποτελεσμάτων:", error));
}

// --- Render results with score per employee ---
function renderResults(resultsArray) {
  resultsBody.innerHTML = "";

  resultsArray.forEach(item => {
    const docId = item.id;
    const data = item.data;
    const dateObj = data.timestamp ? data.timestamp.toDate() : null;
    const date = dateObj ? `${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2,"0")}` : "";

    const row = document.createElement("tr");

    let correctCount = 0;
    let totalCount = 0;

    // Δημιουργία απαντήσεων με σωστή/λάθος χρωματική ένδειξη
    const answersHTML = questionsOrder
      .filter(qId => data.answers[qId] !== undefined)
      .map(qId => {
        const q = allQuestions[qId];
        const ans = data.answers[qId];
        totalCount++;

        let correct = false;
        if (q && q.correctAnswer !== null && q.type === "multiple") {
          correct = (ans === q.correctAnswer);
        }

        if (correct) correctCount++;

        const color = correct ? "green" : "red";
        const answerText = (q.type === "scale-stars") 
          ? "⭐".repeat(Number(ans)) 
          : ans;

        return `
          <div style="margin-bottom:6px;">
            <strong>${q.text}</strong><br>
            <span style="color:${color}; font-weight:600;">Απάντηση: ${answerText}</span>
          </div>`;
      }).join("");

    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const resultColor = percentage >= 80 ? "green" : "red";
    const resultText = percentage >= 80 ? "✅ Επιτυχία" : "❌ Αποτυχία";

    row.innerHTML = `
      <td>
        ${data.email}
        <div style="margin-top:8px; font-size:14px; color:${resultColor}; font-weight:600;">
          ${correctCount}/${totalCount} σωστές (${percentage}%) - ${resultText}
        </div>
      </td>
      <td class="answers-cell">${answersHTML}</td>
      <td>${date}</td>
      <td><button class="delete-btn">Διαγραφή</button></td>
    `;

    row.querySelector(".delete-btn").addEventListener("click", () => {
      if(confirm("Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτό το αποτέλεσμα;")){
        db.collection("results").doc(docId).delete()
          .then(() => {
            row.remove();
            allResults = allResults.filter(r => r.id !== docId);
          })
          .catch(err => console.error("Σφάλμα κατά τη διαγραφή:", err));
      }
    });

    resultsBody.appendChild(row);
  });
}

// --- Search filter ---
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const filtered = allResults.filter(item => item.data.email.toLowerCase().includes(query));
  renderResults(filtered);
});

// --- Export CSV ---
exportBtn.addEventListener("click", () => {
  if (!allResults.length) { alert("Δεν υπάρχουν αποτελέσματα για εξαγωγή."); return; }

  const headers = ["Email Υπαλλήλου", "Απαντήσεις", "Ημερομηνία Υποβολής", "Σωστές/Σύνολο", "Ποσοστό"];
  const rows = [headers.join(",")];

  allResults.forEach(item => {
    const data = item.data;
    const dateObj = data.timestamp ? data.timestamp.toDate() : null;
    const date = dateObj ? `${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2,"0")}` : "";

    let correctCount = 0;
    let totalCount = 0;

    const answersText = questionsOrder
      .filter(qId => data.answers[qId] !== undefined)
      .map(qId => {
        const q = allQuestions[qId];
        const ans = data.answers[qId];
        totalCount++;
        let correct = false;
        if (q && q.correctAnswer !== null && q.type === "multiple") {
          correct = (ans === q.correctAnswer);
        }
        if (correct) correctCount++;
        return `${q.text}: ${ans}`;
      }).join(" | ");

    const percent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const row = [data.email, `"${answersText.replace(/"/g,'""')}"`, date, `${correctCount}/${totalCount}`, `${percent}%`].join(",");
    rows.push(row);
  });

  const csvContent = "\uFEFF" + rows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quiz_results_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});
