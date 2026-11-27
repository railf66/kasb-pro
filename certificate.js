/* Kasb Pro — unofficial certificate («свидетельство») shared by all profession apps.
   Usage: KasbCert.open({prefix:'ep', lang:'ru'|'uz', prof:{ru,uz}, grade:'3',
     topics:{ru:[...],uz:[...]}, sources:{ru:[...],uz:[...]}, url:'kasbpro.uz/elektrik/'})
   The name is asked once and kept in localStorage <prefix>_certname. */
(function(){
const T={
 ru:{title:'СВИДЕТЕЛЬСТВО',sub:'о прохождении сокращённого курса',conf:'Настоящим подтверждается, что',
  did:(g,p)=>`прошёл(ла) сокращённый курс подготовки к ${g}-му разряду по профессии «${p}»`,
  topics:'Изученные темы и сданные тесты',src:'Курс составлен по официальным источникам',
  note:'Неофициальный документ. Это экспресс-подготовка, а не профессиональное обучение. Официальный разряд присваивает учебный центр или квалификационная комиссия предприятия.',
  date:'Дата',num:'№',ask:'Как написать ваше имя на свидетельстве?',ph:'Имя и фамилия',make:'Сделать свидетельство',
  save:'Скачать',share:'Поделиться',close:'Закрыть',edit:'Изменить имя',hold:'Чтобы сохранить на телефоне, нажмите на картинку и подержите.',
  shareText:(g,p)=>`Я прошёл(ла) подготовку к ${g}-му разряду по профессии «${p}» в Kasb Pro. Попробуй тоже:`},
 uz:{title:'GUVOHNOMA',sub:'qisqartirilgan kursni o\'tganlik haqida',conf:'Ushbu guvohnoma tasdiqlaydiki,',
  did:(g,p)=>`«${p}» kasbi bo'yicha ${g}-razryadga tayyorlov qisqartirilgan kursini o'tdi`,
  topics:'O\'rganilgan mavzular va topshirilgan testlar',src:'Kurs rasmiy manbalar asosida tuzilgan',
  note:'Norasmiy hujjat. Bu tezkor tayyorgarlik, kasbiy ta\'lim emas. Rasmiy razryadni o\'quv markazi yoki korxonaning malaka komissiyasi beradi.',
  date:'Sana',num:'№',ask:'Guvohnomaga ismingizni qanday yozaylik?',ph:'Ism va familiya',make:'Guvohnoma yaratish',
  save:'Yuklab olish',share:'Ulashish',close:'Yopish',edit:'Ismni o\'zgartirish',hold:'Telefonga saqlash uchun rasmni bosib turing.',
  shareText:(g,p)=>`Men Kasb Pro'da «${p}» kasbi bo'yicha ${g}-razryadga tayyorgarlikdan o'tdim. Sen ham sinab ko'r:`}};
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36).toUpperCase().slice(0,6).padStart(6,'0')}
function css(){if(document.getElementById('kc-css'))return;const st=document.createElement('style');st.id='kc-css';st.textContent=`
.kc-bg{position:fixed;inset:0;z-index:9999;background:rgba(10,14,22,.72);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px}
.kc-box{background:#fff;color:#1a2233;border-radius:16px;max-width:520px;width:100%;padding:16px;box-sizing:border-box;font:15px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:auto 0}
.kc-box h3{margin:0 0 10px;font-size:17px}.kc-box input{width:100%;box-sizing:border-box;font:inherit;padding:12px;border:1.5px solid #c8cfda;border-radius:10px;margin:0 0 12px}
.kc-box img{width:100%;height:auto;border-radius:8px;display:block;box-shadow:0 2px 10px rgba(0,0,0,.2)}
.kc-btn{display:block;width:100%;box-sizing:border-box;border:0;border-radius:12px;padding:13px;font:600 15px system-ui,sans-serif;background:#1d2b45;color:#fff;margin-top:10px;cursor:pointer;text-align:center;text-decoration:none}
.kc-btn.g{background:#eef1f5;color:#1d2b45}.kc-hint{font-size:13px;color:#5b6577;margin:8px 0 0}`;document.head.appendChild(st)}

function wrap(ctx,text,maxW){const words=String(text).split(' ');const lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);return lines}

function draw(o,name){
  const L=T[o.lang]||T.ru;const lang=o.lang==='uz'?'uz':'ru';const prof=o.prof[lang]||o.prof.ru;
  const topics=(o.topics&&(o.topics[lang]||o.topics.ru))||[];const sources=(o.sources&&(o.sources[lang]||o.sources.ru))||[];
  const W=1240,H=1754,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const F='system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';const NAVY='#1d2b45',GOLD='#c9a227',INK='#1a2233',MUTED='#5b6577';
  x.fillStyle='#fffdf6';x.fillRect(0,0,W,H);
  x.strokeStyle=NAVY;x.lineWidth=14;x.strokeRect(30,30,W-60,H-60);x.strokeStyle=GOLD;x.lineWidth=4;x.strokeRect(56,56,W-112,H-112);
  x.textAlign='center';x.fillStyle=NAVY;x.font=`800 40px ${F}`;x.fillText('KASB PRO',W/2,150);
  x.fillStyle=MUTED;x.font=`500 24px ${F}`;x.fillText('kasbpro.uz',W/2,186);
  x.fillStyle=NAVY;x.font=`800 84px ${F}`;x.fillText(L.title,W/2,300);
  x.fillStyle=INK;x.font=`500 32px ${F}`;x.fillText(L.sub,W/2,350);
  x.fillStyle=MUTED;x.font=`400 30px ${F}`;x.fillText(L.conf,W/2,430);
  let fs=64;x.font=`700 ${fs}px ${F}`;while(x.measureText(name).width>W-260&&fs>36){fs-=2;x.font=`700 ${fs}px ${F}`}
  x.fillStyle=INK;x.fillText(name,W/2,515);x.strokeStyle=GOLD;x.lineWidth=2;x.beginPath();x.moveTo(200,540);x.lineTo(W-200,540);x.stroke();
  x.font=`500 32px ${F}`;let y=600;wrap(x,L.did(o.grade,prof),W-300).forEach(l=>{x.fillText(l,W/2,y);y+=44});
  // medal
  const my=y+70;x.fillStyle=GOLD;x.beginPath();x.arc(W/2,my,62,0,Math.PI*2);x.fill();x.fillStyle=NAVY;x.beginPath();x.arc(W/2,my,50,0,Math.PI*2);x.fill();
  x.fillStyle='#fff';x.font=`800 50px ${F}`;x.textBaseline='middle';x.fillText(o.grade,W/2,my-4);x.font=`600 15px ${F}`;x.fillText(lang==='uz'?'RAZRYAD':'РАЗРЯД',W/2,my+30);x.textBaseline='alphabetic';
  const fy=H-250;
  let tfs=topics.length>20?20:topics.length>14?22:topics.length>8?24:27,sfs=21,hfs=28;const colW=(W-240)/2;const half=Math.ceil(topics.length/2);
  function block(y0,paint){let y=y0;x.textAlign='left';
    x.fillStyle=NAVY;x.font=`700 ${hfs}px ${F}`;if(paint)x.fillText(L.topics,110,y);y+=16;
    x.font=`400 ${tfs}px ${F}`;const cols=[topics.slice(0,half),topics.slice(half)];let maxY=y;
    cols.forEach((col,ci)=>{let yy=y+tfs+14;col.forEach((t,i)=>{const n=ci*half+i+1;wrap(x,`${n}. ${t}`,colW-10).forEach((l,li)=>{x.fillStyle=INK;if(paint)x.fillText(li?'    '+l:l,110+ci*(colW+20),yy);yy+=Math.round(tfs*1.33)});yy+=2});maxY=Math.max(maxY,yy)});
    y=maxY+Math.round(hfs*1.2);x.fillStyle=NAVY;x.font=`700 ${hfs-2}px ${F}`;if(paint)x.fillText(L.src+':',110,y);y+=Math.round(hfs*1.25);x.font=`400 ${sfs}px ${F}`;x.fillStyle=INK;
    sources.forEach(s=>{wrap(x,'• '+s,W-220).forEach((l,li)=>{if(paint)x.fillText(li?'   '+l:l,110,y);y+=Math.round(sfs*1.33)})});return y-y0}
  const top=my+110,avail=fy-50-top;let bh=block(top,false);
  while(bh>avail&&tfs>12){tfs--;if(sfs>13)sfs-=0.6;if(hfs>20)hfs-=0.5;bh=block(top,false)}
block(top+Math.max(0,(avail-bh)/2),true);
  // footer
  const d=new Date();const ds=`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  x.fillStyle=INK;x.font=`500 24px ${F}`;x.fillText(`${L.date}: ${ds}`,110,fy);x.textAlign='right';
  x.fillText(`${L.num} KP-${(o.prefix||'kp').toUpperCase()}${o.grade}-${hash(name+o.grade+(o.prefix||''))}`,W-110,fy);
  x.textAlign='center';x.fillStyle='#f3efe0';x.fillRect(100,fy+30,W-200,120);x.fillStyle=MUTED;x.font=`400 21px ${F}`;
  let ny=fy+68;wrap(x,L.note,W-260).forEach(l=>{x.fillText(l,W/2,ny);ny+=28});
  x.fillStyle=MUTED;x.font=`500 20px ${F}`;x.fillText(o.url||'kasbpro.uz',W/2,H-80);
  return c;
}

function open(o){
  css();const L=T[o.lang]||T.ru;const key=(o.prefix||'kp')+'_certname';
  const bg=document.createElement('div');bg.className='kc-bg';const box=document.createElement('div');box.className='kc-box';bg.appendChild(box);document.body.appendChild(bg);
  const close=()=>bg.remove();bg.addEventListener('click',e=>{if(e.target===bg)close()});
  function ask(){box.innerHTML=`<h3>${L.ask}</h3><input id="kc-n" maxlength="48" placeholder="${L.ph}" value="${esc(ls.get(key)||'')}"><button class="kc-btn" id="kc-go" type="button">${L.make}</button><button class="kc-btn g" id="kc-x" type="button">${L.close}</button>`;
    const inp=box.querySelector('#kc-n');inp.focus();
    const go=()=>{const v=inp.value.trim().replace(/\s+/g,' ');if(!v){inp.focus();return}ls.set(key,v);show(v)};
    box.querySelector('#kc-go').onclick=go;inp.onkeydown=e=>{if(e.key==='Enter')go()};box.querySelector('#kc-x').onclick=close}
  function show(name){
    const c=draw(o,name);const url=c.toDataURL('image/png');const lang=o.lang==='uz'?'uz':'ru';const prof=o.prof[lang]||o.prof.ru;
    box.innerHTML=`<img src="${url}" alt="${esc(L.title)}"><p class="kc-hint">${L.hold}</p><a class="kc-btn" id="kc-dl" href="${url}" download="kasbpro-${o.prefix||'kp'}-${o.grade}.png">${L.save}</a><button class="kc-btn" id="kc-sh" type="button">${L.share}</button><button class="kc-btn g" id="kc-ed" type="button">${L.edit}</button><button class="kc-btn g" id="kc-x" type="button">${L.close}</button>`;
    box.querySelector('#kc-x').onclick=close;box.querySelector('#kc-ed').onclick=ask;
    box.querySelector('#kc-sh').onclick=async()=>{
      const text=L.shareText(o.grade,prof);const link='https://t.me/kasbpro_uz_bot?start='+(o.start||'site');
      try{const blob=await new Promise(r=>c.toBlob(r,'image/png'));const file=new File([blob],'kasbpro.png',{type:'image/png'});
        if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:text+' '+link});return}}catch(e){if(e&&e.name==='AbortError')return}
      const sh='https://t.me/share/url?url='+encodeURIComponent(link)+'&text='+encodeURIComponent(text);
      const tg=window.Telegram&&window.Telegram.WebApp;if(tg&&tg.openTelegramLink){try{tg.openTelegramLink(sh);return}catch(e){}}window.open(sh,'_blank')};
  }
  if(ls.get(key))show(ls.get(key));else ask();
}
window.KasbCert={open,draw};
})();
