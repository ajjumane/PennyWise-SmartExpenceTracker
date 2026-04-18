const mainApp = document.getElementById('main-app');
const heroSection = document.getElementById('hero-section');
const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const authModal = document.getElementById('auth-modal');
const toastContainer = document.getElementById('toast-container');

function showToast(message, type = 'info') {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>',
        info: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-message">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('active'), 10);
    
    // Remove after 5s
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

const API_URL = '/api';
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// UI Initialization
function initUI() {
    const loggedInControls = document.getElementById('logged-in-controls');
    const guestControls = document.getElementById('guest-controls');
    const navUserDisplay = document.getElementById('nav-user-display');
    const heroSection = document.getElementById('hero-section');

    if (currentUser) {
        if (loggedInControls) loggedInControls.classList.remove('hidden');
        if (guestControls) guestControls.classList.add('hidden');
        if (navUserDisplay) navUserDisplay.textContent = `Hi, ${currentUser.username}`;
        if (heroSection) heroSection.classList.add('hidden');
    } else {
        if (loggedInControls) loggedInControls.classList.add('hidden');
        if (guestControls) guestControls.classList.remove('hidden');
        if (heroSection) heroSection.classList.remove('hidden');
    }
}
initUI();


// Auth Logic
const openLoginBtn = document.getElementById('open-login');
const openSignupBtn = document.getElementById('open-signup');
const heroSignupBtn = document.getElementById('hero-signup');
const closeModalBtn = document.getElementById('close-modal');
const toLoginLink = document.getElementById('toLogin');
const toSignupLink = document.getElementById('toSignup');

const openModal = (view = 'login') => {
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (view === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    }
};

const closeModal = () => {
    authModal.classList.remove('active');
    document.body.style.overflow = '';
};

if (openLoginBtn) openLoginBtn.onclick = () => openModal('login');
if (openSignupBtn) openSignupBtn.onclick = () => openModal('signup');
if (heroSignupBtn) heroSignupBtn.onclick = () => openModal('signup');
if (closeModalBtn) closeModalBtn.onclick = closeModal;
if (toLoginLink) toLoginLink.onclick = (e) => { e.preventDefault(); openModal('login'); };
if (toSignupLink) toSignupLink.onclick = (e) => { e.preventDefault(); openModal('signup'); };

authModal.onclick = (e) => { if (e.target === authModal) closeModal(); };

signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("signupUsername").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();
    
    if (!username || password.length < 4) return showToast("Username and valid password (min 4 chars) required!", "error");
    
    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
        });
        
        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Signup failed');
        } else {
            console.error("Non-JSON response received:", await response.text());
            throw new Error(`Server Error (${response.status}): Database connection failed or server crashed.`);
        }

        const userId = data.userId;
        
        // Migrate guest data
        const guestExpenses = JSON.parse(sessionStorage.getItem('guest_expenses') || '[]');
        if (guestExpenses.length > 0) {
            await fetch(`${API_URL}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, expenses: guestExpenses })
            });
            sessionStorage.removeItem('guest_expenses');
        }

        showToast("Account created successfully!", "success");
        localStorage.setItem('currentUser', JSON.stringify({ userId, username }));
        setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
        showToast(err.message, "error");
    }
});

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Login failed');
        } else {
            console.error("Non-JSON response received:", await response.text());
            throw new Error(`Server Error (${response.status}): Incorrect database configuration.`);
        }
        
        showToast("Welcome back!", "success");
        localStorage.setItem('currentUser', JSON.stringify({ userId: data.userId, username: data.username }));
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        showToast(err.message, "error");
    }
});

// App Logic Initialization
if (mainApp) {
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.reload();
        });
    }

    // Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('main-nav');
        if (window.scrollY > 50) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
    });

    const initialAppState = {
        userId: currentUser ? currentUser.userId : null,
        expenses: [],
        budgets: [],
        categories: ['Food', 'Travel', 'Bills', 'Groceries', 'Entertainment', 'Others'],
        chartInstance: null
    };
    window.appState = initialAppState;

    // Fetch initial data from server if logged in
    async function fetchUserData() {
        if (currentUser) {
            try {
                const response = await fetch(`${API_URL}/data/${currentUser.userId}`);
                const data = await response.json();
                window.appState.expenses = data.expenses || [];
                window.appState.budgets = data.budgets || [];
            } catch (err) {
                console.error('Failed to fetch user data:', err);
                showToast("Failed to sync data from cloud.", "info");
            }
        } else {
            window.appState.expenses = JSON.parse(sessionStorage.getItem('guest_expenses') || '[]');
        }
        calculateMonthlyTotalAndUpdate();
    }

    // Helpers
    async function persistState(type = 'both') {
        if (currentUser) {
            const body = { userId: currentUser.userId };
            if (type === 'expenses' || type === 'both') body.expenses = window.appState.expenses;
            if (type === 'budgets' || type === 'both') body.budgets = window.appState.budgets;
            
            try {
                await fetch(`${API_URL}/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            } catch (err) {
                console.error('Persistence failed:', err);
            }
        } else {
            sessionStorage.setItem('guest_expenses', JSON.stringify(window.appState.expenses));
        }
    }

    function addExpense(amount, category, description) {
        const newExpense = {
            id: crypto.randomUUID(),
            amount: parseFloat(amount),
            category,
            description: description || 'N/A',
            date: new Date().toISOString().split('T')[0],
            createdAt: Date.now()
        };
        window.appState.expenses.push(newExpense);
        persistState();
        calculateMonthlyTotalAndUpdate();
        
        if (!currentUser && window.appState.expenses.length >= 3) {
            // Give a gentle nudge after a few entries
        }
    }

    async function deleteExpense(id) {
        window.appState.expenses = window.appState.expenses.filter(exp => exp.id !== id);
        if (currentUser) {
            fetch(`${API_URL}/expenses/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.userId, expenseId: id })
            });
        }
        persistState('expenses');
        calculateMonthlyTotalAndUpdate();
    }

    async function saveBudgets(newBudgets) {
        if (!currentUser) {
            showToast("Setting budgets is a premium feature. Please sign in!", "info");
            openModal('login');
            return;
        }
        window.appState.budgets = newBudgets;
        await persistState('budgets');
        calculateMonthlyTotalAndUpdate();
    }

    async function deleteBudget(category) {
        window.appState.budgets = window.appState.budgets.filter(b => b.category !== category);
        if (currentUser) {
            fetch(`${API_URL}/budgets/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.userId, category })
            });
        }
        persistState('budgets');
        calculateMonthlyTotalAndUpdate();
    }

    window.deleteExpense = deleteExpense;
    window.deleteBudget = deleteBudget;

    // Render Logic
    function calculateMonthlyTotal() {
        const { expenses } = window.appState;
        const today = new Date();
        const month = today.getMonth(), year = today.getFullYear();
        const total = expenses.reduce((sum, exp) => {
            const d = new Date(exp.date);
            return (d.getMonth() === month && d.getFullYear() === year) ? sum + exp.amount : sum;
        }, 0);
        const totalSpan = document.getElementById('monthly-total-spending');
        if (totalSpan) totalSpan.textContent = `₹${total.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    }

    function renderExpenses() {
        const list = document.getElementById('expense-list');
        const dateFilter = document.getElementById('filter-date')?.value || null;
        const categorySearch = document.getElementById('filter-category-search')?.value.toLowerCase() || "";
        let expenses = window.appState.expenses;
        
        if (dateFilter) expenses = expenses.filter(e => e.date === dateFilter);
        if (categorySearch) expenses = expenses.filter(e => e.category.toLowerCase().includes(categorySearch));
        
        expenses = expenses.sort((a, b) => b.createdAt - a.createdAt);
        list.innerHTML = '';
        
        if (expenses.length === 0) {
            list.innerHTML = `<div class="flex items-center justify-center h-32 bg-black/20 rounded-xl mt-4 border border-white/5"><p class="text-gray-500 text-center tracking-wide text-sm">— No transactions found —</p></div>`;
            return;
        }
        
        expenses.forEach(exp => {
            const colors = {
                'Food': 'bg-rose-500/10 text-rose-400 border-rose-500/30', 
                'Travel': 'bg-blue-500/10 text-blue-400 border-blue-500/30', 
                'Bills': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
                'Groceries': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', 
                'Entertainment': 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30', 
                'Others': 'bg-gray-500/10 text-gray-400 border-gray-500/30'
            };
            const colorClass = colors[exp.category] || 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
            
            list.innerHTML += `
            <div class="group flex justify-between items-center p-5 hover:bg-white/5 transition-all rounded-xl mt-3 border border-transparent hover:border-white/10">
                <div class="flex-1">
                    <div class="text-gray-100 font-medium tracking-wide text-lg">${exp.description}</div>
                    <span class="inline-block text-xs font-semibold px-2.5 py-1 rounded-md border mt-2 ${colorClass}">${exp.category}</span>
                    <div class="text-xs text-gray-500 mt-2 font-medium tracking-wide">${new Date(exp.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <div class="flex items-center space-x-5">
                    <span class="text-xl font-bold text-white tracking-wider">₹${parseFloat(exp.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    <button onclick="window.deleteExpense('${exp.id}')" class="text-danger/60 hover:text-danger bg-danger/10 hover:bg-danger/20 p-2.5 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>`;
        });
    }

    function renderBudgets() {
        const container = document.getElementById('budget-alerts-container');
        const banner = document.getElementById('budget-warning-banner');
        container.innerHTML = '';
        const { budgets, expenses } = window.appState;
        
        if (budgets.length === 0) {
            container.innerHTML = `<div class="flex items-center justify-center p-8 bg-black/20 rounded-xl border border-white/5 mt-4"><p class="text-gray-500 text-sm tracking-wide">No budgets set yet.</p></div>`;
            banner.classList.add('hidden');
            return;
        }
        
        const today = new Date();
        const month = today.getMonth(), year = today.getFullYear();
        const spending = expenses.reduce((acc, e) => {
            const d = new Date(e.date);
            if (d.getMonth() === month && d.getFullYear() === year)
                acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        }, {});
        
        let exceeded = false;
        budgets.forEach(b => {
            const spent = spending[b.category] || 0;
            const percent = (spent / b.limit) * 100;
            const color = percent >= 100 ? 'bg-danger' : percent >= 80 ? 'bg-warning' : 'bg-emerald-500';
            const statusColorText = percent >= 100 ? 'text-danger border-danger/30 bg-danger/10' : percent >= 80 ? 'text-warning border-warning/30 bg-warning/10' : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
            const status = percent >= 100 ? 'Exceeded' : percent >= 80 ? 'Warning' : 'Good';
            if (percent >= 100) exceeded = true;
            
            container.innerHTML += `
            <div class="p-5 bg-black/30 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-lg font-bold text-gray-100">${b.category}</h4>
                    <span class="text-xs px-3 py-1 rounded-full border font-bold tracking-wide ${statusColorText}">${status}</span>
                </div>
                <div class="text-sm text-gray-400 mb-3 font-medium tracking-wide">₹${spent.toLocaleString('en-US', {minimumFractionDigits: 2})} <span class="text-gray-600">/</span> ₹${b.limit.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                <div class="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/5 relative">
                    <div class="absolute top-0 left-0 h-full rounded-full ${color} transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor]" style="width:${Math.min(percent, 100)}%"></div>
                </div>
            </div>`;
        });
        
        banner.classList.toggle('hidden', !exceeded);
        if (exceeded) banner.textContent = "⚠️ Warning: One or more budgets exceeded!";
    }

    function renderChart() {
        const { expenses, categories, chartInstance } = window.appState;
        const today = new Date();
        const month = today.getMonth(), year = today.getFullYear();
        const spending = expenses.reduce((a, e) => {
            const d = new Date(e.date);
            if (d.getMonth() === month && d.getFullYear() === year)
                a[e.category] = (a[e.category] || 0) + e.amount;
            return a;
        }, {});
        
        const labels = categories.filter(c => spending[c]);
        const data = labels.map(c => spending[c]);
        const colors = ['#f43f5e', '#3b82f6', '#8b5cf6', '#10b981', '#d946ef', '#9ca3af'];
        
        const container = document.getElementById('chart-container');
        if (!data.length) {
            container.innerHTML = '<p class="text-gray-500 p-4 text-center text-sm tracking-wide bg-black/20 rounded-xl border border-white/5 mx-6">Add transactions to visualize your spending breakdown.</p>';
            return;
        } else {
             container.innerHTML = '<canvas id="spendingChart"></canvas>';
        }

        if (chartInstance) chartInstance.destroy();
        window.appState.chartInstance = new Chart(
            document.getElementById('spendingChart'),
            {
                type: 'doughnut',
                data: { 
                    labels, 
                    datasets: [{ 
                        data, 
                        backgroundColor: colors.slice(0, labels.length), 
                        borderColor: '#0f172a', 
                        borderWidth: 3,
                        hoverOffset: 4
                    }] 
                },
                options: {
                    plugins: {
                        legend: { 
                            position: 'bottom', 
                            labels: { 
                                color: '#e2e8f0', 
                                padding: 25, 
                                font: { family: 'Outfit', size: 13, weight: '500' },
                                usePointStyle: true,
                                pointStyle: 'circle'
                            } 
                        }
                    },
                    cutout: '75%',
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        animateScale: true,
                        animateRotate: true
                    }
                }
            }
        );
    }

    function calculateMonthlyTotalAndUpdate() {
        calculateMonthlyTotal();
        renderExpenses();
        renderBudgets();
        renderChart();
    }

    function setupEventListeners() {
        // Forms
        document.getElementById('expense-form').addEventListener('submit', e => {
            e.preventDefault();
            const amount = document.getElementById('expense-amount').value;
            const category = document.getElementById('expense-category').value;
            const desc = document.getElementById('expense-description').value;
            if (amount && category) {
                addExpense(amount, category, desc);
                e.target.reset();
                document.getElementById('expense-category').dispatchEvent(new CustomEvent('reset-ui'));
            }
        });
        
        document.getElementById('budget-form').addEventListener('submit', e => {
            e.preventDefault();
            const cat = document.getElementById('budget-category').value;
            const lim = document.getElementById('budget-limit').value;
            if (cat && lim) {
                const updated = window.appState.budgets.filter(b => b.category !== cat);
                updated.push({ category: cat, limit: parseFloat(lim) });
                saveBudgets(updated);
                e.target.reset();
                document.getElementById('budget-category').dispatchEvent(new CustomEvent('reset-ui'));
            }
        });
        
        // Filters
        document.getElementById('filter-date').addEventListener('change', renderExpenses);
        document.getElementById('clear-date-filter').addEventListener('click', () => {
            document.getElementById('filter-date').value = '';
            renderExpenses();
        });
        document.getElementById('filter-category-search').addEventListener('input', renderExpenses);
        
        // Tabs
        const tabs = document.querySelectorAll('[data-tab-button]');
        const contents = document.querySelectorAll('[data-tab-content]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab-button');
                tabs.forEach(t => {
                    t.classList.remove('bg-emerald-600', 'text-white', 'shadow-lg');
                    t.classList.add('text-gray-400', 'hover:text-white', 'bg-transparent');
                });
                contents.forEach(c => c.classList.add('hidden'));
                
                tab.classList.add('bg-emerald-600', 'text-white', 'shadow-lg');
                tab.classList.remove('text-gray-400', 'hover:text-white', 'bg-transparent');
                
                document.getElementById(target).classList.remove('hidden');
            });
        });
        
        // Populate Selects
        const expSelect = document.getElementById('expense-category');
        const budSelect = document.getElementById('budget-category');
        const scanSelect = document.getElementById('scan-category');
        
        // Category Icons Mapping (SVG)
        const categoryIcons = {
            'Food': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>',
            'Travel': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>',
            'Bills': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>',
            'Groceries': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>',
            'Entertainment': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>',
            'Others': '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>'
        };

        const initCustomDropdown = (dropdownId) => {
            const dropdown = document.getElementById(dropdownId);
            if (!dropdown) return;

            const trigger = dropdown.querySelector('.dropdown-trigger');
            const menu = dropdown.querySelector('.dropdown-menu');
            const select = dropdown.querySelector('select');
            const labelText = trigger.querySelector('.category-text');
            const labelIcon = trigger.querySelector('.category-icon-container');

            const toggleMenu = () => {
                const isOpen = menu.classList.contains('show');
                // Close all other menus first
                document.querySelectorAll('.dropdown-menu').forEach(m => {
                    if (m !== menu) m.classList.remove('show');
                });
                document.querySelectorAll('.dropdown-trigger').forEach(t => {
                    if (t !== trigger) t.classList.remove('active');
                });
                
                menu.classList.toggle('show');
                trigger.classList.toggle('active');
            };

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMenu();
            });

            // This will be called whenever the select options are updated
            dropdown.updateOptions = () => {
                menu.innerHTML = '';
                const categories = window.appState.categories;
                
                categories.forEach(cat => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item';
                    item.dataset.value = cat;
                    const iconClass = `icon-${cat.toLowerCase()}`;
                    item.innerHTML = `
                        <span class="item-icon ${iconClass}">${categoryIcons[cat] || categoryIcons['Others']}</span>
                        <span>${cat}</span>
                    `;
                    
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        select.value = cat;
                        // Trigger change event for listeners
                        select.dispatchEvent(new Event('change'));
                        
                        // Update UI
                        labelText.textContent = cat;
                        labelIcon.innerHTML = `<span class="${iconClass}">${categoryIcons[cat] || categoryIcons['Others']}</span>`;
                        
                        menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
                        item.classList.add('selected');
                        
                        toggleMenu();
                    });
                    
                    menu.appendChild(item);
                });
            };

            // Initial build
            dropdown.updateOptions();
            
            // Sync with select reset
            select.addEventListener('reset-ui', () => {
                labelText.textContent = 'Select Category';
                labelIcon.innerHTML = '';
                menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('selected'));
            });
        };

        // Initialize all three dropdowns
        initCustomDropdown('expense-category-dropdown');
        initCustomDropdown('budget-category-dropdown');
        initCustomDropdown('scan-category-dropdown');

        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
            document.querySelectorAll('.dropdown-trigger').forEach(t => t.classList.remove('active'));
        });

        const updateSelects = () => {
            const expSelect = document.getElementById('expense-category');
            const budSelect = document.getElementById('budget-category');
            const scanSelect = document.getElementById('scan-category');

            if (expSelect) {
                expSelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
            }
            if (budSelect) {
                budSelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
            }
            if (scanSelect) {
                scanSelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
            }
            
            window.appState.categories.forEach(cat => {
                if (expSelect) expSelect.add(new Option(cat, cat));
                if (budSelect) budSelect.add(new Option(cat, cat));
                if (scanSelect) scanSelect.add(new Option(cat, cat));
            });

            // Update custom dropdowns
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if (d.updateOptions) d.updateOptions();
            });
        };
        updateSelects();

        // Scanner Logic
        const dropZone = document.getElementById('drop-zone');
        const receiptUpload = document.getElementById('receipt-upload');
        const scanningViewer = document.getElementById('scanning-viewer');
        const scanResultCard = document.getElementById('scan-result-card');
        const scannedImagePreview = document.getElementById('scanned-image-preview');
        const scanLine = document.getElementById('scan-line');
        const ocrStatus = document.getElementById('ocr-status');

        if (dropZone && receiptUpload) {
            const handleFileUpload = (file) => {
                if (!file || !file.type.startsWith('image/')) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    scannedImagePreview.src = e.target.result;
                    startOCR(e.target.result);
                };
                reader.readAsDataURL(file);
            };

            const preprocessImage = (imageSrc) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        
                        // Higher contrast and slight sharpening for OCR clarity
                        ctx.filter = 'grayscale(100%) contrast(160%) brightness(105%)';
                        ctx.drawImage(img, 0, 0);
                        
                        resolve(canvas.toDataURL('image/jpeg', 0.8));
                    };
                    img.src = imageSrc;
                });
            };

            dropZone.addEventListener('click', () => receiptUpload.click());
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                handleFileUpload(e.dataTransfer.files[0]);
            });
            receiptUpload.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));

            const startOCR = async (imageSrc) => {
                if (!currentUser) {
                    showToast("AI Receipt Scanning is a premium feature. Please sign up!", "info");
                    openModal('signup');
                    return;
                }
                dropZone.classList.add('hidden');
                scanningViewer.classList.remove('hidden');
                scanResultCard.classList.add('hidden');
                scanLine.classList.remove('hidden');
                ocrStatus.textContent = "Enhancing Image Quality...";

                try {
                    const processedSrc = await preprocessImage(imageSrc);
                    scannedImagePreview.src = processedSrc;
                    
                    ocrStatus.textContent = "Extracting Text Data...";
                    
                    const worker = await Tesseract.createWorker('eng');
                    const { data: { text } } = await worker.recognize(processedSrc);
                    await worker.terminate();
                    
                    processOCRResult(text);
                } catch (err) {
                    console.error('OCR Error:', err);
                    ocrStatus.textContent = "Scan Failed. Error: " + (err.message || "Unknown error");
                    scanLine.classList.add('hidden');
                }
            };

            const guessCategory = (text) => {
                const lower = text.toLowerCase();
                const mapping = {
                    'Food': ['burger', 'pizza', 'meal', 'lunch', 'dinner', 'cafe', 'coffee', 'tea', 'drink', 'snack', 'restaurant', 'dine', 'food', 'kfc', 'mcdonald', 'starbucks', 'subway'],
                    'Groceries': ['milk', 'bread', 'egg', 'rice', 'apple', 'fruit', 'vegetable', 'soap', 'shampoo', 'mart', 'grocery', 'bazaar', 'supermarket', 'shop', 'salt', 'sugar', 'detergent', 'kg', 'ltr'],
                    'Travel': ['fuel', 'petrol', 'diesel', 'oil', 'uber', 'taxi', 'cab', 'train', 'flight', 'air', 'bus', 'rail', 'parking', 'hotel', 'stay'],
                    'Bills': ['bill', 'electricity', 'water', 'internet', 'wifi', 'phone', 'mobile', 'rent', 'insurance', 'gas', 'subscription'],
                    'Entertainment': ['movie', 'cinema', 'game', 'concert', 'ticket', 'club', 'fun', 'netflix', 'prime', 'spotify', 'gym', 'shirt', 'cotton', 'wear', 'cloth']
                };
                
                for (const [cat, keywords] of Object.entries(mapping)) {
                    if (keywords.some(k => lower.includes(k))) return cat;
                }
                return 'Others';
            };

            const processOCRResult = (text) => {
                ocrStatus.textContent = "Analyzing Line Items...";
                console.log("Raw OCR Text:", text); // Helpful for developer debug
                
                const itemsContainer = document.getElementById('scanned-items-container');
                itemsContainer.innerHTML = ''; 
                
                const updateScanTotal = () => {
                    let total = 0;
                    document.querySelectorAll('.scanned-item-row').forEach(row => {
                        const cb = row.querySelector('.item-checkbox');
                        const amtInput = row.querySelector('.item-amt-input');
                        if (cb.checked) {
                            total += parseFloat(amtInput.value || 0);
                        }
                    });
                    const totalEl = document.getElementById('scan-selected-total');
                    if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
                };

                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
                const items = [];
                
                // Structural Detection Flags
                let isInItemBlock = false;
                
                // Keywords that definitely indicate non-item lines
                const noisyKeywords = ['phone', 'bill no', 'date:', 'time:', 'id:', 'txn', 'transaction', 'method', 'visit', 'thank', 'mart', 'maharashtra', 'pune'];
                const itemBlockStarts = ['purchased', 'qty', 'description', 'items:'];
                const itemBlockEnds = ['subtotal', 'total', 'gst', 'tax', 'vat', 'discount', 'payment', 'method', 'due'];

                const priceRegex = /(?:[\$₹£€]\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+[.,]\d{1,2}|\d{2,6})/g;

                lines.forEach(line => {
                    const lower = line.toLowerCase();
                    
                    // 1. Check for block transitions
                    if (itemBlockStarts.some(k => lower.includes(k))) {
                        isInItemBlock = true;
                        return; // Skip the "Items Purchased" header itself
                    }
                    if (itemBlockEnds.some(k => lower.includes(k))) {
                        // We reached the footer. We'll still process this line 
                        // (to catch Total/GST), but mark as ignored/unchecked.
                        isInItemBlock = false;
                    }

                    // 2. Strict Filter for random noise (Phone numbers, IDs)
                    if (noisyKeywords.some(k => lower.includes(k))) return;

                    // 3. Extract price and description
                    const cleanedLine = line.replace(/[.]{2,}/g, ' ').trim();
                    const matches = [...cleanedLine.matchAll(priceRegex)];
                    
                    if (matches.length > 0) {
                        const lastMatch = matches[matches.length - 1];
                        const priceStr = lastMatch[1].replace(/\s+/g, '').replace(',', '.');
                        const amount = parseFloat(priceStr);
                        
                        let description = cleanedLine.substring(0, lastMatch.index).trim();
                        
                        // Refined cleaning for description
                        description = description.replace(/^\d+[\s.)-]*\s*/, ''); // Remove "1. ", "2) " etc.
                        description = description.replace(/[₹$€£*:.=_-]/g, ' ').trim(); // Remove symbols
                        description = description.replace(/\s+/g, ' '); // Collapse spaces
                        
                        if (description.length < 2 || isNaN(amount) || amount < 0.5) return;
                        
                        // Decision Logic: Is this a valid item?
                        // If we are in the item block, we trust it. 
                        // If we found "Total", "GST" etc, we add it but mark as ignored.
                        const isFooterLine = itemBlockEnds.some(k => lower.includes(k));
                        const isIgnored = isFooterLine || !isInItemBlock;

                        items.push({
                            description: description,
                            amount: amount,
                            ignored: isIgnored,
                            category: guessCategory(description)
                        });
                    }
                });

                if (items.length === 0) {
                    ocrStatus.textContent = "Extraction failed. Try a clearer photo or focus on the items.";
                    scanLine.classList.add('hidden');
                    return;
                }

                const renderItemRow = (item) => {
                    const row = document.createElement('div');
                    row.className = `scanned-item-row ${item.ignored ? 'ignored' : ''}`;
                    
                    const catOptions = window.appState.categories.map(c => 
                        `<option value="${c}" ${c === item.category ? 'selected' : ''}>${c}</option>`
                    ).join('');

                    row.innerHTML = `
                        <input type="checkbox" class="item-checkbox" ${item.ignored ? '' : 'checked'}>
                        <div class="flex-grow min-w-0">
                            <input type="text" class="item-desc-input w-full" placeholder="Item Name" value="${item.description}">
                            <select class="item-category-select text-[10px] bg-white/5 border-none text-emerald-400 p-0 h-4 outline-none cursor-pointer">
                                ${catOptions}
                            </select>
                        </div>
                        <div class="flex items-center shrink-0">
                            <span class="text-xs text-emerald-500 mr-1">₹</span>
                            <input type="number" step="0.01" class="item-amt-input" placeholder="0.00" value="${item.amount > 0 ? item.amount.toFixed(2) : ''}">
                        </div>
                    `;
                    
                    const cb = row.querySelector('.item-checkbox');
                    cb.addEventListener('change', () => {
                        row.classList.toggle('ignored', !cb.checked);
                        updateScanTotal();
                    });

                    row.querySelectorAll('input').forEach(input => {
                        input.addEventListener('input', updateScanTotal);
                    });

                    itemsContainer.appendChild(row);
                };

                // Render Identified Items
                items.forEach(renderItemRow);

                // Handle Manual Item Addition
                const addManualBtn = document.getElementById('add-manual-item');
                // Remove existing listeners to avoid multiple attachments on re-scans
                const newAddBtn = addManualBtn.cloneNode(true);
                addManualBtn.parentNode.replaceChild(newAddBtn, addManualBtn);
                
                newAddBtn.addEventListener('click', () => {
                    renderItemRow({
                        description: '',
                        amount: 0,
                        ignored: false,
                        category: 'Others'
                    });
                    // Scroll to bottom
                    itemsContainer.scrollTop = itemsContainer.scrollHeight;
                });

                updateScanTotal();
                scanningViewer.classList.add('hidden');
                scanLine.classList.add('hidden');
                scanResultCard.classList.remove('hidden');
            };

            document.getElementById('cancel-scan').addEventListener('click', () => {
                scanResultCard.classList.add('hidden');
                dropZone.classList.remove('hidden');
                receiptUpload.value = '';
            });

            document.getElementById('confirm-scan').addEventListener('click', () => {
                let addedCount = 0;

                document.querySelectorAll('.scanned-item-row').forEach(row => {
                    const isChecked = row.querySelector('.item-checkbox').checked;
                    const desc = row.querySelector('.item-desc-input').value.trim();
                    const amt = parseFloat(row.querySelector('.item-amt-input').value);
                    const category = row.querySelector('.item-category-select').value;

                    if (isChecked && desc && !isNaN(amt)) {
                        addExpense(amt, category, desc);
                        addedCount++;
                    }
                });
                
                if (addedCount > 0) {
                    scanResultCard.classList.add('hidden');
                    dropZone.classList.remove('hidden');
                    receiptUpload.value = '';
                    showToast(`Successfully added ${addedCount} items!`, "success");
                } else {
                    showToast("Please select at least one item.", "error");
                }
            });

        }
    }

    // Initialize Dashboard
    fetchUserData();
    setupEventListeners();
}

/* PWA Support & Install Logic */
let deferredPrompt;
const pwaBanner = document.getElementById('pwa-install-banner');
const installBtn = document.getElementById('install-pwa-button');
const closeBtn = document.getElementById('close-pwa-banner');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (window.innerWidth < 768) {
        setTimeout(() => {
            if (pwaBanner) pwaBanner.classList.add('show');
        }, 3000);
    }
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            if (pwaBanner) pwaBanner.classList.remove('show');
        }
        deferredPrompt = null;
    });
}

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        if (pwaBanner) pwaBanner.classList.remove('show');
    });
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Error:', err));
    });
}