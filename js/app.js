// MPGB NPA Quick Search (GitHub Pages static app)
const $ = (id) => document.getElementById(id);

const state = {
  cache: new Map(),   // prefix -> object
  current: null       // current record
};

function todayISO(){
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function cleanAcct(s){
  return (s || '').toString().replace(/\s+/g,'').replace(/[^0-9]/g,'');
}

async function loadChunk(prefix){
  if (state.cache.has(prefix)) return state.cache.get(prefix);

  const url = `data/chunks/${prefix}.json`;
  const resp = await fetch(url, {cache:'no-store'});
  if (!resp.ok) throw new Error(`Chunk not found: ${url}`);
  const obj = await resp.json();
  state.cache.set(prefix, obj);
  return obj;
}

function kv(label, value){
  const div = document.createElement('div');
  div.className = 'kv';
  div.innerHTML = `<div class="k">${label}</div><div class="v">${value ?? ''}</div>`;
  return div;
}

function renderResult(acct, rec){
  const box = $('result');
  box.innerHTML = '';

  // Pick key fields (from your All NPA sheet headers)
  const pick = [
    ['Acct Number', acct],
    ['Acct Name', rec['Acct Name']],
    ['Mobile Num', rec['Mobile Num']],
    ['Branch', rec['Branch']],
    ['Sol', rec['Sol']],
    ['Region', rec['Region']],
    ['Scheme Code', rec['Scheme Code']],
    ['O/S Bal', rec['O/S Bal']],
    ['Asset Code', rec['Asset Code 30.09.25'] ?? rec['Asset Code']],
    ['Days', rec['Days']],
    ['Provision', rec['Provision']],
    ['Remarks', rec['Remarks']]
  ];

  pick.forEach(([k,v]) => box.appendChild(kv(k, v)));

  $('resultCard').hidden = false;
  $('savedBox').textContent = loadSaved(acct) || '(none)';
}

function saveFollowup(acct){
  const payload = {
    savedAt: new Date().toISOString(),
    date: $('dt').value || null,
    proposedCompromiseAmt: $('amt').value || null,
    remarks: $('remarks').value || null
  };
  localStorage.setItem(`mpgb_npa_followup_${acct}`, JSON.stringify(payload, null, 2));
  $('savedBox').textContent = JSON.stringify(payload, null, 2);
}

function loadSaved(acct){
  return localStorage.getItem(`mpgb_npa_followup_${acct}`);
}

async function onSearch(){
  const acct = cleanAcct($('acct').value);
  if (!acct){
    alert('Please enter Account Number');
    return;
  }
  const prefix = acct.slice(0,3);
  try{
    const chunk = await loadChunk(prefix);
    const rec = chunk[acct];
    if (!rec){
      alert('Account not found in this prefix file. If you generated full data, check chunks are uploaded.');
      return;
    }
    state.current = {acct, rec};
    renderResult(acct, rec);
  }catch(e){
    alert(e.message);
  }
}

function onClear(){
  $('acct').value='';
  $('amt').value='';
  $('remarks').value='';
  $('dt').value=todayISO();
  $('resultCard').hidden=true;
  $('result').innerHTML='';
  $('savedBox').textContent='';
  state.current=null;
}

function openOnePager(){
  if (!state.current){
    alert('Search an account first');
    return;
  }
  const acct = state.current.acct;
  const q = new URLSearchParams();
  q.set('acct', acct);
  // also pass follow-up inputs
  q.set('dt', $('dt').value || '');
  q.set('amt', $('amt').value || '');
  q.set('remarks', $('remarks').value || '');
  window.location.href = `onepager.html?${q.toString()}`;
}

window.addEventListener('DOMContentLoaded', () => {
  $('dt').value = todayISO();
  $('btnSearch').addEventListener('click', onSearch);
  $('btnClear').addEventListener('click', onClear);
  $('btnOnePager').addEventListener('click', openOnePager);
  $('btnSave').addEventListener('click', () => {
    const acct = cleanAcct($('acct').value);
    if (!acct){ alert('Enter account number first'); return; }
    saveFollowup(acct);
  });

  // allow Enter key
  $('acct').addEventListener('keydown', (e)=>{ if (e.key==='Enter') onSearch(); });
});
