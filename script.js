document.addEventListener('DOMContentLoaded', async () => {
    const menuApp = document.getElementById('menu-app');
    const categoryList = document.getElementById('category-list');
    const mobileCategoryList = document.getElementById('mobile-category-list');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const closeMobileMenu = document.getElementById('close-mobile-menu');

    // Language State
    let currentLang = localStorage.getItem('shaker_lang') || 'de';

    // Fetch menu data
    let menuData;
    try {
        const res = await fetch('./menu.json');
        menuData = await res.json();
    } catch (e) {
        menuApp.innerHTML = '<p style="text-align:center;color:#a0a0a0;padding:4rem;">Speisekarte konnte nicht geladen werden.</p>';
        return;
    }

    const renderMenu = (lang) => {
        // Clear existing
        menuApp.innerHTML = '';
        categoryList.innerHTML = '';
        mobileCategoryList.innerHTML = '';

        menuData.categories.forEach((cat, index) => {
            const catName = cat.name[lang] || cat.name['de'];

            // Desktop Nav
            const li = document.createElement('li');
            li.innerHTML = `<a href="#${cat.id}">${catName}</a>`;
            categoryList.appendChild(li);

            // Mobile Nav
            const mLi = document.createElement('li');
            mLi.innerHTML = `<a href="#${cat.id}">${catName}</a>`;
            mobileCategoryList.appendChild(mLi);

            // Render Sections
            const section = document.createElement('section');
            section.id = cat.id;
            section.className = 'menu-section';

            let itemsHtml = '';
            cat.items.forEach((item, itemIdx) => {
                if (item.isSoldOut === true) return; // Skip sold out items

                const itemName = item.name[lang] || item.name['de'];
                const itemDesc = item.desc ? (item.desc[lang] || item.desc['de']) : '';

                itemsHtml += `
                    <div class="menu-item visible" style="animation-delay: ${(itemIdx * 0.1)}s">
                        <div class="item-header">
                            <span class="item-name">${itemName}</span>
                            <span class="item-price">€ ${item.price}</span>
                        </div>
                        ${itemDesc ? `<p class="item-desc">${itemDesc}</p>` : ''}
                    </div>
                `;
            });

            section.innerHTML = `
                <h2 class="section-title">${catName}</h2>
                <div class="items-grid">${itemsHtml}</div>
            `;
            menuApp.appendChild(section);
        });

        // Update Observer targets
        document.querySelectorAll('.menu-section').forEach(s => observer.observe(s));

        // Re-attach smooth scroll listeners
        attachSmoothScroll();

        // Update active class on lang buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
    };

    // Mobile Menu Toggling
    const toggleMenu = (show) => {
        if (!mobileMenuOverlay) return;
        mobileMenuOverlay.classList.toggle('active', show);
        document.body.style.overflow = show ? 'hidden' : '';
    };

    if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', () => toggleMenu(true));
    if (closeMobileMenu) closeMobileMenu.addEventListener('click', () => toggleMenu(false));

    // Observer setup
    const observerOptions = { root: null, rootMargin: '-20% 0px -70% 0px', threshold: 0 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                document.querySelectorAll('.category-nav a').forEach(a => {
                    a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
                });
                document.querySelectorAll('#mobile-category-list a').forEach(a => {
                    a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, observerOptions);

    const attachSmoothScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetElement = document.querySelector(this.getAttribute('href'));
                if (!targetElement) return;
                const headerHeight = document.querySelector('.main-header').offsetHeight;
                toggleMenu(false);
                window.scrollTo({
                    top: targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20,
                    behavior: 'smooth'
                });
            });
        });
    };

    // Lang Switcher Logic
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentLang = btn.dataset.lang;
            localStorage.setItem('shaker_lang', currentLang);
            renderMenu(currentLang);
        });
    });

    // Initial Render
    renderMenu(currentLang);
});
