let currentUser = null;
let transactions = [];
let currentLang = 'ar';

document.addEventListener('DOMContentLoaded', () => {
  const userStr = localStorage.getItem('currentUser');
  if (userStr) currentUser = JSON.parse(userStr);

  if (window.location.pathname.includes('dashboard.html')) {
    if (!currentUser) return window.location.href = 'index.html';
    initDashboard();
  } else {
    setupLoginEvents();
  }

  // تفعيل أزرار تغيير اللغة
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      changeLanguage(btn.dataset.lang);
    });
  });
  
  // تحميل اللغة المحفوظة
  const savedLang = localStorage.getItem('selectedLanguage');
  if (savedLang && savedLang !== 'ar') {
    changeLanguage(savedLang);
  }
});

// ======== لوحة التحكم ========
function initDashboard() {
  // عرض اسم المستخدم الحقيقي
  document.getElementById('userName').textContent = currentUser.name;

  // تفعيل القائمة المنسدلة
  const toggle = document.getElementById('userToggle');
  const menu = document.getElementById('userMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
      }
    });
  }

  // تاريخ اليوم
  const today = new Date();
  document.getElementById('transDate').valueAsDate = today;

  // تحميل البيانات
  loadTransactions();

  // أحداث الأزرار
  document.getElementById('addTransBtn').addEventListener('click', addTransaction);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
  document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);

  // تحميل الرسوم البيانية
  renderCharts();

  // التحديث الأولي
  updateSummary();
  renderTransactions();
}

// ======== تسجيل الدخول والحسابات ========
function setupLoginEvents() {
  document.getElementById('showRegisterLink')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerFields').classList.remove('hidden');
  });

  document.getElementById('showLoginLink')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('registerFields').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
  });

  document.getElementById('loginForm')?.addEventListener('submit', e => {
    e.preventDefault();
    login();
  });

  document.getElementById('registerBtn')?.addEventListener('click', register);
  document.getElementById('guestBtn')?.addEventListener('click', guestLogin);
}

function login() {
  const email = document.getElementById('email').value.trim();
  const pass = document.getElementById('password').value;
  const msg = document.getElementById('loginError');

  if (!email || !pass) return msg.textContent = translations[currentLang].requiredFields;

  const user = JSON.parse(localStorage.getItem(`user_${email}`));
  if (!user) return msg.textContent = translations[currentLang].accountNotFound;
  if (user.password !== pass) return msg.textContent = translations[currentLang].wrongPassword;

  localStorage.setItem('currentUser', JSON.stringify(user));
  window.location.href = 'dashboard.html';
}

function register() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  const currency = document.getElementById('currency').value;
  const msg = document.getElementById('registerError');

  if (!name || !email || !pass) return msg.textContent = translations[currentLang].requiredFields;
  if (localStorage.getItem(`user_${email}`)) return msg.textContent = translations[currentLang].emailExists;

  const newUser = { name, email, password: pass, currency };
  localStorage.setItem(`user_${email}`, JSON.stringify(newUser));
  localStorage.setItem('currentUser', JSON.stringify(newUser));

  msg.textContent = translations[currentLang].accountCreated;
  msg.style.color = '#06d6a0';
  setTimeout(() => window.location.href = 'dashboard.html', 1500);
}

function guestLogin() {
  const guest = { name: translations[currentLang].guest, email: 'guest@ma-gestion.ma', currency: 'MAD' };
  localStorage.setItem('currentUser', JSON.stringify(guest));
  window.location.href = 'dashboard.html';
}

// ======== إدارة المعاملات ========
function loadTransactions() {
  const saved = localStorage.getItem(`transactions_${currentUser.email}`);
  transactions = saved ? JSON.parse(saved) : [];
}

function saveTransactions() {
  localStorage.setItem(`transactions_${currentUser.email}`, JSON.stringify(transactions));
}

function addTransaction() {
  const type = document.getElementById('transType').value;
  const desc = document.getElementById('transDesc').value.trim();
  const amount = parseFloat(document.getElementById('transAmount').value);
  const category = document.getElementById('transCategory').value.trim();
  const date = document.getElementById('transDate').value || new Date().toISOString();

  if (!desc || isNaN(amount) || amount <= 0) return alert(translations[currentLang].invalidInput);

  transactions.push({ id: Date.now(), type, description: desc, amount, category, date });
  saveTransactions();
  renderTransactions();
  updateSummary();
  renderCharts();

  // إعادة تعيين النموذج
  document.getElementById('transDesc').value = '';
  document.getElementById('transAmount').value = '';
  document.getElementById('transCategory').value = '';
  document.getElementById('transDate').valueAsDate = new Date();
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  renderTransactions();
  updateSummary();
  renderCharts();
}

function updateSummary() {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrans = transactions.filter(t => t.date.startsWith(todayStr));
  const income = todayTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = todayTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // تصحيح: نحذف "DH" من هنا لأنها موجودة في HTML
  document.getElementById('incomeToday').textContent = `${income.toFixed(2)}`;
  document.getElementById('expenseToday').textContent = `${expense.toFixed(2)}`;
  document.getElementById('balanceToday').textContent = `${(income - expense).toFixed(2)}`;
}

function renderTransactions() {
  const list = document.getElementById('transList');
  if (!list) return;
  list.innerHTML = '';
  [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).forEach(t => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(t.date).toLocaleDateString('ar-MA')}</td>
      <td>${t.description}</td>
      <td>DH ${t.amount.toFixed(2)}</td>
      <td><span class="badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}">${t.type === 'income' ? translations[currentLang].income : translations[currentLang].expense}</span></td>
      <td><button onclick="deleteTransaction(${t.id})" class="btn btn-sm">${translations[currentLang].delete}</button></td>
    `;
    list.appendChild(row);
  });
}

// ======== تصدير إلى CSV ========
function exportToCSV() {
  if (transactions.length === 0) return alert(translations[currentLang].noTransactions);

  let csv = 'التاريخ,الوصف,المبلغ,النوع,الفئة\n';
  transactions.forEach(t => {
    csv += `"${new Date(t.date).toLocaleDateString('ar-MA')}","${t.description}",${t.amount},${t.type === 'income' ? translations[currentLang].income : translations[currentLang].expense},"${t.category}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ma-gestion-transactions.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ======== تصدير إلى PDF ========
function exportToPDF() {
  if (transactions.length === 0) return alert(translations[currentLang].noTransactions);

  // إنشاء عنصر مؤقت
  const printDiv = document.createElement('div');
  printDiv.style.padding = '20px';
  printDiv.style.fontFamily = 'Arial, sans-serif';
  printDiv.innerHTML = `
    <h1 style="text-align: center; color: #4361ee; margin-bottom: 30px;">Ma Gestion Pro</h1>
    <h2 style="text-align: center; margin-bottom: 20px;">${translations[currentLang].reportTitle}</h2>
    <p style="text-align: center; color: #666; margin-bottom: 30px;">
      ${translations[currentLang].reportDate}: ${new Date().toLocaleDateString('ar-MA')}
    </p>
    
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <thead>
        <tr style="background-color: #4361ee; color: white;">
          <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">${translations[currentLang].date}</th>
          <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">${translations[currentLang].description}</th>
          <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">${translations[currentLang].amount}</th>
          <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">${translations[currentLang].type}</th>
          <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">${translations[currentLang].category}</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.map(t => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${new Date(t.date).toLocaleDateString('ar-MA')}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${t.description}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">DH ${t.amount.toFixed(2)}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
              <span style="padding: 4px 10px; border-radius: 4px; background: ${t.type === 'income' ? '#d1fadb' : '#fee2e2'}; color: ${t.type === 'income' ? '#059669' : '#dc2626'};">
                ${t.type === 'income' ? translations[currentLang].income : translations[currentLang].expense}
              </span>
            </td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${t.category || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div style="margin-top: 30px; padding: 20px; background: #f5f7fa; border-radius: 8px;">
      <h3 style="margin-bottom: 15px; color: #333;">${translations[currentLang].summary}:</h3>
      <p style="margin: 8px 0;"><strong>${translations[currentLang].totalIncome}:</strong> DH ${transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toFixed(2)}</p>
      <p style="margin: 8px 0;"><strong>${translations[currentLang].totalExpense}:</strong> DH ${transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toFixed(2)}</p>
      <p style="margin: 8px 0;"><strong>${translations[currentLang].netBalance}:</strong> DH ${(transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) - transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)).toFixed(2)}</p>
    </div>
  `;

  // فتح نافذة طباعة
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <title>${translations[currentLang].reportTitle} - Ma Gestion Pro</title>
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: right; }
        th { background-color: #4361ee; color: white; }
      </style>
    </head>
    <body>
      ${printDiv.innerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// ======== رسم الرسوم البيانية ========
function renderCharts() {
  // رسم دائري للمصروفات حسب الفئة
  const expenseData = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const cat = t.category || translations[currentLang].other;
      expenseData[cat] = (expenseData[cat] || 0) + t.amount;
    });

  const categories = Object.keys(expenseData);
  const amounts = Object.values(expenseData);

  // ألوان مختلفة لكل فئة
  const colors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#95e1d3', 
    '#f3a683', '#e77f67', '#cf6a87', '#786fa6'
  ];

  // رسم الدائرة
  const ctx = document.getElementById('expenseChart');
  if (ctx) {
    // حذف الرسم القديم إذا وجد
    if (window.expenseChart) {
      window.expenseChart.destroy();
    }
    
    window.expenseChart = new Chart(ctx, {
      type: 'doughnut',
       {
        labels: categories,
        datasets: [{
          data: amounts,
          backgroundColor: categories.map((_, i) => colors[i % colors.length]),
          borderWidth: 0
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
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value.toFixed(2)} DH (${percentage}%)`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  // تحديث الاتجاه الأسبوعي
  updateWeeklyTrend();
}

// ======== تحديث الاتجاه الأسبوعي ========
function updateWeeklyTrend() {
  const days = [translations[currentLang].sunday, translations[currentLang].monday, translations[currentLang].tuesday, translations[currentLang].wednesday, translations[currentLang].thursday, translations[currentLang].friday, translations[currentLang].saturday];
  const today = new Date();
  const bars = document.querySelectorAll('.bar');
  
  bars.forEach((bar, i) => {
    const dayIndex = (today.getDay() - (6 - i) + 7) % 7;
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTrans = transactions.filter(t => t.date.startsWith(dateStr));
    const total = dayTrans.reduce((sum, t) => sum + t.amount, 0);
    const maxAmount = Math.max(...transactions.map(t => t.amount), 100);
    
    const height = (total / maxAmount) * 95;
    bar.style.height = `${Math.max(5, height)}%`;
    
    // تحديث اسم اليوم
    const dayLabel = bar.parentElement.querySelector('span:first-child');
    if (dayLabel) {
      dayLabel.textContent = days[dayIndex];
    }
  });
}

// ======== تسجيل الخروج ========
function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

// ======== تعدد اللغات ========
const translations = {
  ar: {
    requiredFields: 'البريد وكلمة المرور مطلوبان',
    accountNotFound: 'الحساب غير موجود',
    wrongPassword: 'كلمة المرور خاطئة',
    emailExists: 'البريد مستخدم',
    accountCreated: 'تم الإنشاء!',
    guest: 'ضيف',
    invalidInput: 'أدخل وصفًا ومبلغًا صحيحًا',
    noTransactions: 'لا توجد معاملات للتصدير',
    reportTitle: 'تقرير المعاملات',
    reportDate: 'تاريخ التقرير',
    summary: 'ملخص',
    totalIncome: 'إجمالي المدخلات',
    totalExpense: 'إجمالي المصروفات',
    netBalance: 'الرصيد الصافي',
    loginTitle: 'تسجيل الدخول',
    registerTitle: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    name: 'الاسم الكامل',
    currency: 'العملة الافتراضية',
    createAccount: 'إنشاء الحساب',
    noAccount: 'ليس لديك حساب؟ إنشاء حساب',
    haveAccount: 'لديك حساب؟ عد إلى تسجيل الدخول',
    guestLogin: 'دخول كضيف',
    smartFinance: 'إدارة مالية ذكية',
    dashboard: 'لوحة التحكم',
    todayIncome: 'الإيراد اليومي',
    todayExpense: 'المصروف اليومي',
    availableBalance: 'الرصيد المتاح',
    budgetAnalysis: 'تحليل الميزانية',
    addTransaction: 'إضافة معاملة',
    recentTransactions: 'المعاملات الأخيرة',
    type: 'النوع',
    date: 'التاريخ',
    description: 'الوصف',
    amount: 'المبلغ',
    category: 'الفئة',
    actions: 'إجراءات',
    income: 'مدخل',
    expense: 'مصروف',
    logout: 'خروج',
    exportPDF: 'PDF',
    exportCSV: 'CSV',
    expenseDistribution: 'توزيع المصروفات',
    weeklyTrend: 'الاتجاه الأسبوعي',
    add: 'إضافة',
    delete: 'حذف',
    food: 'طعام',
    transport: 'نقل',
    other: 'أخرى',
    sunday: 'الأحد',
    monday: 'الإثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت'
  },
  fr: {
    requiredFields: 'Email et mot de passe requis',
    accountNotFound: 'Compte non trouvé',
    wrongPassword: 'Mot de passe incorrect',
    emailExists: 'Email déjà utilisé',
    accountCreated: 'Créé avec succès!',
    guest: 'Invité',
    invalidInput: 'Entrez une description et un montant valides',
    noTransactions: 'Aucune transaction à exporter',
    reportTitle: 'Rapport des transactions',
    reportDate: 'Date du rapport',
    summary: 'Résumé',
    totalIncome: 'Revenu total',
    totalExpense: 'Dépense totale',
    netBalance: 'Solde net',
    loginTitle: 'Connexion',
    registerTitle: 'Créer un compte',
    email: 'Email',
    password: 'Mot de passe',
    name: 'Nom complet',
    currency: 'Devise par défaut',
    createAccount: 'Créer un compte',
    noAccount: "Vous n'avez pas de compte ? Créer un compte",
    haveAccount: 'Vous avez un compte ? Retour à la connexion',
    guestLogin: 'Connexion invité',
    smartFinance: 'Gestion financière intelligente',
    dashboard: 'Tableau de bord',
    todayIncome: "Revenu d'aujourd'hui",
    todayExpense: "Dépense d'aujourd'hui",
    availableBalance: 'Solde disponible',
    budgetAnalysis: 'Analyse du budget',
    addTransaction: 'Ajouter une transaction',
    recentTransactions: 'Transactions récentes',
    type: 'Type',
    date: 'Date',
    description: 'Description',
    amount: 'Montant',
    category: 'Catégorie',
    actions: 'Actions',
    income: 'Revenu',
    expense: 'Dépense',
    logout: 'Déconnexion',
    exportPDF: 'PDF',
    exportCSV: 'CSV',
    expenseDistribution: 'Répartition des dépenses',
    weeklyTrend: 'Tendance hebdomadaire',
    add: 'Ajouter',
    delete: 'Supprimer',
    food: 'Nourriture',
    transport: 'Transport',
    other: 'Autre',
    sunday: 'Dimanche',
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi'
  },
  en: {
    requiredFields: 'Email and password required',
    accountNotFound: 'Account not found',
    wrongPassword: 'Wrong password',
    emailExists: 'Email already used',
    accountCreated: 'Created successfully!',
    guest: 'Guest',
    invalidInput: 'Enter valid description and amount',
    noTransactions: 'No transactions to export',
    reportTitle: 'Transaction Report',
    reportDate: 'Report Date',
    summary: 'Summary',
    totalIncome: 'Total Income',
    totalExpense: 'Total Expense',
    netBalance: 'Net Balance',
    loginTitle: 'Login',
    registerTitle: 'Create Account',
    email: 'Email',
    password: 'Password',
    name: 'Full Name',
    currency: 'Default Currency',
    createAccount: 'Create Account',
    noAccount: 'No account? Create one',
    haveAccount: 'Have an account? Back to login',
    guestLogin: 'Guest Login',
    smartFinance: 'Smart Finance Management',
    dashboard: 'Dashboard',
    todayIncome: 'Today Income',
    todayExpense: 'Today Expense',
    availableBalance: 'Available Balance',
    budgetAnalysis: 'Budget Analysis',
    addTransaction: 'Add Transaction',
    recentTransactions: 'Recent Transactions',
    type: 'Type',
    date: 'Date',
    description: 'Description',
    amount: 'Amount',
    category: 'Category',
    actions: 'Actions',
    income: 'Income',
    expense: 'Expense',
    logout: 'Logout',
    exportPDF: 'PDF',
    exportCSV: 'CSV',
    expenseDistribution: 'Expense Distribution',
    weeklyTrend: 'Weekly Trend',
    add: 'Add',
    delete: 'Delete',
    food: 'Food',
    transport: 'Transport',
    other: 'Other',
    sunday: 'Sunday',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday'
  }
};

function changeLanguage(lang) {
  currentLang = lang;
  
  // تحديث الأزرار
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  
  // تحديث النصوص في صفحة الدخول
  if (document.querySelector('.login-page')) {
    const loginElements = {
      '.logo p': 'smartFinance',
      'label[for="email"]': 'email',
      'label[for="password"]': 'password',
      'label[for="name"]': 'name',
      'label[for="regEmail"]': 'email',
      'label[for="regPass"]': 'password',
      'label[for="currency"]': 'currency',
      '#showRegisterLink': 'noAccount',
      '#showLoginLink': 'haveAccount',
      '.guest-btn': 'guestLogin'
    };
    
    Object.entries(loginElements).forEach(([selector, key]) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = translations[lang][key];
    });
  }
  
  // تحديث النصوص في لوحة التحكم
  if (document.querySelector('.dashboard-page')) {
    const dashboardElements = {
      '#incomeToday + .label': 'todayIncome',
      '#expenseToday + .label': 'todayExpense',
      '#balanceToday + .label': 'availableBalance',
      '.card-header h3:first-child': 'budgetAnalysis',
      '#addTransBtn': 'add',
      'th:nth-child(1)': 'date',
      'th:nth-child(2)': 'description',
      'th:nth-child(3)': 'amount',
      'th:nth-child(4)': 'type',
      'th:nth-child(5)': 'actions'
    };
    
    Object.entries(dashboardElements).forEach(([selector, key]) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = translations[lang][key];
    });
  }
  
  // حفظ اللغة المختارة
  localStorage.setItem('selectedLanguage', lang);
  
  // إعادة رسم الرسوم البيانية
  if (window.location.pathname.includes('dashboard.html')) {
    renderCharts();
  }
}

// ======== جعل الدوال متاحة عالمياً ========
window.deleteTransaction = deleteTransaction;
window.exportToPDF = exportToPDF;
