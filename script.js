document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Check if Firebase is initialized
    if (!firebase.apps.length) {
        console.error('Firebase not initialized');
        return;
    }
    
    // Initialize the app
    initializeApp();
    
    // Setup event listeners
    setupEventListeners();
});

// Helper function to safely get element
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
        return null;
    }
    return element;
}

// Global variables
let users = [];
let bankAccounts = [];
let cashAccounts = [];
let transactions = [];
let incomeItems = [];
let expenseItems = [];
let incomeCategories = [
    { id: 1, name: 'راتب المختبرات', color: '#0d6efd', description: 'دخل من العمل في المختبرات' },
    { id: 2, name: 'راتب التدريس', color: '#198754', description: 'دخل من العمل التدريسي' },
    { id: 3, name: 'عمل حر', color: '#ffc107', description: 'دخل من المشاريع الحرة' },
    { id: 4, name: 'استشارات', color: '#17a2b8', description: 'دخل من تقديم الاستشارات' },
    { id: 5, name: 'دخل استثماري', color: '#6f42c1', description: 'دخل من الاستثمارات' },
    { id: 6, name: 'هدايا', color: '#e83e8c', description: 'هدايا ومساعدات' },
    { id: 7, name: 'أخرى', color: '#6c757d', description: 'مصادر دخل أخرى' }
];
let expenseCategories = [
    { id: 1, name: 'إيجار', color: '#dc3545', description: 'إيجار المنزل أو العمل' },
    { id: 2, name: 'مشتريات منزل', color: '#fd7e14', description: 'مشتريات احتياجات المنزل' },
    { id: 3, name: 'فواتير', color: '#20c997', description: 'فواتير الخدمات' },
    { id: 4, name: 'طعام', color: '#6610f2', description: 'مصاريف الطعام والشراب' },
    { id: 5, name: 'مواصلات', color: '#e83e8c', description: 'مصاريف المواصلات' },
    { id: 6, name: 'صحة', color: '#20c997', description: 'مصاريف الرعاية الصحية' },
    { id: 7, name: 'تعليم', color: '#17a2b8', description: 'مصاريف التعليم' },
    { id: 8, name: 'زواج', color: '#fd7e14', description: 'مصاريف الزواج' },
    { id: 9, name: 'بناء', color: '#6f42c1', description: 'مصاريف البناء والتعمير' },
    { id: 10, name: 'مناسبات', color: '#e83e8c', description: 'مصاريف المناسبات والاحتفالات' },
    { id: 11, name: 'أخرى', color: '#6c757d', description: 'مصاريف أخرى' }
];
let debtCustomers = [];
let debtTransactions = [];
let currentUser = null;

// Initialize the app
function initializeApp() {
    console.log('Initializing app...');
    
    // Check login status
    checkLoginStatus();
    
    // Setup real-time updates
    setupRealTimeUpdates();
    
    // Check internet connection
    checkInternetConnection();
}

// Check if user is already logged in
function checkLoginStatus() {
    // Check Firebase Auth state
    firebase.auth().onAuthStateChanged(async function(user) {
        if (user) {
            // User is signed in
            console.log('User is signed in:', user.uid);
            
            // Get user data from Firestore
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                const userData = userDoc.exists ? userDoc.data() : { role: 'user' };
                
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    role: userData.role || 'user'
                };
                
                // Update UI with user info
                const currentUserElement = document.getElementById('currentUser');
                if (currentUserElement) currentUserElement.textContent = currentUser.displayName || currentUser.email;
                
                // Update user role badge
                const userRoleElement = document.getElementById('userRole');
                if (userRoleElement) {
                    userRoleElement.textContent = currentUser.role === 'admin' ? 'مدير' : 'مستخدم';
                    userRoleElement.className = 'user-badge badge-' + currentUser.role;
                }
                
                // Show/hide admin-only features
                document.querySelectorAll('.admin-only').forEach(element => {
                    if (currentUser.role === 'admin') {
                        element.style.display = 'block';
                    } else {
                        element.style.display = 'none';
                    }
                });
                
                // Show main app, hide login and signup pages
                const loginPage = document.getElementById('login-page');
                const signupPage = document.getElementById('signup-page');
                const mainApp = document.getElementById('main-app');
                
                if (loginPage) loginPage.classList.add('d-none');
                if (signupPage) signupPage.classList.add('d-none');
                if (mainApp) mainApp.classList.remove('d-none');
                
                // Initialize app after login
                refreshUI();
            } catch (error) {
                console.error('Error getting user data:', error);
            }
        } else {
            // User is signed out
            console.log('User is signed out');
            currentUser = null;
            
            // Show login page
            const loginPage = document.getElementById('login-page');
            const signupPage = document.getElementById('signup-page');
            const mainApp = document.getElementById('main-app');
            
            if (loginPage) loginPage.classList.remove('d-none');
            if (signupPage) signupPage.classList.add('d-none');
            if (mainApp) mainApp.classList.add('d-none');
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Initialize date inputs with today's date
    const today = new Date().toISOString().split('T')[0];
    
    const transactionDate = document.getElementById('transactionDate');
    const incomeDate = document.getElementById('incomeDate');
    const expenseDate = document.getElementById('expenseDate');
    
    if (transactionDate) transactionDate.value = today;
    if (incomeDate) incomeDate.value = today;
    if (expenseDate) expenseDate.value = today;
    
    // Account Type Selection
    const accountType = document.getElementById('accountType');
    if (accountType) {
        accountType.addEventListener('change', function() {
            const bankFields = document.getElementById('bankFields');
            const cashFields = document.getElementById('cashFields');
            
            // Hide all fields
            if (bankFields) bankFields.classList.add('d-none');
            if (cashFields) cashFields.classList.add('d-none');
            
            // Show relevant fields based on account type
            if (this.value === 'bank' && bankFields) {
                bankFields.classList.remove('d-none');
            } else if (this.value === 'cash' && cashFields) {
                cashFields.classList.remove('d-none');
            }
        });
    }
    
    // Cash Location Selection
    const cashLocation = document.getElementById('cashLocation');
    if (cashLocation) {
        cashLocation.addEventListener('change', function() {
            const otherLocationField = document.getElementById('otherLocationField');
            
            if (this.value === 'آخر' && otherLocationField) {
                otherLocationField.classList.remove('d-none');
            } else if (otherLocationField) {
                otherLocationField.classList.add('d-none');
            }
        });
    }
    
    // Edit Cash Location Selection
    const editCashLocation = document.getElementById('editCashLocation');
    if (editCashLocation) {
        editCashLocation.addEventListener('change', function() {
            const editOtherLocationField = document.getElementById('editOtherLocationField');
            
            if (this.value === 'other' && editOtherLocationField) {
                editOtherLocationField.classList.remove('d-none');
            } else if (editOtherLocationField) {
                editOtherLocationField.classList.add('d-none');
            }
        });
    }
    
    // Transaction Type Selection
    const transactionType = document.getElementById('transactionType');
    if (transactionType) {
        transactionType.addEventListener('change', function() {
            const fromAccountField = document.getElementById('fromAccountField');
            const toAccountField = document.getElementById('toAccountField');
            const categoryField = document.getElementById('categoryField');
            
            if (this.value === 'transfer') {
                if (fromAccountField) fromAccountField.classList.remove('d-none');
                if (toAccountField) toAccountField.classList.remove('d-none');
                if (categoryField) categoryField.classList.add('d-none');
            } else if (this.value === 'income' || this.value === 'expense') {
                if (fromAccountField) fromAccountField.classList.remove('d-none');
                if (toAccountField) toAccountField.classList.add('d-none');
                if (categoryField) categoryField.classList.remove('d-none');
            } else {
                if (fromAccountField) fromAccountField.classList.add('d-none');
                if (toAccountField) toAccountField.classList.add('d-none');
                if (categoryField) categoryField.classList.add('d-none');
            }
        });
    }
    
    // User Role Selection
    const newUserRole = document.getElementById('newUserRole');
    if (newUserRole) {
        newUserRole.addEventListener('change', function() {
            const permView = document.getElementById('permView');
            const permAdd = document.getElementById('permAdd');
            const permEdit = document.getElementById('permEdit');
            const permDelete = document.getElementById('permDelete');
            const permReports = document.getElementById('permReports');
            const permUsers = document.getElementById('permUsers');
            
            // Reset all permissions
            if (permView) permView.checked = false;
            if (permAdd) permAdd.checked = false;
            if (permEdit) permEdit.checked = false;
            if (permDelete) permDelete.checked = false;
            if (permReports) permReports.checked = false;
            if (permUsers) permUsers.checked = false;
            
            // Set permissions based on role
            if (this.value === 'admin') {
                if (permView) permView.checked = true;
                if (permAdd) permAdd.checked = true;
                if (permEdit) permEdit.checked = true;
                if (permDelete) permDelete.checked = true;
                if (permReports) permReports.checked = true;
                if (permUsers) permUsers.checked = true;
            } else if (this.value === 'user') {
                if (permView) permView.checked = true;
                if (permAdd) permAdd.checked = true;
                if (permEdit) permEdit.checked = true;
            } else if (this.value === 'viewer') {
                if (permView) permView.checked = true;
            }
        });
    }
    
    // Add Account Button
    const addAccountBtn = document.getElementById('addAccountBtn');
    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', function() {
            const addAccountModal = new bootstrap.Modal(document.getElementById('addAccountModal'));
            addAccountModal.show();
        });
    }
    
    // Save Account Button
    const saveAccountBtn = document.getElementById('saveAccountBtn');
    if (saveAccountBtn) {
        saveAccountBtn.addEventListener('click', async function() {
            console.log('Save account button clicked');
            
            const accountType = document.getElementById('accountType').value;
            console.log('Account type:', accountType);
            
            if (accountType === 'bank') {
                const bankName = document.getElementById('bankName').value;
                const bankAccountType = document.getElementById('bankAccountType').value;
                const accountNumber = document.getElementById('accountNumber').value;
                const openingBalanceYER = parseFloat(document.getElementById('openingBalanceYER').value) || 0;
                const openingBalanceSAR = parseFloat(document.getElementById('openingBalanceSAR').value) || 0;
                const notes = document.getElementById('accountNotes').value;
                
                console.log('Bank account data:', {
                    bankName, bankAccountType, accountNumber, openingBalanceYER, openingBalanceSAR, notes
                });
                
                if (!bankName || !bankAccountType || !accountNumber) {
                    showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
                    return;
                }
                
                showConfirmation('هل أنت متأكد من إضافة هذا الحساب البنكي؟', async function() {
                    // Add new bank account to Firebase
                    try {
                        const docRef = await db.collection('bankAccounts').add({
                            name: bankName,
                            type: bankAccountType,
                            number: accountNumber,
                            balanceYER: openingBalanceYER,
                            balanceSAR: openingBalanceSAR,
                            notes: notes,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        console.log('Bank account added with ID: ', docRef.id);
                        
                        // Close modal
                        const addAccountModal = bootstrap.Modal.getInstance(document.getElementById('addAccountModal'));
                        if (addAccountModal) addAccountModal.hide();
                        
                        // Reset form
                        document.getElementById('accountType').value = 'اختر نوع الحساب';
                        document.getElementById('bankFields').classList.add('d-none');
                        document.getElementById('cashFields').classList.add('d-none');
                        document.getElementById('bankName').value = '';
                        document.getElementById('bankAccountType').value = 'اختر نوع الحساب';
                        document.getElementById('accountNumber').value = '';
                        document.getElementById('openingBalanceYER').value = '0';
                        document.getElementById('openingBalanceSAR').value = '0';
                        document.getElementById('accountNotes').value = '';
                        
                        // Update UI
                        await loadBankAccountsFromFirebase();
                        renderBankAccountsTable();
                        updateAccountSelects();
                        updateDashboard();
                        
                        showToast('تم إضافة الحساب البنكي بنجاح');
                    } catch (error) {
                        console.error('Error adding bank account: ', error);
                        showToast('فشل إضافة الحساب البنكي: ' + error.message, 'error');
                    }
                });
            } else if (accountType === 'cash') {
                const cashLocation = document.getElementById('cashLocation').value;
                const otherLocation = document.getElementById('otherLocation').value;
                const openingBalanceYER = parseFloat(document.getElementById('openingBalanceYER').value) || 0;
                const openingBalanceSAR = parseFloat(document.getElementById('openingBalanceSAR').value) || 0;
                const notes = document.getElementById('accountNotes').value;
                
                console.log('Cash account data:', {
                    cashLocation, otherLocation, openingBalanceYER, openingBalanceSAR, notes
                });
                
                if (!cashLocation) {
                    showToast('يرجى اختيار مكان حفظ النقود', 'error');
                    return;
                }
                
                if (cashLocation === 'آخر' && !otherLocation) {
                    showToast('يرجى تحديد المكان', 'error');
                    return;
                }
                
                let locationText = '';
                if (cashLocation === 'لدي') locationText = 'نقدي (لدي)';
                else if (cashLocation === 'لدى أمي') locationText = 'نقدي (لدى أمي)';
                else if (cashLocation === 'لدى زوجتي') locationText = 'نقدي (لدى زوجتي)';
                else locationText = `نقدي (${otherLocation})`;
                
                showConfirmation(`هل أنت متأكد من إضافة حساب "${locationText}"؟`, async function() {
                    // Add new cash account to Firebase
                    try {
                        const docRef = await db.collection('cashAccounts').add({
                            location: cashLocation === 'لدي' ? 'me' : 
                                    cashLocation === 'لدى أمي' ? 'mom' : 
                                    cashLocation === 'لدى زوجتي' ? 'wife' : 'other',
                            otherLocation: otherLocation,
                            balanceYER: openingBalanceYER,
                            balanceSAR: openingBalanceSAR,
                            notes: notes,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        console.log('Cash account added with ID: ', docRef.id);
                        
                        // Close modal
                        const addAccountModal = bootstrap.Modal.getInstance(document.getElementById('addAccountModal'));
                        if (addAccountModal) addAccountModal.hide();
                        
                        // Reset form
                        document.getElementById('accountType').value = 'اختر نوع الحساب';
                        document.getElementById('bankFields').classList.add('d-none');
                        document.getElementById('cashFields').classList.add('d-none');
                        document.getElementById('openingBalanceYER').value = '0';
                        document.getElementById('openingBalanceSAR').value = '0';
                        document.getElementById('accountNotes').value = '';
                        
                        // Update UI
                        await loadCashAccountsFromFirebase();
                        renderCashAccountsTable();
                        updateAccountSelects();
                        updateDashboard();
                        
                        showToast('تم إضافة الحساب النقدي بنجاح');
                    } catch (error) {
                        console.error('Error adding cash account: ', error);
                        showToast('فشل إضافة الحساب النقدي: ' + error.message, 'error');
                    }
                });
            } else {
                showToast('يرجى اختيار نوع الحساب', 'error');
                return;
            }
        });
    }
    
    // Update Account Button
    const updateAccountBtn = document.getElementById('updateAccountBtn');
    if (updateAccountBtn) {
        updateAccountBtn.addEventListener('click', async function() {
            const accountId = document.getElementById('editAccountId').value;
            const accountType = document.getElementById('editAccountType').value;
            
            if (accountType === 'bank') {
                const bankName = document.getElementById('editBankName').value;
                const bankAccountType = document.getElementById('editBankAccountType').value;
                const accountNumber = document.getElementById('editAccountNumber').value;
                const balanceYER = parseFloat(document.getElementById('editAccountBalanceYER').value) || 0;
                const balanceSAR = parseFloat(document.getElementById('editAccountBalanceSAR').value) || 0;
                const notes = document.getElementById('editAccountNotes').value;
                
                if (!bankName || !bankAccountType || !accountNumber) {
                    showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
                    return;
                }
                
                showConfirmation('هل أنت متأكد من تحديث هذا الحساب البنكي؟', async function() {
                    try {
                        // Update bank account in Firebase
                        await db.collection('bankAccounts').doc(accountId).update({
                            name: bankName,
                            type: bankAccountType,
                            number: accountNumber,
                            balanceYER: balanceYER,
                            balanceSAR: balanceSAR,
                            notes: notes,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        // Close modal
                        const editAccountModal = bootstrap.Modal.getInstance(document.getElementById('editAccountModal'));
                        if (editAccountModal) editAccountModal.hide();
                        
                        // Update UI
                        await loadBankAccountsFromFirebase();
                        renderBankAccountsTable();
                        updateAccountSelects();
                        updateDashboard();
                        
                        showToast('تم تحديث الحساب البنكي بنجاح');
                    } catch (error) {
                        console.error('Error updating bank account: ', error);
                        showToast('فشل تحديث الحساب البنكي: ' + error.message, 'error');
                    }
                });
            } else if (accountType === 'cash') {
                const cashLocation = document.getElementById('editCashLocation').value;
                const otherLocation = document.getElementById('editOtherLocation').value;
                const balanceYER = parseFloat(document.getElementById('editAccountBalanceYER').value) || 0;
                const balanceSAR = parseFloat(document.getElementById('editAccountBalanceSAR').value) || 0;
                const notes = document.getElementById('editAccountNotes').value;
                
                if (!cashLocation) {
                    showToast('يرجى اختيار مكان حفظ النقود', 'error');
                    return;
                }
                
                if (cashLocation === 'other' && !otherLocation) {
                    showToast('يرجى تحديد المكان', 'error');
                    return;
                }
                
                let locationText = '';
                if (cashLocation === 'me') locationText = 'نقدي (لدي)';
                else if (cashLocation === 'mom') locationText = 'نقدي (لدى أمي)';
                else if (cashLocation === 'wife') locationText = 'نقدي (لدى زوجتي)';
                else locationText = `نقدي (${otherLocation})`;
                
                showConfirmation(`هل أنت متأكد من تحديث حساب "${locationText}"؟`, async function() {
                    try {
                        // Update cash account in Firebase
                        await db.collection('cashAccounts').doc(accountId).update({
                            location: cashLocation,
                            otherLocation: otherLocation,
                            balanceYER: balanceYER,
                            balanceSAR: balanceSAR,
                            notes: notes,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        // Close modal
                        const editAccountModal = bootstrap.Modal.getInstance(document.getElementById('editAccountModal'));
                        if (editAccountModal) editAccountModal.hide();
                        
                        // Update UI
                        await loadCashAccountsFromFirebase();
                        renderCashAccountsTable();
                        updateAccountSelects();
                        updateDashboard();
                        
                        showToast('تم تحديث الحساب النقدي بنجاح');
                    } catch (error) {
                        console.error('Error updating cash account: ', error);
                        showToast('فشل تحديث الحساب النقدي: ' + error.message, 'error');
                    }
                });
            }
        });
    }
    
    // Add Transaction Button
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    if (addTransactionBtn) {
        addTransactionBtn.addEventListener('click', function() {
            const addTransactionModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
            addTransactionModal.show();
        });
    }
    
    // Save Transaction Button
    const saveTransactionBtn = document.getElementById('saveTransactionBtn');
    if (saveTransactionBtn) {
        saveTransactionBtn.addEventListener('click', async function() {
            const transactionType = document.getElementById('transactionType').value;
            const description = document.getElementById('transactionDescription').value;
            const date = document.getElementById('transactionDate').value;
            const currency = document.getElementById('transactionCurrency').value;
            const amount = parseFloat(document.getElementById('transactionAmount').value);
            const notes = document.getElementById('transactionNotes').value;
            
            if (!transactionType || !description || !date || !amount) {
                showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
                return;
            }
            
            if (transactionType === 'transfer') {
                const fromAccount = document.getElementById('fromAccount').value;
                const toAccount = document.getElementById('toAccount').value;
                
                if (!fromAccount || !toAccount) {
                    showToast('يرجى اختيار الحسابين', 'error');
                    return;
                }
                
                if (fromAccount === toAccount) {
                    showToast('لا يمكن التحويل إلى نفس الحساب', 'error');
                    return;
                }
                
                showConfirmation('هل أنت متأكد من إضافة هذا التحويل؟', async function() {
                    try {
                        // Add new transaction to Firebase
                        const docRef = await db.collection('transactions').add({
                            type: 'transfer',
                            description: description,
                            date: date,
                            currency: currency,
                            amount: amount,
                            fromAccount: fromAccount,
                            toAccount: toAccount,
                            notes: notes,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        console.log('Transfer transaction added with ID: ', docRef.id);
                        
                        // Update account balances
                        await updateAccountBalanceInFirebase(fromAccount, currency, amount, false);
                        await updateAccountBalanceInFirebase(toAccount, currency, amount, true);
                        
                        // Close modal
                        const addTransactionModal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
                        if (addTransactionModal) addTransactionModal.hide();
                        
                        // Reset form
                        document.getElementById('transactionType').value = 'اختر نوع المعاملة';
                        document.getElementById('transactionDescription').value = '';
                        document.getElementById('transactionAmount').value = '';
                        document.getElementById('fromAccountField').classList.add('d-none');
                        document.getElementById('toAccountField').classList.add('d-none');
                        document.getElementById('categoryField').classList.add('d-none');
                        
                        // Update UI
                        await loadTransactionsFromFirebase();
                        renderTransactionsList();
                        updateDashboard();
                        
                        showToast('تم إضافة التحويل بنجاح');
                    } catch (error) {
                        console.error('Error adding transfer transaction: ', error);
                        showToast('فشل إضافة التحويل: ' + error.message, 'error');
                    }
                });
            } else {
                const account = document.getElementById('fromAccount').value;
                const categorySelect = document.getElementById('transactionCategory');
                const category = categorySelect.value;
                
                if (!account || !category) {
                    showToast('يرجى اختيار الحساب والفئة', 'error');
                    return;
                }
                
                // Get the category name
                let categoryName = '';
                if (transactionType === 'income') {
                    const categoryObj = incomeCategories.find(c => c.id == category);
                    if (categoryObj) {
                        categoryName = categoryObj.name;
                    }
                } else {
                    const categoryObj = expenseCategories.find(c => c.id == category);
                    if (categoryObj) {
                        categoryName = categoryObj.name;
                    }
                }
                
                showConfirmation(`هل أنت متأكد من إضافة هذا ${transactionType === 'income' ? 'الإيراد' : 'المصروف'}؟`, async function() {
                    try {
                        // Add new transaction to Firebase
                        const docRef = await db.collection('transactions').add({
                            type: transactionType,
                            description: description,
                            date: date,
                            currency: currency,
                            amount: amount,
                            account: account,
                            category: category,
                            categoryName: categoryName,
                            notes: notes,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        console.log('Transaction added with ID: ', docRef.id);
                        
                        // Update account balance
                        await updateAccountBalanceInFirebase(account, currency, amount, transactionType === 'income');
                        
                        // Close modal
                        const addTransactionModal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
                        if (addTransactionModal) addTransactionModal.hide();
                        
                        // Reset form
                        document.getElementById('transactionType').value = 'اختر نوع المعاملة';
                        document.getElementById('transactionDescription').value = '';
                        document.getElementById('transactionAmount').value = '';
                        document.getElementById('fromAccountField').classList.add('d-none');
                        document.getElementById('toAccountField').classList.add('d-none');
                        document.getElementById('categoryField').classList.add('d-none');
                        
                        // Update UI
                        await loadTransactionsFromFirebase();
                        renderTransactionsList();
                        updateDashboard();
                        
                        showToast(`تم إضافة ${transactionType === 'income' ? 'الإيراد' : 'المصروف'} بنجاح`);
                    } catch (error) {
                        console.error(`Error adding ${transactionType} transaction: `, error);
                        showToast(`فشل إضافة ${transactionType === 'income' ? 'الإيراد' : 'المصروف'}: ` + error.message, 'error');
                    }
                });
            }
        });
    }
    
    // Add Income Button
    const addIncomeBtn = document.getElementById('addIncomeBtn');
    if (addIncomeBtn) {
        addIncomeBtn.addEventListener('click', function() {
            const addIncomeModal = new bootstrap.Modal(document.getElementById('addIncomeModal'));
            addIncomeModal.show();
        });
    }
    
    // Save Income Button
    const saveIncomeBtn = document.getElementById('saveIncomeBtn');
    if (saveIncomeBtn) {
        saveIncomeBtn.addEventListener('click', async function() {
            const source = document.getElementById('incomeSource').value;
            const description = document.getElementById('incomeDescription').value;
            const date = document.getElementById('incomeDate').value;
            const currency = document.getElementById('incomeCurrency').value;
            const amount = parseFloat(document.getElementById('incomeAmount').value);
            const account = document.getElementById('incomeAccount').value;
            const notes = document.getElementById('incomeNotes').value;
            
            if (!source || !description || !date || !amount || !account) {
                showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
                return;
            }
            
            // Get the category name
            let categoryName = '';
            const categoryObj = incomeCategories.find(c => c.id == source);
            if (categoryObj) {
                categoryName = categoryObj.name;
            }
            
            showConfirmation('هل أنت متأكد من إضافة هذا الإيراد؟', async function() {
                try {
                    // Add new income to Firebase
                    const incomeRef = await db.collection('incomeItems').add({
                        source: source,
                        description: description,
                        date: date,
                        currency: currency,
                        amount: amount,
                        account: account,
                        categoryName: categoryName,
                        notes: notes,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('Income added with ID: ', incomeRef.id);
                    
                    // Create corresponding transaction
                    await db.collection('transactions').add({
                        type: 'income',
                        description: description,
                        date: date,
                        currency: currency,
                        amount: amount,
                        account: account,
                        category: source,
                        categoryName: categoryName,
                        notes: notes,
                        incomeId: incomeRef.id,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Update account balance
                    await updateAccountBalanceInFirebase(account, currency, amount, true);
                    
                    // Close modal
                    const addIncomeModal = bootstrap.Modal.getInstance(document.getElementById('addIncomeModal'));
                    if (addIncomeModal) addIncomeModal.hide();
                    
                    // Reset form
                    document.getElementById('incomeSource').value = 'اختر مصدر الإيراد';
                    document.getElementById('incomeDescription').value = '';
                    document.getElementById('incomeAmount').value = '';
                    document.getElementById('incomeAccount').value = 'اختر الحساب';
                    
                    // Update UI
                    await loadIncomeItemsFromFirebase();
                    await loadTransactionsFromFirebase();
                    renderIncomeList();
                    renderTransactionsList();
                    updateDashboard();
                    
                    showToast('تم إضافة الإيراد بنجاح');
                } catch (error) {
                    console.error('Error adding income: ', error);
                    showToast('فشل إضافة الإيراد: ' + error.message, 'error');
                }
            });
        });
    }
    
    // Add Expense Button
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', function() {
            const addExpenseModal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
            addExpenseModal.show();
        });
    }
    
    // Save Expense Button
    const saveExpenseBtn = document.getElementById('saveExpenseBtn');
    if (saveExpenseBtn) {
        saveExpenseBtn.addEventListener('click', async function() {
            const category = document.getElementById('expenseCategory').value;
            const description = document.getElementById('expenseDescription').value;
            const date = document.getElementById('expenseDate').value;
            const currency = document.getElementById('expenseCurrency').value;
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const account = document.getElementById('expenseAccount').value;
            const notes = document.getElementById('expenseNotes').value;
            
            if (!category || !description || !date || !amount || !account) {
                showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
                return;
            }
            
            // Get the category name
            let categoryName = '';
            const categoryObj = expenseCategories.find(c => c.id == category);
            if (categoryObj) {
                categoryName = categoryObj.name;
            }
            
            showConfirmation('هل أنت متأكد من إضافة هذا المصروف؟', async function() {
                try {
                    // Add new expense to Firebase
                    const expenseRef = await db.collection('expenseItems').add({
                        category: category,
                        categoryName: categoryName,
                        description: description,
                        date: date,
                        currency: currency,
                        amount: amount,
                        account: account,
                        notes: notes,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('Expense added with ID: ', expenseRef.id);
                    
                    // Create corresponding transaction
                    await db.collection('transactions').add({
                        type: 'expense',
                        description: description,
                        date: date,
                        currency: currency,
                        amount: amount,
                        account: account,
                        category: category,
                        categoryName: categoryName,
                        notes: notes,
                        expenseId: expenseRef.id,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Update account balance
                    await updateAccountBalanceInFirebase(account, currency, amount, false);
                    
                    // Close modal
                    const addExpenseModal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
                    if (addExpenseModal) addExpenseModal.hide();
                    
                    // Reset form
                    document.getElementById('expenseCategory').value = 'اختر فئة المصروف';
                    document.getElementById('expenseDescription').value = '';
                    document.getElementById('expenseAmount').value = '';
                    document.getElementById('expenseAccount').value = 'اختر الحساب';
                    
                    // Update UI
                    await loadExpenseItemsFromFirebase();
                    await loadTransactionsFromFirebase();
                    renderExpenseList();
                    renderTransactionsList();
                    updateDashboard();
                    
                    showToast('تم إضافة المصروف بنجاح');
                } catch (error) {
                    console.error('Error adding expense: ', error);
                    showToast('فشل إضافة المصروف: ' + error.message, 'error');
                }
            });
        });
    }
    
    // Add Income Category Button
    const addIncomeCategoryBtn = document.getElementById('addIncomeCategoryBtn');
    if (addIncomeCategoryBtn) {
        addIncomeCategoryBtn.addEventListener('click', function() {
            const addIncomeCategoryModal = new bootstrap.Modal(document.getElementById('addIncomeCategoryModal'));
            addIncomeCategoryModal.show();
        });
    }
    
    // Save Income Category Button
    const saveIncomeCategoryBtn = document.getElementById('saveIncomeCategoryBtn');
    if (saveIncomeCategoryBtn) {
        saveIncomeCategoryBtn.addEventListener('click', async function() {
            const name = document.getElementById('incomeCategoryName').value;
            const color = document.getElementById('incomeCategoryColor').value;
            const description = document.getElementById('incomeCategoryDescription').value;
            
            if (!name) {
                showToast('يرجى إدخال اسم التصنيف', 'error');
                return;
            }
            
            showConfirmation('هل أنت متأكد من إضافة هذا التصنيف؟', async function() {
                try {
                    // Add new income category to Firebase
                    const docRef = await db.collection('incomeCategories').add({
                        name: name,
                        color: color,
                        description: description,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('Income category added with ID: ', docRef.id);
                    
                    // Close modal
                    const addIncomeCategoryModal = bootstrap.Modal.getInstance(document.getElementById('addIncomeCategoryModal'));
                    if (addIncomeCategoryModal) addIncomeCategoryModal.hide();
                    
                    // Reset form
                    document.getElementById('incomeCategoryName').value = '';
                    document.getElementById('incomeCategoryColor').value = '#198754';
                    document.getElementById('incomeCategoryDescription').value = '';
                    
                    // Update UI
                    await loadIncomeCategoriesFromFirebase();
                    renderIncomeCategoriesList();
                    updateCategorySelects();
                    
                    showToast('تم إضافة التصنيف بنجاح');
                } catch (error) {
                    console.error('Error adding income category: ', error);
                    showToast('فشل إضافة التصنيف: ' + error.message, 'error');
                }
            });
        });
    }
    
    // Update Income Category Button
    const updateIncomeCategoryBtn = document.getElementById('updateIncomeCategoryBtn');
    if (updateIncomeCategoryBtn) {
        updateIncomeCategoryBtn.addEventListener('click', async function() {
            const categoryId = document.getElementById('editIncomeCategoryId').value;
            const name = document.getElementById('editIncomeCategoryName').value;
            const color = document.getElementById('editIncomeCategoryColor').value;
            const description = document.getElementById('editIncomeCategoryDescription').value;
            
            if (!name) {
                showToast('يرجى إدخال اسم التصنيف', 'error');
                return;
            }
            
            showConfirmation('هل أنت متأكد من تحديث هذا التصنيف؟', async function() {
                try {
                    // Update income category in Firebase
                    await db.collection('incomeCategories').doc(categoryId).update({
                        name: name,
                        color: color,
                        description: description,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Close modal
                    const editIncomeCategoryModal = bootstrap.Modal.getInstance(document.getElementById('editIncomeCategoryModal'));
                    if (editIncomeCategoryModal) editIncomeCategoryModal.hide();
                    
                    // Update UI
                    await loadIncomeCategoriesFromFirebase();
                    renderIncomeCategoriesList();
                    updateCategorySelects();
                    
                    showToast('تم تحديث التصنيف بنجاح');
                } catch (error) {
                    console.error('Error updating income category: ', error);
                    showToast('فشل تحديث التصنيف: ' + error.message, 'error');
                }
            });
        });
    }
    
    // Add Expense Category Button
    const addExpenseCategoryBtn = document.getElementById('addExpenseCategoryBtn');
    if (addExpenseCategoryBtn) {
        addExpenseCategoryBtn.addEventListener('click', function() {
            const addExpenseCategoryModal = new bootstrap.Modal(document.getElementById('addExpenseCategoryModal'));
            addExpenseCategoryModal.show();
        });
    }
    
    // Save Expense Category Button
    const saveExpenseCategoryBtn = document.getElementById('saveExpenseCategoryBtn');
    if (saveExpenseCategoryBtn) {
        saveExpenseCategoryBtn.addEventListener('click', async function() {
            const name = document.getElementById('expenseCategoryName').value;
            const color = document.getElementById('expenseCategoryColor').value;
            const description = document.getElementById('expenseCategoryDescription').value;
            
            if (!name) {
                showToast('يرجى إدخال اسم التصنيف', 'error');
                return;
            }
            
            showConfirmation('هل أنت متأكد من إضافة هذا التصنيف؟', async function() {
                try {
                    // Add new expense category to Firebase
                    const docRef = await db.collection('expenseCategories').add({
                        name: name,
                        color: color,
                        description: description,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('Expense category added with ID: ', docRef.id);
                    
                    // Close modal
                    const addExpenseCategoryModal = bootstrap.Modal.getInstance(document.getElementById('addExpenseCategoryModal'));
                    if (addExpenseCategoryModal) addExpenseCategoryModal.hide();
                    
                    // Reset form
                    document.getElementById('expenseCategoryName').value = '';
                    document.getElementById('expenseCategoryColor').value = '#dc3545';
                    document.getElementById('expenseCategoryDescription').value = '';
                    
                    // Update UI
                    await loadExpenseCategoriesFromFirebase();
                    renderExpenseCategoriesList();
                    updateCategorySelects();
                    
                    showToast('تم إضافة التصنيف بنجاح');
                } catch (error) {
                    console.error('Error adding expense category: ', error);
                    showToast('فشل إضافة التصنيف: ' + error.message, 'error');
                }
            });
        });
    }
    
    // Update Expense Category Button
    const updateExpenseCategoryBtn = document.getElementById('updateExpenseCategoryBtn');
    if (updateExpenseCategoryBtn) {
        updateExpenseCategoryBtn.addEventListener('click', async function() {
            const categoryId = document.getElementById('editExpenseCategoryId').value;
            const name = document.getElementById('editExpenseCategoryName').value;
            const color = document.getElementById('editExpenseCategoryColor').value;
            const description = document.getElementById('editExpenseCategoryDescription').value;
            
            if (!name) {
                showToast('يرجى إدخال اسم التصنيف', 'error');
                return;
            }
            
            showConfirmation('هل أنت متأكد من تحديث هذا التصنيف؟', async function() {
                try {
                    // Update expense category in Firebase
                    await db.collection('expenseCategories').doc(categoryId).update({
                        name: name,
                        color: color,
                        description: description,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Close modal
                    const editExpenseCategoryModal = bootstrap.Modal.getInstance(document.getElementById('editExpenseCategoryModal'));
                    if (editExpenseCategoryModal) editExpenseCategoryModal.hide();
                    
                    // Update UI
                    await loadExpenseCategoriesFromFirebase();
                    renderExpenseCategoriesList();
                    updateCategorySelects();
                    
                    showToast('تم تحديث التصنيف بنجاح');
                } catch (error) {
                    console.error('Error updating expense category: ', error);
                    showToast('فشل تحديث التصنيف: ' + error.message, 'error');
                }
            });
        });
    }
    
    // Add Debt Customer Button
    const addDebtCustomerBtn = document.getElementById('addDebtCustomerBtn');
    if (addDebtCustomerBtn) {
        addDebtCustomerBtn.addEventListener('click', function() {
            const addDebtCustomerModal = new bootstrap.Modal(document.getElementById('addDebtCustomerModal'));
            addDebtCustomerModal.show();
        });
    }
    
    // Save Debt Customer Button
    const saveDebtCustomerBtn = document.getElementById('saveDebtCustomerBtn');
    if (saveDebtCustomerBtn) {
        saveDebtCustomerBtn.addEventListener('click', async function() {
            const name = document.getElementById('debtCustomerName').value;
            const phone = document.getElementById('debtCustomerPhone').value;
            const email = document.getElementById('debtCustomerEmail').value;
            const address = document.getElementById('debtCustomerAddress').value;
            const notes = document.getElementById('debtCustomerNotes').value;
            
            if (!name) {
                showToast('يرجى إدخال اسم العميل', 'error');
                return;
            }
            
            showConfirmation('هل أنت متأكد من إضافة هذا العميل؟', async function() {
                try {
                    // Add new debt customer to Firebase
                    const docRef = await db.collection('debtCustomers').add({
                        name: name,
                        phone: phone,
                        email: email,
                        address: address,
                        notes: notes,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('Debt customer added with ID: ', docRef.id);
                    
                    // Close modal
                    const addDebtCustomerModal = bootstrap.Modal.getInstance(document.getElementById('addDebtCustomerModal'));
                    if (addDebtCustomerModal) addDebtCustomerModal.hide();
                    
                    // Reset form
                    document.getElementById('debtCustomerName').value = '';
                    document.getElementById('debtCustomerPhone').value = '';
                    document.getElementById('debtCustomerEmail').value = '';
                    document.getElementById('debtCustomerAddress').value = '';
                    document.getElementById('debtCustomerNotes').value = '';
                    
                    // Update UI
                    await loadDebtCustomersFromFirebase();
                    renderDebtCustomersList();
                    
                    showToast('تم إضافة العميل بنجاح');
                } catch (error) {
                    console.error('Error adding debt customer: ', error);
                    showToast('فشل إضافة العميل: ' + error.message, 'error');
                }
            });
        });
    }
    
    // Update Debt Customer Button
    const updateDebtCustomerBtn = document.getElementById('updateDebtCustomerBtn');
    if (updateDebtCustomerBtn) {
        updateDebtCustomerBtn.addEventListener('click', async function() {
            const customerId = document.getElementById('editDebtCustomerId').value;
            const name = document.getElementById('editDebtCustomerName').value;
            const phone = document.getElementById('editDebtCustomerPhone').value;
            const email = document.getElementById('editDebtCustomerEmail').value;
            const address = document.getElementById('editDebtCustomerAddress').value;
            const notes = document.getElementById('editDebtCustomerNotes').value;
            
            if (!name) {
                showToast('يرجى إدخال اسم العميل', 'error');
                return;
            }
            
            showConfirmation('هل أنت متأكد من تحديث بيانات هذا العميل؟', async function() {
                try {
                    // Update customer in Firebase
                    await db.collection('debtCustomers').doc(customerId).update({
                        name: name,
                        phone: phone,
                        email: email,
                        address: address,
                        notes: notes,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Close modal
                    const editDebtCustomerModal = bootstrap.Modal.getInstance(document.getElementById('editDebtCustomerModal'));
                    if (editDebtCustomerModal) editDebtCustomerModal.hide();
                    
                    // Update UI
                    await loadDebtCustomersFromFirebase();
                    renderDebtCustomersList();
                    
                    showToast('تم تحديث بيانات العميل بنجاح');
                } catch (error) {
                    console.error('Error updating debt customer: ', error);
                    showToast('فشل تحديث بيانات العميل: ' + error.message, 'error');
                }
            });
        });
    }
    
    // Save Debt Transaction Button
    const saveDebtTransactionBtn = document.getElementById('saveDebtTransactionBtn');
    if (saveDebtTransactionBtn) {
        saveDebtTransactionBtn.addEventListener('click', async function() {
            const customerId = document.getElementById('debtTransactionCustomerId').value;
            const type = document.getElementById('debtTransactionType').value;
            const description = document.getElementById('debtTransactionDescription').value;
            const date = document.getElementById('debtTransactionDate').value;
            const currency = document.getElementById('debtTransactionCurrency').value;
            const amount = parseFloat(document.getElementById('debtTransactionAmount').value);
            const dueDate = document.getElementById('debtTransactionDueDate').value;
            const notes = document.getElementById('debtTransactionNotes').value;
            
            if (!type || !description || !date || !amount) {
                showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
                return;
            }
            
            showConfirmation('هل أنت متأكد من إضافة هذه المعاملة؟', async function() {
                try {
                    // Add new debt transaction to Firebase
                    const docRef = await db.collection('debtTransactions').add({
                        customerId: customerId,
                        type: type,
                        description: description,
                        date: date,
                        currency: currency,
                        amount: amount,
                        dueDate: dueDate,
                        status: 'pending',
                        notes: notes,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('Debt transaction added with ID: ', docRef.id);
                    
                    // Close modal
                    const addDebtTransactionModal = bootstrap.Modal.getInstance(document.getElementById('addDebtTransactionModal'));
                    if (addDebtTransactionModal) addDebtTransactionModal.hide();
                    
                    // Reset form
                    document.getElementById('debtTransactionType').value = 'اختر نوع المعاملة';
                    document.getElementById('debtTransactionDescription').value = '';
                    document.getElementById('debtTransactionAmount').value = '';
                    document.getElementById('debtTransactionDueDate').value = '';
                    document.getElementById('debtTransactionNotes').value = '';
                    
                    // Update UI
                    await loadDebtTransactionsFromFirebase();
                    renderDebtCustomersList();
                    
                    showToast('تم إضافة المعاملة بنجاح');
                } catch (error) {
                    console.error('Error adding debt transaction: ', error);
                    showToast('فشل إضافة المعاملة: ' + error.message, 'error');
                }
            });
        });
    }
    
    // Update Debt Transaction Button
    const updateDebtTransactionBtn = document.getElementById('updateDebtTransactionBtn');
    if (updateDebtTransactionBtn) {
        updateDebtTransactionBtn.addEventListener('click', async function() {
            const transactionId = document.getElementById('editDebtTransactionId').value;
            const customerId = document.getElementById('editDebtTransactionCustomerId').value;
            const type = document.getElementById('editDebtTransactionType').value;
            const description = document.getElementById('editDebtTransactionDescription').value;
            const date = document.getElementById('editDebtTransactionDate').value;
            const currency = document.getElementById('editDebtTransactionCurrency').value;
            const amount = parseFloat(document.getElementById('editDebtTransactionAmount').value);
            const dueDate = document.getElementById('editDebtTransactionDueDate').value;
            const status = document.getElementById('editDebtTransactionStatus').value;
            const notes = document.getElementById('editDebtTransactionNotes').value;
            
            if (!type || !description || !date || !amount) {
                showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
                return;
            }
            
            showConfirmation('هل أنت متأكد من تحديث هذه المعاملة؟', async function() {
                try {
                    // Update transaction in Firebase
                    await db.collection('debtTransactions').doc(transactionId).update({
                        customerId: customerId,
                        type: type,
                        description: description,
                        date: date,
                        currency: currency,
                        amount: amount,
                        dueDate: dueDate,
                        status: status,
                        notes: notes,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Close modal
                    const editDebtTransactionModal = bootstrap.Modal.getInstance(document.getElementById('editDebtTransactionModal'));
                    if (editDebtTransactionModal) editDebtTransactionModal.hide();
                    
                    // Update UI
                    await loadDebtTransactionsFromFirebase();
                    renderDebtCustomersList();
                    
                    showToast('تم تحديث المعاملة بنجاح');
                } catch (error) {
                    console.error('Error updating debt transaction: ', error);
                    showToast('فشل تحديث المعاملة: ' + error.message, 'error');
                }
            });
        });
    }
    
    // Create Backup Button
    const createBackupBtn = document.getElementById('createBackupBtn');
    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', async function() {
            showToast('جاري إنشاء النسخة الاحتياطية...');
            
            try {
                // Create backup data
                const backupData = {
                    bankAccounts: bankAccounts,
                    cashAccounts: cashAccounts,
                    transactions: transactions,
                    incomeItems: incomeItems,
                    expenseItems: expenseItems,
                    incomeCategories: incomeCategories,
                    expenseCategories: expenseCategories,
                    debtCustomers: debtCustomers,
                    debtTransactions: debtTransactions,
                    users: users,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Save backup to Firebase
                await db.collection('backups').add(backupData);
                
                showToast('تم إنشاء النسخة الاحتياطية بنجاح');
                
                // Update backup status
                const backupStatusElements = document.querySelectorAll('.backup-status');
                if (backupStatusElements.length > 0) {
                    const statusElement = backupStatusElements[0];
                    const statusSmall = statusElement.querySelector('small');
                    const statusBadge = statusElement.querySelector('.badge');
                    
                    if (statusSmall) statusSmall.textContent = 'الآن، ' + new Date().toLocaleTimeString();
                    if (statusBadge) {
                        statusBadge.textContent = 'مكتمل';
                        statusBadge.className = 'badge bg-success';
                    }
                }
            } catch (error) {
                console.error('Error creating backup: ', error);
                showToast('فشل إنشاء النسخة الاحتياطية: ' + error.message, 'error');
            }
        });
    }
    
    // Restore Backup Button
    const restoreBackupBtn = document.getElementById('restoreBackupBtn');
    if (restoreBackupBtn) {
        restoreBackupBtn.addEventListener('click', async function() {
            showToast('جاري استعادة النسخة الاحتياطية...');
            
            try {
                // Get the latest backup
                const backupSnapshot = await db.collection('backups')
                    .orderBy('createdAt', 'desc')
                    .limit(1)
                    .get();
                
                if (backupSnapshot.empty) {
                    showToast('لا توجد نسخ احتياطية متاحة', 'error');
                    return;
                }
                
                const backupDoc = backupSnapshot.docs[0];
                const backupData = backupDoc.data();
                
                // Restore data from backup
                if (backupData.bankAccounts) {
                    // Clear existing bank accounts
                    const bankAccountsSnapshot = await db.collection('bankAccounts').get();
                    const bankBatch = db.batch();
                    bankAccountsSnapshot.forEach(doc => {
                        bankBatch.delete(doc.ref);
                    });
                    await bankBatch.commit();
                    
                    // Add bank accounts from backup
                    for (const account of backupData.bankAccounts) {
                        await db.collection('bankAccounts').add({
                            ...account,
                            restoredAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                
                if (backupData.cashAccounts) {
                    // Clear existing cash accounts
                    const cashAccountsSnapshot = await db.collection('cashAccounts').get();
                    const cashBatch = db.batch();
                    cashAccountsSnapshot.forEach(doc => {
                        cashBatch.delete(doc.ref);
                    });
                    await cashBatch.commit();
                    
                    // Add cash accounts from backup
                    for (const account of backupData.cashAccounts) {
                        await db.collection('cashAccounts').add({
                            ...account,
                            restoredAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                
                if (backupData.transactions) {
                    // Clear existing transactions
                    const transactionsSnapshot = await db.collection('transactions').get();
                    const transactionsBatch = db.batch();
                    transactionsSnapshot.forEach(doc => {
                        transactionsBatch.delete(doc.ref);
                    });
                    await transactionsBatch.commit();
                    
                    // Add transactions from backup
                    for (const transaction of backupData.transactions) {
                        await db.collection('transactions').add({
                            ...transaction,
                            restoredAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                
                if (backupData.incomeItems) {
                    // Clear existing income items
                    const incomeItemsSnapshot = await db.collection('incomeItems').get();
                    const incomeBatch = db.batch();
                    incomeItemsSnapshot.forEach(doc => {
                        incomeBatch.delete(doc.ref);
                    });
                    await incomeBatch.commit();
                    
                    // Add income items from backup
                    for (const item of backupData.incomeItems) {
                        await db.collection('incomeItems').add({
                            ...item,
                            restoredAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                
                if (backupData.expenseItems) {
                    // Clear existing expense items
                    const expenseItemsSnapshot = await db.collection('expenseItems').get();
                    const expenseBatch = db.batch();
                    expenseItemsSnapshot.forEach(doc => {
                        expenseBatch.delete(doc.ref);
                    });
                    await expenseBatch.commit();
                    
                    // Add expense items from backup
                    for (const item of backupData.expenseItems) {
                        await db.collection('expenseItems').add({
                            ...item,
                            restoredAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                
                if (backupData.incomeCategories) {
                    // Clear existing income categories
                    const incomeCategoriesSnapshot = await db.collection('incomeCategories').get();
                    const incomeCategoriesBatch = db.batch();
                    incomeCategoriesSnapshot.forEach(doc => {
                        incomeCategoriesBatch.delete(doc.ref);
                    });
                    await incomeCategoriesBatch.commit();
                    
                    // Add income categories from backup
                    for (const category of backupData.incomeCategories) {
                        await db.collection('incomeCategories').add({
                            ...category,
                            restoredAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                
                if (backupData.expenseCategories) {
                    // Clear existing expense categories
                    const expenseCategoriesSnapshot = await db.collection('expenseCategories').get();
                    const expenseCategoriesBatch = db.batch();
                    expenseCategoriesSnapshot.forEach(doc => {
                        expenseCategoriesBatch.delete(doc.ref);
                    });
                    await expenseCategoriesBatch.commit();
                    
                    // Add expense categories from backup
                    for (const category of backupData.expenseCategories) {
                        await db.collection('expenseCategories').add({
                            ...category,
                            restoredAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                
                if (backupData.debtCustomers) {
                    // Clear existing debt customers
                    const debtCustomersSnapshot = await db.collection('debtCustomers').get();
                    const debtCustomersBatch = db.batch();
                    debtCustomersSnapshot.forEach(doc => {
                        debtCustomersBatch.delete(doc.ref);
                    });
                    await debtCustomersBatch.commit();
                    
                    // Add debt customers from backup
                    for (const customer of backupData.debtCustomers) {
                        await db.collection('debtCustomers').add({
                            ...customer,
                            restoredAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                
                if (backupData.debtTransactions) {
                    // Clear existing debt transactions
                    const debtTransactionsSnapshot = await db.collection('debtTransactions').get();
                    const debtTransactionsBatch = db.batch();
                    debtTransactionsSnapshot.forEach(doc => {
                        debtTransactionsBatch.delete(doc.ref);
                    });
                    await debtTransactionsBatch.commit();
                    
                    // Add debt transactions from backup
                    for (const transaction of backupData.debtTransactions) {
                        await db.collection('debtTransactions').add({
                            ...transaction,
                            restoredAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                
                if (backupData.users) {
                    // Clear existing users (except current user)
                    const usersSnapshot = await db.collection('users').get();
                    const usersBatch = db.batch();
                    usersSnapshot.forEach(doc => {
                        if (currentUser && doc.id !== currentUser.id) {
                            usersBatch.delete(doc.ref);
                        }
                    });
                    await usersBatch.commit();
                    
                    // Add users from backup (except current user)
                    for (const user of backupData.users) {
                        if (currentUser && user.username !== currentUser.username) {
                            await db.collection('users').add({
                                ...user,
                                restoredAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    }
                }
                
                // Reload data from Firebase
                await loadDataFromFirebase();
                
                // Update UI
                refreshUI();
                
                showToast('تم استعادة النسخة الاحتياطية بنجاح');
            } catch (error) {
                console.error('Error restoring backup: ', error);
                showToast('فشل استعادة النسخة الاحتياطية: ' + error.message, 'error');
            }
        });
    }
    
    // Generate Report Button
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', function() {
            showToast('تم إنشاء التقرير بنجاح');
            refreshUI();
        });
    }
    
    // Download PDF Button
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', function() {
            // إنشاء تقرير PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFont('helvetica');
            doc.setFontSize(18);
            doc.text('Financial Summary Report', 105, 15, { align: 'center' });
            
            doc.setFontSize(12);
            const date = new Date().toLocaleDateString();
            doc.text(`Date: ${date}`, 105, 25, { align: 'center' });
            
            // حساب الإجماليات
            let totalBalanceYER = 0;
            let totalBalanceSAR = 0;
            let totalIncome = 0;
            let totalExpenses = 0;
            let totalSavings = 0;
            let totalDebts = 0;
            
            // حساب الأرصدة
            bankAccounts.forEach(account => {
                totalBalanceYER += account.balanceYER || 0;
                totalBalanceSAR += account.balanceSAR || 0;
            });
            
            cashAccounts.forEach(account => {
                totalBalanceYER += account.balanceYER || 0;
                totalBalanceSAR += account.balanceSAR || 0;
            });
            
            // حساب الإيرادات والمصروفات
            transactions.forEach(transaction => {
                if (transaction.type === 'income') {
                    totalIncome += transaction.amount || 0;
                } else if (transaction.type === 'expense') {
                    totalExpenses += transaction.amount || 0;
                }
            });
            
            // حساب المدخرات والديون
            totalSavings = totalIncome - totalExpenses;
            
            debtTransactions.forEach(transaction => {
                if (transaction.type === 'owed') {
                    totalDebts += transaction.amount || 0;
                } else {
                    totalDebts -= transaction.amount || 0;
                }
            });
            
            // إضافة جدول الملخص المالي
            const tableData = [
                ['Description', 'Amount (YER)'],
                ['Total Balance', totalBalanceYER.toLocaleString()],
                ['Total Income', totalIncome.toLocaleString()],
                ['Total Expenses', totalExpenses.toLocaleString()],
                ['Total Savings', totalSavings.toLocaleString()],
                ['Total Debts', totalDebts.toLocaleString()]
            ];
            
            doc.autoTable({
                head: [tableData[0]],
                body: tableData.slice(1),
                startY: 35,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] }
            });
            
            doc.save('financial-summary.pdf');
            showToast('تم تحميل التقرير PDF بنجاح');
        });
    }
    
    // Download Excel Button
    const downloadExcelBtn = document.getElementById('downloadExcelBtn');
    if (downloadExcelBtn) {
        downloadExcelBtn.addEventListener('click', function() {
            // إنشاء ملف Excel
            const wb = XLSX.utils.book_new();
            
            // حساب الإجماليات
            let totalBalanceYER = 0;
            let totalBalanceSAR = 0;
            let totalIncome = 0;
            let totalExpenses = 0;
            let totalSavings = 0;
            let totalDebts = 0;
            
            // حساب الأرصدة
            bankAccounts.forEach(account => {
                totalBalanceYER += account.balanceYER || 0;
                totalBalanceSAR += account.balanceSAR || 0;
            });
            
            cashAccounts.forEach(account => {
                totalBalanceYER += account.balanceYER || 0;
                totalBalanceSAR += account.balanceSAR || 0;
            });
            
            // حساب الإيرادات والمصروفات
            transactions.forEach(transaction => {
                if (transaction.type === 'income') {
                    totalIncome += transaction.amount || 0;
                } else if (transaction.type === 'expense') {
                    totalExpenses += transaction.amount || 0;
                }
            });
            
            // حساب المدخرات والديون
            totalSavings = totalIncome - totalExpenses;
            
            debtTransactions.forEach(transaction => {
                if (transaction.type === 'owed') {
                    totalDebts += transaction.amount || 0;
                } else {
                    totalDebts -= transaction.amount || 0;
                }
            });
            
            const wsData = [
                ['Description', 'Amount (YER)'],
                ['Total Balance', totalBalanceYER.toLocaleString()],
                ['Total Income', totalIncome.toLocaleString()],
                ['Total Expenses', totalExpenses.toLocaleString()],
                ['Total Savings', totalSavings.toLocaleString()],
                ['Total Debts', totalDebts.toLocaleString()]
            ];
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, 'Financial Summary');
            
            XLSX.writeFile(wb, 'financial-summary.xlsx');
            showToast('تم تحميل التقرير Excel بنجاح');
        });
    }
    
    // Export to Excel Button
    const exportToExcelBtn = document.getElementById('exportToExcelBtn');
    if (exportToExcelBtn) {
        exportToExcelBtn.addEventListener('click', function() {
            // إنشاء ملف Excel للمعاملات
            const wb = XLSX.utils.book_new();
            
            const wsData = [
                ['Description', 'Date', 'Type', 'Account', 'Amount (YER)', 'Amount (SAR)'],
                ...transactions.map(t => [
                    t.description, 
                    t.date, 
                    t.type === 'income' ? 'إيراد' : t.type === 'expense' ? 'مصروف' : 'تحويل',
                    getAccountName(t.account),
                    t.currency === 'YER' ? t.amount.toLocaleString() : '-',
                    t.currency === 'SAR' ? t.amount.toLocaleString() : '-'
                ])
            ];
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
            
            XLSX.writeFile(wb, 'financial-transactions.xlsx');
            showToast('تم تصدير البيانات إلى Excel بنجاح');
        });
    }
    
    // Export to PDF Button
    const exportToPdfBtn = document.getElementById('exportToPdfBtn');
    if (exportToPdfBtn) {
        exportToPdfBtn.addEventListener('click', function() {
            // إنشاء تقرير PDF للمعاملات
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFont('helvetica');
            doc.setFontSize(18);
            doc.text('Financial Transactions Report', 105, 15, { align: 'center' });
            
            doc.setFontSize(12);
            const date = new Date().toLocaleDateString();
            doc.text(`Date: ${date}`, 105, 25, { align: 'center' });
            
            // إضافة جدول المعاملات
            const tableData = [
                ['Description', 'Date', 'Type', 'Amount (YER)', 'Amount (SAR)'],
                ...transactions.slice(0, 10).map(t => [
                    t.description, 
                    t.date, 
                    t.type === 'income' ? 'إيراد' : t.type === 'expense' ? 'مصروف' : 'تحويل',
                    t.currency === 'YER' ? t.amount.toLocaleString() : '-',
                    t.currency === 'SAR' ? t.amount.toLocaleString() : '-'
                ])
            ];
            
            doc.autoTable({
                head: [tableData[0]],
                body: tableData.slice(1),
                startY: 35,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] }
            });
            
            doc.save('financial-transactions.pdf');
            showToast('تم تصدير التقرير إلى PDF بنجاح');
        });
    }
    
    // Login Form - Firebase Authentication
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const rememberMe = document.getElementById('rememberMe').checked;
            
            if (!email || !password) {
                showToast('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
                return;
            }
            
            try {
                // Sign in with Firebase Authentication
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                console.log("✅ تم تسجيل الدخول:", user.uid);
                
                // Save user to localStorage if "remember me" is checked
                if (rememberMe) {
                    localStorage.setItem('currentUser', JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName
                    }));
                }
                
                showToast('تم تسجيل الدخول بنجاح');
                
                // The UI will be updated automatically by the onAuthStateChanged listener
            } catch (error) {
                console.error("❌ خطأ تسجيل الدخول:", error.message);
                showToast('فشل تسجيل الدخول: ' + error.message, 'error');
            }
        });
    }
    
    // Google Sign-In Button
    const googleBtn = document.getElementById('googleBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async function() {
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                const result = await firebase.auth().signInWithPopup(provider);
                const user = result.user;
                
                console.log("✅ تسجيل دخول Google ناجح:", user.uid);
                
                // Save user to localStorage
                localStorage.setItem('currentUser', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                }));
                
                showToast('تم تسجيل الدخول بحساب Google بنجاح');
                
                // The UI will be updated automatically by the onAuthStateChanged listener
            } catch (error) {
                console.error("❌ خطأ Google Sign-In:", error.message);
                showToast('فشل تسجيل الدخول بحساب Google: ' + error.message, 'error');
            }
        });
    }
    
    // Forgot Password Link
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // Show the forgot password modal
            const forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
            forgotPasswordModal.show();
        });
    }
    
    // Send Reset Link Button
    const sendResetLinkBtn = document.getElementById('sendResetLinkBtn');
    if (sendResetLinkBtn) {
        sendResetLinkBtn.addEventListener('click', async function() {
            const email = document.getElementById('forgotEmail').value.trim();
            
            if (!email) {
                showToast('يرجى إدخال البريد الإلكتروني', 'error');
                return;
            }
            
            try {
                await firebase.auth().sendPasswordResetEmail(email);
                showToast('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني');
                
                // Close modal
                const forgotPasswordModal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
                if (forgotPasswordModal) forgotPasswordModal.hide();
            } catch (error) {
                console.error("❌ خطأ استعادة كلمة المرور:", error.message);
                showToast('فشل استعادة كلمة المرور: ' + error.message, 'error');
            }
        });
    }
    
    // Logout
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            showConfirmation('هل أنت متأكد من تسجيل الخروج؟', async function() {
                try {
                    // Sign out from Firebase
                    await firebase.auth().signOut();
                    
                    // Remove user from localStorage
                    localStorage.removeItem('currentUser');
                    
                    showToast('تم تسجيل الخروج بنجاح');
                    
                    // The UI will be updated automatically by the onAuthStateChanged listener
                } catch (error) {
                    console.error('Error signing out: ', error);
                    showToast('فشل تسجيل الخروج: ' + error.message, 'error');
                }
            });
        });
    }
    
    // Sidebar Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            // Skip logout link
            if (this.id === 'logoutLink') return;
            
            e.preventDefault();
            
            // Remove active class from all links
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Hide all pages
            document.querySelectorAll('.page-content').forEach(page => page.classList.add('d-none'));
            
            // Show selected page
            const pageId = this.getAttribute('data-page') + '-page';
            const pageElement = document.getElementById(pageId);
            if (pageElement) {
                pageElement.classList.remove('d-none');
                
                // Load data based on selected page
                if (pageId === 'accounts-page') {
                    loadBankAccountsFromFirebase();
                    loadCashAccountsFromFirebase();
                } else if (pageId === 'transactions-page') {
                    loadTransactionsFromFirebase();
                } else if (pageId === 'income-page') {
                    loadIncomeItemsFromFirebase();
                } else if (pageId === 'expenses-page') {
                    loadExpenseItemsFromFirebase();
                } else if (pageId === 'debt-page') {
                    loadDebtCustomersFromFirebase();
                    loadDebtTransactionsFromFirebase();
                } else if (pageId === 'categories-page') {
                    loadIncomeCategoriesFromFirebase();
                    loadExpenseCategoriesFromFirebase();
                } else if (pageId === 'reports-page') {
                    updateDashboard();
                } else if (pageId === 'users-page') {
                    // User management is now handled by Firebase Console
                    showToast('إدارة المستخدمين تتم عبر Firebase Console', 'info');
                } else if (pageId === 'backup-page') {
                    // Load backup data if needed
                } else if (pageId === 'settings-page') {
                    // Load settings if needed
                } else if (pageId === 'dashboard-page') {
                    updateDashboard();
                }
            }
            
            // Close sidebar on mobile
            if (window.innerWidth < 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.remove('active');
            }
        });
    });
    
    // Mobile Menu Toggle - Fixed to ensure it works properly
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.toggle('active');
                
                // Add active class to show the sidebar
                if (sidebar.classList.contains('active')) {
                    sidebar.style.transform = 'translateX(0)';
                } else {
                    sidebar.style.transform = 'translateX(-100%)';
                }
            }
        });
    }
    
    // Handle click events for dynamically created elements
    document.addEventListener('click', function(e) {
        // Edit user buttons - Now disabled as user management is handled by Firebase Console
        if(e.target.classList.contains('edit-user-btn') || e.target.closest('.edit-user-btn')){
            showToast('تعديل المستخدمين يتم عبر Firebase Console', 'info');
        }
        
        // Delete user buttons - Now disabled as user management is handled by Firebase Console
        if(e.target.classList.contains('delete-user-btn') || e.target.closest('.delete-user-btn')){
            showToast('حذف المستخدمين يتم عبر Firebase Console', 'info');
        }
        
        // Edit bank account buttons
        if(e.target.classList.contains('edit-bank-account-btn') || e.target.closest('.edit-bank-account-btn')){
            const btn = e.target.classList.contains('edit-bank-account-btn') ? e.target : e.target.closest('.edit-bank-account-btn');
            const accountId = btn.getAttribute('data-id');
            editBankAccount(accountId);
        }
        
        // Delete bank account buttons
        if(e.target.classList.contains('delete-bank-account-btn') || e.target.closest('.delete-bank-account-btn')){
            const btn = e.target.classList.contains('delete-bank-account-btn') ? e.target : e.target.closest('.delete-bank-account-btn');
            const accountId = btn.getAttribute('data-id');
            deleteBankAccount(accountId);
        }
        
        // Edit cash account buttons
        if(e.target.classList.contains('edit-cash-account-btn') || e.target.closest('.edit-cash-account-btn')){
            const btn = e.target.classList.contains('edit-cash-account-btn') ? e.target : e.target.closest('.edit-cash-account-btn');
            const accountId = btn.getAttribute('data-id');
            editCashAccount(accountId);
        }
        
        // Delete cash account buttons
        if(e.target.classList.contains('delete-cash-account-btn') || e.target.closest('.delete-cash-account-btn')){
            const btn = e.target.classList.contains('delete-cash-account-btn') ? e.target : e.target.closest('.delete-cash-account-btn');
            const accountId = btn.getAttribute('data-id');
            deleteCashAccount(accountId);
        }
        
        // Edit transaction buttons
        if(e.target.classList.contains('edit-transaction-btn') || e.target.closest('.edit-transaction-btn')){
            const btn = e.target.classList.contains('edit-transaction-btn') ? e.target : e.target.closest('.edit-transaction-btn');
            const transactionId = btn.getAttribute('data-id');
            editTransaction(transactionId);
        }
        
        // Delete transaction buttons
        if(e.target.classList.contains('delete-transaction-btn') || e.target.closest('.delete-transaction-btn')){
            const btn = e.target.classList.contains('delete-transaction-btn') ? e.target : e.target.closest('.delete-transaction-btn');
            const transactionId = btn.getAttribute('data-id');
            deleteTransaction(transactionId);
        }
        
        // Edit income buttons
        if(e.target.classList.contains('edit-income-btn') || e.target.closest('.edit-income-btn')){
            const btn = e.target.classList.contains('edit-income-btn') ? e.target : e.target.closest('.edit-income-btn');
            const incomeId = btn.getAttribute('data-id');
            editIncome(incomeId);
        }
        
        // Delete income buttons
        if(e.target.classList.contains('delete-income-btn') || e.target.closest('.delete-income-btn')){
            const btn = e.target.classList.contains('delete-income-btn') ? e.target : e.target.closest('.delete-income-btn');
            const incomeId = btn.getAttribute('data-id');
            deleteIncome(incomeId);
        }
        
        // Edit expense buttons
        if(e.target.classList.contains('edit-expense-btn') || e.target.closest('.edit-expense-btn')){
            const btn = e.target.classList.contains('edit-expense-btn') ? e.target : e.target.closest('.edit-expense-btn');
            const expenseId = btn.getAttribute('data-id');
            editExpense(expenseId);
        }
        
        // Delete expense buttons
        if(e.target.classList.contains('delete-expense-btn') || e.target.closest('.delete-expense-btn')){
            const btn = e.target.classList.contains('delete-expense-btn') ? e.target : e.target.closest('.delete-expense-btn');
            const expenseId = btn.getAttribute('data-id');
            deleteExpense(expenseId);
        }
        
        // Edit income category buttons
        if(e.target.classList.contains('edit-income-category-btn') || e.target.closest('.edit-income-category-btn')){
            const btn = e.target.classList.contains('edit-income-category-btn') ? e.target : e.target.closest('.edit-income-category-btn');
            const categoryId = btn.getAttribute('data-id');
            editIncomeCategory(categoryId);
        }
        
        // Delete income category buttons
        if(e.target.classList.contains('delete-income-category-btn') || e.target.closest('.delete-income-category-btn')){
            const btn = e.target.classList.contains('delete-income-category-btn') ? e.target : e.target.closest('.delete-income-category-btn');
            const categoryId = btn.getAttribute('data-id');
            deleteIncomeCategory(categoryId);
        }
        
        // Edit expense category buttons
        if(e.target.classList.contains('edit-expense-category-btn') || e.target.closest('.edit-expense-category-btn')){
            const btn = e.target.classList.contains('edit-expense-category-btn') ? e.target : e.target.closest('.edit-expense-category-btn');
            const categoryId = btn.getAttribute('data-id');
            editExpenseCategory(categoryId);
        }
        
        // Delete expense category buttons
        if(e.target.classList.contains('delete-expense-category-btn') || e.target.closest('.delete-expense-category-btn')){
            const btn = e.target.classList.contains('delete-expense-category-btn') ? e.target : e.target.closest('.delete-expense-category-btn');
            const categoryId = btn.getAttribute('data-id');
            deleteExpenseCategory(categoryId);
        }
        
        // View debt customer buttons
        if(e.target.classList.contains('view-debt-customer-btn') || e.target.closest('.view-debt-customer-btn')){
            const btn = e.target.classList.contains('view-debt-customer-btn') ? e.target : e.target.closest('.view-debt-customer-btn');
            const customerId = btn.getAttribute('data-id');
            viewDebtCustomer(customerId);
        }
        
        // Add debt transaction buttons
        if(e.target.classList.contains('add-debt-transaction-btn') || e.target.closest('.add-debt-transaction-btn')){
            const btn = e.target.classList.contains('add-debt-transaction-btn') ? e.target : e.target.closest('.add-debt-transaction-btn');
            const customerId = btn.getAttribute('data-id');
            addDebtTransaction(customerId);
        }
        
        // Delete debt customer buttons
        if(e.target.classList.contains('delete-debt-customer-btn') || e.target.closest('.delete-debt-customer-btn')){
            const btn = e.target.classList.contains('delete-debt-customer-btn') ? e.target : e.target.closest('.delete-debt-customer-btn');
            const customerId = btn.getAttribute('data-id');
            deleteDebtCustomer(customerId);
        }
        
        // Edit debt customer buttons
        if(e.target.classList.contains('edit-debt-customer-btn') || e.target.closest('.edit-debt-customer-btn')){
            const btn = e.target.classList.contains('edit-debt-customer-btn') ? e.target : e.target.closest('.edit-debt-customer-btn');
            const customerId = btn.getAttribute('data-id');
            editDebtCustomer(customerId);
        }
        
        // Edit debt transaction buttons
        if(e.target.classList.contains('edit-debt-transaction-btn') || e.target.closest('.edit-debt-transaction-btn')){
            const btn = e.target.classList.contains('edit-debt-transaction-btn') ? e.target : e.target.closest('.edit-debt-transaction-btn');
            const transactionId = btn.getAttribute('data-id');
            editDebtTransaction(transactionId);
        }
        
        // Delete debt transaction buttons
        if(e.target.classList.contains('delete-debt-transaction-btn') || e.target.closest('.delete-debt-transaction-btn')){
            const btn = e.target.classList.contains('delete-debt-transaction-btn') ? e.target : e.target.closest('.delete-debt-transaction-btn');
            const transactionId = btn.getAttribute('data-id');
            deleteDebtTransaction(transactionId);
        }
    });
    
    // Add event listeners for online/offline status
    window.addEventListener('online', function() {
        showToast('تم استعادة الاتصال بالإنترنت');
        // Try to sync data when connection is restored
        saveDataToFirebase();
    });
    
    window.addEventListener('offline', function() {
        showToast('فقدان الاتصال بالإنترنت، يتم العمل بدون اتصال');
    });
    
    // Show/Hide Login and Sign Up pages
    const signupLink = document.getElementById('signupLink');
    if (signupLink) {
        signupLink.addEventListener('click', function(e) {
            e.preventDefault();
            const loginPage = document.getElementById('login-page');
            const signupPage = document.getElementById('signup-page');
            
            if (loginPage) loginPage.classList.add('d-none');
            if (signupPage) signupPage.classList.remove('d-none');
        });
    }
    
    const loginLink = document.getElementById('loginLink');
    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            const loginPage = document.getElementById('login-page');
            const signupPage = document.getElementById('signup-page');
            
            if (signupPage) signupPage.classList.add('d-none');
            if (loginPage) loginPage.classList.remove('d-none');
        });
    }
    
    // Handle Sign Up Form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value.trim();
            const confirmPassword = document.getElementById('signupConfirmPassword').value.trim();
            const agreeTerms = document.getElementById('agreeTerms').checked;
            
            // Validation
            if (!name || !email || !password || !confirmPassword) {
                showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showToast('كلمتا المرور غير متطابقتين', 'error');
                return;
            }
            
            if (password.length < 6) {
                showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
                return;
            }
            
            if (!agreeTerms) {
                showToast('يجب الموافقة على الشروط والأحكام', 'error');
                return;
            }
            
            try {
                // Create user in Firebase Authentication
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Update user profile with display name
                await user.updateProfile({
                    displayName: name
                });
                
                // Create user document in Firestore with default role
                await db.collection('users').doc(user.uid).set({
                    name: name,
                    email: email,
                    role: 'user', // Default role is 'user'
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log("✅ تم إنشاء حساب جديد:", user.uid);
                showToast('تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول');
                
                // Switch to login page
                const signupPage = document.getElementById('signup-page');
                const loginPage = document.getElementById('login-page');
                
                if (signupPage) signupPage.classList.add('d-none');
                if (loginPage) loginPage.classList.remove('d-none');
                
                // Clear form
                signupForm.reset();
            } catch (error) {
                console.error("❌ خطأ إنشاء الحساب:", error.message);
                
                // Handle specific errors
                if (error.code === 'auth/email-already-in-use') {
                    showToast('البريد الإلكتروني مستخدم بالفعل', 'error');
                } else if (error.code === 'auth/invalid-email') {
                    showToast('البريد الإلكتروني غير صالح', 'error');
                } else if (error.code === 'auth/weak-password') {
                    showToast('كلمة المرور ضعيفة جداً', 'error');
                } else {
                    showToast('فشل إنشاء الحساب: ' + error.message, 'error');
                }
            }
        });
    }
    
    // Handle Google Sign Up
    const googleSignupBtn = document.getElementById('googleSignupBtn');
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', async function() {
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                const result = await firebase.auth().signInWithPopup(provider);
                const user = result.user;
                
                // Check if user document exists in Firestore
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                if (!userDoc.exists) {
                    // Create user document in Firestore if it doesn't exist
                    await db.collection('users').doc(user.uid).set({
                        name: user.displayName || '',
                        email: user.email,
                        role: 'user', // Default role is 'user'
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                console.log("✅ تم إنشاء حساب Google:", user.uid);
                showToast('تم إنشاء حسابك بنجاح!');
                
                // The UI will be updated automatically by the onAuthStateChanged listener
            } catch (error) {
                console.error("❌ خطأ إنشاء حساب Google:", error.message);
                showToast('فشل إنشاء حساب Google: ' + error.message, 'error');
            }
        });
    }
}

// Check internet connection
function checkInternetConnection() {
    if (navigator.onLine) {
        console.log('Online');
        return true;
    } else {
        console.log('Offline');
        showToast('لا يوجد اتصال بالإنترنت، سيتم العمل بدون اتصال');
        return false;
    }
}

// Show Toast Notification
function showToast(message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;
    
    const toastId = 'toast-' + Date.now();
    
    const toastHtml = `
        <div id="${toastId}" class="custom-toast toast-${type}">
            <div class="toast-icon">
                <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill'}"></i>
            </div>
            <div>${message}</div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    if (!toastElement) return;
    
    // Show toast
    setTimeout(() => {
        toastElement.style.opacity = '1';
        toastElement.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toastElement.style.opacity = '0';
        toastElement.style.transform = 'translateX(100%)';
        
        // Remove toast from DOM after animation completes
        setTimeout(() => {
            toastElement.remove();
        }, 300);
    }, 3000);
}

// Show Confirmation Modal
function showConfirmation(message, callback) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmModalBody = document.getElementById('confirmModalBody');
    const confirmBtn = document.getElementById('confirmModalBtn');
    
    if (!confirmModal || !confirmModalBody || !confirmBtn) return;
    
    confirmModalBody.textContent = message;
    
    // Set up the confirmation button
    confirmBtn.onclick = function() {
        const modal = bootstrap.Modal.getInstance(confirmModal);
        if (modal) modal.hide();
        callback();
    };
    
    const modal = new bootstrap.Modal(confirmModal);
    modal.show();
}

// Update account balance in Firebase
async function updateAccountBalanceInFirebase(accountId, currency, amount, isIncome) {
    console.log(`تحديث رصيد الحساب في Firebase: ${accountId}, العملة: ${currency}, المبلغ: ${amount}, نوع العملية: ${isIncome ? 'إيراد' : 'مصروف'}`);
    
    try {
        if (accountId.startsWith('bank-')) {
            const bankId = accountId.replace('bank-', '');
            const bankDoc = await db.collection('bankAccounts').doc(bankId).get();
            
            if (bankDoc.exists) {
                const bankData = bankDoc.data();
                let updatedBalance = 0;
                
                if (currency === 'YER') {
                    updatedBalance = (bankData.balanceYER || 0) + (isIncome ? amount : -amount);
                    await db.collection('bankAccounts').doc(bankId).update({
                        balanceYER: updatedBalance,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    updatedBalance = (bankData.balanceSAR || 0) + (isIncome ? amount : -amount);
                    await db.collection('bankAccounts').doc(bankId).update({
                        balanceSAR: updatedBalance,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                console.log(`تم تحديث رصيد الحساب البنكي ${bankId} (${bankData.name}) إلى ${updatedBalance} ${currency}`);
            } else {
                console.error(`الحساب البنكي غير موجود: ${bankId}`);
            }
        } else if (accountId.startsWith('cash-')) {
            const cashId = accountId.replace('cash-', '');
            const cashDoc = await db.collection('cashAccounts').doc(cashId).get();
            
            if (cashDoc.exists) {
                const cashData = cashDoc.data();
                let updatedBalance = 0;
                
                if (currency === 'YER') {
                    updatedBalance = (cashData.balanceYER || 0) + (isIncome ? amount : -amount);
                    await db.collection('cashAccounts').doc(cashId).update({
                        balanceYER: updatedBalance,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    updatedBalance = (cashData.balanceSAR || 0) + (isIncome ? amount : -amount);
                    await db.collection('cashAccounts').doc(cashId).update({
                        balanceSAR: updatedBalance,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                console.log(`تم تحديث رصيد الحساب النقدي ${cashId} إلى ${updatedBalance} ${currency}`);
            } else {
                console.error(`الحساب النقدي غير موجود: ${cashId}`);
            }
        } else {
            console.error(`معرف الحساب غير صالح: ${accountId}`);
        }
    } catch (error) {
        console.error('Error updating account balance in Firebase:', error);
        throw error;
    }
}

// Load bank accounts from Firebase
async function loadBankAccountsFromFirebase() {
    try {
        console.log('Loading bank accounts from Firebase...');
        
        const snapshot = await db.collection('bankAccounts').get();
        bankAccounts = [];
        
        snapshot.forEach(doc => {
            bankAccounts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded bank accounts:', bankAccounts);
        return true;
    } catch (error) {
        console.error('Error loading bank accounts from Firebase:', error);
        showToast('فشل تحميل الحسابات البنكية: ' + error.message, 'error');
        return false;
    }
}

// Load cash accounts from Firebase
async function loadCashAccountsFromFirebase() {
    try {
        console.log('Loading cash accounts from Firebase...');
        
        const snapshot = await db.collection('cashAccounts').get();
        cashAccounts = [];
        
        snapshot.forEach(doc => {
            cashAccounts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded cash accounts:', cashAccounts);
        return true;
    } catch (error) {
        console.error('Error loading cash accounts from Firebase:', error);
        showToast('فشل تحميل الحسابات النقدية: ' + error.message, 'error');
        return false;
    }
}

// Load transactions from Firebase
async function loadTransactionsFromFirebase() {
    try {
        console.log('Loading transactions from Firebase...');
        
        const snapshot = await db.collection('transactions').get();
        transactions = [];
        
        snapshot.forEach(doc => {
            transactions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded transactions:', transactions);
        return true;
    } catch (error) {
        console.error('Error loading transactions from Firebase:', error);
        showToast('فشل تحميل المعاملات: ' + error.message, 'error');
        return false;
    }
}

// Load income items from Firebase
async function loadIncomeItemsFromFirebase() {
    try {
        console.log('Loading income items from Firebase...');
        
        const snapshot = await db.collection('incomeItems').get();
        incomeItems = [];
        
        snapshot.forEach(doc => {
            incomeItems.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded income items:', incomeItems);
        return true;
    } catch (error) {
        console.error('Error loading income items from Firebase:', error);
        showToast('فشل تحميل بنود الإيرادات: ' + error.message, 'error');
        return false;
    }
}

// Load expense items from Firebase
async function loadExpenseItemsFromFirebase() {
    try {
        console.log('Loading expense items from Firebase...');
        
        const snapshot = await db.collection('expenseItems').get();
        expenseItems = [];
        
        snapshot.forEach(doc => {
            expenseItems.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded expense items:', expenseItems);
        return true;
    } catch (error) {
        console.error('Error loading expense items from Firebase:', error);
        showToast('فشل تحميل بنود المصروفات: ' + error.message, 'error');
        return false;
    }
}

// Load income categories from Firebase
async function loadIncomeCategoriesFromFirebase() {
    try {
        console.log('Loading income categories from Firebase...');
        
        const snapshot = await db.collection('incomeCategories').get();
        incomeCategories = [];
        
        snapshot.forEach(doc => {
            incomeCategories.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded income categories:', incomeCategories);
        return true;
    } catch (error) {
        console.error('Error loading income categories from Firebase:', error);
        showToast('فشل تحميل تصنيفات الإيرادات: ' + error.message, 'error');
        return false;
    }
}

// Load expense categories from Firebase
async function loadExpenseCategoriesFromFirebase() {
    try {
        console.log('Loading expense categories from Firebase...');
        
        const snapshot = await db.collection('expenseCategories').get();
        expenseCategories = [];
        
        snapshot.forEach(doc => {
            expenseCategories.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded expense categories:', expenseCategories);
        return true;
    } catch (error) {
        console.error('Error loading expense categories from Firebase:', error);
        showToast('فشل تحميل تصنيفات المصروفات: ' + error.message, 'error');
        return false;
    }
}

// Load debt customers from Firebase
async function loadDebtCustomersFromFirebase() {
    try {
        console.log('Loading debt customers from Firebase...');
        
        const snapshot = await db.collection('debtCustomers').get();
        debtCustomers = [];
        
        snapshot.forEach(doc => {
            debtCustomers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded debt customers:', debtCustomers);
        return true;
    } catch (error) {
        console.error('Error loading debt customers from Firebase:', error);
        showToast('فشل تحميل عملاء الديون: ' + error.message, 'error');
        return false;
    }
}

// Load debt transactions from Firebase
async function loadDebtTransactionsFromFirebase() {
    try {
        console.log('Loading debt transactions from Firebase...');
        
        const snapshot = await db.collection('debtTransactions').get();
        debtTransactions = [];
        
        snapshot.forEach(doc => {
            debtTransactions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded debt transactions:', debtTransactions);
        return true;
    } catch (error) {
        console.error('Error loading debt transactions from Firebase:', error);
        showToast('فشل تحميل معاملات الديون: ' + error.message, 'error');
        return false;
    }
}

// Load users from Firebase
async function loadUsersFromFirebase() {
    try {
        console.log('Loading users from Firebase...');
        
        const snapshot = await db.collection('users').get();
        users = [];
        
        snapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded users:', users);
        return true;
    } catch (error) {
        console.error('Error loading users from Firebase:', error);
        showToast('فشل تحميل المستخدمين: ' + error.message, 'error');
        return false;
    }
}

// Load data from Firebase
async function loadDataFromFirebase() {
    try {
        console.log('Loading data from Firebase...');
        
        // Check if Firebase is initialized
        if (!firebase.apps.length) {
            console.error('Firebase is not initialized');
            showToast('Firebase لم يتم تهيئته', 'error');
            return false;
        }
        
        // Load all data from Firebase
        await Promise.all([
            loadBankAccountsFromFirebase(),
            loadCashAccountsFromFirebase(),
            loadTransactionsFromFirebase(),
            loadIncomeItemsFromFirebase(),
            loadExpenseItemsFromFirebase(),
            loadIncomeCategoriesFromFirebase(),
            loadExpenseCategoriesFromFirebase(),
            loadDebtCustomersFromFirebase(),
            loadDebtTransactionsFromFirebase(),
            loadUsersFromFirebase()
        ]);
        
        console.log('All data loaded successfully from Firebase');
        return true;
    } catch (error) {
        console.error('Error loading data from Firebase:', error);
        showToast('حدث خطأ أثناء تحميل البيانات: ' + error.message, 'error');
        return false;
    }
}

// Setup real-time updates
function setupRealTimeUpdates() {
    // Bank accounts real-time updates
    db.collection('bankAccounts').onSnapshot((snapshot) => {
        console.log('Bank accounts updated in real-time');
        loadBankAccountsFromFirebase().then(() => {
            renderBankAccountsTable();
            updateAccountSelects();
            updateDashboard();
        });
    });
    
    // Cash accounts real-time updates
    db.collection('cashAccounts').onSnapshot((snapshot) => {
        console.log('Cash accounts updated in real-time');
        loadCashAccountsFromFirebase().then(() => {
            renderCashAccountsTable();
            updateAccountSelects();
            updateDashboard();
        });
    });
    
    // Transactions real-time updates
    db.collection('transactions').onSnapshot((snapshot) => {
        console.log('Transactions updated in real-time');
        loadTransactionsFromFirebase().then(() => {
            renderTransactionsList();
            updateDashboard();
        });
    });
    
    // Income items real-time updates
    db.collection('incomeItems').onSnapshot((snapshot) => {
        console.log('Income items updated in real-time');
        loadIncomeItemsFromFirebase().then(() => {
            renderIncomeList();
            updateDashboard();
        });
    });
    
    // Expense items real-time updates
    db.collection('expenseItems').onSnapshot((snapshot) => {
        console.log('Expense items updated in real-time');
        loadExpenseItemsFromFirebase().then(() => {
            renderExpenseList();
            updateDashboard();
        });
    });
    
    // Income categories real-time updates
    db.collection('incomeCategories').onSnapshot((snapshot) => {
        console.log('Income categories updated in real-time');
        loadIncomeCategoriesFromFirebase().then(() => {
            renderIncomeCategoriesList();
            updateCategorySelects();
        });
    });
    
    // Expense categories real-time updates
    db.collection('expenseCategories').onSnapshot((snapshot) => {
        console.log('Expense categories updated in real-time');
        loadExpenseCategoriesFromFirebase().then(() => {
            renderExpenseCategoriesList();
            updateCategorySelects();
        });
    });
    
    // Debt customers real-time updates
    db.collection('debtCustomers').onSnapshot((snapshot) => {
        console.log('Debt customers updated in real-time');
        loadDebtCustomersFromFirebase().then(() => {
            renderDebtCustomersList();
        });
    });
    
    // Debt transactions real-time updates
    db.collection('debtTransactions').onSnapshot((snapshot) => {
        console.log('Debt transactions updated in real-time');
        loadDebtTransactionsFromFirebase().then(() => {
            renderDebtCustomersList();
        });
    });
    
    // Users real-time updates
    db.collection('users').onSnapshot((snapshot) => {
        console.log('Users updated in real-time');
        loadUsersFromFirebase().then(() => {
            renderUsersTable();
        });
    });
}

// Update UI after loading data
function refreshUI() {
    console.log('Refreshing UI...');
    
    updateDashboard();
    updateIncomeSummary();
    updateExpenseSummary();
    updateDebtsSummary();
    renderBankAccountsTable();
    renderCashAccountsTable();
    renderTransactionsList();
    renderIncomeList();
    renderExpenseList();
    renderIncomeCategoriesList();
    renderExpenseCategoriesList();
    renderDebtCustomersList();
    renderUsersTable();
    updateAccountSelects();
    updateCategorySelects();
    updateCharts();
    
    console.log('UI refreshed successfully');
}

// Dashboard Functions
function updateDashboard() {
    // Calculate totals
    let totalBalanceYER = 0;
    let totalBalanceSAR = 0;
    let totalWealthYER = 0;
    let totalWealthSAR = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalSavings = 0;
    let totalDebtsOwed = 0;
    let totalDebtsOwe = 0;
    let totalDebts = 0;
    
    // Calculate account balances
    bankAccounts.forEach(account => {
        totalBalanceYER += account.balanceYER || 0;
        totalBalanceSAR += account.balanceSAR || 0;
        totalWealthYER += account.balanceYER || 0;
        totalWealthSAR += account.balanceSAR || 0;
    });
    
    cashAccounts.forEach(account => {
        totalBalanceYER += account.balanceYER || 0;
        totalBalanceSAR += account.balanceSAR || 0;
        totalWealthYER += account.balanceYER || 0;
        totalWealthSAR += account.balanceSAR || 0;
    });
    
    // Calculate debt balances
    debtTransactions.forEach(transaction => {
        if (transaction.type === 'owed') {
            totalDebtsOwed += transaction.amount || 0;
        } else {
            totalDebtsOwe += transaction.amount || 0;
        }
    });
    
    // Calculate total debts (owed - owe)
    totalDebts = totalDebtsOwed - totalDebtsOwe;
    
    // Calculate total wealth (including debts)
    totalWealthYER += totalDebts;
    
    // Calculate income and expenses (excluding debts)
    transactions.forEach(transaction => {
        if (transaction.type === 'income' && transaction.category !== 'debt') {
            totalIncome += transaction.amount || 0;
        } else if (transaction.type === 'expense' && transaction.category !== 'debt') {
            totalExpenses += transaction.amount || 0;
        }
    });
    
    // Calculate savings
    totalSavings = totalIncome - totalExpenses;
    
    // Update UI
    const totalWealthYERElement = document.getElementById('totalWealthYER');
    if (totalWealthYERElement) totalWealthYERElement.innerHTML = `${totalWealthYER.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const totalBalanceYERElement = document.getElementById('totalBalanceYER');
    if (totalBalanceYERElement) totalBalanceYERElement.innerHTML = `${totalBalanceYER.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const totalBalanceSARElement = document.getElementById('totalBalanceSAR');
    if (totalBalanceSARElement) totalBalanceSARElement.innerHTML = `${totalBalanceSAR.toLocaleString()} <span class="currency-saudi">SAR</span>`;
    
    const totalIncomeElement = document.getElementById('totalIncome');
    if (totalIncomeElement) totalIncomeElement.innerHTML = `${totalIncome.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const totalExpensesElement = document.getElementById('totalExpenses');
    if (totalExpensesElement) totalExpensesElement.innerHTML = `${totalExpenses.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const totalSavingsElement = document.getElementById('totalSavings');
    if (totalSavingsElement) totalSavingsElement.innerHTML = `${totalSavings.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const totalDebtsElement = document.getElementById('totalDebts');
    if (totalDebtsElement) totalDebtsElement.innerHTML = `${totalDebts.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    // Update financial indicators
    updateFinancialIndicators();
    
    // Update recent transactions
    renderRecentTransactions();
}

// Update Financial Indicators
function updateFinancialIndicators() {
    // Calculate totals for indicators
    let totalBankYER = 0;
    let totalBankSAR = 0;
    let totalCashYER = 0;
    let totalCashSAR = 0;
    let totalWealth = 0;
    let totalDebtsOwed = 0;
    let totalDebtsOwe = 0;
    
    // Calculate bank balances
    bankAccounts.forEach(account => {
        totalBankYER += account.balanceYER || 0;
        totalBankSAR += account.balanceSAR || 0;
    });
    
    // Calculate cash balances
    cashAccounts.forEach(account => {
        totalCashYER += account.balanceYER || 0;
        totalCashSAR += account.balanceSAR || 0;
    });
    
    // Calculate total wealth
    totalWealth = totalBankYER + totalCashYER + (totalBankSAR + totalCashSAR) * 140; // Convert SAR to YER
    
    // Calculate debt balances
    debtTransactions.forEach(transaction => {
        if (transaction.type === 'owed') {
            totalDebtsOwed += transaction.amount || 0;
        } else {
            totalDebtsOwe += transaction.amount || 0;
        }
    });
    
    // Update UI
    const totalWealthIndicator = document.getElementById('totalWealthIndicator');
    if (totalWealthIndicator) totalWealthIndicator.innerHTML = `${totalWealth.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const totalBankYERIndicator = document.getElementById('totalBankYERIndicator');
    if (totalBankYERIndicator) totalBankYERIndicator.innerHTML = `${totalBankYER.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const totalBankSARIndicator = document.getElementById('totalBankSARIndicator');
    if (totalBankSARIndicator) totalBankSARIndicator.innerHTML = `${totalBankSAR.toLocaleString()} <span class="currency-saudi">SAR</span>`;
    
    const totalCashYERIndicator = document.getElementById('totalCashYERIndicator');
    if (totalCashYERIndicator) totalCashYERIndicator.innerHTML = `${totalCashYER.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const totalCashSARIndicator = document.getElementById('totalCashSARIndicator');
    if (totalCashSARIndicator) totalCashSARIndicator.innerHTML = `${totalCashSAR.toLocaleString()} <span class="currency-saudi">SAR</span>`;
    
    // Update debt indicator with sign
    const debtAmount = Math.abs(totalDebtsOwed - totalDebtsOwe);
    const debtSign = totalDebtsOwed > totalDebtsOwe ? '+' : '-';
    const debtSignClass = totalDebtsOwed > totalDebtsOwe ? 'positive-indicator' : 'negative-indicator';
    
    const debtAmountElement = document.getElementById('debtAmount');
    if (debtAmountElement) debtAmountElement.textContent = debtAmount.toLocaleString();
    
    const debtSignElement = document.getElementById('debtSign');
    if (debtSignElement) {
        debtSignElement.textContent = debtSign;
        debtSignElement.className = `ms-2 ${debtSignClass}`;
    }
}

// Update Income Summary
function updateIncomeSummary() {
    // Calculate income by source
    let labSalaryTotal = 0;
    let teachingSalaryTotal = 0;
    let freelanceIncomeTotal = 0;
    
    incomeItems.forEach(income => {
        if (income.source === 'lab') {
            labSalaryTotal += income.amount || 0;
        } else if (income.source === 'teaching') {
            teachingSalaryTotal += income.amount || 0;
        } else if (income.source === 'freelance') {
            freelanceIncomeTotal += income.amount || 0;
        }
    });
    
    // Update UI
    const labSalary = document.getElementById('labSalary');
    if (labSalary) labSalary.innerHTML = `${labSalaryTotal.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const teachingSalary = document.getElementById('teachingSalary');
    if (teachingSalary) teachingSalary.innerHTML = `${teachingSalaryTotal.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const freelanceIncome = document.getElementById('freelanceIncome');
    if (freelanceIncome) freelanceIncome.innerHTML = `${freelanceIncomeTotal.toLocaleString()} <span class="currency-yemen">YER</span>`;
}

// Update Expense Summary
function updateExpenseSummary() {
    // Calculate expenses by category
    let rentExpenseTotal = 0;
    let shoppingExpenseTotal = 0;
    let utilitiesExpenseTotal = 0;
    let marriageExpenseTotal = 0;
    
    expenseItems.forEach(expense => {
        if (expense.category === 'rent') {
            rentExpenseTotal += expense.amount || 0;
        } else if (expense.category === 'shopping') {
            shoppingExpenseTotal += expense.amount || 0;
        } else if (expense.category === 'utilities') {
            utilitiesExpenseTotal += expense.amount || 0;
        } else if (expense.category === 'marriage') {
            marriageExpenseTotal += expense.amount || 0;
        }
    });
    
    // Update UI
    const rentExpense = document.getElementById('rentExpense');
    if (rentExpense) rentExpense.innerHTML = `${rentExpenseTotal.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const shoppingExpense = document.getElementById('shoppingExpense');
    if (shoppingExpense) shoppingExpense.innerHTML = `${shoppingExpenseTotal.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const utilitiesExpense = document.getElementById('utilitiesExpense');
    if (utilitiesExpense) utilitiesExpense.innerHTML = `${utilitiesExpenseTotal.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const marriageExpense = document.getElementById('marriageExpense');
    if (marriageExpense) marriageExpense.innerHTML = `${marriageExpenseTotal.toLocaleString()} <span class="currency-yemen">YER</span>`;
}

// Update Debts Summary
function updateDebtsSummary() {
    // Calculate debts
    let debtsOwedTotal = 0;
    let debtsOweTotal = 0;
    
    debtTransactions.forEach(transaction => {
        if (transaction.type === 'owed') {
            debtsOwedTotal += transaction.amount || 0;
        } else {
            debtsOweTotal += transaction.amount || 0;
        }
    });
    
    // Update UI
    const debtsOwed = document.getElementById('debtsOwed');
    if (debtsOwed) debtsOwed.innerHTML = `${debtsOwedTotal.toLocaleString()} <span class="currency-yemen">YER</span>`;
    
    const debtsOwe = document.getElementById('debtsOwe');
    if (debtsOwe) debtsOwe.innerHTML = `${debtsOweTotal.toLocaleString()} <span class="currency-yemen">YER</span>`;
}

// Render Recent Transactions
function renderRecentTransactions() {
    const recentTransactionsList = document.getElementById('recentTransactionsList');
    if (!recentTransactionsList) return;
    
    recentTransactionsList.innerHTML = '';
    
    // Get the 5 most recent transactions
    const recentTransactions = [...transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    recentTransactions.forEach(transaction => {
        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item';
        
        let accountName = '';
        let accountType = '';
        
        if (transaction.account) {
            if (transaction.account.startsWith('bank-')) {
                const accountId = transaction.account.replace('bank-', '');
                const account = bankAccounts.find(a => a.id === accountId);
                if (account) {
                    accountName = account.name;
                    accountType = 'badge-bank';
                }
            } else if (transaction.account.startsWith('cash-')) {
                const accountId = transaction.account.replace('cash-', '');
                const account = cashAccounts.find(a => a.id === accountId);
                if (account) {
                    if (account.location === 'me') accountName = 'نقدي (لدي)';
                    else if (account.location === 'mom') accountName = 'نقدي (لدى أمي)';
                    else if (account.location === 'wife') accountName = 'نقدي (لدى زوجتي)';
                    else accountName = `نقدي (${account.otherLocation})`;
                    accountType = 'badge-cash';
                }
            }
        }
        
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('ar-EG');
        
        const amountClass = transaction.type === 'income' ? 'income' : 'expense';
        const amountPrefix = transaction.type === 'income' ? '+' : '-';
        
        let badges = `<span class="account-badge ${accountType}">${accountType === 'badge-bank' ? 'بنكي' : accountType === 'badge-cash' ? 'نقدي' : 'ديون'}</span>`;
        
        if (transaction.type === 'transfer') {
            badges = `<span class="account-badge badge-bank">تحويل</span>`;
        }
        
        transactionItem.innerHTML = `
            <div>
                <div class="fw-bold">${transaction.description}</div>
                <small class="text-muted">${accountName} - ${formattedDate}</small>
            </div>
            <div class="d-flex align-items-center">
                ${badges}
                <div class="transaction-amount ${amountClass}">${amountPrefix}${transaction.amount.toLocaleString()} <span class="currency-${transaction.currency === 'YER' ? 'yemen' : 'saudi'}">${transaction.currency}</span></div>
            </div>
        `;
        
        recentTransactionsList.appendChild(transactionItem);
    });
}

// Render Bank Accounts Table
function renderBankAccountsTable() {
    const bankAccountsTableBody = document.getElementById('bank-accounts-table-body');
    if (!bankAccountsTableBody) {
        console.error('Bank accounts table body not found');
        return;
    }
    
    bankAccountsTableBody.innerHTML = '';
    
    console.log('Rendering bank accounts:', bankAccounts);
    
    if (bankAccounts.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="5" class="text-center">لا توجد حسابات بنكية مضافة</td>
        `;
        bankAccountsTableBody.appendChild(emptyRow);
        return;
    }
    
    bankAccounts.forEach(account => {
        const row = document.createElement('tr');
        
        const accountTypeText = account.type === 'current' ? 'حساب جاري' : 
                                account.type === 'savings' ? 'حساب توفير' : 
                                account.type === 'investment' ? 'حساب استثماري' : account.type;
        
        row.innerHTML = `
            <td>${account.name}</td>
            <td>${accountTypeText}</td>
            <td>${(account.balanceYER || 0).toLocaleString()} <span class="currency-yemen">YER</span></td>
            <td>${(account.balanceSAR || 0).toLocaleString()} <span class="currency-saudi">SAR</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1 edit-bank-account-btn" data-id="${account.id}"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger delete-bank-account-btn" data-id="${account.id}"><i class="bi bi-trash"></i></button>
            </td>
        `;
        
        bankAccountsTableBody.appendChild(row);
    });
}

// Render Cash Accounts Table
function renderCashAccountsTable() {
    const cashAccountsTableBody = document.getElementById('cash-accounts-table-body');
    if (!cashAccountsTableBody) {
        console.error('Cash accounts table body not found');
        return;
    }
    
    cashAccountsTableBody.innerHTML = '';
    
    console.log('Rendering cash accounts:', cashAccounts);
    
    if (cashAccounts.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="4" class="text-center">لا توجد حسابات نقدية مضافة</td>
        `;
        cashAccountsTableBody.appendChild(emptyRow);
        return;
    }
    
    cashAccounts.forEach(account => {
        const row = document.createElement('tr');
        
        let locationText = '';
        if (account.location === 'me') locationText = 'لدي';
        else if (account.location === 'mom') locationText = 'لدى أمي';
        else if (account.location === 'wife') locationText = 'لدى زوجتي';
        else locationText = account.otherLocation || 'آخر';
        
        row.innerHTML = `
            <td>${locationText}</td>
            <td>${(account.balanceYER || 0).toLocaleString()} <span class="currency-yemen">YER</span></td>
            <td>${(account.balanceSAR || 0).toLocaleString()} <span class="currency-saudi">SAR</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1 edit-cash-account-btn" data-id="${account.id}"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger delete-cash-account-btn" data-id="${account.id}"><i class="bi bi-trash"></i></button>
            </td>
        `;
        
        cashAccountsTableBody.appendChild(row);
    });
}

// Render Transactions List
function renderTransactionsList() {
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList) return;
    
    transactionsList.innerHTML = '';
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedTransactions.forEach(transaction => {
        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item';
        
        let accountName = '';
        let accountType = '';
        
        if (transaction.account) {
            if (transaction.account.startsWith('bank-')) {
                const accountId = transaction.account.replace('bank-', '');
                const account = bankAccounts.find(a => a.id === accountId);
                if (account) {
                    accountName = account.name;
                    accountType = 'badge-bank';
                }
            } else if (transaction.account.startsWith('cash-')) {
                const accountId = transaction.account.replace('cash-', '');
                const account = cashAccounts.find(a => a.id === accountId);
                if (account) {
                    if (account.location === 'me') accountName = 'نقدي (لدي)';
                    else if (account.location === 'mom') accountName = 'نقدي (لدى أمي)';
                    else if (account.location === 'wife') accountName = 'نقدي (لدى زوجتي)';
                    else accountName = `نقدي (${account.otherLocation})`;
                    accountType = 'badge-cash';
                }
            }
        }
        
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('ar-EG');
        
        let amountClass = '';
        let amountPrefix = '';
        
        if (transaction.type === 'income') {
            amountClass = 'income';
            amountPrefix = '+';
        } else if (transaction.type === 'expense') {
            amountClass = 'expense';
            amountPrefix = '-';
        } else if (transaction.type === 'transfer') {
            amountClass = '';
            amountPrefix = '';
        }
        
        let badges = `<span class="account-badge ${accountType}">${accountType === 'badge-bank' ? 'بنكي' : accountType === 'badge-cash' ? 'نقدي' : 'ديون'}</span>`;
        
        if (transaction.type === 'transfer') {
            badges = `<span class="account-badge badge-bank">تحويل</span>`;
        }
        
        transactionItem.innerHTML = `
            <div>
                <div class="fw-bold">${transaction.description}</div>
                <small class="text-muted">${accountName} - ${formattedDate}</small>
            </div>
            <div class="d-flex align-items-center">
                ${badges}
                <div class="transaction-amount ${amountClass}">${amountPrefix}${transaction.amount.toLocaleString()} <span class="currency-${transaction.currency === 'YER' ? 'yemen' : 'saudi'}">${transaction.currency}</span></div>
                <div class="ms-2">
                    <button class="btn btn-sm btn-outline-primary me-1 edit-transaction-btn" data-id="${transaction.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-transaction-btn" data-id="${transaction.id}"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        `;
        
        transactionsList.appendChild(transactionItem);
    });
}

// Render Income List
function renderIncomeList() {
    const incomeList = document.getElementById('incomeList');
    if (!incomeList) return;
    
    incomeList.innerHTML = '';
    
    // Sort income items by date (newest first)
    const sortedIncomeItems = [...incomeItems].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedIncomeItems.forEach(income => {
        const incomeItem = document.createElement('div');
        incomeItem.className = 'transaction-item';
        
        let accountName = '';
        let accountType = '';
        
        if (income.account.startsWith('bank-')) {
            const accountId = income.account.replace('bank-', '');
            const account = bankAccounts.find(a => a.id === accountId);
            if (account) {
                accountName = account.name;
                accountType = 'badge-bank';
            }
        } else if (income.account.startsWith('cash-')) {
            const accountId = income.account.replace('cash-', '');
            const account = cashAccounts.find(a => a.id === accountId);
            if (account) {
                if (account.location === 'me') accountName = 'نقدي (لدي)';
                else if (account.location === 'mom') accountName = 'نقدي (لدى أمي)';
                else if (account.location === 'wife') accountName = 'نقدي (لدى زوجتي)';
                else accountName = `نقدي (${account.otherLocation})`;
                accountType = 'badge-cash';
            }
        }
        
        const date = new Date(income.date);
        const formattedDate = date.toLocaleDateString('ar-EG');
        
        let sourceText = income.categoryName || '';
        if (!sourceText) {
            if (income.source === 'lab') sourceText = 'راتب المختبرات';
            else if (income.source === 'teaching') sourceText = 'راتب التدريس';
            else if (income.source === 'freelance') sourceText = 'عمل حر';
            else if (income.source === 'consulting') sourceText = 'استشارات';
            else if (income.source === 'investment') sourceText = 'دخل استثماري';
            else if (income.source === 'gift') sourceText = 'هدايا';
            else sourceText = 'أخرى';
        }
        
        incomeItem.innerHTML = `
            <div>
                <div class="fw-bold">${income.description}</div>
                <small class="text-muted">${sourceText} - ${accountName} - ${formattedDate}</small>
            </div>
            <div class="d-flex align-items-center">
                <span class="account-badge ${accountType}">${accountType === 'badge-bank' ? 'بنكي' : accountType === 'badge-cash' ? 'نقدي' : 'ديون'}</span>
                <div class="transaction-amount income">+${income.amount.toLocaleString()} <span class="currency-${income.currency === 'YER' ? 'yemen' : 'saudi'}">${income.currency}</span></div>
                <div class="ms-2">
                    <button class="btn btn-sm btn-outline-primary me-1 edit-income-btn" data-id="${income.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-income-btn" data-id="${income.id}"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        `;
        
        incomeList.appendChild(incomeItem);
    });
}

// Render Expense List
function renderExpenseList() {
    const expenseList = document.getElementById('expenseList');
    if (!expenseList) return;
    
    expenseList.innerHTML = '';
    
    // Sort expense items by date (newest first)
    const sortedExpenseItems = [...expenseItems].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedExpenseItems.forEach(expense => {
        const expenseItem = document.createElement('div');
        expenseItem.className = 'transaction-item';
        
        let accountName = '';
        let accountType = '';
        
        if (expense.account.startsWith('bank-')) {
            const accountId = expense.account.replace('bank-', '');
            const account = bankAccounts.find(a => a.id === accountId);
            if (account) {
                accountName = account.name;
                accountType = 'badge-bank';
            }
        } else if (expense.account.startsWith('cash-')) {
            const accountId = expense.account.replace('cash-', '');
            const account = cashAccounts.find(a => a.id === accountId);
            if (account) {
                if (account.location === 'me') accountName = 'نقدي (لدي)';
                else if (account.location === 'mom') accountName = 'نقدي (لدى أمي)';
                else if (account.location === 'wife') accountName = 'نقدي (لدى زوجتي)';
                else accountName = `نقدي (${account.otherLocation})`;
                accountType = 'badge-cash';
            }
        }
        
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString('ar-EG');
        
        let categoryText = expense.categoryName || '';
        if (!categoryText) {
            if (expense.category === 'rent') categoryText = 'إيجار';
            else if (expense.category === 'shopping') categoryText = 'مشتريات منزل';
            else if (expense.category === 'utilities') categoryText = 'فواتير';
            else if (expense.category === 'food') categoryText = 'طعام';
            else if (expense.category === 'transport') categoryText = 'مواصلات';
            else if (expense.category === 'health') categoryText = 'صحة';
            else if (expense.category === 'education') categoryText = 'تعليم';
            else if (expense.category === 'marriage') categoryText = 'زواج';
            else if (expense.category === 'building') categoryText = 'بناء';
            else if (expense.category === 'occasions') categoryText = 'مناسبات';
            else categoryText = 'أخرى';
        }
        
        expenseItem.innerHTML = `
            <div>
                <div class="fw-bold">${expense.description}</div>
                <small class="text-muted">${categoryText} - ${accountName} - ${formattedDate}</small>
            </div>
            <div class="d-flex align-items-center">
                <span class="account-badge ${accountType}">${accountType === 'badge-bank' ? 'بنكي' : accountType === 'badge-cash' ? 'نقدي' : 'ديون'}</span>
                <div class="transaction-amount expense">-${expense.amount.toLocaleString()} <span class="currency-${expense.currency === 'YER' ? 'yemen' : 'saudi'}">${expense.currency}</span></div>
                <div class="ms-2">
                    <button class="btn btn-sm btn-outline-primary me-1 edit-expense-btn" data-id="${expense.id}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-expense-btn" data-id="${expense.id}"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        `;
        
        expenseList.appendChild(expenseItem);
    });
}

// Render Income Categories List
function renderIncomeCategoriesList() {
    const incomeCategoriesList = document.getElementById('incomeCategoriesList');
    if (!incomeCategoriesList) return;
    
    incomeCategoriesList.innerHTML = '';
    
    incomeCategories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        
        categoryItem.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="category-color" style="background-color: ${category.color}"></div>
                <div>
                    <div class="fw-bold">${category.name}</div>
                    <small class="text-muted">${category.description}</small>
                </div>
            </div>
            <div>
                <button class="btn btn-sm btn-outline-primary me-1 edit-income-category-btn" data-id="${category.id}"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger delete-income-category-btn" data-id="${category.id}"><i class="bi bi-trash"></i></button>
            </div>
        `;
        
        incomeCategoriesList.appendChild(categoryItem);
    });
}

// Render Expense Categories List
function renderExpenseCategoriesList() {
    const expenseCategoriesList = document.getElementById('expenseCategoriesList');
    if (!expenseCategoriesList) return;
    
    expenseCategoriesList.innerHTML = '';
    
    expenseCategories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        
        categoryItem.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="category-color" style="background-color: ${category.color}"></div>
                <div>
                    <div class="fw-bold">${category.name}</div>
                    <small class="text-muted">${category.description}</small>
                </div>
            </div>
            <div>
                <button class="btn btn-sm btn-outline-primary me-1 edit-expense-category-btn" data-id="${category.id}"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger delete-expense-category-btn" data-id="${category.id}"><i class="bi bi-trash"></i></button>
            </div>
        `;
        
        expenseCategoriesList.appendChild(categoryItem);
    });
}

// Render Debt Customers List
function renderDebtCustomersList() {
    const debtCustomersList = document.getElementById('debtCustomersList');
    if (!debtCustomersList) return;
    
    debtCustomersList.innerHTML = '';
    
    // Calculate customer balances
    const customerBalances = {};
    
    // Initialize customer balances
    debtCustomers.forEach(customer => {
        customerBalances[customer.id] = {
            owed: 0,
            owe: 0,
            net: 0
        };
    });
    
    // Calculate balances from transactions
    debtTransactions.forEach(transaction => {
        if (customerBalances[transaction.customerId]) {
            if (transaction.type === 'owed') {
                customerBalances[transaction.customerId].owed += transaction.amount || 0;
            } else {
                customerBalances[transaction.customerId].owe += transaction.amount || 0;
            }
            
            // Calculate net balance
            customerBalances[transaction.customerId].net = 
                customerBalances[transaction.customerId].owed - customerBalances[transaction.customerId].owe;
        }
    });
    
    // Render customer cards
    debtCustomers.forEach(customer => {
        const balance = customerBalances[customer.id];
        const netBalanceClass = balance.net >= 0 ? 'positive' : 'negative';
        const netBalanceText = balance.net >= 0 ? `+${balance.net.toLocaleString()}` : `${balance.net.toLocaleString()}`;
        
        const customerCard = document.createElement('div');
        customerCard.className = 'debt-customer-card';
        
        customerCard.innerHTML = `
            <div class="debt-customer-header">
                <div class="debt-customer-name">${customer.name}</div>
                <div class="debt-customer-contact">${customer.phone}</div>
            </div>
            <div class="debt-customer-balance">
                <div>
                    <div class="debt-balance-positive">له: ${(balance.owed || 0).toLocaleString()} YER</div>
                    <div class="debt-balance-negative">عليه: ${(balance.owe || 0).toLocaleString()} YER</div>
                </div>
                <div class="debt-balance-net ${netBalanceClass}">${netBalanceText} YER</div>
            </div>
            <div class="debt-customer-actions">
                <button class="btn btn-sm btn-outline-primary view-debt-customer-btn" data-id="${customer.id}"><i class="bi bi-eye"></i> عرض</button>
                <button class="btn btn-sm btn-outline-primary add-debt-transaction-btn" data-id="${customer.id}"><i class="bi bi-plus-circle"></i> إضافة معاملة</button>
                <button class="btn btn-sm btn-outline-danger delete-debt-customer-btn" data-id="${customer.id}"><i class="bi bi-trash"></i> حذف</button>
            </div>
        `;
        
        debtCustomersList.appendChild(customerCard);
    });
}

// Render Users Table - Now showing message that user management is handled by Firebase Console
function renderUsersTable() {
    const usersTableBody = document.getElementById('usersTableBody');
    if (!usersTableBody) return;
    
    usersTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle-fill"></i> 
                    إدارة المستخدمين تتم الآن عبر Firebase Console
                    <br>
                    <small>يمكنك إضافة المستخدمين وتعديل صلاحياتهم من هناك</small>
                </div>
            </td>
        </tr>
    `;
}

// Update Account Selects
function updateAccountSelects() {
    // Update transaction account selects
    const fromAccountSelect = document.getElementById('fromAccount');
    const toAccountSelect = document.getElementById('toAccount');
    const transactionAccountSelect = document.getElementById('transactionFilterAccount');
    
    // Clear existing options
    if (fromAccountSelect) fromAccountSelect.innerHTML = '<option selected>اختر الحساب</option>';
    if (toAccountSelect) toAccountSelect.innerHTML = '<option selected>اختر الحساب</option>';
    if (transactionAccountSelect) transactionAccountSelect.innerHTML = '<option selected>جميع الحسابات</option>';
    
    // Add bank accounts
    bankAccounts.forEach(account => {
        if (fromAccountSelect) {
            const option1 = document.createElement('option');
            option1.value = `bank-${account.id}`;
            option1.textContent = account.name;
            fromAccountSelect.appendChild(option1);
        }
        
        if (toAccountSelect) {
            const option2 = document.createElement('option');
            option2.value = `bank-${account.id}`;
            option2.textContent = account.name;
            toAccountSelect.appendChild(option2);
        }
        
        if (transactionAccountSelect) {
            const option3 = document.createElement('option');
            option3.value = `bank-${account.id}`;
            option3.textContent = account.name;
            transactionAccountSelect.appendChild(option3);
        }
    });
    
    // Add cash accounts
    cashAccounts.forEach(account => {
        let locationText = '';
        if (account.location === 'me') locationText = 'نقدي (لدي)';
        else if (account.location === 'mom') locationText = 'نقدي (لدى أمي)';
        else if (account.location === 'wife') locationText = 'نقدي (لدى زوجتي)';
        else locationText = `نقدي (${account.otherLocation})`;
        
        if (fromAccountSelect) {
            const option1 = document.createElement('option');
            option1.value = `cash-${account.id}`;
            option1.textContent = locationText;
            fromAccountSelect.appendChild(option1);
        }
        
        if (toAccountSelect) {
            const option2 = document.createElement('option');
            option2.value = `cash-${account.id}`;
            option2.textContent = locationText;
            toAccountSelect.appendChild(option2);
        }
        
        if (transactionAccountSelect) {
            const option3 = document.createElement('option');
            option3.value = `cash-${account.id}`;
            option3.textContent = locationText;
            transactionAccountSelect.appendChild(option3);
        }
    });
    
    // Update income account select
    const incomeAccountSelect = document.getElementById('incomeAccount');
    if (incomeAccountSelect) {
        incomeAccountSelect.innerHTML = '<option selected>اختر الحساب</option>';
        
        // Add bank accounts
        bankAccounts.forEach(account => {
            const option = document.createElement('option');
            option.value = `bank-${account.id}`;
            option.textContent = account.name;
            incomeAccountSelect.appendChild(option);
        });
        
        // Add cash accounts
        cashAccounts.forEach(account => {
            let locationText = '';
            if (account.location === 'me') locationText = 'نقدي (لدي)';
            else if (account.location === 'mom') locationText = 'نقدي (لدى أمي)';
            else if (account.location === 'wife') locationText = 'نقدي (لدى زوجتي)';
            else locationText = `نقدي (${account.otherLocation})`;
            
            const option = document.createElement('option');
            option.value = `cash-${account.id}`;
            option.textContent = locationText;
            incomeAccountSelect.appendChild(option);
        });
    }
    
    // Update expense account select
    const expenseAccountSelect = document.getElementById('expenseAccount');
    if (expenseAccountSelect) {
        expenseAccountSelect.innerHTML = '<option selected>اختر الحساب</option>';
        
        // Add bank accounts
        bankAccounts.forEach(account => {
            const option = document.createElement('option');
            option.value = `bank-${account.id}`;
            option.textContent = account.name;
            expenseAccountSelect.appendChild(option);
        });
        
        // Add cash accounts
        cashAccounts.forEach(account => {
            let locationText = '';
            if (account.location === 'me') locationText = 'نقدي (لدي)';
            else if (account.location === 'mom') locationText = 'نقدي (لدى أمي)';
            else if (account.location === 'wife') locationText = 'نقدي (لدى زوجتي)';
            else locationText = `نقدي (${account.otherLocation})`;
            
            const option = document.createElement('option');
            option.value = `cash-${account.id}`;
            option.textContent = locationText;
            expenseAccountSelect.appendChild(option);
        });
    }
}

// Update Category Selects
function updateCategorySelects() {
    // Update income source select
    const incomeSourceSelect = document.getElementById('incomeSource');
    if (incomeSourceSelect) {
        incomeSourceSelect.innerHTML = '<option selected>اختر مصدر الإيراد</option>';
        
        incomeCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            incomeSourceSelect.appendChild(option);
        });
    }
    
    // Update expense category select
    const expenseCategorySelect = document.getElementById('expenseCategory');
    if (expenseCategorySelect) {
        expenseCategorySelect.innerHTML = '<option selected>اختر فئة المصروف</option>';
        
        expenseCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            expenseCategorySelect.appendChild(option);
        });
    }
    
    // Update transaction category select
    const transactionCategorySelect = document.getElementById('transactionCategory');
    if (transactionCategorySelect) {
        transactionCategorySelect.innerHTML = '<option selected>اختر الفئة</option>';
        
        // Add income categories
        incomeCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            transactionCategorySelect.appendChild(option);
        });
        
        // Add expense categories
        expenseCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            transactionCategorySelect.appendChild(option);
        });
    }
}

// Update Charts
function updateCharts() {
    // Update expense distribution chart
    const expenseCtx = document.getElementById('expenseChart');
    if (expenseCtx) {
        // Calculate expenses by category
        const expensesByCategory = {};
        expenseItems.forEach(expense => {
            if (!expensesByCategory[expense.category]) {
                expensesByCategory[expense.category] = 0;
            }
            expensesByCategory[expense.category] += expense.amount || 0;
        });
        
        const labels = [];
        const data = [];
        const colors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d', '#0dcaf0', '#6610f2', '#d63384', '#fd7e14', '#20c997'];
        
        Object.keys(expensesByCategory).forEach((category, index) => {
            let label = '';
            if (category === 'rent') label = 'إيجار';
            else if (category === 'shopping') label = 'مشتريات منزل';
            else if (category === 'utilities') label = 'فواتير';
            else if (category === 'food') label = 'طعام';
            else if (category === 'transport') label = 'مواصلات';
            else if (category === 'health') label = 'صحة';
            else if (category === 'education') label = 'تعليم';
            else if (category === 'marriage') label = 'زواج';
            else if (category === 'building') label = 'بناء';
            else if (category === 'occasions') label = 'مناسبات';
            else label = 'أخرى';
            
            labels.push(label);
            data.push(expensesByCategory[category]);
        });
        
        // Check if chart already exists to avoid creating multiple instances
        if (window.expenseChartInstance) {
            window.expenseChartInstance.destroy();
        }
        
        window.expenseChartInstance = new Chart(expenseCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Update balance trend chart
    const balanceCtx = document.getElementById('balanceChart');
    if (balanceCtx) {
        // For simplicity, we'll use static data for the balance trend
        if (window.balanceChartInstance) {
            window.balanceChartInstance.destroy();
        }
        
        window.balanceChartInstance = new Chart(balanceCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو'],
                datasets: [{
                    label: 'الرصيد الشهري',
                    data: [950000, 1000000, 1050000, 1100000, 1150000, 1200000, 1245750],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }
    
    // Update income source chart
    const incomeSourceCtx = document.getElementById('incomeSourceChart');
    if (incomeSourceCtx) {
        // Calculate income by source
        const incomeBySource = {};
        incomeItems.forEach(income => {
            if (!incomeBySource[income.source]) {
                incomeBySource[income.source] = 0;
            }
            incomeBySource[income.source] += income.amount || 0;
        });
        
        const labels = [];
        const data = [];
        const colors = ['#0d6efd', '#198754', '#ffc107'];
        
        Object.keys(incomeBySource).forEach(source => {
            let label = '';
            if (source === 'lab') label = 'راتب المختبرات';
            else if (source === 'teaching') label = 'راتب التدريس';
            else if (source === 'freelance') label = 'عمل حر';
            else if (source === 'consulting') label = 'استشارات';
            else if (source === 'investment') label = 'دخل استثماري';
            else if (source === 'gift') label = 'هدايا';
            else label = 'أخرى';
            
            labels.push(label);
            data.push(incomeBySource[source]);
        });
        
        if (window.incomeSourceChartInstance) {
            window.incomeSourceChartInstance.destroy();
        }
        
        window.incomeSourceChartInstance = new Chart(incomeSourceCtx.getContext('2d'), {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Update expense category chart
    const expenseCategoryCtx = document.getElementById('expenseCategoryChart');
    if (expenseCategoryCtx) {
        // Reuse the expensesByCategory data from the expense chart
        const labels = [];
        const data = [];
        
        Object.keys(expensesByCategory).forEach(category => {
            let label = '';
            if (category === 'rent') label = 'إيجار';
            else if (category === 'shopping') label = 'مشتريات منزل';
            else if (category === 'utilities') label = 'فواتير';
            else if (category === 'food') label = 'طعام';
            else if (category === 'transport') label = 'مواصلات';
            else if (category === 'health') label = 'صحة';
            else if (category === 'education') label = 'تعليم';
            else if (category === 'marriage') label = 'زواج';
            else if (category === 'building') label = 'بناء';
            else if (category === 'occasions') label = 'مناسبات';
            else label = 'أخرى';
            
            labels.push(label);
            data.push(expensesByCategory[category]);
        });
        
        if (window.expenseCategoryChartInstance) {
            window.expenseCategoryChartInstance.destroy();
        }
        
        window.expenseCategoryChartInstance = new Chart(expenseCategoryCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'المصروفات',
                    data: data,
                    backgroundColor: '#dc3545'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Update wealth chart
    const wealthCtx = document.getElementById('wealthChart');
    if (wealthCtx) {
        // Calculate wealth data based on transactions
        const wealthData = [];
        const labels = [];
        
        // Get current date
        const currentDate = new Date();
        
        // Create data for the last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate);
            date.setMonth(date.getMonth() - i);
            
            const monthName = date.toLocaleDateString('ar-EG', { month: 'long' });
            labels.push(monthName);
            
            // Calculate wealth for this month (simplified for demo)
            // In a real app, this would be calculated from actual transaction data
            const baseWealth = 1000000; // Base wealth
            const randomVariation = Math.floor(Math.random() * 200000) - 100000; // Random variation
            wealthData.push(baseWealth + randomVariation + (i * 50000)); // Increasing trend
        }
        
        if (window.wealthChartInstance) {
            window.wealthChartInstance.destroy();
        }
        
        window.wealthChartInstance = new Chart(wealthCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'إجمالي الثروة',
                    data: wealthData,
                    borderColor: '#6f42c1',
                    backgroundColor: 'rgba(111, 66, 193, 0.1)',
                    fill: true,
                    tension: 0.4, // This makes the line curved
                    pointBackgroundColor: '#6f42c1',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#6f42c1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `الثروة: ${context.raw.toLocaleString()} YER`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + ' YER';
                            }
                        }
                    }
                }
            }
        });
    }
}

// Account Management Functions
async function editBankAccount(accountId) {
    try {
        const accountDoc = await db.collection('bankAccounts').doc(accountId).get();
        
        if (!accountDoc.exists) {
            showToast('الحساب البنكي غير موجود', 'error');
            return;
        }
        
        const account = accountDoc.data();
        
        // Fill the form with account data
        const editAccountId = document.getElementById('editAccountId');
        const editAccountType = document.getElementById('editAccountType');
        const editBankName = document.getElementById('editBankName');
        const editBankAccountType = document.getElementById('editBankAccountType');
        const editAccountNumber = document.getElementById('editAccountNumber');
        const editAccountBalanceYER = document.getElementById('editAccountBalanceYER');
        const editAccountBalanceSAR = document.getElementById('editAccountBalanceSAR');
        const editAccountNotes = document.getElementById('editAccountNotes');
        
        if (editAccountId) editAccountId.value = accountId;
        if (editAccountType) editAccountType.value = 'bank';
        if (editBankName) editBankName.value = account.name;
        if (editBankAccountType) editBankAccountType.value = account.type;
        if (editAccountNumber) editAccountNumber.value = account.number;
        if (editAccountBalanceYER) editAccountBalanceYER.value = account.balanceYER || 0;
        if (editAccountBalanceSAR) editAccountBalanceSAR.value = account.balanceSAR || 0;
        if (editAccountNotes) editAccountNotes.value = account.notes || '';
        
        // Show bank fields and hide cash fields
        const editBankFields = document.getElementById('editBankFields');
        const editCashFields = document.getElementById('editCashFields');
        
        if (editBankFields) editBankFields.classList.remove('d-none');
        if (editCashFields) editCashFields.classList.add('d-none');
        
        // Show the modal
        const editAccountModal = new bootstrap.Modal(document.getElementById('editAccountModal'));
        editAccountModal.show();
    } catch (error) {
        console.error('Error editing bank account: ', error);
        showToast('فشل تحرير الحساب البنكي: ' + error.message, 'error');
    }
}

async function editCashAccount(accountId) {
    try {
        const accountDoc = await db.collection('cashAccounts').doc(accountId).get();
        
        if (!accountDoc.exists) {
            showToast('الحساب النقدي غير موجود', 'error');
            return;
        }
        
        const account = accountDoc.data();
        
        // Fill the form with account data
        const editAccountId = document.getElementById('editAccountId');
        const editAccountType = document.getElementById('editAccountType');
        const editCashLocation = document.getElementById('editCashLocation');
        const editOtherLocation = document.getElementById('editOtherLocation');
        const editAccountBalanceYER = document.getElementById('editAccountBalanceYER');
        const editAccountBalanceSAR = document.getElementById('editAccountBalanceSAR');
        const editAccountNotes = document.getElementById('editAccountNotes');
        
        if (editAccountId) editAccountId.value = accountId;
        if (editAccountType) editAccountType.value = 'cash';
        if (editCashLocation) editCashLocation.value = account.location;
        if (editOtherLocation) editOtherLocation.value = account.otherLocation || '';
        if (editAccountBalanceYER) editAccountBalanceYER.value = account.balanceYER || 0;
        if (editAccountBalanceSAR) editAccountBalanceSAR.value = account.balanceSAR || 0;
        if (editAccountNotes) editAccountNotes.value = account.notes || '';
        
        // Show/hide other location field
        const editOtherLocationField = document.getElementById('editOtherLocationField');
        if (account.location === 'other' && editOtherLocationField) {
            editOtherLocationField.classList.remove('d-none');
        } else if (editOtherLocationField) {
            editOtherLocationField.classList.add('d-none');
        }
        
        // Show cash fields and hide bank fields
        const editBankFields = document.getElementById('editBankFields');
        const editCashFields = document.getElementById('editCashFields');
        
        if (editBankFields) editBankFields.classList.add('d-none');
        if (editCashFields) editCashFields.classList.remove('d-none');
        
        // Show the modal
        const editAccountModal = new bootstrap.Modal(document.getElementById('editAccountModal'));
        editAccountModal.show();
    } catch (error) {
        console.error('Error editing cash account: ', error);
        showToast('فشل تحرير الحساب النقدي: ' + error.message, 'error');
    }
}

async function deleteBankAccount(accountId) {
    try {
        const accountDoc = await db.collection('bankAccounts').doc(accountId).get();
        
        if (!accountDoc.exists) {
            showToast('الحساب البنكي غير موجود', 'error');
            return;
        }
        
        const account = accountDoc.data();
        
        showConfirmation(`هل أنت متأكد من حذف حساب "${account.name}"؟`, async function() {
            try {
                // Delete bank account from Firebase
                await db.collection('bankAccounts').doc(accountId).delete();
                
                // Update UI
                await loadBankAccountsFromFirebase();
                renderBankAccountsTable();
                updateAccountSelects();
                updateDashboard();
                
                showToast('تم حذف الحساب البنكي بنجاح');
            } catch (error) {
                console.error('Error deleting bank account: ', error);
                showToast('فشل حذف الحساب البنكي: ' + error.message, 'error');
            }
        });
    } catch (error) {
        console.error('Error deleting bank account: ', error);
        showToast('فشل حذف الحساب البنكي: ' + error.message, 'error');
    }
}

async function deleteCashAccount(accountId) {
    try {
        const accountDoc = await db.collection('cashAccounts').doc(accountId).get();
        
        if (!accountDoc.exists) {
            showToast('الحساب النقدي غير موجود', 'error');
            return;
        }
        
        const account = accountDoc.data();
        
        let locationText = '';
        if (account.location === 'me') locationText = 'نقدي (لدي)';
        else if (account.location === 'mom') locationText = 'نقدي (لدى أمي)';
        else if (account.location === 'wife') locationText = 'نقدي (لدى زوجتي)';
        else locationText = `نقدي (${account.otherLocation})`;
        
        showConfirmation(`هل أنت متأكد من حذف حساب "${locationText}"؟`, async function() {
            try {
                // Delete cash account from Firebase
                await db.collection('cashAccounts').doc(accountId).delete();
                
                // Update UI
                await loadCashAccountsFromFirebase();
                renderCashAccountsTable();
                updateAccountSelects();
                updateDashboard();
                
                showToast('تم حذف الحساب النقدي بنجاح');
            } catch (error) {
                console.error('Error deleting cash account: ', error);
                showToast('فشل حذف الحساب النقدي: ' + error.message, 'error');
            }
        });
    } catch (error) {
        console.error('Error deleting cash account: ', error);
        showToast('فشل حذف الحساب النقدي: ' + error.message, 'error');
    }
}

// Transaction Management Functions
async function editTransaction(transactionId) {
    try {
        const transactionDoc = await db.collection('transactions').doc(transactionId).get();
        
        if (!transactionDoc.exists) {
            showToast('المعاملة غير موجودة', 'error');
            return;
        }
        
        const transaction = transactionDoc.data();
        
        // Fill the form with transaction data
        const editTransactionId = document.getElementById('editTransactionId');
        const editTransactionType = document.getElementById('editTransactionType');
        const editTransactionDescription = document.getElementById('editTransactionDescription');
        const editTransactionDate = document.getElementById('editTransactionDate');
        const editTransactionCurrency = document.getElementById('editTransactionCurrency');
        const editTransactionAmount = document.getElementById('editTransactionAmount');
        const editTransactionNotes = document.getElementById('editTransactionNotes');
        
        if (editTransactionId) editTransactionId.value = transactionId;
        if (editTransactionType) editTransactionType.value = transaction.type;
        if (editTransactionDescription) editTransactionDescription.value = transaction.description;
        if (editTransactionDate) editTransactionDate.value = transaction.date;
        if (editTransactionCurrency) editTransactionCurrency.value = transaction.currency;
        if (editTransactionAmount) editTransactionAmount.value = transaction.amount;
        if (editTransactionNotes) editTransactionNotes.value = transaction.notes || '';
        
        // Set account
        const editTransactionAccount = document.getElementById('editTransactionAccount');
        if (transaction.account && editTransactionAccount) {
            editTransactionAccount.value = transaction.account;
        }
        
        // Set category if applicable
        const editTransactionCategory = document.getElementById('editTransactionCategory');
        const editTransactionCategoryField = document.getElementById('editTransactionCategoryField');
        
        if (transaction.category && editTransactionCategory) {
            editTransactionCategory.value = transaction.category;
            if (editTransactionCategoryField) editTransactionCategoryField.classList.remove('d-none');
        } else if (editTransactionCategoryField) {
            editTransactionCategoryField.classList.add('d-none');
        }
        
        // Show the modal
        const editTransactionModal = new bootstrap.Modal(document.getElementById('editTransactionModal'));
        editTransactionModal.show();
    } catch (error) {
        console.error('Error editing transaction: ', error);
        showToast('فشل تحرير المعاملة: ' + error.message, 'error');
    }
}

async function deleteTransaction(transactionId) {
    try {
        const transactionDoc = await db.collection('transactions').doc(transactionId).get();
        
        if (!transactionDoc.exists) {
            showToast('المعاملة غير موجودة', 'error');
            return;
        }
        
        const transaction = transactionDoc.data();
        
        showConfirmation(`هل أنت متأكد من حذف المعاملة "${transaction.description}"؟`, async function() {
            try {
                // Update account balance before deleting transaction
                await updateAccountBalanceInFirebase(
                    transaction.account, 
                    transaction.currency, 
                    transaction.amount, 
                    transaction.type === 'expense'
                );
                
                // Delete transaction from Firebase
                await db.collection('transactions').doc(transactionId).delete();
                
                // If this transaction is linked to an income or expense item, delete that too
                if (transaction.incomeId) {
                    await db.collection('incomeItems').doc(transaction.incomeId).delete();
                } else if (transaction.expenseId) {
                    await db.collection('expenseItems').doc(transaction.expenseId).delete();
                }
                
                // Update UI
                await loadTransactionsFromFirebase();
                await loadIncomeItemsFromFirebase();
                await loadExpenseItemsFromFirebase();
                renderTransactionsList();
                renderIncomeList();
                renderExpenseList();
                updateDashboard();
                
                showToast('تم حذف المعاملة بنجاح');
            } catch (error) {
                console.error('Error deleting transaction: ', error);
                showToast('فشل حذف المعاملة: ' + error.message, 'error');
            }
        });
    } catch (error) {
        console.error('Error deleting transaction: ', error);
        showToast('فشل حذف المعاملة: ' + error.message, 'error');
    }
}

// Income Management Functions
async function editIncome(incomeId) {
    try {
        const incomeDoc = await db.collection('incomeItems').doc(incomeId).get();
        
        if (!incomeDoc.exists) {
            showToast('بند الإيراد غير موجود', 'error');
            return;
        }
        
        const income = incomeDoc.data();
        
        // Fill the form with income data
        const editIncomeId = document.getElementById('editIncomeId');
        const editIncomeSource = document.getElementById('editIncomeSource');
        const editIncomeDescription = document.getElementById('editIncomeDescription');
        const editIncomeDate = document.getElementById('editIncomeDate');
        const editIncomeCurrency = document.getElementById('editIncomeCurrency');
        const editIncomeAmount = document.getElementById('editIncomeAmount');
        const editIncomeAccount = document.getElementById('editIncomeAccount');
        const editIncomeNotes = document.getElementById('editIncomeNotes');
        
        if (editIncomeId) editIncomeId.value = incomeId;
        if (editIncomeSource) editIncomeSource.value = income.source;
        if (editIncomeDescription) editIncomeDescription.value = income.description;
        if (editIncomeDate) editIncomeDate.value = income.date;
        if (editIncomeCurrency) editIncomeCurrency.value = income.currency;
        if (editIncomeAmount) editIncomeAmount.value = income.amount;
        if (editIncomeAccount) editIncomeAccount.value = income.account;
        if (editIncomeNotes) editIncomeNotes.value = income.notes || '';
        
        // Show the modal
        const editIncomeModal = new bootstrap.Modal(document.getElementById('editIncomeModal'));
        editIncomeModal.show();
    } catch (error) {
        console.error('Error editing income: ', error);
        showToast('فشل تحرير بند الإيراد: ' + error.message, 'error');
    }
}

async function deleteIncome(incomeId) {
    try {
        const incomeDoc = await db.collection('incomeItems').doc(incomeId).get();
        
        if (!incomeDoc.exists) {
            showToast('بند الإيراد غير موجود', 'error');
            return;
        }
        
        const income = incomeDoc.data();
        
        showConfirmation(`هل أنت متأكد من حذف الإيراد "${income.description}"؟`, async function() {
            try {
                // Update account balance before deleting income
                await updateAccountBalanceInFirebase(income.account, income.currency, income.amount, false);
                
                // Find and delete the corresponding transaction
                const transactionSnapshot = await db.collection('transactions')
                    .where('incomeId', '==', incomeId)
                    .get();
                
                const batch = db.batch();
                transactionSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                // Delete income item
                batch.delete(db.collection('incomeItems').doc(incomeId));
                
                // Commit the batch
                await batch.commit();
                
                // Update UI
                await loadIncomeItemsFromFirebase();
                await loadTransactionsFromFirebase();
                renderIncomeList();
                renderTransactionsList();
                updateDashboard();
                
                showToast('تم حذف الإيراد بنجاح');
            } catch (error) {
                console.error('Error deleting income: ', error);
                showToast('فشل حذف الإيراد: ' + error.message, 'error');
            }
        });
    } catch (error) {
        console.error('Error deleting income: ', error);
        showToast('فشل حذف الإيراد: ' + error.message, 'error');
    }
}

// Expense Management Functions
async function editExpense(expenseId) {
    try {
        const expenseDoc = await db.collection('expenseItems').doc(expenseId).get();
        
        if (!expenseDoc.exists) {
            showToast('بند المصروف غير موجود', 'error');
            return;
        }
        
        const expense = expenseDoc.data();
        
        // Fill the form with expense data
        const editExpenseId = document.getElementById('editExpenseId');
        const editExpenseCategory = document.getElementById('editExpenseCategory');
        const editExpenseDescription = document.getElementById('editExpenseDescription');
        const editExpenseDate = document.getElementById('editExpenseDate');
        const editExpenseCurrency = document.getElementById('editExpenseCurrency');
        const editExpenseAmount = document.getElementById('editExpenseAmount');
        const editExpenseAccount = document.getElementById('editExpenseAccount');
        const editExpenseNotes = document.getElementById('editExpenseNotes');
        
        if (editExpenseId) editExpenseId.value = expenseId;
        if (editExpenseCategory) editExpenseCategory.value = expense.category;
        if (editExpenseDescription) editExpenseDescription.value = expense.description;
        if (editExpenseDate) editExpenseDate.value = expense.date;
        if (editExpenseCurrency) editExpenseCurrency.value = expense.currency;
        if (editExpenseAmount) editExpenseAmount.value = expense.amount;
        if (editExpenseAccount) editExpenseAccount.value = expense.account;
        if (editExpenseNotes) editExpenseNotes.value = expense.notes || '';
        
        // Show the modal
        const editExpenseModal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
        editExpenseModal.show();
    } catch (error) {
        console.error('Error editing expense: ', error);
        showToast('فشل تحرير بند المصروف: ' + error.message, 'error');
    }
}

async function deleteExpense(expenseId) {
    try {
        const expenseDoc = await db.collection('expenseItems').doc(expenseId).get();
        
        if (!expenseDoc.exists) {
            showToast('بند المصروف غير موجود', 'error');
            return;
        }
        
        const expense = expenseDoc.data();
        
        showConfirmation(`هل أنت متأكد من حذف المصروف "${expense.description}"؟`, async function() {
            try {
                // Update account balance before deleting expense
                await updateAccountBalanceInFirebase(expense.account, expense.currency, expense.amount, true);
                
                // Find and delete the corresponding transaction
                const transactionSnapshot = await db.collection('transactions')
                    .where('expenseId', '==', expenseId)
                    .get();
                
                const batch = db.batch();
                transactionSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                // Delete expense item
                batch.delete(db.collection('expenseItems').doc(expenseId));
                
                // Commit the batch
                await batch.commit();
                
                // Update UI
                await loadExpenseItemsFromFirebase();
                await loadTransactionsFromFirebase();
                renderExpenseList();
                renderTransactionsList();
                updateDashboard();
                
                showToast('تم حذف المصروف بنجاح');
            } catch (error) {
                console.error('Error deleting expense: ', error);
                showToast('فشل حذف المصروف: ' + error.message, 'error');
            }
        });
    } catch (error) {
        console.error('Error deleting expense: ', error);
        showToast('فشل حذف المصروف: ' + error.message, 'error');
    }
}

// Category Management Functions
async function editIncomeCategory(categoryId) {
    try {
        const categoryDoc = await db.collection('incomeCategories').doc(categoryId).get();
        
        if (!categoryDoc.exists) {
            showToast('تصنيف الإيراد غير موجود', 'error');
            return;
        }
        
        const category = categoryDoc.data();
        
        // Fill the form with category data
        const editIncomeCategoryId = document.getElementById('editIncomeCategoryId');
        const editIncomeCategoryName = document.getElementById('editIncomeCategoryName');
        const editIncomeCategoryColor = document.getElementById('editIncomeCategoryColor');
        const editIncomeCategoryDescription = document.getElementById('editIncomeCategoryDescription');
        
        if (editIncomeCategoryId) editIncomeCategoryId.value = categoryId;
        if (editIncomeCategoryName) editIncomeCategoryName.value = category.name;
        if (editIncomeCategoryColor) editIncomeCategoryColor.value = category.color;
        if (editIncomeCategoryDescription) editIncomeCategoryDescription.value = category.description;
        
        // Show the modal
        const editIncomeCategoryModal = new bootstrap.Modal(document.getElementById('editIncomeCategoryModal'));
        editIncomeCategoryModal.show();
    } catch (error) {
        console.error('Error editing income category: ', error);
        showToast('فشل تحرير تصنيف الإيراد: ' + error.message, 'error');
    }
}

async function deleteIncomeCategory(categoryId) {
    try {
        const categoryDoc = await db.collection('incomeCategories').doc(categoryId).get();
        
        if (!categoryDoc.exists) {
            showToast('تصنيف الإيراد غير موجود', 'error');
            return;
        }
        
        const category = categoryDoc.data();
        
        showConfirmation(`هل أنت متأكد من حذف تصنيف "${category.name}"؟`, async function() {
            try {
                // Delete income category from Firebase
                await db.collection('incomeCategories').doc(categoryId).delete();
                
                // Update UI
                await loadIncomeCategoriesFromFirebase();
                renderIncomeCategoriesList();
                updateCategorySelects();
                
                showToast('تم حذف التصنيف بنجاح');
            } catch (error) {
                console.error('Error deleting income category: ', error);
                showToast('فشل حذف التصنيف: ' + error.message, 'error');
            }
        });
    } catch (error) {
        console.error('Error deleting income category: ', error);
        showToast('فشل حذف التصنيف: ' + error.message, 'error');
    }
}

async function editExpenseCategory(categoryId) {
    try {
        const categoryDoc = await db.collection('expenseCategories').doc(categoryId).get();
        
        if (!categoryDoc.exists) {
            showToast('تصنيف المصروف غير موجود', 'error');
            return;
        }
        
        const category = categoryDoc.data();
        
        // Fill the form with category data
        const editExpenseCategoryId = document.getElementById('editExpenseCategoryId');
        const editExpenseCategoryName = document.getElementById('editExpenseCategoryName');
        const editExpenseCategoryColor = document.getElementById('editExpenseCategoryColor');
        const editExpenseCategoryDescription = document.getElementById('editExpenseCategoryDescription');
        
        if (editExpenseCategoryId) editExpenseCategoryId.value = categoryId;
        if (editExpenseCategoryName) editExpenseCategoryName.value = category.name;
        if (editExpenseCategoryColor) editExpenseCategoryColor.value = category.color;
        if (editExpenseCategoryDescription) editExpenseCategoryDescription.value = category.description;
        
        // Show the modal
        const editExpenseCategoryModal = new bootstrap.Modal(document.getElementById('editExpenseCategoryModal'));
        editExpenseCategoryModal.show();
    } catch (error) {
        console.error('Error editing expense category: ', error);
        showToast('فشل تحرير تصنيف المصروف: ' + error.message, 'error');
    }
}

async function deleteExpenseCategory(categoryId) {
    try {
        const categoryDoc = await db.collection('expenseCategories').doc(categoryId).get();
        
        if (!categoryDoc.exists) {
            showToast('تصنيف المصروف غير موجود', 'error');
            return;
        }
        
        const category = categoryDoc.data();
        
        showConfirmation(`هل أنت متأكد من حذف تصنيف "${category.name}"؟`, async function() {
            try {
                // Delete expense category from Firebase
                await db.collection('expenseCategories').doc(categoryId).delete();
                
                // Update UI
                await loadExpenseCategoriesFromFirebase();
                renderExpenseCategoriesList();
                updateCategorySelects();
                
                showToast('تم حذف التصنيف بنجاح');
            } catch (error) {
                console.error('Error deleting expense category: ', error);
                showToast('فشل حذف التصنيف: ' + error.message, 'error');
            }
        });
    } catch (error) {
        console.error('Error deleting expense category: ', error);
        showToast('فشل حذف التصنيف: ' + error.message, 'error');
    }
}

// Debt Management Functions
async function viewDebtCustomer(customerId) {
    try {
        const customerDoc = await db.collection('debtCustomers').doc(customerId).get();
        
        if (!customerDoc.exists) {
            showToast('العميل غير موجود', 'error');
            return;
        }
        
        const customer = customerDoc.data();
        
        // Get customer transactions
        const transactionsSnapshot = await db.collection('debtTransactions')
            .where('customerId', '==', customerId)
            .get();
        
        const customerTransactions = [];
        transactionsSnapshot.forEach(doc => {
            customerTransactions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Calculate balances
        let owedTotal = 0;
        let oweTotal = 0;
        
        customerTransactions.forEach(transaction => {
            if (transaction.type === 'owed') {
                owedTotal += transaction.amount || 0;
            } else {
                oweTotal += transaction.amount || 0;
            }
        });
        
        const netBalance = owedTotal - oweTotal;
        const netBalanceClass = netBalance >= 0 ? 'positive' : 'negative';
        const netBalanceText = netBalance >= 0 ? `+${netBalance.toLocaleString()}` : `${netBalance.toLocaleString()}`;
        
        // Build customer details HTML
        const detailsHtml = `
            <div class="debt-customer-details">
                <div class="debt-customer-header">
                    <div class="debt-customer-name">${customer.name}</div>
                    <div class="debt-customer-contact">${customer.phone}</div>
                    ${customer.email ? `<div class="debt-customer-contact">${customer.email}</div>` : ''}
                    ${customer.address ? `<div class="debt-customer-contact">${customer.address}</div>` : ''}
                    ${customer.notes ? `<div class="debt-customer-contact">${customer.notes}</div>` : ''}
                </div>
                
                <div class="debt-customer-summary">
                    <div class="debt-summary-item">
                        <div class="debt-summary-value debt-balance-positive">${owedTotal.toLocaleString()} YER</div>
                        <div class="debt-summary-label">مديونية له</div>
                    </div>
                    <div class="debt-summary-item">
                        <div class="debt-summary-value debt-balance-negative">${oweTotal.toLocaleString()} YER</div>
                        <div class="debt-summary-label">مديونية عليك</div>
                    </div>
                    <div class="debt-summary-item">
                        <div class="debt-summary-value debt-balance-net ${netBalanceClass}">${netBalanceText} YER</div>
                        <div class="debt-summary-label">الصافي</div>
                    </div>
                </div>
                
                <ul class="nav nav-tabs" id="debtCustomerTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="transactions-tab" data-bs-toggle="tab" data-bs-target="#transactions" type="button" role="tab">المعاملات</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="details-tab" data-bs-toggle="tab" data-bs-target="#details" type="button" role="tab">التفاصيل</button>
                    </li>
                </ul>
                
                <div class="tab-content" id="debtCustomerTabsContent">
                    <div class="tab-pane fade show active" id="transactions" role="tabpanel">
                        <div class="debt-details-section">
                            <div class="debt-details-title">المعاملات المالية</div>
                            <div class="debt-details-content">
                                ${customerTransactions.length > 0 ? `
                                    <div class="table-responsive">
                                        <table class="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th>الوصف</th>
                                                    <th>النوع</th>
                                                    <th>المبلغ</th>
                                                    <th>التاريخ</th>
                                                    <th>الحالة</th>
                                                    <th>الإجراءات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${customerTransactions.map(transaction => {
                                                    const typeText = transaction.type === 'owed' ? 'دين له' : 'دين عليه';
                                                    const typeClass = transaction.type === 'owed' ? 'debt-balance-positive' : 'debt-balance-negative';
                                                    const statusText = transaction.status === 'pending' ? 'مستحق' : 
                                                                    transaction.status === 'paid' ? 'مدفوع' : 'متأخر';
                                                    const statusClass = transaction.status === 'pending' ? 'bg-warning' : 
                                                                      transaction.status === 'paid' ? 'bg-success' : 'bg-danger';
                                                    
                                                    return `
                                                        <tr>
                                                            <td>${transaction.description}</td>
                                                            <td><span class="${typeClass}">${typeText}</span></td>
                                                            <td>${transaction.amount.toLocaleString()} ${transaction.currency}</td>
                                                            <td>${new Date(transaction.date).toLocaleDateString('ar-EG')}</td>
                                                            <td><span class="badge ${statusClass}">${statusText}</span></td>
                                                            <td>
                                                                <button class="btn btn-sm btn-outline-primary edit-debt-transaction-btn" data-id="${transaction.id}"><i class="bi bi-pencil"></i></button>
                                                                <button class="btn btn-sm btn-outline-danger delete-debt-transaction-btn" data-id="${transaction.id}"><i class="bi bi-trash"></i></button>
                                                            </td>
                                                        </tr>
                                                    `;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                ` : '<p>لا توجد معاملات لهذا العميل</p>'}
                            </div>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="details" role="tabpanel">
                        <div class="debt-details-section">
                            <div class="debt-details-title">معلومات الاتصال</div>
                            <div class="debt-details-content">
                                ${customer.phone ? `<p><strong>الهاتف:</strong> ${customer.phone}</p>` : ''}
                                ${customer.email ? `<p><strong>البريد الإلكتروني:</strong> ${customer.email}</p>` : ''}
                                ${customer.address ? `<p><strong>العنوان:</strong> ${customer.address}</p>` : ''}
                            </div>
                        </div>
                        ${customer.notes ? `
                            <div class="debt-details-section">
                                <div class="debt-details-title">ملاحظات</div>
                                <div class="debt-details-content">
                                    <p>${customer.notes}</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="debt-customer-actions">
                    <button class="btn btn-primary debt-add-transaction-btn" data-id="${customerId}"><i class="bi bi-plus-circle"></i> إضافة معاملة جديدة</button>
                    <button class="btn btn-outline-primary edit-debt-customer-btn" data-id="${customerId}"><i class="bi bi-pencil"></i> تعديل بيانات العميل</button>
                </div>
            </div>
        `;
        
        // Set modal content
        const debtCustomerDetailsTitle = document.getElementById('debtCustomerDetailsTitle');
        const debtCustomerDetailsBody = document.getElementById('debtCustomerDetailsBody');
        
        if (debtCustomerDetailsTitle) debtCustomerDetailsTitle.textContent = `تفاصيل العميل: ${customer.name}`;
        if (debtCustomerDetailsBody) debtCustomerDetailsBody.innerHTML = detailsHtml;
        
        // Show modal
        const debtCustomerDetailsModal = new bootstrap.Modal(document.getElementById('debtCustomerDetailsModal'));
        debtCustomerDetailsModal.show();
    } catch (error) {
        console.error('Error viewing debt customer: ', error);
        showToast('فشل عرض بيانات العميل: ' + error.message, 'error');
    }
}

async function addDebtTransaction(customerId) {
    try {
        const customerDoc = await db.collection('debtCustomers').doc(customerId).get();
        
        if (!customerDoc.exists) {
            showToast('العميل غير موجود', 'error');
            return;
        }
        
        // Set customer ID in the form
        const debtTransactionCustomerId = document.getElementById('debtTransactionCustomerId');
        if (debtTransactionCustomerId) debtTransactionCustomerId.value = customerId;
        
        // Show modal
        const addDebtTransactionModal = new bootstrap.Modal(document.getElementById('addDebtTransactionModal'));
        addDebtTransactionModal.show();
    } catch (error) {
        console.error('Error adding debt transaction: ', error);
        showToast('فشل إضافة معاملة دين: ' + error.message, 'error');
    }
}

async function editDebtTransaction(transactionId) {
    try {
        const transactionDoc = await db.collection('debtTransactions').doc(transactionId).get();
        
        if (!transactionDoc.exists) {
            showToast('المعاملة غير موجودة', 'error');
            return;
        }
        
        const transaction = transactionDoc.data();
        
        // Fill the form with transaction data
        const editDebtTransactionId = document.getElementById('editDebtTransactionId');
        const editDebtTransactionCustomerId = document.getElementById('editDebtTransactionCustomerId');
        const editDebtTransactionType = document.getElementById('editDebtTransactionType');
        const editDebtTransactionDescription = document.getElementById('editDebtTransactionDescription');
        const editDebtTransactionDate = document.getElementById('editDebtTransactionDate');
        const editDebtTransactionCurrency = document.getElementById('editDebtTransactionCurrency');
        const editDebtTransactionAmount = document.getElementById('editDebtTransactionAmount');
        const editDebtTransactionDueDate = document.getElementById('editDebtTransactionDueDate');
        const editDebtTransactionStatus = document.getElementById('editDebtTransactionStatus');
        const editDebtTransactionNotes = document.getElementById('editDebtTransactionNotes');
        
        if (editDebtTransactionId) editDebtTransactionId.value = transactionId;
        if (editDebtTransactionCustomerId) editDebtTransactionCustomerId.value = transaction.customerId;
        if (editDebtTransactionType) editDebtTransactionType.value = transaction.type;
        if (editDebtTransactionDescription) editDebtTransactionDescription.value = transaction.description;
        if (editDebtTransactionDate) editDebtTransactionDate.value = transaction.date;
        if (editDebtTransactionCurrency) editDebtTransactionCurrency.value = transaction.currency;
        if (editDebtTransactionAmount) editDebtTransactionAmount.value = transaction.amount;
        if (editDebtTransactionDueDate) editDebtTransactionDueDate.value = transaction.dueDate;
        if (editDebtTransactionStatus) editDebtTransactionStatus.value = transaction.status;
        if (editDebtTransactionNotes) editDebtTransactionNotes.value = transaction.notes || '';
        
        // Show modal
        const editDebtTransactionModal = new bootstrap.Modal(document.getElementById('editDebtTransactionModal'));
        editDebtTransactionModal.show();
    } catch (error) {
        console.error('Error editing debt transaction: ', error);
        showToast('فشل تحرير معاملة الدين: ' + error.message, 'error');
    }
}

async function deleteDebtTransaction(transactionId) {
    try {
        const transactionDoc = await db.collection('debtTransactions').doc(transactionId).get();
        
        if (!transactionDoc.exists) {
            showToast('المعاملة غير موجودة', 'error');
            return;
        }
        
        const transaction = transactionDoc.data();
        
        showConfirmation(`هل أنت متأكد من حذف المعاملة "${transaction.description}"؟`, async function() {
            try {
                // Delete transaction from Firebase
                await db.collection('debtTransactions').doc(transactionId).delete();
                
                // Update UI
                await loadDebtTransactionsFromFirebase();
                renderDebtCustomersList();
                
                showToast('تم حذف المعاملة بنجاح');
            } catch (error) {
                console.error('Error deleting debt transaction: ', error);
                showToast('فشل حذف المعاملة: ' + error.message, 'error');
            }
        });
    } catch (error) {
        console.error('Error deleting debt transaction: ', error);
        showToast('فشل حذف المعاملة: ' + error.message, 'error');
    }
}

async function editDebtCustomer(customerId) {
    try {
        const customerDoc = await db.collection('debtCustomers').doc(customerId).get();
        
        if (!customerDoc.exists) {
            showToast('العميل غير موجود', 'error');
            return;
        }
        
        const customer = customerDoc.data();
        
        // Fill the form with customer data
        const editDebtCustomerId = document.getElementById('editDebtCustomerId');
        const editDebtCustomerName = document.getElementById('editDebtCustomerName');
        const editDebtCustomerPhone = document.getElementById('editDebtCustomerPhone');
        const editDebtCustomerEmail = document.getElementById('editDebtCustomerEmail');
        const editDebtCustomerAddress = document.getElementById('editDebtCustomerAddress');
        const editDebtCustomerNotes = document.getElementById('editDebtCustomerNotes');
        
        if (editDebtCustomerId) editDebtCustomerId.value = customerId;
        if (editDebtCustomerName) editDebtCustomerName.value = customer.name;
        if (editDebtCustomerPhone) editDebtCustomerPhone.value = customer.phone;
        if (editDebtCustomerEmail) editDebtCustomerEmail.value = customer.email || '';
        if (editDebtCustomerAddress) editDebtCustomerAddress.value = customer.address || '';
        if (editDebtCustomerNotes) editDebtCustomerNotes.value = customer.notes || '';
        
        // Close details modal
        const debtCustomerDetailsModal = bootstrap.Modal.getInstance(document.getElementById('debtCustomerDetailsModal'));
        if (debtCustomerDetailsModal) debtCustomerDetailsModal.hide();
        
        // Show edit modal
        const editDebtCustomerModal = new bootstrap.Modal(document.getElementById('editDebtCustomerModal'));
        editDebtCustomerModal.show();
    } catch (error) {
        console.error('Error editing debt customer: ', error);
        showToast('فشل تحرير بيانات العميل: ' + error.message, 'error');
    }
}

async function deleteDebtCustomer(customerId) {
    try {
        const customerDoc = await db.collection('debtCustomers').doc(customerId).get();
        
        if (!customerDoc.exists) {
            showToast('العميل غير موجود', 'error');
            return;
        }
        
        const customer = customerDoc.data();
        
        showConfirmation(`هل أنت متأكد من حذف العميل "${customer.name}" وجميع معاملاته؟`, async function() {
            try {
                // Delete customer and their transactions
                await db.collection('debtCustomers').doc(customerId).delete();
                
                // Delete all transactions for this customer
                const transactionsSnapshot = await db.collection('debtTransactions')
                    .where('customerId', '==', customerId)
                    .get();
                
                const batch = db.batch();
                transactionsSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                // Commit the batch
                await batch.commit();
                
                // Update UI
                await loadDebtCustomersFromFirebase();
                await loadDebtTransactionsFromFirebase();
                renderDebtCustomersList();
                
                showToast('تم حذف العميل ومعاملاته بنجاح');
            } catch (error) {
                console.error('Error deleting debt customer: ', error);
                showToast('فشل حذف العميل: ' + error.message, 'error');
            }
        });
    } catch (error) {
        console.error('Error deleting debt customer: ', error);
        showToast('فشل حذف العميل: ' + error.message, 'error');
    }
}

// Helper function to get account name
function getAccountName(accountId) {
    if (accountId.startsWith('bank-')) {
        const accountIdNum = accountId.replace('bank-', '');
        const account = bankAccounts.find(a => a.id === accountIdNum);
        return account ? account.name : 'حساب بنكي غير معروف';
    } else if (accountId.startsWith('cash-')) {
        const accountIdNum = accountId.replace('cash-', '');
        const account = cashAccounts.find(a => a.id === accountIdNum);
        if (account) {
            if (account.location === 'me') return 'نقدي (لدي)';
            else if (account.location === 'mom') return 'نقدي (لدى أمي)';
            else if (account.location === 'wife') return 'نقدي (لدى زوجتي)';
            else return `نقدي (${account.otherLocation})`;
        }
        return 'حساب نقدي غير معروف';
    }
    return 'حساب غير معروف';
}

// Function to save data to Firebase (for offline mode)
async function saveDataToFirebase() {
    if (!navigator.onLine) {
        console.log('Offline, cannot save data to Firebase');
        return;
    }
    
    try {
        // Save all data to Firebase
        await Promise.all([
            saveBankAccountsToFirebase(),
            saveCashAccountsToFirebase(),
            saveTransactionsToFirebase(),
            saveIncomeItemsToFirebase(),
            saveExpenseItemsToFirebase(),
            saveIncomeCategoriesToFirebase(),
            saveExpenseCategoriesToFirebase(),
            saveDebtCustomersToFirebase(),
            saveDebtTransactionsToFirebase()
        ]);
        
        console.log('All data saved to Firebase successfully');
    } catch (error) {
        console.error('Error saving data to Firebase:', error);
        showToast('حدث خطأ أثناء حفظ البيانات: ' + error.message, 'error');
    }
}

// Save bank accounts to Firebase
async function saveBankAccountsToFirebase() {
    try {
        // Get all bank accounts from Firebase
        const snapshot = await db.collection('bankAccounts').get();
        const existingAccounts = [];
        
        snapshot.forEach(doc => {
            existingAccounts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update or add each account
        for (const account of bankAccounts) {
            const existingAccount = existingAccounts.find(a => a.id === account.id);
            
            if (existingAccount) {
                // Update existing account
                await db.collection('bankAccounts').doc(account.id).update({
                    name: account.name,
                    type: account.type,
                    number: account.number,
                    balanceYER: account.balanceYER,
                    balanceSAR: account.balanceSAR,
                    notes: account.notes,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Add new account
                await db.collection('bankAccounts').add({
                    name: account.name,
                    type: account.type,
                    number: account.number,
                    balanceYER: account.balanceYER,
                    balanceSAR: account.balanceSAR,
                    notes: account.notes,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        console.log('Bank accounts saved to Firebase successfully');
    } catch (error) {
        console.error('Error saving bank accounts to Firebase:', error);
        throw error;
    }
}

// Save cash accounts to Firebase
async function saveCashAccountsToFirebase() {
    try {
        // Get all cash accounts from Firebase
        const snapshot = await db.collection('cashAccounts').get();
        const existingAccounts = [];
        
        snapshot.forEach(doc => {
            existingAccounts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update or add each account
        for (const account of cashAccounts) {
            const existingAccount = existingAccounts.find(a => a.id === account.id);
            
            if (existingAccount) {
                // Update existing account
                await db.collection('cashAccounts').doc(account.id).update({
                    location: account.location,
                    otherLocation: account.otherLocation,
                    balanceYER: account.balanceYER,
                    balanceSAR: account.balanceSAR,
                    notes: account.notes,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Add new account
                await db.collection('cashAccounts').add({
                    location: account.location,
                    otherLocation: account.otherLocation,
                    balanceYER: account.balanceYER,
                    balanceSAR: account.balanceSAR,
                    notes: account.notes,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        console.log('Cash accounts saved to Firebase successfully');
    } catch (error) {
        console.error('Error saving cash accounts to Firebase:', error);
        throw error;
    }
}

// Save transactions to Firebase
async function saveTransactionsToFirebase() {
    try {
        // Get all transactions from Firebase
        const snapshot = await db.collection('transactions').get();
        const existingTransactions = [];
        
        snapshot.forEach(doc => {
            existingTransactions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update or add each transaction
        for (const transaction of transactions) {
            const existingTransaction = existingTransactions.find(t => t.id === transaction.id);
            
            if (existingTransaction) {
                // Update existing transaction
                await db.collection('transactions').doc(transaction.id).update({
                    type: transaction.type,
                    description: transaction.description,
                    date: transaction.date,
                    currency: transaction.currency,
                    amount: transaction.amount,
                    account: transaction.account,
                    category: transaction.category,
                    categoryName: transaction.categoryName,
                    fromAccount: transaction.fromAccount,
                    toAccount: transaction.toAccount,
                    notes: transaction.notes,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Add new transaction
                await db.collection('transactions').add({
                    type: transaction.type,
                    description: transaction.description,
                    date: transaction.date,
                    currency: transaction.currency,
                    amount: transaction.amount,
                    account: transaction.account,
                    category: transaction.category,
                    categoryName: transaction.categoryName,
                    fromAccount: transaction.fromAccount,
                    toAccount: transaction.toAccount,
                    notes: transaction.notes,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        console.log('Transactions saved to Firebase successfully');
    } catch (error) {
        console.error('Error saving transactions to Firebase:', error);
        throw error;
    }
}

// Save income items to Firebase
async function saveIncomeItemsToFirebase() {
    try {
        // Get all income items from Firebase
        const snapshot = await db.collection('incomeItems').get();
        const existingItems = [];
        
        snapshot.forEach(doc => {
            existingItems.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update or add each item
        for (const item of incomeItems) {
            const existingItem = existingItems.find(i => i.id === item.id);
            
            if (existingItem) {
                // Update existing item
                await db.collection('incomeItems').doc(item.id).update({
                    source: item.source,
                    description: item.description,
                    date: item.date,
                    currency: item.currency,
                    amount: item.amount,
                    account: item.account,
                    categoryName: item.categoryName,
                    notes: item.notes,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Add new item
                await db.collection('incomeItems').add({
                    source: item.source,
                    description: item.description,
                    date: item.date,
                    currency: item.currency,
                    amount: item.amount,
                    account: item.account,
                    categoryName: item.categoryName,
                    notes: item.notes,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        console.log('Income items saved to Firebase successfully');
    } catch (error) {
        console.error('Error saving income items to Firebase:', error);
        throw error;
    }
}

// Save expense items to Firebase
async function saveExpenseItemsToFirebase() {
    try {
        // Get all expense items from Firebase
        const snapshot = await db.collection('expenseItems').get();
        const existingItems = [];
        
        snapshot.forEach(doc => {
            existingItems.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update or add each item
        for (const item of expenseItems) {
            const existingItem = existingItems.find(i => i.id === item.id);
            
            if (existingItem) {
                // Update existing item
                await db.collection('expenseItems').doc(item.id).update({
                    category: item.category,
                    categoryName: item.categoryName,
                    description: item.description,
                    date: item.date,
                    currency: item.currency,
                    amount: item.amount,
                    account: item.account,
                    notes: item.notes,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Add new item
                await db.collection('expenseItems').add({
                    category: item.category,
                    categoryName: item.categoryName,
                    description: item.description,
                    date: item.date,
                    currency: item.currency,
                    amount: item.amount,
                    account: item.account,
                    notes: item.notes,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        console.log('Expense items saved to Firebase successfully');
    } catch (error) {
        console.error('Error saving expense items to Firebase:', error);
        throw error;
    }
}

// Save income categories to Firebase
async function saveIncomeCategoriesToFirebase() {
    try {
        // Get all income categories from Firebase
        const snapshot = await db.collection('incomeCategories').get();
        const existingCategories = [];
        
        snapshot.forEach(doc => {
            existingCategories.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update or add each category
        for (const category of incomeCategories) {
            const existingCategory = existingCategories.find(c => c.id === category.id);
            
            if (existingCategory) {
                // Update existing category
                await db.collection('incomeCategories').doc(category.id).update({
                    name: category.name,
                    color: category.color,
                    description: category.description,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Add new category
                await db.collection('incomeCategories').add({
                    name: category.name,
                    color: category.color,
                    description: category.description,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        console.log('Income categories saved to Firebase successfully');
    } catch (error) {
        console.error('Error saving income categories to Firebase:', error);
        throw error;
    }
}

// Save expense categories to Firebase
async function saveExpenseCategoriesToFirebase() {
    try {
        // Get all expense categories from Firebase
        const snapshot = await db.collection('expenseCategories').get();
        const existingCategories = [];
        
        snapshot.forEach(doc => {
            existingCategories.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update or add each category
        for (const category of expenseCategories) {
            const existingCategory = existingCategories.find(c => c.id === category.id);
            
            if (existingCategory) {
                // Update existing category
                await db.collection('expenseCategories').doc(category.id).update({
                    name: category.name,
                    color: category.color,
                    description: category.description,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Add new category
                await db.collection('expenseCategories').add({
                    name: category.name,
                    color: category.color,
                    description: category.description,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        console.log('Expense categories saved to Firebase successfully');
    } catch (error) {
        console.error('Error saving expense categories to Firebase:', error);
        throw error;
    }
}

// Save debt customers to Firebase
async function saveDebtCustomersToFirebase() {
    try {
        // Get all debt customers from Firebase
        const snapshot = await db.collection('debtCustomers').get();
        const existingCustomers = [];
        
        snapshot.forEach(doc => {
            existingCustomers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update or add each customer
        for (const customer of debtCustomers) {
            const existingCustomer = existingCustomers.find(c => c.id === customer.id);
            
            if (existingCustomer) {
                // Update existing customer
                await db.collection('debtCustomers').doc(customer.id).update({
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    address: customer.address,
                    notes: customer.notes,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Add new customer
                await db.collection('debtCustomers').add({
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    address: customer.address,
                    notes: customer.notes,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        console.log('Debt customers saved to Firebase successfully');
    } catch (error) {
        console.error('Error saving debt customers to Firebase:', error);
        throw error;
    }
}

// Save debt transactions to Firebase
async function saveDebtTransactionsToFirebase() {
    try {
        // Get all debt transactions from Firebase
        const snapshot = await db.collection('debtTransactions').get();
        const existingTransactions = [];
        
        snapshot.forEach(doc => {
            existingTransactions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update or add each transaction
        for (const transaction of debtTransactions) {
            const existingTransaction = existingTransactions.find(t => t.id === transaction.id);
            
            if (existingTransaction) {
                // Update existing transaction
                await db.collection('debtTransactions').doc(transaction.id).update({
                    customerId: transaction.customerId,
                    type: transaction.type,
                    description: transaction.description,
                    date: transaction.date,
                    currency: transaction.currency,
                    amount: transaction.amount,
                    dueDate: transaction.dueDate,
                    status: transaction.status,
                    notes: transaction.notes,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Add new transaction
                await db.collection('debtTransactions').add({
                    customerId: transaction.customerId,
                    type: transaction.type,
                    description: transaction.description,
                    date: transaction.date,
                    currency: transaction.currency,
                    amount: transaction.amount,
                    dueDate: transaction.dueDate,
                    status: transaction.status,
                    notes: transaction.notes,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        console.log('Debt transactions saved to Firebase successfully');
    } catch (error) {
        console.error('Error saving debt transactions to Firebase:', error);
        throw error;
    }
}