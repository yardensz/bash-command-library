'use strict';
(() => {
  const FILES = {commands:'commands.json', versions:'versions.json'};
  const CACHE_KEYS = {commands:'bash-library-commands-v1', versions:'bash-library-versions-v1', theme:'bash-library-theme-v1'};
  const categories = ['All','Files & Directories','Text & Search','System','Network & Web','Control Flow & Loops','Concepts & Syntax'];
  const state = {data:null, versions:null, selected:null, category:'All', query:'', historical:false, online:false};
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
    $('itemCountLabel').textContent='commands · '+(data.topics?.length||0)+' guides';
    $('versionLabel').textContent='Version '+(data.version||'—')+(historical?' · historical view':'');
    const updated = data.updatedAt ? new Date(data.updatedAt+'T00:00:00') : null;
    $('syncInfo').textContent=historical?'Viewing an earlier version. The public library has not changed.': 'Library updated: '+(updated&&!isNaN(updated)?updated.toLocaleDateString('en-US'):'unknown')+' · saved locally for offline access';
    if(![...data.commands,...(data.topics||[])].some(c=>c.id===state.selected))state.selected=data.commands[0]?.id||data.topics?.[0]?.id||null;
    render();
  }

  // Keyboard layout recovery maps physical key positions, not translated words.
  const layout = Object.fromEntries([
    [0x05e7,'e'],[0x05e8,'r'],[0x05d0,'t'],[0x05d8,'y'],[0x05d5,'u'],[0x05df,'i'],
    [0x05dd,'o'],[0x05e4,'p'],[0x05e9,'a'],[0x05d3,'s'],[0x05d2,'d'],[0x05db,'f'],
    [0x05e2,'g'],[0x05d9,'h'],[0x05d7,'j'],[0x05dc,'k'],[0x05da,'l'],[0x05d6,'z'],
    [0x05e1,'x'],[0x05d1,'c'],[0x05d4,'v'],[0x05e0,'b'],[0x05de,'n'],[0x05e6,'m'],
    [0x05ea,','],[0x05e5,'.'],[0x05e3,';']
  ]);
  const allEntries=()=>[...(state.data?.commands||[]),...(state.data?.topics||[])];
  function alternateQuery(q){
    if(!/[\u0590-\u05FF]/.test(q))return q;
    return Array.from(q).map(ch=>layout[ch.codePointAt(0)]||(ch==="'"?'w':ch==='/'?'q':ch)).join('');
  }

  function searchFields(c){
    const fields=[
      {label:'Name',text:c.name},{label:'Summary',text:c.summary},
      {label:'Description',text:c.description},{label:'Syntax',text:c.syntax},
      ...(c.options||[]).flatMap(o=>[
        {label:'Option '+o.flag,text:o.flag},
        {label:'Option '+o.flag,text:o.description},
        ...(o.info?.text?[{label:'Flag tip '+o.flag,text:o.info.text}]:[])
      ]),
      ...(c.examples||[]).flatMap(e=>[
        {label:'Example',text:e.command},{label:'Example explanation',text:e.description},
        ...(e.output?[{label:'Example output',text:e.output}]:[])
      ]),
      ...(c.sections||[]).flatMap(s=>[
        {label:'Guide section',text:s.title},{label:'Guide section',text:s.body},
        ...(s.items||[]).flatMap(x=>[{label:'Guide example',text:x.term},{label:'Guide explanation',text:x.definition}])
      ]),
      ...(c.practice||[]).map(x=>({label:'Best practices',text:x})),
      ...(c.keywords||[]).map(x=>({label:'Keyword',text:x})),
      ...Object.entries(c.output||{}).filter(([k])=>k==='stdout').map(([k,v])=>({label:'Output & behavior',text:v})),
      ...(c.nameInfo?[{label:'Name meaning',text:c.nameInfo.text}]:[]),
      ...(c.links||[]).map(l=>({label:'Resource',text:l.title})),
      {label:'Category',text:c.category},{label:'ID',text:c.id}
    ];
    return fields.filter(f=>typeof f.text==='string'&&f.text);
  }
  function corpus(c){return clean(searchFields(c).map(f=>f.text).join(' '));}
  function activeQueries(){
    const q=clean(state.query);
    return q && /[\u0590-\u05FF]/.test(q)?[q,clean(alternateQuery(q))]:[q];
  }
  function score(c,queries){
    if(!queries.some(Boolean))return 10;
    const name=clean(c.name),id=clean(c.id);
    return Math.min(...queries.filter(Boolean).map(q=>
      name===q||id===q?0:name.startsWith(q)?1:
      (c.keywords||[]).some(k=>clean(k)===q)?2:id.startsWith(q)?3:
      name.includes(q)?4:5
    ));
  }
  function filtered(){
    const queries=activeQueries();
    return allEntries().filter(c=>{
      if(state.category!=='All'&&c.category!==state.category)return false;
      const text=corpus(c);
      const exactShort=queries.find(q=>/^[a-z0-9]{2,3}$/.test(q)&&allEntries().some(item=>clean(item.name)===q));
      if(exactShort && clean(c.name)!==exactShort){
        const wordPattern=new RegExp('(^|[^a-z0-9_])'+exactShort+'(?=$|[^a-z0-9_])');
        if(!searchFields(c).some(field=>wordPattern.test(clean(field.text))))return false;
      }
      return queries.some(q=>!q||q.split(/\s+/).every(t=>text.includes(t)));
    }).sort((a,b)=>score(a,queries)-score(b,queries));
  }
  function reason(c){
    const queries=activeQueries().filter(Boolean);
    if(!queries.length)return null;
    const fields=searchFields(c);
    // Keep the highlighted text literal: never invent a reason for a search result.
    for(const field of fields){
      const hay=clean(field.text);
      for(const q of queries){
        const needle=hay.includes(q)?q:q.split(/\s+/).find(t=>t&&hay.includes(t));
        if(needle)return {label:field.label,text:field.text,needle};
      }
    }
    return null;
  }
  function highlight(value,needle,clip=false){
    const original=String(value||''),low=clean(original),term=clean(needle);
    const at=term?low.indexOf(term):-1;
    if(at<0)return esc(clip&&original.length>105?original.slice(0,102)+'...':original);
    const lo=clip?Math.max(0,at-30):0;
    const hi=clip?Math.min(original.length,Math.max(at+term.length+52,lo+80)):original.length;
    return (lo?'…':'')+esc(original.slice(lo,at))+
      '<mark class="search-match">'+esc(original.slice(at,at+term.length))+'</mark>'+
      esc(original.slice(at+term.length,hi))+(hi<original.length?'…':'');
  }
  function render(){
    renderCategories();const arr=filtered();
    $('resultsCount').textContent=arr.length+' results';
    if(arr.length&&!arr.some(c=>c.id===state.selected))state.selected=arr[0].id;
    $('commandList').innerHTML=arr.length?arr.map(c=>{
      const match=reason(c),name=match?.label==='Name'?highlight(c.name,match.needle):esc(c.name);
      const context=state.query&&match&&match.label!=='Name'
        ?`<span class="match-line"><span class="match-source">${esc(match.label)}:</span> ${highlight(match.text,match.needle,true)}</span>`:'';
      return `<button type="button" class="cmd-item ${c.type==='guide'?'guide-item':''} ${state.selected===c.id?'active':''}" data-command="${esc(c.id)}" aria-current="${state.selected===c.id?'true':'false'}"><span class="cmd-symbol" title="${esc(c.name)}">${name}</span><span class="cmd-item-text"><span class="cmd-description">${esc(c.summary)}</span>${context}</span>${c.type==='guide'?'<span class="cmd-kind">Guide</span>':''}<span class="cmd-arrow">›</span></button>`;
    }).join(''):'<div class="empty"><strong>No results found</strong>Try a different command, flag or syntax topic.</div>';
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
  const syntaxLegend = `<div class="syntax-legend" aria-label="Syntax color legend"><span><i class="leg-command"></i>Command</span><span><i class="leg-flag"></i>Option / flag</span><span><i class="leg-arg"></i>Argument</span><span><i class="leg-path"></i>Path or file</span></div>`;

  const shareButton='<button class="btn tiny" id="shareBtn" type="button" title="Copy a link to this entry">Link</button>';
  function infoControls(c){
    const info=c.nameInfo;
    if(!info)return '<div class="detail-actions">'+shareButton+'</div>';
    return `<div class="detail-actions" id="nameInfoControl">${shareButton}<button class="nameinfo-button" id="nameInfoBtn" type="button" aria-label="What does ${esc(c.name)} mean?" aria-controls="nameInfoPopup" aria-expanded="false" title="What does the name mean?">i</button><div class="nameinfo-popover" id="nameInfoPopup" role="note" hidden><strong>${esc(info.kind)}</strong><p>${esc(info.text)}</p></div></div>`;
  }
  function closeNameInfo(){
    const popup=$('nameInfoPopup'),button=$('nameInfoBtn');
    if(popup&&!popup.hidden){popup.hidden=true;if(button)button.setAttribute('aria-expanded','false');}
  }
  function setupNameInfo(){
    const button=$('nameInfoBtn'),popup=$('nameInfoPopup');
    if(!button||!popup)return;
    button.addEventListener('click',()=>{
      const willOpen=popup.hidden;
      popup.hidden=!willOpen;
      button.setAttribute('aria-expanded',String(willOpen));
    });
  }

  function optionHTML(o,i){
    const tip=o.info;
    const btn=tip?`<button class="flaginfo-button" id="flagInfoButton-${i}" data-flag-button="${i}" type="button" aria-label="Explain ${esc(o.flag)}" aria-expanded="false" aria-controls="flagInfoPopup-${i}" title="Remember this option">i</button>`:'';
    const popup=tip?`<div class="flaginfo-popover" id="flagInfoPopup-${i}" data-flag-popover="${i}" role="note" hidden><strong>${esc(tip.kind)}</strong><p>${esc(tip.text)}</p></div>`:'';
    return `<div class="option-card"><span class="option-key"><code dir="ltr">${esc(o.flag)}</code>${btn}</span><span class="option-description">${esc(o.description)}</span>${popup}</div>`;
  }
  function closeFlagInfos(){
    $('mainContent').querySelectorAll('[data-flag-popover]').forEach(p=>{
      p.hidden=true;p.parentElement.classList.remove('flag-open');
    });
    $('mainContent').querySelectorAll('[data-flag-button]').forEach(b=>b.setAttribute('aria-expanded','false'));
  }
  function setupFlagInfos(){
    $('mainContent').querySelectorAll('[data-flag-button]').forEach(b=>b.addEventListener('click',()=>{
      const idx=b.dataset.flagButton,p=$('flagInfoPopup-'+idx);
      if(!p)return;
      const open=p.hidden;
      closeFlagInfos();
      if(open){p.hidden=false;b.setAttribute('aria-expanded','true');p.parentElement.classList.add('flag-open');}
    }));
  }

  function exampleHTML(e){
    return `<div class="example"><div class="example-head"><span class="example-desc">${esc(e.description)}</span><button class="btn tiny" type="button" data-copy="${esc(e.command)}" aria-label="Copy example">Copy</button></div><pre><code>${colorCode(e.command)}</code></pre>${e.output!==undefined?`<div class="sample-label">Example output</div><pre class="sample-output"><code>${esc(e.output)}</code></pre>`:''}</div>`;
  }
  function renderDetails(c){
    if(!c){$('mainContent').innerHTML='<div class="empty"><strong>No entry selected</strong>Change your search or remove a filter.</div>';return;}
    const examples=(c.examples||[]).map(exampleHTML).join('');
    const practices=(c.practice||[]).length?`<section class="guide-section"><h3>Best practices</h3><ul class="practice-list">${c.practice.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></section>`:'';
    if(c.type==='guide'){
      const sections=(c.sections||[]).map(s=>`<section class="guide-section"><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p>${(s.items||[]).length?`<div class="guide-table">${s.items.map(x=>`<div class="guide-row"><code>${esc(x.term)}</code><span>${esc(x.definition)}</span></div>`).join('')}</div>`:''}</section>`).join('');
      const links=(c.links||[]).filter(l=>/^https:\/\/[^\s]+$/i.test(l.url)).map(l=>`<a class="resource-link" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(l.title)}</strong><small>${esc(l.note||'Open external resource')}</small></a>`).join('');
      $('mainContent').innerHTML=`<article class="detail guide-detail"><div class="detail-header"><div><div class="eyebrow">Concepts &amp; Syntax${state.historical?' · historical version':''}</div><h2>${esc(c.name)}</h2><p class="detail-description">${esc(c.summary)}</p><span class="tag">Reference guide · not a command</span></div>${infoControls(c)}</div><p class="guide-intro">${esc(c.description)}</p>${sections}${practices}<h3>Examples</h3>${examples}${links?`<section class="guide-section"><h3>Further resources</h3><div class="guide-resources">${links}</div></section>`:''}</article>`;
    }else{
      const options=(c.options||[]).map(optionHTML).join('');
      const output=c.output?`<section class="output-section"><h3>Output &amp; behavior</h3><div class="behavior-grid">${Object.entries({stdout:c.output.stdout,stderr:c.output.stderr,'Exit status':c.output.exitStatus,'Side effects':c.output.sideEffects}).filter(([,v])=>v).map(([k,v])=>`<div><strong>${esc(k)}</strong><span>${esc(v)}</span></div>`).join('')}</div></section>`:'';
      $('mainContent').innerHTML=`<article class="detail"><div class="detail-header"><div><div class="eyebrow">${esc(c.category)}${state.historical?' · historical version':''}</div><h2 dir="ltr">${esc(c.name)}</h2><p class="detail-description">${esc(c.summary)}</p><span class="tag">${c.type==='keyword'?'Bash keyword / syntax':c.type==='builtin'?'Bash builtin':'Command-line utility'}</span></div>${infoControls(c)}</div><h3>Syntax</h3><div class="codebar"><code>${colorCode(c.syntax,true)}</code><button class="copy-code" type="button" data-copy="${esc(c.syntax)}">Copy</button></div>${syntaxLegend}<h3>Options and parameters</h3><div class="option-grid">${options||'<p>No additional options are listed for this command.</p>'}</div>${output}<section class="command-explanation"><h3>Overview</h3><p>${esc(c.description)}</p></section>${practices}<h3>Examples</h3>${examples}${c.note?`<div class="note"><strong>Good to know:</strong> ${esc(c.note)}</div>`:''}</article>`;
    }
    $('mainContent').querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>copy(b.dataset.copy)));
    $('shareBtn').addEventListener('click',()=>{const url=new URL(location.href);url.hash='cmd='+encodeURIComponent(c.id);copy(url.href);});
    setupNameInfo();
    setupFlagInfos();
  }
  async function copy(value){try{await navigator.clipboard.writeText(value);toast('Copied to clipboard');}catch{try{const t=document.createElement('textarea');t.value=value;t.style.position='fixed';t.style.left='-9999px';document.body.append(t);t.select();document.execCommand('copy');t.remove();toast('Copied to clipboard');}catch{toast('Could not copy automatically');}}}
  async function getJSON(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);return response.json();}
  async function refresh(silent=false){
    if(!silent)setStatus('Checking for updates...','loading');
    try{
      const [data, versions]=await Promise.all([getJSON(FILES.commands),getJSON(FILES.versions)]);
      if(!data?.version||!Array.isArray(data.commands)||!Array.isArray(versions?.releases))throw new Error('Invalid JSON structure');
      const oldVersion=state.data?.version;
      state.versions=versions;writeStorage(CACHE_KEYS.commands,data);writeStorage(CACHE_KEYS.versions,versions);
      if(!state.historical)setData(data);
      setStatus('Up to date · online','online');
      if(!silent)toast(oldVersion&&oldVersion!==data.version?'New version loaded: '+data.version:'The library is up to date');
    }catch(error){
      setStatus(state.data?'Offline · cached copy':'Unable to load','offline');
      if(!state.data){$('mainContent').innerHTML='<div class="empty"><strong>Unable to load the library.</strong>Open this site online through GitHub Pages at least once to enable offline access.</div>';}
      if(!silent)toast('Update check failed; the cached library is still available.');
    }
  }
  function showModal(title,html){$('modalTitle').textContent=title;$('modalContent').innerHTML=html;$('modalBackdrop').classList.remove('hidden');$('modalClose').focus();}
  function closeModal(){$('modalBackdrop').classList.add('hidden');}
  function showHelp(){showModal('How to read command syntax',`<div class="legend"><p>Syntax describes the structure of a command; you do not always type every symbol shown. Example: <code>ls [options] [path]</code>.</p><p><strong>Colors:</strong> command names are light, flags such as <code>-a</code> are teal, arguments such as <code>N</code> are gold, and paths are green. Quoted strings use a separate color.</p><p><code>[...]</code> marks an optional element. Do not type these brackets unless the actual command requires them. <code>...</code> means an argument can usually be repeated. In a syntax template, <code>|</code> may mean a choice; between real commands it creates a pipeline.</p><p>Many entries are Unix command-line utilities rather than Bash builtins. Some flags differ between Linux, macOS, and other environments. See <code>man</code> or <code>--help</code> for platform-specific help.</p><p>Search by command, task, flag, or syntax guide. Results highlight the source of each match; use the small i buttons beside commands and flags for memory tips. Press <code>/</code> to focus the search field; use arrow keys to select results and Enter to open one. Copy buttons copy plain text without styling.</p></div>`);}
  function renderVersionModal(){
    const list=state.versions?.releases||[];
    let html='<p>Each release is a saved snapshot of the command library. Browsing older releases does not change the public website.</p>';
    if(!list.length)html+='<p>Version history is not currently available.</p>';
    html+=list.map(v=>`<div class="version-item"><div class="version-body"><strong>${esc(v.title)} · ${esc(v.version)}</strong> ${v.version===state.versions.latestVersion?'<span class="version-badge">Latest</span>':''}<small>${esc(v.date)} · ${esc(v.summary)} · ${esc(v.commandCount)} commands${v.topicCount?' · '+esc(v.topicCount)+' guides':''}</small></div><div class="version-actions"><button class="btn tiny" data-version="${esc(v.version)}" type="button">View</button></div></div>`).join('');
    if(state.historical)html+='<button class="btn primary" id="returnCurrent" type="button">Return to latest version</button>';
    showModal('Version history',html);
    $('modalContent').querySelectorAll('[data-version]').forEach(b=>b.addEventListener('click',()=>loadVersion(b.dataset.version)));
    $('returnCurrent')?.addEventListener('click',()=>{const data=readStorage(CACHE_KEYS.commands);if(data){setData(data);setStatus(navigator.onLine?'Latest cached copy':'Offline · cached copy',navigator.onLine?'online':'offline');closeModal();refresh(true);}});
  }
  async function loadVersion(version){
    const release=(state.versions?.releases||[]).find(v=>v.version===version);
    if(!release)return;
    try{
      // Only versions advertised by versions.json may be loaded; no user-provided paths.
      const data=await getJSON(release.snapshot);
      if(data.version!==version||!Array.isArray(data.commands))throw new Error('Version mismatch');
      setData(data,version!==state.versions.latestVersion);closeModal();toast('Loaded version '+version);
    }catch{const current=readStorage(CACHE_KEYS.commands);if(current?.version===version){setData(current,false);closeModal();toast('Loaded cached version');}else toast('This version is unavailable offline. Try again with an internet connection.');}
  }
  document.addEventListener('click',event=>{
    const wrapper=$('nameInfoControl');
    if(wrapper && !wrapper.contains(event.target))closeNameInfo();
    if(!event.target.closest?.('.option-card'))closeFlagInfos();
  });
  $('searchInput').addEventListener('input',e=>{state.query=e.target.value;state.selected=null;render();});
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
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeNameInfo();closeFlagInfos();$('searchInput').blur();}if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&$('modalBackdrop').classList.contains('hidden')){e.preventDefault();$('searchInput').focus();$('searchInput').select();}});
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
  if(initial?.commands){setData(initial);setStatus('Cached copy · checking for updates','loading');}
  refresh(true);
  if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();