auth.onAuthStateChanged(async user => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (!userDoc.exists) throw new Error("Δεν βρέθηκε χρήστης");

        const userGroup = userDoc.data().group;
        userEmailSpan.textContent = `Καλώς ήρθες, ${user.email}`;

        loadQuestions(userGroup);
        startTimer();
    } catch (err) {
        console.error(err);
        alert("Σφάλμα στη φόρτωση των ερωτήσεων.");
    }
});

function loadQuestions(group) {
    db.collection("questions").where("group","==",group).orderBy("order").get()
        .then(snapshot => {
            questions = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if(["open","scale-stars","multiple"].includes(data.type)){
                    questions.push({ id: doc.id, ...data });
                }
            });
            if(questions.length === 0){
                container.innerHTML = "<h2>Δεν υπάρχουν διαθέσιμες ερωτήσεις για την ομάδα σας.</h2>";
            } else {
                showQuestion(0);
            }
        })
        .catch(err => console.error("Σφάλμα φόρτωσης ερωτήσεων:", err));
}
