/* Standalone leaderboard page. */
(function(){
  const el=document.getElementById('lbpage');
  if(!(window.PIQ&&PIQ.configured)){el.innerHTML='<p>Leaderboards open once accounts are switched on. Until then, <a href="/daily/">play the daily challenge</a> and share your score.</p>';return;}
  LB.render(el,DAILY.today());
})();
