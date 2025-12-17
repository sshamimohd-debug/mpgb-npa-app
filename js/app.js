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

// ================== DATA LOADING ==================
async function loadChunk(prefix){
  const res = await fetch(`data/chunks/${prefix}.json`);
  if(!res.ok) throw new Error('Chunk not found');
  return res.json();
}

// ================== MAIN SEARCH ==================
async function doSearch(){
  const acct = $('acct').value.trim();
  if(!acct){
    alert('Account number required');
    return;
  }

  const prefix = acct.slice(0,3);
  let rows;

  try{
    rows = await loadChunk(prefix);
  }catch(e){
    alert('Data not found for this account');
    return;
  }

  const rec = rows.find(r => String(r['Acct Number']) === acct);
  if(!rec){
    alert('Account not found');
    return;
  }

  renderResult(acct, rec);
}

// ================== RENDER RESULT ==================
function renderResult(acct, rec){
  const box = $('result');
  box.innerHTML = '';

  // -------- SCREEN PREVIEW --------
  const preview = [
    ['Account Number', acct],
    ['Account Name', rec['Acct Name']],
    ['Mobile', rec['Mobile Num']],
    ['Branch', rec['Branch']],
    ['Region', rec['Region']],
    ['Scheme Code', rec['Scheme Code']],
    ['O/S Balance', rec['O/S Bal']],
    ['Asset Code', rec['Asset Code 30.09.25'] ?? rec['Asset Code']],
    ['Days', rec['Days']],
    ['Provision', rec['Provision']]
  ];

  preview.forEach(([k,v]) => box.appendChild(kv(k,v)));

  // -------- PRINT / PDF MAPPING --------
  setText('p_name', rec['Acct Name']);
  setText('p_mobile', rec['Mobile Num']);
  setText('p_purpose', rec['Scheme Code']);
  setText('p_acct', acct);
  setText('p_date', $('dt').value);
  setText('p_amt', $('amt').value);
  setText('p_outstanding', rec['O/S Bal']);
  setText('p_npa_date', rec['NPA Date']);
  setText('p_asset_code', rec['Asset Code 30.09.25'] ?? rec['Asset Code']);
  setText('p_provision', rec['Provision']);
  setText('p_uci', rec['UCI']);
  setText('p_uri', rec['URI']);
  setText('p_offer_amt', $('amt').value);
  setText('p_offer_pct', rec['Offer %']);
  setText('p_wo', rec['WO']);
  setText('p_pl_impact', rec['PL Impact']);
  setText('p_total_wo', rec['Total WO']);

  $('resultCard').hidden = false;

  const saved = loadSaved(acct);
  if(saved){
    $('savedBox').textContent = JSON.stringify(saved, null, 2);
  }
}

// ================== BUTTONS ==================
$('btnSearch').addEventListener('click', doSearch);

$('btnClear').addEventListener('click', () => {
  $('acct').value = '';
  $('amt').value = '';
  $('remarks').value = '';
  $('result').innerHTML = '';
  $('resultCard').hidden = true;
});
