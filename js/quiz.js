const container = document.getElementById("questions-container");
const form = document.getElementById("quiz-form");
const userEmailSpan = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const progressBar = document.getElementById("progress");

let questions = [];
let currentIndex = 0;
let answers = {};

// --- Έλεγχος σύνδεσης ---
auth.onAuthStateChanged(user => {
  if(!user) window.location.href="index.html";
  else {
    userEmailSpan.textContent = `Καλώς ήρθες, ${user.email}`;
    loadQuestions();
  }
});

// --- Logout ---
logoutBtn.addEventListener("click", ()=> auth.signOut().then(()=>window.location.href="index.html"));

// --- Φόρτωση ερωτήσεων ---
function loadQuestions(){
  db.collection("questions").orderBy("order").get()
    .then(snapshot=>{
      questions=[];
      snapshot.forEach(doc=>questions.push({id:doc.id,...doc.data()}));
      showQuestion(0);
    });
}

// --- Εμφάνιση ερώτησης ---
function showQuestion(index){
  currentIndex=index;
  const q=questions[index];
  container.innerHTML="";

  const card=document.createElement("div");
  card.className="question-card";

  const qText=document.createElement("div");
  qText.className="question-text";
  qText.textContent=q.text;
  card.appendChild(qText);

  const optionsDiv=document.createElement("div");
  optionsDiv.className="options";

  if(q.type==="mcq" && Array.isArray(q.options)){
    q.options.forEach(opt=>{
      const label=document.createElement("label");
      const checked=answers[q.id]===opt?"checked":"";
      label.innerHTML=`<input type="radio" name="${q.id}" value="${opt}" ${checked}/> ${opt}`;
      optionsDiv.appendChild(label);
    });
    card.appendChild(optionsDiv);
  } else if(q.type==="multi" && Array.isArray(q.options)){
    q.options.forEach(opt=>{
      const label=document.createElement("label");
      const checked=(answers[q.id]||[]).includes(opt)?"checked":"";
      label.innerHTML=`<input type="checkbox" name="${q.id}" value="${opt}" ${checked}/> ${opt}`;
      optionsDiv.appendChild(label);
    });
    card.appendChild(optionsDiv);
  } else if(q.type==="open"){
    const textarea=document.createElement("textarea");
    textarea.name=q.id; textarea.rows=4;
    textarea.placeholder="Γράψε την απάντησή σου εδώ...";
    textarea.value=answers[q.id]||"";
    card.appendChild(textarea);
  } else if(q.type==="number"){
    const input=document.createElement("input");
    input.type="number"; input.name=q.id;
    input.value=answers[q.id]||"";
    card.appendChild(input);
  } else if(q.type==="scale"){
    const numStars=5;
    const selected=answers[q.id]||0;

    const starsWrapper=document.createElement("div"); starsWrapper.className="stars-wrapper";
    const starsDiv=document.createElement("div"); starsDiv.className="stars";

    for(let i=1;i<=numStars;i++){
      const star=document.createElement("span");
      star.textContent=i<=selected?"★":"☆";
      star.dataset.value=i;

      star.addEventListener("mouseover", ()=>{
        for(let j=0;j<numStars;j++){
          starsDiv.children[j].textContent=j<i?"★":"☆";
          starsDiv.children[j].classList.add("hovered");
        }
      });

      star.addEventListener("mouseout", ()=>{
        const sel=answers[q.id]||0;
        for(let j=0;j<numStars;j++){
          starsDiv.children[j].textContent=j<sel?"★":"☆";
          starsDiv.children[j].classList.remove("hovered");
        }
      });

      star.addEventListener("click", ()=>{
        answers[q.id]=i;
        showQuestion(currentIndex);
      });

      starsDiv.appendChild(star);
    }

    starsWrapper.appendChild(starsDiv);

    const labelsDiv=document.createElement("div"); labelsDiv.className="stars-labels";
    for(let i=1;i<=numStars;i++){
      const lbl=document.createElement("span"); lbl.textContent=i;
      labelsDiv.appendChild(lbl);
    }
    starsWrapper.appendChild(labelsDiv);
    card.appendChild(starsWrapper);
  }

  container.appendChild(card);
  renderNavigation();
  updateProgress();
  updateSubmitButton();
}

// --- Navigation ---
function renderNavigation(){
  const nav=document.createElement("div");
  nav.style.display="flex"; nav.style.justifyContent="space-between"; nav.style.marginTop="25px";

  if(currentIndex>0){
    const prevBtn=document.createElement("button");
    prevBtn.type="button"; prevBtn.textContent="⬅ Προηγούμενο";
    prevBtn.className="nav-btn prev";
    prevBtn.onclick=()=>saveAnswerAndMove(-1);
    nav.appendChild(prevBtn);
  }

  if(currentIndex<questions.length-1){
    const nextBtn=document.createElement("button");
    nextBtn.type="button"; nextBtn.textContent="Επόμενο ➡";
    nextBtn.className="nav-btn next";
    nextBtn.onclick=()=>saveAnswerAndMove(1);
    nav.appendChild(nextBtn);
  }

  container.appendChild(nav);
}

// --- Submit button ---
function updateSubmitButton(){
  const submitBtn=form.querySelector('button[type="submit"]');
  submitBtn.style.display=(currentIndex===questions.length-1)?"block":"none";
}

// --- Αποθήκευση απάντησης ---
function saveAnswerAndMove(step){
  const q=questions[currentIndex];

  if(q.type==="mcq"){
    const selected=form.querySelector(`input[name="${q.id}"]:checked`);
    if(selected) answers[q.id]=selected.value;
  } else if(q.type==="multi"){
    const selected=[...form.querySelectorAll(`input[name="${q.id}"]:checked`)];
    answers[q.id]=selected.map(el=>el.value);
  } else if(q.type==="open"){
    const textarea=form.querySelector(`textarea[name="${q.id}"]`);
    if(textarea) answers[q.id]=textarea.value.trim();
  } else if(q.type==="number"){
    const input=form.querySelector(`input[name="${q.id}"]`);
    if(input) answers[q.id]=input.value;
  } // scale handled live

  if(step!==0) showQuestion(currentIndex+step);
}

// --- Progress bar ---
function updateProgress(){
  const percent=((currentIndex+1)/questions.length)*100;
  progressBar.style.width=`${percent}%`;
}

// --- Submit ---
form.addEventListener("submit", e=>{
  e.preventDefault();
  saveAnswerAndMove(0);

  if(!confirm("Θέλεις σίγουρα να υποβάλεις τις απαντήσεις σου;")) return;

  const user=auth.currentUser;
  if(user){
    db.collection("results").add({
      uid:user.uid,
      email:user.email,
      answers:answers,
      timestamp:firebase.firestore.FieldValue.serverTimestamp()
    }).then(()=>{
      container.innerHTML="<h2>Ευχαριστούμε για τη συμμετοχή!</h2>";
      progressBar.style.width="100%";
    }).catch(err=>console.error("Σφάλμα αποθήκευσης:",err));
  }
});
