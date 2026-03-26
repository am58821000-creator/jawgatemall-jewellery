-/* ═══════════════════════════════════════════════════════════
   JAWHARA JEWELLERY — INTERNAL SYSTEM  v2
   ═══════════════════════════════════════════════════════════ */
'use strict';

const DAILY_TARGET = 418;
const ADMIN_USER = 'gmb';
const ADMIN_PASS = '123456';
const TBL_SALES    = 'daily_sales';
const TBL_PIECES   = 'sold_pieces';
const PAGE_SIZE    = 12;

/* ─── STATE ─── */
let allSales     = [];
let allPieces    = [];
let filtSales    = [];
let filtPieces   = [];
let salesPage    = 1;
let piecesPage   = 1;
let deleteCb     = null;
let trendChart   = null;
let splitChart   = null;

/* ══════════════════════════════════════════
   BOOT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  checkSession();
});

function initUI() {
  updateTopbarDate();
  setInterval(updateTopbarDate, 60000);

  // Init date fields
  setVal('saleDate',          todayStr());
  setVal('pieceDate',         todayStr());
  setVal('reportMonth',       curMonth());
  setVal('filterSalesMonth',  curMonth());
  setVal('filterPiecesMonth', curMonth());
  setVal('salesReportMonth',  curMonth());
  setVal('piecesReportMonth', curMonth());

  // Login
  qs('#loginForm').addEventListener('submit', handleLogin);
  qs('#togglePass').addEventListener('click', togglePass);
  qs('#logoutBtn').addEventListener('click', handleLogout);

  // Sidebar
  qs('#sidebarToggle').addEventListener('click', toggleSidebar);
  qs('#mobileMenuBtn').addEventListener('click',  toggleMobileSidebar);
  qsa('.nav-item').forEach(li => {
    li.addEventListener('click', e => { e.preventDefault(); navigateTo(li.dataset.page); });
  });
  qs('#viewAllBtn').addEventListener('click', () => navigateTo('sales'));

  // Daily Sales form
  qs('#saleForm').addEventListener('submit', handleSaleSubmit);
  qs('#cancelEditBtn').addEventListener('click', resetSaleForm);
  ['goldProfit', 'diamondProfit'].forEach(id => {
    qs('#' + id).addEventListener('input', updateSalePreviews);
  });

  // Sales table filters
  qs('#filterSalesMonth').addEventListener('change', filterSalesRecords);
  qs('#searchSales').addEventListener('input',       filterSalesRecords);

  // Sales print / pdf
  qs('#printSalesBtn').addEventListener('click',     printSalesReport);
  qs('#exportSalesPdfBtn').addEventListener('click', () => exportPDF('salesReportContent', 'Jawhara_Sales_Report'));
  qs('#salesReportMonth').addEventListener('change', renderSalesReport);

  // Pieces form
  qs('#piecesForm').addEventListener('submit', handlePieceSubmit);
  qs('#cancelPieceBtn').addEventListener('click', resetPieceForm);
  qs('#filterPiecesMonth').addEventListener('change', filterPiecesRecords);
  qs('#searchPieces').addEventListener('input',       filterPiecesRecords);

  // Monthly report
  qs('#reportMonth').addEventListener('change', renderMonthlyReport);
  qs('#printReportBtn').addEventListener('click', () => printSection('reportContent'));
  qs('#exportPdfBtn').addEventListener('click',   () => exportPDF('reportContent', 'Jawhara_Monthly_Report'));

  // Pieces report
  qs('#piecesReportMonth').addEventListener('change', renderPiecesReport);
  qs('#printPiecesReportBtn').addEventListener('click',     () => printSection('piecesReportContent'));
  qs('#exportPiecesReportPdfBtn').addEventListener('click', () => exportPDF('piecesReportContent', 'Jawhara_Pieces_Report'));

  // Dashboard print/pdf
  qs('#dashPrintBtn').addEventListener('click', printDashboard);
  qs('#dashPdfBtn').addEventListener('click',   () => { buildDashPrint(); exportPDF('dashboardPrintContent', 'Jawhara_Dashboard'); });

  // Delete modal
  qs('#cancelDeleteBtn').addEventListener('click',  closeDeleteModal);
  qs('#modalOverlay').addEventListener('click',     closeDeleteModal);
  qs('#confirmDeleteBtn').addEventListener('click', () => { if (deleteCb) deleteCb(); closeDeleteModal(); });

  // Close mobile sidebar on nav
  qsa('.nav-item').forEach(li => li.addEventListener('click', () => qs('#sidebar').classList.remove('mobile-open')));
}

/* ══════════════════════════════════════════
   AUTH
══════════════════════════════════════════ */
function checkSession() {
  if (sessionStorage.getItem('jhr_auth') === 'true') showApp();
}
function handleLogin(e) {
  e.preventDefault();
  const u = qs('#loginUsername').value.trim();
  const p = qs('#loginPassword').value;
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    qs('#loginError').classList.add('hidden');
    sessionStorage.setItem('jhr_auth', 'true');
    showApp();
  } else {
    qs('#loginError').classList.remove('hidden');
    qs('#loginPassword').value = '';
  }
}
function handleLogout() {
  sessionStorage.removeItem('jhr_auth');
  qs('#mainApp').classList.add('hidden');
  qs('#loginScreen').classList.remove('hidden');
  qs('#loginUsername').value = '';
  qs('#loginPassword').value = '';
}
function showApp() {
  qs('#loginScreen').classList.add('hidden');
  qs('#mainApp').classList.remove('hidden');
  loadAllData();
}
function togglePass() {
  const pwd  = qs('#loginPassword');
  const icon = qs('#togglePass');
  if (pwd.type === 'password') { pwd.type = 'text';     icon.className = 'fas fa-eye-slash toggle-pass'; }
  else                         { pwd.type = 'password'; icon.className = 'fas fa-eye toggle-pass'; }
}

/* ══════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════ */
const PAGE_META = {
  dashboard:    ['Dashboard',             'Overview & Analytics'],
  sales:        ['Daily Sales Entry',     'Record & Track Daily Sales'],
  pieces:       ['Monthly Sold Pieces',   'Track Sold Items Day by Day'],
  report:       ['Monthly Sales Report',  'Printable PDF Report'],
  piecesreport: ['Pieces Report',         'Monthly Sold Pieces Report'],
};
function navigateTo(page) {
  qsa('.nav-item').forEach(i => i.classList.remove('active'));
  const navEl = qs(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  qsa('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  const target = qs(`#page-${page}`);
  if (target) { target.classList.remove('hidden'); target.classList.add('active'); }

  const [title, sub] = PAGE_META[page] || [page, ''];
  setTxt('#pageTitle',    title);
  setTxt('#pageSubtitle', sub);

  if (page === 'sales')        { filterSalesRecords(); renderSalesReport(); }
  if (page === 'report')       { renderMonthlyReport(); }
  if (page === 'piecesreport') { renderPiecesReport(); }
  if (page === 'pieces')       { filterPiecesRecords(); }
}

function toggleSidebar() {
  qs('#sidebar').classList.toggle('collapsed');
  qs('#mainContent').classList.toggle('expanded');
}
function toggleMobileSidebar() {
  qs('#sidebar').classList.toggle('mobile-open');
}

/* ══════════════════════════════════════════
   DATA LOADING
══════════════════════════════════════════ */
async function loadAllData() {
  try {
    const [sRes, pRes] = await Promise.all([
      fetch(`tables/${TBL_SALES}?page=1&limit=1000`),
      fetch(`tables/${TBL_PIECES}?page=1&limit=1000`),
    ]);
    const sJson = await sRes.json();
    const pJson = await pRes.json();
    allSales  = (sJson.data  || []).sort((a,b) => b.date.localeCompare(a.date));
    allPieces = (pJson.data  || []).sort((a,b) => b.date.localeCompare(a.date));
    renderDashboard();
    filterSalesRecords();
    filterPiecesRecords();
    renderMonthlyReport();
    renderSalesReport();
    renderPiecesReport();
  } catch(err) { console.error(err); showToast('Failed to load data.','error'); }
}

/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */
function renderDashboard() {
  const today  = todayStr();
  const month  = curMonth();
  const todayRecs = allSales.filter(r => r.date === today);
  const monthRecs = allSales.filter(r => r.date && r.date.startsWith(month));

  const todayProfit   = sum(todayRecs, 'total_profit');
  const monthProfit   = sum(monthRecs, 'total_profit');
  const goldProfit    = sum(monthRecs, 'gold_profit');
  const diamondProfit = sum(monthRecs, 'diamond_profit');
  const totalProfit   = goldProfit + diamondProfit;

  const goldPct    = totalProfit > 0 ? (goldProfit    / totalProfit * 100).toFixed(1) : 0;
  const diamondPct = totalProfit > 0 ? (diamondProfit / totalProfit * 100).toFixed(1) : 0;

  setTxt('#kpiToday',        fmtK(todayProfit));
  setTxt('#kpiTodayEntries', `${todayRecs.length} entr${todayRecs.length===1?'y':'ies'}`);
  setTxt('#kpiMonth',        fmtK(monthProfit));
  setTxt('#kpiMonthEntries', `${monthRecs.length} entries this month`);
  setTxt('#kpiGold',         fmtK(goldProfit));
  setTxt('#kpiGoldPct',      `${(goldProfit/DAILY_TARGET*100).toFixed(1)}% of daily target`);
  setTxt('#kpiDiamond',      fmtK(diamondProfit));
  setTxt('#kpiDiamondPct',   `${(diamondProfit/DAILY_TARGET*100).toFixed(1)}% of daily target`);

  // Performance
  const pct = Math.min((todayProfit/DAILY_TARGET)*100, 999).toFixed(1);
  setTxt('#perfPct', `${pct}%`);
  qs('#perfBar').style.width = `${Math.min(parseFloat(pct),100)}%`;
  if (todayProfit > 0) {
    const rem = DAILY_TARGET - todayProfit;
    if (rem > 0) { setTxt('#perfStatus', `${fmtK(rem)} remaining`); setTxt('#perfRemaining', `Today: ${fmtK(todayProfit)}`); }
    else {
      setTxt('#perfStatus', '✓ Daily target achieved!');
      qs('#perfBar').style.background = 'linear-gradient(90deg,#4caf74,#66d98a)';
      setTxt('#perfRemaining', `Today: ${fmtK(todayProfit)}`);
    }
  } else {
    setTxt('#perfStatus', 'No sales recorded today');
    setTxt('#perfRemaining', 'Target: 418.000 KWD');
  }

  renderTrendChart(monthRecs, month);
  renderSplitChart(goldProfit, diamondProfit);
  renderRecentTable(allSales.slice(0,6));
}

function renderRecentTable(rows) {
  const tbody = qs('#recentTableBody');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No entries yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${fmtDate(r.date)}</td>
      <td class="gold-val">${fmtK(r.gold_sales)}</td>
      <td class="gold-val">${fmtK(r.gold_profit)}</td>
      <td class="gold-val">${fmtPct(r.gold_pct)}</td>
      <td class="diamond-val">${fmtK(r.diamond_sales)}</td>
      <td class="diamond-val">${fmtK(r.diamond_profit)}</td>
      <td class="diamond-val">${fmtPct(r.diamond_pct)}</td>
      <td class="profit-val">${fmtK(r.total_profit)}</td>
    </tr>`).join('');
}

function renderTrendChart(records, monthStr) {
  const ctx = qs('#trendChart').getContext('2d');
  const [yr, mo] = monthStr.split('-').map(Number);
  const days = new Date(yr, mo, 0).getDate();
  const goldD = Array(days).fill(0), diamD = Array(days).fill(0);
  const labels = Array.from({length:days},(_,i)=>i+1);
  records.forEach(r => {
    const d = parseInt(r.date.split('-')[2]) - 1;
    if (d>=0 && d<days) { goldD[d] += r.gold_profit||0; diamD[d] += r.diamond_profit||0; }
  });
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[
      { label:'Gold Profit', data:goldD, borderColor:'#c9a84c', backgroundColor:'rgba(201,168,76,0.1)', borderWidth:2, pointRadius:3, tension:0.4, fill:true },
      { label:'Diamond Profit', data:diamD, borderColor:'#7eb8d4', backgroundColor:'rgba(126,184,212,0.1)', borderWidth:2, pointRadius:3, tension:0.4, fill:true },
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#16161a', borderColor:'#2a2a35', borderWidth:1, titleColor:'#f0ece4', bodyColor:'#9a9480',
        callbacks:{ label: c => ` ${c.dataset.label}: ${c.parsed.y.toFixed(3)} KWD` } }},
      scales:{
        x:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#5a5650',font:{size:10}} },
        y:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#5a5650',font:{size:10},callback:v=>v.toFixed(0)} }
      }
    }
  });
}

function renderSplitChart(gp, dp) {
  const ctx = qs('#splitChart').getContext('2d');
  if (splitChart) splitChart.destroy();
  const has = gp>0||dp>0;
  splitChart = new Chart(ctx, {
    type:'doughnut',
    data:{ labels:['Gold','Diamond'], datasets:[{
      data: has?[gp,dp]:[1,1],
      backgroundColor: has?['rgba(201,168,76,0.85)','rgba(126,184,212,0.85)']:['rgba(42,42,53,0.8)','rgba(42,42,53,0.5)'],
      borderColor:'#16161a', borderWidth:3, hoverOffset:6
    }]},
    options:{
      responsive:true, maintainAspectRatio:false, cutout:'70%',
      plugins:{
        legend:{ position:'bottom', labels:{ color:'#9a9480', font:{size:11}, padding:16, boxWidth:10 } },
        tooltip:{ backgroundColor:'#16161a', borderColor:'#2a2a35', borderWidth:1, titleColor:'#f0ece4', bodyColor:'#9a9480',
          callbacks:{ label: c => { if(!has) return ' No data'; const tot=gp+dp; const pct=tot>0?(c.parsed/tot*100).toFixed(1):0; return ` ${c.label}: ${c.parsed.toFixed(3)} KWD (${pct}%)`; } }
        }
      }
    }
  });
}

/* ══════════════════════════════════════════
   DAILY SALES ENTRY
══════════════════════════════════════════ */
function updateSalePreviews() {
  const gp = parseFloat(qs('#goldProfit').value) || 0;
  const dp = parseFloat(qs('#diamondProfit').value) || 0;
  const gPct  = (gp / DAILY_TARGET * 100).toFixed(2);
  const dPct  = (dp / DAILY_TARGET * 100).toFixed(2);
  const total = gp + dp;
  const tPct  = (total / DAILY_TARGET * 100).toFixed(2);
  qs('#goldPctDisplay').textContent    = `${gPct}%`;
  qs('#diamondPctDisplay').textContent = `${dPct}%`;
  qs('#totalProfitCalc').textContent   = fmtK(total);
  qs('#totalPctCalc').textContent      = `${tPct}%`;
}

function resetSaleForm() {
  qs('#editSaleId').value = '';
  qs('#saleForm').reset();
  setVal('saleDate', todayStr());
  qs('#goldPctDisplay').textContent    = '— %';
  qs('#diamondPctDisplay').textContent = '— %';
  qs('#totalProfitCalc').textContent   = '0.000 KWD';
  qs('#totalPctCalc').textContent      = '0%';
  setTxt('#submitSaleBtnText', 'Save Entry');
  qs('#salesFormTitle').innerHTML = '<i class="fas fa-cash-register"></i> Daily Sales Entry';
}
function saveSaleLocally() {
  const date          = qs('#saleDate').value;
  const gold_sales    = parseFloat(qs('#goldSales').value) || 0;
  const gold_profit   = parseFloat(qs('#goldProfit').value) || 0;
  const diamond_sales = parseFloat(qs('#diamondSales').value) || 0;
  const diamond_profit= parseFloat(qs('#diamondProfit').value) || 0;
  const notes         = qs('#saleNotes').value.trim();
  const gold_pct      = parseFloat((gold_profit / DAILY_TARGET * 100).toFixed(3));
  const diamond_pct   = parseFloat((diamond_profit / DAILY_TARGET * 100).toFixed(3));
  const total_profit  = parseFloat((gold_profit + diamond_profit).toFixed(3));

  const saleData = { date, gold_sales, gold_profit, gold_pct, diamond_sales, diamond_profit, diamond_pct, total_profit, notes };

  allSales.push(saleData);
  localStorage.setItem('daily_sales', JSON.stringify(allSales));

  updateSalePreviews();
  resetSaleForm();
  renderSalesTable();
  showToast('Entry saved locally!');
}
async function handleSaleSubmit(e) {
  e.preventDefault();
  const editId        = qs('#editSaleId').value;
  const date          = qs('#saleDate').value;
  const gold_sales    = parseFloat(qs('#goldSales').value)    || 0;
  const gold_profit   = parseFloat(qs('#goldProfit').value)   || 0;
  const diamond_sales = parseFloat(qs('#diamondSales').value) || 0;
  const diamond_profit= parseFloat(qs('#diamondProfit').value)|| 0;
  const notes         = qs('#saleNotes').value.trim();
  const gold_pct      = parseFloat((gold_profit    / DAILY_TARGET * 100).toFixed(3));
  const diamond_pct   = parseFloat((diamond_profit / DAILY_TARGET * 100).toFixed(3));
  const total_profit  = parseFloat((gold_profit + diamond_profit).toFixed(3));

  const payload = { date, gold_sales, gold_profit, gold_pct, diamond_sales, diamond_profit, diamond_pct, total_profit, notes };

  try {
    const url = editId ? `tables/${TBL_SALES}/${editId}` : `tables/${TBL_SALES}`;
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showToast(editId ? 'Entry updated.' : 'Entry saved.');
    resetSaleForm();
    await loadAllData();
  } catch(err) { console.error(err); showToast('Failed to save.','error'); }
}

function editSaleRecord(id) {
  const r = allSales.find(x => x.id === id);
  if (!r) return;
  setVal('editSaleId',    r.id);
  setVal('saleDate',      r.date);
  setVal('goldSales',     r.gold_sales    || 0);
  setVal('goldProfit',    r.gold_profit   || 0);
  setVal('diamondSales',  r.diamond_sales || 0);
  setVal('diamondProfit', r.diamond_profit|| 0);
  setVal('saleNotes',     r.notes         || '');
  updateSalePreviews();
  setTxt('#submitSaleBtnText', 'Update Entry');
  qs('#salesFormTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Sales Entry';
  navigateTo('sales');
  scrollTo({top:0,behavior:'smooth'});
}

function deleteSaleRecord(id) {
  openDeleteModal('Delete this sales entry?', async () => {
    try {
      await fetch(`tables/${TBL_SALES}/${id}`, { method:'DELETE' });
      showToast('Entry deleted.');
      await loadAllData();
    } catch(err) { showToast('Delete failed.','error'); }
  });
}

/* ─── Sales Filter & Table ─── */
function filterSalesRecords() {
  const month  = qs('#filterSalesMonth').value;
  const search = qs('#searchSales').value.toLowerCase();
  filtSales = allSales.filter(r => {
    const mOk = !month  || (r.date && r.date.startsWith(month));
    const sOk = !search || (r.notes && r.notes.toLowerCase().includes(search)) || fmtDate(r.date).toLowerCase().includes(search);
    return mOk && sOk;
  });
  salesPage = 1;
  renderSalesTable();
}

function renderSalesTable() {
  const tbody = qs('#salesTableBody');
  setTxt('#salesCount', `${filtSales.length} record${filtSales.length!==1?'s':''}`);
  const total = Math.ceil(filtSales.length / PAGE_SIZE);
  const rows  = filtSales.slice((salesPage-1)*PAGE_SIZE, salesPage*PAGE_SIZE);
  if (!rows.length) { tbody.innerHTML=`<tr><td colspan="10" class="empty-row">No records found.</td></tr>`; renderPag('salesPagination',0,salesPage,p=>{salesPage=p;renderSalesTable();}); return; }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${fmtDate(r.date)}</td>
      <td class="gold-val">${fmtK(r.gold_sales)}</td>
      <td class="gold-val">${fmtK(r.gold_profit)}</td>
      <td class="gold-val">${fmtPct(r.gold_pct)}</td>
      <td class="diamond-val">${fmtK(r.diamond_sales)}</td>
      <td class="diamond-val">${fmtK(r.diamond_profit)}</td>
      <td class="diamond-val">${fmtPct(r.diamond_pct)}</td>
      <td class="profit-val">${fmtK(r.total_profit)}</td>
      <td>${esc(r.notes||'—')}</td>
      <td class="actions-col">
        <button class="btn-edit"   onclick="editSaleRecord('${r.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" onclick="deleteSaleRecord('${r.id}')"><i class="fas fa-trash-alt"></i></button>
      </td>
    </tr>`).join('');
  renderPag('salesPagination', total, salesPage, p => { salesPage=p; renderSalesTable(); });
}

/* ─── Sales Report ─── */
function renderSalesReport() {
  const month = qs('#salesReportMonth').value || curMonth();
  const rows  = allSales.filter(r => r.date && r.date.startsWith(month));
  const [yr, mo] = month.split('-');
  const mName = new Date(+yr, +mo-1, 1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  setTxt('#salesReportPeriod', mName);

  let totGS=0,totGP=0,totDS=0,totDP=0,totTP=0;
  const tbody = qs('#salesReportBody');
  if (!rows.length) { tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:16px;color:#999;">No data for this month.</td></tr>`; }
  else {
    tbody.innerHTML = rows.map(r => {
      totGS+=r.gold_sales||0; totGP+=r.gold_profit||0;
      totDS+=r.diamond_sales||0; totDP+=r.diamond_profit||0; totTP+=r.total_profit||0;
      return `<tr>
        <td>${fmtDate(r.date)}</td>
        <td>${(r.gold_sales||0).toFixed(3)}</td>
        <td>${(r.gold_profit||0).toFixed(3)}</td>
        <td>${fmtPct(r.gold_pct)}</td>
        <td>${(r.diamond_sales||0).toFixed(3)}</td>
        <td>${(r.diamond_profit||0).toFixed(3)}</td>
        <td>${fmtPct(r.diamond_pct)}</td>
        <td>${(r.total_profit||0).toFixed(3)}</td>
      </tr>`;
    }).join('');
  }
  const gAvgPct = rows.length ? (totGP/DAILY_TARGET*100/rows.length).toFixed(2) : '0.00';
  const dAvgPct = rows.length ? (totDP/DAILY_TARGET*100/rows.length).toFixed(2) : '0.00';
  qs('#salesReportFoot').innerHTML = `<tr>
    <td><strong>TOTAL</strong></td>
    <td><strong>${totGS.toFixed(3)}</strong></td>
    <td><strong>${totGP.toFixed(3)}</strong></td>
    <td><strong>${gAvgPct}% avg</strong></td>
    <td><strong>${totDS.toFixed(3)}</strong></td>
    <td><strong>${totDP.toFixed(3)}</strong></td>
    <td><strong>${dAvgPct}% avg</strong></td>
    <td><strong>${totTP.toFixed(3)}</strong></td>
  </tr>`;
  setTxt('#salesReportDate', new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}));
}

function printSalesReport() {
  renderSalesReport();
  qs('#salesReportContent').style.display = 'block';
  printSection('salesReportContent');
  setTimeout(() => qs('#salesReportContent').style.display = 'none', 1000);
}

/* ══════════════════════════════════════════
   MONTHLY SOLD PIECES
══════════════════════════════════════════ */
function resetPieceForm() {
  qs('#editPieceId').value = '';
  qs('#piecesForm').reset();
  setVal('pieceDate', todayStr());
  setVal('pieceQty',  1);
  setTxt('#submitPieceBtnText', 'Add Piece');
  qs('#piecesFormTitle').innerHTML = '<i class="fas fa-gem"></i> Add Sold Piece';
}

async function handlePieceSubmit(e) {
  e.preventDefault();
  const editId    = qs('#editPieceId').value;
  const date      = qs('#pieceDate').value;
  const item_name = qs('#pieceName').value.trim();
  const quantity  = parseInt(qs('#pieceQty').value) || 1;
  const notes     = qs('#pieceNotes').value.trim();
  const payload   = { date, item_name, quantity, notes };
  try {
    const url    = editId ? `tables/${TBL_PIECES}/${editId}` : `tables/${TBL_PIECES}`;
    const method = editId ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showToast(editId ? 'Piece updated.' : 'Piece added.');
    resetPieceForm();
    await loadAllData();
  } catch(err) { console.error(err); showToast('Failed to save.','error'); }
}

function editPieceRecord(id) {
  const r = allPieces.find(x => x.id === id);
  if (!r) return;
  setVal('editPieceId', r.id);
  setVal('pieceDate',   r.date);
  setVal('pieceName',   r.item_name);
  setVal('pieceQty',    r.quantity);
  setVal('pieceNotes',  r.notes||'');
  setTxt('#submitPieceBtnText', 'Update Piece');
  qs('#piecesFormTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Sold Piece';
  navigateTo('pieces');
  scrollTo({top:0,behavior:'smooth'});
}

function deletePieceRecord(id) {
  openDeleteModal('Delete this piece record?', async () => {
    try {
      await fetch(`tables/${TBL_PIECES}/${id}`, { method:'DELETE' });
      showToast('Piece deleted.');
      await loadAllData();
    } catch(err) { showToast('Delete failed.','error'); }
  });
}

function filterPiecesRecords() {
  const month  = qs('#filterPiecesMonth').value;
  const search = qs('#searchPieces').value.toLowerCase();
  filtPieces = allPieces.filter(r => {
    const mOk = !month  || (r.date && r.date.startsWith(month));
    const sOk = !search || (r.item_name && r.item_name.toLowerCase().includes(search)) || (r.notes && r.notes.toLowerCase().includes(search));
    return mOk && sOk;
  });
  piecesPage = 1;
  renderPiecesTable();
}

function renderPiecesTable() {
  const tbody = qs('#piecesTableBody');
  setTxt('#piecesCount', `${filtPieces.length} record${filtPieces.length!==1?'s':''}`);
  const total = Math.ceil(filtPieces.length / PAGE_SIZE);
  const rows  = filtPieces.slice((piecesPage-1)*PAGE_SIZE, piecesPage*PAGE_SIZE);
  if (!rows.length) { tbody.innerHTML=`<tr><td colspan="5" class="empty-row">No records found.</td></tr>`; renderPag('piecesPagination',0,piecesPage,p=>{piecesPage=p;renderPiecesTable();}); return; }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${fmtDate(r.date)}</td>
      <td>${esc(r.item_name)}</td>
      <td><strong style="color:var(--gold)">${r.quantity}</strong></td>
      <td>${esc(r.notes||'—')}</td>
      <td class="actions-col">
        <button class="btn-edit"   onclick="editPieceRecord('${r.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" onclick="deletePieceRecord('${r.id}')"><i class="fas fa-trash-alt"></i></button>
      </td>
    </tr>`).join('');
  renderPag('piecesPagination', total, piecesPage, p => { piecesPage=p; renderPiecesTable(); });
}

/* ══════════════════════════════════════════
   MONTHLY SALES REPORT
══════════════════════════════════════════ */
function renderMonthlyReport() {
  const month = qs('#reportMonth').value || curMonth();
  const rows  = allSales.filter(r => r.date && r.date.startsWith(month));
  const [yr, mo] = month.split('-');
  const mName = new Date(+yr, +mo-1, 1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  setTxt('#reportPeriod', mName);

  let totGS=0,totGP=0,totDS=0,totDP=0,totTP=0;
  const tbody = qs('#reportTableBody');
  if (!rows.length) { tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:20px;color:#999;">No sales for this month.</td></tr>`; }
  else {
    tbody.innerHTML = rows.map(r => {
      totGS+=r.gold_sales||0; totGP+=r.gold_profit||0;
      totDS+=r.diamond_sales||0; totDP+=r.diamond_profit||0; totTP+=r.total_profit||0;
      return `<tr>
        <td>${fmtDate(r.date)}</td>
        <td>${(r.gold_sales||0).toFixed(3)}</td>
        <td>${(r.gold_profit||0).toFixed(3)}</td>
        <td>${fmtPct(r.gold_pct)}</td>
        <td>${(r.diamond_sales||0).toFixed(3)}</td>
        <td>${(r.diamond_profit||0).toFixed(3)}</td>
        <td>${fmtPct(r.diamond_pct)}</td>
        <td>${(r.total_profit||0).toFixed(3)}</td>
      </tr>`;
    }).join('');
  }
  const gPctTotal = (totGP/DAILY_TARGET*100).toFixed(2);
  const dPctTotal = (totDP/DAILY_TARGET*100).toFixed(2);
  const tPctTotal = (totTP/DAILY_TARGET*100).toFixed(2);
  qs('#reportTableFoot').innerHTML = `<tr>
    <td><strong>TOTAL</strong></td>
    <td><strong>${totGS.toFixed(3)}</strong></td>
    <td><strong>${totGP.toFixed(3)}</strong></td>
    <td><strong>${gPctTotal}%</strong></td>
    <td><strong>${totDS.toFixed(3)}</strong></td>
    <td><strong>${totDP.toFixed(3)}</strong></td>
    <td><strong>${dPctTotal}%</strong></td>
    <td><strong>${totTP.toFixed(3)}</strong></td>
  </tr>`;

  setTxt('#rptGoldProfit',   `${totGP.toFixed(3)} KWD`);
  setTxt('#rptGoldPct',      `${gPctTotal}%`);
  setTxt('#rptDiamondProfit',`${totDP.toFixed(3)} KWD`);
  setTxt('#rptDiamondPct',   `${dPctTotal}%`);
  setTxt('#rptTotalProfit',  `${totTP.toFixed(3)} KWD`);
  setTxt('#rptTotalPct',     `${tPctTotal}%`);
  setTxt('#rptGenDate', new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}));
}

/* ══════════════════════════════════════════
   PIECES REPORT
══════════════════════════════════════════ */
function renderPiecesReport() {
  const month = qs('#piecesReportMonth').value || curMonth();
  const rows  = allPieces.filter(r => r.date && r.date.startsWith(month));
  const [yr, mo] = month.split('-');
  const mName = new Date(+yr, +mo-1, 1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  setTxt('#piecesReportPeriod', mName);

  const tbody = qs('#piecesReportBody');
  let totalQty = 0;
  if (!rows.length) { tbody.innerHTML=`<tr><td colspan="5" style="text-align:center;padding:20px;color:#999;">No pieces for this month.</td></tr>`; }
  else {
    tbody.innerHTML = rows.map((r, i) => {
      totalQty += r.quantity || 0;
      return `<tr>
        <td>${i+1}</td>
        <td>${fmtDate(r.date)}</td>
        <td>${esc(r.item_name)}</td>
        <td>${r.quantity}</td>
        <td>${esc(r.notes||'—')}</td>
      </tr>`;
    }).join('');
  }
  setTxt('#prptTotalQty',   `${totalQty} pieces`);
  setTxt('#prptTotalItems', `${rows.length} items`);
  setTxt('#piecesRptDate', new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}));
}

/* ══════════════════════════════════════════
   DASHBOARD PRINT
══════════════════════════════════════════ */
function buildDashPrint() {
  const today  = todayStr();
  const month  = curMonth();
  const tRecs  = allSales.filter(r => r.date === today);
  const mRecs  = allSales.filter(r => r.date && r.date.startsWith(month));
  const [yr,mo] = month.split('-');
  const mName  = new Date(+yr,+mo-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});

  const tProfit = sum(tRecs,'total_profit');
  const mProfit = sum(mRecs,'total_profit');
  const gProfit = sum(mRecs,'gold_profit');
  const dProfit = sum(mRecs,'diamond_profit');

  setTxt('#dashPrintPeriod', `Summary as of ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}`);
  setTxt('#dashPrintDate',   new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}));
  qs('#dashPrintBody').innerHTML = `
    <tr><td>Today's Total Profit</td><td>${fmtK(tProfit)}</td></tr>
    <tr><td>Daily Performance % (Target 418 KWD)</td><td>${(tProfit/DAILY_TARGET*100).toFixed(2)}%</td></tr>
    <tr><td>Monthly Profit (${mName})</td><td>${fmtK(mProfit)}</td></tr>
    <tr><td>Gold Profit (${mName})</td><td>${fmtK(gProfit)}</td></tr>
    <tr><td>Gold % of Target</td><td>${(gProfit/DAILY_TARGET*100).toFixed(2)}%</td></tr>
    <tr><td>Diamond Profit (${mName})</td><td>${fmtK(dProfit)}</td></tr>
    <tr><td>Diamond % of Target</td><td>${(dProfit/DAILY_TARGET*100).toFixed(2)}%</td></tr>
  `;
  qs('#dashboardPrintContent').style.display = 'block';
}

function printDashboard() {
  buildDashPrint();
  window.print();
  setTimeout(() => qs('#dashboardPrintContent').style.display='none', 1000);
}

/* ══════════════════════════════════════════
   PRINT & PDF HELPERS
══════════════════════════════════════════ */
function printSection(id) {
  const el = qs('#' + id);
  const origDisp = el.style.display;
  el.style.display = 'block';
  window.print();
  setTimeout(() => el.style.display = origDisp, 800);
}

async function exportPDF(contentId, filename) {
  const el  = qs('#' + contentId);
  const was = el.style.display;
  el.style.display = 'block';
  const btn = event && event.target ? event.target.closest('button') : null;
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Generating...'; }
  try {
    const { jsPDF } = window.jspdf;
    const doc    = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const canvas = await html2canvas(el, { scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const imgH  = (canvas.height * pageW) / canvas.width;
    if (imgH <= pageH) {
      doc.addImage(imgData, 'JPEG', 0, 0, pageW, imgH);
    } else {
      let yPos = 0;
      while (yPos < imgH) { if (yPos>0) doc.addPage(); doc.addImage(imgData,'JPEG',0,-yPos,pageW,imgH); yPos+=pageH; }
    }
    const month = curMonth();
    doc.save(`${filename}_${month}.pdf`);
    showToast('PDF exported!');
  } catch(err) { console.error(err); showToast('PDF export failed.','error'); }
  finally {
    el.style.display = was;
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-file-pdf"></i> Export PDF'; }
  }
}

/* ══════════════════════════════════════════
   PAGINATION
══════════════════════════════════════════ */
function renderPag(containerId, totalPages, curPg, onPage) {
  const c = qs('#' + containerId);
  c.innerHTML = '';
  if (totalPages <= 1) return;
  const mk = (label, pg, dis=false, act=false) => {
    const b = document.createElement('button');
    b.className = 'page-btn' + (act?' active':'');
    b.innerHTML = label; b.disabled = dis;
    b.addEventListener('click', () => onPage(pg));
    return b;
  };
  c.appendChild(mk('<i class="fas fa-chevron-left"></i>', curPg-1, curPg===1));
  for (let i=1; i<=totalPages; i++) {
    if (totalPages>7 && i>2 && i<totalPages-1 && Math.abs(i-curPg)>1) {
      if (i===3||i===totalPages-2) { const d=document.createElement('span'); d.textContent='…'; d.style.cssText='padding:0 4px;color:var(--text-muted);line-height:30px;'; c.appendChild(d); }
      continue;
    }
    c.appendChild(mk(i, i, false, i===curPg));
  }
  c.appendChild(mk('<i class="fas fa-chevron-right"></i>', curPg+1, curPg===totalPages));
}

/* ══════════════════════════════════════════
   DELETE MODAL
══════════════════════════════════════════ */
function openDeleteModal(msg, cb) {
  setTxt('#deleteModalMsg', msg);
  deleteCb = cb;
  qs('#deleteModal').classList.remove('hidden');
}
function closeDeleteModal() {
  deleteCb = null;
  qs('#deleteModal').classList.add('hidden');
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg, type='success') {
  const t    = qs('#toast');
  const icon = t.querySelector('i');
  qs('#toastMessage').textContent = msg;
  t.className = 'toast' + (type==='error'?' error':'');
  icon.className = type==='error' ? 'fas fa-times-circle' : 'fas fa-check-circle';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3500);
}

/* ══════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════ */
function qs(sel)    { return document.querySelector(sel); }
function qsa(sel)   { return document.querySelectorAll(sel); }
function setTxt(sel,t) { const el=qs(sel); if(el) el.textContent=t; }
function setVal(id,v)  { const el=qs('#'+id); if(el) el.value=v; }
function todayStr()    { return new Date().toISOString().split('T')[0]; }
function curMonth()    { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; }
function fmtK(v)       { return `${(parseFloat(v)||0).toFixed(3)} KWD`; }
function fmtPct(v)     { return `${(parseFloat(v)||0).toFixed(2)}%`; }
function sum(arr,key)  { return arr.reduce((a,r)=>a+(parseFloat(r[key])||0),0); }
function fmtDate(s)    { if(!s) return '—'; const d=new Date(s+'T00:00:00'); return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
function esc(s)        { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function updateTopbarDate() { const el=qs('#topbarDate'); if(el) el.textContent=new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }

/* ─── empty row style ─── */
const _s = document.createElement('style');
_s.textContent = '.empty-row{text-align:center;padding:32px 16px!important;color:var(--text-muted);font-size:0.85rem;}';
document.head.appendChild(_s);
