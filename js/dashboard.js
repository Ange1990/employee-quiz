const resultsBody=document.getElementById('results-body');
const searchInput=document.getElementById('search-input');
let results=[];
auth.onAuthStateChanged(async user=>{
 if(!user){location.href='index.html';return;}
 if(!isAdmin(user)){alert('Δεν έχετε πρόσβαση.');location.href='index.html';return;}
 try {const snap=await db.collection('results_v3').get();results=snap.docs.map(d=>({id:d.id,...d.data()}));render();}
 catch(e){console.error(e);alert('Δεν ήταν δυνατή η ανάγνωση των αποτελεσμάτων: '+e.message)}
});
document.getElementById('logout-btn').onclick=()=>auth.signOut().then(()=>location.href='index.html');
document.getElementById('manage-questions-btn').onclick=()=>location.href='questions.html';
searchInput.oninput=render;
function render(){
 resultsBody.replaceChildren();
 const q=searchInput.value.trim().toLowerCase();
 results.filter(r=>(r.email||'').toLowerCase().includes(q)).forEach(r=>{
  const tr=document.createElement('tr'),email=document.createElement('td'),answers=document.createElement('td'),date=document.createElement('td'),actions=document.createElement('td');
  email.textContent=r.email||'';answers.className='answers-cell';
  const questions=r.questionSnapshot||[];
  const grouped={};questions.forEach(item=>{(grouped[item.section||'Άλλη ενότητα']??=[]).push(item)});
  Object.entries(grouped).forEach(([section,items])=>{
   const h=document.createElement('h3');h.textContent=section;answers.appendChild(h);
   items.forEach(item=>{const a=r.answers?.[item.id]||{};const div=document.createElement('div');div.style.marginBottom='12px';
    const strong=document.createElement('strong');strong.textContent=item.text;
    const detail=document.createElement('div');detail.textContent='Απάντηση: '+(a.choice||'—');
    const comment=document.createElement('div');comment.textContent='Σχόλια: '+(a.comment||'—');
    div.append(strong,detail,comment);answers.appendChild(div);
   });
  });
  date.textContent=r.timestamp?.toDate?.().toLocaleString('el-GR')||'';
  const del=document.createElement('button');del.className='delete-btn';del.textContent='Διαγραφή';
  del.onclick=async()=>{if(!confirm('Οριστική διαγραφή των απαντήσεων;'))return;try{await db.collection('results_v3').doc(r.id).delete();results=results.filter(x=>x.id!==r.id);render()}catch(e){alert(e.message)}};
  actions.appendChild(del);tr.append(email,answers,date,actions);resultsBody.appendChild(tr);
 });
}
document.getElementById('export-btn').onclick=()=>{
 const rows=[['Email','Ενότητα','Ερώτηση','Απάντηση','Σχόλια','Ημερομηνία']];
 results.filter(r=>(r.email||'').toLowerCase().includes(searchInput.value.trim().toLowerCase())).forEach(r=>{
  const date=r.timestamp?.toDate?.().toLocaleString('el-GR')||'';
  (r.questionSnapshot||[]).forEach(q=>{const a=r.answers?.[q.id]||{};rows.push([r.email||'',q.section||'',q.text||'',a.choice||'',a.comment||'',date])});
 });
 const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:30},{wch:25},{wch:60},{wch:20},{wch:65},{wch:24}];
 XLSX.utils.book_append_sheet(wb,ws,'Απαντήσεις');XLSX.writeFile(wb,'employee_quiz_v3.xlsx');
};
