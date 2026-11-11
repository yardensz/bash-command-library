'use strict';
(() => {
  const FILES = {commands:'commands.json', versions:'versions.json'};
  const CACHE_KEYS = {commands:'bash-library-commands-v1', versions:'bash-library-versions-v1', theme:'bash-library-theme-v1'};
  const categories = ['הכול','קבצים ותיקיות','טקסט וחיפוש','מערכת'];
  const state = {data:null, versions:null, selected:null, category:'הכול', query:'', historical:false, online:false};
  const $ = id => document.getElementById(id);
  const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean = v => String(v||'').toLocaleLowerCase().normalize('NFKC').trim();
  const readStorage = key => {try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
  const writeStorage = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Private mode or storage full */}};
  const themeSaved = (()=>{try{return localStorage.getItem(CACHE_KEYS.theme);}catch{return null;}})();
  let toastTimer;
  if (themeSaved === 'dark' || (themeSaved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.dataset.theme='dark';

  function toast(message){const el=$('toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),2500);}
  function setStatus(label,mode){$('statusPill').textContent=(mode==='online'?'● ':mode==='offline'?'◌ ':'◔ ')+label;state.online=mode==='online';}
  function setData(data,historical=false){
    if(!data || !Array.isArray(data.commands)) throw new Error('Invalid commands database');
    state.data=data;state.historical=historical;
    $('commandCount').textContent=data.commands.length;
    $('versionLabel').textContent='גרסה '+(data.version||'—')+(historical?' · תצוגה היסטורית':'');
    const updated = data.updatedAt ? new Date(data.updatedAt+'T00:00:00') : null;
    $('syncInfo').textContent=historical?'אתה צופה בגרסה קודמת. המאגר הציבורי לא השתנה.': 'עדכון המאגר: '+(updated&&!isNaN(updated)?updated.toLocaleDateString('he-IL'):'לא ידוע')+' · נשמר מקומית לצפייה אופליין';
    if(!data.commands.some(c=>c.id===state.selected))state.selected=data.commands[0]?.id||null;
    render();
  }
  function matches(cmd,q){if(!q)return true;const parts=q.split(/\s+/).filter(Boolean);const corpus=clean([cmd.id,cmd.name,cmd.summary,cmd.description,cmd.category,cmd.syntax,...(cmd.keywords||[]),...(cmd.options||[]).flatMap(o=>[o.flag,o.description]),...(cmd.examples||[]).flatMap(e=>[e.command,e.description])].join(' '));return parts.every(p=>corpus.includes(p));}
  function filtered(){return(state.data?.commands||[]).filter(c=>(state.category==='הכול'||c.category===state.category)&&matches(c,clean(state.query)));}
  function render(){
    renderCategories(); const arr=filtered();$('resultsCount').textContent=arr.length+' תוצאות';
    if(arr.length && !arr.some(c=>c.id===state.selected))state.selected=arr[0].id;
    $('commandList').innerHTML=arr.length?arr.map(c=>`<button type="button" class="cmd-item ${state.selected===c.id?'active':''}" data-command="${esc(c.id)}" aria-current="${state.selected===c.id?'true':'false'}"><span class="cmd-symbol" dir="ltr">${esc(c.name)}</span><span class="cmd-item-text"><span class="cmd-description">${esc(c.summary)}</span></span><span class="cmd-arrow">‹</span></button>`).join(''):'<div class="empty"><strong>לא נמצאו פקודות</strong>אפשר לנסות מילת חיפוש אחרת.</div>';
    $('commandList').querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.command)));
    renderDetails(arr.find(c=>c.id===state.selected)||arr[0]);
  }
  function renderCategories(){ $('categories').innerHTML=categories.map(c=>`<button type="button" class="chip ${state.category===c?'active':''}" data-category="${esc(c)}" aria-pressed="${state.category===c}">${esc(c)}</button>`).join('');$('categories').querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.category;render();})); }
  function select(id){state.selected=id;render();if(innerWidth<781)$('mainContent').scrollIntoView({behavior:'smooth',block:'start'});}
  // Visual syntax guide: the raw command stays unchanged for copying.
  // Token classes describe the role of each piece rather than attempting to parse all of Bash.
  function colorCode(value, template=false) {
    const tokens = String(value||'').match(/\s+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\$\{[^}]+\}|\$[a-zA-Z_][\w]*|--?[\w-]+(?:=[^\s\]]+)?|[|&;<>]+|[\[\](){}]|[^\s\[\](){}|&;<>]+/g) || [];
    let expectCommand = true;
    return tokens.map(token => {
      if (/^\s+$/.test(token)) return esc(token);
      let kind = '';
      if (/^[\[\](){}]$/.test(token)) kind = 'punct';
      else if (/^[|&;<>]+$/.test(token)) {kind = template ? 'punct' : 'operator'; if(!template)expectCommand=true;}
      else if (/^--?[a-zA-Z\w]/.test(token)) kind = 'flag';
      else if (/^(options?|flags?)$/i.test(token)) kind = 'option';
      else if (/^\$/.test(token)) kind = 'var';
      else if (/^['"]/.test(token)) kind = 'string';
      else if (expectCommand) {kind = 'command'; expectCommand=false;}
      else if (/^(?:\.{1,2}\/|~\/|\/)|[\\/]|\.\w+(?:\.\w+)*$/.test(token) || /^(?:path|directory|source|destination|file|files|folder|dir|archive)$/i.test(token)) kind = 'path';
      else if (template || /^(?:N|seconds|pattern|name|keyword|section|expression|text|command|mode|user)$/i.test(token)) kind = 'arg';
      return kind ? `<span class="syntax-${kind}">${esc(token)}</span>` : esc(token);
    }).join('');
  }
  const syntaxLegend = `<div class="syntax-legend" aria-label="מקרא צבעי התחביר"><span><i class="leg-command"></i>פקודה</span><span><i class="leg-flag"></i>אפשרות / דגל</span><span><i class="leg-arg"></i>ארגומנט</span><span><i class="leg-path"></i>נתיב או קובץ</span></div>`;
  function renderDetails(c){
    if(!c){$('mainContent').innerHTML='<div class="empty"><strong>אין פקודה להצגה</strong>נסה להסיר מסנן או לשנות את החיפוש.</div>';return;}
    const options=(c.options||[]).map(o=>`<div class="option-card"><code dir="ltr">${esc(o.flag)}</code><span>${esc(o.description)}</span></div>`).join('');
    const examples=(c.examples||[]).map(e=>`<div class="example"><div class="example-head"><span class="example-desc">${esc(e.description)}</span><button class="btn tiny" type="button" data-copy="${esc(e.command)}" aria-label="העתק דוגמה">העתק</button></div><pre><code>${colorCode(e.command)}</code></pre></div>`).join('');
    $('mainContent').innerHTML=`<article class="detail"><div class="detail-header"><div><div class="eyebrow">${esc(c.category)}${state.historical?' · גרסה היסטורית':''}</div><h2 dir="ltr">${esc(c.name)}</h2><p class="detail-description">${esc(c.summary)}</p><span class="tag">${c.type==='builtin'?'פקודה מובנית ב־Bash':'כלי שורת פקודה'}</span></div><button class="btn tiny" id="shareBtn" type="button" title="העתק קישור לפקודה">קישור</button></div><h3>תחביר</h3><div class="codebar"><code>${colorCode(c.syntax,true)}</code><button class="copy-code" type="button" data-copy="${esc(c.syntax)}">העתק</button></div>${syntaxLegend}<h3>אפשרויות ופרמטרים</h3><div class="option-grid">${options||'<p>לפקודה זו אין אפשרויות בסיסיות נוספות במאגר.</p>'}</div><section class="command-explanation"><h3>הסבר קצר</h3><p>${esc(c.description)}</p></section><h3>דוגמאות לשימוש</h3>${examples}${c.note?`<div class="note"><strong>כדאי לדעת:</strong> ${esc(c.note)}</div>`:''}</article>`;
    $('mainContent').querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>copy(b.dataset.copy)));
    $('shareBtn').addEventListener('click',()=>{const url=new URL(location.href);url.hash='cmd='+encodeURIComponent(c.id);copy(url.href);});
  }
  async function copy(value){try{await navigator.clipboard.writeText(value);toast('הועתק ללוח');}catch{try{const t=document.createElement('textarea');t.value=value;t.style.position='fixed';t.style.left='-9999px';document.body.append(t);t.select();document.execCommand('copy');t.remove();toast('הועתק ללוח');}catch{toast('לא ניתן להעתיק אוטומטית');}}}
  async function getJSON(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);return response.json();}
  async function refresh(silent=false){
    if(!silent)setStatus('בודק עדכונים…','loading');
    try{
      const [data, versions]=await Promise.all([getJSON(FILES.commands),getJSON(FILES.versions)]);
      if(!data?.version||!Array.isArray(data.commands)||!Array.isArray(versions?.releases))throw new Error('Invalid JSON structure');
      const oldVersion=state.data?.version;
      state.versions=versions;writeStorage(CACHE_KEYS.commands,data);writeStorage(CACHE_KEYS.versions,versions);
      if(!state.historical)setData(data);
      setStatus('מעודכן · מחובר','online');
      if(!silent)toast(oldVersion&&oldVersion!==data.version?'גרסה חדשה נטענה: '+data.version:'המאגר מעודכן');
    }catch(error){
      setStatus(state.data?'אופליין · עותק שמור':'לא ניתן לטעון','offline');
      if(!state.data){$('mainContent').innerHTML='<div class="empty"><strong>לא ניתן לטעון את המאגר.</strong>יש לפתוח את האתר דרך GitHub Pages בזמן שיש אינטרנט, לפחות בפעם הראשונה.</div>';}
      if(!silent)toast('לא הצלחנו לבדוק עדכונים. ניתן להשתמש בגרסה השמורה.');
    }
  }
  function showModal(title,html){$('modalTitle').textContent=title;$('modalContent').innerHTML=html;$('modalBackdrop').classList.remove('hidden');$('modalClose').focus();}
  function closeModal(){$('modalBackdrop').classList.add('hidden');}
  function showHelp(){showModal('איך קוראים את התחביר?',`<div class="legend"><p>התחביר מסמן את מבנה הפקודה, ולא תמיד משהו שצריך להקליד בדיוק כפי שמוצג. לדוגמה: <code>ls [options] [path]</code>.</p><p><strong>הצבעים:</strong> פקודה מופיעה בצבע בהיר, אפשרויות כגון <code>-a</code> בצבע ירקרק, ארגומנטים כגון <code>N</code> בצבע זהוב, ונתיבים בצבע ירוק בהיר. בדוגמאות מחרוזות במירכאות מקבלות צבע נפרד.</p><p><code>[...]</code> פירושו רכיב אופציונלי, והסוגריים אינם חלק מהפקודה. <code>...</code> פירושו שניתן לרוב לספק יותר מערך אחד. קו אנכי <code>|</code> בתבנית יכול לסמן בחירה; בין שתי פקודות אמיתיות הוא מעביר פלט ביניהן.</p><p>רבות מהפקודות כאן הן כלים של Unix ולא פקודות מובנות ב־Bash. דגלים מסוימים שונים בין Linux, macOS וסביבות אחרות. להרחבה אפשר להיעזר ב־<code>man</code> או <code>--help</code>, אם זמינים.</p><p>החיפוש עובד בעברית ובאנגלית. <code>/</code> מעביר לשדה החיפוש, החצים בוחרים תוצאה ו־Enter פותח אותה. העתקת פקודה מעתיקה את הטקסט המקורי — בלי צבעים או סימוני HTML.</p></div>`);}
  function renderVersionModal(){
    const list=state.versions?.releases||[];
    let html='<p>כל גרסה משמרת צילום מצב של מאגר הפקודות. צפייה בגרסה ישנה לא משנה את האתר עבור משתמשים אחרים.</p>';
    if(!list.length)html+='<p>היסטוריית גרסאות אינה זמינה כרגע.</p>';
    html+=list.map(v=>`<div class="version-item"><div class="version-body"><strong>${esc(v.title)} · ${esc(v.version)}</strong> ${v.version===state.versions.latestVersion?'<span class="version-badge">החדשה ביותר</span>':''}<small>${esc(v.date)} · ${esc(v.summary)} · ${esc(v.commandCount)} פקודות</small></div><div class="version-actions"><button class="btn tiny" data-version="${esc(v.version)}" type="button">הצג</button></div></div>`).join('');
    if(state.historical)html+='<button class="btn primary" id="returnCurrent" type="button">חזור לגרסה העדכנית</button>';
    showModal('היסטוריית גרסאות',html);
    $('modalContent').querySelectorAll('[data-version]').forEach(b=>b.addEventListener('click',()=>loadVersion(b.dataset.version)));
    $('returnCurrent')?.addEventListener('click',()=>{const data=readStorage(CACHE_KEYS.commands);if(data){setData(data);setStatus(navigator.onLine?'עותק עדכני שמור':'אופליין · עותק שמור',navigator.onLine?'online':'offline');closeModal();refresh(true);}});
  }
  async function loadVersion(version){
    const release=(state.versions?.releases||[]).find(v=>v.version===version);
    if(!release)return;
    try{
      // Only versions advertised by versions.json may be loaded; no user-provided paths.
      const data=await getJSON(release.snapshot);
      if(data.version!==version||!Array.isArray(data.commands))throw new Error('Version mismatch');
      setData(data,version!==state.versions.latestVersion);closeModal();toast('נטענה גרסה '+version);
    }catch{const current=readStorage(CACHE_KEYS.commands);if(current?.version===version){setData(current,false);closeModal();toast('נטענה הגרסה השמורה');}else toast('גרסה זו אינה זמינה כרגע. אפשר לנסות שוב עם אינטרנט.');}
  }
  $('searchInput').addEventListener('input',e=>{state.query=e.target.value;render();});
  $('searchInput').addEventListener('keydown',e=>{
    const arr=filtered();
    if((e.key==='ArrowDown'||e.key==='ArrowUp')&&arr.length){
      const idx=arr.findIndex(c=>c.id===state.selected);
      const next=e.key==='ArrowDown'?(idx+1)%arr.length:(idx-1+arr.length)%arr.length;
      state.selected=arr[next].id;render();
      $('commandList').querySelector('.cmd-item.active')?.scrollIntoView({block:'nearest'});
      e.preventDefault();
    }
    if(e.key==='Enter'){const first=arr.find(c=>c.id===state.selected)||arr[0];if(first)select(first.id);e.preventDefault();}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();$('searchInput').blur();}if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&$('modalBackdrop').classList.contains('hidden')){e.preventDefault();$('searchInput').focus();$('searchInput').select();}});
  $('themeBtn').addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem(CACHE_KEYS.theme,next);}catch{}});
  $('historyBtn').addEventListener('click',renderVersionModal);
  $('helpBtn').addEventListener('click',showHelp);
  $('refreshBtn').addEventListener('click',()=>refresh(false));
  $('modalClose').addEventListener('click',closeModal);
  $('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeModal();});
  window.addEventListener('online',()=>refresh(true));
  const initialHash=(()=>{try{return new URLSearchParams(location.hash.slice(1)).get('cmd');}catch{return null;}})();
  state.selected=initialHash;
  const initial=readStorage(CACHE_KEYS.commands), versionCache=readStorage(CACHE_KEYS.versions);
  if(versionCache?.releases)state.versions=versionCache;
  if(initial?.commands){setData(initial);setStatus('עותק שמור · בודק עדכונים','loading');}
  refresh(true);
  if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();