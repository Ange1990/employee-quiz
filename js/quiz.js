const db = firebase.firestore();
const container = document.getElementById("questions-container");

db.collection("questions").get().then(snapshot => {
  snapshot.forEach(doc => {
    const data = doc.data();

    // Δημιουργία card
    const card = document.createElement("div");
    card.className = "question-card";

    // Ερώτηση
    const qText = document.createElement("div");
    qText.className = "question-text";
    qText.textContent = data.text;
    card.appendChild(qText);

    // Επιλογές
    const optionsDiv = document.createElement("div");
    optionsDiv.className = "options";

    data.options.forEach((opt, idx) => {
      const label = document.createElement("label");
      label.innerHTML = `
        <input type="radio" name="${doc.id}" value="${opt}" />
        ${opt}
      `;
      optionsDiv.appendChild(label);
    });

    card.appendChild(optionsDiv);
    container.appendChild(card);
  });
});
