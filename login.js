// login.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page loaded');
    
    // Check if Firebase is initialized
    if (!firebase.apps.length) {
        console.error('Firebase not initialized');
        return;
    }
    
    // Initialize Firestore
    const db = firebase.firestore();
    
    // Check if user is already logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in, redirect to main app
            window.location.href = 'index.html';
        }
    });
    
    // Setup event listeners
    setupLoginEventListeners(db);
});

function setupLoginEventListeners(db) {
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            
            if (!email || !password) {
                showToast('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
                return;
            }
            
            try {
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                console.log("✅ تم تسجيل الدخول:", userCredential.user.uid);
                showToast('تم تسجيل الدخول بنجاح');
                
                // Redirect to main app
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
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
                console.log("✅ تسجيل دخول Google ناجح:", result.user.uid);
                showToast('تم تسجيل الدخول بحساب Google بنجاح');
                
                // Redirect to main app
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } catch (error) {
                console.error("❌ خطأ Google Sign-In:", error.message);
                showToast('فشل تسجيل الدخول بحساب Google: ' + error.message, 'error');
            }
        });
    }
    
    // Forgot Password Link
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
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
    
    // Signup Link
    const signupLink = document.getElementById('signupLink');
    if (signupLink) {
        signupLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('login-page').classList.add('d-none');
            document.getElementById('signup-page').classList.remove('d-none');
        });
    }
    
    // Login Link (from signup page)
    const loginLink = document.getElementById('loginLink');
    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('signup-page').classList.add('d-none');
            document.getElementById('login-page').classList.remove('d-none');
        });
    }
    
    // Signup Form
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
                document.getElementById('signup-page').classList.add('d-none');
                document.getElementById('login-page').classList.remove('d-none');
                
                // Clear form
                document.getElementById('signupForm').reset();
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
    
    // Google Sign Up Button
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
                
                // Redirect to main app
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } catch (error) {
                console.error("❌ خطأ إنشاء حساب Google:", error.message);
                showToast('فشل إنشاء حساب Google: ' + error.message, 'error');
            }
        });
    }
}

// Show Toast Notification
function showToast(message, type = 'success') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
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