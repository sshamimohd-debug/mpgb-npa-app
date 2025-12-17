const qs = new URLSearchParams(window.location.search);
const acct = (qs.get('acct') || '').replace(/[^0-9]/g,'');
const followDate = qs.get('dt') || '';
const propAmt = qs.get('amt') || '';
const remarks = qs.get('remarks') || '';

async function loadChunk(prefix){
  const resp = await fetch(`data/chunks/${prefix}.json`, {cache:'no-store'});
  if (!resp.ok) throw new Error('Data chunk not found. Upload chunks to GitHub Pages.');
  return resp.json();
}

function kv(label, value){
  const div = document.createElement('div');
  div.className = 'kv';
  div.innerHTML = `<div class="k">${label}</div><div class="v">${value ?? ''}</div>`;
  return div;
}

function formatNumber(x){
  if (x === null || x === undefined || x === '') return '';
  const n = Number(String(x).replace(/,/g,''));
  if (Number.isFinite(n)) return n.toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 2});
  return String(x);
}

function num(x){
  if (x === null || x === undefined || x === '') return 0;
  const s = String(x).replace(/,/g,'').trim();
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
}

function setText(id, val){
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = (val === null || val === undefined) ? '' : String(val);
}

/**
 * Fill PRINT/PDF table cells (bank format)
 * Uses the IDs defined in onepager.html:
 * pRO2, pBranch2, pName, pMobile, pScheme, pAccount, pSanctionDate, pSanctionAmt,
 * pOutstanding, pNpaDate, pAsset, pProvision, pUci, pUri, pOts, pOtsPct, pWO, pPLImpact, pTotalSacrifice
 */
function fillPrintTable(acctNo, rec){
  // Basic meta
  const ro = rec['Region'] || '';
  const br = rec['Branch'] || '';

  setText('pRO2', ro ? ro : '');
  setText('pBranch2', br ? br : '');

  // Base fields (from master record)
  setText('pName', rec['Acct Name'] || '');
  setText('pMobile', rec['Mobile Num'] || rec['Mobile'] || '');
  setText('pScheme', rec['Scheme Code'] || '');
  setText('pAccount', acctNo);

  // If your master has these fields later, they will fill automatically; else blank
  setText('pSanctionDate', rec['Sanction Date'] || rec['Acct Open Date'] || '');
  setText('pSanctionAmt', formatNumber(rec['Sanct Lim'] || rec['Sanction Amt'] || ''));

  // Outstanding / NPA / Asset
  setText('pOutstanding', formatNumber(rec['O/S Bal']));
  setText('pNpaDate', rec['NPA Date'] || rec['CIF NPA date'] || '');

  const asset = (rec['Asset Code 30.09.25'] ?? rec['Asset Code'] ?? '');
  setText('pAsset', asset);

  setText('pProvision', formatNumber(rec['Provision']));
  setText('pUci', formatNumber(rec['UCI']));
  setText('pUri', formatNumber(rec['URI']));

  // Proposed OTS (from querystring)
  setText('pOts', formatNumber(propAmt));

  // ===== Derived formulas (as given by you) =====
  // Mapping as per your formula:
  // D11 = Outstanding (O/S)
  // D17 = Proposed OTS
  // D14 = Provision
  // D16 = (assumed) "लाभ-हानि का प्रभाव" base value (if you have it; else 0)
  const D11 = num(rec['O/S Bal']);     // Outstanding
  const D17 = num(propAmt);           // Proposed OTS
  const D14 = num(rec['Provision']);  // Provision
  const D16 = num(rec['PL Impact'] || rec['P/L Impact'] || 0); // if present in data else 0

  // 14) otsPct = D17*100/D11
  const otsPct = (D11 !== 0) ? (D17 * 100 / D11) : 0;

  // 15) woAmt = D11-D17
  const woAmt = (D11 - D17);

  // 16) plImpact = D17-(D11-D16-D14)
  const plImpact = (D17 - (D11 - D16 - D14));

  // 17) totalSacrifice = D11 + D15 - D17
  const totalSacrifice = (D11 + woAmt - D17);

  setText('pOtsPct', (D11 !== 0) ? otsPct.toFixed(2) : '');
  setText('pWO', woAmt.toFixed(2));
  setText('pPLImpact', plImpact.toFixed(2));
  setText('pTotalSacrifice', totalSacrifice.toFixed(2));
}

window.addEventListener('DOMContentLoaded', async () => {
  const btn = document.getElementById('btnPrint');
  if (btn) btn.addEventListener('click', () => window.print());

  if (!acct){
    document.getElementById('opSub').textContent = 'No account provided.';
    return;
  }

  const prefix = acct.slice(0,3);

  try{
    const chunk = await loadChunk(prefix);
    const rec = chunk[acct];

    if (!rec){
      document.getElementById('opSub').textContent = 'Account not found in data.';
      return;
    }

    // Screen subtitle
    const sub = `Account: ${acct} • Branch: ${rec['Branch'] || ''} • SOL: ${rec['Sol'] || ''}`;
    document.getElementById('opSub').textContent = sub;

    // Screen body cards
    const body = document.getElementById('opBody');
    body.innerHTML = '';

    body.appendChild(kv('खाता संख्या (Account No.)', acct));
    body.appendChild(kv('खाताधारक का नाम (Name)', rec['Acct Name'] || ''));
    body.appendChild(kv('मोबाइल (Mobile)', rec['Mobile Num'] || rec['Mobile'] || ''));
    body.appendChild(kv('शाखा (Branch)', rec['Branch'] || ''));
    body.appendChild(kv('SOL', rec['Sol'] || ''));
    body.appendChild(kv('क्षेत्रीय कार्यालय (Region)', rec['Region'] || ''));
    body.appendChild(kv('स्कीम कोड (Scheme)', rec['Scheme Code'] || ''));

    body.appendChild(kv('Outstanding (O/S Bal)', formatNumber(rec['O/S Bal'])));
    body.appendChild(kv('Asset Code', rec['Asset Code 30.09.25'] ?? rec['Asset Code'] ?? ''));
    body.appendChild(kv('Days', formatNumber(rec['Days'])));
    body.appendChild(kv('Provision', formatNumber(rec['Provision'])));
    body.appendChild(kv('Remarks (System)', rec['Remarks'] || ''));

    body.appendChild(kv('प्रस्तावित समझौता राशि (Proposed OTS)', formatNumber(propAmt)));
    body.appendChild(kv('फॉलो-अप दिनांक (Follow-up Date)', followDate));
    body.appendChild(kv('टिप्पणी (Remarks)', remarks));

    // ✅ Fill PRINT/PDF table as well
    fillPrintTable(acct, rec);

  }catch(e){
    document.getElementById('opSub').textContent = e.message;
  }
});
