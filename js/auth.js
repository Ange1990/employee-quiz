loginForm.addEventListener('submit', async e => {
 e.preventDefault();
 const email=document.getElementById('email').value.trim();
 const password=document.getElementById('password').value;
 try { const {user}=await auth.signInWithEmailAndPassword(email,password);
  location.href=isAdmin(user)?'dashboard.html':'quiz.html';
 } catch(err){alert('Σφάλμα σύνδεσης: '+err.message)}
});
