const authWrapper = document.getElementById('auth-wrapper');
const mainApp = document.getElementById('main-app');
const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");

let currentUser = localStorage.getItem('currentUser') || null;

// Simple Router
if (authWrapper) {
    if (currentUser) {
        window.location.href = 'index.html';
    }
} else if (mainApp) {
    if (!currentUser) {
        window.location.href = 'auth.html';
    }
}


if (authWrapper) {
    signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("signupUsername").value.trim();
        const password = document.getElementById("signupPassword").value.trim();
        if (!username || !password) return alert("Please fill all fields!");
        const users = JSON.parse(localStorage.getItem("users")) || {};
        if (users[username]) return alert("Username already exists!");
        
        users[username] = { password, expenses: [] };
        localStorage.setItem("users", JSON.stringify(users));
        alert("Signup successful! Please sign in.");
        
        signupForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
        signupForm.reset();
    });

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("loginUsername").value.trim();
        const password = document.getElementById("loginPassword").value.trim();
        const users = JSON.parse(localStorage.getItem("users")) || {};
        if (!users[username] || users[username].password !== password)
            return alert("Invalid credentials!");
        
        localStorage.setItem('currentUser', username);
        window.location.href = 'index.html';
    });

    document.addEventListener("click", (e) => {
        if (e.target.id === "toLogin") {
            e.preventDefault();
            signupForm.classList.add("hidden");
            loginForm.classList.remove("hidden");
        }
        if (e.target.id === "toSignup") {
            e.preventDefault();
            loginForm.classList.add("hidden");
            signupForm.classList.remove("hidden");
        }
    });
}


if (mainApp && currentUser) {
    
    const userIdDisplay = document.getElementById('user-id-display');
    const userIdDisplayMobile = document.getElementById('user-id-display-mobile');
    if (userIdDisplay) userIdDisplay.textContent = `Logged in as: ${currentUser}`;
    if (userIdDisplayMobile) userIdDisplayMobile.textContent = `User: ${currentUser}`;

    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'auth.html';
        });
    }

    const initialAppState = {
        userId: currentUser,
        expenses: JSON.parse(localStorage.getItem('expenses') || '[]'),
        budgets: JSON.parse(localStorage.getItem('budgets') || '[]'),
        categories: ['Food', 'Travel', 'Bills', 'Groceries', 'Entertainment', 'Others'],
        chartInstance: null
    };
    window.appState = initialAppState;

    // Helpers
    function persistState() {
        localStorage.setItem('expenses', JSON.stringify(window.appState.expenses));
        localStorage.setItem('budgets', JSON.stringify(window.appState.budgets));
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
    }

    function deleteExpense(id) {
        window.appState.expenses = window.appState.expenses.filter(exp => exp.id !== id);
        persistState();
        calculateMonthlyTotalAndUpdate();
    }

    function saveBudgets(newBudgets) {
        window.appState.budgets = newBudgets;
        persistState();
        calculateMonthlyTotalAndUpdate();
    }

    function deleteBudget(category) {
        window.appState.budgets = window.appState.budgets.filter(b => b.category !== category);
        persistState();
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
        
        const updateSelects = () => {
            if (expSelect) expSelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
            if (budSelect) budSelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
            if (scanSelect) scanSelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
            
            window.appState.categories.forEach(cat => {
                if (expSelect) expSelect.add(new Option(cat, cat));
                if (budSelect) budSelect.add(new Option(cat, cat));
                if (scanSelect) scanSelect.add(new Option(cat, cat));
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
                dropZone.classList.add('hidden');
                scanningViewer.classList.remove('hidden');
                scanResultCard.classList.add('hidden');
                scanLine.classList.remove('hidden');
                ocrStatus.textContent = "Processing Optical Character Recognition...";

                try {
                    // Initialize Tesseract Worker
                    const worker = await Tesseract.createWorker('eng');
                    const { data: { text } } = await worker.recognize(imageSrc);
                    await worker.terminate();
                    
                    processOCRResult(text);
                } catch (err) {
                    console.error(err);
                    ocrStatus.textContent = "Error during scan. Ensure image is clear.";
                    scanLine.classList.add('hidden');
                }
            };

            const processOCRResult = (text) => {
                ocrStatus.textContent = "Executing Advanced Analysis...";
                
                const itemsContainer = document.getElementById('scanned-items-container');
                itemsContainer.innerHTML = ''; // Clear previous results
                
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
                const items = [];
                
                // Advanced Multiline Regex to detect [Description] ... [Amount]
                // Supports formats like: "Hamburger .... 12.50" or "Hamburger 12.50"
                const lineItemRegex = /^(.*?)\s+([0-9]{1,6}[.,][0-9]{2})\s*$/;

                lines.forEach(line => {
                    const match = line.match(lineItemRegex);
                    if (match) {
                        let desc = match[1].replace(/[._-]/g, ' ').trim();
                        let amt = parseFloat(match[2].replace(',', '.'));
                        
                        // Noise filter for common "Total" entries
                        const isTotal = /total|subtotal|tax|vat|gst|balance|due|cash|change|card/i.test(desc);
                        
                        items.push({
                            description: desc,
                            amount: amt,
                            ignored: isTotal // Auto-ignore if it looks like a total
                        });
                    }
                });

                if (items.length === 0) {
                    ocrStatus.textContent = "No distinct items found. Try a clearer photo.";
                    scanLine.classList.add('hidden');
                    return;
                }

                // Render Items
                items.forEach((item, index) => {
                    const row = document.createElement('div');
                    row.className = `scanned-item-row ${item.ignored ? 'ignored' : ''}`;
                    row.innerHTML = `
                        <input type="checkbox" class="item-checkbox" ${item.ignored ? '' : 'checked'}>
                        <input type="text" class="item-desc-input" value="${item.description}">
                        <div class="flex items-center">
                            <span class="text-xs text-emerald-500 mr-1">₹</span>
                            <input type="number" step="0.01" class="item-amt-input" value="${item.amount.toFixed(2)}">
                        </div>
                    `;
                    
                    // Toggle ignore state on checkbox click
                    const cb = row.querySelector('.item-checkbox');
                    cb.addEventListener('change', () => {
                        row.classList.toggle('ignored', !cb.checked);
                        updateScanTotal();
                    });

                    // Input listeners to update the UI
                    row.querySelectorAll('input').forEach(input => {
                        input.addEventListener('input', updateScanTotal);
                    });

                    itemsContainer.appendChild(row);
                });

                const updateScanTotal = () => {
                    let total = 0;
                    document.querySelectorAll('.scanned-item-row').forEach(row => {
                        const cb = row.querySelector('.item-checkbox');
                        const amtInput = row.querySelector('.item-amt-input');
                        if (cb.checked) {
                            total += parseFloat(amtInput.value || 0);
                        }
                    });
                    document.getElementById('scan-selected-total').textContent = `₹${total.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
                };

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
                const category = document.getElementById('scan-category').value || 'Others';
                let addedCount = 0;

                document.querySelectorAll('.scanned-item-row').forEach(row => {
                    const isChecked = row.querySelector('.item-checkbox').checked;
                    const desc = row.querySelector('.item-desc-input').value.trim();
                    const amt = parseFloat(row.querySelector('.item-amt-input').value);

                    if (isChecked && desc && !isNaN(amt)) {
                        addExpense(amt, category, desc);
                        addedCount++;
                    }
                });
                
                if (addedCount > 0) {
                    scanResultCard.classList.add('hidden');
                    dropZone.classList.remove('hidden');
                    receiptUpload.value = '';
                    alert(`Successfully added ${addedCount} items to your history!`);
                } else {
                    alert("Please select at least one item to add.");
                }
            });

        }
    }

    // Initialize Dashboard
    calculateMonthlyTotalAndUpdate();
    setupEventListeners();
}