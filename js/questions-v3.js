const collection=db.collection('questions_v3');const status=document.getElementById('status');
auth.onAuthStateChanged(user=>{if(!user||!isAdmin(user)){location.href='index.html';return;}load()});
document.getElementById('logout').onclick=()=>auth.signOut().then(()=>location.href='index.html');
async function load(){try{const snap=await collection.orderBy('order').get();document.getElementById('count').textContent=snap.size;const root=document.getElementById('items');root.replaceChildren();snap.forEach(doc=>{
 const data=doc.data(),div=document.createElement('div');div.className='item';const section=document.createElement('select');
 ['ERP','ΜΙΣΘΟΔΟΣΙΑ ΛΟΓΙΣΤΙΚΗ','ΞΕΝΟΔΟΧΕΙΟ'].forEach(s=>{const o=document.createElement('option');o.textContent=s;o.selected=s===data.section;section.appendChild(o)});
 const txt=document.createElement('input');txt.value=data.text||'';const order=document.createElement('input');order.type='number';order.style.width='70px';order.value=data.order||0;
 const save=document.createElement('button');save.textContent='Αποθήκευση';save.onclick=async()=>{try{await collection.doc(doc.id).update({text:txt.value.trim(),section:section.value,order:Number(order.value)});status.textContent='Αποθηκεύτηκε';await load()}catch(e){alert(e.message)}};
 const del=document.createElement('button');del.textContent='Διαγραφή';del.onclick=async()=>{if(confirm('Να διαγραφεί αυτή η ερώτηση;')){await collection.doc(doc.id).delete();await load()}};
 div.append(section,txt,order,save,del);root.appendChild(div);
 })}catch(e){status.textContent='Σφάλμα φόρτωσης: '+e.message}}
document.getElementById('seed').onclick=async()=>{
 const btn=document.getElementById('seed');btn.disabled=true;
 try{const existing=await collection.limit(1).get();if(!existing.empty){status.textContent='Η συλλογή δεν είναι κενή. Δεν έγινε εισαγωγή.';return;}
 if(!confirm('Να εισαχθούν 71 νέες ερωτήσεις στο questions_v3;'))return;
 const batch=db.batch();ASSESSMENT_QUESTIONS.forEach(q=>batch.set(collection.doc(q.id),{text:q.text,section:q.section,order:q.order,type:'knowledge',required:true,allowComments:true}));await batch.commit();status.textContent='Εισήχθησαν '+ASSESSMENT_QUESTIONS.length+' ερωτήσεις.';await load();
 }catch(e){status.textContent='Σφάλμα εισαγωγής: '+e.message}finally{btn.disabled=false}
};
document.getElementById('add').onsubmit=async e=>{e.preventDefault();try{const snap=await collection.orderBy('order','desc').limit(1).get();const order=snap.empty?1:Number(snap.docs[0].data().order)+1;
 await collection.add({text:document.getElementById('text').value.trim(),section:document.getElementById('section').value,order,type:'knowledge',required:true,allowComments:true});e.target.reset();await load()}catch(err){alert(err.message)}};
