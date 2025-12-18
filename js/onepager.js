// MPGB NPA One-Pager
// Updated: manifest-based chunk loading + direct key lookup (chunk[acct])
// PDF is guaranteed single-page by print CSS (A4 + compact table).

const $ = (id) => document.getElementById(id);

const state = {
  cache: new Map(),     // fname -> object
  manifest: null
};

const CHUNKS_BASE = "data/chunks/";

function cleanAcct(v){
  return String(v ?? "").trim().replace(/\s+/g,'').replace(/\.0$/,'').replace(/,/g,'');
}

function formatNumber(x){
  if (x === null || x === undefined || x === '') return '';
  const n = Number(String(x).replace(/,/g,''));
  if (Number.isNaN(n)) return String(x);
  return n.toLocaleString('en-IN');
}

function setCell(id, value){
  const el = $(id);
  if (el) el.textContent = value ?? '';
}

function kv(label, value){
  const div = document.createElement('div');
  div.className = 'kv';
  div.innerHTML = `<div class="k">${label}</div><div class="v">${value ?? ''}</div>`;
  return div;
}

async function loadManifest(){
  if (state.manifest) return state.manifest;
  const res = await fetch(CHUNKS_BASE + "manifest.json", { cache: "no-store" });
  if (!res.ok) throw new Error("manifest.json not found in data/chunks/");
  const j = await res.json(); // { files:[...] }
  state.manifest = Array.isArray(j.files) ? j.files : [];
  return state.manifest;
}

async function loadChunkByName(fname){
  if (state.cache.has(fname)) return state.cache.get(fname);
  const res = await fetch(CHUNKS_BASE + fname, { cache: "no-store" });
  if (!res.ok) return null;
  const obj = await res.json(); // map: { acct: rec }
  state.cache.set(fname, obj);
  return obj;
}

async function getRecord(acct){
  const files = await loadManifest();
  for (const fname of files){
    const chunk = await loadChunkByName(fname);
    if (!chunk) continue;
    const rec = chunk[acct];
    if (rec) return { fname, rec };
  }
  return null;
}

function readQuery(){
  const q = new URLSearchParams(location.search);
  return {
    acct: cleanAcct(q.get("acct") || ""),
    dt: q.get("dt") || "",
    amt: q.get("amt") || "",
    remarks: q.get("remarks") || ""
  };
}

function fillScreenPreview(acct, rec, follow){
  const opSub = $('opSub');
  if (opSub){
    const br = `${rec["Branch"] ?? ""}`.trim();
    const rg = `${rec["Region"] ?? ""}`.trim();
    opSub.textContent = `Account: ${acct} • Branch: ${br}${rg ? " • RO: " + rg : ""} • Date: ${follow.dt || ""}`;
  }

  const body = $('opBody');
  if (!body) return;
  body.innerHTML = '';

  const pick = [
    ['हितग्राही का नाम', rec['Acct Name']],
    ['मोबाइल', rec['Mobile Num']],
    ['Scheme', rec['Scheme Code']],
    ['बकाया राशि (O/S)', formatNumber(rec['O/S Bal'])],
    ['NPA दिनांक', rec['NPA Date']],
    ['Asset Code', rec['Asset Code 30.09.25'] ?? rec['Asset Code']],
    ['Provision', formatNumber(rec['Provision'])],
    ['प्रस्तावित OTS राशि', follow.amt ? formatNumber(follow.amt) : ''],
    ['Remarks', follow.remarks || '']
  ];
  pick.forEach(([k,v]) => body.appendChild(kv(k, v ?? '')));
}

function fillPrintTable(acct, rec, follow){
  // RO/Branch (print header)
  setCell("pRO2", rec["Region"] ?? "");
  setCell("pBranch2", rec["Branch"] ?? "");

  // Rows (Hindi one-pager)
  setCell("pName", rec["Acct Name"] ?? "");
  setCell("pMobile", rec["Mobile Num"] ?? "");
  setCell("pScheme", rec["Scheme Code"] ?? "");
  setCell("pAccount", acct);

  // Sanction info may not exist; keep blank if missing
  setCell("pSanctionDate", rec["Sanction Date"] ?? rec["Acct Opn Date"] ?? "");
  setCell("pSanctionAmt", formatNumber(rec["Sanction Amt"] ?? rec["Sanction Amount"] ?? ""));

  setCell("pOutstanding", formatNumber(rec["O/S Bal"] ?? rec["OS Bal"] ?? rec["Outstanding"] ?? ""));
  setCell("pNpaDate", rec["NPA Date"] ?? rec["NPA date"] ?? "");
  setCell("pAsset", rec["Asset Code 30.09.25"] ?? rec["Asset Code"] ?? "");
  setCell("pProvision", formatNumber(rec["Provision"] ?? ""));

  // IDs in HTML are pUci / pUri
  setCell("pUci", formatNumber(rec["UCI"] ?? ""));
  setCell("pUri", formatNumber(rec["URI"] ?? ""));

  // Proposed OTS inputs (HTML uses pOts / pOtsPct)
  setCell("pOts", follow.amt ? formatNumber(follow.amt) : "");
  setCell("pOtsPct", rec["Offer %"] ?? "");

  // WO / PL impact / sacrifice
  setCell("pWO", formatNumber(rec["WO"] ?? ""));
  setCell("pPLImpact", formatNumber(rec["PL Impact"] ?? ""));
  setCell("pTotalSacrifice", formatNumber(rec["Total Sacrifice"] ?? rec["Total WO"] ?? ""));
}

async function init(){
  const q = readQuery();
  if (!q.acct){
    alert("Account missing. Please open onepager from Search page.");
    return;
  }

  try{
    const found = await getRecord(q.acct);
    if (!found){
      alert("Account not found in chunks");
      return;
    }

    fillScreenPreview(q.acct, found.rec, q);
    fillPrintTable(q.acct, found.rec, q);

  }catch(err){
    console.error(err);
    alert(err.message || "Error");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  $("btnPrint")?.addEventListener("click", () => window.print());
  init();
});
