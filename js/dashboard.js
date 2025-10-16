const resultsBody = document.getElementById("results-body");
const logoutBtn = document.getElementById("logout-btn");
const exportBtn = document.getElementById("export-btn");
const searchInput = document.getElementById("search-input");
const manageBtn = document.getElementById("manage-questions-btn");
const summaryDiv = document.getElementById("summary");

let allResults = [];
let allQuestions = {};
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

// --- Load results
function loadResults() {
  db.collection("results").orderBy("timestamp", "desc").get()
    .then(snapshot => {
      allResults = [];
      snapshot.forEach(doc => allResults.push({ id: doc.id, data: doc.data() }));
      renderResults(allResults);
    })
    .catch(error => console.error("Σφάλμα κατά τη φόρτωση αποτελεσμάτων:", error));
}

// --- Render results
function renderResults(resultsArray) {
  resultsBody.innerHTML = "";
  summaryDiv.textContent = "";

  let totalCorrect = 0;
  let totalQuestions = 0;

  resultsArray.forEach(item => {
    const { id: docId, data } = item;
    const dateObj = data.timestamp ? data.timestamp.toDate() : null;
    const date = dateObj ? `${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2,"0")}` : "";

    const row = document.createElement("tr");

    let userCorrect = 0;
    let userTotal = 0;

    const answersHtml = questionsOrder
      .filter(qId => data.answers[qId] !== undefined)
      .map(qId => {
        const question = allQuestions[qId];
        const questionText = question ? question.text : qId;
        const correct = question?.correctAnswer;
        let ans = data.answers[qId];
        let displayAns = ans;

        if (question) {
          if (question.type === "multiple" && Array.isArray(ans)) {
            displayAns = ans.join(", ");
          }
          if (question.type === "scale-stars") {
            const rating = Number(ans);
            displayAns = (rating >= 1 && rating <= 5) ? "⭐".repeat(rating) : ans;
          }
        }

        let isCorrect = false;
        if (correct !== null && correct !== undefined) {
          if (Array.isArray(correct)) {
            isCorrect = Array.isArray(ans) && correct.sort().join(",") === ans.sort().join(",");
          } else {
            isCorrect = String(ans).trim().toLowerCase() === String(correct).trim().toLowerCase();
          }
        }

        if (correct !== null) {
          userTotal++;
          if (isCorrect) userCorrect++;
        }

        const color = correct === null ? "#333" : (isCorrect ? "green" : "red");
        const correctText = correct !== null ? `<br><small>Σωστή απάντηση: ${correct}</small>` : "";

        return `<div style="margin-bottom:10px;">
                  <strong>${questionText}</strong><br>
                  <span style="color:${color}">Απάντηση: ${displayAns}</span>
                  ${correctText}
                </div>`;
      })
      .join("");

    totalCorrect += userCorrect;
    totalQuestions += userTotal;

    const userPercentage = userTotal ? ((userCorrect / userTotal) * 100).toFixed(1) : 0;
    const resultText = userPercentage >= 80 ? "✅ Επιτυχία" : "❌ Αποτυχία";
    const resultColor = userPercentage >= 80 ? "green" : "red";

    row.innerHTML = `
      <td>${data.email}</td>
      <td class="answers-cell">${answersHtml}<br>
        <strong style="color:${resultColor}">${userCorrect}/${userTotal} σωστά (${userPercentage}%) - ${resultText}</strong>
      </td>
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

  // συνοπτικά πάνω από τον πίνακα
  if (totalQuestions > 0) {
    const overall = ((totalCorrect / totalQuestions) * 100).toFixed(1);
    summaryDiv.innerHTML = `🔍 <b>Συνολικά:</b> ${totalCorrect}/${totalQuestions} σωστές απαντήσεις (${overall}%)`;
  }
}

// --- Search filter
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const filtered = allResults.filter(item => item.data.email.toLowerCase().includes(query));
  renderResults(filtered);
});
