// ============================================
// SHAKER ADMIN - CORE LOGIC (Proxy Version)
// ============================================

let menuData = null;
let currentFileSha = null;

// ---- DOM References ----
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const saveBtn = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');
const logoutBtn = document.getElementById('logout-btn');
const categoriesContainer = document.getElementById('categories-container');
const addCategoryBtn = document.getElementById('add-category-btn');
const itemModal = document.getElementById('item-modal');
const itemForm = document.getElementById('item-form');
const modalTitle = document.getElementById('modal-title');
const modalCancel = document.getElementById('modal-cancel');
const catModal = document.getElementById('cat-modal');
const catForm = document.getElementById('cat-form');
const catModalCancel = document.getElementById('cat-modal-cancel');

// ---- Authentication ----
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = document.getElementById('password').value;
    if (pw === ADMIN_CONFIG.password) {
        loginScreen.classList.remove('active');
        dashboardScreen.classList.add('active');
        loginError.classList.add('hidden');
        loadMenu();
    } else {
        loginError.classList.remove('hidden');
        document.getElementById('password').value = '';
    }
});

logoutBtn.addEventListener('click', () => {
    dashboardScreen.classList.remove('active');
    loginScreen.classList.add('active');
    document.getElementById('password').value = '';
    menuData = null;
    currentFileSha = null;
});

// ---- API Helper ----
// Sends requests to our PHP proxy. The proxy holds the GitHub token securely.
async function proxyRequest(method, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': ADMIN_CONFIG.password, // Server validates this
        },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(ADMIN_CONFIG.proxyUrl, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

// ---- Load Menu via Proxy ----
async function loadMenu() {
    categoriesContainer.innerHTML = '<p style="text-align:center;color:#888;padding:3rem;">Lade Speisekarte...</p>';

    try {
        const fileData = await proxyRequest('GET');
        currentFileSha = fileData.sha;
        const decoded = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
        menuData = JSON.parse(decoded);
        categoriesContainer.innerHTML = '';
        renderDashboard();
    } catch (err) {
        // Fallback to local file for development/testing
        console.warn('Proxy nicht erreichbar, lade lokale menu.json:', err.message);
        try {
            const res = await fetch('../menu.json');
            menuData = await res.json();
            currentFileSha = null;
            categoriesContainer.innerHTML = '';
            showConfigNotice();
            renderDashboard();
        } catch {
            categoriesContainer.innerHTML = `
                <div style="text-align:center;padding:3rem;color:#c0392b;">
                    <p>❌ Proxy nicht erreichbar und keine lokale menu.json gefunden.</p>
                    <p style="font-size:0.85rem;color:#888;margin-top:0.5rem;">Bitte <code>admin/config.js</code> (proxyUrl) prüfen.</p>
                </div>`;
        }
    }
}

function showConfigNotice() {
    const notice = document.createElement('div');
    notice.className = 'config-notice';
    notice.innerHTML = '⚠️ <strong>Lokaler Modus:</strong> Proxy nicht konfiguriert. Änderungen werden nicht gespeichert. Bitte <code>proxyUrl</code> in <code>admin/config.js</code> eintragen und <code>proxy.php</code> auf deinen Server hochladen.';
    categoriesContainer.appendChild(notice);
}

// ---- Render Dashboard ----
function renderDashboard() {
    const notice = categoriesContainer.querySelector('.config-notice');
    categoriesContainer.innerHTML = '';
    if (notice) categoriesContainer.appendChild(notice);

    menuData.categories.forEach((cat, catIdx) => {
        const block = document.createElement('div');
        block.className = 'category-block';
        block.innerHTML = `
            <div class="category-header">
                <span class="category-name">${cat.name}</span>
                <div class="category-actions">
                    <button class="btn btn-danger btn-sm delete-cat-btn" data-cat-idx="${catIdx}">🗑 Kategorie löschen</button>
                </div>
            </div>
            <div class="item-list" id="item-list-${catIdx}">
                ${cat.items.map((item, itemIdx) => renderItemRow(item, catIdx, itemIdx)).join('')}
            </div>
            <div class="add-item-row">
                <button class="btn btn-secondary add-item-btn" data-cat-idx="${catIdx}">+ Gericht hinzufügen</button>
            </div>
        `;
        categoriesContainer.appendChild(block);
    });

    document.querySelectorAll('.add-item-btn').forEach(btn =>
        btn.addEventListener('click', () => openItemModal(parseInt(btn.dataset.catIdx))));
    document.querySelectorAll('.edit-item-btn').forEach(btn =>
        btn.addEventListener('click', () => openItemModal(parseInt(btn.dataset.catIdx), parseInt(btn.dataset.itemIdx))));
    document.querySelectorAll('.delete-item-btn').forEach(btn =>
        btn.addEventListener('click', () => deleteItem(parseInt(btn.dataset.catIdx), parseInt(btn.dataset.itemIdx))));
    document.querySelectorAll('.delete-cat-btn').forEach(btn =>
        btn.addEventListener('click', () => deleteCategory(parseInt(btn.dataset.catIdx))));
}

function renderItemRow(item, catIdx, itemIdx) {
    return `
        <div class="item-row">
            <div class="item-info">
                <div class="item-row-name">${item.name}</div>
                ${item.desc ? `<div class="item-row-desc">${item.desc}</div>` : ''}
            </div>
            <div class="item-row-price">€ ${item.price}</div>
            <div class="item-actions">
                <button class="btn-icon edit-item-btn" data-cat-idx="${catIdx}" data-item-idx="${itemIdx}" title="Bearbeiten">✏️</button>
                <button class="btn-icon delete delete-item-btn" data-cat-idx="${catIdx}" data-item-idx="${itemIdx}" title="Löschen">🗑</button>
            </div>
        </div>`;
}

// ---- Item Modal ----
function openItemModal(catIdx, itemIdx = null) {
    document.getElementById('item-cat-id').value = catIdx;
    document.getElementById('item-index').value = itemIdx !== null ? itemIdx : '';
    if (itemIdx !== null) {
        const item = menuData.categories[catIdx].items[itemIdx];
        modalTitle.textContent = 'Gericht bearbeiten';
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-desc').value = item.desc || '';
    } else {
        modalTitle.textContent = 'Gericht hinzufügen';
        itemForm.reset();
    }
    itemModal.classList.remove('hidden');
}

modalCancel.addEventListener('click', () => itemModal.classList.add('hidden'));
itemModal.addEventListener('click', (e) => { if (e.target === itemModal) itemModal.classList.add('hidden'); });

itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const catIdx = parseInt(document.getElementById('item-cat-id').value);
    const rawIdx = document.getElementById('item-index').value;
    const itemIdx = rawIdx !== '' ? parseInt(rawIdx) : null;
    const newItem = {
        name: document.getElementById('item-name').value.trim(),
        price: document.getElementById('item-price').value.trim(),
        desc: document.getElementById('item-desc').value.trim(),
    };
    if (itemIdx !== null) {
        menuData.categories[catIdx].items[itemIdx] = newItem;
    } else {
        menuData.categories[catIdx].items.push(newItem);
    }
    itemModal.classList.add('hidden');
    renderDashboard();
});

function deleteItem(catIdx, itemIdx) {
    if (!confirm(`"${menuData.categories[catIdx].items[itemIdx].name}" wirklich löschen?`)) return;
    menuData.categories[catIdx].items.splice(itemIdx, 1);
    renderDashboard();
}

// ---- Category Modal ----
addCategoryBtn.addEventListener('click', () => { catForm.reset(); catModal.classList.remove('hidden'); });
catModalCancel.addEventListener('click', () => catModal.classList.add('hidden'));
catModal.addEventListener('click', (e) => { if (e.target === catModal) catModal.classList.add('hidden'); });

catForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cat-name').value.trim();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    menuData.categories.push({ id, name, items: [] });
    catModal.classList.add('hidden');
    renderDashboard();
});

function deleteCategory(catIdx) {
    const cat = menuData.categories[catIdx];
    if (!confirm(`Kategorie "${cat.name}" mit ${cat.items.length} Gerichten wirklich löschen?`)) return;
    menuData.categories.splice(catIdx, 1);
    renderDashboard();
}

// ---- Save via Proxy ----
saveBtn.addEventListener('click', saveMenu);

async function saveMenu() {
    if (!currentFileSha) {
        setSaveStatus('Kein Proxy konfiguriert – lokaler Modus.', 'error');
        return;
    }

    saveBtn.disabled = true;
    setSaveStatus('Speichern...', '');

    try {
        const jsonString = JSON.stringify(menuData, null, 2);
        const content = btoa(unescape(encodeURIComponent(jsonString)));

        const result = await proxyRequest('POST', { content, sha: currentFileSha });
        currentFileSha = result.content.sha; // Update SHA for next save
        setSaveStatus('✓ Gespeichert! Seite wird in ~30 Sek. aktualisiert.', 'success');
    } catch (err) {
        setSaveStatus(`Fehler: ${err.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
    }
}

function setSaveStatus(msg, type) {
    saveStatus.textContent = msg;
    saveStatus.className = 'save-status ' + type;
    if (type === 'success') {
        setTimeout(() => { saveStatus.textContent = ''; saveStatus.className = 'save-status'; }, 5000);
    }
}
