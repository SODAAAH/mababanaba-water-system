window.addEventListener('error', function(e) {
    const loader = document.getElementById('global-loader');
    if(loader) {
        loader.innerHTML = `
            <div style="background:white; padding:20px; border-radius:12px; text-align:center; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-width: 90%;">
                <h3 style="color:#ef4444; font-weight:bold; font-family:sans-serif; margin-bottom:10px;">Notice</h3>
                <p style="color:#64748b; font-size:12px; font-family:monospace; word-wrap:break-word;">${e.message}</p>
                <button onclick="window.location.reload(true)" style="margin-top:15px; padding:10px 20px; background:#2563eb; color:white; border-radius:8px; border:none; font-weight:bold;">Force Reload</button>
            </div>
        `;
    }
});

const App = {
    getLoyaltyRank(pts) {
        const p = parseInt(pts) || 0;
        if (p >= 600) {
            return {
                name: 'Diamond',
                tier: 6,
                color: 'from-cyan-500 to-blue-600',
                textColor: 'text-cyan-600',
                badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-300',
                icon: 'fa-gem',
                min: 600,
                nextMin: null,
                nextRank: null,
                perks: 'Top Priority Dispatch: First in line for order preparation & delivery'
            };
        }
        if (p >= 300) {
            return {
                name: 'Platinum',
                tier: 5,
                color: 'from-slate-700 to-slate-900',
                textColor: 'text-slate-700',
                badgeBg: 'bg-slate-100 text-slate-800 border-slate-400',
                icon: 'fa-crown',
                min: 300,
                nextMin: 600,
                nextRank: 'Diamond',
                perks: 'High Priority Dispatch: Dispatched ahead of Gold, Silver, Bronze & Normal'
            };
        }
        if (p >= 150) {
            return {
                name: 'Gold',
                tier: 4,
                color: 'from-amber-400 to-yellow-600',
                textColor: 'text-amber-600',
                badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
                icon: 'fa-medal',
                min: 150,
                nextMin: 300,
                nextRank: 'Platinum',
                perks: 'Priority Queueing: Fast-tracked ahead of Silver, Bronze & Normal orders'
            };
        }
        if (p >= 75) {
            return {
                name: 'Silver',
                tier: 3,
                color: 'from-slate-400 to-slate-600',
                textColor: 'text-slate-600',
                badgeBg: 'bg-slate-100 text-slate-700 border-slate-300',
                icon: 'fa-award',
                min: 75,
                nextMin: 150,
                nextRank: 'Gold',
                perks: 'Faster Fulfillment: Dispatched ahead of Bronze and Normal orders'
            };
        }
        if (p >= 30) {
            return {
                name: 'Bronze',
                tier: 2,
                color: 'from-amber-600 to-amber-800',
                textColor: 'text-amber-700',
                badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
                icon: 'fa-shield-halved',
                min: 30,
                nextMin: 75,
                nextRank: 'Silver',
                perks: 'Early Queue Priority: Preferred dispatch over new & Normal orders'
            };
        }
        return {
            name: 'Normal',
            tier: 1,
            color: 'from-blue-500 to-blue-600',
            textColor: 'text-blue-600',
            badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
            icon: 'fa-droplet',
            min: 0,
            nextMin: 30,
            nextRank: 'Bronze',
            perks: 'Standard Queue: Earn points on refills to unlock faster dispatch'
        };
    },
    
    async requestNotificationPermission() {
        if ("Notification" in window && Notification.permission === "default") {
            const p = await Notification.requestPermission();
            if (p === "granted") {
                await this.subscribeToPush(false);
            }
        }
    },
    
    sendNativeNotification(title, body, tag = null) {
        if (!("Notification" in window)) return;
        if (Notification.permission === "granted") {
            try {
                navigator.serviceWorker.ready.then(function(registration) {
                    registration.showNotification(title, {
                        body: body,
                        icon: './logo.png',
                        badge: './logo.png',
                        tag: tag || ('mbbnb-order-' + Date.now()),
                        vibrate: [200, 100, 200, 100, 200]
                    });
                });
            } catch (e) {
                new Notification(title, { body: body, icon: './logo.png', tag: tag || undefined });
            }
        }
    },

    playNotificationChime() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
            const now = ctx.currentTime;
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
            
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            
            osc.start(now);
            osc.stop(now + 0.45);
        } catch(e) {}
    },

    async promptPwaInstall() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.classList.add('hidden');
        
        const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        if (isIos) {
            CustomDialog.alert("To install this app on your iPhone/iPad:<br><br>1. Tap the <strong>Share</strong> button <i class='fa-solid fa-arrow-up-from-bracket mx-1'></i> at the bottom of Safari.<br>2. Scroll down and tap <strong>Add to Home Screen</strong> <i class='fa-regular fa-square-plus mx-1'></i>.", "Install on iOS");
            return;
        }

        if (window.deferredPrompt) {
            window.deferredPrompt.prompt();
            const { outcome } = await window.deferredPrompt.userChoice;
            window.deferredPrompt = null;
        }
    },


    startHeartbeat() {
        if(State.heartbeatInterval) clearInterval(State.heartbeatInterval);
        
        if (State.user && State.user.type === 'customer') {
            State.heartbeatInterval = setInterval(() => {
                if (true) {
                    API.request('ping', 'POST', null, true).catch(() => {});
                }
            }, 10000);
        }
    },

    togglePassword(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    },

    setLoading(btn, isLoading, originalText = '') {
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            if (!btn.dataset.originalText || btn.dataset.originalText.includes('fa-spinner') || btn.dataset.originalText.includes('Processing')) {
                btn.dataset.originalText = (originalText && !originalText.includes('fa-spinner') && !originalText.includes('Processing')) ? originalText : (btn.innerText.trim() || 'Submit');
            }
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Processing...';
            btn.classList.add('opacity-80', 'cursor-not-allowed');
        } else {
            btn.disabled = false;
            let textToRestore = originalText;
            if (!textToRestore || textToRestore.includes('fa-spinner') || textToRestore.includes('Processing')) {
                textToRestore = btn.dataset.originalText;
            }
            if (!textToRestore || textToRestore.includes('fa-spinner') || textToRestore.includes('Processing')) {
                textToRestore = 'Sign In';
            }
            btn.innerHTML = textToRestore;
            btn.classList.remove('opacity-80', 'cursor-not-allowed');
            delete btn.dataset.originalText;
        }
    },
    
    async viewProof(orderId) {
        if (!orderId) { CustomToast.show("No payment proof provided", "error"); return; }
        CustomToast.show("Loading receipt...", "loading", 10000, "proof-loading");
        
        try {
            const res = await API.request('get_payment_proof', 'POST', { order_id: orderId });
            CustomToast.dismiss("proof-loading");
            if (res && res.payment_proof) {
                let base64 = String(res.payment_proof).trim();
                if (!base64) {
                    CustomToast.show("Payment proof is empty", "error");
                    return;
                }

                // Auto-normalize image data URI for older uploads or raw base64
                if (!base64.startsWith('data:image/')) {
                    if (base64.startsWith('data:application/octet-stream;base64,')) {
                        base64 = base64.replace('data:application/octet-stream;base64,', 'data:image/jpeg;base64,');
                    } else if (base64.startsWith('data:')) {
                        base64 = base64.replace(/^data:[^;]+;base64,/, 'data:image/jpeg;base64,');
                    } else if (base64.startsWith('iVBORw')) {
                        base64 = 'data:image/png;base64,' + base64;
                    } else if (base64.startsWith('UklGR')) {
                        base64 = 'data:image/webp;base64,' + base64;
                    } else {
                        base64 = 'data:image/jpeg;base64,' + base64;
                    }
                }

                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm opacity-0 transition-opacity duration-300';
                modal.innerHTML = `
                    <div class="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl scale-95 transition-transform duration-300 relative flex flex-col max-h-[90vh]">
                        <button class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition" onclick="this.closest('.fixed').remove()"><i class="fa-solid fa-times"></i></button>
                        <h3 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><i class="fa-solid fa-receipt text-blue-500"></i> Payment Proof</h3>
                        <div class="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2 flex items-center justify-center min-h-[300px]">
                            <img id="proof-image-display" class="max-w-full h-auto rounded-lg shadow-sm" alt="Payment Proof">
                        </div>
                        <div class="mt-4 flex justify-between items-center gap-3">
                            <a id="proof-download-link" download="Receipt-Order-${orderId}.jpg" class="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-xl text-sm flex items-center gap-2 transition active:scale-95">
                                <i class="fa-solid fa-download"></i> Save Receipt
                            </a>
                            <button class="btn btn-primary" onclick="this.closest('.fixed').remove()">Close</button>
                        </div>
                    </div>
                `;
                const proofImg = modal.querySelector('#proof-image-display');
                proofImg.onerror = function() {
                    this.onerror = null;
                    this.parentElement.innerHTML = '<div class="text-center text-slate-500 p-8"><i class="fa-solid fa-image-slash text-4xl mb-3 opacity-50"></i><p>Image cannot be loaded or is corrupted.</p></div>';
                };
                proofImg.src = base64;
                const dlLink = modal.querySelector('#proof-download-link');
                if (dlLink) dlLink.href = base64;

                document.body.appendChild(modal);
                requestAnimationFrame(() => {
                    modal.classList.remove('opacity-0');
                    modal.querySelector('.scale-95').classList.remove('scale-95');
                });
            } else {
                CustomToast.show("No payment proof found for this order", "error");
            }
        } catch (e) {
            CustomToast.dismiss("proof-loading");
            console.error(e);
            CustomToast.show("Error loading payment proof", "error");
        }
    },
    
    formatDate(dateString) {
        if(!dateString) return 'N/A';
        const d = new Date(dateString);
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        const yy = d.getFullYear().toString().slice(-2);
        return `${mm}/${dd}/${yy}`;
    },

    formatDateTime(dateString) {
        if(!dateString) return 'N/A';
        const safeStr = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
        const d = new Date(safeStr);
        if (isNaN(d.getTime())) {
            const parts = dateString.split(/[- :]/);
            if (parts.length >= 5) {
                const year = parts[0].slice(-2);
                const month = parts[1];
                const day = parts[2];
                let hour = parseInt(parts[3]);
                const min = parts[4];
                const ampm = hour >= 12 ? 'PM' : 'AM';
                hour = hour % 12 || 12;
                return `${month}/${day}/${year} ${hour}:${min} ${ampm}`;
            }
            return dateString;
        }
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        const yy = d.getFullYear().toString().slice(-2);
        const datePart = `${mm}/${dd}/${yy}`;
        let hours = d.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        const mins = d.getMinutes().toString().padStart(2,'0');
        return `${datePart} ${hours}:${mins} ${ampm}`;
    },

    toggleScheduleUI() {
        const type = document.getElementById('co-schedule-type').value;
        const wrap = document.getElementById('co-schedule-date-wrap');
        const dateInput = document.getElementById('co-schedule-date');
        if (type === 'Scheduled') {
            wrap.classList.remove('hidden');
            dateInput.required = true;
        } else {
            wrap.classList.add('hidden');
            dateInput.required = false;
            dateInput.value = '';
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true, 'Sign In');
        
        const type = document.getElementById('login-type').value;
        const user = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;
        
        const action = type === 'customer' ? 'customer_login' : 'admin_login';
        
        const data = new FormData();
        data.append(type === 'customer' ? 'contact_number' : 'username', user);
        data.append('password', pass);
        
        try {
            const res = await API.request(action, 'POST', data);
            
            if (res.requires_otp) {
                State.tempContact = res.contact_number;
                UI.navigate('otp_verify');
                this.setLoading(btn, false, 'Sign In');
                return;
            }

            if (res.success) {
                if (window.API && window.API.clearCache) API.clearCache();
                if (window.UI && window.UI._prefetchCache) window.UI._prefetchCache = {};
                State.user = { type, data: type === 'customer' ? res : res.admin };
                State.pushSubscriptionSynced = null;
                this.initPushNotifications();
                UI.goHome('replace');
            } else {
                CustomToast.show(res.error || 'Login failed. Please check your credentials.', 'error');
                this.setLoading(btn, false, 'Sign In');
            }
        } catch (e) {
            console.error("Login error:", e);
            const msg = (e.message && e.message !== 'Unauthorized') 
                ? e.message 
                : (type === 'customer' ? 'Invalid mobile number or password.' : 'Invalid username or password.');
            CustomToast.show(msg, 'error');
            this.setLoading(btn, false, 'Sign In');
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const pass = document.getElementById('reg-pass').value;
        const conf = document.getElementById('reg-confirm').value;
        if(pass !== conf) return CustomToast.show('Passwords do not match.', 'error');
        
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true, 'Register');
        
        const data = new FormData();
        data.append('full_name', document.getElementById('reg-name').value);
        data.append('contact_number', document.getElementById('reg-phone').value);
        data.append('address', document.getElementById('reg-address').value);
        data.append('password', document.getElementById('reg-pass').value);
        
        try {
            const res = await API.request('customer_register', 'POST', data);
            if (res.requires_otp) {
                State.tempContact = res.contact_number;
                CustomToast.show('Verification OTP code sent to your mobile number.', 'info');
                UI.navigate('otp_verify');
            } else if (res.error) {
                CustomToast.show(res.error, 'error');
            }
        } catch (e) {
            console.error("Register error:", e);
            CustomToast.show(e.message || 'Registration failed.', 'error');
        } finally {
            this.setLoading(btn, false, 'Register');
        }
    },

    closeUserProfileModal() {
        const container = document.getElementById('user-profile-modal-container');
        if (!container) return;
        if (window._profileModalEscHandler) {
            window.removeEventListener('keydown', window._profileModalEscHandler);
            window._profileModalEscHandler = null;
        }
        const backdrop = document.getElementById('user-profile-backdrop');
        if (backdrop) {
            backdrop.classList.add('opacity-0');
            const card = backdrop.querySelector('.user-profile-card');
            if (card) card.classList.add('scale-95');
        }
        setTimeout(() => {
            if (container) container.remove();
        }, 200);
    },

    async openUserProfileModal() {
        if (!State.user) return;
        this.closeUserProfileModal();

        const isCustomer = State.user.type === 'customer';
        const u = State.user.data || {};

        let displayName = 'User';
        let roleLabel = 'User';
        let roleIcon = 'fa-user';
        let roleBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
        let verifiedBadgeHtml = '';
        let pointsBadgeHtml = '';
        let subDetailsHtml = '';
        let extraRowHtml = '';

        if (isCustomer) {
            displayName = u.full_name || 'Customer';
            roleLabel = 'Customer';
            roleIcon = 'fa-user';
            roleBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
            const contact = u.contact_number || 'Registered Mobile';
            const address = u.address || 'Standard Address';

            if (u.is_verified == 1) {
                verifiedBadgeHtml = `
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <i class="fa-solid fa-check mr-1"></i>Verified
                    </span>
                `;
            }

            const pts = u.points || (State.user && State.user.data && State.user.data.points) || 0;
            if (pts > 0) {
                pointsBadgeHtml = `
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                        <i class="fa-solid fa-crown text-amber-500 mr-1 text-[9px]"></i>${pts} pts
                    </span>
                `;
            }

            subDetailsHtml = `
                <div class="flex items-center gap-1.5 truncate">
                    <i class="fa-solid fa-phone text-blue-500 text-[10px] shrink-0"></i>
                    <span class="truncate font-medium text-slate-700">${escapeHtml(contact)}</span>
                </div>
                <div class="flex items-center gap-1.5 truncate">
                    <i class="fa-solid fa-location-dot text-blue-500 text-[10px] shrink-0"></i>
                    <span class="truncate text-slate-500">${escapeHtml(address)}</span>
                </div>
            `;

            extraRowHtml = `
                <button onclick="App.closeUserProfileModal(); UI.navigate('customer_orders');" class="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-blue-50/40 active:bg-blue-100/50 transition text-left cursor-pointer group">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <i class="fa-solid fa-clock-rotate-left text-xs"></i>
                        </div>
                        <div>
                            <div class="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">My Orders</div>
                            <div class="text-[10px] text-slate-400">View live deliveries & past order history</div>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"></i>
                </button>
            `;
        } else {
            displayName = u.username || 'Staff';
            roleLabel = u.role || 'Staff';
            const station = u.station_name || (u.role === 'Super Admin' ? 'All Stations' : 'Central Station');
            const contact = u.contact_number || 'No contact set';

            if (u.role === 'Super Admin') {
                roleIcon = 'fa-shield-halved';
                roleBadgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
            } else if (u.role === 'Delivery Staff') {
                roleIcon = 'fa-motorcycle';
                roleBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
            } else {
                roleIcon = 'fa-user-gear';
                roleBadgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
            }

            verifiedBadgeHtml = `
                <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-100 text-green-700">Active</span>
            `;

            subDetailsHtml = `
                <div class="flex items-center gap-1.5 truncate">
                    <i class="fa-solid fa-store text-blue-500 text-[10px] shrink-0"></i>
                    <span class="truncate font-medium text-slate-700">${escapeHtml(station)}</span>
                </div>
                <div class="flex items-center gap-1.5 truncate">
                    <i class="fa-solid fa-phone text-blue-500 text-[10px] shrink-0"></i>
                    <span class="truncate text-slate-500">${escapeHtml(contact)}</span>
                </div>
            `;

            if (u.role === 'Admin') {
                extraRowHtml = `
                    <button onclick="App.closeUserProfileModal(); UI.navigate('admin_settings');" class="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-blue-50/40 active:bg-blue-100/50 transition text-left cursor-pointer group">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <i class="fa-solid fa-gear text-xs"></i>
                            </div>
                            <div>
                                <div class="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Station Settings</div>
                                <div class="text-[10px] text-slate-400">Business hours, inventory & rates</div>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"></i>
                    </button>
                `;
            }
        }

        const isPushGranted = ('Notification' in window && Notification.permission === 'granted');
        const pushBadge = isPushGranted
            ? `<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Active</span>`
            : `<span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">Setup</span>`;

        const modalDiv = document.createElement('div');
        modalDiv.id = 'user-profile-modal-container';
        modalDiv.innerHTML = `
            <div id="user-profile-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 opacity-0 transition-opacity duration-200" onclick="if(event.target === this) App.closeUserProfileModal()">
                <div class="user-profile-card bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl shadow-blue-500/15 border border-blue-200/80 ring-2 ring-blue-500/30 transform scale-95 transition-all duration-200 relative">
                    
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-black text-slate-800 text-lg">My Profile</h3>
                        <button onclick="App.closeUserProfileModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition active:scale-95 cursor-pointer" title="Close">
                            <i class="fa-solid fa-xmark text-sm"></i>
                        </button>
                    </div>

                    <!-- User Identity Box (Themed by the system) -->
                    <div class="bg-blue-50/50 rounded-2xl p-4 border border-blue-200/80 mb-4 flex items-center gap-3.5">
                        <div class="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-sm shadow-blue-500/20 shrink-0">
                            <i class="fa-solid ${roleIcon}"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap mb-1">
                                <h4 class="font-black text-slate-800 text-base leading-tight truncate">${escapeHtml(displayName)}</h4>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${roleBadgeClass}">${escapeHtml(roleLabel)}</span>
                                ${verifiedBadgeHtml}
                                ${pointsBadgeHtml}
                            </div>
                            <div class="text-xs text-slate-600 space-y-0.5">
                                ${subDetailsHtml}
                            </div>
                        </div>
                    </div>

                    <div class="space-y-3 mb-5">
                        <div>
                            <div class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">Security & Credentials</div>
                            <div class="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
                                <button onclick="App.closeUserProfileModal(); App.startChangePhoneFlow()" class="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-blue-50/40 active:bg-blue-100/50 transition text-left cursor-pointer group">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <i class="fa-solid fa-mobile-screen text-xs"></i>
                                        </div>
                                        <div>
                                            <div class="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Change Phone Number</div>
                                            <div class="text-[10px] text-slate-400">Update verified contact & OTPs</div>
                                        </div>
                                    </div>
                                    <i class="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"></i>
                                </button>
                                <button onclick="App.closeUserProfileModal(); App.startChangePasswordFlow()" class="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-blue-50/40 active:bg-blue-100/50 transition text-left cursor-pointer group">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <i class="fa-solid fa-key text-xs"></i>
                                        </div>
                                        <div>
                                            <div class="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Change Password</div>
                                            <div class="text-[10px] text-slate-400">Update account credentials</div>
                                        </div>
                                    </div>
                                    <i class="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"></i>
                                </button>
                            </div>
                        </div>

                        <div>
                            <div class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">App & Preferences</div>
                            <div class="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
                                <button onclick="App.subscribeToPush(true)" class="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-blue-50/40 active:bg-blue-100/50 transition text-left cursor-pointer group">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <i class="fa-solid fa-bell text-xs"></i>
                                        </div>
                                        <div>
                                            <div class="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Push Notifications</div>
                                            <div class="text-[10px] text-slate-400">Instant delivery & order alerts</div>
                                        </div>
                                    </div>
                                    ${pushBadge}
                                </button>
                                <button onclick="App.checkForAppUpdates(true)" class="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-blue-50/40 active:bg-blue-100/50 transition text-left cursor-pointer group">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <i class="fa-solid fa-arrows-rotate text-xs"></i>
                                        </div>
                                        <div>
                                            <div class="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Check for Updates</div>
                                            <div class="text-[10px] text-slate-400">Check latest version</div>
                                        </div>
                                    </div>
                                    <i class="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"></i>
                                </button>
                                ${extraRowHtml}
                            </div>
                        </div>
                    </div>

                    <button type="button" onclick="App.closeUserProfileModal()" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition cursor-pointer active:scale-[0.99]">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);

        window._profileModalEscHandler = (e) => {
            if (e.key === 'Escape') this.closeUserProfileModal();
        };
        window.addEventListener('keydown', window._profileModalEscHandler);

        setTimeout(() => {
            const backdrop = document.getElementById('user-profile-backdrop');
            if (backdrop) {
                backdrop.classList.remove('opacity-0');
                const card = backdrop.querySelector('.user-profile-card');
                if (card) card.classList.remove('scale-95');
            }
        }, 15);
    },

    async startChangePhoneFlow() {
        const step1Html = `
            <div class="text-left text-sm space-y-3 mt-3">
                <div class="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-xs text-blue-900 font-medium">
                    <i class="fa-solid fa-mobile-screen mr-1 text-blue-600"></i> Enter your new mobile phone number. We will send a 6-digit OTP code to verify it.
                </div>
                <div>
                    <label class="text-[10px] font-black uppercase text-slate-500 block mb-1">New Mobile Number</label>
                    <input type="tel" id="cpn-new-phone" placeholder="09XXXXXXXXX" maxlength="11" class="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
            </div>
        `;

        const step1Data = await CustomDialog.show({
            type: 'custom',
            title: 'Change Phone Number',
            message: 'Enter your new mobile number to receive an OTP verification code.',
            confirmText: 'Send OTP Code',
            cancelText: 'Cancel',
            extraHtml: step1Html
        });

        if (!step1Data) return;

        const phoneInput = document.getElementById('cpn-new-phone');
        let newPhone = phoneInput ? phoneInput.value.trim() : (step1Data.phone || '');
        newPhone = newPhone.replace(/[^0-9]/g, '');
        if (newPhone.length === 10 && newPhone.startsWith('9')) newPhone = '0' + newPhone;

        if (!/^09\d{9}$/.test(newPhone)) {
            CustomToast.show('Please enter a valid 11-digit mobile number (e.g. 09123456789).', 'error');
            return;
        }

        try {
            CustomToast.show('Sending verification OTP...', 'info');
            const data = new FormData();
            data.append('new_contact_number', newPhone);
            const reqRes = await API.request('request_phone_change_otp', 'POST', data);

            if (!reqRes.success) {
                CustomToast.show(reqRes.error || 'Failed to send OTP code.', 'error');
                return;
            }

            const maskedNum = reqRes.masked_new_contact || newPhone;

            const step2Html = `
                <div class="text-left text-sm space-y-3 mt-3">
                    <div class="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-xs text-blue-900 font-medium">
                        <i class="fa-solid fa-envelope mr-1 text-blue-600"></i> We sent a 6-digit OTP code to <strong>${maskedNum}</strong>.
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-500 block mb-1 text-center">6-Digit OTP Code</label>
                        ${UI.renderOtpBoxes('cpn-otp', 6)}
                    </div>
                </div>
            `;

            const step2Data = await CustomDialog.show({
                type: 'custom',
                title: 'Verify New Phone Number',
                message: 'Enter the 6-digit code sent to your new mobile number.',
                confirmText: 'Verify & Update',
                cancelText: 'Cancel',
                extraHtml: step2Html
            });

            if (!step2Data) return;

            const otpVal = (UI._syncOtpValue('cpn-otp') || step2Data.otp || '').trim();
            if (otpVal.length !== 6) {
                CustomToast.show('Please enter the full 6-digit OTP code.', 'error');
                return;
            }

            CustomToast.show('Updating phone number...', 'info');
            const verifyData = new FormData();
            verifyData.append('otp_code', otpVal);
            const updateRes = await API.request('change_phone_submit', 'POST', verifyData);

            if (updateRes.success) {
                if (State.user && State.user.data) {
                    State.user.data.contact_number = updateRes.new_contact || newPhone;
                }
                CustomDialog.show({
                    type: 'success',
                    title: 'Phone Number Updated!',
                    message: `Your account mobile number is now ${updateRes.new_contact || newPhone}.`,
                    confirmText: 'Done'
                });
            } else {
                CustomToast.show(updateRes.error || 'Failed to verify OTP.', 'error');
            }
        } catch (e) {
            CustomToast.show(e.message || 'Failed to update phone number.', 'error');
        }
    },

    async startChangePasswordFlow() {
        try {
            CustomToast.show('Requesting OTP verification code...', 'info');
            const res = await API.request('request_password_change_otp', 'POST');
            
            if (!res.success) {
                CustomToast.show(res.error || 'Failed to send OTP code.', 'error');
                return;
            }

            const maskedNumber = res.masked_contact || 'your registered number';

            const extraHtml = `
                <div class="text-left text-sm space-y-3 mt-3">
                    <div class="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-xs text-blue-900 font-medium">
                        <i class="fa-solid fa-mobile-screen mr-1 text-blue-600"></i> We sent a 6-digit OTP code to <strong>${maskedNumber}</strong>.
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-500 block mb-1 text-center">6-Digit OTP Code</label>
                        ${UI.renderOtpBoxes('cp-otp', 6)}
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-500 block mb-1">New Password (min 6 chars)</label>
                        <input type="password" id="cp-new-pass" placeholder="••••••••" class="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-black uppercase text-slate-500 block mb-1">Confirm New Password</label>
                        <input type="password" id="cp-conf-pass" placeholder="••••••••" class="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                </div>
            `;

            const resData = await CustomDialog.show({
                type: 'custom',
                title: 'Change Password',
                message: 'Enter your OTP code and new password.',
                confirmText: 'Update Password',
                cancelText: 'Cancel',
                extraHtml
            });

            if (!resData || typeof resData !== 'object') return;

            const otpCode = resData.otp;
            const newPass = resData.new_password;
            const confPass = resData.confirm_password;

            if (!otpCode || otpCode.length !== 6) {
                CustomToast.show('Please enter a valid 6-digit OTP code.', 'error');
                return;
            }

            if (!newPass || newPass.length < 6) {
                CustomToast.show('New password must be at least 6 characters.', 'error');
                return;
            }

            if (newPass !== confPass) {
                CustomToast.show('Passwords do not match.', 'error');
                return;
            }

            CustomToast.show('Updating password...', 'info');
            const submitData = new FormData();
            submitData.append('otp_code', otpCode);
            submitData.append('new_password', newPass);

            const updateRes = await API.request('change_password_submit', 'POST', submitData);
            if (updateRes.success) {
                CustomDialog.show({
                    type: 'success',
                    title: 'Password Updated!',
                    message: 'Your account password has been successfully changed.',
                    confirmText: 'Done'
                });
            }
        } catch (e) {
            CustomToast.show(e.message || 'Failed to update password.', 'error');
        }
    },

    async handleOTPVerify(e) {
        e.preventDefault();
        const code = (UI._syncOtpValue('otp-code') || document.getElementById('otp-code')?.value || '').trim();
        if (code.length !== 6) {
            CustomToast.show('Please enter the complete 6-digit OTP code.', 'error');
            const group = document.querySelector('[data-otp-group="otp-code"]');
            const unfilled = Array.from(group?.querySelectorAll('.otp-digit') || []).find(inp => !inp.value);
            if (unfilled) unfilled.focus();
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true, 'Verify & Login');
        
        const data = new FormData();
        data.append('contact_number', State.tempContact);
        data.append('otp_code', code);

        try {
            const res = await API.request('verify_registration_otp', 'POST', data);
            if (res.success) {
                CustomToast.show('Your mobile number is verified. Logging you in!', 'success');
                State.tempContact = null;
                if (window.API && window.API.clearCache) API.clearCache();
                if (window.UI && window.UI._prefetchCache) window.UI._prefetchCache = {};
                State.user = { type: 'customer', data: res };
                State.pushSubscriptionSynced = null;
                this.initPushNotifications();
                UI.goHome('replace');
            } else {
                CustomToast.show(res.error || 'Verification failed.', 'error');
                this.setLoading(btn, false, 'Verify & Login');
            }
        } catch (e) {
            console.error("OTP verify error:", e);
            CustomToast.show(e.message || 'Verification failed. Please check the code.', 'error');
            this.setLoading(btn, false, 'Verify & Login');
        }
    },

    async handleForgotPasswordRequest(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true, 'Send OTP');
        
        const phone = document.getElementById('reset-phone').value;
        const data = new FormData();
        data.append('contact_number', phone);

        try {
            const res = await API.request('forgot_password_request', 'POST', data);
            if (res.success) {
                State.tempContact = res.contact_number;
                UI.navigate('reset_password');
            } else {
                CustomToast.show(res.error || 'Failed to send OTP.', 'error');
                this.setLoading(btn, false, 'Send OTP');
            }
        } catch (e) {
            console.error("Forgot password error:", e);
            CustomToast.show(e.message || 'Failed to send OTP.', 'error');
            this.setLoading(btn, false, 'Send OTP');
        }
    },

    async handlePasswordResetSubmit(e) {
        e.preventDefault();
        const code = (UI._syncOtpValue('reset-code') || document.getElementById('reset-code')?.value || '').trim();
        if (code.length !== 6) {
            CustomToast.show('Please enter the complete 6-digit OTP code.', 'error');
            const group = document.querySelector('[data-otp-group="reset-code"]');
            const unfilled = Array.from(group?.querySelectorAll('.otp-digit') || []).find(inp => !inp.value);
            if (unfilled) unfilled.focus();
            return;
        }

        const pass = document.getElementById('reset-pass').value;
        if (!pass || pass.length < 6) {
            CustomToast.show('Password must be at least 6 characters.', 'error');
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true, 'Update Password');
        
        const data = new FormData();
        data.append('contact_number', State.tempContact);
        data.append('otp_code', code);
        data.append('new_password', pass);

        try {
            const res = await API.request('reset_password_submit', 'POST', data);
            if (res.success) {
                CustomToast.show('Password successfully reset. Please log in.', 'success');
                State.tempContact = null;
                UI.navigate('login');
            } else {
                CustomToast.show(res.error || 'Password reset failed.', 'error');
                this.setLoading(btn, false, 'Update Password');
            }
        } catch (e) {
            console.error("Password reset error:", e);
            CustomToast.show(e.message || 'Password reset failed.', 'error');
            this.setLoading(btn, false, 'Update Password');
        }
    },

    async repeatLastOrder() {
        if (!State.lastOrderGroup || !State.lastOrderGroup.items || State.lastOrderGroup.items.length === 0) {
            return CustomToast.show('No previous order found to repeat.', 'error');
        }

        const last = State.lastOrderGroup;
        const station = (State.stations || []).find(s => s.station_id == last.station_id);
        
        if (station && station.status !== 'Active') {
            return CustomToast.show(`${station.station_name} is currently closed or unavailable.`, 'error');
        }

        const summary = last.items.map(i => `${i.quantity}x ${escapeHtml(i.product_name)} (${escapeHtml(i.jug_type || 'Round')})`).join(' + ');

        CustomDialog.confirm(
            `Place 1-Tap Reorder for <strong>${summary}</strong> from <strong>${escapeHtml(last.station_name)}</strong> for <strong>₱${last.total_price.toFixed(2)}</strong> via <strong>${escapeHtml(last.payment_method)}</strong>?`,
            'Confirm 1-Tap Reorder'
        ).then(async (confirmed) => {
            if (!confirmed) return;

            if (last.payment_method === 'GCash' || last.payment_method === 'Maya') {
                State.selectedStation = last.station_id;
                State.cart = last.items.map(i => ({
                    cartId: `${i.product_id}_${i.jug_type || 'Round'}`,
                    product_id: i.product_id,
                    name: i.product_name,
                    price: parseFloat(i.total_price) / (i.quantity || 1),
                    quantity: parseInt(i.quantity || 1),
                    jug_type: i.jug_type || 'Round',
                    container_option: i.container_option || 'owned'
                }));
                CustomToast.show('Cart ready! Please attach your new payment receipt to confirm.');
                UI.navigate('customer_checkout');
                return;
            }

            const data = new FormData();
            data.append('station_id', last.station_id);
            const cartItems = last.items.map(i => ({
                product_id: i.product_id,
                quantity: parseInt(i.quantity || 1),
                jug_type: i.jug_type || 'Round',
                container_option: i.container_option || 'owned'
            }));
            data.append('cart', JSON.stringify(cartItems));
            data.append('delivery_address', last.delivery_address || (State.user?.data?.address || ''));
            data.append('payment_method', last.payment_method || 'Cash on Delivery');
            data.append('use_points', 0);
            data.append('returning_borrowed', 0);

            try {
                const res = await API.request('place_order', 'POST', data);
                if (res.success) {
                    State.cart = [];
                    State.myOrders = null;
                    if (window.UI && window.UI._prefetchCache) {
                        delete window.UI._prefetchCache['customer_orders'];
                    }
                    State.customerOrderTab = 'active';
                    CustomToast.show('Quick Reorder placed successfully!', 'success');
                    UI.navigate('customer_orders');
                } else if (res.error) {
                    CustomToast.show(res.error, 'error');
                }
            } catch (e) {
                console.error(e);
            }
        });
    },

    selectStation(id) {
        State.selectedStation = id;
        try { sessionStorage.setItem('selectedStation', String(id)); } catch(e) {}
        State.cart = []; 
        UI.navigate('customer_station');
    },

    updateCart(id, change, type = 'Round') {
        const station = State.stations.find(s => s.station_id == State.selectedStation);
        const product = station.products.find(p => p.product_id == id);
        const cartId = id + '_' + type;
        
        if (change > 0) {
            const maxStock = type === 'Round' ? (station.round_jugs || 0) : (station.slim_jugs || 0);
            const totalTypeQty = State.cart.filter(i => i.jug_type === type).reduce((sum, i) => sum + i.quantity, 0);
            if (totalTypeQty + change > maxStock) {
                CustomToast.show(`Not enough ${type} jugs in stock!`, 'error');
                return;
            }
        }

        let item = State.cart.find(i => i.cartId === cartId);
        
        if (!item && change > 0) {
            State.cart.push({ cartId: cartId, product_id: id, name: product.name, price: product.price, quantity: 1, jug_type: type });
            item = State.cart[State.cart.length - 1];
        } else if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                State.cart = State.cart.filter(i => i.cartId !== cartId);
                item = null;
            }
        }
        
        if (change > 0 && item) {
            const totalTypeQty = State.cart.filter(i => i.jug_type === type).reduce((sum, i) => sum + i.quantity, 0);
            CustomToast.show(`${type} Jug added (${totalTypeQty} in cart)`, 'success', 2000, `cart-${type}`);
        }
        
        const qtyEl = document.getElementById(`qty-${id}-${type}`);
        if(qtyEl) qtyEl.innerText = item ? item.quantity : 0;
        
        this.updateCartUI(); 
    },

    updateCartContainer(index, value) {
        if (State.cart[index]) {
            State.cart[index].container_option = value;
            this.recalculateTotal();
            if (UI._currentView === 'customer_checkout') {
                UI.renderCustomerCheckout();
            }
        }
    },

    updateCartUI() {
        const total = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalEl = document.getElementById('cart-total');
        if(totalEl) totalEl.innerText = `₱${total.toFixed(2)}`;
        
        const cartFloating = document.getElementById('floating-cart');
        if(cartFloating) {
            if(State.cart.length > 0) {
                cartFloating.classList.remove('hidden');
                void cartFloating.offsetWidth;
                cartFloating.classList.remove('translate-y-full');
                cartFloating.classList.add('translate-y-0');
            } else {
                cartFloating.classList.add('translate-y-full');
                cartFloating.classList.remove('translate-y-0');
                setTimeout(() => {
                    if (State.cart.length === 0 && cartFloating) {
                        cartFloating.classList.add('hidden');
                    }
                }, 300);
            }
        }
    },

    togglePaymentUI() {
        const method = document.querySelector('input[name="co-payment"]:checked').value;
        const gcashUI = document.getElementById('co-cashless-ui-gcash');
        const mayaUI = document.getElementById('co-cashless-ui-maya');
        const gcashInput = document.getElementById('co-receipt-gcash');
        const mayaInput = document.getElementById('co-receipt-maya');
        
        if (gcashUI) gcashUI.classList.add('hidden');
        if (mayaUI) mayaUI.classList.add('hidden');
        if (gcashInput) gcashInput.required = false;
        if (mayaInput) mayaInput.required = false;
        
        if (method === 'GCash' && gcashUI) {
            gcashUI.classList.remove('hidden');
            if (gcashInput) gcashInput.required = true;
        } else if (method === 'Maya' && mayaUI) {
            mayaUI.classList.remove('hidden');
            if (mayaInput) mayaInput.required = true;
        }
    },
    
    recalculateTotal() {
        const station = State.stations.find(s => s.station_id == State.selectedStation);
        const subtotal = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalQty = State.cart.reduce((sum, item) => sum + item.quantity, 0);
        const shippingFee = parseFloat(station.shipping_fee || 0);
        
        let jugBuyTotal = 0;
        State.cart.forEach(item => {
            if (item.container_option === 'buy') {
                jugBuyTotal += item.quantity * parseFloat(station.new_jug_price || 0);
            }
        });
        
        const usePoints = document.getElementById('co-use-points')?.checked;
        
        let finalTotal = subtotal + shippingFee + jugBuyTotal;
        
        const loyaltyRow = document.getElementById('co-loyalty-row');
        const loyaltyAmt = document.getElementById('co-loyalty-amt');
        
        if (usePoints && State.cart.length > 0) {
            const cartHash = State.cart.reduce((sum, item) => sum + parseInt(item.product_id), 0);
            const discountIndex = cartHash % State.cart.length;
            const discountValue = parseFloat(State.cart[discountIndex].price);
            finalTotal -= discountValue;
            
            if(loyaltyRow && loyaltyAmt) {
                loyaltyRow.classList.remove('hidden');
                loyaltyRow.classList.add('flex');
                loyaltyAmt.innerText = '-₱' + discountValue.toFixed(2);
            }
        } else {
            if(loyaltyRow) {
                loyaltyRow.classList.add('hidden');
                loyaltyRow.classList.remove('flex');
            }
        }
        
        const buyRow = document.getElementById('co-buy-row');
        if(buyRow) {
            if(jugBuyTotal > 0) {
                buyRow.classList.remove('hidden');
                buyRow.classList.add('flex');
                document.getElementById('co-buy-display').innerText = `+₱${jugBuyTotal.toFixed(2)}`;
            } else {
                buyRow.classList.add('hidden');
                buyRow.classList.remove('flex');
            }
        }
        
        finalTotal = Math.max(0, finalTotal);
        document.getElementById('co-total-display').innerText = `₱${finalTotal.toFixed(2)}`;
        const stickyTotal = document.getElementById('co-sticky-total');
        if (stickyTotal) stickyTotal.innerText = `₱${finalTotal.toFixed(2)}`;
    },

    async processCheckout(e) {
        e.preventDefault();
        if(State.cart.length === 0) return;
        
        const paymentRadio = document.querySelector('input[name="co-payment"]:checked');
        if (!paymentRadio) {
            CustomToast.show('Please select a payment method before confirming your order.', 'error');
            const paymentSection = document.getElementById('payment-section');
            if (paymentSection) paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        
        const method = paymentRadio.value;
        const usePoints = document.getElementById('co-use-points')?.checked ? 1 : 0;
        const returnBorrowed = document.getElementById('co-return-borrowed')?.checked ? 1 : 0;
        const scheduleType = document.getElementById('co-schedule-type').value;
        const scheduleDate = document.getElementById('co-schedule-date').value;
        
        if (scheduleType === 'Scheduled') {
            if (!scheduleDate) {
                this.setLoading(btn, false);
                return CustomToast.show('Please select your preferred delivery date and time.', 'error');
            }
            const schedTime = new Date(scheduleDate).getTime();
            const nowTime = Date.now();
            const maxTime = nowTime + (7 * 24 * 60 * 60 * 1000) + (60 * 60 * 1000);
            if (schedTime < (nowTime - (5 * 60 * 1000))) {
                this.setLoading(btn, false);
                return CustomToast.show('Scheduled delivery date cannot be in the past.', 'error');
            }
            if (schedTime > maxTime) {
                this.setLoading(btn, false);
                return CustomToast.show('Pre-orders can only be scheduled up to 1 week (7 days) ahead.', 'error');
            }
            
            const station = State.stations.find(s => s.station_id == State.selectedStation);
            if (station && station.opening_time && station.closing_time) {
                const schedDateObj = new Date(scheduleDate);
                const hh = String(schedDateObj.getHours()).padStart(2, '0');
                const mm = String(schedDateObj.getMinutes()).padStart(2, '0');
                const ss = String(schedDateObj.getSeconds()).padStart(2, '0');
                const schedTimeString = `${hh}:${mm}:${ss}`;
                
                if (schedTimeString < station.opening_time || schedTimeString > station.closing_time) {
                    this.setLoading(btn, false);
                    
                    const formatTime = (timeString) => {
                        const [h, m] = timeString.split(':');
                        const date = new Date();
                        date.setHours(h, m, 0);
                        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    };
                    
                    return CustomToast.show(`Pre-orders must be scheduled within operating hours (${formatTime(station.opening_time)} - ${formatTime(station.closing_time)}).`, 'error');
                }
            }
        }
        
        let proofBase64 = null;
        if (method === 'GCash') {
            const fileInput = document.getElementById('co-receipt-gcash');
            if (fileInput.files.length === 0) { this.setLoading(btn, false); return CustomToast.show('Please upload your GCash receipt.', 'error'); }
            proofBase64 = await this.getBase64(fileInput.files[0]);
        } else if (method === 'Maya') {
            const fileInput = document.getElementById('co-receipt-maya');
            if (fileInput.files.length === 0) { this.setLoading(btn, false); return CustomToast.show('Please upload your Maya receipt.', 'error'); }
            proofBase64 = await this.getBase64(fileInput.files[0]);
        }
        
        const data = new FormData();
        data.append('station_id', State.selectedStation);
        data.append('cart', JSON.stringify(State.cart));
        data.append('delivery_address', document.getElementById('co-address').value);
        data.append('payment_method', method); 
        if (proofBase64) data.append('payment_proof', proofBase64);
        if (scheduleType === 'Scheduled' && scheduleDate) data.append('scheduled_date', scheduleDate);
        data.append('use_points', usePoints);
        data.append('returning_borrowed', returnBorrowed);
        
        try {
            const res = await API.request('place_order', 'POST', data);
            if (res.success) {
                State.cart = [];
                State.myOrders = null;
                if (window.UI && window.UI._prefetchCache) {
                    delete window.UI._prefetchCache['customer_orders'];
                }
                State.customerOrderTab = 'active';
                CustomToast.show('Your order has been placed successfully.', 'success');
                UI.navigate('customer_orders');
            }
        } catch (e) {
            this.setLoading(btn, false);
        }
    },

    async submitRating(orderId, rating) {
        if (State.myOrders && Array.isArray(State.myOrders)) {
            const targetOrder = State.myOrders.find(o => o.order_id == orderId);
            if (targetOrder) {
                if (targetOrder.station_order_number) {
                    State.myOrders.forEach(o => {
                        if (o.station_order_number == targetOrder.station_order_number && o.station_id == targetOrder.station_id) {
                            o.rating = rating;
                        }
                    });
                } else {
                    targetOrder.rating = rating;
                }
            }
            UI._updateOrdersList();
        }

        const data = new FormData();
        data.append('order_id', orderId);
        data.append('rating', rating);
        try {
            const res = await API.request('submit_review', 'POST', data);
            if(res.success) {
                CustomToast.show('Thank you for your feedback!', 'success');
                delete UI._prefetchCache['customer_orders'];
                const freshData = await API.request('get_customer_orders', 'GET', null, true);
                if (freshData) {
                    State.myOrders = freshData;
                    UI._updateOrdersList();
                }
            }
        } catch (e) {
            console.error('Error submitting rating:', e);
        }
    },

    toggleOrderSelection(checkbox) {
        const id = checkbox.value;
        if(checkbox.checked) State.selectedOrders.add(id);
        else State.selectedOrders.delete(id);
        
        const bar = document.getElementById('bulk-action-bar');
        if(bar) {
            if(State.selectedOrders.size > 0) {
                bar.classList.remove('bulk-hidden', 'hidden');
                bar.classList.add('bulk-visible');
                const countEl = document.getElementById('bulk-count');
                if (countEl) countEl.textContent = State.selectedOrders.size;
            } else {
                bar.classList.remove('bulk-visible');
                bar.classList.add('bulk-hidden');
            }
        }
    },
    
    async applyBulkStatus() {
        if(State.selectedOrders.size === 0) return;
        const status = document.getElementById('bulk-status').value;
        const btn = document.querySelector('#bulk-action-bar button');
        this.setLoading(btn, true);
        
        const promises = Array.from(State.selectedOrders).map(id => this.updateOrderStatus(id, status, true));
        await Promise.all(promises);
        
        State.selectedOrders.clear();
        const bar = document.getElementById('bulk-action-bar');
        if(bar) {
            bar.classList.remove('bulk-visible');
            bar.classList.add('bulk-hidden');
        }
        if(State.user.data.role === 'Admin') UI.renderAdminDashboard();
        if(State.user.data.role === 'Delivery Staff') UI.renderDeliveryDashboard();
        CustomToast.show(`Updated ${promises.length} orders successfully.`, 'success');
        this.setLoading(btn, false);
    },

    async updateOrderStatus(orderId, status, skipRender = false, jugsReturned = null) {
        let prevStatus = null;
        let targetSon = null;

        if (State.adminData?.orders) {
            const match = State.adminData.orders.find(o => o.order_id == orderId);
            if (match) {
                prevStatus = match.order_status;
                targetSon = match.station_order_number;
                State.adminData.orders.forEach(o => {
                    if (targetSon && o.station_order_number === targetSon) {
                        o.order_status = status;
                    } else if (!targetSon && o.order_id == orderId) {
                        o.order_status = status;
                    }
                });
            }
        }

        if (State.deliveryData?.deliveries) {
            const match = State.deliveryData.deliveries.find(o => o.order_id == orderId);
            if (match) {
                if (!prevStatus) prevStatus = match.order_status;
                targetSon = match.station_order_number;
                State.deliveryData.deliveries.forEach(o => {
                    if (targetSon && o.station_order_number === targetSon) {
                        o.order_status = status;
                    } else if (!targetSon && o.order_id == orderId) {
                        o.order_status = status;
                    }
                });
            }
        }

        if (UI._prefetchCache) {
            delete UI._prefetchCache['admin_dashboard_data'];
            delete UI._prefetchCache['delivery_dashboard'];
        }

        if (!skipRender) {
            if (UI._currentView === 'admin_dashboard') {
                UI._updateAdminOrdersList();
            } else if (UI._currentView === 'delivery_dashboard') {
                UI._updateDeliveryList();
            }
        }

        const data = new FormData();
        data.append('order_id', orderId);
        data.append('status', status);
        if (jugsReturned !== null) {
            data.append('jugs_returned', jugsReturned ? '1' : '0');
        }
        try {
            const res = await API.request('update_order_status', 'POST', data);
            if (!res.success) throw new Error(res.error || 'Failed to update order status');
        } catch (e) {
            console.error('Order status update error:', e);
            CustomToast.show('Failed to update status on server. Reverting...', 'error');
            if (prevStatus) {
                if (State.adminData?.orders) {
                    State.adminData.orders.forEach(o => {
                        if (targetSon && o.station_order_number === targetSon) o.order_status = prevStatus;
                        else if (!targetSon && o.order_id == orderId) o.order_status = prevStatus;
                    });
                }
                if (State.deliveryData?.deliveries) {
                    State.deliveryData.deliveries.forEach(o => {
                        if (targetSon && o.station_order_number === targetSon) o.order_status = prevStatus;
                        else if (!targetSon && o.order_id == orderId) o.order_status = prevStatus;
                    });
                }
                if (UI._currentView === 'admin_dashboard') UI._updateAdminOrdersList();
                if (UI._currentView === 'delivery_dashboard') UI._updateDeliveryList();
            }
        }
    },

    confirmDelivery(orderId, requiresCollection) {
        if (!requiresCollection) {
            this.updateOrderStatus(orderId, 'Delivered');
            return;
        }

        const modalId = 'delivery-confirm-modal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        const html = `
            <div id="${modalId}" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <div class="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-bottle-water text-2xl text-blue-600"></i>
                    </div>
                    <h3 class="text-xl font-black text-slate-800 text-center mb-2">Empty Jugs Returned?</h3>
                    <p class="text-sm font-medium text-slate-500 text-center mb-6">Did the customer successfully return the required empty jugs for this order?</p>
                    
                    <div class="flex flex-col gap-3">
                        <button onclick="App._submitDeliveryConfirmation(${orderId}, true, '${modalId}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 text-sm">
                            Yes, jugs returned
                        </button>
                        <button onclick="App._submitDeliveryConfirmation(${orderId}, false, '${modalId}')" class="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-xl transition-all active:scale-95 text-sm">
                            No, jugs kept
                        </button>
                    </div>
                    <button onclick="document.getElementById('${modalId}').remove()" class="mt-4 w-full text-slate-400 hover:text-slate-600 text-xs font-bold py-2">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    _submitDeliveryConfirmation(orderId, jugsReturned, modalId) {
        document.getElementById(modalId).remove();
        this.updateOrderStatus(orderId, 'Delivered', false, jugsReturned);
    },
    
    async updateLogistics(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const data = new FormData();
        data.append('shipping_fee', document.getElementById('set_shipping').value);
        data.append('jug_discount', '0.00');
        data.append('new_jug_price', document.getElementById('set_jug_price').value);
        try {
            await API.request('admin_update_logistics', 'POST', data);
            CustomToast.show('Logistics configuration updated.', 'success');
        } catch(e) {}
        this.setLoading(btn, false);
    },
    
    async updateSecurity(e) {
        e.preventDefault();
        const user = document.getElementById('sec-user').value;
        const pass = document.getElementById('sec-pass').value;
        const conf = document.getElementById('sec-conf').value;
        if(pass && pass !== conf) return CustomToast.show("New passwords do not match.", 'error');
        
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const data = new FormData();
        data.append('username', user);
        if(pass) data.append('password', pass);
        
        try {
            const res = await API.request('admin_update_security', 'POST', data);
            if(res.success) {
                State.user.data.username = user;
                UI.updateNav();
                CustomToast.show('Security settings updated successfully.', 'success');
                document.getElementById('sec-pass').value = '';
                document.getElementById('sec-conf').value = '';
            }
        } catch (e) {}
        this.setLoading(btn, false);
    },

    async updateMaintenance(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const data = new FormData();
        data.append('last_cleaned_date', document.getElementById('set_cleaned').value);
        data.append('last_filter_changed_date', document.getElementById('set_filter').value);
        try {
            await API.request('admin_update_maintenance', 'POST', data);
            CustomToast.show('Maintenance logs updated successfully.', 'success');
        } catch(e) {}
        this.setLoading(btn, false);
    },

    async updatePaymentProfile(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const data = new FormData();
        data.append('gcash_name', document.getElementById('set_gcash_name').value);
        data.append('gcash_number', document.getElementById('set_gcash_num').value);
        data.append('maya_name', document.getElementById('set_maya_name').value);
        data.append('maya_number', document.getElementById('set_maya_num').value);
        
        const gcashFile = document.getElementById('set_gcash_qr').files[0];
        const mayaFile = document.getElementById('set_maya_qr').files[0];
        if(gcashFile) data.append('gcash_qr', await this.getBase64(gcashFile));
        if(mayaFile) data.append('maya_qr', await this.getBase64(mayaFile));
        
        try {
            await API.request('admin_update_payment_profile', 'POST', data);
            CustomToast.show('Payment profiles saved.', 'success');
            UI.renderAdminSettings(); 
        } catch(e) {
            this.setLoading(btn, false);
        }
    },

    async promptAddProduct() {
        const res = await CustomDialog.show({ type: 'product', title: 'Add Catalog Item' });
        if(res && res.name && res.price) {
            const data = new FormData();
            data.append('name', res.name);
            data.append('price', res.price);
            data.append('capacity_gallons', res.capacity_gallons);
            data.append('capacity_liters', res.capacity_liters);
            await API.request('admin_add_product', 'POST', data);
            UI.renderAdminProducts();
        }
    },

    async promptEditProduct(id, currentPrice, currentName = '', currentGal = 5.0) {
        const res = await CustomDialog.show({ 
            type: 'product', 
            title: 'Edit Catalog Item',
            name: currentName,
            price: currentPrice,
            capacity_gallons: currentGal
        });
        if(res && res.name && res.price) {
            const data = new FormData();
            data.append('product_id', id);
            data.append('name', res.name);
            data.append('price', res.price);
            data.append('capacity_gallons', res.capacity_gallons);
            data.append('capacity_liters', res.capacity_liters);
            await API.request('admin_edit_product', 'POST', data);
            UI.renderAdminProducts();
        }
    },

    async deleteProduct(id) {
        if(await CustomDialog.confirm('Delete this product? It will be hidden from customers.', 'Delete Product')) {
            const data = new FormData();
            data.append('product_id', id);
            await API.request('admin_delete_product', 'POST', data);
            UI.renderAdminProducts();
        }
    },

    async updateStationClosure(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const data = new FormData();
        data.append('is_closed', document.getElementById('set_manual_close').checked ? '1' : '0');
        data.append('closure_message', document.getElementById('set_closure_msg').value);
        
        try {
            await API.request('admin_update_closure', 'POST', data);
            CustomToast.show('Station status updated successfully.', 'success');
            UI.renderAdminSettings();
        } catch(err) {
            CustomToast.show(err.message, 'error');
        } finally {
            this.setLoading(btn, false);
        }
    },

    async updateHours(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const data = new FormData();
        data.append('opening', document.getElementById('set_open').value);
        data.append('closing', document.getElementById('set_close').value);
        try {
            await API.request('admin_update_hours', 'POST', data);
            CustomToast.show('Operating hours updated successfully.', 'success');
        } catch(e) {}
        this.setLoading(btn, false);
    },

    async addStaff(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const data = new FormData();
        data.append('username', document.getElementById('staff_user').value);
        data.append('password', document.getElementById('staff_pass').value);
        try {
            await API.request('admin_add_staff', 'POST', data);
            CustomToast.show('Staff account created.', 'success');
            UI.renderAdminSettings();
        } catch (e) {
            this.setLoading(btn, false);
        }
    },

    async toggleStaffStatus(id, status) {
        const data = new FormData();
        data.append('admin_id', id);
        data.append('status', status);
        await API.request('admin_toggle_staff', 'POST', data);
        UI.renderAdminSettings();
    },

    async updateInventory(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const r = parseInt(document.getElementById('inv-round').value) || 0;
        const s = parseInt(document.getElementById('inv-slim').value) || 0;
        const data = new FormData();
        data.append('stock_level', r + s);
        data.append('round_jugs', r);
        data.append('slim_jugs', s);
        try {
            await API.request('admin_update_advanced_inventory', 'POST', data);
            CustomToast.show('Inventory updated successfully.', 'success');
            UI.renderAdminInventory(); 
        } catch(e) {}
        this.setLoading(btn, false);
    },

    async markJugsReturned(orderId, roundQty, slimQty) {
        if(await CustomDialog.confirm(`Confirm the customer has returned ${roundQty > 0 ? roundQty + ' Round ' : ''}${slimQty > 0 ? slimQty + ' Slim' : ''}? This will restock your inventory.`, 'Confirm Return')) {
            const data = new FormData();
            data.append('order_id', orderId);
            data.append('borrow_round', roundQty);
            data.append('borrow_slim', slimQty);
            await API.request('admin_mark_returned', 'POST', data);
            
            CustomToast.show('Inventory restocked successfully.', 'success');
            UI.renderAdminInventory();
        }
    },

    async toggleStationStatus(id, newStatus) {
        const data = new FormData();
        data.append('station_id', id);
        data.append('status', newStatus);
        await API.request('sa_toggle_station', 'POST', data);
        UI.renderSuperAdminDashboard();
    },

    async deleteStation(id) {
        if(await CustomDialog.confirm("Are you sure? This will delete all data for this station. This action cannot be undone.", "Delete Station")) {
            const data = new FormData();
            data.append('station_id', id);
            try {
                await API.request('sa_delete_station', 'POST', data);
                UI.renderSuperAdminDashboard();
            } catch(e) {}
        }
    },
    
    async submitNewStation(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const data = new FormData();
        data.append('station_name', document.getElementById('sa-st-name').value);
        data.append('address', document.getElementById('sa-st-addr').value);
        data.append('contact', document.getElementById('sa-st-contact').value);
        data.append('admin_username', document.getElementById('sa-st-user').value);
        data.append('admin_password', document.getElementById('sa-st-pass').value);
        try {
            const res = await API.request('sa_add_station', 'POST', data);
            if(res.success) {
                CustomToast.show('Station Created! The admin can now log in.', 'success');
                UI.navigate('superadmin_dashboard');
            }
        } catch(e) {}
        this.setLoading(btn, false);
    },

    async toggleAdminStatus(id, newStatus) {
        const data = new FormData();
        data.append('admin_id', id);
        data.append('status', newStatus);
        const res = await API.request('sa_toggle_admin_status', 'POST', data);
        if (res.success) {
            CustomToast.show(`User status updated to ${newStatus}`, 'success');
            UI.renderSuperAdminDashboard();
        }
    },

    async deleteAdminUser(id, username) {
        if(await CustomDialog.confirm(`Are you sure you want to delete staff/admin account "${username}"? This action cannot be undone.`, "Delete User Account")) {
            const data = new FormData();
            data.append('admin_id', id);
            const res = await API.request('sa_delete_admin', 'POST', data);
            if (res.success) {
                CustomToast.show('User deleted successfully', 'success');
                UI.renderSuperAdminDashboard();
            }
        }
    },

    openAdminUserModal(admin = null) {
        const modal = document.getElementById('sa-admin-modal');
        if (!modal) return;
        document.getElementById('sa-modal-admin-id').value = admin ? admin.admin_id : '';
        document.getElementById('sa-modal-admin-user').value = admin ? admin.username : '';
        document.getElementById('sa-modal-admin-role').value = admin ? admin.role : 'Admin';
        document.getElementById('sa-modal-admin-station').value = admin ? (admin.station_id || '') : '';
        document.getElementById('sa-modal-admin-status').value = admin ? admin.status : 'Active';
        document.getElementById('sa-modal-admin-pass').value = '';
        
        const title = document.getElementById('sa-admin-modal-title');
        const passHelp = document.getElementById('sa-admin-pass-help');
        const passInput = document.getElementById('sa-modal-admin-pass');
        if (admin) {
            if (title) title.innerText = 'Edit Staff / Admin Account';
            if (passHelp) passHelp.innerText = 'Leave blank to keep existing password';
            if (passInput) passInput.required = false;
        } else {
            if (title) title.innerText = 'Add New Staff / Admin';
            if (passHelp) passHelp.innerText = 'Enter password for this new account';
            if (passInput) passInput.required = true;
        }
        
        this.toggleAdminStationDropdown();
        modal.classList.remove('hidden');
    },

    toggleAdminStationDropdown() {
        const role = document.getElementById('sa-modal-admin-role')?.value;
        const stationGroup = document.getElementById('sa-modal-station-group');
        if (stationGroup) {
            if (role === 'Super Admin') {
                stationGroup.classList.add('hidden');
                document.getElementById('sa-modal-admin-station').value = '';
            } else {
                stationGroup.classList.remove('hidden');
            }
        }
    },

    closeAdminUserModal() {
        const modal = document.getElementById('sa-admin-modal');
        if (modal) modal.classList.add('hidden');
    },

    async submitAdminUser(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const data = new FormData();
        data.append('admin_id', document.getElementById('sa-modal-admin-id').value);
        data.append('username', document.getElementById('sa-modal-admin-user').value);
        data.append('role', document.getElementById('sa-modal-admin-role').value);
        data.append('station_id', document.getElementById('sa-modal-admin-station').value);
        data.append('status', document.getElementById('sa-modal-admin-status').value);
        data.append('password', document.getElementById('sa-modal-admin-pass').value);
        
        try {
            const res = await API.request('sa_save_admin', 'POST', data);
            if (res.success) {
                CustomToast.show('Staff / Admin saved successfully', 'success');
                this.closeAdminUserModal();
                UI.renderSuperAdminDashboard();
            }
        } catch(e) {}
        this.setLoading(btn, false);
    },

    openCustomerModal(cust) {
        const modal = document.getElementById('sa-cust-modal');
        if (!modal || !cust) return;
        document.getElementById('sa-modal-cust-id').value = cust.customer_id;
        document.getElementById('sa-modal-cust-name').value = cust.full_name || '';
        document.getElementById('sa-modal-cust-phone').value = cust.contact_number || '';
        document.getElementById('sa-modal-cust-addr').value = cust.address || '';
        document.getElementById('sa-modal-cust-ver').value = cust.is_verified || 0;
        document.getElementById('sa-modal-cust-pass').value = '';
        modal.classList.remove('hidden');
    },

    closeCustomerModal() {
        const modal = document.getElementById('sa-cust-modal');
        if (modal) modal.classList.add('hidden');
    },

    async submitCustomerEdit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const data = new FormData();
        data.append('customer_id', document.getElementById('sa-modal-cust-id').value);
        data.append('full_name', document.getElementById('sa-modal-cust-name').value);
        data.append('contact_number', document.getElementById('sa-modal-cust-phone').value);
        data.append('address', document.getElementById('sa-modal-cust-addr').value);
        data.append('is_verified', document.getElementById('sa-modal-cust-ver').value);
        data.append('password', document.getElementById('sa-modal-cust-pass').value);
        
        try {
            const res = await API.request('sa_save_customer', 'POST', data);
            if (res.success) {
                CustomToast.show('Customer updated successfully', 'success');
                this.closeCustomerModal();
                UI.renderSuperAdminDashboard();
            }
        } catch(e) {}
        this.setLoading(btn, false);
    },

    async toggleCustomerVerification(id, currentStatus) {
        const newStatus = currentStatus == 1 ? 0 : 1;
        const data = new FormData();
        data.append('customer_id', id);
        data.append('is_verified', newStatus);
        const res = await API.request('sa_toggle_customer_verification', 'POST', data);
        if (res.success) {
            CustomToast.show(`Customer verification updated to ${newStatus == 1 ? 'Verified' : 'Unverified'}`, 'success');
            UI.renderSuperAdminDashboard();
        }
    },

    async deleteCustomerUser(id, name) {
        if(await CustomDialog.confirm(`Are you sure you want to delete customer account "${name}"? All related data for this customer will be removed.`, "Delete Customer Account")) {
            const data = new FormData();
            data.append('customer_id', id);
            const res = await API.request('sa_delete_customer', 'POST', data);
            if (res.success) {
                CustomToast.show('Customer account deleted successfully', 'success');
                UI.renderSuperAdminDashboard();
            }
        }
    },


    getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    formatTime(timeString) {
        if(!timeString) return '';
        const [h, m] = timeString.split(':');
        let hours = parseInt(h);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        return `${hours}:${m} ${ampm}`;
    },

    showUpdateToast(worker) {
        if (document.getElementById('pwa-update-toast')) return;
        const toast = document.createElement('div');
        toast.id = 'pwa-update-toast';
        toast.className = 'fixed bottom-6 inset-x-4 max-w-sm mx-auto z-[200] bg-slate-900/95 text-white p-3 px-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 border border-white/20 animate-bounce cursor-pointer';
        toast.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-arrows-rotate text-sm"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-xs font-black text-white leading-tight">Update Available</p>
                    <p class="text-[10px] text-slate-300 truncate">Tap to get latest fixes</p>
                </div>
            </div>
            <button id="pwa-update-btn" class="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black px-3.5 py-2 rounded-xl transition shadow-lg shadow-blue-500/30 whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer">
                Update Now
            </button>
        `;

        let isUpdating = false;
        const applyUpdate = async () => {
            if (isUpdating) return;
            isUpdating = true;

            const btn = toast.querySelector('#pwa-update-btn');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Updating...';
                btn.disabled = true;
            }

            try {
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                }
            } catch (e) {}

            try {
                if (worker) {
                    worker.postMessage({ action: 'skipWaiting' });
                }
                const reg = window.swRegistration;
                if (reg) {
                    if (reg.waiting) reg.waiting.postMessage({ action: 'skipWaiting' });
                    if (reg.installing) reg.installing.postMessage({ action: 'skipWaiting' });
                }
            } catch (e) {}

            setTimeout(() => {
                window.location.reload();
            }, 300);
        };

        toast.querySelector('#pwa-update-btn').onclick = (e) => {
            e.stopPropagation();
            applyUpdate();
        };
        toast.onclick = applyUpdate;
        document.body.appendChild(toast);
    },

    async checkForAppUpdates(showToast = true) {
        if (showToast) CustomToast.show('Checking for app updates...', 'info');
        try {
            if ('serviceWorker' in navigator && window.swRegistration) {
                await window.swRegistration.update();
                if (window.swRegistration.waiting) {
                    this.showUpdateToast(window.swRegistration.waiting);
                    return;
                }
                if (window.swRegistration.installing) {
                    this.showUpdateToast(window.swRegistration.installing);
                    return;
                }
            }
        } catch(e) {}

        if (showToast) {
            const confirmed = await CustomDialog.confirm("Your app is on the latest version. Would you like to force refresh and clear local cache anyway?", "Force Refresh");
            if (confirmed) {
                if ('caches' in window) {
                    try {
                        const keys = await caches.keys();
                        await Promise.all(keys.map(k => caches.delete(k)));
                    } catch(e) {}
                }
                window.location.reload();
            }
        }
    },

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    },

    async initPushNotifications() {
        const currentUserId = State.user?.type === 'customer' 
            ? `c_${State.user.data?.customer_id}` 
            : `a_${State.user.data?.admin_id}`;

        if (!currentUserId || currentUserId === 'c_undefined' || currentUserId === 'a_undefined') return false;
        if (State.pushSubscriptionSynced === currentUserId) return true;
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
            return false;
        }

        if (Notification.permission === 'granted') {
            await this.subscribeToPush(false);
            return true;
        }
        return false;
    },

    async subscribeToPush(showToastOnSuccess = true) {
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
            if (showToastOnSuccess) CustomToast.show('Push notifications are not supported on this browser.', 'error');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                if (showToastOnSuccess) CustomToast.show('Notification permission was not granted.', 'error');
                return false;
            }

            const reg = await navigator.serviceWorker.ready;
            const keyRes = await API.request('get_vapid_public_key', 'GET', null, true);
            if (!keyRes || !keyRes.vapid_public_key) return false;

            const appServerKey = this.urlBase64ToUint8Array(keyRes.vapid_public_key);
            
            let subscription = await reg.pushManager.getSubscription();
            if (subscription) {
                try {
                    const rawKey = subscription.options ? subscription.options.applicationServerKey : null;
                    if (rawKey) {
                        const rawKeyArray = new Uint8Array(rawKey);
                        if (rawKeyArray.length !== appServerKey.length || !rawKeyArray.every((val, i) => val === appServerKey[i])) {
                            await subscription.unsubscribe();
                            subscription = null;
                        }
                    }
                } catch (e) {
                    subscription = null;
                }
            }

            if (!subscription) {
                subscription = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: appServerKey
                });
            }

            const subJson = subscription.toJSON();
            if (showToastOnSuccess) {
                subJson.test = true;
            }

            const saveRes = await API.request('save_push_subscription', 'POST', subJson, true);
            
            if (saveRes && saveRes.success) {
                const currentUserId = State.user?.type === 'customer' 
                    ? `c_${State.user.data?.customer_id}` 
                    : `a_${State.user.data?.admin_id}`;
                State.pushSubscriptionSynced = currentUserId;
                if (showToastOnSuccess) {
                    if (saveRes.pushed) {
                        CustomToast.show('Lock-screen push notifications activated & verified! Check your lock screen.', 'success', 5000);
                    } else {
                        CustomToast.show('Lock-screen push notifications activated!', 'success', 4000);
                    }
                }
                return true;
            } else {
                if (showToastOnSuccess) {
                    CustomToast.show('Could not save push token: ' + (saveRes?.error || 'Unknown error'), 'error', 5000);
                }
            }
        } catch (e) {
            console.error('Push subscription failed:', e);
            if (showToastOnSuccess) CustomToast.show('Push setup failed: ' + (e.message || e), 'error', 5000);
        }
        return false;
    },

    refreshCurrentView() {
        if (!window.UI || !window.UI._currentView) return;
        const v = window.UI._currentView;
        console.log('App: Auto-refreshing view with network data:', v);
        switch (v) {
            case 'customer_dashboard':
                window.UI.renderCustomerDashboard();
                break;
            case 'customer_station':
                window.UI.renderCustomerStation();
                break;
            case 'customer_orders':
                window.UI.renderCustomerOrders();
                break;
            case 'customer_loyalty':
                window.UI.renderCustomerLoyalty();
                break;
            case 'admin_dashboard':
                window.UI.renderAdminDashboard();
                break;
            case 'admin_inventory':
                window.UI.renderAdminInventory();
                break;
            case 'admin_sales_report':
                window.UI.renderAdminSalesReport();
                break;
            case 'delivery_dashboard':
                window.UI.renderDeliveryDashboard();
                break;
        }
    }
};

// --- S-Grade Modularity: Sub-namespace Domain Modules ---
App.Auth = {
    handleLogin: (...args) => App.handleLogin(...args),
    handleAdminLogin: (...args) => App.handleAdminLogin(...args),
    handleRegister: (...args) => App.handleRegister(...args),
    handleOTPVerify: (...args) => App.handleOTPVerify(...args),
    handleForgotPassword: (...args) => App.handleForgotPassword(...args),
    handleResetPassword: (...args) => App.handleResetPassword(...args),
    logout: (...args) => App.logout(...args)
};

App.Customer = {
    selectStation: (...args) => App.selectStation(...args),
    updateCart: (...args) => App.updateCart(...args),
    handlePaymentMethodChange: (...args) => App.handlePaymentMethodChange(...args),
    submitOrder: (...args) => App.submitOrder(...args),
    getLoyaltyRank: (...args) => App.getLoyaltyRank(...args),
    renderOrderAgain: (...args) => App.renderOrderAgain(...args),
    submitReview: (...args) => App.submitReview(...args)
};

App.Admin = {
    updateOrderStatus: (...args) => App.updateOrderStatus(...args),
    updateLogistics: (...args) => App.updateLogistics(...args),
    updateAdvancedInventory: (...args) => App.updateAdvancedInventory(...args),
    updateHours: (...args) => App.updateHours(...args),
    updateClosure: (...args) => App.updateClosure(...args),
    updateMaintenance: (...args) => App.updateMaintenance(...args),
    updatePaymentProfile: (...args) => App.updatePaymentProfile(...args),
    addProduct: (...args) => App.addProduct(...args),
    editProduct: (...args) => App.editProduct(...args),
    deleteProduct: (...args) => App.deleteProduct(...args),
    addStaff: (...args) => App.addStaff(...args),
    toggleStaff: (...args) => App.toggleStaff(...args)
};

App.Delivery = {
    deliveryAcceptOrder: (...args) => App.deliveryAcceptOrder(...args),
    deliveryOutForDelivery: (...args) => App.deliveryOutForDelivery(...args),
    deliveryCompleteOrder: (...args) => App.deliveryCompleteOrder(...args),
    adminMarkReturned: (...args) => App.adminMarkReturned(...args)
};

App.Sync = {
    pollCustomerOrders: (...args) => App.pollCustomerOrders(...args),
    pollAdminOrders: (...args) => App.pollAdminOrders(...args),
    pollDeliveryOrders: (...args) => App.pollDeliveryOrders(...args),
    promptPwaInstall: (...args) => App.promptPwaInstall(...args),
    initPushNotifications: (...args) => App.initPushNotifications(...args)
};

window.State = State;
window.API = API;
window.UI = UI;
window.CustomDialog = CustomDialog;
window.App = App;


function dismissLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.classList.add('opacity-0');
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => {
            if (loader && loader.parentNode) loader.remove();
        }, 300);
    }
}

async function boot() {
    setTimeout(dismissLoader, 3000);

    const topLogo = document.querySelector('nav .cursor-pointer');
    if (topLogo) {
        topLogo.onclick = (e) => {
            e.preventDefault();
            UI.goHome();
        };
    }

    try {
        const res = await API.request('check_session', 'GET', null, true);
        if (res && res.logged_in) {
            State.user = { type: res.type, data: res.data };
            App.initPushNotifications();
            
            const initialHash = window.location.hash.replace('#', '');
            if (initialHash && UI.canAccessView(initialHash)) {
                UI.navigate(initialHash, 'replace');
            } else {
                UI.goHome('replace');
            }
        } else {
            // Check if offline with cached session
            const offlineSession = localStorage.getItem('cache_check_session');
            if (offlineSession && API.isOffline()) {
                try {
                    const parsed = JSON.parse(offlineSession);
                    const sData = parsed.data || parsed;
                    if (sData && sData.logged_in) {
                        State.user = { type: sData.type, data: sData.data };
                        if (window.UI && window.UI.updateOfflineState) window.UI.updateOfflineState(true);
                        const initialHash = window.location.hash.replace('#', '');
                        if (initialHash && UI.canAccessView(initialHash)) {
                            UI.navigate(initialHash, 'replace');
                        } else {
                            UI.goHome('replace');
                        }
                        dismissLoader();
                        return;
                    }
                } catch (err) {}
            }
            State.user = null;
            if (!API.isOffline() && window.API && window.API.clearCache) API.clearCache();
            UI.navigate('login', 'replace');
        }
    } catch (e) {
        const offlineSession = localStorage.getItem('cache_check_session');
        if (offlineSession) {
            try {
                const parsed = JSON.parse(offlineSession);
                const sData = parsed.data || parsed;
                if (sData && sData.logged_in) {
                    State.user = { type: sData.type, data: sData.data };
                    if (window.UI && window.UI.updateOfflineState) window.UI.updateOfflineState(true);
                    const initialHash = window.location.hash.replace('#', '');
                    if (initialHash && UI.canAccessView(initialHash)) {
                        UI.navigate(initialHash, 'replace');
                    } else {
                        UI.goHome('replace');
                    }
                    dismissLoader();
                    return;
                }
            } catch (err) {}
        }
        State.user = null;
        if (!API.isOffline() && window.API && window.API.clearCache) API.clearCache();
        UI.navigate('login', 'replace');
    }

    dismissLoader();
}

boot();

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.remove('hidden');
});

window.addEventListener('popstate', (e) => {
    const targetView = (e.state && e.state.view) ? e.state.view : UI.getHomeView();
    if (!UI.canAccessView(targetView)) {
        const safeHome = UI.getHomeView();
        history.replaceState({ view: safeHome }, '', '#' + safeHome);
        if (UI._currentView !== safeHome) {
            UI.navigate(safeHome, false);
        }
        return;
    }
    UI.navigate(targetView, false);
});

window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== UI._currentView) {
        if (!UI.canAccessView(hash)) {
            const safeHome = UI.getHomeView();
            history.replaceState({ view: safeHome }, '', '#' + safeHome);
            if (UI._currentView !== safeHome) {
                UI.navigate(safeHome, false);
            }
            return;
        }
        UI.navigate(hash, false);
    }
});

window.addEventListener('pageshow', async (e) => {
    if (e.persisted) {
        try {
            const res = await API.request('check_session', 'GET', null, true);
            if (res.logged_in) {
                State.user = { type: res.type, data: res.data };
                if (!UI.canAccessView(UI._currentView)) {
                    UI.goHome('replace');
                }
            } else {
                State.user = null;
                if (window.API && window.API.clearCache) API.clearCache();
                UI.navigate('login', 'replace');
            }
        } catch (err) {
            if (!UI.canAccessView(UI._currentView)) {
                UI.goHome('replace');
            }
        }
    }
});

setTimeout(() => {
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);
    if (isIos && !isInStandaloneMode) {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.classList.remove('hidden');
    }
}, 2000);

if ('serviceWorker' in navigator) {
    let isReloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (isReloading) return;
        isReloading = true;
        window.location.reload();
    });

    navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data && event.data.type === 'ORDER_PUSH_RECEIVED') {
            const payload = event.data.payload || {};
            
            // Audible chime feedback
            if (window.App && window.App.playNotificationChime) {
                window.App.playNotificationChime();
            }

            // Visible in-app toast notification with navigation callback
            if (payload.title && typeof CustomToast !== 'undefined') {
                const toastMsg = payload.body ? `${payload.title}\n${payload.body}` : payload.title;
                CustomToast.show(toastMsg, 'info', 7000, () => {
                    if (payload.url) {
                        const hashPart = payload.url.split('#')[1];
                        if (hashPart && window.UI && window.UI.navigate) {
                            window.UI.navigate(hashPart);
                        }
                    }
                });
            }

            if (window.UI && window.UI._prefetchCache) {
                delete window.UI._prefetchCache['customer_orders'];
                delete window.UI._prefetchCache['admin_dashboard_data'];
                delete window.UI._prefetchCache['delivery_dashboard'];
            }
            if (window.UI && window.UI._currentView === 'customer_orders') {
                try {
                    const freshOrders = await API.request('get_customer_orders', 'GET', null, true);
                    if (freshOrders && Array.isArray(freshOrders)) {
                        State.myOrders = freshOrders;
                        window.UI._updateOrdersList();
                    }
                } catch(e) {}
            } else if (window.UI && window.UI._currentView === 'admin_dashboard') {
                try {
                    const freshAdmin = await API.request('get_admin_dashboard_data', 'GET', null, true);
                    if (freshAdmin) {
                        State.adminData = freshAdmin;
                        window.UI._updateAdminOrdersList();
                    }
                } catch(e) {}
            } else if (window.UI && window.UI._currentView === 'delivery_dashboard') {
                try {
                    const freshDeliv = await API.request('get_admin_dashboard_data', 'GET', null, true);
                    if (freshDeliv) {
                        State.deliveryData = freshDeliv;
                        window.UI._updateDeliveryList();
                    }
                } catch(e) {}
            }
        }
    });

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
            .then(reg => {
                window.swRegistration = reg;

                if (reg.waiting) {
                    App.showUpdateToast(reg.waiting);
                }

                reg.update().catch(() => {});

                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                App.showUpdateToast(newWorker);
                            }
                        });
                    }
                });
            })
            .catch(err => console.error('SW register failed', err));
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && window.swRegistration) {
            window.swRegistration.update().catch(() => {});
        }
    });

    window.addEventListener('focus', () => {
        if (window.swRegistration) window.swRegistration.update().catch(() => {});
    });

    setInterval(() => {
        if (window.swRegistration) window.swRegistration.update().catch(() => {});
    }, 5 * 60 * 1000);
}

// Global Online & Offline Network Detection Listeners
window.addEventListener('online', () => {
    console.log('App: Online connection restored');
    if (window.UI && window.UI.updateOfflineState) {
        window.UI.updateOfflineState(false);
    }
    if (window.App && window.App.refreshCurrentView) {
        window.App.refreshCurrentView();
    }
});

window.addEventListener('offline', () => {
    console.log('App: Network disconnected, switching to offline mode');
    if (window.UI && window.UI.updateOfflineState) {
        window.UI.updateOfflineState(true);
    }
});

// Automatically pause/resume polling when tab visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (State.pollingInterval) {
            clearInterval(State.pollingInterval);
            State.pollingInterval = null;
        }
    } else {
        if (window.App && window.App.refreshCurrentView) {
            window.App.refreshCurrentView();
        }
    }
});