const resultsBody = document.getElementById("results-body");
const logoutBtn = document.getElementById("logout-btn");
const exportBtn = document.getElementById("export-btn");
const searchInput = document.getElementById("search-input");
const manageBtn = document.getElementById("manage-questions-btn");

let allResults = [];      // Αποθήκευση όλων των αποτελεσμάτων
let allQuestions = {};    // Αποθήκευση ερωτήσεων με qId

// Έλεγχος σύνδεσης και CEO
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

// Logout
logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
});

// Μετάβαση στη σελίδα διαχείρισης ερωτήσεων
manageBtn.addEventListener("click", () => {
  window.location.href = "questions.html";
});

// Φόρτωση όλων των ερωτήσεων
function loadQuestions() {
  return db.collection("questions").get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        allQuestions[doc.id] = doc.data().text;
      });
    });
}

// Φόρτωση αποτελεσμάτων
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

// Εμφάνιση αποτελεσμάτων
function renderResults(resultsArray) {
  resultsBody.innerHTML = "";
  resultsArray.forEach(item => {
    const docId = item.id;
    const data = item.data;
    const dateObj = data.timestamp ? data.timestamp.toDate() : null;
    const date = dateObj ? `${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()} ${dateObj.getHours()}:${dateObj.getMinutes()}` : "";

    const row = document.createElement("tr");

    // Δημιουργία πλήρους κειμένου με ερώτηση + απάντηση
    const answersText = Object.entries(data.answers || {})
      .map(([qId, ans]) => {
        const questionText = allQuestions[qId] || qId;
        return `${questionText}\nΑπάντηση: ${ans}`;
      })
      .join("\n\n");

    row.innerHTML = `
      <td>${data.email}</td>
      <td class="answers-cell">${answersText}</td>
      <td>${date}</td>
      <td><button class="delete-btn">Διαγραφή</button></td>
    `;

    // Διαγραφή αποτελέσματος
    row.querySelector(".delete-btn").addEventListener("click", () => {
      if (confirm("Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτό το αποτέλεσμα;")) {
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

// Φίλτρο αναζήτησης
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const filtered = allResults.filter(item => item.data.email.toLowerCase().includes(query));
  renderResults(filtered);
});

// Εξαγωγή σε CSV/Excel (με σωστή εμφάνιση ελληνικών και line breaks)
exportBtn.addEventListener("click", () => {
  if (!allResults.length) {
    alert("Δεν υπάρχουν αποτελέσματα για εξαγωγή.");
    return;
  }

  const headers = ["Email Υπαλλήλου", "Απαντήσεις", "Ημερομηνία Υποβολής"];
  const rows = [headers.join(",")];

  allResults.forEach(item => {
    const data = item.data;
    const dateObj = data.timestamp ? data.timestamp.toDate() : null;
    const date = dateObj ? `${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()} ${dateObj.getHours()}:${dateObj.getMinutes()}` : "";

    // Ερωτήσεις + απαντήσεις με σωστά line breaks (\r\n)
    const answersText = Object.entries(data.answers || {})
      .map(([qId, ans]) => {
        const questionText = allQuestions[qId] || qId;
        return `${questionText}: ${ans.replace(/"/g,'""')}`;
      })
      .join("\r\n");

    const row = [data.email, `"${answersText}"`, date].join(",");
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
