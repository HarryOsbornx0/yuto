const STORAGE_KEY = 'portfolioInvestmentsV1';

const CATEGORY_META = {
  airdrop: { label: 'Airdrop' },
  crypto: { label: 'Kripto' },
  stock: { label: 'Hisse' },
  other: { label: 'Diğer' }
};

const form = document.getElementById('investmentForm');
const nameInput = document.getElementById('investmentName');
const categoryInput = document.getElementById('investmentCategory');
const costInput = document.getElementById('investmentCost');
const currencyInput = document.getElementById('investmentCurrency');
const dateInput = document.getElementById('investmentDate');
const noteInput = document.getElementById('investmentNote');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');
const sortBy = document.getElementById('sortBy');

const investmentList = document.getElementById('investmentList');
const emptyState = document.getElementById('emptyState');

const totalItemsEl = document.getElementById('totalItems');
const totalCostEl = document.getElementById('totalCost');
const totalAirdropEl = document.getElementById('totalAirdrop');
const totalCryptoEl = document.getElementById('totalCrypto');
const totalStockEl = document.getElementById('totalStock');
const totalOtherEl = document.getElementById('totalOther');
const lastUpdatedEl = document.getElementById('lastUpdated');

const distAirdropEl = document.getElementById('distAirdrop');
const distCryptoEl = document.getElementById('distCrypto');
const distStockEl = document.getElementById('distStock');
const distOtherEl = document.getElementById('distOther');

const jumpToForm = document.getElementById('jumpToForm');
const jumpToList = document.getElementById('jumpToList');

let investments = [];
let editingId = null;

const today = new Date();
const todayValue = today.toISOString().slice(0, 10);
if (dateInput) {
  dateInput.value = todayValue;
}

function loadInvestments() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
}

function saveInvestments() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(investments));
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}

function sumByCurrency(items) {
  return items.reduce((acc, item) => {
    if (!acc[item.currency]) acc[item.currency] = 0;
    acc[item.currency] += item.cost;
    return acc;
  }, {});
}

function formatCurrencyMap(map) {
  const entries = Object.entries(map);
  if (entries.length === 0) return '—';
  return entries
    .map(([currency, value]) => formatCurrency(value, currency))
    .join(' · ');
}

function parseDateLabel(dateStr) {
  if (!dateStr) return '—';
  const dateObj = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString('tr-TR');
}

function updateSummary() {
  totalItemsEl.textContent = investments.length;

  const totalMap = sumByCurrency(investments);
  totalCostEl.textContent = formatCurrencyMap(totalMap);

  const byCategory = {
    airdrop: investments.filter((item) => item.category === 'airdrop'),
    crypto: investments.filter((item) => item.category === 'crypto'),
    stock: investments.filter((item) => item.category === 'stock'),
    other: investments.filter((item) => item.category === 'other')
  };

  totalAirdropEl.textContent = formatCurrencyMap(sumByCurrency(byCategory.airdrop));
  totalCryptoEl.textContent = formatCurrencyMap(sumByCurrency(byCategory.crypto));
  totalStockEl.textContent = formatCurrencyMap(sumByCurrency(byCategory.stock));
  totalOtherEl.textContent = formatCurrencyMap(sumByCurrency(byCategory.other));

  lastUpdatedEl.textContent = `Son güncelleme: ${new Date().toLocaleString('tr-TR')}`;

  updateDistribution(byCategory);
}

function updateDistribution(byCategory) {
  const rawTotals = {
    airdrop: byCategory.airdrop.reduce((sum, item) => sum + item.cost, 0),
    crypto: byCategory.crypto.reduce((sum, item) => sum + item.cost, 0),
    stock: byCategory.stock.reduce((sum, item) => sum + item.cost, 0),
    other: byCategory.other.reduce((sum, item) => sum + item.cost, 0)
  };

  const maxTotal = Math.max(1, ...Object.values(rawTotals));

  const setBar = (category, valueEl, totalItems) => {
    const container = document.querySelector(`.dist-item[data-category="${category}"]`);
    if (container) {
      container.style.setProperty('--value', `${(rawTotals[category] / maxTotal) * 100}%`);
    }
    valueEl.textContent = formatCurrencyMap(sumByCurrency(totalItems));
  };

  setBar('airdrop', distAirdropEl, byCategory.airdrop);
  setBar('crypto', distCryptoEl, byCategory.crypto);
  setBar('stock', distStockEl, byCategory.stock);
  setBar('other', distOtherEl, byCategory.other);
}

function resetForm() {
  form.reset();
  dateInput.value = todayValue;
  categoryInput.value = 'airdrop';
  currencyInput.value = 'TRY';
  editingId = null;
  submitBtn.textContent = 'Yatırım Ekle';
  cancelEditBtn.hidden = true;
}

function startEdit(item) {
  editingId = item.id;
  nameInput.value = item.name;
  categoryInput.value = item.category;
  costInput.value = item.cost;
  currencyInput.value = item.currency;
  dateInput.value = item.date;
  noteInput.value = item.note || '';
  submitBtn.textContent = 'Güncelle';
  cancelEditBtn.hidden = false;
  document.getElementById('formSection')?.scrollIntoView({ behavior: 'smooth' });
}

function removeItem(id) {
  investments = investments.filter((item) => item.id !== id);
  saveInvestments();
  render();
}

function getFilteredInvestments() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedCategory = filterCategory.value;

  let filtered = investments.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (!query) return true;
    const haystack = `${item.name} ${item.note || ''}`.toLowerCase();
    return haystack.includes(query);
  });

  switch (sortBy.value) {
    case 'date-asc':
      filtered = filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'date-desc':
      filtered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'cost-asc':
      filtered = filtered.sort((a, b) => a.cost - b.cost);
      break;
    case 'cost-desc':
      filtered = filtered.sort((a, b) => b.cost - a.cost);
      break;
    case 'name-asc':
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      break;
    default:
      break;
  }

  return filtered;
}

function renderList() {
  const filtered = getFilteredInvestments();

  investmentList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  filtered.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'investment-card';
    card.dataset.id = item.id;

    const chipLabel = CATEGORY_META[item.category]?.label || 'Diğer';

    card.innerHTML = `
      <div class="card-top">
        <span class="chip">${chipLabel}</span>
        <span class="amount">${formatCurrency(item.cost, item.currency)}</span>
      </div>
      <div>
        <strong>${item.name}</strong>
      </div>
      <div class="card-meta">
        <span>Tarih: ${parseDateLabel(item.date)}</span>
        <span>Para birimi: ${item.currency}</span>
      </div>
      ${item.note ? `<div class="card-meta">Not: ${item.note}</div>` : ''}
      <div class="card-actions">
        <button class="ghost" data-action="edit">Düzenle</button>
        <button class="ghost danger" data-action="delete">Sil</button>
      </div>
    `;

    investmentList.appendChild(card);
  });
}

function render() {
  updateSummary();
  renderList();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const cost = Number(costInput.value);
  if (!name || Number.isNaN(cost)) return;

  const payload = {
    id: editingId || `inv_${Date.now()}`,
    name,
    category: categoryInput.value,
    cost,
    currency: currencyInput.value,
    date: dateInput.value,
    note: noteInput.value.trim()
  };

  if (editingId) {
    investments = investments.map((item) => (item.id === editingId ? payload : item));
  } else {
    investments.unshift(payload);
  }

  saveInvestments();
  resetForm();
  render();
});

cancelEditBtn.addEventListener('click', () => {
  resetForm();
});

investmentList.addEventListener('click', (event) => {
  const actionBtn = event.target.closest('button[data-action]');
  if (!actionBtn) return;
  const card = event.target.closest('.investment-card');
  if (!card) return;
  const id = card.dataset.id;
  const item = investments.find((inv) => inv.id === id);
  if (!item) return;

  if (actionBtn.dataset.action === 'edit') {
    startEdit(item);
  }
  if (actionBtn.dataset.action === 'delete') {
    const confirmed = window.confirm('Bu yatırımı silmek istediğine emin misin?');
    if (confirmed) removeItem(id);
  }
});

[searchInput, filterCategory, sortBy].forEach((el) => {
  el.addEventListener('input', renderList);
  el.addEventListener('change', renderList);
});

loadSampleBtn.addEventListener('click', () => {
  if (investments.length > 0) {
    const confirmed = window.confirm('Örnekler mevcut yatırımların üstüne eklenecek. Devam edilsin mi?');
    if (!confirmed) return;
  }

  const sample = [
    {
      id: `inv_${Date.now()}_1`,
      name: 'Cap Money Airdrop',
      category: 'airdrop',
      cost: 1200,
      currency: 'TRY',
      date: todayValue,
      note: 'Görevler + gas ücretleri'
    },
    {
      id: `inv_${Date.now()}_2`,
      name: 'BTC Alımı',
      category: 'crypto',
      cost: 500,
      currency: 'USD',
      date: '2025-12-18',
      note: 'Düzenli alım (DCA)'
    },
    {
      id: `inv_${Date.now()}_3`,
      name: 'BIST 100 - Örnek',
      category: 'stock',
      cost: 8500,
      currency: 'TRY',
      date: '2025-11-10',
      note: 'Uzun vadeli'
    }
  ];

  investments = [...sample, ...investments];
  saveInvestments();
  render();
});

clearAllBtn.addEventListener('click', () => {
  const confirmed = window.confirm('Tüm yatırımları kalıcı olarak silmek istediğine emin misin?');
  if (!confirmed) return;
  investments = [];
  saveInvestments();
  render();
});

jumpToForm.addEventListener('click', () => {
  document.getElementById('formSection')?.scrollIntoView({ behavior: 'smooth' });
});

jumpToList.addEventListener('click', () => {
  document.getElementById('listSection')?.scrollIntoView({ behavior: 'smooth' });
});

investments = loadInvestments();
render();
