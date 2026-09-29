/* Pricing page: plan buttons start Stripe Checkout (signing in first if needed). */
document.addEventListener('click',async e=>{
  const b=e.target.closest('.plan');if(!b)return;
  const err=document.getElementById('p-error');err.hidden=true;b.disabled=true;
  try{
    if(!PIQ.configured) throw new Error('Pro isn’t available yet. Everything is free for now.');
    await PIQ.ready;
    if(PIQ.state.isPro){location.href='/account/';return;}
    await PIQ.checkout(b.dataset.plan);
  }catch(x){err.textContent=x.message;err.hidden=false;b.disabled=false;}
});
if(new URLSearchParams(location.search).get('checkout')==='canceled'){
  const err=document.getElementById('p-error');err.textContent='Checkout was canceled. You haven’t been charged.';err.hidden=false;
}
