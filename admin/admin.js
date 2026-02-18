// ============================================
// SHAKER ADMIN - CORE LOGIC
// ============================================

let menuData = null;
let currentFileSha = null; // GitHub requires the file's SHA to update it

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

// Item Modal
const itemModal = document.getElementById('item-modal');
const itemForm = document.getElementById('item-form');
const modalTitle = document.getElementById('modal-title');
const modalCancel = document.getElementById('modal-cancel');

// Category Modal
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
});

// ---- Load Menu from GitHub ----
async function loadMenu() {
    categoriesContainer.innerHTML = '<p style="text-align:center;color:#888;padding:3rem;">Lade Speisekarte...</p>';

    try {
        const url = `https://api.github.com/repos/${ADMIN_CONFIG.githubOwner}/${ADMIN_CONFIG.githubRepo}/contents/${ADMIN_CONFIG.menuFilePath}`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${ADMIN_CONFIG.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!res.ok) throw new Error(`GitHub API Error: ${res.status}`);

        const fileData = await res.json();
        currentFileSha = fileData.sha;
        const decoded = atob(fileData.content.replace(/\n/g, ''));
        menuData = JSON.parse(decoded);
        renderDashboard();
    } catch (err) {
        // Fallback: load from local file (for local testing)
        console.warn('GitHub API failed, loading local menu.json:', err.message);
        try {
            const res = await fetch('../menu.json');
            menuData = await res.json();
            currentFileSha = null;
            categoriesContainer.innerHTML = '';
            showConfigNotice();
            renderDashboard();
        } catch (localErr) {
            categoriesContainer.innerHTML = `<p style="color:#c0392b;text-align:center;padding:3rem;">Fehler beim Laden der Speisekarte. Bitte config.js prüfen.</p>`;
        }
    }
}

function showConfigNotice() {
    const notice = document.createElement('div');
    notice.className = 'config-notice';
    notice.innerHTML = '⚠️ <strong>Lokaler Modus:</strong> GitHub API nicht konfiguriert. Änderungen werden nicht gespeichert. Bitte <code>admin/config.js</code> ausfüllen.';
    categoriesContainer.appendChild(notice);
}

// ---- Render Dashboard ----
function renderDashboard() {
    // Clear existing (but keep notice if present)
    const notice = categoriesContainer.querySelector('.config-notice');
    categoriesContainer.innerHTML = '';
    if (notice) categoriesContainer.appendChild(notice);

    menuData.categories.forEach((cat, catIdx) => {
        const block = document.createElement('div');
        block.className = 'category-block';
        block.dataset.catIdx = catIdx;

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

    // Attach events
    document.querySelectorAll('.add-item-btn').forEach(btn => {
        btn.addEventListener('click', () => openItemModal(parseInt(btn.dataset.catIdx)));
    });
    document.querySelectorAll('.edit-item-btn').forEach(btn => {
        btn.addEventListener('click', () => openItemModal(parseInt(btn.dataset.catIdx), parseInt(btn.dataset.itemIdx)));
    });
    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteItem(parseInt(btn.dataset.catIdx), parseInt(btn.dataset.itemIdx)));
    });
    document.querySelectorAll('.delete-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteCategory(parseInt(btn.dataset.catIdx)));
    });
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
        </div>
    `;
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
    const itemIdxRaw = document.getElementById('item-index').value;
    const itemIdx = itemIdxRaw !== '' ? parseInt(itemIdxRaw) : null;

    const newItem = {
        name: document.getElementById('item-name').value.trim(),
        price: document.getElementById('item-price').value.trim(),
        desc: document.getElementById('item-desc').value.trim()
    };

    if (itemIdx !== null) {
        menuData.categories[catIdx].items[itemIdx] = newItem;
    } else {
        menuData.categories[catIdx].items.push(newItem);
    }

    itemModal.classList.add('hidden');
    renderDashboard();
});

// ---- Delete Item ----
function deleteItem(catIdx, itemIdx) {
    if (!confirm(`"${menuData.categories[catIdx].items[itemIdx].name}" wirklich löschen?`)) return;
    menuData.categories[catIdx].items.splice(itemIdx, 1);
    renderDashboard();
}

// ---- Category Modal ----
addCategoryBtn.addEventListener('click', () => {
    catForm.reset();
    catModal.classList.remove('hidden');
});
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

// ---- Delete Category ----
function deleteCategory(catIdx) {
    const cat = menuData.categories[catIdx];
    if (!confirm(`Kategorie "${cat.name}" mit ${cat.items.length} Gerichten wirklich löschen?`)) return;
    menuData.categories.splice(catIdx, 1);
    renderDashboard();
}

// ---- Save to GitHub ----
saveBtn.addEventListener('click', saveToGitHub);

async function saveToGitHub() {
    if (!currentFileSha) {
        setSaveStatus('Kein GitHub-Token konfiguriert.', 'error');
        return;
    }

    saveBtn.disabled = true;
    setSaveStatus('Speichern...', '');

    try {
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(menuData, null, 2))));
        const url = `https://api.github.com/repos/${ADMIN_CONFIG.githubOwner}/${ADMIN_CONFIG.githubRepo}/contents/${ADMIN_CONFIG.menuFilePath}`;

        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${ADMIN_CONFIG.githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Admin: Speisekarte aktualisiert',
                content: content,
                sha: currentFileSha
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        currentFileSha = data.content.sha; // Update SHA for next save
        setSaveStatus('✓ Erfolgreich gespeichert!', 'success');
    } catch (err) {
        setSaveStatus(`Fehler: ${err.message}`, 'error');
        console.error(err);
    } finally {
        saveBtn.disabled = false;
    }
}

function setSaveStatus(msg, type) {
    saveStatus.textContent = msg;
    saveStatus.className = 'save-status ' + type;
    if (type === 'success') {
        setTimeout(() => { saveStatus.textContent = ''; saveStatus.className = 'save-status'; }, 4000);
    }
}
