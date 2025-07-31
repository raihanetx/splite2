document.getElementById('currentYear').textContent = new Date().getFullYear();

let allProductsData = [];
let cart = [];
let orders = [];
let isLoadingProducts = false;

// Simplified DOM element gathering. Checks for existence will be done in functions.
const domElements = {
    // Global/shared elements
    cartCount: document.getElementById('cartCount'),
    ordersNotification: document.getElementById('ordersNotification'),
    toast: document.getElementById('toast'),
    offCanvasMenu: document.getElementById('offCanvasMenu'),
    offCanvasOverlay: document.getElementById('offCanvasOverlay'),

    // Page-specific containers
    featuredCoursesGrid: document.getElementById('featuredCoursesGrid'),
    popularSubscriptionsGrid: document.getElementById('popularSubscriptionsGrid'),
    topSoftwareGrid: document.getElementById('topSoftwareGrid'),
    latestEbooksGrid: document.getElementById('latestEbooksGrid'),
    allProductsGrid: document.getElementById('allProductsGrid'),
    noProductsMessage: document.getElementById('noProductsMessage'),
    productDetailContainer: document.getElementById('productDetailContainer'),
    cartPageContent: document.getElementById('cartPageContent'),
    emptyCartPage: document.getElementById('emptyCartPage'),
    checkoutForm: document.getElementById('checkoutForm'),
    orderItemsCheckout: document.getElementById('orderItemsCheckout'),
    orderTotalCheckout: document.getElementById('orderTotalCheckout'),
    orderConfirmationContainer: document.getElementById('orderConfirmationContainer'),
    ordersListContainer: document.getElementById('ordersListContainer'),
    noOrdersMessage: document.getElementById('noOrdersMessage'),
};

/**
 * Navigates to a different page.
 * @param {string} pageName - The short name of the page (e.g., 'home', 'products').
 * @param {string|null} context - Additional context, like category or product slug.
 * @param {string|null} searchTerm - A search term to append to the URL.
 */
function navigateTo(pageName, context = null, searchTerm = null) {
    let url = '';
    switch (pageName) {
        case 'home':
            url = 'index.html';
            break;
        case 'products':
            url = `products.html`;
            const params = new URLSearchParams();
            params.set('category', context || 'all');
            if (searchTerm) {
                params.set('search', searchTerm);
            }
            url += `?${params.toString()}`;
            break;
        case 'product':
            const [category, slug] = context.split('/');
            url = `product-detail.html?category=${category}&slug=${slug}`;
            break;
        case 'cart':
            url = 'cart.html';
            break;
        case 'checkout':
            url = 'checkout.html';
            break;
        case 'orderConfirmation':
            url = `order-confirmation.html`;
            if(context) url += `?orderId=${context}`;
            break;
        case 'about':
            url = 'about.html';
            break;
        case 'orders':
            url = 'orders.html';
            break;
        case 'terms':
            url = 'terms.html';
            break;
        case 'privacy':
            url = 'privacy.html';
            break;
        case 'refund':
            url = 'refund.html';
            break;
        default:
            url = 'index.html';
    }
    window.location.href = url;
}

/**
 * Main function that runs when the DOM is loaded.
 * It acts as a router to initialize page-specific logic.
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM fully loaded and parsed');

    // Load data that might be needed on any page
    loadCartFromLocalStorage();
    loadOrdersFromLocalStorage();

    // Setup event listeners for common elements like header, footer, cart icon
    setupCommonEventListeners();

    // Fetch product data, as it's needed on most pages
    await fetchProducts();

    // Page-specific logic based on the current URL
    const pagePath = window.location.pathname.split('/').pop();
    const urlParams = new URLSearchParams(window.location.search);

    switch (pagePath) {
        case '':
        case 'index.html':
            initializeHomePage();
            break;
        case 'products.html':
            initializeProductsPage(urlParams);
            break;
        case 'product-detail.html':
            initializeProductDetailPage(urlParams);
            break;
        case 'cart.html':
            initializeCartPage();
            break;
        case 'checkout.html':
            initializeCheckoutPage();
            break;
        case 'order-confirmation.html':
            initializeOrderConfirmationPage(urlParams);
            break;
        case 'orders.html':
            initializeOrdersPage();
            break;
        // Static pages like about.html, terms.html, etc., don't need special JS initialization
    }

    // Update UI elements that are present on all pages
    updateCartCount();
    updateOrdersNotification();
    setupImageLoading(); // General image lazy loader
});


// --- PAGE INITIALIZATION FUNCTIONS ---

function initializeHomePage() {
    console.log("Initializing Home Page");
    populateFeaturedProducts();
    const bannerImg = document.querySelector('#homePage .banner-image-container img.image-fade-in');
    if (bannerImg) setupSingleImageLoading(bannerImg);
}

function initializeProductsPage(urlParams) {
    console.log("Initializing Products Page");
    const category = urlParams.get('category') || 'all';
    const searchTerm = urlParams.get('search');
    filterProducts(category, searchTerm);
}

function initializeProductDetailPage(urlParams) {
    console.log("Initializing Product Detail Page");
    const category = urlParams.get('category');
    const slug = urlParams.get('slug');
    if (category && slug) {
        const product = getProductBySlug(category, slug);
        if (product) {
            displayProductDetail(product.id);
        } else {
            console.error(`Product not found for slug: ${slug}`);
            if(domElements.productDetailContainer) {
                domElements.productDetailContainer.innerHTML = '<p>Product not found. <a href="products.html">Go back to products</a>.</p>';
            }
        }
    }
}

function initializeCartPage() {
    console.log("Initializing Cart Page");
    updateCartPage();
}

function initializeCheckoutPage() {
    console.log("Initializing Checkout Page");
    if (cart.length === 0) {
        showToast("Your cart is empty. Redirecting to products...", "info");
        setTimeout(() => navigateTo('products'), 2000);
        const checkoutContent = document.querySelector('.checkout-container');
        if(checkoutContent) checkoutContent.innerHTML = '<h2>Your cart is empty.</h2><p>You will be redirected to the products page shortly.</p>';
    } else {
        updateCheckoutPageOrderSummary();
        setupEnglishCheckoutForm();
    }
}

function initializeOrderConfirmationPage(urlParams) {
    console.log("Initializing Order Confirmation Page");
    const orderId = urlParams.get('orderId');
    updateOrderConfirmationMessage(orderId);
}

async function initializeOrdersPage() {
    console.log("Initializing Orders Page");
    await displayOrdersPage();
}


// --- CORE LOGIC (Functions from original script, slightly adapted) ---

function createSlug(name) {
    if (!name) return '';
    return name.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function getProductById(id) {
    return allProductsData.find(product => product.id === parseInt(id, 10));
}

function getProductBySlug(category, slug) {
    return allProductsData.find(p => p.category === category && p.slug === slug);
}

async function fetchProducts() {
    if (isLoadingProducts || allProductsData.length > 0) {
        return;
    }
    isLoadingProducts = true;
    console.log("Fetching products...");
    try {
        // In a real scenario, this would be a fetch() call.
        // We use the demo data generator function.
        allProductsData = generateDemoProducts().map(p => ({ ...p, slug: createSlug(p.name) }));
        if (!Array.isArray(allProductsData)) {
            throw new Error("Invalid product data format.");
        }
        console.log("Products loaded successfully.");
        updateCategoryCountsInDOM(); // Update counts in off-canvas menu if it exists
    } catch (error) {
        console.error("Could not load products:", error);
        showToast('Error loading products.', 'error');
        allProductsData = []; // Reset on error
    } finally {
        isLoadingProducts = false;
    }
}

function addToCart(productData) {
    if (!productData || typeof productData.id === 'undefined') {
        console.error("Invalid product data to addToCart:", productData);
        showToast('Invalid product.', 'error');
        return;
    }
    let priceToAdd = parseFloat(productData.price);
    let selectedDurationLabel = null;

    // Logic for product detail page duration selector
    const detailDurationSelector = document.getElementById(`duration-detail-${productData.id}`);
    if (detailDurationSelector && detailDurationSelector.value) {
        const selectedOption = detailDurationSelector.options[detailDurationSelector.selectedIndex];
        priceToAdd = parseFloat(selectedOption.value);
        selectedDurationLabel = selectedOption.text.split(' - ')[0];
    }

    const existingItem = cart.find(item =>
        item.id === productData.id &&
        parseFloat(item.price) === priceToAdd &&
        (item.selectedDurationLabel || null) === (selectedDurationLabel || null)
    );

    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
        showToast(`${productData.name}${selectedDurationLabel ? ` (${selectedDurationLabel})` : ''} quantity updated!`, 'info');
    } else {
        cart.push({
            ...productData,
            price: priceToAdd,
            quantity: 1,
            selectedDurationLabel: selectedDurationLabel
        });
        showToast(`${productData.name}${selectedDurationLabel ? ` (${selectedDurationLabel})` : ''} added to cart!`, 'success');
    }
    updateCart();
}

function updateCart() {
    updateCartCount();
    saveCartToLocalStorage();
    // Specific page updates are called by their own initializers
    if (window.location.pathname.endsWith('cart.html')) {
        updateCartPage();
    }
    if (window.location.pathname.endsWith('checkout.html')) {
        updateCheckoutPageOrderSummary();
    }
}

function updateCartCount() {
    if (!domElements.cartCount) return;
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    domElements.cartCount.textContent = count;
    domElements.cartCount.style.display = count > 0 ? 'flex' : 'none';
}

function updateCartPage() {
    if (!domElements.cartPageContent || !domElements.emptyCartPage) return;

    if (cart.length === 0) {
        domElements.cartPageContent.style.display = 'none';
        domElements.emptyCartPage.style.display = 'flex';
        return;
    }

    domElements.emptyCartPage.style.display = 'none';
    domElements.cartPageContent.style.display = 'block';

    let total = 0;
    const cartItemsHTML = cart.map(item => {
        const itemTotal = parseFloat(item.price) * (item.quantity || 1);
        total += itemTotal;
        const displayName = item.selectedDurationLabel ? `${item.name} (${item.selectedDurationLabel})` : item.name;
        // Note: Using data attributes for click handlers to avoid adding event listeners in a loop here
        return `
            <div class="cart-item-row">
                <div class="cart-item-details">
                    <div class="cart-item-name">${displayName}</div>
                    <div class="cart-item-price">৳${parseFloat(item.price).toFixed(2)} each</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" data-action="decrease" data-id="${item.id}" data-price="${item.price}" data-duration="${item.selectedDurationLabel || ''}"><i class="fas fa-minus"></i></button>
                        <span class="quantity-display">${item.quantity || 1}</span>
                        <button class="quantity-btn" data-action="increase" data-id="${item.id}" data-price="${item.price}" data-duration="${item.selectedDurationLabel || ''}"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
                <div class="cart-item-actions">
                    <div style="font-weight:600;margin-bottom:1rem;color:var(--primary-color);">৳${itemTotal.toFixed(0)}</div>
                    <button class="remove-item-btn" data-action="remove" data-id="${item.id}" data-price="${item.price}" data-duration="${item.selectedDurationLabel || ''}"><i class="fas fa-trash"></i> Remove</button>
                </div>
            </div>
        `;
    }).join('');

    domElements.cartPageContent.innerHTML = `
        <h2 class="section-title">Your Shopping Cart</h2>
        <div class="cart-items-list">${cartItemsHTML}</div>
        <div class="cart-summary">
            <div class="cart-total-row">
                <span>Total Amount:</span>
                <span id="cartPageTotal">৳${total.toFixed(2)}</span>
            </div>
        </div>
        <div class="cart-actions">
            <button class="cart-checkout-btn" id="cartPageCheckoutBtn"><i class="fas fa-credit-card"></i> Proceed to Checkout</button>
            <button class="continue-shopping" id="cartPageContinueBtn"><i class="fas fa-store"></i> Continue Shopping</button>
        </div>
    `;

    // Add event listeners for the newly created buttons
    document.getElementById('cartPageCheckoutBtn').addEventListener('click', () => navigateTo('checkout'));
    document.getElementById('cartPageContinueBtn').addEventListener('click', () => navigateTo('products', 'all'));

    domElements.cartPageContent.addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button) return;

        const { action, id, price, duration } = button.dataset;
        if (!action) return;

        const productId = parseInt(id);
        const itemPrice = parseFloat(price);
        const itemDurationLabel = duration;

        if (action === 'increase') {
            updateCartItemQuantity(productId, 1, itemPrice, itemDurationLabel);
        } else if (action === 'decrease') {
            updateCartItemQuantity(productId, -1, itemPrice, itemDurationLabel);
        } else if (action === 'remove') {
            removeFromCart(productId, itemPrice, itemDurationLabel);
        }
    });
}

function updateCartItemQuantity(productId, change, itemPrice, itemDurationLabel) {
    const durationToMatch = itemDurationLabel === 'null' || itemDurationLabel === '' ? null : itemDurationLabel;
    const itemIndex = cart.findIndex(item => item.id === productId && parseFloat(item.price) === itemPrice && (item.selectedDurationLabel || null) === durationToMatch);
    if (itemIndex > -1) {
        cart[itemIndex].quantity = Math.max(1, (cart[itemIndex].quantity || 1) + change);
        const displayName = cart[itemIndex].selectedDurationLabel ? `${cart[itemIndex].name} (${cart[itemIndex].selectedDurationLabel})` : cart[itemIndex].name;
        showToast(`${displayName} quantity updated!`, 'info');
        updateCart();
    }
}

function removeFromCart(productId, itemPrice, itemDurationLabel) {
    const durationToMatch = itemDurationLabel === 'null' || itemDurationLabel === '' ? null : itemDurationLabel;
    const itemIndex = cart.findIndex(item => item.id === productId && parseFloat(item.price) === itemPrice && (item.selectedDurationLabel || null) === durationToMatch);
    if (itemIndex > -1) {
        const item = cart[itemIndex];
        const displayName = item.selectedDurationLabel ? `${item.name} (${item.selectedDurationLabel})` : item.name;
        cart.splice(itemIndex, 1);
        showToast(`${displayName} removed from cart.`, 'info');
        updateCart();
    }
}


function saveCartToLocalStorage() { localStorage.setItem('thinkPlusBDCart', JSON.stringify(cart)); }
function loadCartFromLocalStorage() {
    const storedCart = localStorage.getItem('thinkPlusBDCart');
    if (storedCart) {
        try {
            cart = JSON.parse(storedCart);
            if (!Array.isArray(cart)) cart = [];
        } catch (e) {
            console.error("Error parsing cart from localStorage:", e);
            cart = [];
        }
    }
}

function loadOrdersFromLocalStorage() {
    const storedOrders = localStorage.getItem('thinkPlusBDLocalOrders');
    if (storedOrders) {
        try {
            orders = JSON.parse(storedOrders);
            if (!Array.isArray(orders)) orders = [];
            // Basic validation and sorting
            orders = orders
                .map(o => ({ ...o, viewed: o.viewed === true, timestamp: o.timestamp || new Date(0).toISOString() }))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10); // Keep last 10 orders
        } catch (e) {
            console.error("Error parsing orders from localStorage:", e);
            orders = [];
        }
    }
}

function saveOrdersToLocalStorage() {
    orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (orders.length > 10) {
        orders = orders.slice(0, 10);
    }
    localStorage.setItem('thinkPlusBDLocalOrders', JSON.stringify(orders));
    updateOrdersNotification();
}

function updateOrdersNotification() {
    if (!domElements.ordersNotification) return;
    const unreadCount = orders.filter(order => order.viewed === false).length;
    const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString();
    domElements.ordersNotification.style.display = unreadCount > 0 ? 'flex' : 'none';
    if (unreadCount > 0) {
        domElements.ordersNotification.textContent = displayCount;
    }
}

function markAllOrdersAsViewed() {
    let changed = false;
    orders = orders.map(order => {
        if (order.viewed === false) {
            changed = true;
            return { ...order, viewed: true };
        }
        return order;
    });
    if (changed) {
        saveOrdersToLocalStorage();
    }
}

function handleSearch(term) {
    const lowerCaseTerm = term.toLowerCase().trim();
    if (lowerCaseTerm === "") return;
    navigateTo('products', 'all', lowerCaseTerm);
}

function openOffCanvasMenu() {
    if (domElements.offCanvasMenu) domElements.offCanvasMenu.classList.add('active');
    if (domElements.offCanvasOverlay) domElements.offCanvasOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeOffCanvasMenu() {
    if (domElements.offCanvasMenu) domElements.offCanvasMenu.classList.remove('active');
    if (domElements.offCanvasOverlay) domElements.offCanvasOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function updateCategoryCountsInDOM() {
    if (allProductsData.length === 0) return;
    const categoryCounts = { course: 0, subscription: 0, software: 0, ebook: 0 };
    allProductsData.forEach(product => {
        if (categoryCounts.hasOwnProperty(product.category)) {
            categoryCounts[product.category]++;
        }
    });

    const categoryDisplayMap = {
        course: { id: 'category-count-course', singular: 'Premium Course', plural: 'Premium Courses' },
        subscription: { id: 'category-count-subscription', singular: 'Premium Service', plural: 'Premium Services' },
        software: { id: 'category-count-software', singular: 'Bundle Package', plural: 'Bundle Packages' },
        ebook: { id: 'category-count-ebook', singular: 'Digital Guide', plural: 'Digital Guides' }
    };

    for (const key in categoryCounts) {
        const element = document.getElementById(categoryDisplayMap[key].id);
        if (element) {
            const count = categoryCounts[key];
            element.textContent = `${count} ${count === 1 ? categoryDisplayMap[key].singular : categoryDisplayMap[key].plural}`;
        }
    }
}

function setupSingleImageLoading(imgElement, onImageLoadCallback) {
    if (!imgElement) return;
    const container = imgElement.closest('.banner-image-container, .product-card-image-container, .product-detail-main-image-container, .related-product-image-container');

    const handleLoad = () => {
        if (container) {
            const skeleton = container.querySelector('.skeleton');
            if (skeleton) skeleton.style.display = 'none';
        }
        imgElement.classList.add('loaded');
        if (typeof onImageLoadCallback === 'function') onImageLoadCallback();
    };

    const handleError = () => {
        if (container) {
            const skeleton = container.querySelector('.skeleton');
            if (skeleton) skeleton.style.display = 'none';
            const placeholder = container.querySelector('.image-placeholder-text');
            if (placeholder) placeholder.style.display = 'block';
        }
        imgElement.style.display = 'none';
        if (typeof onImageLoadCallback === 'function') onImageLoadCallback();
    };

    if (imgElement.complete && imgElement.naturalHeight !== 0) {
        handleLoad();
    } else {
        imgElement.onload = handleLoad;
        imgElement.onerror = handleError;
    }
}

function setupImageLoading() {
    document.querySelectorAll('img.image-fade-in').forEach(img => setupSingleImageLoading(img));
}

function setupCommonEventListeners() {
    const menuIcon = document.getElementById('menuIcon');
    if (menuIcon) menuIcon.addEventListener('click', openOffCanvasMenu);

    const offCanvasClose = document.getElementById('offCanvasClose');
    if (offCanvasClose) offCanvasClose.addEventListener('click', closeOffCanvasMenu);

    if (domElements.offCanvasOverlay) domElements.offCanvasOverlay.addEventListener('click', closeOffCanvasMenu);

    // Search functionality
    const desktopSearchButton = document.getElementById('desktopSearchButton');
    const searchInput = document.getElementById('searchInput');
    if (desktopSearchButton && searchInput) {
        desktopSearchButton.addEventListener('click', () => handleSearch(searchInput.value));
        searchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(searchInput.value);
            }
        });
    }

    const mobileHeaderSearchIcon = document.getElementById('mobileHeaderSearchIcon');
    const mobileSearchContainer = document.querySelector('.mobile-search-container');
    if (mobileHeaderSearchIcon && mobileSearchContainer) {
        mobileHeaderSearchIcon.addEventListener('click', () => {
            document.body.classList.toggle('show-mobile-search');
            const mobileSearchInput = document.getElementById('mobileSearchInput');
            if (document.body.classList.contains('show-mobile-search') && mobileSearchInput) {
                mobileSearchInput.focus();
            }
        });
    }

    const mobileBoxSearchButton = document.getElementById('mobileBoxSearchButton');
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    if(mobileBoxSearchButton && mobileSearchInput) {
        mobileBoxSearchButton.addEventListener('click', () => handleSearch(mobileSearchInput.value));
        mobileSearchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(mobileSearchInput.value);
                this.blur();
            }
        });
    }

    // FAB menu
    const contactFabMain = document.getElementById('contactFabMain');
    const fabContainer = document.getElementById('fabContainer');
    if (contactFabMain && fabContainer) {
        contactFabMain.addEventListener('click', (e) => {
            e.stopPropagation();
            fabContainer.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!fabContainer.contains(e.target) && fabContainer.classList.contains('active')) {
                fabContainer.classList.remove('active');
            }
        });
    }
}

function showToast(message, type = 'info', duration = 3000) {
    const toastElement = domElements.toast;
    if (!toastElement) return;
    if (toastElement.timerId) {
        clearTimeout(toastElement.timerId);
    }
    toastElement.textContent = message;
    toastElement.className = 'toast show';
    if (type === 'success') toastElement.classList.add('success');
    else if (type === 'error') toastElement.classList.add('error');
    else if (type === 'info') toastElement.classList.add('info');
    toastElement.offsetHeight; // Trigger reflow
    toastElement.timerId = setTimeout(() => {
        toastElement.className = 'toast';
        toastElement.timerId = null;
    }, duration);
}

function renderProductCard(product, isFeaturedCard = false) {
    if (!product || typeof product.id === 'undefined') {
        console.error("Invalid product data for card:", product);
        const e = document.createElement('div');
        e.innerHTML = "<p>Error displaying product.</p>";
        return e;
    }
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-id', product.id);

    let priceToDisplayNum;
    if (product.category === 'subscription' && Array.isArray(product.durations) && product.durations.length > 0) {
        priceToDisplayNum = Math.min(...product.durations.map(d => parseFloat(d.price)));
    } else {
        priceToDisplayNum = parseFloat(product.price);
    }
    const formattedPrice = `৳${Math.floor(priceToDisplayNum)}`;
    const buttonsHTML = isFeaturedCard ?
        `<button class="view-details-card full-width-button" data-action="view">View Details</button>` :
        `<button class="buy-now-card" data-action="buy">Buy Now</button><button class="view-details-card" data-action="view">View Details</button>`;

    card.innerHTML = `
        <div class="product-card-image-container" data-action="view">
            <div class="skeleton"></div>
            <span class="image-placeholder-text" style="display: none;">Image for ${product.name}</span>
            ${product.image ? `<img src="${product.image}" alt="${product.name}" class="image-fade-in">` : ''}
        </div>
        <div class="product-card-content">
            <div class="product-card-header">
                <h3 data-action="view">${product.name || 'Unnamed Product'}</h3>
            </div>
            <p class="description">${product.description || 'No description available.'}</p>
            <div class="price">${formattedPrice}</div>
            <div class="product-actions">${buttonsHTML}</div>
        </div>
    `;

    // Event delegation will handle clicks on the grid
    const img = card.querySelector('img.image-fade-in');
    if (img) setupSingleImageLoading(img);
    else {
        const skeleton = card.querySelector('.skeleton');
        if(skeleton) skeleton.style.display = 'none';
        const placeholder = card.querySelector('.image-placeholder-text');
        if(placeholder) placeholder.style.display = 'block';
    }

    return card;
}

function handleProductCardClick(event) {
    const card = event.target.closest('.product-card');
    if (!card) return;

    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;
    const productId = parseInt(card.dataset.id);
    const product = getProductById(productId);

    if (!product) {
        console.error(`Product with ID ${productId} not found.`);
        return;
    }

    if (action === 'view') {
        navigateTo('product', `${product.category}/${product.slug}`);
    } else if (action === 'buy') {
        handleProductCardBuyNow(product.id);
    }
}

function populateFeaturedProducts() {
    const grids = {
        course: domElements.featuredCoursesGrid,
        subscription: domElements.popularSubscriptionsGrid,
        software: domElements.topSoftwareGrid,
        ebook: domElements.latestEbooksGrid,
    };

    if (allProductsData.length === 0) {
        Object.values(grids).forEach(grid => {
            if (grid) grid.innerHTML = '<p>No featured products available.</p>';
        });
        return;
    }

    const featuredConfigs = {
        course: { grid: grids.course, limit: 3, mobileLimit: 2 },
        subscription: { grid: grids.subscription, limit: 3, mobileLimit: 2 },
        software: { grid: grids.software, limit: 3, mobileLimit: 2 },
        ebook: { grid: grids.ebook, limit: 3, mobileLimit: 2 }
    };

    for (const category in featuredConfigs) {
        const config = featuredConfigs[category];
        if (config.grid) {
            config.grid.innerHTML = '';
            const productsForCategory = allProductsData.filter(p => p.category === category && p.isFeatured);
            const limit = window.innerWidth <= 768 ? config.mobileLimit : config.limit;
            const displayedProducts = productsForCategory.slice(0, limit);
            if (displayedProducts.length > 0) {
                displayedProducts.forEach(product => config.grid.appendChild(renderProductCard(product, true)));
                config.grid.addEventListener('click', handleProductCardClick);
            } else {
                config.grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#999;">No featured ${category}s.</p>`;
            }
        }
    }
}

function filterProducts(category, searchTerm = null) {
    const grid = domElements.allProductsGrid;
    const noProductsMsg = domElements.noProductsMessage;
    if (!grid || !noProductsMsg) return;

    grid.innerHTML = '';

    if (allProductsData.length === 0 && !isLoadingProducts) {
        noProductsMsg.textContent = 'Products are currently unavailable.';
        noProductsMsg.style.display = 'block';
        return;
    }

    if (isLoadingProducts) {
        noProductsMsg.textContent = 'Loading products...';
        noProductsMsg.style.display = 'block';
        return;
    }

    let filteredProducts;
    const productsPageTitle = document.getElementById('productsPageTitle');

    if (category === 'all') {
        filteredProducts = [...allProductsData];
        if (productsPageTitle) productsPageTitle.textContent = "All Our Products";
    } else {
        filteredProducts = allProductsData.filter(p => p.category === category);
        if (productsPageTitle) productsPageTitle.textContent = `Our ${category.charAt(0).toUpperCase() + category.slice(1)}s`;
    }

    if (searchTerm && searchTerm.trim() !== "") {
        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
        filteredProducts = filteredProducts.filter(product =>
            (product.name && product.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (product.description && product.description.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (product.category && product.category.toLowerCase().includes(lowerCaseSearchTerm))
        );
        if (productsPageTitle) productsPageTitle.textContent += ` (searching for "${searchTerm}")`;
    }

    if (filteredProducts.length === 0) {
        noProductsMsg.textContent = 'No products found matching your criteria.';
        noProductsMsg.style.display = 'block';
    } else {
        noProductsMsg.style.display = 'none';
        filteredProducts.forEach(product => grid.appendChild(renderProductCard(product, false)));
        grid.addEventListener('click', handleProductCardClick);
    }
}

function displayProductDetail(productId) {
    const product = getProductById(productId);
    const detailContainer = domElements.productDetailContainer;
    if (!product || !detailContainer) {
        console.error(`Product ${productId} not found or detail container missing.`);
        if(detailContainer) detailContainer.innerHTML = 'Error: Product details could not be loaded.';
        return;
    }

    let currentPrice = parseFloat(product.price);
    let durationSelectorHTML = '';
    if (product.category === 'subscription' && Array.isArray(product.durations) && product.durations.length > 0) {
        currentPrice = parseFloat(product.durations[0].price);
        durationSelectorHTML = `
            <div class="duration-selector" style="margin-bottom:0.75rem;display:block;">
                <label for="duration-detail-${product.id}" style="font-weight:600;margin-bottom:0.5rem;display:block;">Select Duration:</label>
                <select id="duration-detail-${product.id}" data-product-id="${product.id}" style="width:100%;padding:0.7rem;border:1px solid #ccc;border-radius:6px;font-size:1rem;">
                    ${product.durations.map(d => `<option value="${d.price}">${d.label} - ৳${parseFloat(d.price).toFixed(2)}</option>`).join('')}
                </select>
            </div>`;
    }

    detailContainer.innerHTML = `
        <div class="product-detail-images">
            <div class="product-detail-main-image-container">
                <div class="skeleton"></div>
                <span class="image-placeholder-text" style="display: none;">Image for ${product.name}</span>
                ${product.image ? `<img src="${product.image}" alt="${product.name}" class="image-fade-in">` : ''}
            </div>
        </div>
        <div class="product-detail-info">
            <h2 class="product-detail-title">${product.name || 'N/A'}</h2>
            <p class="product-detail-description">${product.longDescription || product.description || 'An exceptional digital product.'}</p>
            <div class="product-detail-price">৳${currentPrice.toFixed(2)}</div>
            ${durationSelectorHTML}
            <div class="product-detail-actions">
                <button class="buy-now-detail" data-id="${product.id}"><i class="fas fa-bolt"></i> Buy Now</button>
                <button class="add-to-cart-detail" data-id="${product.id}"><i class="fas fa-cart-plus"></i> Add to Cart</button>
            </div>
        </div>
        ${renderRelatedProductsSection(product.id, product.category)}
    `;

    const img = detailContainer.querySelector('img.image-fade-in');
    if (img) setupSingleImageLoading(img);
    else {
        const skeleton = detailContainer.querySelector('.skeleton');
        if(skeleton) skeleton.style.display = 'none';
        const placeholder = detailContainer.querySelector('.image-placeholder-text');
        if(placeholder) placeholder.style.display = 'block';
    }
    setupRelatedProductImages();

    // Event listeners
    const durationSelector = detailContainer.querySelector(`#duration-detail-${product.id}`);
    if (durationSelector) {
        durationSelector.addEventListener('change', (e) => {
            const newPrice = parseFloat(e.target.value);
            const priceElement = detailContainer.querySelector('.product-detail-price');
            if (priceElement) priceElement.textContent = `৳${newPrice.toFixed(2)}`;
        });
    }
    detailContainer.querySelector('.buy-now-detail').addEventListener('click', e => {
        const productToBuy = getProductById(productId);
        if (productToBuy) {
            const productCopy = { ...productToBuy };
            const durationSel = document.getElementById(`duration-detail-${productId}`);
            if (durationSel && durationSel.value) {
                const selectedOption = durationSel.options[durationSel.selectedIndex];
                productCopy.price = parseFloat(selectedOption.value);
                productCopy.selectedDurationLabel = selectedOption.text.split(' - ')[0];
            }
            cart = [{ ...productCopy, quantity: 1 }];
            updateCart();
            navigateTo('checkout');
        }
    });
    detailContainer.querySelector('.add-to-cart-detail').addEventListener('click', e => {
        addToCart(getProductById(productId));
    });
}

function getRelatedProducts(currentProductId, category, limit = 4) {
    if (allProductsData.length === 0) return [];
    const related = allProductsData.filter(p => p.category === category && p.id !== currentProductId);
    return related.sort(() => 0.5 - Math.random()).slice(0, limit);
}

function renderRelatedProductsSection(currentProductId, category) {
    const relatedProducts = getRelatedProducts(currentProductId, category, window.innerWidth <= 768 ? 2 : 3);
    if (relatedProducts.length === 0) return '';
    const relatedProductsHTML = relatedProducts.map(product => {
        let price = parseFloat(product.price);
        if (product.category === 'subscription' && Array.isArray(product.durations) && product.durations.length > 0) {
            price = parseFloat(product.durations[0].price);
        }
        const formattedPrice = !isNaN(price) ? `৳${Math.floor(price)}` : 'Price unavailable';
        return `
            <div class="related-product-card" onclick="navigateTo('product', '${product.category}/${product.slug}')">
                <div class="related-product-image-container">
                    <div class="skeleton"></div>
                    ${product.image ? `<img src="${product.image}" alt="${product.name}" class="image-fade-in" />` : ''}
                    <span class="image-placeholder-text" style="display:none;">Image for ${product.name}</span>
                </div>
                <div class="related-product-content">
                    <h4 class="related-product-title">${product.name}</h4>
                    <p class="related-product-description">${product.description}</p>
                    <div class="related-product-price">${formattedPrice}</div>
                </div>
            </div>`;
    }).join('');

    return `
        <div class="related-products-section">
            <h3 class="related-products-title">Related Products</h3>
            <div class="related-products-grid">${relatedProductsHTML}</div>
        </div>`;
}

function setupRelatedProductImages() {
    document.querySelectorAll('.related-product-image-container img.image-fade-in').forEach(img => {
        setupSingleImageLoading(img);
    });
}

function handleProductCardBuyNow(productId) {
    const product = getProductById(productId);
    if (product) {
        const productForCart = { ...product };
        if (product.category === 'subscription' && Array.isArray(product.durations) && product.durations.length > 0) {
            productForCart.price = parseFloat(product.durations[0].price);
            productForCart.selectedDurationLabel = product.durations[0].label;
        }
        cart = [{ ...productForCart, quantity: 1 }];
        updateCart();
        navigateTo('checkout');
    }
}

function updateCheckoutPageOrderSummary() {
    const orderItemsElement = domElements.orderItemsCheckout;
    const orderTotalElement = domElements.orderTotalCheckout;
    if (!orderItemsElement || !orderTotalElement) return;

    orderItemsElement.innerHTML = '';
    let total = 0;
    if (cart.length === 0) {
        orderItemsElement.innerHTML = "<p>Your cart is empty.</p>";
        orderTotalElement.textContent = `৳0.00`;
        return;
    }
    cart.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'summary-item';
        const itemTotal = parseFloat(item.price) * (item.quantity || 1);
        const displayName = item.selectedDurationLabel ? `${item.name} (${item.selectedDurationLabel})` : item.name;
        itemDiv.innerHTML = `<span>${displayName} (x${item.quantity || 1})</span><span>৳${itemTotal.toFixed(2)}</span>`;
        orderItemsElement.appendChild(itemDiv);
        total += itemTotal;
    });
    orderTotalElement.textContent = `৳${total.toFixed(2)}`;
    document.querySelectorAll('#payment-instructions .dynamic-amount').forEach(span => {
        span.textContent = `৳${total.toFixed(2)}`;
    });
}

function updateOrderConfirmationMessage(orderId) {
    const orderIdDisplayElement = document.getElementById('orderIdDisplay');
    if (orderIdDisplayElement) {
        orderIdDisplayElement.textContent = orderId || 'N/A';
    }
    const order = orders.find(o => o.id === orderId);
    if(order) {
        const confirmationDetails = document.getElementById('confirmationDetails');
        if(confirmationDetails) {
            confirmationDetails.innerHTML = `
                <p><strong>Order Total:</strong> ৳${parseFloat(order.totalAmount || 0).toFixed(2)}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
                <p>An email confirmation has been sent to <strong>${order.customer.email}</strong>.</p>
            `;
        }
    }
}

async function placeOrder(event) {
    event.preventDefault();
    const form = domElements.checkoutForm;
    if (!form) {
        showToast('Checkout form unavailable.', 'error');
        return;
    }
    const name = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const phone = form.querySelector('#number').value.trim();
    const transactionId = form.querySelector('#transactionId').value.trim();

    if (!name || !email || !phone || !transactionId) { showToast('Please fill all fields.', 'error'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { showToast('Invalid email.', 'error'); return; }
    if (!/^01[3-9]\d{8}$/.test(phone)) { showToast('Invalid Bangladeshi phone number.', 'error'); return; }
    if (transactionId.length < 5) { showToast('Transaction ID seems too short.', 'error'); return; }

    const selectedPaymentMethodRadio = form.querySelector('input[name="paymentMethod"]:checked');
    if (!selectedPaymentMethodRadio) { showToast('Please select a payment method.', 'error'); return; }
    const paymentMethod = selectedPaymentMethodRadio.value;

    const orderId = 'TPBD-' + Math.floor(100000 + Math.random() * 900000);
    const orderPayload = {
        id: orderId,
        customer: { name, email, phone },
        items: cart.map(item => ({ id: item.id, name: item.name, price: parseFloat(item.price), quantity: item.quantity || 1, selectedDurationLabel: item.selectedDurationLabel || null })),
        totalAmount: cart.reduce((sum, item) => sum + (parseFloat(item.price) * (item.quantity || 1)), 0),
        paymentMethod: paymentMethod,
        status: 'Pending',
        timestamp: new Date().toISOString(),
        transactionId: transactionId,
        viewed: false
    };

    showToast('Submitting your order...', 'info');

    // Simulate server save. In a real app, this would be a fetch call.
    // For this project, we just save it to localStorage.
    orders.unshift(orderPayload);
    saveOrdersToLocalStorage();

    showToast(`Order ${orderId} placed successfully!`, 'success');

    cart = [];
    updateCart();

    navigateTo('orderConfirmation', orderId);
}

async function displayOrdersPage() {
    const container = domElements.ordersListContainer;
    const noOrdersMsg = domElements.noOrdersMessage;
    if (!container || !noOrdersMsg) return;

    container.innerHTML = '';
    loadOrdersFromLocalStorage();

    if (orders.length === 0) {
        noOrdersMsg.style.display = 'block';
        container.style.display = 'none';
        return;
    }

    noOrdersMsg.style.display = 'none';
    container.style.display = 'block';

    const sortedOrders = [...orders].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    sortedOrders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        const itemsHTML = (order.items || []).map(item => {
            const displayName = item.selectedDurationLabel ? `${item.name} (${item.selectedDurationLabel})` : item.name;
            return `<li>${displayName} (x${item.quantity || 1}) - ৳${(parseFloat(item.price) * (item.quantity || 1)).toFixed(2)}</li>`;
        }).join('');

        const statusClass = `status-${(order.status || 'unknown').toLowerCase().replace(/\s+/g, '-')}`;
        const formattedDate = new Date(order.timestamp).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        orderCard.innerHTML = `
            <div class="order-header">
                <div>
                    <span class="order-id">Order ID: ${order.id}</span>
                    <span class="order-date">Placed: ${formattedDate}</span>
                </div>
                <span class="order-status ${statusClass}">${order.status || 'Unknown'}</span>
            </div>
            <div class="order-body">
                <p><strong>Customer:</strong> ${order.customer.name}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
                ${order.transactionId ? `<p><strong>TrxID:</strong> ${order.transactionId}</p>` : ''}
                <p><strong>Items:</strong></p>
                <ul class="order-items-list">${itemsHTML}</ul>
            </div>
            <div class="order-footer">
                <span>Total Amount:</span>
                <span class="order-total-amount">৳${parseFloat(order.totalAmount || 0).toFixed(2)}</span>
            </div>
        `;
        container.appendChild(orderCard);
    });

    markAllOrdersAsViewed();
}

function setupEnglishCheckoutForm() {
    const form = domElements.checkoutForm;
    if (!form) return;
    form.removeEventListener('submit', placeOrder); // Remove old listener if any
    form.addEventListener('submit', placeOrder);

    const paymentDetailsArea = document.getElementById('payment-details-area');
    const recipientNumberDisplay = document.getElementById('recipient-number-display');
    const paymentInstructionsDiv = document.getElementById('payment-instructions');
    const orderTotalElement = document.getElementById('orderTotalCheckout');

    const selectWrapper = document.querySelector('.custom-select-wrapper.payment-gateway-select');
    if (!selectWrapper) return;
    const selectTrigger = selectWrapper.querySelector('.custom-select-trigger');
    const selectedTextElement = selectWrapper.querySelector('#selected-payment-method-text');
    const customOptionsContainer = selectWrapper.querySelector('.custom-options');
    if (!selectTrigger || !selectedTextElement || !customOptionsContainer) return;

    const recipientNumber = "01757204719";

    const getPaymentInstructions = () => {
        const totalText = orderTotalElement ? orderTotalElement.textContent : '৳0.00';
        return {
            bkash: { title: "bKash Instructions", steps: [`Open bKash & select 'Send Money'.`, `Amount: <strong class="highlight">${totalText}</strong> to <strong class="highlight">${recipientNumber}</strong>.`, `Copy TrxID & enter below.`] },
            nagad: { title: "Nagad Instructions", steps: [`Open Nagad & select 'Send Money'.`, `Amount: <strong class="highlight">${totalText}</strong> to <strong class="highlight">${recipientNumber}</strong>.`, `Copy TrxID & enter below.`] },
            rocket: { title: "Rocket Instructions", steps: [`Use Rocket App for 'Send Money'.`, `Amount: <strong class="highlight">${totalText}</strong> to <strong class="highlight">${recipientNumber}</strong>.`, `Copy TrxID & enter below.`] },
            upay: { title: "Upay Instructions", steps: [`Open Upay & select 'Send Money'.`, `Amount: <strong class="highlight">${totalText}</strong> to <strong class="highlight">${recipientNumber}</strong>.`, `Copy TrxID & enter below.`] }
        };
    };

    selectTrigger.addEventListener('click', () => selectWrapper.classList.toggle('open'));

    customOptionsContainer.addEventListener('click', e => {
        const option = e.target.closest('.custom-option');
        if (!option) return;

        const value = option.dataset.value;
        const instructionType = option.dataset.instructionType;
        const displayText = option.querySelector('.option-text').textContent.trim();

        document.getElementById(`${value}_radio`).checked = true;
        selectedTextElement.textContent = displayText;
        selectedTextElement.classList.add('selected');

        selectWrapper.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected-option-highlight'));
        option.classList.add('selected-option-highlight');

        selectWrapper.classList.remove('open');

        if (recipientNumberDisplay) {
            recipientNumberDisplay.querySelector('#payment-number-text').textContent = recipientNumber;
        }
        if (paymentInstructionsDiv) {
            const instructions = getPaymentInstructions()[instructionType];
            if (instructions) {
                paymentInstructionsDiv.innerHTML = `
                    <h3 class="instruction-title">${instructions.title}</h3>
                    <ul>${instructions.steps.map(s => `<li>${s}</li>`).join('')}</ul>
                `;
            }
        }
        if (paymentDetailsArea) paymentDetailsArea.style.display = 'block';
    });

    document.addEventListener('click', e => {
        if (!selectWrapper.contains(e.target)) {
            selectWrapper.classList.remove('open');
        }
    });

    const copyButton = document.getElementById('copy-payment-number');
    if (copyButton) {
        copyButton.addEventListener('click', function() {
            navigator.clipboard.writeText(recipientNumber).then(() => {
                showToast('Number copied!', 'success');
            }, () => {
                showToast('Copy failed.', 'error');
            });
        });
    }
}

// --- DEMO DATA GENERATOR ---
function generateDemoProducts() {
    return [
        {
            id: 1, name: `CAPCUT PRO (pc version)`,
            description: `Watermark ছাড়া Full HD/4K Export, আনলকড প্রিমিয়াম ফিচার, Smooth Slow Motion, এবং আরো অনেক কিছু!`,
            longDescription: `🔥 প্রো-লেভেলের ভিডিও এডিটিং এখন আরও সহজ ও স্মার্ট! CapCut Pro নিয়ে এসেছে প্রিমিয়াম সব ফিচার, যা দেবে আপনাকে একদম প্রফেশনাল এবং হাই-কোয়ালিটি এডিটিং অভিজ্ঞতা — দ্রুত, সহজ, এবং watermark ছাড়া।`,
            category: "software", price: 249, image: "product_images/CAPCUT PRO.png", isFeatured: true
        },
        {
            id: 4, name: `CANVA PRO (official)`,
            description: `আপনার ডিজাইনের মুক্ত জগতে প্রবেশ করুন! Watermark ছাড়া HD এক্সপোর্ট, হাজারো প্রিমিয়াম টেমপ্লেট, Background Remover, Magic Resize সহ অসাধারণ সব ফিচারে`,
            longDescription: `আপনার ডিজাইনিং অভিজ্ঞতাকে করে আরও সহজ, স্মার্ট এবং প্রফেশনাল। ১০০ মিলিয়নেরও বেশি Premium Photos, Videos, Graphics & Elements.`,
            category: "subscription", price: 0, image: "product_images/CANVAPRO.png", isFeatured: true,
            durations: [{ label: `6 MONTH`, price: 49 }, { label: `1 YEAR`, price: 99 }, { label: `3 YEARS`, price: 149 }]
        },
        {
            id: 6, name: `CHAT-GPT (personal)`,
            description: `GPT‑4o, 4.1, 4.5 সহ আনলিমিটেড প্রিমিয়াম ফিচার আগে এক্সেস দেখে নিন, তারপর পেমেন্ট!`,
            longDescription: `💡আপনি এখন পাচ্ছেন ChatGPT‑র সর্বশেষ ও সবচেয়ে পাওয়ারফুল ভার্সন – GPT‑4o, GPT‑4.1, এবং GPT‑4.5 সহ ফুল ফিচার আনলকড!`,
            category: "subscription", price: 0, image: "product_images/Chatgpt1.png", isFeatured: true,
            durations: [{ label: `1 MONTH`, price: 499 }]
        },
        {
            id: 11, name: `WASENDER (official licensekey)`,
            description: `WhatsApp Marketing Software – আপনার বিক্রি বাড়ানোর সহজ সমাধান! দৈনিক ১২০০+ ইউজারকে ফ্রি মেসেজ সেন্ড, টার্গেটেড নাম্বার ও ইমেইল কালেক্ট।`,
            longDescription: `✅ WhatsApp Marketing Software কেন ব্যবহার করবেন? ১২০০+ ইউজারকে একদিনেই ফ্রি মেসেজ করুন! আপনি প্রতিদিন সম্পূর্ণ ফ্রি-তে ১২০০+ মানুষকে হোয়াটসঅ্যাপে প্রোমোশনাল মেসেজ পাঠাতে পারবেন।`,
            category: "software", price: 0, image: "product_images/WASENDERR.png", isFeatured: true,
            durations: [{ label: `6 MONTH`, price: 699 }, { label: `1 YEAR`, price: 999 }, { label: `LIFETIME`, price: 1999 }]
        },
        {
            id: 21, name: `WINDOWS 7 PRODUCT KEY`,
            description: `💻 Windows 7 লাইসেন্স কী – 100% জেনুইন ও আজীবনের এক্টিভেশন! Microsoft-এর অফিসিয়াল Activation Key, ইমেইলে ডেলিভারি।`,
            longDescription: `আজীবনের পার্মানেন্ট এক্টিভেশন। Microsoft Windows 7-এর অফিশিয়াল Activation/Product Key. “Activate Windows” লেখা থেকে মুক্তি এবং সকল প্রিমিয়াম ফিচার আনলক।`,
            category: "software", price: 0, image: "product_images/windows7pro.png", isFeatured: false,
            durations: [{ label: `Windows 7 Home Basic Key`, price: 299 }, { label: `Windows 7 Home Premium Key`, price: 349 }, { label: `Windows 7 Ultimate Key`, price: 299 }, { label: `Windows 7 Professional Key`, price: 349 }]
        },
        {
            id: 22, name: `WINDOWS 8 PRODUCT KEY`,
            description: `💻 Windows 8 লাইসেন্স কী – 100% জেনুইন ও আজীবনের এক্টিভেশন! Microsoft-এর অফিসিয়াল Activation Key, ইমেইলে ডেলিভারি।`,
            longDescription: `আজীবনের পার্মানেন্ট এক্টিভেশন। Microsoft Windows 8-এর অফিশিয়াল Activation/Product Key.`,
            category: "software", price: 0, image: "product_images/windows8pro.png", isFeatured: false,
            durations: [{ label: `Windows 8 Professional Key`, price: 299 }, { label: `Windows 8.1 Professional Key`, price: 349 }]
        },
        {
            id: 23, name: `WINDOWS 10 PRODUCT KEY`,
            description: `💻 Windows 10 লাইসেন্স কী – 100% জেনুইন ও আজীবনের এক্টিভেশন! Microsoft-এর অফিসিয়াল Activation Key, ইমেইলে ডেলিভারি।`,
            longDescription: `আজীবনের পার্মানেন্ট এক্টিভেশন। Microsoft Windows 10-এর অফিশিয়াল Activation/Product Key.`,
            category: "software", price: 0, image: "product_images/windows10pro.png", isFeatured: false,
            durations: [{ label: `Windows 10 Pro Key`, price: 399 }, { label: `Windows 10 Home Key`, price: 399 }, { label: `Windows 10 Enterprise Key`, price: 449 }]
        },
        {
            id: 24, name: `WINDOWS 11 PRODUCT KEY`,
            description: `💻 Windows 11 লাইসেন্স কী – 100% জেনুইন ও আজীবনের এক্টিভেশন! Microsoft-এর অফিসিয়াল Activation Key, ইমেইলে ডেলিভারি।`,
            longDescription: `আজীবনের পার্মানেন্ট এক্টিভেশন। Microsoft Windows 11-এর অফিশিয়াল Activation/Product Key.`,
            category: "software", price: 0, image: "product_images/WINDOWS11pro.png", isFeatured: false,
            durations: [{ label: `Windows 11 Pro Key`, price: 499 }, { label: `Windows 11 Home Key`, price: 499 }, { label: `Windows 11 Enterprise Key`, price: 549 }]
        }
    ];
}
