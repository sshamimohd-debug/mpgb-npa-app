// MPGB NPA Quick Search (GitHub Pages static app)
// Updated: manifest-based chunk loading + direct key lookup (chunk[acct]) for fastest search.

const $ = (id) => document.getElementById(id);

const state = {
  current: null,      // { acct, rec }
  cache: new Map(),   // chunk cache: fname -> object
  manifest: null      // array of filenames
};

function todayISO(){
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function cleanAcct(v){
  // normalize: remove spaces, remove trailing .0 if pasted, keep only digits
  const s = String(v ?? "").trim().replace(/\s+/g,'').replace(/\.0$/,'');
  // some users paste with commas
  return s.replace(/,/g,'');
}

function kv(label, value){
  const div = document.createElement('div');
  div.className = 'kv';
  div.innerHTML = `<div class="k">${label}</div><div class="v">${value ?? ''}</div>`;
  return div;
}

// ---------- Follow-up save/load ----------
function saveFollowUp(acct, data){
  localStorage.setItem('fu_'+acct, JSON.stringify(data));
}
function loadSaved(acct){
  try{ return JSON.parse(localStorage.getItem('fu_'+acct)); }
  catch(e){ return null; }
}

// ---------- Data loading ----------
const CHUNKS_BASE = "data/chunks/"; // relative path for GitHub Pages project sites

async function loadManifest(){
  if (state.manifest) return state.manifest;

  // Preferred: manifest.json (files list)
  const res = await fetch(CHUNKS_BASE + "manifest.json", { cache: "no-store" });
  if (res.ok){
    const j = await res.json();
    state.manifest = Array.isArray(j.files) ? j.files : [];
    return state.manifest;
  }

  // Fallback (older format): prefix chunks like 163.json
  state.manifest = null;
  throw new Error("manifest.json not found. Please ensure data/chunks/manifest.json exists.");
}

async function loadChunkByName(fname){
  if (state.cache.has(fname)) return state.cache.get(fname);

  const res = await fetch(CHUNKS_BASE + fname, { cache: "no-store" });
  if (!res.ok) return null;

  const obj = await res.json(); // object-map: { "acct": {..rec..}, ... }
  state.cache.set(fname, obj);
  return obj;
}

async function findRecordByAccount(acct){
  const files = await loadManifest();

  for (const fname of files){
    const chunk = await loadChunkByName(fname);
    if (!chunk) continue;

    // ✅ direct key lookup (your chunks are maps)
    const rec = chunk[acct];
    if (rec) return { fname, rec };
  }
  return null;
}

// ---------- UI rendering ----------
function renderResult(acct, rec){
  const box = $('result');
  box.innerHTML = '';

  const pick = [
    ['Acct Number', acct],
    ['Acct Name', rec['Acct Name'] ?? rec['Acct Name '] ?? rec['Acct Name.'] ?? rec['Acct Name'] ],
    ['Mobile Num', rec['Mobile Num']],
    ['Sol', rec['Sol']],
    ['Region', rec['Region']],
    ['Branch', rec['Branch']],
    ['Scheme Code', rec['Scheme Code']],
    ['O/S Bal', rec['O/S Bal']],
    ['NPA Date', rec['NPA Date']],
    ['Asset Code', rec['Asset Code 30.09.25'] ?? rec['Asset Code']],
    ['Days', rec['Days']],
    ['Provision', rec['Provision']],
  ];

  pick.forEach(([k,v]) => box.appendChild(kv(k,v)));

  $('resultCard').hidden = false;

  const saved = loadSaved(acct);
  $('savedBox').textContent = saved ? JSON.stringify(saved, null, 2) : 'No saved follow-up.';
}

async function onSearch(e){
  if (e?.preventDefault) e.preventDefault();

  const acct = cleanAcct($('acct').value);
  if (!acct){
    alert('Account number required');
    return;
  }

  try{
    const found = await findRecordByAccount(acct);
    if (!found){
      alert('Account not found');
      return;
    }

    state.current = { acct, rec: found.rec };
    renderResult(acct, found.rec);

  }catch(err){
    console.error(err);
    alert(err.message || 'Error while searching');
  }
}

function onClear(e){
  if (e?.preventDefault) e.preventDefault();
  $('acct').value='';
  $('amt').value='';
  $('remarks').value='';
  $('dt').value=todayISO();
  $('resultCard').hidden=true;
  $('result').innerHTML='';
  $('savedBox').textContent='';
  state.current=null;
}

function onSave(e){
  if (e?.preventDefault) e.preventDefault();
  if (!state.current){
    alert('Search an account first');
    return;
  }
  const acct = state.current.acct;
  const data = {
    date: $('dt').value || '',
    amount: $('amt').value || '',
    remarks: $('remarks').value || '',
    savedAt: new Date().toISOString()
  };
  saveFollowUp(acct, data);
  $('savedBox').textContent = JSON.stringify(data, null, 2);
  alert('Saved');
}

function openOnePager(e){
  if (e?.preventDefault) e.preventDefault();
  if (!state.current){
    alert('Search an account first');
    return;
  }
  const acct = state.current.acct;
  const q = new URLSearchParams();
  q.set('acct', acct);
  q.set('dt', $('dt').value || '');
  q.set('amt', $('amt').value || '');
  q.set('remarks', $('remarks').value || '');
  window.location.href = `onepager.html?${q.toString()}`;
}

// ---------- Init ----------
window.addEventListener('DOMContentLoaded', () => {
  $('dt').value = todayISO();

  $('btnSearch').addEventListener('click', onSearch);
  $('btnClear').addEventListener('click', onClear);
  $('btnSave').addEventListener('click', onSave);
  $('btnOnePager').addEventListener('click', openOnePager);

  // Enter key submit support
  const form = $('btnSearch')?.closest('section');
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && document.activeElement?.id === 'acct'){
      ev.preventDefault();
      onSearch(ev);
    }
  });
});
