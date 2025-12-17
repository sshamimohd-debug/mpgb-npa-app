const qs = new URLSearchParams(window.location.search);
const acct = (qs.get('acct') || '').replace(/[^0-9]/g,'');
const followDate = qs.get('dt') || '';
const propAmt = qs.get('amt') || '';
const remarks = qs.get('remarks') || '';

async function loadChunk(prefix){
  const resp = await fetch(`data/chunks/${prefix}.json`, {cache:'no-store'});
  if (!resp.ok) throw new Error(`Chunk not found: data/chunks/${prefix}.json`);
  return resp.json();
}

function formatNumber(x){
  if (x === null || x === undefined || x === '') return '';
  const n = Number(String(x).replace(/,/g,''));
  if (Number.isFinite(n)) return n.toLocaleString('en-IN', {maximumFractionDigits: 2});
  return String(x);
}

function pos(x){
  const n = Number(String(x ?? '').replace(/,/g,''));
  if (!Number.isFinite(n)) return 0;
  return Math.abs(n);
}

function setText(id, value){
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

function formatDateSmart(v){
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'string') return v.trim();

  const n = Number(v);
  // Excel serial date (optional)
  if (Number.isFinite(n) && n > 20000 && n < 60000){
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + n * 86400000);
    const dd = String(d.getUTCDate()).padStart(2,'0');
    const mm = String(d.getUTCMonth()+1).padStart(2,'0');
    const yy = d.getUTCFullYear();
    return `${dd}-${mm}-${yy}`;
  }
  return String(v);
}

window.addEventListener('DOMContentLoaded', async () => {
  const btn = document.getElementById('btnPrint');
  if (btn) btn.addEventListener('click', () => window.print());

  if (!acct){
    alert('No account provided.');
    return;
  }

  const prefix = acct.slice(0,3);

  try{
    const chunk = await loadChunk(prefix);
    const rec = chunk[acct];
    if (!rec){
      alert('Account not found in data.');
      return;
    }

    // Header RO/Branch
    setText('pRO2', rec['Region'] || rec['RO'] || '');
    setText('pBranch2', rec['Branch'] || '');

    // Basic fields
    setText('pName', rec['Acct Name'] || '');
    setText('pMobile', rec['Mobile Num'] || '');
    setText('pScheme', rec['Scheme Code'] || '');
    setText('pAccount', acct);

    // ✅ As per your confirmed headers
    setText('pSanctionDate', formatDateSmart(rec['Acct Opn Date'] || ''));
    setText('pSanctionAmt', formatNumber(pos(rec['Sanct Lim Amount'] || 0)));

    // NPA / Asset / Balances
    setText('pOutstanding', formatNumber(pos(rec['O/S Bal'] || 0)));
    setText('pNpaDate', formatDateSmart(rec['NPA Date'] || rec['NPA Dt'] || rec['Npa Date'] || ''));
    setText('pAsset', String(rec['Asset Code 30.09.25'] ?? rec['Asset Code'] ?? ''));

    setText('pProvision', formatNumber(pos(rec['Provision'] || 0)));
    setText('pUci', formatNumber(pos(rec['UCI'] || 0)));
    setText('pUri', formatNumber(pos(rec['URI'] || 0)));

    // Proposed OTS + follow-up
    setText('pOts', formatNumber(pos(propAmt || 0)));

    // ===== Derived (NO negative) =====
    const D11 = pos(rec['O/S Bal'] || 0);
    const D17 = pos(propAmt || 0);
    const D14 = pos(rec['Provision'] || 0);
    const D16 = pos(rec['PL Impact'] || rec['P/L Impact'] || 0);

    const otsPct = D11 > 0 ? pos(D17 * 100 / D11) : 0;
    const woAmt = pos(D11 - D17);
    const plImpact = pos(D17 - (D11 - D16 - D14));
    const totalSacrifice = pos(D11 + woAmt - D17);

    setText('pOtsPct', otsPct.toFixed(2));
    setText('pWO', woAmt.toFixed(2));
    setText('pPLImpact', plImpact.toFixed(2));
    setText('pTotalSacrifice', totalSacrifice.toFixed(2));

  }catch(e){
    alert(e.message);
  }
});
