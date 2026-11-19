// Kasb Pro: окошко «Пожелания». Текст уходит Раилю в Telegram через Make (сценарий «Kasb Pro — пожелания с сайта»).
// На главной: кнопка с атрибутом data-kp-fb. В приложениях: маленькая круглая кнопка 💬 в углу.
(function(){
  var HOOK='https://hook.eu1.make.com/3wlehy4owvje6954yuua2k3vo9yegks4';
  var T={
    ru:{btn:'Пожелания',title:'Ваши пожелания',lead:'Чего не хватает? Какую профессию или урок добавить? Нашли ошибку? Напишите, мы читаем каждое сообщение.',ph:'Ваше сообщение…',contact:'Имя или @telegram (по желанию)',send:'Отправить',sending:'Отправляем…',ok:'Спасибо! Сообщение отправлено.',err:'Не получилось отправить. Проверьте интернет и попробуйте ещё раз.',empty:'Напишите хотя бы пару слов.',close:'Закрыть'},
    uz:{btn:'Takliflar',title:'Taklif va istaklaringiz',lead:'Nima yetishmayapti? Qaysi kasb yoki darsni qo\'shaylik? Xato topdingizmi? Yozing, har bir xabarni o\'qiymiz.',ph:'Xabaringiz…',contact:'Ism yoki @telegram (ixtiyoriy)',send:'Yuborish',sending:'Yuborilmoqda…',ok:'Rahmat! Xabar yuborildi.',err:'Yuborib bo\'lmadi. Internetni tekshirib, qayta urinib ko\'ring.',empty:'Kamida bir-ikki so\'z yozing.',close:'Yopish'}
  };
  function L(){return (document.documentElement.lang||'ru').slice(0,2)==='uz'?'uz':'ru'}
  function tgUser(){try{var u=window.Telegram.WebApp.initDataUnsafe.user;if(!u)return '';return [u.first_name,u.last_name].filter(Boolean).join(' ')+(u.username?' @'+u.username:'')+' (id '+u.id+')'}catch(e){return ''}}
  var css='#kp-fb-btn{position:fixed;right:14px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:9998;width:52px;height:52px;border-radius:50%;border:0;background:#f5a524;color:#1b1b1b;font-size:24px;box-shadow:0 4px 16px rgba(0,0,0,.28);cursor:pointer}'+
    'body.kp-has-tg #kp-fb-btn{bottom:calc(84px + env(safe-area-inset-bottom))}'+
    '#kp-fb{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.5);font:16px/1.4 system-ui,sans-serif}'+
    '#kp-fb .box{width:100%;max-width:520px;margin:0 auto;background:#fff;color:#14202b;border-radius:18px 18px 0 0;padding:20px 16px calc(16px + env(safe-area-inset-bottom));box-sizing:border-box;display:flex;flex-direction:column;gap:10px}'+
    '@media(min-width:600px){#kp-fb{align-items:center}#kp-fb .box{border-radius:18px}}'+
    '@media(prefers-color-scheme:dark){#kp-fb .box{background:#1c2733;color:#e8eef3}#kp-fb textarea,#kp-fb input{background:#263443;color:#e8eef3;border-color:#3a4b5c}}'+
    '#kp-fb h3{margin:0;font-size:19px;display:flex;justify-content:space-between;align-items:center}'+
    '#kp-fb h3 button{border:0;background:none;color:inherit;font-size:26px;line-height:1;cursor:pointer;padding:0 4px}'+
    '#kp-fb p{margin:0;opacity:.8;font-size:14px}'+
    '#kp-fb textarea,#kp-fb input{width:100%;box-sizing:border-box;border:1px solid #cfd8e0;border-radius:12px;padding:12px;font:inherit;background:#f7f9fb;color:inherit}'+
    '#kp-fb textarea{min-height:120px;resize:vertical}'+
    '#kp-fb .send{border:0;border-radius:12px;padding:14px;background:#f5a524;color:#1b1b1b;font:700 16px system-ui,sans-serif;cursor:pointer}'+
    '#kp-fb .send:disabled{opacity:.6}'+
    '#kp-fb .msg{font-size:14px;min-height:1em}#kp-fb .msg.ok{color:#1f9d55;font-weight:700}#kp-fb .msg.bad{color:#d64545}';
  function open(){
    if(document.getElementById('kp-fb'))return;
    var t=T[L()];
    var w=document.createElement('div');w.id='kp-fb';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');
    w.innerHTML='<div class="box"><h3><span></span><button type="button" class="x">×</button></h3><p class="lead"></p><textarea maxlength="3000"></textarea><input type="text" maxlength="120" autocomplete="name"><button type="button" class="send"></button><div class="msg" aria-live="polite"></div></div>';
    w.querySelector('h3 span').textContent=t.title;
    w.querySelector('.x').setAttribute('aria-label',t.close);
    w.querySelector('.lead').textContent=t.lead;
    var ta=w.querySelector('textarea'),inp=w.querySelector('input'),b=w.querySelector('.send'),m=w.querySelector('.msg');
    ta.placeholder=t.ph;inp.placeholder=t.contact;b.textContent=t.send;
    try{ta.value=sessionStorage.getItem('kp_fb_draft')||''}catch(e){}
    ta.oninput=function(){try{sessionStorage.setItem('kp_fb_draft',ta.value)}catch(e){}};
    function close(){w.remove()}
    w.querySelector('.x').onclick=close;
    w.onclick=function(e){if(e.target===w)close()};
    document.addEventListener('keydown',function k(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',k)}});
    b.onclick=function(){
      var txt=ta.value.trim();
      if(txt.length<2){m.className='msg bad';m.textContent=t.empty;ta.focus();return}
      b.disabled=true;b.textContent=t.sending;m.className='msg';m.textContent='';
      var body=new URLSearchParams({text:txt,contact:inp.value.trim(),who:tgUser(),lang:L(),page:location.pathname+location.search});
      fetch(HOOK,{method:'POST',mode:'no-cors',body:body}).then(function(){
        try{sessionStorage.removeItem('kp_fb_draft')}catch(e){}
        ta.value='';inp.value='';m.className='msg ok';m.textContent=t.ok;b.textContent=t.send;b.disabled=false;
        setTimeout(close,2200);
      }).catch(function(){m.className='msg bad';m.textContent=t.err;b.textContent=t.send;b.disabled=false});
    };
    document.body.appendChild(w);ta.focus();
  }
  function init(){
    var s=document.createElement('style');s.id='kp-fb-css';s.textContent=css;document.head.appendChild(s);
    var own=document.querySelectorAll('[data-kp-fb]');
    for(var i=0;i<own.length;i++)own[i].addEventListener('click',function(e){e.preventDefault();open()});
    if(!own.length&&!window.KASB_NO_FB){
      var fb=document.createElement('button');fb.type='button';fb.id='kp-fb-btn';fb.textContent='💬';
      fb.setAttribute('aria-label',T[L()].btn);fb.title=T[L()].btn;fb.onclick=open;
      document.body.appendChild(fb);
      // поднять кнопку, если внизу показана плашка «Удобнее в Telegram»
      setTimeout(function(){if(document.getElementById('kp-tg'))document.body.classList.add('kp-has-tg')},50);
      new MutationObserver(function(){document.body.classList.toggle('kp-has-tg',!!document.getElementById('kp-tg'))}).observe(document.body,{childList:true});
    }
    window.KasbFeedback=open;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
