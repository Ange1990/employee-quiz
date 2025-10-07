const resultsBody = document.getElementById("results-body");
const logoutBtn = document.getElementById("logout-btn");
const exportBtn = document.getElementById("export-btn");
const searchInput = document.getElementById("search-input");
const manageBtn = document.getElementById("manage-questions-btn");

let allResults = [];
let allQuestions = {}; // {id: {text, type, options}}
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

// --- Load all questions
function loadQuestions() {
  return db.collection("questions").orderBy("order").get()
    .then(snapshot => {
      allQuestions = {};
      questionsOrder = [];
      snapshot.forEach(doc => {
        const qData = doc.data();
        allQuestions[doc.id] = { text: qData.text, type: qData.type, options: qData.options || [] };
        questionsOrder.push(doc.id);
      });
    });
}

// --- Load results
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

// --- Render results
function renderResults(resultsArray) {
  resultsBody.innerHTML = "";
  resultsArray.forEach(item => {
    const docId = item.id;
    const data = item.data;
    const dateObj = data.timestamp ? data.timestamp.toDate() : null;
    const date = dateObj ? `${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2,"0")}` : "";

    const row = document.createElement("tr");

    // Δημιουργία απαντήσεων με σωστή σειρά
    const answersText = questionsOrder
      .filter(qId => data.answers[qId] !== undefined)
      .map(qId => {
        const question = allQuestions[qId];
        const questionText = question ? question.text : qId;
        let ans = data.answers[qId];
        let displayAns = ans;

        if (question) {
          if (question.type === "scale-stars") {
            const rating = Number(ans);
            displayAns = (rating >= 1 && rating <= 5) ? "⭐".repeat(rating) : ans;
          }
          if (question.type === "multiple" && Array.isArray(ans)) {
            displayAns = ans.join(", ");
          }
        }

        return `${questionText}\nΑπάντηση: ${displayAns}`;
      })
      .join("\n\n");

    const answersHtml = answersText.replace(/\n/g,"<br>");

    row.innerHTML = `
      <td>${data.email}</td>
      <td class="answers-cell">${answersHtml}</td>
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

// --- Search filter
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const filtered = allResults.filter(item => item.data.email.toLowerCase().includes(query));
  renderResults(filtered);
});

// --- Export CSV
exportBtn.addEventListener("click", () => {
  if (!allResults.length) { alert("Δεν υπάρχουν αποτελέσματα για εξαγωγή."); return; }

  const headers = ["Email Υπαλλήλου", "Απαντήσεις", "Ημερομηνία Υποβολής"];
  const rows = [headers.join(",")];

  allResults.forEach(item => {
    const data = item.data;
    const dateObj = data.timestamp ? data.timestamp.toDate() : null;
    const date = dateObj ? `${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2,"0")}` : "";

    const answersText = questionsOrder
      .filter(qId => data.answers[qId] !== undefined)
      .map(qId => {
        const question = allQuestions[qId];
        const questionText = question ? question.text : qId;
        let ans = data.answers[qId];
        let displayAns = ans;

        if(question){
          if(question.type === "scale-stars") {
            const rating = Number(ans);
            displayAns = (rating >= 1 && rating <=5) ? "⭐".repeat(rating) : ans;
          }
          if(question.type === "multiple" && Array.isArray(ans)) {
            displayAns = ans.join(", ");
          }
        }

        return `${questionText}: ${displayAns}`;
      })
      .join("\r\n");

    const row = [data.email, `"${answersText.replace(/"/g,'""')}"`, date].join(",");
    rows.push(row);
  });

  const csvContent = "\uFEFF" + rows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `employee_quiz_results_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});
