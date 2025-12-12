// 認證相關功能
let currentUser = null;

// 初始化認證狀態
async function initAuth() {
    if (!isSupabaseConfigured()) {
        console.log('Supabase 尚未設定，跳過認證初始化');
        return;
    }
    
    // 檢查現有 session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        updateUserUI();
    }
    
    // 監聽認證狀態變化
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            currentUser = session.user;
        } else {
            currentUser = null;
        }
        updateUserUI();
    });
}

// 更新使用者介面
function updateUserUI() {
    const userInfo = document.getElementById('userInfo');
    const loginPrompt = document.getElementById('loginPrompt');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        userInfo.style.display = 'flex';
        loginPrompt.style.display = 'none';
        userName.textContent = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || '使用者';
        
        // 載入使用者金幣餘額
        if (typeof loadUserCoins === 'function') {
            loadUserCoins();
        }
    } else {
        userInfo.style.display = 'none';
        loginPrompt.style.display = 'block';
    }
}

// 顯示登入彈窗
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('registerModal').style.display = 'none';
}

// 隱藏登入彈窗
function hideLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

// 顯示註冊彈窗
function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'flex';
    document.getElementById('loginModal').style.display = 'none';
}

// 隱藏註冊彈窗
function hideRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
}

// Email 登入
async function login() {
    if (!isSupabaseConfigured()) {
        alert('請先設定 Supabase！');
        return;
    }
    
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    
    if (!email || !password) {
        alert('請輸入電子郵件和密碼');
        return;
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        alert('登入失敗：' + error.message);
    } else {
        hideLoginModal();
        alert('登入成功！');
    }
}

// Google 登入
async function loginWithGoogle() {
    if (!isSupabaseConfigured()) {
        alert('請先設定 Supabase！');
        return;
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });
    
    if (error) {
        alert('Google 登入失敗：' + error.message);
    }
}

// 註冊
async function register() {
    if (!isSupabaseConfigured()) {
        alert('請先設定 Supabase！');
        return;
    }
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    if (!name || !email || !password) {
        alert('請填寫所有欄位');
        return;
    }
    
    if (password.length < 6) {
        alert('密碼至少需要 6 個字元');
        return;
    }
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name: name
            }
        }
    });
    
    if (error) {
        alert('註冊失敗：' + error.message);
    } else {
        hideRegisterModal();
        alert('註冊成功！請檢查您的電子郵件以驗證帳號。');
    }
}

// 登出
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert('登出失敗：' + error.message);
    } else {
        currentUser = null;
        updateUserUI();
    }
}

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', initAuth);
