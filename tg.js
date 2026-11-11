// Kasb Pro: outside Telegram, show a small bar "Открыть в Telegram" that opens the app in the bot.
(function(){
  var BOT='kasbpro_uz_bot';
  var tg=window.Telegram&&window.Telegram.WebApp;
  if(tg&&tg.initData)return; // already inside Telegram
  try{if(sessionStorage.getItem('kp_tg_hide'))return}catch(e){}
  var app=(location.pathname.split('/').filter(Boolean)[0]||'site').replace(/[^a-z]/g,'');
  var T={ru:['Удобнее в Telegram','Открыть'],uz:['Telegramda qulayroq','Ochish']};
  function show(){
    var l=(document.documentElement.lang||'ru').slice(0,2)==='uz'?'uz':'ru';
    var bar=document.createElement('div');
    bar.id='kp-tg';
    bar.innerHTML='<a href="https://t.me/'+BOT+'?start='+app+'" target="_blank" rel="noopener"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.9 4.3 18.8 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.9 13 2.4 11.6c-1-.3-1-1 .2-1.5L20.6 3c.8-.3 1.6.2 1.3 1.3z"/></svg><span>'+T[l][0]+'</span><b>'+T[l][1]+' ›</b></a><button type="button" aria-label="×">×</button>';
    var s=document.createElement('style');
    s.textContent='#kp-tg{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9999;display:flex;align-items:center;gap:6px;max-width:520px;margin:0 auto;padding:6px 6px 6px 14px;border-radius:14px;background:#229ed9;color:#fff;font:600 15px/1.2 system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.25)}#kp-tg a{flex:1;display:flex;align-items:center;gap:8px;color:#fff;text-decoration:none;padding:8px 0}#kp-tg a b{margin-left:auto;padding:6px 12px;border-radius:10px;background:rgba(255,255,255,.2)}#kp-tg button{border:0;background:none;color:#fff;font-size:22px;line-height:1;padding:6px 10px;cursor:pointer}body{padding-bottom:80px}';
    document.head.appendChild(s);document.body.appendChild(bar);
    bar.querySelector('button').onclick=function(){bar.remove();try{sessionStorage.setItem('kp_tg_hide','1')}catch(e){}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show);else show();
})();
