const form = document.getElementById("question-form");
const textInput = document.getElementById("text");
const typeSelect = document.getElementById("type");
const optionsWrapper = document.getElementById("options-wrapper");
const optionsContainer = document.getElementById("options-container");
const addOptionBtn = document.getElementById("add-option-btn");
const questionsBody = document.getElementById("questions-body");
const logoutBtn = document.getElementById("logout-btn");
const backBtn = document.getElementById("back-btn");

let optionCount = 0;

// Έλεγχος CEO login
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else if (user.email !== "nafpliotis@sspc.gr") {
    alert("Δεν έχετε πρόσβαση σε αυτή τη σελίδα.");
    window.location.href = "index.html";
  } else {
    loadQuestions();
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => window.location.href = "index.html");
});

// Επιστροφή στο Dashboard
backBtn.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

// Εναλλαγή τύπου ερώτησης
typeSelect.addEventListener("change", () => {
  if (typeSelect.value === "mcq") {
    optionsWrapper.style.display = "block";
  } else {
    optionsWrapper.style.display = "none";
  }
});

// Προσθήκη επιλογής
addOptionBtn.addEventListener("click", () => {
  optionCount++;
  const div = document.createElement("div");
  div.innerHTML = `
    <input type="text" placeholder="Επιλογή ${optionCount}" required />
    <button type="button" onclick="this.parentElement.remove()">✖</button>
  `;
  optionsContainer.appendChild(div);
});

// Υποβολή φόρμας για προσθήκη ερώτησης
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  const type = typeSelect.value;

  if (!text) return alert("Πληκτρολόγησε το κείμενο της ερώτησης.");

  let questionData = { text, type };

  if (type === "mcq") {
    const options = Array.from(optionsContainer.querySelectorAll("input"))
      .map(opt => opt.value.trim())
      .filter(v => v);
    if (options.length < 2) return alert("Πρέπει να δώσεις τουλάχιστον 2 επιλογές.");
    questionData.options = options;
  }

  db.collection("questions").add(questionData)
    .then(() => {
      alert("Η ερώτηση προστέθηκε!");
      form.reset();
      optionsContainer.innerHTML = "";
      optionsWrapper.style.display = "none";
      loadQuestions();
    })
    .catch(err => console.error("Σφάλμα:", err));
});

// Φόρτωση όλων των ερωτήσεων
function loadQuestions() {
  db.collection("questions").get()
    .then(snapshot => {
      questionsBody.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const tr = document.createElement("tr");

        const optionsText = data.type === "mcq" && data.options ? data.options.join(", ") : "-";

        tr.innerHTML = `
          <td>${data.text}</td>
          <td>${data.type === "mcq" ? "Πολλαπλής" : "Ανοιχτή"}</td>
          <td>${optionsText}</td>
          <td><button class="delete-btn">Διαγραφή</button></td>
        `;

        // Διαγραφή
        tr.querySelector(".delete-btn").addEventListener("click", () => {
          if (confirm("Να διαγραφεί η ερώτηση;")) {
            db.collection("questions").doc(doc.id).del
