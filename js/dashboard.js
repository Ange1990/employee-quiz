const resultsBody = document.getElementById("results-body");
const logoutBtn = document.getElementById("logout-btn");

// Έλεγχος αν είναι συνδεδεμένος και CEO
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    if (user.email !== "ceo@example.com") {
      alert("Δεν έχετε πρόσβαση σε αυτή τη σελίδα.");
      window.location.href = "index.html";
    } else {
      loadResults();
    }
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
});

function loadResults() {
  db.collection("results").orderBy("timestamp", "desc").get()
    .then(snapshot => {
      resultsBody.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : "";
        resultsBody.innerHTML += `
          <tr>
            <td>${data.email}</td>
            <td>${data.score}</td>
            <td>${data.total}</td>
            <td>${date}</td>
          </tr>
        `;
      });
    })
    .catch(error => {
      console.error("Σφάλμα κατά τη φόρτωση αποτελεσμάτων:", error);
    });
}
