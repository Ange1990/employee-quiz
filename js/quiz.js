const container=document.getElementById('questions-container');
const form=document.getElementById('quiz-form');
const progress=document.getElementById('progress');
const submitButton=form.querySelector('button[type="submit"]');
let index=0, answers={}, submitted=false, saving=false;
let questions=[];
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
auth.onAuthStateChanged(async user=>{
 if(!user){location.href='index.html';return;}
 if(isAdmin(user)){location.href='dashboard.html';return;}
 document.getElementById('user-email').textContent=`Καλώς ήρθες, ${user.email}`;
 try {
  const questionSnap=await db.collection('questions_v3').orderBy('order').get();
  questions=questionSnap.docs.map(d=>({id:d.id,...d.data()}));
  if(!questions.length){container.textContent='Δεν έχουν εισαχθεί ακόμα οι ερωτήσεις. Επικοινωνήστε με τον διαχειριστή.';submitButton.style.display='none';return;}
  const existingDoc=await db.collection('results_v3').doc(user.uid).get();
  const existing=existingDoc.exists?existingDoc:null;
  if(existing){submitted=true;answers=existing.data().answers||{};showCompleted();return;}
  const draft=localStorage.getItem(`assessmentDraftV3_${user.uid}`);
  if(draft){try{answers=JSON.parse(draft)}catch(e){answers={}}}
  render();
 }catch(e){console.error(e);container.textContent='Δεν ήταν δυνατή η φόρτωση. Δοκιμάστε ξανά.';}
});
document.getElementById('logout-btn').onclick=()=>auth.signOut().then(()=>location.href='index.html');
function persist(){const u=auth.currentUser;if(u)localStorage.setItem(`assessmentDraftV3_${u.uid}`,JSON.stringify(answers));}
function render(){
 const q=questions[index],a=answers[q.id]||{};
 container.innerHTML='';
 const card=document.createElement('div');card.className='question-card';
 const section=document.createElement('div');section.textContent=q.section;section.style.cssText='font-size:20px;font-weight:700;margin-bottom:12px;padding:10px 14px;background:rgba(0,0,0,.22);border-radius:10px';card.appendChild(section);
 const h=document.createElement('h3');h.textContent=`Γνωστικό αντικείμενο ${index+1} από ${questions.length}`;h.style.marginBottom='12px';card.appendChild(h);
 const title=document.createElement('div');title.className='question-text';title.textContent=q.text;card.appendChild(title);
 ['Γνωρίζω','Δεν γνωρίζω'].forEach(value=>{
  const label=document.createElement('label');label.style.cssText='display:flex;align-items:center;gap:12px;margin:14px 0;padding:12px;border:1px solid #cbd5e1;border-radius:10px;cursor:pointer;';
  const radio=document.createElement('input');radio.type='radio';radio.name='assessment-choice';radio.value=value;radio.checked=a.choice===value;
  radio.onchange=()=>{answers[q.id]={...(answers[q.id]||{}),choice:value};persist();};
  label.append(radio,document.createTextNode(value));card.appendChild(label);
 });
 const commentLabel=document.createElement('label');commentLabel.textContent='Σχόλια (προαιρετικά)';commentLabel.style.display='block';card.appendChild(commentLabel);
 const textarea=document.createElement('textarea');textarea.placeholder='Προσθέστε σχόλια για αυτή την ερώτηση...';textarea.value=a.comment||'';textarea.rows=4;textarea.style.cssText='width:100%;box-sizing:border-box;padding:12px;margin-top:8px;';
 textarea.oninput=()=>{answers[q.id]={...(answers[q.id]||{}),comment:textarea.value};persist();};card.appendChild(textarea);
 const nav=document.createElement('div');nav.style.cssText='display:flex;justify-content:space-between;gap:10px;margin-top:20px;';
 if(index>0){const prev=document.createElement('button');prev.type='button';prev.textContent='← Προηγούμενη';prev.onclick=()=>{index--;render()};nav.appendChild(prev)}
 if(index<questions.length-1){const next=document.createElement('button');next.type='button';next.textContent='Επόμενη →';next.onclick=()=>{index++;render()};nav.appendChild(next)}
 card.appendChild(nav);container.appendChild(card);
 progress.style.width=`${(index+1)/questions.length*100}%`;
 submitButton.style.display=index===questions.length-1?'block':'none';
}
function showCompleted(){container.innerHTML='';const card=document.createElement('div');card.className='question-card';card.style.textAlign='center';const h=document.createElement('h2');h.textContent='✅ Το ερωτηματολόγιο υποβλήθηκε';const p=document.createElement('p');p.textContent='Οι απαντήσεις και τα σχόλιά σας έχουν καταχωριστεί.';card.append(h,p);container.appendChild(card);submitButton.style.display='none';progress.style.width='100%';}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(submitted||saving)return;
 const missing=questions.findIndex(q=>!['Γνωρίζω','Δεν γνωρίζω'].includes(answers[q.id]?.choice));
 if(missing!==-1){alert(`Παρακαλώ απαντήστε στην ερώτηση ${missing+1}.`);index=missing;render();return;}
 if(!confirm(`Θέλετε να υποβάλετε οριστικά τις ${questions.length} απαντήσεις;`))return;
 saving=true;submitButton.disabled=true;
 try{const user=auth.currentUser;if(!user)throw Error('Δεν υπάρχει ενεργός χρήστης');
  await db.collection('results_v3').doc(user.uid).set({uid:user.uid,email:user.email,assessmentVersion:3,answers,questionSnapshot:questions,answeredCount:questions.length,timestamp:firebase.firestore.FieldValue.serverTimestamp()});
  submitted=true;localStorage.removeItem(`assessmentDraftV3_${user.uid}`);showCompleted();
 }catch(err){console.error(err);alert('Αποτυχία αποθήκευσης. Οι απαντήσεις παραμένουν προσωρινά στη συσκευή. Δοκιμάστε ξανά.');}
 finally{saving=false;submitButton.disabled=false;}
});
