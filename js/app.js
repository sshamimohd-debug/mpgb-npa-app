// ================== BASIC HELPERS ==================
const $ = (id) => document.getElementById(id);

function kv(k, v){
  const d = document.createElement('div');
  d.className = 'kv';
  d.innerHTML = `<b>${k}</b>: ${v ?? ''}`;
  return d;
}

function setText(id, value){
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

// ================== STORAGE ==================
function saveFollowUp(acct, data){
  localStorage.setItem('fu_'+acct, JSON.stringify(data));
}
function loadSaved(acct){
  try{
    return JSON.parse(localStorage.getItem('fu_'+acct));
  }catch(e){ return null; }
}

// ================== DATA LOADING (MANIFEST + CACHE) ==================
const CHUNKS_BASE = "data/chunks/"; // keep relative (no leading slash)
let manifestFiles = null;
const chunkCache = new Map();

function cleanAcct(v){
  // remove spaces and trailing .0
  return String(v ?? "").replace(/\s+/g, "").replace(/\.0$/,"").trim();
}

async function loadManifest(){
  if (manifestFiles) return manifestFiles;

  const res = await fetch(CHUNKS_BASE + "manifest.json", { cache: "no-store" });
  if(!res.ok){
    throw new Error("manifest.json not found. Please ensure data/chunks/manifest.json exists on GitHub Pages.");
  }

  const j = await res.json(); // { files: [...] }
  manifestFiles = Array.isArray(j.files) ? j.files : [];
  return manifestFiles;
}

async function loadChunkByName(fname){
  if (chunkCache.has(fname)) return chunkCache.get(fname);

  const res = await fetch(CHUNKS_BASE + fname, { cache: "no-store" });
  if(!res.ok) return null;

  const obj = await res.json(); // object-map: { "acct": {..rec..}, ... }
  chunkCache.set(fname, obj);
  return obj;
}

// ================== MAIN SEARCH ==================
async function doSearch(e){
  if (e && typeof e.preventDefault === "function") e.preventDefault();

  const acctRaw = $('acct')?.value ?? "";
  const acct = cleanAcct(acctRaw);

  if(!acct){
    alert('Account number required');
    return;
  }

  let files;
  try{
    files = await loadManifest();
  }catch(err){
    console.error(err);
    alert(err.message);
    return;
  }

  // Scan chunks listed in manifest and do O(1) lookup by key
  for (const fname of files){
    const chunk = await loadChunkByName(fname);
    if(!chunk) continue;

    const rec = chunk[acct]; // ✅ direct key lookup (fast + correct)
    if(rec){
      renderResult(acct, rec);
      return;
    }
  }

  alert('Account not found');
}

// ================== RENDER RESULT ==================
function renderResult(acct, rec){
  const box = $('result');
  if (!box) return;

  box.innerHTML = '';

  // Helper: safely read field
  const f = (name) => rec?.[name];

  // -------- SCREEN PREVIEW --------
  const preview = [
    ['Account Number', acct],
    ['Account Name', f('Acct Name')],
    ['Mobile', f('Mobile Num')],
    ['Branch', f('Branch')],
    ['Region', f('Region')],
    ['Scheme Code', f('Scheme Code')],
    ['O/S Balance', f('O/S Bal')],
    ['Asset Code', f('Asset Code 30.09.25') ?? f('Asset Code')],
    ['Days', f('Days')],
    ['Provision', f('Provision')]
  ];

  preview.forEach(([k,v]) => box.appendChild(kv(k,v)));

  // -------- PRINT / PDF MAPPING --------
  setText('p_name', f('Acct Name'));
  setText('p_mobile', f('Mobile Num'));
  setText('p_purpose', f('Scheme Code'));
  setText('p_acct', acct);
  setText('p_date', $('dt')?.value);
  setText('p_amt', $('amt')?.value);
  setText('p_outstanding', f('O/S Bal'));
  setText('p_npa_date', f('NPA Date'));
  setText('p_asset_code', f('Asset Code 30.09.25') ?? f('Asset Code'));
  setText('p_provision', f('Provision'));
  setText('p_uci', f('UCI'));
  setText('p_uri', f('URI'));
  setText('p_offer_amt', $('amt')?.value);
  setText('p_offer_pct', f('Offer %'));
  setText('p_wo', f('WO'));
  setText('p_pl_impact', f('PL Impact'));
  setText('p_total_wo', f('Total WO'));

  const resultCard = $('resultCard');
  if (resultCard) resultCard.hidden = false;

  const saved = loadSaved(acct);
  if(saved && $('savedBox')){
    $('savedBox').textContent = JSON.stringify(saved, null, 2);
  }
}

// ================== DOM READY ==================
window.addEventListener('DOMContentLoaded', () => {

  const btnSearch = document.getElementById('btnSearch');
  const btnClear  = document.getElementById('btnClear');

  if (btnSearch) {
    btnSearch.addEventListener('click', doSearch);
  }

  if (btnClear) {
    btnClear.addEventListener('click', (e) => {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      if ($('acct')) $('acct').value = '';
      if ($('amt')) $('amt').value = '';
      if ($('remarks')) $('remarks').value = '';
      if ($('result')) $('result').innerHTML = '';
      if ($('resultCard')) $('resultCard').hidden = true;
    });
  }

});
