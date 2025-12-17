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
  const n = Number(x);
  if (Number.isFinite(n)) return n.toLocaleString('en-IN');
  return String(x);
}

window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('btnPrint').addEventListener('click', () => window.print());

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

    const sub = `Account: ${acct} • Branch: ${rec['Branch'] || ''} • SOL: ${rec['Sol'] || ''}`;
    document.getElementById('opSub').textContent = sub;

    const body = document.getElementById('opBody');
    body.innerHTML = '';

    body.appendChild(kv('खाता संख्या (Account No.)', acct));
    body.appendChild(kv('खाताधारक का नाम (Name)', rec['Acct Name'] || ''));
    body.appendChild(kv('मोबाइल (Mobile)', rec['Mobile Num'] || ''));
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

  }catch(e){
    document.getElementById('opSub').textContent = e.message;
  }
});
