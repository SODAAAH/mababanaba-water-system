const escapeHtml = (unsafe) => {
    if(unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};
if (typeof window !== 'undefined') window.escapeHtml = escapeHtml;

const CustomDialog = {
    createContainer() {
        if(document.getElementById('custom-dialog-container')) return;
        const div = document.createElement('div');
        div.id = 'custom-dialog-container';
        document.body.appendChild(div);
    },
    close(result = null) {
        const container = document.getElementById('custom-dialog-container');
        if (!container) return;
        const backdrop = document.getElementById('dialog-backdrop');
        if (backdrop) {
            backdrop.classList.add('opacity-0');
            if (backdrop.firstElementChild) backdrop.firstElementChild.classList.add('scale-95');
        }
        setTimeout(() => { container.innerHTML = ''; }, 200);
    },
    show({ type, title, message, defaultValue = '', confirmText = 'OK', cancelText = 'Cancel', extraHtml = '', name = '', price = '', capacity_gallons = 5.0, capacity_liters = 20.0, confirmClass = '' }) {
        this.createContainer();
        return new Promise((resolve) => {
            const container = document.getElementById('custom-dialog-container');
            
            let inputHtml = '';
            if (type === 'prompt') {
                inputHtml = `<input type="text" id="dialog-input" class="w-full mt-4 p-3 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition" value="${defaultValue}">`;
            } else if (type === 'product') {
                inputHtml = `
                    <div class="space-y-3 mt-4 text-left">
                        <div>
                            <label class="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Water / Product Name</label>
                            <input type="text" id="dialog-type" class="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium" placeholder="e.g., Purified Water" value="${name}">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Jug Capacity / Volume</label>
                            <select id="dialog-capacity" class="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-slate-700">
                                <option value="5.0|20.0" ${parseFloat(capacity_gallons) == 5.0 ? 'selected' : ''}>5 Gallons (20 Liters) - Standard</option>
                                <option value="2.5|10.0" ${parseFloat(capacity_gallons) == 2.5 ? 'selected' : ''}>2.5 Gallons (10 Liters)</option>
                                <option value="1.0|3.8" ${parseFloat(capacity_gallons) == 1.0 ? 'selected' : ''}>1 Gallon (3.8 Liters)</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Price (₱)</label>
                            <input type="number" id="dialog-price" class="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-blue-600" placeholder="0.00" step="0.01" value="${price}">
                        </div>
                    </div>
                `;
            }
            
            inputHtml += extraHtml;

            let cancelBtnHtml = '';
            if (type === 'confirm' || type === 'prompt' || type === 'product' || type === 'custom') {
                cancelBtnHtml = `<button id="dialog-cancel" class="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">${cancelText}</button>`;
            }

            let iconClass = 'fa-bell text-blue-500 bg-blue-100';
            if(type === 'error') iconClass = 'fa-circle-xmark text-red-500 bg-red-100';
            if(type === 'success') iconClass = 'fa-circle-check text-green-500 bg-green-100';
            if(type === 'confirm') iconClass = 'fa-circle-exclamation text-orange-500 bg-orange-100';
            if(title.includes('Inventory')) iconClass = 'fa-boxes-stacked text-emerald-500 bg-emerald-100';
            if(title.includes('Water') || title.includes('Refill') || title.includes('Hydration')) iconClass = 'fa-droplet text-blue-500 bg-blue-100';
            if(title.includes('Profile') || title.includes('Account')) iconClass = 'fa-user-gear text-blue-600 bg-blue-100';
            if(title.includes('Password') || title.includes('Security') || title.includes('OTP')) iconClass = 'fa-shield-halved text-amber-500 bg-amber-100';

            const defaultConfirmStyle = confirmText === 'Close' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-blue-600 text-white shadow-md hover:bg-blue-700';

            container.innerHTML = `
                <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 opacity-0 transition-opacity duration-200" id="dialog-backdrop">
                    <div class="bg-white rounded-3xl shadow-2xl shadow-blue-500/15 border border-blue-200/80 ring-2 ring-blue-500/30 max-w-sm w-full p-6 text-center transform scale-95 transition-transform duration-200 flex flex-col max-h-[90vh] relative">
                        <button onclick="CustomDialog.close()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition active:scale-95" title="Close"><i class="fa-solid fa-times text-sm"></i></button>
                        <div class="overflow-y-auto hide-scrollbar" style="scrollbar-width: none; -ms-overflow-style: none;">
                            <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${iconClass.split(' ')[2]}">
                                <i class="fa-solid ${iconClass.split(' ')[0]} ${iconClass.split(' ')[1]} text-3xl"></i>
                            </div>
                            <h3 class="text-xl font-black text-slate-900 mb-2">${title}</h3>
                            ${message ? `<p class="text-sm text-slate-500 font-medium leading-relaxed">${message}</p>` : ''}
                            ${inputHtml}
                        </div>
                        <div class="flex gap-3 mt-6 shrink-0 pt-2 bg-white">
                            ${cancelBtnHtml}
                            <button id="dialog-confirm" class="flex-1 px-4 py-3 ${confirmClass || defaultConfirmStyle} font-bold rounded-xl transition">${confirmText}</button>
                        </div>
                    </div>
                </div>
            `;

            setTimeout(() => {
                const backdrop = document.getElementById('dialog-backdrop');
                if (backdrop) {
                    backdrop.classList.remove('opacity-0');
                    if (backdrop.firstElementChild) backdrop.firstElementChild.classList.remove('scale-95');
                }
                const firstOtp = container.querySelector('.otp-digit');
                if (firstOtp) firstOtp.focus();
            }, 10);

            const closeDialog = (result) => {
                document.getElementById('dialog-backdrop').classList.add('opacity-0');
                document.getElementById('dialog-backdrop').firstElementChild.classList.add('scale-95');
                setTimeout(() => { container.innerHTML = ''; resolve(result); }, 200);
            };

            document.getElementById('dialog-confirm').addEventListener('click', () => {
                let res;
                if (type === 'prompt') {
                    res = document.getElementById('dialog-input').value;
                } else if (type === 'product') {
                    const t = document.getElementById('dialog-type').value.trim();
                    const p = document.getElementById('dialog-price').value.trim();
                    const capEl = document.getElementById('dialog-capacity');
                    const capVal = capEl ? capEl.value.split('|') : ['5.0', '20.0'];
                    const capGal = parseFloat(capVal[0] || 5.0);
                    const capLit = parseFloat(capVal[1] || 20.0);
                    if(!t || !p) { return; }
                    res = { name: t, price: p, capacity_gallons: capGal, capacity_liters: capLit };
                } else if (type === 'custom') {
                    const rEl = document.getElementById('inv-round');
                    const sEl = document.getElementById('inv-slim');
                    const cpOtp = document.getElementById('cp-otp');
                    const cpPass = document.getElementById('cp-new-pass');
                    const cpConf = document.getElementById('cp-conf-pass');
                    const cpnPhone = document.getElementById('cpn-new-phone');
                    const cpnOtp = document.getElementById('cpn-otp');
                    if(rEl && sEl) {
                        res = { round: rEl.value, slim: sEl.value };
                    } else if(cpnOtp) {
                        UI._syncOtpValue('cpn-otp');
                        res = { otp: (cpnOtp?.value || '').trim() };
                    } else if(cpnPhone) {
                        res = { phone: (cpnPhone?.value || '').trim() };
                    } else if(cpOtp || cpPass || cpConf) {
                        if (cpOtp) UI._syncOtpValue('cp-otp');
                        res = { 
                            otp: (cpOtp?.value || '').trim(), 
                            new_password: cpPass?.value || '', 
                            confirm_password: cpConf?.value || '' 
                        };
                    } else {
                        res = true;
                    }
                } else {
                    res = true;
                }
                closeDialog(res);
            });
            
            const cancelBtn = document.getElementById('dialog-cancel');
            if (cancelBtn) cancelBtn.addEventListener('click', () => closeDialog(type === 'prompt' || type === 'product' || type === 'custom' ? null : false));
        });
    },
    alert(message, title = 'Mababanaba Waters') { 
        let type = 'info';
        const tLow = title.toLowerCase();
        if(tLow.includes('success') || tLow.includes('confirm') || tLow.includes('returned') || tLow.includes('saved') || tLow.includes('updated')) type = 'success';
        if(tLow.includes('error') || tLow.includes('failed') || tLow.includes('notice') || tLow.includes('invalid')) type = 'error';
        return this.show({ type, title, message }); 
    },
    confirm(message, title = 'Confirm') { return this.show({ type: 'confirm', title, message, confirmText: 'Yes', cancelText: 'No' }); },
    prompt(message, defaultValue = '', title = 'Input Required') { return this.show({ type: 'prompt', title, message, defaultValue }); }
};

const CustomToast = {
    _activeToasts: new Map(),

    show(message, type = 'success', duration = 2500, key = null) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none items-center w-full max-w-sm px-4';
            document.body.appendChild(container);
        }

        const toastKey = key || message;
        let toast = this._activeToasts.get(toastKey);

        let icon = '<i class="fa-solid fa-circle-info text-blue-500"></i>';
        if (type === 'success') {
            icon = '<i class="fa-solid fa-circle-check text-emerald-500"></i>';
        } else if (type === 'error') {
            icon = '<i class="fa-solid fa-circle-exclamation text-red-500"></i>';
        } else if (type === 'warning') {
            icon = '<i class="fa-solid fa-triangle-exclamation text-amber-500"></i>';
        } else if (type === 'loading') {
            icon = '<i class="fa-solid fa-circle-notch fa-spin text-blue-500"></i>';
        } else if (type === 'info') {
            icon = '<i class="fa-solid fa-circle-info text-blue-500"></i>';
        }

        if (toast && toast.parentNode === container) {
            const msgSpan = toast.querySelector('.toast-msg');
            if (msgSpan) msgSpan.innerHTML = escapeHtml(message);
            const iconDiv = toast.querySelector('.shrink-0');
            if (iconDiv) iconDiv.innerHTML = icon;
            toast.classList.remove('scale-100');
            toast.classList.add('scale-105');
            setTimeout(() => toast.classList.remove('scale-105'), 150);

            if (toast._timeout) clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => {
                toast.classList.add('-translate-y-10', 'opacity-0');
                setTimeout(() => {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                    CustomToast._activeToasts.delete(toastKey);
                }, 300);
            }, duration);
            return;
        }

        while (container.children.length >= 2) {
            const oldToast = container.firstChild;
            if (oldToast && oldToast._key) CustomToast._activeToasts.delete(oldToast._key);
            container.removeChild(oldToast);
        }

        toast = document.createElement('div');
        toast._key = toastKey;
        toast.className = 'bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl rounded-2xl px-4 py-2.5 flex items-center gap-3 text-sm font-bold text-slate-800 transform -translate-y-10 opacity-0 transition-all duration-200 pointer-events-auto w-max max-w-full';
        toast.innerHTML = `<div class="shrink-0 text-lg">${icon}</div> <span class="toast-msg break-words leading-tight">${escapeHtml(message)}</span>`;
        
        container.appendChild(toast);
        this._activeToasts.set(toastKey, toast);
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.remove('-translate-y-10', 'opacity-0');
            });
        });
        
        toast._timeout = setTimeout(() => {
            toast.classList.add('-translate-y-10', 'opacity-0');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
                CustomToast._activeToasts.delete(toastKey);
            }, 300);
        }, duration);
    },

    dismiss(key) {
        if (!key) {
            this._activeToasts.forEach((toast, k) => {
                toast.classList.add('-translate-y-10', 'opacity-0');
                setTimeout(() => {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                    CustomToast._activeToasts.delete(k);
                }, 200);
            });
            return;
        }
        const toast = this._activeToasts.get(key);
        if (toast) {
            if (toast._timeout) clearTimeout(toast._timeout);
            toast.classList.add('-translate-y-10', 'opacity-0');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
                CustomToast._activeToasts.delete(key);
            }, 200);
        }
    }
};
window.CustomToast = CustomToast;

const VIEW_DEPTH = {
    'login': 0, 'register': 1, 'otp_verify': 2, 'forgot_password': 1, 'reset_password': 2,
    'customer_dashboard': 1, 'customer_station': 2, 'customer_checkout': 3, 'customer_orders': 2, 'customer_loyalty': 2,
    'superadmin_dashboard': 1, 'sa_add_station': 2,
    'admin_dashboard': 1, 'admin_sales_report': 2, 'admin_inventory': 2, 'admin_products': 2, 'admin_loyalty': 2, 'admin_settings': 2,
    'delivery_dashboard': 1
};

const ROUTE_PERMISSIONS = {
    // Guest only (unauthenticated)
    'login': 'guest',
    'register': 'guest',
    'otp_verify': 'guest',
    'forgot_password': 'guest',
    'reset_password': 'guest',

    // Customer only
    'customer_dashboard': 'customer',
    'customer_station': 'customer',
    'customer_checkout': 'customer',
    'customer_orders': 'customer',
    'customer_loyalty': 'customer',

    // Super Admin only
    'superadmin_dashboard': 'superadmin',
    'sa_add_station': 'superadmin',

    // Admin only
    'admin_dashboard': 'admin',
    'admin_sales_report': 'admin',
    'admin_inventory': 'admin',
    'admin_products': 'admin',
    'admin_loyalty': 'admin',
    'admin_settings': 'admin',
    'admin_security': 'admin',

    // Delivery Staff only
    'delivery_dashboard': 'delivery'
};

const UI = {
    _currentView: null,
    _pendingTransition: null,
    _prefetchCache: {},

    showToast(message, type = 'info', duration = 3000) {
        CustomToast.show(message, type, duration);
    },

    updateOfflineState(isOffline, message) {
    },


    showPrivacyPolicy() {
        const extraHtml = `
            <div class="text-left text-sm text-slate-600 space-y-4 mt-2 max-h-[50vh] overflow-y-auto pr-2">
                <p>In compliance with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>, Mababanaba Waters is committed to protecting your personal information.</p>
                
                <h4 class="font-black text-slate-800 text-base border-b border-slate-100 pb-1">1. Information We Collect</h4>
                <ul class="list-disc pl-5 space-y-2">
                    <li><strong>Full Name:</strong> To identify you as our customer.</li>
                    <li><strong>Mobile Number:</strong> Used for account verification (OTP), SMS notifications, and driver communication.</li>
                    <li><strong>Complete Address & Location:</strong> Required strictly for dispatching deliveries to your home.</li>
                    <li><strong>Order & Container History:</strong> To track borrowed jugs (Round/Slim), calculate loyalty points, determine your priority dispatch rank tier (Diamond, Platinum, etc.), and analyze hydration cycles for Smart Refill Prediction.</li>
                    <li><strong>Device Endpoints (Push API):</strong> We securely store your device push subscription endpoint to send real-time order updates to your lock screen.</li>
                    <li><strong>Payment Proofs:</strong> If you use GCash/Maya, uploaded receipts are stored temporarily for verification.</li>
                </ul>
                
                <h4 class="font-black text-slate-800 text-base border-b border-slate-100 pb-1 mt-4">2. How We Use Your Data</h4>
                <p>Your data is exclusively used for fulfilling your water orders, ensuring account security, and delivering our services efficiently. We <strong>never</strong> sell, rent, or share your data with third-party marketing agencies.</p>
                
                <h4 class="font-black text-slate-800 text-base border-b border-slate-100 pb-1 mt-4">3. Your Rights</h4>
                <p>You have the right to access, correct, or request deletion of your personal data at any time by contacting your assigned water station admin.</p>
            </div>
        `;
        CustomDialog.show({ type: 'info', title: 'Data Privacy Policy', message: '', confirmText: 'I Understand', extraHtml });
    },

    renderOtpBoxes(id = 'otp-code', count = 6) {
        return `
            <div class="otp-boxes-wrapper flex justify-center items-center gap-1.5 sm:gap-2.5 my-3" data-otp-group="${id}">
                <input type="hidden" id="${id}" name="${id}" value="">
                ${Array.from({ length: count }, (_, i) => `
                    <input 
                        type="text" 
                        inputmode="numeric" 
                        pattern="[0-9]*"
                        maxlength="1" 
                        class="otp-digit w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition-all caret-blue-600 selection:bg-blue-500 selection:text-white"
                        data-index="${i}"
                        data-otp-id="${id}"
                        autocomplete="${i === 0 ? 'one-time-code' : 'off'}"
                        oninput="UI.onOtpDigitInput(event, '${id}', ${i}, ${count})"
                        onkeydown="UI.onOtpDigitKeydown(event, '${id}', ${i}, ${count})"
                        onpaste="UI.onOtpPaste(event, '${id}', ${count})"
                        onfocus="this.select()"
                    >
                `).join('')}
            </div>
        `;
    },

    onOtpDigitInput(e, id, index, count) {
        const group = document.querySelector(`[data-otp-group="${id}"]`);
        if (!group) return;
        const inputs = Array.from(group.querySelectorAll('.otp-digit'));
        let val = e.target.value.replace(/[^0-9]/g, '');

        if (val.length > 1) {
            const chars = val.split('').slice(0, count);
            chars.forEach((c, idx) => {
                if (inputs[idx]) inputs[idx].value = c;
            });
            const focusIdx = Math.min(chars.length, count - 1);
            if (inputs[focusIdx]) {
                inputs[focusIdx].focus();
                inputs[focusIdx].select();
            }
        } else {
            e.target.value = val;
            if (val && index < count - 1) {
                if (inputs[index + 1]) {
                    inputs[index + 1].focus();
                    inputs[index + 1].select();
                }
            }
        }
        this._syncOtpValue(id);
    },

    onOtpDigitKeydown(e, id, index, count) {
        const group = document.querySelector(`[data-otp-group="${id}"]`);
        if (!group) return;
        const inputs = Array.from(group.querySelectorAll('.otp-digit'));

        if (e.key === 'Backspace') {
            if (!e.target.value && index > 0) {
                e.preventDefault();
                const prev = inputs[index - 1];
                if (prev) {
                    prev.value = '';
                    prev.focus();
                    prev.select();
                }
            } else {
                setTimeout(() => this._syncOtpValue(id), 0);
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            inputs[index - 1]?.focus();
            inputs[index - 1]?.select();
        } else if (e.key === 'ArrowRight' && index < count - 1) {
            e.preventDefault();
            inputs[index + 1]?.focus();
            inputs[index + 1]?.select();
        }
    },

    onOtpPaste(e, id, count) {
        e.preventDefault();
        const clipboardData = e.clipboardData || window.clipboardData;
        const text = clipboardData ? clipboardData.getData('text') : '';
        const digits = text.replace(/[^0-9]/g, '').slice(0, count);
        if (!digits) return;

        const group = document.querySelector(`[data-otp-group="${id}"]`);
        if (!group) return;
        const inputs = Array.from(group.querySelectorAll('.otp-digit'));

        for (let i = 0; i < count; i++) {
            if (inputs[i]) inputs[i].value = digits[i] || '';
        }
        const focusIdx = Math.min(digits.length, count - 1);
        if (inputs[focusIdx]) inputs[focusIdx].focus();
        this._syncOtpValue(id);
    },

    _syncOtpValue(id) {
        const group = document.querySelector(`[data-otp-group="${id}"]`);
        if (!group) return '';
        const inputs = Array.from(group.querySelectorAll('.otp-digit'));
        const fullCode = inputs.map(input => input.value).join('');
        const hidden = document.getElementById(id);
        if (hidden) {
            hidden.value = fullCode;
        }
        return fullCode;
    },



    prefetch(key, apiFn) {
        if (this._prefetchCache[key]?.loading) return this._prefetchCache[key].promise;
        const promise = API.request(apiFn, 'GET', null, true).then(data => {
            this._prefetchCache[key] = { loading: false, data, ts: Date.now() };
            return data;
        }).catch(() => {
            this._prefetchCache[key] = { loading: false, data: this._prefetchCache[key]?.data || null };
            return null;
        });
        this._prefetchCache[key] = { loading: true, data: this._prefetchCache[key]?.data || null, promise };
        return promise;
    },

    getPrefetched(key) {
        const entry = this._prefetchCache[key];
        if (entry && entry.data && (Date.now() - (entry.ts || 0)) < 30000) return entry.data;
        return null;
    },

    emptyState(icon, title, message) {
        return `
            <div class="col-span-full flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 mb-6">
                <div class="w-24 h-24 bg-blue-50/50 rounded-full flex items-center justify-center mb-5 pulse-soft shadow-inner border border-blue-100/50">
                    <i class="fa-solid ${icon} text-4xl text-blue-400 drop-shadow-sm"></i>
                </div>
                <h3 class="text-xl font-black text-slate-800 tracking-tight">${escapeHtml(title)}</h3>
                <p class="text-sm text-slate-500 mt-2 max-w-xs leading-relaxed">${escapeHtml(message)}</p>
            </div>
        `;
    },

    canAccessView(view) {
        const required = ROUTE_PERMISSIONS[view];
        if (!required) return false;

        if (!State.user) {
            return required === 'guest';
        }

        // Logged-in users should not access guest authentication pages
        if (required === 'guest') {
            return false;
        }

        if (State.user.type === 'customer') {
            return required === 'customer';
        }

        if (State.user.type === 'admin') {
            const role = (State.user.data?.role || 'Admin').toLowerCase();
            if (role === 'super admin') return required === 'superadmin';
            if (role === 'delivery staff') return required === 'delivery';
            return required === 'admin';
        }

        return false;
    },

    getHomeView() {
        if (!State.user) return 'login';
        if (State.user.type === 'customer') return 'customer_dashboard';
        if (State.user.type === 'admin') {
            const role = (State.user.data?.role || 'Admin').toLowerCase();
            if (role === 'super admin') return 'superadmin_dashboard';
            if (role === 'delivery staff') return 'delivery_dashboard';
            return 'admin_dashboard';
        }
        return 'login';
    },

    goHome(stateAction = 'auto') {
        const targetView = this.getHomeView();
        if (targetView !== 'login') {
            App.requestNotificationPermission();
            App.startHeartbeat();
        }
        return this.navigate(targetView, stateAction);
    },

    updateNav() {
        const navActions = document.getElementById('nav-actions');
        if (!navActions) return; 
        
        if (!State.user) {
            navActions.innerHTML = '';
            return;
        }
        let displayName = State.user.type === 'customer' ? State.user.data.full_name.split(' ')[0] : State.user.data.username;
        navActions.innerHTML = `
            <div class="flex items-center gap-2 sm:gap-3">
                <button onclick="App.openUserProfileModal()" class="text-xs sm:text-sm font-bold text-blue-100 hover:text-white flex items-center gap-1.5 sm:gap-2 max-w-[180px] p-1 pr-2 rounded-full hover:bg-white/10 active:scale-95 transition text-left cursor-pointer group" title="Account & Security">
                    <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500 group-hover:bg-blue-400 flex items-center justify-center shadow-inner shrink-0 transition">
                        <i class="fa-solid fa-user text-[10px] sm:text-xs"></i>
                    </div>
                    <span class="truncate">Hi, ${displayName}</span>
                </button>
                <button onclick="UI.logout()" class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-blue-600 hover:bg-slate-100 flex items-center justify-center transition shadow-sm shrink-0 cursor-pointer" title="Logout">
                    <i class="fa-solid fa-arrow-right-from-bracket text-xs sm:text-sm"></i>
                </button>
            </div>
        `;
    },

    async logout() {
        if(await CustomDialog.confirm("Are you sure you want to log out?")) {
            try {
                let subPayload = null;
                if ('serviceWorker' in navigator && window.swRegistration) {
                    const sub = await window.swRegistration.pushManager.getSubscription();
                    if (sub) subPayload = { endpoint: sub.endpoint };
                }
                await API.request('logout', 'POST', subPayload, true);
            } catch (e) {}
            State.user = null;
            State.pushSubscriptionSynced = null;
            if (this._prefetchCache) this._prefetchCache = {};
            State.adminData = null;
            State.adminActiveFilter = 'all';
            State.myOrders = null;
            State.deliveryData = null;
            State.salesData = null;
            State.knownAdminOrderIds = new Set();
            State.adminPollingInitialized = false;
            State.adminSessionStartTime = null;
            State.knownCustomerOrderStatuses = new Map();
            State.customerPollingInitialized = false;
            State.customerSessionStartTime = null;
            State.knownDeliveryOrderIds = new Set();
            State.deliveryPollingInitialized = false;
            State.deliverySessionStartTime = null;
            if(State.pollingInterval) {
                clearInterval(State.pollingInterval);
                State.pollingInterval = null;
            }
            if(State.heartbeatInterval) {
                clearInterval(State.heartbeatInterval);
                State.heartbeatInterval = null;
            }
            if (window.API && window.API.clearCache) API.clearCache();
            if ('caches' in window) {
                try {
                    caches.keys().then(names => {
                        names.forEach(name => {
                            if (name.includes('api')) caches.delete(name);
                        });
                    });
                } catch(ce) {}
            }
            State.csrfToken = null;
            this.navigate('login', 'replace');
            API.request('check_session').catch(() => {});
        }
    },

    goBack(fallbackView) {
        if (fallbackView) {
            this.navigate(fallbackView);
        } else {
            this.goHome();
        }
    },

    navigate(view, stateAction = 'auto') {
        if (!this.canAccessView(view)) {
            const fallback = this.getHomeView();
            if (this._currentView === fallback) {
                history.replaceState({ view: fallback }, '', '#' + fallback);
                return;
            }
            return this.navigate(fallback, 'replace');
        }

        if(State.pollingInterval) {
            clearInterval(State.pollingInterval);
            State.pollingInterval = null;
        }
        State.adminPollingInitialized = false;
        State.customerPollingInitialized = false;
        State.deliveryPollingInitialized = false;
        this.updateNav();
        const root = document.getElementById('app-root');
        if (root) root.scrollTop = 0;
        window.scrollTo(0, 0); 
        
        const oldDepth = VIEW_DEPTH[this._currentView] ?? 0;
        const newDepth = VIEW_DEPTH[view] ?? 0;
        if (newDepth > oldDepth) {
            this._pendingTransition = 'page-transition-forward';
        } else if (newDepth < oldDepth) {
            this._pendingTransition = 'page-transition-back';
        } else {
            this._pendingTransition = 'page-transition-fade';
        }
        this._currentView = view;
        
        if (stateAction === 'auto') {
            if (newDepth <= 1 || newDepth < oldDepth) stateAction = 'replace';
            else stateAction = 'push';
        }
        
        if (stateAction === 'push') {
            history.pushState({ view: view }, '', '#' + view);
        } else if (stateAction === 'replace') {
            history.replaceState({ view: view }, '', '#' + view);
        }
        
        switch(view) {
            case 'login': this.renderLogin(); break;
            case 'register': this.renderRegister(); break;
            case 'otp_verify': this.renderOTPVerify(); break;
            case 'forgot_password': this.renderForgotPassword(); break;
            case 'reset_password': this.renderResetPassword(); break;
            case 'customer_dashboard': this.renderCustomerDashboard(); break;
            case 'customer_station': this.renderCustomerStation(); break;
            case 'customer_checkout': this.renderCustomerCheckout(); break;
            case 'customer_orders': this.renderCustomerOrders(); break;
            case 'customer_loyalty': this.renderCustomerLoyalty(); break;
            case 'superadmin_dashboard': this.renderSuperAdminDashboard(); break;
            case 'sa_add_station': this.renderSaAddStation(); break;
            case 'admin_dashboard': this.renderAdminDashboard(); break;
            case 'admin_sales_report': this.renderAdminSalesReport(); break;
            case 'admin_inventory': this.renderAdminInventory(); break;
            case 'delivery_dashboard': this.renderDeliveryDashboard(); break;
            case 'admin_products': this.renderAdminProducts(); break;
            case 'admin_loyalty': this.renderAdminLoyalty(); break;
            case 'admin_settings': this.renderAdminSettings(); break;
            case 'admin_security': State.adminSettingsTab = 'Security'; this.renderAdminSettings(); break;
        }
    },

    html(content) {
        const root = document.getElementById('app-root');
        if(root) {
            const transClass = this._pendingTransition || '';
            this._pendingTransition = null;
            
            const centeredViews = ['login', 'register', 'otp_verify', 'forgot_password', 'reset_password'];
            const isCentered = centeredViews.includes(this._currentView);
            
            const wrapperClass = isCentered 
                ? "max-w-5xl mx-auto p-4 md:p-6 lg:p-8 min-h-[calc(100dvh-64px)] flex flex-col justify-center pb-8" 
                : "max-w-5xl mx-auto p-4 md:p-6 lg:p-8 pb-24";
                
            root.innerHTML = `<div class="${wrapperClass} ${transClass}">${content}</div>`;
            root.scrollTop = 0;
            requestAnimationFrame(() => {
                const r = document.getElementById('app-root');
                if (r) r.scrollTop = 0;
            });
        }
    },

    renderLogin() {
        this.html(`
            <div class="flex flex-col md:flex-row bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden fade-in min-h-[500px]">
                
                <!-- Branding Side (Hidden on Mobile) -->
                <div class="hidden md:flex flex-col items-center justify-center flex-1 bg-gradient-to-br from-blue-600 to-blue-700 text-white p-12 text-center relative overflow-hidden">
                    <div class="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                    <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400 opacity-20 rounded-full blur-3xl"></div>
                    <i class="fa-solid fa-droplet text-8xl drop-shadow-lg mb-6 z-10 pulse-soft"></i>
                    <h1 class="text-4xl font-black tracking-tighter mb-4 z-10 drop-shadow-sm">Mababanaba Waters</h1>
                    <p class="text-lg font-medium text-blue-100 max-w-sm z-10 leading-relaxed">Your trusted partner in pure, refreshing hydration delivered straight to your door.</p>
                </div>

                <!-- Form Side -->
                <div class="flex-1 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative">
                    <div class="text-center mb-8">
                        <div class="md:hidden w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 text-3xl shadow-inner pulse-soft">
                            <i class="fa-solid fa-droplet"></i>
                        </div>
                        <h2 class="text-2xl font-black text-slate-800 tracking-tight">Welcome Back</h2>
                        <p class="text-sm text-slate-500 mt-1">Sign in to Mababanaba Waters</p>
                    </div>
                    
                    <div class="flex bg-slate-100 p-1 rounded-xl mb-6">
                        <button id="tab-cust" onclick="UI.switchLoginTab('customer')" class="flex-1 py-2 text-sm font-bold rounded-lg bg-white shadow text-blue-600 transition">Customer</button>
                        <button id="tab-adm" onclick="UI.switchLoginTab('admin')" class="flex-1 py-2 text-sm font-bold rounded-lg text-slate-500 hover:text-slate-700 transition">Staff / Admin</button>
                    </div>

                    <form id="login-form" onsubmit="App.handleLogin(event)" class="space-y-4">
                        <input type="hidden" id="login-type" value="customer">
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-1" id="login-user-label">Mobile Number</label>
                            <input type="tel" id="login-user" required maxlength="11" oninput="if(document.getElementById('login-type').value === 'customer'){ this.value=this.value.replace(/[^0-9]/g,'').slice(0,11); }" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-slate-700 mb-1">Password</label>
                            <div class="relative">
                                <input type="password" id="login-pass" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition pr-12">
                                <button type="button" onclick="App.togglePassword('login-pass', 'login-pass-icon')" class="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-blue-500 transition"><i class="fa-solid fa-eye" id="login-pass-icon"></i></button>
                            </div>
                            <div class="text-right mt-2" id="forgot-pass-container">
                                <button type="button" id="forgot-btn" onclick="UI.navigate('forgot_password')" class="text-xs font-bold text-blue-600 hover:underline">Forgot Password?</button>
                            </div>
                        </div>
                        
                        <button type="submit" class="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-2 mt-4">
                            Sign In
                        </button>
                    </form>
                    
                    <div id="register-prompt" class="text-center mt-8 text-sm font-medium text-slate-600">
                        New customer? <button onclick="UI.navigate('register')" class="text-blue-600 font-bold hover:underline">Create an account</button>
                    </div>
                </div>
            </div>
        `);
    },

    switchLoginTab(type) {
        document.getElementById('login-type').value = type;
        const tabCust = document.getElementById('tab-cust');
        const tabAdm = document.getElementById('tab-adm');
        const label = document.getElementById('login-user-label');
        const regPrompt = document.getElementById('register-prompt');
        const forgotContainer = document.getElementById('forgot-pass-container');
        const inputUser = document.getElementById('login-user');

        if (type === 'customer') {
            tabCust.className = 'flex-1 py-2 text-sm font-bold rounded-lg bg-white shadow text-blue-600 transition';
            tabAdm.className = 'flex-1 py-2 text-sm font-bold rounded-lg text-slate-500 hover:text-slate-700 transition';
            label.innerText = 'Mobile Number';
            inputUser.type = 'tel';
            inputUser.placeholder = '09xxxxxxxxx';
            inputUser.maxLength = 11;
            inputUser.value = inputUser.value.replace(/[^0-9]/g, '').slice(0, 11);
            if (regPrompt) regPrompt.style.display = 'block';
            if (forgotContainer) forgotContainer.style.display = 'block';
        } else {
            tabAdm.className = 'flex-1 py-2 text-sm font-bold rounded-lg bg-white shadow text-blue-600 transition';
            tabCust.className = 'flex-1 py-2 text-sm font-bold rounded-lg text-slate-500 hover:text-slate-700 transition';
            label.innerText = 'Username';
            inputUser.type = 'text';
            inputUser.placeholder = 'Enter username';
            inputUser.removeAttribute('maxlength');
            if (regPrompt) regPrompt.style.display = 'none';
            if (forgotContainer) forgotContainer.style.display = 'none';
        }
    },

    renderRegister() {
        this.html(`
            <div class="max-w-md w-full mx-auto bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-black text-slate-800">Create Account</h2>
                    <p class="text-sm text-slate-500 mt-1">Join the Mababanaba Waters network</p>
                </div>
                <form onsubmit="App.handleRegister(event)" class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                        <input type="text" id="reg-name" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">Mobile Number (Active)</label>
                        <input type="tel" id="reg-phone" required placeholder="09xxxxxxxxx" maxlength="11" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,11)" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">Complete Address</label>
                        <textarea id="reg-address" required rows="2" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">Password</label>
                        <div class="relative">
                            <input type="password" id="reg-pass" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition pr-12">
                            <button type="button" onclick="App.togglePassword('reg-pass', 'reg-pass-icon')" class="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-blue-600 transition">
                                <i class="fa-solid fa-eye" id="reg-pass-icon"></i>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">Confirm Password</label>
                        <div class="relative">
                            <input type="password" id="reg-confirm" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition pr-12">
                            <button type="button" onclick="App.togglePassword('reg-confirm', 'reg-conf-icon')" class="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-blue-600 transition">
                                <i class="fa-solid fa-eye" id="reg-conf-icon"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label class="flex items-start gap-3 cursor-pointer group">
                            <div class="relative flex items-center justify-center mt-0.5">
                                <input type="checkbox" id="reg-consent" required class="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 checked:bg-blue-600 checked:border-blue-600 transition-colors cursor-pointer">
                                <i class="fa-solid fa-check absolute text-white text-xs opacity-0 peer-checked:opacity-100 pointer-events-none"></i>
                            </div>
                            <span class="text-xs text-slate-600 leading-relaxed flex-1">
                                <strong>Data Privacy Consent:</strong> By checking this box, I confirm that I have read and agree to the 
                                <button type="button" onclick="UI.showPrivacyPolicy()" class="text-blue-600 font-bold hover:underline">Data Privacy Policy</button> 
                                in compliance with RA 10173.
                            </span>
                        </label>
                    </div>

                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition active:scale-95 text-lg flex justify-center items-center mt-6">Register</button>
                </form>
                <div class="mt-6 text-center">
                    <button onclick="UI.goBack('login')" class="text-sm text-slate-500 font-bold hover:text-slate-800"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Login</button>
                </div>
            </div>
        `);
    },

    renderOTPVerify() {
        this.html(`
            <div class="max-w-md w-full mx-auto bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center">
                <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 text-3xl shadow-inner">
                    <i class="fa-solid fa-comment-sms"></i>
                </div>
                <h2 class="text-2xl font-black text-slate-800 mb-2">Verify Mobile Number</h2>
                <p class="text-sm text-slate-500 mb-6 leading-relaxed">We sent a 6-digit code to <strong>${State.tempContact || 'your number'}</strong>. Please enter it below.</p>
                
                <form onsubmit="App.handleOTPVerify(event)" class="space-y-6">
                    <div>
                        <label class="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Enter 6-Digit Code</label>
                        ${this.renderOtpBoxes('otp-code', 6)}
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition active:scale-95 text-lg flex justify-center items-center">Verify & Login</button>
                </form>
                <div class="mt-6 text-center">
                    <button onclick="UI.goBack('login')" class="text-sm text-slate-500 font-bold hover:text-slate-800"><i class="fa-solid fa-arrow-left mr-1"></i> Back to Login</button>
                </div>
            </div>
        `);
        setTimeout(() => {
            const first = document.querySelector('[data-otp-group="otp-code"] .otp-digit');
            if (first) first.focus();
        }, 100);
    },

    renderForgotPassword() {
        this.html(`
            <div class="max-w-md w-full mx-auto bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                <button onclick="UI.goBack('login')" class="text-sm font-bold text-slate-500 hover:text-slate-800 mb-6 flex items-center transition"><i class="fa-solid fa-arrow-left mr-2"></i> Back</button>
                <h2 class="text-2xl font-black text-slate-800 mb-2">Reset Password</h2>
                <p class="text-sm text-slate-500 mb-6">Enter your registered mobile number. We will send you an OTP to reset your password.</p>
                
                <form onsubmit="App.handleForgotPasswordRequest(event)" class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">Mobile Number</label>
                        <input type="tel" id="reset-phone" required maxlength="11" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,11)" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition active:scale-95 text-lg flex justify-center items-center">Send OTP</button>
                </form>
            </div>
        `);
    },

    renderResetPassword() {
        this.html(`
            <div class="max-w-md w-full mx-auto bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center">
                <div class="text-left mb-4">
                    <button onclick="UI.goBack('login')" class="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center transition"><i class="fa-solid fa-arrow-left mr-2"></i> Back</button>
                </div>
                <h2 class="text-2xl font-black text-slate-800 mb-2">Create New Password</h2>
                <p class="text-sm text-slate-500 mb-6 leading-relaxed">Enter the 6-digit code sent to <strong>${State.tempContact || 'your number'}</strong> and your new password.</p>
                
                <form onsubmit="App.handlePasswordResetSubmit(event)" class="space-y-4 text-left">
                    <div>
                        <label class="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1 text-center">6-Digit OTP Code</label>
                        ${this.renderOtpBoxes('reset-code', 6)}
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-1">New Password</label>
                        <div class="relative">
                            <input type="password" id="reset-pass" required minlength="6" placeholder="At least 6 characters" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition pr-12">
                            <button type="button" onclick="App.togglePassword('reset-pass', 'reset-pass-icon')" class="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-blue-600 transition">
                                <i class="fa-solid fa-eye" id="reset-pass-icon"></i>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition active:scale-95 text-lg flex justify-center items-center mt-2">Update Password</button>
                </form>
            </div>
        `);
        setTimeout(() => {
            const first = document.querySelector('[data-otp-group="reset-code"] .otp-digit');
            if (first) first.focus();
        }, 100);
    },

    _customerDashboardSkeleton() {
        return `
            <div class="max-w-3xl mx-auto w-full">
                <div class="skeleton h-36 w-full rounded-3xl mb-6 sm:mb-8"></div>
                <div class="flex justify-between items-end mb-4">
                    <div class="skeleton h-7 w-44 rounded-lg"></div>
                    <div class="skeleton h-4 w-24 rounded-md"></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                    <div class="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-4 sm:p-5 flex items-center gap-3.5">
                        <div class="skeleton w-12 h-12 sm:w-13 sm:h-13 rounded-2xl shrink-0"></div>
                        <div class="flex-1">
                            <div class="skeleton h-5 w-32 mb-2 rounded-md"></div>
                            <div class="skeleton h-3 w-40 mb-3 rounded-md"></div>
                            <div class="skeleton h-3 w-28 rounded-md"></div>
                        </div>
                    </div>
                    <div class="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-4 sm:p-5 flex items-center gap-3.5">
                        <div class="skeleton w-12 h-12 sm:w-13 sm:h-13 rounded-2xl shrink-0"></div>
                        <div class="flex-1">
                            <div class="skeleton h-5 w-32 mb-2 rounded-md"></div>
                            <div class="skeleton h-3 w-40 mb-3 rounded-md"></div>
                            <div class="skeleton h-3 w-28 rounded-md"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    _renderCustomerDashboardView(stations, orders) {
        let pts = 0;
        let lifetimePts = 0;
        (stations || []).forEach(s => {
            pts += parseInt(s.user_points || 0);
            lifetimePts += parseInt(s.user_lifetime_points || s.user_points || 0);
        });
        const rank = App.getLoyaltyRank(lifetimePts || pts);

        orders = orders || [];
        const orderGroups = [];
        const groupedMap = new Map();
        orders.forEach(o => {
            const key = `${o.station_id}_${o.station_order_number || o.order_id}`;
            if (!groupedMap.has(key)) {
                const group = {
                    key,
                    station_id: o.station_id,
                    station_name: o.station_name,
                    order_date: o.order_date,
                    order_status: o.order_status,
                    payment_method: o.payment_method,
                    delivery_address: o.delivery_address,
                    total_price: 0,
                    items: []
                };
                groupedMap.set(key, group);
                orderGroups.push(group);
            }
            const g = groupedMap.get(key);
            g.total_price += parseFloat(o.total_price || 0);
            g.items.push(o);
        });

        let smartHubHtml = '';
        const validRecentGroups = orderGroups.filter(g => g.order_status !== 'Cancelled');
        
        if (validRecentGroups.length > 0) {
            const lastOrder = validRecentGroups[0] || null;
            if (lastOrder) State.lastOrderGroup = lastOrder;
            const itemsSummary = lastOrder ? lastOrder.items.map(i => `${i.quantity}x ${escapeHtml(i.product_name)}`).join(', ') : '';

            smartHubHtml = `
                <div class="bg-gradient-to-r from-blue-50/90 via-white to-blue-50/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-blue-200 shadow-md mb-6 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                            <i class="fa-solid fa-clock-rotate-left"></i>
                        </div>
                        <div class="min-w-0">
                            <h4 class="text-sm font-black text-slate-800 leading-tight">Order Again</h4>
                            <div class="text-[11px] font-medium text-blue-600/80 truncate mt-0.5">${itemsSummary} • ₱${parseFloat(lastOrder.total_price).toFixed(2)}</div>
                        </div>
                    </div>
                    <button onclick="App.repeatLastOrder()" class="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black px-3.5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer">
                        <i class="fa-solid fa-repeat"></i> Reorder
                    </button>
                </div>
            `;
        }

        let pushBannerHtml = '';
        if ('Notification' in window && Notification.permission === 'default') {
            pushBannerHtml = `
                <div id="push-permission-banner" class="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl sm:rounded-3xl p-4 mb-6 flex items-center justify-between gap-3 shadow-md border border-white/10">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-base shrink-0">
                            <i class="fa-solid fa-bell animate-pulse"></i>
                        </div>
                        <div class="min-w-0">
                            <h4 class="text-xs font-black leading-tight text-white">Enable Lock-Screen Notifications</h4>
                            <p class="text-[11px] text-slate-300 truncate">Get instant delivery alerts even when the app is closed</p>
                        </div>
                    </div>
                    <button onclick="App.subscribeToPush(true).then(ok => { if(ok) document.getElementById('push-permission-banner')?.remove(); })" class="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black px-3.5 py-2 rounded-xl transition shadow-md whitespace-nowrap shrink-0 cursor-pointer">
                        Enable
                    </button>
                </div>
            `;
        }

        let html = `
            <div onclick="UI.navigate('customer_loyalty')" class="bg-gradient-to-r ${rank.color} rounded-3xl p-5 sm:p-6 text-white shadow-md mb-6 sm:mb-8 relative overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all group">
                <div class="relative z-10">
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <span class="font-bold text-white/90 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <i class="fa-solid fa-crown text-amber-300"></i> My Loyalty Points
                        </span>
                        <span class="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm border border-white/20">
                            <i class="fa-solid ${rank.icon}"></i> ${rank.name}
                        </span>
                    </div>
                    <div class="text-3xl sm:text-4xl font-black flex items-baseline gap-2 mb-3">
                        ${pts || 0} <span class="text-sm sm:text-base font-medium opacity-80">pts</span>
                    </div>
                    <div class="pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs text-white/90 font-medium">
                        <span class="flex items-center gap-1.5">
                            <i class="fa-solid fa-circle-info text-amber-300 text-xs"></i>
                            <span>Earn 2 pts/jug (10 pts = 1 Free Refill)</span>
                        </span>
                        <span class="font-bold underline decoration-white/50 flex items-center gap-1 self-end sm:self-auto group-hover:translate-x-1 transition-transform">
                            View Progress & Ranks <i class="fa-solid fa-chevron-right text-[10px]"></i>
                        </span>
                    </div>
                </div>
                <i class="fa-solid fa-gift absolute -right-4 -bottom-4 text-8xl text-white opacity-10 group-hover:scale-110 transition-transform"></i>
            </div>

            ${pushBannerHtml}
            ${smartHubHtml}
            
            <div class="flex justify-between items-end mb-4">
                <h2 class="text-xl font-black text-slate-800">Available Stations</h2>
                <button onclick="UI.navigate('customer_orders')" class="text-sm font-bold text-blue-600 hover:underline relative">
                    My Orders <i class="fa-solid fa-arrow-right"></i>
                    <span id="dashboard-orders-badge" class="hidden absolute -top-1 -right-2 flex h-3 w-3">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                    </span>
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        `;

        if (!stations || stations.length === 0) {
            html += this.emptyState('fa-store-slash', 'No Stations Active', 'There are no water stations currently available in your area.');
        } else {
            stations.forEach(s => {
                const isClosed = s.status !== 'Active';
                const stRank = App.getLoyaltyRank(s.user_lifetime_points || s.user_points || 0);
                let ratingHtml = `<span class="text-slate-400 text-xs font-medium">No ratings</span>`;
                if(s.avg_rating > 0) {
                    ratingHtml = `<span class="flex items-center gap-1"><span class="text-yellow-400 text-xs"><i class="fa-solid fa-star"></i></span> <span class="font-bold text-slate-700 text-xs">${parseFloat(s.avg_rating).toFixed(1)}</span></span>`;
                }

                html += `
                    <div onclick="${isClosed ? '' : `App.selectStation(${s.station_id})`}" class="bg-white rounded-2xl sm:rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 ${isClosed ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98] active:bg-blue-50/40 active:border-blue-300'} transition-all relative overflow-hidden">
                        <div class="w-12 h-12 sm:w-13 sm:h-13 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-xl sm:text-2xl shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                            <i class="fa-solid fa-store"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-2 mb-1">
                                <h4 class="font-black text-slate-800 text-base leading-tight truncate group-hover:text-blue-600 transition-colors">${escapeHtml(s.station_name)}</h4>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${stRank.badgeBg}">
                                    <i class="fa-solid ${stRank.icon} mr-1"></i>${stRank.name}
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 truncate mb-2.5 flex items-center gap-1">
                                <i class="fa-solid fa-location-dot text-slate-400 text-[10px] shrink-0"></i>
                                <span class="truncate">${escapeHtml(s.address)}</span>
                            </p>
                            <div class="flex items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100">
                                <div class="flex items-center gap-2 text-xs text-slate-600 min-w-0">
                                    ${ratingHtml}
                                    <span class="text-slate-300">•</span>
                                    <span class="text-slate-500 font-medium truncate flex items-center gap-1">
                                        <i class="fa-regular fa-clock text-blue-500 text-[11px] shrink-0"></i>
                                        <span class="whitespace-nowrap">${App.formatTime(s.opening_time)} - ${App.formatTime(s.closing_time)}</span>
                                    </span>
                                </div>
                                <span class="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg shrink-0">${s.user_points || 0} pts</span>
                            </div>
                        </div>
                        <div class="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0">
                            <i class="fa-solid fa-chevron-right text-xs sm:text-sm"></i>
                        </div>
                    </div>
                `;
            });
        }

        html += `</div>`;
        this.html(html);

        if (orders && orders.length > 0) {
            const active = orders.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled');
            const badge = document.getElementById('dashboard-orders-badge');
            if (badge) {
                if (active.length > 0) badge.classList.remove('hidden');
                else badge.classList.add('hidden');
            }
        }
    },

    async renderCustomerDashboard() {
        if (!State.stations || State.stations.length === 0) {
            const cachedStations = localStorage.getItem('cache_get_stations');
            if (cachedStations) {
                try {
                    const parsed = JSON.parse(cachedStations);
                    State.stations = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }
        if (!State.myOrders) {
            const cachedOrders = localStorage.getItem('cache_get_customer_orders');
            if (cachedOrders) {
                try {
                    const parsed = JSON.parse(cachedOrders);
                    State.myOrders = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }

        const hasStations = State.stations && State.stations.length > 0;
        
        if (hasStations) {
            this._renderCustomerDashboardView(State.stations, State.myOrders || []);
        } else {
            this.html(this._customerDashboardSkeleton());
        }

        try {
            const stationsPromise = API.request('get_stations');
            const ordersPromise = (!State.myOrders || State.myOrders.length === 0) 
                ? API.request('get_customer_orders', 'GET', null, true).catch(() => []) 
                : Promise.resolve(State.myOrders);

            const [newStations, orders] = await Promise.all([stationsPromise, ordersPromise]);
            if (orders) State.myOrders = orders;

            const oldHash = State.lastDataHash;
            const newHash = JSON.stringify((newStations || []).map(s => s.station_id + s.user_points + s.is_manually_closed));

            State.stations = newStations;
            State.lastDataHash = newHash;

            if (this._currentView === 'customer_dashboard') {
                if (!hasStations || oldHash !== newHash) {
                    this._renderCustomerDashboardView(newStations, State.myOrders || []);
                } else if (State.myOrders) {
                    const active = State.myOrders.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled');
                    const badge = document.getElementById('dashboard-orders-badge');
                    if (badge) {
                        if (active.length > 0) badge.classList.remove('hidden');
                        else badge.classList.add('hidden');
                    }
                }
            }

            this.prefetch('customer_orders', 'get_customer_orders').then(prefetchedOrders => {
                if (prefetchedOrders && this._currentView === 'customer_dashboard') {
                    State.myOrders = prefetchedOrders;
                    const active = prefetchedOrders.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled');
                    const badge = document.getElementById('dashboard-orders-badge');
                    if (badge) {
                        if (active.length > 0) badge.classList.remove('hidden');
                        else badge.classList.add('hidden');
                    }
                }
            });

            if (State.pollingInterval) clearInterval(State.pollingInterval);
            State.pollingInterval = setInterval(async () => {
                try {
                    const polledStations = await API.request('get_stations', 'GET', null, true);
                    const polledHash = JSON.stringify((polledStations || []).map(s => s.station_id + s.user_points + s.is_manually_closed));
                    if (polledHash !== State.lastDataHash) {
                        State.stations = polledStations;
                        State.lastDataHash = polledHash;
                        if (UI._currentView === 'customer_dashboard') {
                            UI._renderCustomerDashboardView(polledStations, State.myOrders || []);
                        }
                    }
                } catch(e) {}
            }, 25000);

        } catch (e) {
            console.error(e);
            if (!hasStations && this._currentView === 'customer_dashboard') {
                this.html('<div class="max-w-3xl mx-auto w-full p-6">' + this.emptyState('fa-triangle-exclamation', 'Network Error', 'Failed to load dashboard. Please check your connection and try again.') + '</div>');
            }
        }
    },

    async renderCustomerLoyalty() {
        if (!State.stations || State.stations.length === 0) {
            const cachedStations = localStorage.getItem('cache_get_stations');
            if (cachedStations) {
                try {
                    const parsed = JSON.parse(cachedStations);
                    State.stations = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }
        if (!State.stations || State.stations.length === 0) {
            this.html(`
                <div class="max-w-3xl mx-auto w-full space-y-6">
                    <div class="skeleton h-4 w-28 mb-4"></div>
                    <div class="skeleton h-44 w-full rounded-3xl mb-6"></div>
                    <div class="skeleton h-24 w-full rounded-3xl mb-6"></div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                        <div class="skeleton h-28 w-full rounded-2xl"></div>
                        <div class="skeleton h-28 w-full rounded-2xl"></div>
                        <div class="skeleton h-28 w-full rounded-2xl"></div>
                    </div>
                    <div class="space-y-3">
                        <div class="skeleton h-20 w-full rounded-2xl"></div>
                        <div class="skeleton h-20 w-full rounded-2xl"></div>
                        <div class="skeleton h-20 w-full rounded-2xl"></div>
                    </div>
                </div>
            `);
            try {
                State.stations = await API.request('get_stations');
            } catch(e) {}
        }
        const stations = State.stations || [];
        const curStationId = State.selectedLoyaltyStation || State.selectedStation || (stations[0]?.station_id);
        const curStation = stations.find(s => s.station_id == curStationId) || stations[0] || {};
        
        const pts = parseInt(curStation.user_points || 0);
        const lifetimePts = parseInt(curStation.user_lifetime_points || curStation.user_points || 0);
        const rank = App.getLoyaltyRank(lifetimePts || pts);

        let progressPct = 100;
        let progressText = 'Highest Rank Tier Reached at this station! <i class="fa-solid fa-trophy text-yellow-500 ml-1"></i>';
        if (rank.nextMin) {
            const totalGap = rank.nextMin - rank.min;
            const currentProgress = (lifetimePts || pts) - rank.min;
            progressPct = Math.min(100, Math.max(5, Math.round((currentProgress / totalGap) * 100)));
            const ptsNeeded = Math.max(0, rank.nextMin - (lifetimePts || pts));
            progressText = `<strong>${ptsNeeded} pts</strong> needed to reach <span class="font-bold uppercase">${rank.nextRank}</span> at ${escapeHtml(curStation.station_name || 'this station')}`;
        }

        const tiers = [
            { name: 'Diamond', min: 600, max: '∞', icon: 'fa-gem', color: 'from-cyan-500 to-blue-600', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300', perk: 'Top Priority Dispatch: First in line for order preparation & delivery' },
            { name: 'Platinum', min: 300, max: '599', icon: 'fa-crown', color: 'from-slate-700 to-slate-900', badge: 'bg-slate-100 text-slate-800 border-slate-400', perk: 'High Priority Dispatch: Dispatched ahead of Gold, Silver, Bronze & Normal' },
            { name: 'Gold', min: 150, max: '299', icon: 'fa-medal', color: 'from-amber-400 to-yellow-600', badge: 'bg-amber-100 text-amber-900 border-amber-300', perk: 'Priority Queueing: Fast-tracked ahead of Silver, Bronze & Normal orders' },
            { name: 'Silver', min: 75, max: '149', icon: 'fa-award', color: 'from-slate-400 to-slate-600', badge: 'bg-slate-100 text-slate-700 border-slate-300', perk: 'Faster Fulfillment: Dispatched ahead of Bronze and Normal orders' },
            { name: 'Bronze', min: 30, max: '74', icon: 'fa-shield-halved', color: 'from-amber-600 to-amber-800', badge: 'bg-amber-50 text-amber-900 border-amber-200', perk: 'Early Queue Priority: Preferred dispatch over new & Normal orders' },
            { name: 'Normal', min: 0, max: '29', icon: 'fa-droplet', color: 'from-blue-500 to-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200', perk: 'Standard Queue: Earn points on refills to unlock faster dispatch' }
        ];

        let html = `
            <button onclick="UI.goBack('customer_dashboard')" class="text-sm font-bold text-slate-500 hover:text-slate-800 mb-4 flex items-center transition"><i class="fa-solid fa-arrow-left mr-2"></i> Back to Dashboard</button>
            
            ${stations.length > 1 ? `
                <!-- Minimalist Station Dropdown -->
                <div class="mb-4">
                    <div class="relative">
                        <select onchange="State.selectedLoyaltyStation=this.value; UI.renderCustomerLoyalty();" class="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl px-4 py-2.5 pr-10 outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer shadow-sm">
                            ${stations.map(st => `
                                <option value="${st.station_id}" ${st.station_id == curStationId ? 'selected' : ''}>
                                    ${escapeHtml(st.station_name)}
                                </option>
                            `).join('')}
                        </select>
                        <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                    </div>
                </div>
            ` : ''}

            <div class="space-y-6">
                <!-- Header Banner Card -->
                <div class="bg-gradient-to-r ${rank.color} rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
                    <div class="relative z-10">
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/20 shadow-sm">
                                <i class="fa-solid ${rank.icon}"></i> ${rank.name} Member
                            </span>
                        </div>
                        <h2 class="text-2xl sm:text-3xl font-black mt-2">${curStation.station_name ? `${escapeHtml(curStation.station_name)}` : 'Loyalty & Rewards'}</h2>
                        <div class="mt-4 flex items-baseline gap-2">
                            <span class="text-4xl sm:text-5xl font-black">${pts}</span>
                            <span class="text-base font-bold opacity-80">Reward Points</span>
                        </div>
                    </div>
                    <i class="fa-solid fa-gift absolute -right-6 -bottom-8 text-9xl text-white opacity-10"></i>
                </div>

                <!-- Progress to Next Tier -->
                <div class="bg-white rounded-3xl p-6 shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5">
                    <div class="flex justify-between items-center text-xs font-bold mb-2 text-slate-700">
                        <span class="flex items-center gap-1.5"><i class="fa-solid fa-route text-blue-600"></i> Next Rank Progress at ${escapeHtml(curStation.station_name || 'Station')}</span>
                        <span class="text-blue-600 font-black">${progressPct}%</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
                        <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 shadow-sm" style="width: ${progressPct}%"></div>
                    </div>
                    <p class="text-xs text-slate-500 mt-3">${progressText}</p>
                </div>

                <!-- How it works guide -->
                <div class="bg-white rounded-3xl p-6 shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5">
                    <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">How Loyalty Works</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div class="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-center flex flex-col items-center">
                            <div class="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center text-base mb-2 shadow-sm"><i class="fa-solid fa-crown"></i></div>
                            <span class="text-sm font-black text-slate-800">Rank Points</span>
                            <span class="text-xs text-slate-500 mt-1">3 Rank Points per jug ordered</span>
                        </div>
                        <div class="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 text-center flex flex-col items-center">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-base mb-2 shadow-sm"><i class="fa-solid fa-gift"></i></div>
                            <span class="text-sm font-black text-slate-800">Free Refills</span>
                            <span class="text-xs text-slate-500 mt-1">2 Points per jug (10 pts = 1 Free Refill)</span>
                        </div>
                        <div class="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 text-center flex flex-col items-center">
                            <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-base mb-2 shadow-sm"><i class="fa-solid fa-bolt"></i></div>
                            <span class="text-sm font-black text-slate-800">VIP Priority</span>
                            <span class="text-xs text-slate-500 mt-1">Higher ranks pushed above in dispatch</span>
                        </div>
                    </div>
                </div>

                <!-- All 6 Ranks RoadMap -->
                <div class="bg-white rounded-3xl p-6 shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5">
                    <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Loyalty Rank Tiers at ${escapeHtml(curStation.station_name || 'Station')}</h3>
                    <div class="space-y-3">
                        ${tiers.map(t => {
                            const isCurrent = rank.name === t.name;
                            const isUnlocked = (lifetimePts || pts) >= t.min;
                            return `
                                <div class="p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${isCurrent ? 'bg-blue-50/70 border-blue-400 shadow-sm ring-2 ring-blue-500/20' : (isUnlocked ? 'bg-white border-slate-200' : 'bg-slate-50/70 border-slate-200/60 opacity-60')}">
                                    <div class="flex items-center gap-3 min-w-0 flex-1">
                                        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br ${t.color} text-white flex items-center justify-center text-lg shadow-sm shrink-0">
                                            <i class="fa-solid ${t.icon}"></i>
                                        </div>
                                        <div class="min-w-0 flex-1 pr-1">
                                            <div class="flex items-center gap-2">
                                                <h4 class="font-black text-slate-800 text-sm sm:text-base leading-tight">${t.name}</h4>
                                                ${isCurrent ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs whitespace-nowrap">Your Rank</span>` : ''}
                                            </div>
                                            <p class="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">${t.perk}</p>
                                        </div>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <span class="block text-xs sm:text-sm font-black text-slate-700 whitespace-nowrap">${t.min}${t.max === '∞' ? '+' : `-${t.max}`} pts</span>
                                        <span class="text-[10px] font-bold ${isCurrent ? 'text-blue-600 font-black' : (isUnlocked ? 'text-emerald-600' : 'text-slate-400')} whitespace-nowrap">
                                            ${isCurrent ? 'Active <i class="fa-solid fa-check ml-1"></i>' : (isUnlocked ? 'Unlocked <i class="fa-solid fa-check ml-1"></i>' : 'Locked')}
                                        </span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        this.html('<div class="max-w-3xl mx-auto w-full">' + html + '</div>');
    },

    async renderCustomerStation() {
        if (!State.selectedStation) {
            try { State.selectedStation = sessionStorage.getItem('selectedStation'); } catch(e) {}
        }
        if (!State.stations || State.stations.length === 0) {
            const cachedStations = localStorage.getItem('cache_get_stations');
            if (cachedStations) {
                try {
                    const parsed = JSON.parse(cachedStations);
                    State.stations = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }
        if (!State.stations || State.stations.length === 0) {
            this.html(`
                <div class="max-w-3xl mx-auto w-full">
                    <div class="skeleton h-4 w-28 mb-6"></div>
                    <div class="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                        <div class="skeleton w-16 h-16 rounded-2xl shrink-0"></div>
                        <div class="flex-1">
                            <div class="skeleton h-7 w-48 mb-2"></div>
                            <div class="skeleton h-4 w-32"></div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mb-6">
                        <div class="skeleton h-16 w-full rounded-2xl"></div>
                        <div class="skeleton h-16 w-full rounded-2xl"></div>
                    </div>
                    <div class="skeleton h-6 w-36 mb-4"></div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="skeleton h-48 w-full rounded-3xl"></div>
                        <div class="skeleton h-48 w-full rounded-3xl"></div>
                    </div>
                </div>
            `);
            try {
                State.stations = await API.request('get_stations');
            } catch(e) {}
        }
        const station = (State.stations || []).find(s => s.station_id == State.selectedStation);
        if(!station) return this.navigate('customer_dashboard');

        const stRank = App.getLoyaltyRank(station.user_lifetime_points || station.user_points || 0);

        let html = `
            <button onclick="UI.goBack('customer_dashboard')" class="text-sm font-bold text-slate-500 hover:text-slate-800 mb-6 flex items-center transition"><i class="fa-solid fa-arrow-left mr-2"></i> Back to Stations</button>
            <div class="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0"><i class="fa-solid fa-store"></i></div>
                <div class="min-w-0 flex-1">
                    <h2 class="text-2xl font-black text-slate-800 truncate">${escapeHtml(station.station_name)}</h2>
                    <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${stRank.badgeBg}">
                            <i class="fa-solid ${stRank.icon} mr-1"></i>${stRank.name} Member
                        </span>
                        <span class="text-xs text-slate-500 font-medium">• <strong>${station.user_points || 0}</strong> pts available</span>
                        <button onclick="State.selectedLoyaltyStation=${station.station_id}; UI.navigate('customer_loyalty')" class="text-xs font-bold text-blue-600 hover:underline ml-1 flex items-center gap-1">
                            View Progress <i class="fa-solid fa-chevron-right text-[9px]"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 bg-white shadow-md p-4 rounded-2xl mb-6 border border-blue-200/80 ring-2 ring-blue-500/30">
                <div class="flex flex-col bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/60">
                    <span class="flex items-center text-[10px] uppercase text-blue-600 font-bold mb-0.5"><i class="fa-solid fa-broom mr-1.5"></i> System Cleaned</span> 
                    <span class="text-slate-800 font-bold truncate">${App.formatDate(station.last_cleaned_date)}</span>
                </div>
                <div class="flex flex-col bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/60">
                    <span class="flex items-center text-[10px] uppercase text-emerald-600 font-bold mb-0.5"><i class="fa-solid fa-filter mr-1.5"></i> Filter Changed</span> 
                    <span class="text-slate-800 font-bold truncate">${App.formatDate(station.last_filter_changed_date)}</span>
                </div>
            </div>
            
            ${station.is_manually_closed == 1 ? `
            <div class="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <i class="fa-solid fa-circle-exclamation text-red-500 mt-1"></i>
                <div>
                    <h4 class="font-black text-red-800">Station Currently Closed</h4>
                    <p class="text-xs text-red-600 font-medium mt-1">${escapeHtml(station.closure_message || 'This station is temporarily not accepting orders.')}</p>
                </div>
            </div>
            ` : ''}
            
            <div class="flex items-center gap-2 mb-4">
                <span class="w-1.5 h-5 bg-blue-600 rounded-full inline-block"></span>
                <h3 class="text-lg font-black text-slate-800">Available Products</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        `;

        if (!station.products || station.products.length === 0) {
            html += this.emptyState('fa-box-open', 'No Products Available', 'This station hasn\'t added any products to their catalog yet. Please check back later!');
        } else {
            station.products.forEach(p => {
                const roundOutOfStock = (station.round_jugs !== undefined ? station.round_jugs : 0) <= 0;
                const slimOutOfStock = (station.slim_jugs !== undefined ? station.slim_jugs : 0) <= 0;
                const outOfStock = roundOutOfStock && slimOutOfStock;
                const isDisabledRound = roundOutOfStock || station.is_manually_closed == 1;
                const isDisabledSlim = slimOutOfStock || station.is_manually_closed == 1;
                
                const inCartRound = State.cart.find(i => i.product_id == p.product_id && i.jug_type === 'Round');
                const qtyRound = inCartRound ? inCartRound.quantity : 0;
                
                const inCartSlim = State.cart.find(i => i.product_id == p.product_id && i.jug_type === 'Slim');
                const qtySlim = inCartSlim ? inCartSlim.quantity : 0;

                const capGal = parseFloat(p.capacity_gallons || 5.0);
                const capLit = parseFloat(p.capacity_liters || (capGal === 5.0 ? 20.0 : Math.round(capGal * 3.785)));
                const capLabel = `${capGal} Gallons / ${capLit}L`;
                
                html += `
                    <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-5 relative overflow-hidden group flex flex-col">
                        ${outOfStock && station.is_manually_closed != 1 ? '<div class="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center z-10"><span class="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-md">OUT OF STOCK</span></div>' : ''}
                        
                        <div class="flex justify-between items-baseline mb-4 pb-3 border-b border-slate-100/80">
                            <h4 class="font-black text-slate-800 text-xl leading-tight truncate">${p.name}</h4>
                            <span class="font-black text-blue-600 text-xl shrink-0 ml-2">₱${parseFloat(p.price).toFixed(2)}</span>
                        </div>
                        
                        <div class="space-y-3 mt-auto">
                            <!-- Round Jug -->
                            <div class="flex justify-between items-center bg-blue-50/50 p-2.5 pl-3.5 rounded-2xl border border-blue-100 relative ${isDisabledRound ? 'opacity-50' : ''}">
                                ${roundOutOfStock && station.is_manually_closed != 1 && !outOfStock ? '<div class="absolute right-0 -top-3"><span class="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm">No Stock</span></div>' : ''}
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <i class="fa-solid fa-bottle-water text-blue-500 text-lg shrink-0"></i>
                                    <div class="truncate">
                                        <div class="text-sm font-bold text-slate-800 leading-tight">Round Jug</div>
                                        <div class="text-[10px] font-semibold text-slate-400">${capLabel}</div>
                                    </div>
                                </div>
                                <div class="flex items-center bg-white p-1 rounded-xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 shrink-0">
                                    <button onclick="App.updateCart(${p.product_id}, -1, 'Round')" class="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-500 font-black flex items-center justify-center transition active:scale-95 text-lg">-</button>
                                    <span id="qty-${p.product_id}-Round" class="w-8 text-center font-black text-slate-800 text-base">${qtyRound}</span>
                                    <button onclick="App.updateCart(${p.product_id}, 1, 'Round')" class="w-8 h-8 rounded-lg ${isDisabledRound ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'} text-white font-black flex items-center justify-center transition active:scale-95 text-lg" ${isDisabledRound ? 'disabled' : ''}>+</button>
                                </div>
                            </div>

                            <!-- Slim Jug -->
                            <div class="flex justify-between items-center bg-blue-50/50 p-2.5 pl-3.5 rounded-2xl border border-blue-100 relative ${isDisabledSlim ? 'opacity-50' : ''}">
                                ${slimOutOfStock && station.is_manually_closed != 1 && !outOfStock ? '<div class="absolute right-0 -top-3"><span class="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm">No Stock</span></div>' : ''}
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <i class="fa-solid fa-bottle-water text-emerald-500 text-lg shrink-0"></i>
                                    <div class="truncate">
                                        <div class="text-sm font-bold text-slate-800 leading-tight">Slim Jug</div>
                                        <div class="text-[10px] font-semibold text-slate-400">${capLabel}</div>
                                    </div>
                                </div>
                                <div class="flex items-center bg-white p-1 rounded-xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 shrink-0">
                                    <button onclick="App.updateCart(${p.product_id}, -1, 'Slim')" class="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-500 font-black flex items-center justify-center transition active:scale-95 text-lg">-</button>
                                    <span id="qty-${p.product_id}-Slim" class="w-8 text-center font-black text-slate-800 text-base">${qtySlim}</span>
                                    <button onclick="App.updateCart(${p.product_id}, 1, 'Slim')" class="w-8 h-8 rounded-lg ${isDisabledSlim ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'} text-white font-black flex items-center justify-center transition active:scale-95 text-lg" ${isDisabledSlim ? 'disabled' : ''}>+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        html += `</div>`;
        
        html += `
            <div id="floating-cart" class="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40 transform transition-transform duration-300 ${State.cart.length > 0 && station.is_manually_closed != 1 ? 'translate-y-0' : 'translate-y-full hidden'}">
                <div class="max-w-4xl mx-auto flex justify-between items-center px-2">
                    <div>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Amount</p>
                        <p class="text-2xl font-black text-slate-900" id="cart-total">₱0.00</p>
                    </div>
                    <button onclick="UI.navigate('customer_checkout')" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2">
                        Checkout <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;

        this.html(html);
        App.updateCartUI();

        if(State.pollingInterval) clearInterval(State.pollingInterval);
        State.lastDataHash = JSON.stringify(station.is_manually_closed + '_' + station.stock_level);
        
        State.pollingInterval = setInterval(async () => {
            if(true) {
                try {
                    const newStations = await API.request('get_stations', 'GET', null, true);
                    State.stations = newStations;
                    const newStation = newStations.find(s => s.station_id == State.selectedStation);
                    if (newStation) {
                        const newHash = JSON.stringify(newStation.is_manually_closed + '_' + newStation.stock_level);
                        if(newHash !== State.lastDataHash) {
                            UI.renderCustomerStation();
                        }
                    }
                } catch(e){}
            }
        }, 25000);
    },

    async renderCustomerCheckout() {
        if(State.cart.length === 0) return this.navigate('customer_station');

        if (!State.stations || State.stations.length === 0) {
            const cachedStations = localStorage.getItem('cache_get_stations');
            if (cachedStations) {
                try {
                    const parsed = JSON.parse(cachedStations);
                    State.stations = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }
        if (!State.stations || State.stations.length === 0) {
            this.html(`
                <div class="max-w-3xl mx-auto w-full space-y-6">
                    <div class="skeleton h-4 w-28 mb-6"></div>
                    <div class="skeleton h-8 w-48 mb-6"></div>
                    <div class="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
                        <div class="skeleton h-5 w-32 mb-4"></div>
                        <div class="skeleton h-12 w-full rounded-2xl"></div>
                        <div class="skeleton h-12 w-full rounded-2xl"></div>
                        <div class="skeleton h-10 w-full rounded-xl"></div>
                    </div>
                    <div class="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
                        <div class="skeleton h-5 w-40 mb-4"></div>
                        <div class="skeleton h-14 w-full rounded-2xl"></div>
                    </div>
                    <div class="skeleton h-14 w-full rounded-2xl"></div>
                </div>
            `);
            try {
                State.stations = await API.request('get_stations');
            } catch(e) {}
        }

        const stations = State.stations || [];
        const station = stations.find(s => s.station_id == State.selectedStation) || stations[0];
        if (!station) return this.navigate('customer_dashboard');

        const subtotal = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingFee = parseFloat(station.shipping_fee || 0);
        const total = subtotal + shippingFee;
        
        const canUsePoints = (station.user_points || 0) >= 10;
        
        const now = new Date();
        const currentString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const isClosedNow = currentString < station.opening_time || currentString > station.closing_time;
        
        const minScheduleLimit = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        const maxScheduleLimit = new Date(new Date().getTime() + (7 * 24 * 60 * 60 * 1000) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        
        let scheduleWarning = '';
        if (isClosedNow) {
            scheduleWarning = `<div class="bg-red-50 text-red-600 p-3 rounded-xl mb-3 text-xs font-bold flex items-start gap-2 border border-red-100"><i class="fa-solid fa-circle-exclamation mt-0.5"></i> <p>Station is currently closed. Advance scheduling is required for tomorrow.</p></div>`;
        }

        let html = `
            <button onclick="UI.goBack('customer_station')" class="text-sm font-bold text-slate-500 hover:text-slate-800 mb-6 flex items-center transition"><i class="fa-solid fa-arrow-left mr-2"></i> Back to Menu</button>
            <h2 class="text-2xl font-black text-slate-800 mb-6">Complete Order</h2>
            
            <form onsubmit="App.processCheckout(event)" novalidate class="space-y-6">
                <!-- Order Summary -->
                <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6">
                    <h3 class="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex justify-between">Order Summary <button type="button" onclick="State.cart=[]; UI.navigate('customer_station')" class="text-red-500 text-sm hover:underline">Clear</button></h3>
                    <div class="space-y-3 mb-4">
        `;
        
        let totalItems = 0;
        State.cart.forEach((item, index) => {
            totalItems += item.quantity;
            if (!item.container_option) item.container_option = 'owned';
            if (station.pending_borrowed > 0 && item.container_option === 'borrow') item.container_option = 'owned';
            
            html += `
                <div class="flex flex-col gap-2 py-3 border-b border-slate-50 last:border-0">
                    <div class="flex justify-between items-center text-sm">
                        <span class="font-medium text-slate-600"><span class="font-black text-slate-900 mr-2">${item.quantity}x</span>${item.name} <span class="text-[10px] uppercase text-slate-400 ml-1">(${item.jug_type})</span></span>
                        <span class="font-bold text-slate-800">₱${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div class="mt-1">
                        <button type="button" onclick="document.getElementById('c-opts-${index}').classList.toggle('hidden')" class="text-[10px] font-bold text-slate-600 bg-slate-100/80 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-between w-full border border-slate-200/60 shadow-sm">
                            <span class="flex items-center gap-1.5"><span class="text-slate-400 uppercase text-[9px]">Container:</span> <span class="text-blue-600">${item.container_option === 'owned' ? '<i class="fa-solid fa-rotate mr-1"></i> Swap Empties' : (item.container_option === 'borrow' ? '<i class="fa-solid fa-hand-holding mr-1"></i> Borrow Jug' : '<i class="fa-solid fa-cart-shopping mr-1"></i> Buy New Jug')}</span></span>
                            <i class="fa-solid fa-chevron-down text-slate-400"></i>
                        </button>
                        <div id="c-opts-${index}" class="hidden mt-1.5 grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-xl transition-all">
                            <button type="button" onclick="App.updateCartContainer(${index}, 'owned')" class="py-2 px-1 rounded-lg text-[9px] font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${item.container_option === 'owned' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}">
                                <i class="fa-solid fa-rotate text-sm"></i> 
                                <span>Swap Empties</span>
                            </button>
                            ${station.pending_borrowed > 0 ? `
                            <button type="button" class="py-2 px-1 rounded-lg text-[9px] font-bold transition-all text-center flex flex-col items-center justify-center gap-1 text-slate-400 bg-slate-200/30 cursor-not-allowed" title="Return pending jugs first">
                                <i class="fa-solid fa-lock text-sm"></i> 
                                <span>Borrow Locked</span>
                            </button>
                            ` : `
                            <button type="button" onclick="App.updateCartContainer(${index}, 'borrow')" class="py-2 px-1 rounded-lg text-[9px] font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${item.container_option === 'borrow' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}">
                                <i class="fa-solid fa-hand-holding-droplet text-sm"></i> 
                                <span>Borrow Jug</span>
                            </button>
                            `}
                            <button type="button" onclick="App.updateCartContainer(${index}, 'buy')" class="py-2 px-1 rounded-lg text-[9px] font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${item.container_option === 'buy' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}">
                                <i class="fa-solid fa-cart-shopping text-sm"></i> 
                                <span>Buy (+₱${parseFloat(station.new_jug_price || 0).toFixed(0)})</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                    </div>
                    <div class="flex justify-between items-center pt-2 text-sm text-slate-500">
                        <span>Subtotal</span>
                        <span class="font-bold">₱${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center pt-2 text-sm text-slate-500 pb-3">
                        <span>Shipping Fee</span>
                        <span class="font-bold">₱${shippingFee.toFixed(2)}</span>
                    </div>
                    <div class="hidden justify-between items-center pt-2 text-sm text-slate-500 pb-3 text-emerald-600" id="co-loyalty-row">
                        <span>Free Refill Discount</span>
                        <span class="font-bold" id="co-loyalty-amt">-₱0.00</span>
                    </div>

                    <div class="hidden justify-between items-center pt-2 text-sm text-slate-500 pb-3 text-blue-600" id="co-buy-row">
                        <span>New Jugs Purchase</span>
                        <span class="font-bold" id="co-buy-display">+₱0.00</span>
                    </div>
                    <div class="flex justify-between items-center pt-4 border-t border-slate-100 border-dashed">
                        <span class="font-black text-slate-500">Total to Pay</span>
                        <span class="font-black text-blue-600 text-2xl" id="co-total-display">₱${total.toFixed(2)}</span>
                    </div>
                </div>
                
                ${station.pending_borrowed > 0 ? `
                <div class="bg-red-50 rounded-3xl shadow-md shadow-red-500/10 border border-red-100 p-6 mb-4">
                    <h3 class="font-bold text-red-800 mb-2"><i class="fa-solid fa-circle-exclamation mr-2"></i> Unreturned Jugs Pending</h3>
                    <p class="text-xs text-red-600 mb-3">You have previously borrowed jugs that haven't been returned yet.</p>
                    <label class="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-red-200 hover:bg-red-50 transition">
                        <input type="checkbox" id="co-return-borrowed" class="w-5 h-5 text-red-600 rounded border-red-300 focus:ring-red-500 shrink-0">
                        <span class="text-sm font-bold text-red-700">I am returning the borrowed jugs today</span>
                    </label>
                </div>
                ` : ''}

                <!-- Loyalty Program -->
                <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 flex items-start gap-4 ${canUsePoints ? 'bg-blue-50 border-2 border-blue-400 shadow-md shadow-blue-500/20' : 'opacity-60'}">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><i class="fa-solid fa-gift"></i></div>
                    <div class="flex-1">
                        <h4 class="font-bold text-slate-800">Redeem Free Refill</h4>
                        <p class="text-xs text-slate-500 mt-1">Costs 10 points. You have ${station.user_points || 0}.</p>
                        ${canUsePoints ? `
                            <label class="flex items-center gap-2 mt-3 cursor-pointer">
                                <input type="checkbox" id="co-use-points" onchange="App.recalculateTotal()" class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0">
                                <span class="text-sm font-bold text-blue-600">Apply discount</span>
                            </label>
                        ` : `<p class="text-xs font-bold text-slate-400 mt-2">Not enough points.</p>`}
                    </div>
                </div>

                <!-- Logistics (Delivery Schedule) -->
                <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 space-y-5">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Delivery Address</label>
                        <textarea id="co-address" required rows="2" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition">${escapeHtml(State.user.data.address)}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Delivery Schedule</label>
                        ${scheduleWarning}
                        <select id="co-schedule-type" onchange="App.toggleScheduleUI()" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium">
                            ${!isClosedNow ? '<option value="Immediate">Immediate Delivery (ASAP)</option>' : ''}
                            <option value="Scheduled" ${isClosedNow ? 'selected' : ''}>Schedule for Later</option>
                        </select>
                        <div id="co-schedule-date-wrap" class="${isClosedNow ? 'mt-3' : 'mt-3 hidden'}">
                            <div class="text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Choose your schedule</div>
                            <input type="datetime-local" id="co-schedule-date" ${isClosedNow ? 'required' : ''} min="${minScheduleLimit}" max="${maxScheduleLimit}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700">
                            <p class="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1"><i class="fa-solid fa-calendar-week text-blue-500"></i> Pre-orders can be scheduled up to 1 week (7 days) ahead.</p>
                        </div>
                    </div>
                </div>

                <!-- Payment Method -->
                <div id="payment-section" class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6">
                    <label class="block text-sm font-bold text-slate-700 mb-4">Payment Method</label>
                    <div class="grid grid-cols-3 gap-2 mb-5">
                        <label class="relative cursor-pointer">
                            <input type="radio" name="co-payment" value="COD" onchange="App.togglePaymentUI()" class="peer sr-only">
                            <div class="w-full py-3 bg-white border-2 border-slate-200 rounded-xl peer-checked:border-blue-600 peer-checked:bg-blue-50 text-center font-bold text-slate-600 peer-checked:text-blue-600 transition text-sm">COD</div>
                        </label>
                        <label class="relative cursor-pointer">
                            <input type="radio" name="co-payment" value="GCash" onchange="App.togglePaymentUI()" class="peer sr-only">
                            <div class="w-full py-3 bg-white border-2 border-slate-200 rounded-xl peer-checked:border-blue-600 peer-checked:bg-blue-50 text-center font-bold text-slate-600 peer-checked:text-blue-600 transition text-sm">GCash</div>
                        </label>
                        <label class="relative cursor-pointer">
                            <input type="radio" name="co-payment" value="Maya" onchange="App.togglePaymentUI()" class="peer sr-only">
                            <div class="w-full py-3 bg-white border-2 border-slate-200 rounded-xl peer-checked:border-blue-600 peer-checked:bg-blue-50 text-center font-bold text-slate-600 peer-checked:text-blue-600 transition text-sm">Maya</div>
                        </label>
                    </div>
                    
                    <div id="co-cashless-ui-gcash" class="hidden space-y-4 pt-4 border-t border-slate-100">
                        <div class="p-4 bg-slate-50 rounded-2xl border border-blue-200">
                            <p class="text-xs font-bold text-blue-500 uppercase mb-2">Station GCash Detail</p>
                            <p class="text-sm font-bold text-slate-800">${escapeHtml(station.gcash_name || 'Not provided')}</p>
                            <p class="text-sm text-slate-700 font-bold tracking-wider mt-1">${escapeHtml(station.gcash_number || 'N/A')}</p>
                            ${station.gcash_qr ? `<img src="${station.gcash_qr}" class="mt-3 max-w-[150px] mx-auto rounded-xl border border-slate-200 shadow-sm">` : ''}
                        </div>
                        <div class="pt-2">
                            <label class="block text-sm font-bold text-slate-700 mb-2">Upload GCash Receipt <span class="text-red-500">*</span></label>
                            <input type="file" id="co-receipt-gcash" accept="image/*" class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition">
                        </div>
                    </div>
                    
                    <div id="co-cashless-ui-maya" class="hidden space-y-4 pt-4 border-t border-slate-100">
                        <div class="p-4 bg-slate-50 rounded-2xl border border-emerald-200">
                            <p class="text-xs font-bold text-emerald-500 uppercase mb-2">Station Maya Detail</p>
                            <p class="text-sm font-bold text-slate-800">${escapeHtml(station.maya_name || 'Not provided')}</p>
                            <p class="text-sm text-slate-700 font-bold tracking-wider mt-1">${escapeHtml(station.maya_number || 'N/A')}</p>
                            ${station.maya_qr ? `<img src="${station.maya_qr}" class="mt-3 max-w-[150px] mx-auto rounded-xl border border-slate-200 shadow-sm">` : ''}
                        </div>
                        <div class="pt-2">
                            <label class="block text-sm font-bold text-slate-700 mb-2">Upload Maya Receipt <span class="text-red-500">*</span></label>
                            <input type="file" id="co-receipt-maya" accept="image/*" class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 transition">
                        </div>
                    </div>
                </div>

                <div class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-40">
                    <div class="max-w-3xl mx-auto flex items-center justify-between">
                        <div>
                            <p class="text-[10px] text-slate-500 font-bold uppercase mb-0">Total to Pay</p>
                            <p class="text-xl font-black text-blue-600" id="co-sticky-total">₱0.00</p>
                        </div>
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-6 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 text-lg flex items-center gap-2">
                            Confirm Order
                        </button>
                    </div>
                </div>
            </form>
        `;
        this.html('<div class="max-w-3xl mx-auto w-full">' + html + '</div>');
        const root = document.getElementById('app-root');
        if (root) root.scrollTop = 0;
        setTimeout(() => {
            const r = document.getElementById('app-root');
            if (r) r.scrollTop = 0;
            App.recalculateTotal();
        }, 0);
    },

    async renderCustomerOrders() {
        State.customerOrderTab = State.customerOrderTab || 'active';
        State.myOrders = State.myOrders || this.getPrefetched('customer_orders');
        if (!State.myOrders) {
            const cachedOrders = localStorage.getItem('cache_get_customer_orders');
            if (cachedOrders) {
                try {
                    const parsed = JSON.parse(cachedOrders);
                    State.myOrders = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }
        const isFirstLoad = !State.myOrders;
        if (State.myOrders) {
            this._renderOrdersPage(false);
        } else {
            this._renderOrdersPage(true);
        }
        
        try {
            const data = await API.request('get_customer_orders', 'GET', null, true);
            this._prefetchCache['customer_orders'] = { loading: false, data, ts: Date.now() };
            if (!data) throw new Error("Failed to load data");

            const oldHash = JSON.stringify((State.myOrders || []).map(o => o.order_id + o.order_status + (o.rating || '')));
            State.myOrders = data;
            const newHash = JSON.stringify(State.myOrders.map(o => o.order_id + o.order_status + (o.rating || '')));
            
            if (!State.knownCustomerOrderStatuses) State.knownCustomerOrderStatuses = new Map();
            if (Array.isArray(data)) {
                data.forEach(o => State.knownCustomerOrderStatuses.set(String(o.order_id), o.order_status));
                State.customerPollingInitialized = true;
                State.customerSessionStartTime = State.customerSessionStartTime || Date.now();
            }

            if (isFirstLoad && this._currentView === 'customer_orders') {
                this._renderOrdersPage(false);
            } else if (oldHash !== newHash && this._currentView === 'customer_orders') {
                this._updateOrdersList();
            }
        } catch (e) {
            console.error(e);
            if (isFirstLoad && this._currentView === 'customer_orders') {
                this.html('<div class="max-w-3xl mx-auto w-full p-6">' + this.emptyState('fa-triangle-exclamation', 'Network Error', 'Failed to load orders. Please try again.') + '</div>');
            }
        }
    },

    _renderOrdersPage(showSkeleton) {
        const html = `
            <style>
                .star-group { display: flex; flex-direction: row-reverse; justify-content: center; gap: 8px; }
                .star-group i { color: #cbd5e1; cursor: pointer; transition: color 0.2s; }
                .star-group i:hover, .star-group i:hover ~ i { color: #facc15; }
            </style>
            <button onclick="UI.goBack('customer_dashboard')" class="text-sm font-bold text-slate-500 hover:text-slate-800 mb-6 flex items-center transition"><i class="fa-solid fa-arrow-left mr-2"></i> Back to Home</button>
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-black text-slate-800">My Orders</h2>
            </div>
            
            <div class="flex bg-slate-200 p-1 rounded-xl mb-6 shadow-inner">
                <button onclick="State.customerOrderTab='active'; UI._switchOrderTab()" id="orders-tab-active" class="flex-1 py-2 text-sm font-bold rounded-lg transition ${State.customerOrderTab === 'active' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}">Active</button>
                <button onclick="State.customerOrderTab='history'; UI._switchOrderTab()" id="orders-tab-history" class="flex-1 py-2 text-sm font-bold rounded-lg transition ${State.customerOrderTab === 'history' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}">History</button>
            </div>
            
            <div id="orders-list-container">
                ${showSkeleton ? this._ordersSkeleton() : ''}
            </div>
        `;
        this.html('<div class="max-w-3xl mx-auto w-full">' + html + '</div>');

        if (!showSkeleton) {
            this._updateOrdersList();
        }

        this._setupOrdersPolling();
    },

    _ordersSkeleton() {
        let s = '<div class="space-y-4">';
        for (let i = 0; i < 3; i++) {
            s += '<div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-5">' +
                '<div class="flex justify-between items-start mb-3 pb-3 border-b border-slate-100">' +
                '<div class="flex-1"><div class="skeleton h-3 w-20 mb-2"></div><div class="skeleton h-5 w-40"></div></div>' +
                '<div class="skeleton h-5 w-20 rounded-full"></div></div>' +
                '<div class="skeleton h-4 w-full mb-2"></div>' +
                '<div class="skeleton h-4 w-3/4 mb-3"></div>' +
                '<div class="skeleton h-4 w-1/2 mt-3"></div></div>';
        }
        s += '</div>';
        return s;
    },

    _switchOrderTab() {
        const activeBtn = document.getElementById('orders-tab-active');
        const historyBtn = document.getElementById('orders-tab-history');
        if (activeBtn && historyBtn) {
            if (State.customerOrderTab === 'active') {
                activeBtn.className = 'flex-1 py-2 text-sm font-bold rounded-lg transition bg-white shadow text-blue-600';
                historyBtn.className = 'flex-1 py-2 text-sm font-bold rounded-lg transition text-slate-500';
            } else {
                historyBtn.className = 'flex-1 py-2 text-sm font-bold rounded-lg transition bg-white shadow text-blue-600';
                activeBtn.className = 'flex-1 py-2 text-sm font-bold rounded-lg transition text-slate-500';
            }
        }
        this._updateOrdersList();
    },

    _updateOrdersList() {
        const container = document.getElementById('orders-list-container');
        if (!container) return;

        const isHistoryTab = State.customerOrderTab === 'history';
        const displayOrders = State.myOrders.filter(o => isHistoryTab ? (o.order_status === 'Delivered' || o.order_status === 'Cancelled') : (o.order_status !== 'Delivered' && o.order_status !== 'Cancelled'));

        let html = '<div class="space-y-4">';

        if (displayOrders.length === 0) {
            html += this.emptyState('fa-clipboard-list', 'No Orders Found', 'There are no orders matching this status category right now.');
        }

        const groupedOrdersArray = [];
        const groupedMap = new Map();
        
        displayOrders.forEach(o => {
            const key = o.station_order_number ? `${o.customer_id}-${o.station_order_number}` : `solo-${o.order_id}`;
            if(!groupedMap.has(key)) {
                groupedMap.set(key, { 
                    items: [], 
                    info: o, 
                    total: 0,
                    shipping_fee: 0,
                    jug_fee: 0,
                    discount_amount: 0
                });
                groupedOrdersArray.push(groupedMap.get(key));
            }
            groupedMap.get(key).items.push(o);
            groupedMap.get(key).total += parseFloat(o.total_price);
            groupedMap.get(key).shipping_fee += parseFloat(o.shipping_fee || 0);
            groupedMap.get(key).jug_fee += parseFloat(o.jug_fee || 0);
            groupedMap.get(key).discount_amount += parseFloat(o.discount_amount || 0);
        });

        groupedOrdersArray.forEach(group => {
            const o = group.info;
            let badge = 'bg-slate-100 text-slate-600';
            if(o.order_status === 'Preparing') badge = 'bg-yellow-100 text-yellow-700';
            if(o.order_status === 'To Deliver') badge = 'bg-blue-100 text-blue-700';
            if(o.order_status === 'Delivered') badge = 'bg-green-100 text-green-700';
            if(o.order_status === 'Cancelled') badge = 'bg-red-100 text-red-700';

            const proofItem = group.items.find(i => i.has_payment_proof && i.has_payment_proof != '0') || (o.has_payment_proof && o.has_payment_proof != '0' ? o : null);
            const hasProof = !!proofItem;
            const targetOrderId = proofItem ? proofItem.order_id : o.order_id;

            html += `
                <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 p-5 flex flex-col gap-3 relative">
                    <!-- Card Header -->
                    <div class="flex items-center justify-between gap-3 pb-1">
                        <div class="flex items-center gap-3 min-w-0 flex-1">
                            <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-xs">
                                <i class="fa-solid fa-store"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <h4 class="font-black text-slate-900 text-base leading-tight truncate">${escapeHtml(o.station_name)}</h4>
                                <div class="flex items-center gap-1 mt-1 text-[10px] text-slate-500 whitespace-nowrap overflow-hidden">
                                    <span class="font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-[9px] shrink-0">Order #${o.station_order_number || o.order_id}</span>
                                    <span class="text-slate-400 shrink-0">•</span>
                                    <span class="text-slate-500 shrink-0">${App.formatDateTime(o.order_date)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            ${hasProof ? `<button onclick="App.viewProof('${targetOrderId}')" class="w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition" title="View Receipt"><i class="fa-solid fa-receipt text-xs"></i></button>` : ''}
                            <span class="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wide shrink-0 ${badge}">${o.order_status === 'To Deliver' ? 'Out for Delivery' : o.order_status}</span>
                        </div>
                    </div>

                    <!-- Items List -->
                    <div class="space-y-1 py-1">
            `;

            group.items.forEach(item => {
                html += `
                    <div class="flex items-center justify-between text-sm py-1">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="bg-blue-100/70 text-blue-800 font-black text-xs px-2 py-0.5 rounded-md shrink-0">${item.quantity}x</span>
                            <span class="font-bold text-slate-800 truncate">${escapeHtml(item.product_name)}</span>
                            <span class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase shrink-0">${escapeHtml(item.jug_type)}</span>
                        </div>
                        <span class="font-bold text-slate-800 shrink-0 ml-2">₱${parseFloat(item.total_price).toFixed(2)}</span>
                    </div>
                `;
            });
            
            let feeHtml = '';
            const grandTotal = group.total + group.shipping_fee + group.jug_fee - group.discount_amount;
            
            if (group.shipping_fee > 0 || group.jug_fee > 0 || group.discount_amount > 0) {
                feeHtml += `
                    <div class="space-y-1.5 pb-2.5 mb-2.5 border-b border-blue-100/80 text-xs text-slate-500 font-medium">
                        <div class="flex justify-between"><span>Subtotal</span><span class="text-slate-700">₱${group.total.toFixed(2)}</span></div>
                        ${group.shipping_fee > 0 ? `<div class="flex justify-between"><span>Shipping Fee</span><span class="text-slate-700">₱${group.shipping_fee.toFixed(2)}</span></div>` : ''}
                        ${group.jug_fee > 0 ? `<div class="flex justify-between"><span>New Jugs Fee</span><span class="text-slate-700">₱${group.jug_fee.toFixed(2)}</span></div>` : ''}
                        ${group.discount_amount > 0 ? `<div class="flex justify-between text-emerald-600 font-semibold"><span>Discount</span><span>-₱${group.discount_amount.toFixed(2)}</span></div>` : ''}
                    </div>
                `;
            }

            html += `
                    </div>

                    <!-- Payment & Total Card -->
                    <div class="bg-slate-50 rounded-2xl p-3.5 border border-blue-200/80 shadow-xs">
                        ${feeHtml}
                        <div class="flex justify-between items-center gap-2">
                            <div class="flex flex-col gap-1 text-xs text-slate-600 min-w-0">
                                <span class="inline-flex items-center gap-1.5 font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-blue-100 shadow-2xs w-fit">
                                    <i class="fa-solid fa-credit-card text-blue-500 text-xs"></i>
                                    <span>${o.payment_method}</span>
                                </span>
                                ${o.scheduled_date ? `<span class="text-blue-600 text-[10px] font-semibold truncate"><i class="fa-solid fa-calendar mr-1"></i>Scheduled: ${App.formatDateTime(o.scheduled_date)}</span>` : ''}
                            </div>
                            <div class="text-right shrink-0">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Paid</span>
                                <span class="text-base font-black text-blue-600">₱${grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${o.order_status === 'Delivered' && !o.rating ? `
                        <div class="mt-1 pt-3 text-center bg-blue-50/40 -mx-5 -mb-5 p-4 rounded-b-3xl">
                            <p class="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Rate your experience</p>
                            <div class="star-group text-2xl inline-flex flex-row-reverse justify-center gap-1">
                                <i class="fa-solid fa-star p-2 cursor-pointer active:scale-125 transition-transform" onclick="App.submitRating(${o.order_id}, 5)"></i>
                                <i class="fa-solid fa-star p-2 cursor-pointer active:scale-125 transition-transform" onclick="App.submitRating(${o.order_id}, 4)"></i>
                                <i class="fa-solid fa-star p-2 cursor-pointer active:scale-125 transition-transform" onclick="App.submitRating(${o.order_id}, 3)"></i>
                                <i class="fa-solid fa-star p-2 cursor-pointer active:scale-125 transition-transform" onclick="App.submitRating(${o.order_id}, 2)"></i>
                                <i class="fa-solid fa-star p-2 cursor-pointer active:scale-125 transition-transform" onclick="App.submitRating(${o.order_id}, 1)"></i>
                            </div>
                        </div>
                    ` : ''}
                    ${o.rating ? `
                        <div class="mt-0.5 pt-1 flex items-center justify-center gap-2 text-yellow-400 text-sm">
                            <i class="fa-solid fa-check-circle text-emerald-500 mr-1"></i> Rated: ${[...Array(parseInt(o.rating))].map(()=>'<i class="fa-solid fa-star"></i>').join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    },

    _setupOrdersPolling() {
        if(State.pollingInterval) clearInterval(State.pollingInterval);
        
        if (!State.knownCustomerOrderStatuses) State.knownCustomerOrderStatuses = new Map();
        if (State.myOrders && Array.isArray(State.myOrders)) {
            State.myOrders.forEach(o => State.knownCustomerOrderStatuses.set(String(o.order_id), o.order_status));
            State.customerPollingInitialized = true;
        }
        State.lastDataHash = JSON.stringify((State.myOrders || []).map(o => o.order_id + o.order_status + (o.rating || '')));
        
        const pollFn = async () => {
            try {
                const newData = await API.request('get_customer_orders', 'GET', null, true);
                if (!newData || !Array.isArray(newData)) return;

                if (!State.customerPollingInitialized || State.knownCustomerOrderStatuses.size === 0) {
                    newData.forEach(o => State.knownCustomerOrderStatuses.set(String(o.order_id), o.order_status));
                    State.customerPollingInitialized = true;
                    State.customerSessionStartTime = Date.now();
                    State.myOrders = newData;
                    State.lastDataHash = JSON.stringify(newData.map(o => o.order_id + o.order_status + (o.rating || '')));
                    return;
                }

                const changedOrders = [];
                newData.forEach(newOrder => {
                    const orderKey = String(newOrder.order_id);
                    const oldStatus = State.knownCustomerOrderStatuses.get(orderKey);
                    if (oldStatus && oldStatus !== newOrder.order_status) {
                        changedOrders.push(newOrder);
                    }
                    State.knownCustomerOrderStatuses.set(orderKey, newOrder.order_status);
                });

                if (changedOrders.length > 0) {
                    const seenGroupKeys = new Set();
                    changedOrders.forEach(newOrder => {
                        const gKey = newOrder.station_order_number ? `${newOrder.station_id}-${newOrder.station_order_number}` : `solo-${newOrder.order_id}`;
                        if (!seenGroupKeys.has(gKey)) {
                            const orderNum = newOrder.station_order_number || newOrder.order_id;
                            const notifyMsg = `Your Order #${orderNum} is now ${newOrder.order_status}!`;
                            if (!State.pushSubscriptionSynced) {
                                App.sendNativeNotification('Order Update', notifyMsg, 'order-' + orderNum);
                            }
                        }
                    });
                }

                const newHash = JSON.stringify(newData.map(o => o.order_id + o.order_status + (o.rating || '')));
                if(State.lastDataHash !== newHash) {
                    State.myOrders = newData;
                    State.lastDataHash = newHash;
                    this._prefetchCache['customer_orders'] = { loading: false, data: newData, ts: Date.now() };
                    this._updateOrdersList();
                }
            } catch(e) {}
        };

        const hasActive = State.myOrders?.some(o => !['Delivered', 'Cancelled'].includes(o.order_status));
        const intervalMs = hasActive ? 8000 : 25000;
        State.pollingInterval = setInterval(pollFn, intervalMs);
    },

    async renderAdminDashboard() {
        if (!State.adminData) {
            const cached = localStorage.getItem('cache_get_admin_dashboard_data');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    State.adminData = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }
        const isFirstLoad = !State.adminData;
        if (State.adminData) {
            this._renderAdminDashboardPage(false);
        } else {
            this._renderAdminDashboardPage(true);
        }
        try {
            const data = await this.prefetch('admin_dashboard_data', 'get_admin_dashboard_data');
            if (!data) throw new Error("Failed to load data");

            const oldHash = JSON.stringify((State.adminData?.orders || []).map(o => o.order_id + o.order_status));
            const newHash = JSON.stringify((data.orders || []).map(o => o.order_id + o.order_status));
            State.adminData = data;
            
            if (!State.knownAdminOrderIds) State.knownAdminOrderIds = new Set();
            if (data.orders && Array.isArray(data.orders)) {
                data.orders.forEach(o => State.knownAdminOrderIds.add(String(o.order_id)));
                State.adminPollingInitialized = true;
                State.adminSessionStartTime = State.adminSessionStartTime || Date.now();
            }

            if (isFirstLoad && this._currentView === 'admin_dashboard') {
                this._renderAdminDashboardPage(false);
            } else if (this._currentView === 'admin_dashboard') {
                if (oldHash !== newHash) {
                    this._updateAdminOrdersList();
                }
                const inventory = data.inventory || { round_jugs: 0, slim_jugs: 0, stock_level: 0 };
                const stockEl = document.getElementById('admin-total-stock');
                if (stockEl) stockEl.innerText = parseInt(inventory.round_jugs) + parseInt(inventory.slim_jugs);
            }
        } catch (e) {
            console.error(e);
            if (isFirstLoad && this._currentView === 'admin_dashboard') {
                this.html('<div class="max-w-5xl mx-auto w-full p-6">' + this.emptyState('fa-triangle-exclamation', 'Network Error', 'Failed to load dashboard data. Please try again.') + '</div>');
            }
        }
    },

    _renderAdminDashboardPage(showSkeleton) {
        let totalStock = 0;
        let pendingCount = 0;
        let immediateCount = 0;
        let scheduledCount = 0;
        
        if (!showSkeleton && State.adminData) {
            const inventory = State.adminData.inventory || { round_jugs: 0, slim_jugs: 0, stock_level: 0 };
            totalStock = parseInt(inventory.round_jugs) + parseInt(inventory.slim_jugs);
            const orders = State.adminData.orders || [];
            const pending = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.order_status));
            const getUniqueOrderCount = (arr) => {
                const keys = new Set();
                arr.forEach(o => keys.add(o.station_order_number ? `${o.customer_id}-${o.station_order_number}` : `solo-${o.order_id}`));
                return keys.size;
            };
            pendingCount = getUniqueOrderCount(pending);
            immediateCount = getUniqueOrderCount(pending.filter(o => !o.scheduled_date));
            scheduledCount = getUniqueOrderCount(pending.filter(o => !!o.scheduled_date));
        }

        if (!State.adminActiveFilter) State.adminActiveFilter = 'all';

        let activeTabLabel = `All Active (${pendingCount})`;
        if (State.adminActiveFilter === 'scheduled') {
            activeTabLabel = `Scheduled (${scheduledCount})`;
        } else if (State.adminActiveFilter === 'active') {
            activeTabLabel = `Active (${immediateCount})`;
        }

        const html = `
            <style>
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 16px; }
            </style>
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h2 class="text-2xl font-black text-slate-800">Dashboard</h2>
                    <p class="text-sm text-slate-500 font-medium">Station Management</p>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3 mb-6">
                <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-md relative overflow-hidden cursor-pointer active:scale-95 transition-transform" onclick="UI.navigate('admin_sales_report')">
                    <p class="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Sales Report</p>
                    <div class="flex items-center justify-between">
                        <p class="text-xl sm:text-2xl font-black truncate">View</p>
                        <div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><i class="fa-solid fa-chart-line text-xs"></i></div>
                    </div>
                    <p class="text-[10px] text-blue-200 mt-1">Tap for full report</p>
                    <i class="fa-solid fa-chart-column absolute -right-2 -bottom-4 text-6xl opacity-20"></i>
                </div>
                
                <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-md relative overflow-hidden cursor-pointer active:scale-95 transition-transform" onclick="UI.navigate('admin_inventory')">
                    <p class="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Total Water Stock</p>
                    <div class="flex items-center justify-between">
                        ${showSkeleton ? `<div class="skeleton h-8 w-16 bg-emerald-400"></div>` : `<p class="text-xl sm:text-2xl font-black" id="admin-total-stock">${totalStock}</p>`}
                        <div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><i class="fa-solid fa-boxes-stacked text-xs"></i></div>
                    </div>
                    <p class="text-[10px] text-emerald-100 mt-1">Tap for ledger & stock</p>
                    <i class="fa-solid fa-boxes-stacked absolute -right-4 -bottom-4 text-6xl opacity-20"></i>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
                <button onclick="UI.navigate('admin_products')" class="bg-white border border-blue-200/80 ring-2 ring-blue-500/30 rounded-2xl p-3 shadow-sm active:bg-blue-50 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-50 active:bg-slate-100 transition shadow-sm text-slate-700">
                    <div class="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><i class="fa-solid fa-box-open text-sm"></i></div>
                    <span class="font-bold text-[11px] uppercase tracking-wider">Catalog</span>
                </button>
                <button onclick="UI.navigate('admin_loyalty')" class="bg-white border border-blue-200/80 ring-2 ring-blue-500/30 rounded-2xl p-3 shadow-sm active:bg-blue-50 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-50 active:bg-slate-100 transition shadow-sm text-slate-700">
                    <div class="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><i class="fa-solid fa-crown text-sm"></i></div>
                    <span class="font-bold text-[11px] uppercase tracking-wider">Loyalty</span>
                </button>
                <button onclick="UI.navigate('admin_settings')" class="bg-white border border-blue-200/80 ring-2 ring-blue-500/30 rounded-2xl p-3 shadow-sm active:bg-blue-50 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-50 active:bg-slate-100 transition shadow-sm text-slate-700">
                    <div class="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><i class="fa-solid fa-gear text-sm"></i></div>
                    <span class="font-bold text-[11px] uppercase tracking-wider">Settings</span>
                </button>
            </div>

            <div class="flex bg-slate-200 p-1 rounded-xl mb-3 shadow-inner gap-1 relative">
                <div class="flex-1 relative" id="admin-active-dropdown-container">
                    <button type="button" 
                        id="admin-tab-active-btn" 
                        onclick="UI.toggleAdminActiveDropdown(event)" 
                        class="w-full py-2.5 px-3 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer outline-none ${State.adminOrderTab === 'active' ? 'bg-white shadow text-blue-600' : 'bg-transparent text-slate-500 hover:text-slate-700'}">
                        <span id="admin-tab-active-label" class="truncate">${activeTabLabel}</span>
                        <i id="admin-tab-active-chevron" class="fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${State.adminOrderTab === 'active' ? 'text-blue-600' : 'text-slate-400'}"></i>
                    </button>

                    <!-- Custom Dropdown Menu for Mobile & Desktop (No native Android popup dialog) -->
                    <div id="admin-active-dropdown-menu" 
                        class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-40 transition-all duration-150 transform opacity-0 -translate-y-1">
                        <button type="button" 
                            onclick="UI.selectAdminFilterOption('all', event)" 
                            class="w-full px-3.5 py-2.5 text-left text-xs sm:text-sm font-bold flex items-center justify-between transition hover:bg-blue-50 active:bg-blue-100 ${State.adminActiveFilter === 'all' ? 'text-blue-600 bg-blue-50/60' : 'text-slate-700'}">
                            <span id="admin-opt-all-text">All Active (${pendingCount})</span>
                            <i id="admin-opt-all-check" class="fa-solid fa-check text-blue-600 text-xs ${State.adminActiveFilter === 'all' ? '' : 'hidden'}"></i>
                        </button>
                        <button type="button" 
                            onclick="UI.selectAdminFilterOption('active', event)" 
                            class="w-full px-3.5 py-2.5 text-left text-xs sm:text-sm font-bold flex items-center justify-between transition hover:bg-blue-50 active:bg-blue-100 ${State.adminActiveFilter === 'active' ? 'text-blue-600 bg-blue-50/60' : 'text-slate-700'}">
                            <span id="admin-opt-active-text">Active (${immediateCount})</span>
                            <i id="admin-opt-active-check" class="fa-solid fa-check text-blue-600 text-xs ${State.adminActiveFilter === 'active' ? '' : 'hidden'}"></i>
                        </button>
                        <button type="button" 
                            onclick="UI.selectAdminFilterOption('scheduled', event)" 
                            class="w-full px-3.5 py-2.5 text-left text-xs sm:text-sm font-bold flex items-center justify-between transition hover:bg-blue-50 active:bg-blue-100 ${State.adminActiveFilter === 'scheduled' ? 'text-blue-600 bg-blue-50/60' : 'text-slate-700'}">
                            <span id="admin-opt-scheduled-text">Scheduled (${scheduledCount})</span>
                            <i id="admin-opt-scheduled-check" class="fa-solid fa-check text-blue-600 text-xs ${State.adminActiveFilter === 'scheduled' ? '' : 'hidden'}"></i>
                        </button>
                    </div>
                </div>
                <button type="button" onclick="UI.selectAdminHistoryTab()" id="admin-tab-history" class="flex-1 py-2.5 text-sm font-bold rounded-lg transition ${State.adminOrderTab === 'history' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}">History</button>
            </div>
            
            <div id="admin-history-search-container" class="${State.adminOrderTab === 'history' ? '' : 'hidden'} mb-4">
                <div class="relative">
                    <i class="fa-solid fa-search absolute left-3.5 top-3 text-slate-400 text-sm"></i>
                    <input type="text" id="admin-history-search" placeholder="Search history by order #, customer name, or phone..." oninput="UI._updateAdminOrdersList()" class="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs">
                </div>
            </div>
            
            <div id="admin-orders-list-container">
                ${showSkeleton ? this._adminDashboardSkeleton() : ''}
            </div>
        `;
        this.html('<div class="max-w-4xl mx-auto w-full">' + html + '</div>');

        if (!showSkeleton) {
            this._updateAdminOrdersList();
            this._setupAdminPolling();
        }
    },

    _adminDashboardSkeleton() {
        let s = '<div class="space-y-4">';
        for (let i = 0; i < 3; i++) {
            s += `
                <div class="bg-white rounded-2xl sm:rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
                    <div class="flex justify-between items-start">
                        <div class="space-y-2">
                            <div class="skeleton h-5 w-36 rounded-md"></div>
                            <div class="skeleton h-3.5 w-48 rounded-md"></div>
                        </div>
                        <div class="skeleton h-6 w-20 rounded-full"></div>
                    </div>
                    <div class="space-y-2 pt-2 border-t border-slate-100">
                        <div class="skeleton h-4 w-full rounded-md"></div>
                        <div class="skeleton h-4 w-3/4 rounded-md"></div>
                    </div>
                    <div class="flex justify-between items-center pt-2 border-t border-slate-100">
                        <div class="skeleton h-5 w-24 rounded-md"></div>
                        <div class="skeleton h-9 w-28 rounded-xl"></div>
                    </div>
                </div>
            `;
        }
        s += '</div>';
        return s;
    },

    toggleAdminActiveDropdown(e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const menu = document.getElementById('admin-active-dropdown-menu');
        const chevron = document.getElementById('admin-tab-active-chevron');
        if (!menu) return;

        if (State.adminOrderTab !== 'active') {
            State.adminOrderTab = 'active';
            this._switchAdminTab();
        }

        const isHidden = menu.classList.contains('hidden');
        if (isHidden) {
            menu.classList.remove('hidden');
            requestAnimationFrame(() => {
                menu.classList.remove('opacity-0', '-translate-y-1');
                menu.classList.add('opacity-100', 'translate-y-0');
            });
            if (chevron) chevron.classList.add('rotate-180');

            const closeOnClickOutside = (evt) => {
                const container = document.getElementById('admin-active-dropdown-container');
                if (container && !container.contains(evt.target)) {
                    this.closeAdminActiveDropdown();
                    document.removeEventListener('click', closeOnClickOutside);
                    document.removeEventListener('touchstart', closeOnClickOutside);
                }
            };
            setTimeout(() => {
                document.addEventListener('click', closeOnClickOutside);
                document.addEventListener('touchstart', closeOnClickOutside);
            }, 50);
        } else {
            this.closeAdminActiveDropdown();
        }
    },

    closeAdminActiveDropdown() {
        const menu = document.getElementById('admin-active-dropdown-menu');
        const chevron = document.getElementById('admin-tab-active-chevron');
        if (!menu || menu.classList.contains('hidden')) return;

        menu.classList.remove('opacity-100', 'translate-y-0');
        menu.classList.add('opacity-0', '-translate-y-1');
        if (chevron) chevron.classList.remove('rotate-180');
        setTimeout(() => {
            menu.classList.add('hidden');
        }, 150);
    },

    selectAdminFilterOption(val, e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        State.adminActiveFilter = val;
        State.adminOrderTab = 'active';
        this.closeAdminActiveDropdown();
        this._switchAdminTab();
    },

    selectAdminHistoryTab() {
        this.closeAdminActiveDropdown();
        State.adminOrderTab = 'history';
        this._switchAdminTab();
    },

    _switchAdminTab() {
        const activeBtn = document.getElementById('admin-tab-active-btn');
        const historyBtn = document.getElementById('admin-tab-history');
        const hSearchCont = document.getElementById('admin-history-search-container');
        const chevronIcon = document.getElementById('admin-tab-active-chevron');
        if (hSearchCont) {
            if (State.adminOrderTab === 'history') hSearchCont.classList.remove('hidden');
            else hSearchCont.classList.add('hidden');
        }
        if (activeBtn && historyBtn) {
            if (State.adminOrderTab === 'active') {
                activeBtn.className = 'w-full py-2.5 px-3 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer outline-none bg-white shadow text-blue-600';
                historyBtn.className = 'flex-1 py-2.5 text-sm font-bold rounded-lg transition text-slate-500 hover:text-slate-700';
                if (chevronIcon) {
                    chevronIcon.classList.remove('text-slate-400');
                    chevronIcon.classList.add('text-blue-600');
                }
            } else {
                historyBtn.className = 'flex-1 py-2.5 text-sm font-bold rounded-lg transition bg-white shadow text-blue-600';
                activeBtn.className = 'w-full py-2.5 px-3 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer outline-none bg-transparent text-slate-500 hover:text-slate-700';
                if (chevronIcon) {
                    chevronIcon.classList.remove('text-blue-600');
                    chevronIcon.classList.add('text-slate-400');
                }
            }
        }
        this._updateAdminOrdersList();
    },

    _updateAdminOrdersList() {
        const container = document.getElementById('admin-orders-list-container');
        if (!container) return;

        const orders = State.adminData?.orders || [];
        const pending = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.order_status));
        let completed = orders.filter(o => ['Delivered', 'Cancelled'].includes(o.order_status));

        const getUniqueOrderCount = (arr) => {
            const keys = new Set();
            arr.forEach(o => keys.add(o.station_order_number ? `${o.customer_id}-${o.station_order_number}` : `solo-${o.order_id}`));
            return keys.size;
        };

        const immediateOrders = pending.filter(o => !o.scheduled_date);
        const scheduledOrders = pending.filter(o => !!o.scheduled_date);

        const immediateCount = getUniqueOrderCount(immediateOrders);
        const scheduledCount = getUniqueOrderCount(scheduledOrders);
        const totalPendingCount = getUniqueOrderCount(pending);

        const activeLabel = document.getElementById('admin-tab-active-label');
        if (activeLabel) {
            if (State.adminActiveFilter === 'scheduled') {
                activeLabel.textContent = `Scheduled (${scheduledCount})`;
            } else if (State.adminActiveFilter === 'active') {
                activeLabel.textContent = `Active (${immediateCount})`;
            } else {
                activeLabel.textContent = `All Active (${totalPendingCount})`;
            }
        }

        const optAllText = document.getElementById('admin-opt-all-text');
        if (optAllText) optAllText.textContent = `All Active (${totalPendingCount})`;
        const optActiveText = document.getElementById('admin-opt-active-text');
        if (optActiveText) optActiveText.textContent = `Active (${immediateCount})`;
        const optSchedText = document.getElementById('admin-opt-scheduled-text');
        if (optSchedText) optSchedText.textContent = `Scheduled (${scheduledCount})`;

        const checkAll = document.getElementById('admin-opt-all-check');
        if (checkAll) checkAll.classList.toggle('hidden', State.adminActiveFilter !== 'all');
        const checkActive = document.getElementById('admin-opt-active-check');
        if (checkActive) checkActive.classList.toggle('hidden', State.adminActiveFilter !== 'active');
        const checkSched = document.getElementById('admin-opt-scheduled-check');
        if (checkSched) checkSched.classList.toggle('hidden', State.adminActiveFilter !== 'scheduled');

        const optAllBtn = optAllText?.closest('button');
        if (optAllBtn) {
            optAllBtn.className = `w-full px-3.5 py-2.5 text-left text-xs sm:text-sm font-bold flex items-center justify-between transition hover:bg-blue-50 active:bg-blue-100 ${State.adminActiveFilter === 'all' ? 'text-blue-600 bg-blue-50/60' : 'text-slate-700'}`;
        }
        const optActiveBtn = optActiveText?.closest('button');
        if (optActiveBtn) {
            optActiveBtn.className = `w-full px-3.5 py-2.5 text-left text-xs sm:text-sm font-bold flex items-center justify-between transition hover:bg-blue-50 active:bg-blue-100 ${State.adminActiveFilter === 'active' ? 'text-blue-600 bg-blue-50/60' : 'text-slate-700'}`;
        }
        const optSchedBtn = optSchedText?.closest('button');
        if (optSchedBtn) {
            optSchedBtn.className = `w-full px-3.5 py-2.5 text-left text-xs sm:text-sm font-bold flex items-center justify-between transition hover:bg-blue-50 active:bg-blue-100 ${State.adminActiveFilter === 'scheduled' ? 'text-blue-600 bg-blue-50/60' : 'text-slate-700'}`;
        }

        if (State.adminOrderTab === 'history') {
            const hSearch = (document.getElementById('admin-history-search')?.value || '').toLowerCase().trim();
            if (hSearch) {
                completed = completed.filter(o => 
                    (o.station_order_number && String(o.station_order_number).toLowerCase().includes(hSearch)) ||
                    (o.order_id && String(o.order_id).toLowerCase().includes(hSearch)) ||
                    (o.full_name && o.full_name.toLowerCase().includes(hSearch)) ||
                    (o.contact_number && o.contact_number.includes(hSearch))
                );
            }
        }

        let displayOrders;
        if (State.adminOrderTab === 'history') {
            displayOrders = completed;
        } else if (State.adminActiveFilter === 'scheduled') {
            displayOrders = scheduledOrders;
        } else if (State.adminActiveFilter === 'all') {
            displayOrders = pending;
        } else {
            displayOrders = immediateOrders;
        }

        let html = '<div class="space-y-4">';

        if(displayOrders.length === 0) {
            if (State.adminOrderTab === 'active' && State.adminActiveFilter === 'scheduled') {
                html += this.emptyState('fa-calendar', 'No Scheduled Orders', 'There are no advance pre-orders for this station right now.');
            } else if (State.adminOrderTab === 'active' && State.adminActiveFilter === 'active') {
                html += this.emptyState('fa-clipboard-list', 'No Active Orders', 'There are no immediate active orders for this station right now.');
            } else {
                html += this.emptyState('fa-clipboard-list', 'No Orders Found', 'There are no orders matching this status category right now.');
            }
        }

        State.selectedOrders.clear();
        const groupedOrdersArray = [];
        const groupedMap = new Map();
        displayOrders.forEach(o => {
            const key = o.station_order_number ? `${o.customer_id}-${o.station_order_number}` : `solo-${o.order_id}`;
            if(!groupedMap.has(key)) {
                groupedMap.set(key, { 
                    items: [], 
                    info: o, 
                    total: 0,
                    shipping_fee: 0,
                    jug_fee: 0,
                    discount_amount: 0
                });
                groupedOrdersArray.push(groupedMap.get(key));
            }
            groupedMap.get(key).items.push(o);
            groupedMap.get(key).total += parseFloat(o.total_price);
            groupedMap.get(key).shipping_fee += parseFloat(o.shipping_fee || 0);
            groupedMap.get(key).jug_fee += parseFloat(o.jug_fee || 0);
            groupedMap.get(key).discount_amount += parseFloat(o.discount_amount || 0);
        });

        groupedOrdersArray.sort((a, b) => {
            if (State.adminOrderTab === 'active') {
                const ptsA = a.info.user_lifetime_points || a.info.user_points || 0;
                const ptsB = b.info.user_lifetime_points || b.info.user_points || 0;
                const rankA = App.getLoyaltyRank(ptsA).tier;
                const rankB = App.getLoyaltyRank(ptsB).tier;
                if (rankA !== rankB) return rankB - rankA;
                const timeA = a.info.scheduled_date ? new Date(a.info.scheduled_date).getTime() : new Date(a.info.order_date).getTime();
                const timeB = b.info.scheduled_date ? new Date(b.info.scheduled_date).getTime() : new Date(b.info.order_date).getTime();
                return timeA - timeB;
            }
            return new Date(b.info.order_date).getTime() - new Date(a.info.order_date).getTime();
        });

        groupedOrdersArray.forEach(group => {
            const o = group.info;
            const isHistory = State.adminOrderTab === 'history';
            const rank = App.getLoyaltyRank(o.user_lifetime_points || o.user_points || 0);
            const proofItem = group.items.find(i => i.has_payment_proof && i.has_payment_proof != '0') || (o.has_payment_proof && o.has_payment_proof != '0' ? o : null);
            const hasProof = !!proofItem;
            const targetOrderId = proofItem ? proofItem.order_id : o.order_id;
            
            html += `
                <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-4 flex flex-col gap-3 relative hover:shadow-lg">
                    <div class="flex justify-between items-start gap-3">
                        <div class="min-w-0 flex-1 flex items-start gap-2">
                            ${!isHistory && (o.order_status === 'Preparing' || o.order_status === 'To Deliver') ? `<input type="checkbox" class="bulk-order-checkbox w-4 h-4 mt-1 text-blue-600 rounded border-slate-300 focus:ring-blue-500 shrink-0" value="${o.order_id}" onchange="App.toggleOrderSelection(this)">` : ''}
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-1.5 flex-wrap mb-1">
                                    <span class="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg uppercase tracking-wider inline-block">Order #${o.station_order_number || o.order_id} • ${o.payment_method}</span>
                                    ${o.scheduled_date ? `<span class="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg uppercase tracking-wider inline-flex items-center gap-1"><i class="fa-solid fa-calendar-days text-purple-500"></i> Scheduled</span>` : ''}
                                </div>
                                <div class="flex items-center gap-2 flex-wrap mt-0.5">
                                    <h4 class="font-black text-slate-800 text-base leading-tight truncate">${escapeHtml(o.full_name)}</h4>
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${rank.badgeBg} shrink-0">
                                        <i class="fa-solid ${rank.icon} mr-1"></i>${rank.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-2 shrink-0 items-center">
                            ${hasProof ? `<button onclick="App.viewProof('${targetOrderId}')" class="w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition" title="View Receipt"><i class="fa-solid fa-receipt"></i></button>` : ''}
                            ${!isHistory && o.order_status === 'Pending' ? `<span class="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shrink-0 flex items-center gap-1"><i class="fa-solid fa-clock"></i> Pending</span>` : ''}
                            ${isHistory ? `<span class="px-2 py-1 rounded-md text-[10px] font-bold uppercase shrink-0 ${o.order_status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${o.order_status}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="bg-slate-50 rounded-2xl p-3.5 border border-blue-200/80 flex flex-col gap-2">
            `;

            group.items.forEach(item => {
                html += `
                    <div class="flex items-center justify-between text-sm font-medium text-slate-700 py-1">
                        <span><i class="fa-solid fa-bottle-water w-5 text-blue-400 text-center"></i> <span class="font-black text-slate-900 mr-1">${item.quantity}x</span>${escapeHtml(item.product_name)} <span class="text-[10px] uppercase text-slate-400 ml-1">(${escapeHtml(item.jug_type)})</span></span>
                        <span class="font-black text-slate-900">₱${parseFloat(item.total_price).toFixed(2)}</span>
                    </div>
                `;
            });
            
            let feeHtml = '';
            const grandTotal = group.total + group.shipping_fee + group.jug_fee - group.discount_amount;
            
            feeHtml += `
                <div class="flex justify-between items-center text-sm font-medium text-slate-500 mb-1">
                    <span>Subtotal</span>
                    <span>₱${group.total.toFixed(2)}</span>
                </div>
            `;
            if (group.shipping_fee > 0) {
                feeHtml += `
                    <div class="flex justify-between items-center text-sm font-medium text-slate-500 mb-1">
                        <span>Shipping Fee</span>
                        <span>₱${group.shipping_fee.toFixed(2)}</span>
                    </div>
                `;
            }
            if (group.jug_fee > 0) {
                feeHtml += `
                    <div class="flex justify-between items-center text-sm font-medium text-slate-500 mb-1">
                        <span>New Jugs Fee</span>
                        <span>₱${group.jug_fee.toFixed(2)}</span>
                    </div>
                `;
            }
            if (group.discount_amount > 0) {
                feeHtml += `
                    <div class="flex justify-between items-center text-sm font-medium text-green-500 mb-1">
                        <span>Discount</span>
                        <span>-₱${group.discount_amount.toFixed(2)}</span>
                    </div>
                `;
            }
            
            html += `
                    <div class="mt-2 pt-2">
                        ${feeHtml}
                        <div class="flex justify-between items-center text-sm font-black mt-1 mb-1 text-blue-600">
                            <span>Total Paid</span>
                            <span>₱${grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
            `;

            let containerHtml = '';
            if (o.returning_borrowed_flag == 1) {
                containerHtml += `<p class="font-black text-red-600 mb-1 pb-1 border-b border-red-100"><i class="fa-solid fa-triangle-exclamation mr-1"></i> COLLECT PREVIOUSLY BORROWED JUGS!</p>`;
            }

            if (o.container_option === 'borrow') {
                containerHtml += `<p class="font-bold text-amber-600"><i class="fa-solid fa-hand-holding-droplet mr-1"></i> Customer is borrowing jugs (${o.borrow_round} Round, ${o.borrow_slim} Slim).</p>`;
            } else if (o.container_option === 'owned') {
                containerHtml += `<p class="font-bold text-emerald-600"><i class="fa-solid fa-rotate mr-1"></i> Customer brings empty jugs (Swap).</p>`;
            } else if (o.container_option === 'buy') {
                containerHtml += `<p class="font-bold text-blue-600"><i class="fa-solid fa-cart-shopping mr-1"></i> Customer bought new jugs.</p>`;
            }
            
            if (containerHtml) {
                html += `<div class="bg-white p-2 rounded-lg border border-slate-200 mt-1 text-xs">${containerHtml}</div>`;
            }

            html += `
                        <div class="flex items-start text-xs text-slate-500 leading-snug pt-1 mt-1">
                            <i class="fa-solid fa-location-dot w-5 mt-0.5 text-red-400 text-center"></i> <span>${escapeHtml(o.delivery_address)}</span>
                        </div>
                        <div class="flex items-start text-xs text-slate-500 leading-snug mt-1">
                            <i class="fa-solid fa-clock w-5 mt-0.5 text-center"></i> <span>Ordered: ${App.formatDateTime(o.order_date)}</span>
                        </div>
                        ${o.scheduled_date ? `
                            <div class="flex items-start text-xs text-blue-600 font-bold leading-snug mt-1">
                                <i class="fa-solid fa-calendar w-5 mt-0.5 text-center"></i> <span>Sched: ${App.formatDateTime(o.scheduled_date)}</span>
                            </div>
                        ` : ''}
                    </div>

                    ${!isHistory ? `
                        <div class="mt-2">
                            ${o.order_status === 'Pending' ? `
                                <div>
                                    <button type="button" onclick="App.updateOrderStatus(${targetOrderId}, 'Preparing')" class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2">
                                        <i class="fa-solid fa-circle-check text-sm"></i>
                                        <span>Accept Order</span>
                                    </button>
                                </div>
                            ` : `
                                <label class="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Update Status</label>
                                <div class="relative">
                                    <select onchange="App.updateOrderStatus(${targetOrderId}, this.value)" class="w-full appearance-none bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-xl pl-4 pr-10 py-3 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition active:bg-slate-50">
                                        <option value="Preparing" ${o.order_status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                                        <option value="To Deliver" ${o.order_status === 'To Deliver' ? 'selected' : ''}>Out for Delivery</option>
                                        <option value="Delivered" ${o.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                                        <option value="Cancelled" ${o.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                    </select>
                                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                        <i class="fa-solid fa-chevron-down text-xs"></i>
                                    </div>
                                </div>
                            `}
                        </div>
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';

        if (State.adminOrderTab !== 'history') {
            const hasSelected = State.selectedOrders && State.selectedOrders.size > 0;
            html += `
            <div id="bulk-action-bar" class="${hasSelected ? 'bulk-visible' : 'bulk-hidden'} bg-white p-3 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 z-50 flex justify-between items-center">
                <div class="flex items-center gap-3 pl-2">
                    <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-inner"><span id="bulk-count">${State.selectedOrders ? State.selectedOrders.size : 0}</span></div>
                    <span class="text-xs font-black text-slate-400 uppercase tracking-widest hidden sm:block">Selected</span>
                </div>
                <div class="flex gap-2">
                    <select id="bulk-status" class="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
                        <option value="Preparing">Preparing</option>
                        <option value="To Deliver">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                    </select>
                    <button onclick="App.applyBulkStatus()" class="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 shrink-0">Apply</button>
                </div>
            </div>
            `;
        }

        container.innerHTML = html;
    },

    _setupAdminPolling() {
        if(State.pollingInterval) clearInterval(State.pollingInterval);
        
        if (!State.knownAdminOrderIds) State.knownAdminOrderIds = new Set();
        if (State.adminData?.orders && Array.isArray(State.adminData.orders)) {
            State.adminData.orders.forEach(o => State.knownAdminOrderIds.add(String(o.order_id)));
            State.adminPollingInitialized = true;
            State.adminSessionStartTime = State.adminSessionStartTime || Date.now();
        }
        State.lastDataHash = JSON.stringify((State.adminData?.orders || []).map(o => o.order_id + o.order_status));
        
        State.pollingInterval = setInterval(async () => {
            try {
                const newData = await API.request('get_admin_dashboard_data', 'GET', null, true);
                if (!newData || !newData.orders || !Array.isArray(newData.orders)) return;
                const newOrders = newData.orders;
                
                if (!State.adminPollingInitialized || State.knownAdminOrderIds.size === 0) {
                    newOrders.forEach(o => State.knownAdminOrderIds.add(String(o.order_id)));
                    State.adminPollingInitialized = true;
                    State.adminSessionStartTime = Date.now();
                    State.adminData = newData;
                    State.lastDataHash = JSON.stringify(newOrders.map(o => o.order_id + o.order_status));
                    return;
                }

                const newlyPlacedOrders = [];
                newOrders.forEach(newOrder => {
                    const orderKey = String(newOrder.order_id);
                    if (!State.knownAdminOrderIds.has(orderKey)) {
                        State.knownAdminOrderIds.add(orderKey);
                        if (newOrder.order_status === 'Pending') {
                            const orderTime = newOrder.order_date ? new Date(newOrder.order_date.replace(/-/g, '/')).getTime() : Date.now();
                            const sessionStart = State.adminSessionStartTime || 0;
                            if (orderTime >= (sessionStart - 30000)) {
                                newlyPlacedOrders.push(newOrder);
                            }
                        }
                    }
                });

                if (newlyPlacedOrders.length > 0) {
                    const seenGroupKeys = new Set();
                    newlyPlacedOrders.forEach(firstNew => {
                        const gKey = firstNew.station_order_number ? `${firstNew.customer_id}-${firstNew.station_order_number}` : `solo-${firstNew.order_id}`;
                        if (!seenGroupKeys.has(gKey)) {
                            const orderNum = firstNew.station_order_number || firstNew.order_id;
                            const notifyMsg = `New Order #${orderNum} received from ${firstNew.full_name}!`;
                            if (!State.pushSubscriptionSynced) {
                                App.sendNativeNotification('New Order', notifyMsg, 'order-' + orderNum);
                            }
                        }
                    });
                }

                const newHash = JSON.stringify(newOrders.map(o => o.order_id + o.order_status));
                if(State.lastDataHash !== newHash) {
                    State.adminData = newData;
                    State.lastDataHash = newHash;
                    this._prefetchCache['admin_dashboard_data'] = { loading: false, data: newData, ts: Date.now() };
                    
                    this._updateAdminOrdersList();
                    const inventory = newData.inventory || { round_jugs: 0, slim_jugs: 0, stock_level: 0 };
                    const totalStock = parseInt(inventory.round_jugs) + parseInt(inventory.slim_jugs);
                    const stockEl = document.getElementById('admin-total-stock');
                    if (stockEl) stockEl.innerText = totalStock;
                }
            } catch(e) {}
        }, 8000);
    },

    async renderAdminInventory() {
        if (!State.adminData) {
            const cached = localStorage.getItem('cache_get_admin_dashboard_data');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    State.adminData = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }
        if (State.adminData) {
            this._renderAdminInventoryPage(State.adminData);
        } else {
            this._renderAdminInventoryPage(null);
        }
        try {
            const data = await this.prefetch('admin_dashboard_data', 'get_admin_dashboard_data');
            if (!data) throw new Error("Failed to load data");

            State.adminData = data;
            if (this._currentView === 'admin_inventory') this._renderAdminInventoryPage(data);
        } catch(e) {
            if (showSkeleton && this._currentView === 'admin_inventory') {
                this.html('<div class="max-w-3xl mx-auto w-full p-6">' + this.emptyState('fa-triangle-exclamation', 'Network Error', 'Failed to load inventory. Please try again.') + '</div>');
            }
        }
    },

    _renderAdminInventoryPage(data) {
        let html = '';
        const showSkeleton = !data;
        const inventory = data?.inventory || { round_jugs: 0, slim_jugs: 0, stock_level: 0 };
        const ledger = data?.borrow_ledger || [];

        html += `
            <style>
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 16px; }
            </style>
            <div class="flex items-center justify-between mb-6">
                <button onclick="UI.goBack('admin_dashboard')" class="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center transition"><i class="fa-solid fa-arrow-left mr-2"></i> Dashboard</button>
                <h2 class="text-2xl font-black text-slate-800">Inventory & Ledger</h2>
            </div>
        `;

        if (showSkeleton) {
            html += `
                <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 mb-8">
                    <div class="skeleton h-6 w-1/2 mb-4"></div>
                    <div class="skeleton h-4 w-3/4 mb-4"></div>
                    <div class="flex gap-4 mb-2"><div class="skeleton h-12 w-full"></div><div class="skeleton h-12 w-full"></div></div>
                    <div class="skeleton h-12 w-full mt-2"></div>
                </div>
                <div class="skeleton h-5 w-40 mb-3 mt-6"></div>
                <div class="space-y-3">
                    <div class="skeleton h-20 w-full rounded-2xl"></div>
                    <div class="skeleton h-20 w-full rounded-2xl"></div>
                </div>
            `;
            this.html('<div class="max-w-4xl mx-auto w-full">' + html + '</div>');
            return;
        }

        html += `
            <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 mb-8">
                <h3 class="font-bold text-slate-800 mb-4 flex items-center"><i class="fa-solid fa-boxes-stacked text-emerald-500 mr-2"></i> Physical Stock Adjustment</h3>
                <p class="text-xs text-slate-500 mb-4">Update physical jug count. Total water stock is calculated automatically.</p>
                <form onsubmit="App.updateInventory(event)" class="space-y-4">
                    <div class="flex gap-4">
                        <div class="flex-1">
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Round Jugs</label>
                            <input type="number" id="inv-round" required value="${inventory.round_jugs}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center">
                        </div>
                        <div class="flex-1">
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Slim Jugs</label>
                            <input type="number" id="inv-slim" required value="${inventory.slim_jugs}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition flex justify-center items-center mt-2">Save Inventory</button>
                </form>
            </div>

            <h3 class="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider flex items-center"><i class="fa-solid fa-book text-amber-600 mr-2"></i> Borrowed Jugs Ledger</h3>
            <div class="space-y-3">
        `;

        if(ledger.length === 0) {
            html += this.emptyState('fa-book', 'Ledger is Empty', 'There are currently no outstanding borrowed jugs.');
        } else {
            ledger.forEach(b => {
                html += `
                    <div class="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex justify-between items-center text-left shadow-sm">
                        <div class="min-w-0 flex-1 pr-2">
                            <p class="text-sm font-bold text-slate-800 truncate">${escapeHtml(b.full_name)} <a href="tel:${escapeHtml(b.contact_number)}" class="text-blue-500 ml-2"><i class="fa-solid fa-phone"></i></a></p>
                            <p class="text-[10px] text-slate-500 truncate mt-0.5 uppercase tracking-wider">${App.formatDateTime(b.order_date)} • Order #${b.station_order_number}</p>
                            <p class="text-sm font-black text-amber-700 mt-1.5 truncate">Owes: ${b.borrow_round > 0 ? b.borrow_round + ' Round ' : ''}${b.borrow_slim > 0 ? b.borrow_slim + ' Slim' : ''}</p>
                        </div>
                        <button onclick="App.markJugsReturned(${b.order_id}, ${b.borrow_round}, ${b.borrow_slim})" class="bg-amber-400 hover:bg-amber-500 text-amber-900 px-4 py-3 rounded-xl font-bold text-xs transition shadow-md shrink-0 active:scale-95">Returned</button>
                    </div>
                `;
            });
        }

        html += `</div>`;
        this.html('<div class="max-w-4xl mx-auto w-full">' + html + '</div>');

        if(State.pollingInterval) clearInterval(State.pollingInterval);
        State.lastDataHash = JSON.stringify(inventory.round_jugs + '_' + inventory.slim_jugs + '_' + ledger.map(l => l.order_id).join(','));
        
        State.pollingInterval = setInterval(async () => {
            if(true) {
                try {
                    const newData = await API.request('get_admin_dashboard_data', 'GET', null, true);
                    const newInventory = newData.inventory || { round_jugs: 0, slim_jugs: 0, stock_level: 0 };
                    const newLedger = newData.borrow_ledger || [];
                    const newHash = JSON.stringify(newInventory.round_jugs + '_' + newInventory.slim_jugs + '_' + newLedger.map(l => l.order_id).join(','));
                    if(newHash !== State.lastDataHash) {
                        State.adminData = newData;
                        this._renderAdminInventoryPage(newData);
                    }
                } catch(e){}
            }
        }, 30000);
    },

    onSalesTabChange(tab) {
        State.salesTab = tab;
        if (tab === 'Custom') {
            this.renderAdminSalesReport('', '');
        } else {
            this.renderAdminSalesReport();
        }
    },

    generateCustomSalesReport() {
        const start = document.getElementById('rep-start')?.value || '';
        const end = document.getElementById('rep-end')?.value || '';
        if (!start || !end) {
            App.showToast('Please select both start and end dates.', 'warning');
            return;
        }
        if (new Date(start) > new Date(end)) {
            App.showToast('Start date cannot be after end date.', 'warning');
            return;
        }
        this.renderAdminSalesReport(start, end);
    },

    async renderAdminSalesReport(customStart, customEnd) {
        if (State.salesTab === 'Custom') {
            const start = customStart !== undefined ? customStart : (document.getElementById('rep-start')?.value || '');
            const end = customEnd !== undefined ? customEnd : (document.getElementById('rep-end')?.value || '');
            
            if (!start || !end) {
                // Empty state for Custom tab initially
                const cached = State.salesData || (localStorage.getItem('cache_get_sales_report') ? JSON.parse(localStorage.getItem('cache_get_sales_report')) : null);
                const baseData = (cached && cached.data !== undefined) ? cached.data : cached;
                this._renderAdminSalesReportPage(baseData || {}, '', '');
                
                // If date_bounds not loaded yet, fetch in background silently
                if (!baseData || !baseData.date_bounds) {
                    try {
                        const data = await API.request('get_sales_report', 'GET', null, true);
                        State.salesData = data;
                        if (this._currentView === 'admin_sales_report' && State.salesTab === 'Custom') {
                            const curStart = document.getElementById('rep-start')?.value || '';
                            const curEnd = document.getElementById('rep-end')?.value || '';
                            if (!curStart || !curEnd) {
                                this._renderAdminSalesReportPage(data, '', '');
                            }
                        }
                    } catch(e) {}
                }
                return;
            }
            
            if (new Date(start) > new Date(end)) {
                App.showToast('Start date cannot be after end date.', 'warning');
                return;
            }
            
            this._renderAdminSalesReportPage(null, start, end);
            try {
                const data = await API.request(`get_sales_report&start=${start}&end=${end}`, 'GET', null, true);
                State.customSalesData = data;
                if (this._currentView === 'admin_sales_report' && State.salesTab === 'Custom') {
                    this._renderAdminSalesReportPage(data, start, end);
                }
            } catch (e) {
                console.error(e);
                App.showToast('Failed to load custom sales report.', 'error');
            }
            return;
        }

        const start = '';
        const end = '';
        if (!State.salesData) {
            const cached = localStorage.getItem('cache_get_sales_report');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    State.salesData = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }
        
        if (State.salesData) {
            this._renderAdminSalesReportPage(State.salesData, start, end);
        } else {
            this._renderAdminSalesReportPage(null, start, end);
        }
        
        try {
            const data = await API.request('get_sales_report', 'GET', null, true);
            this._prefetchCache['sales_report'] = { loading: false, data, ts: Date.now() };
            State.salesData = data;
            if (this._currentView === 'admin_sales_report' && State.salesTab !== 'Custom') {
                this._renderAdminSalesReportPage(data, start, end);
            }
        } catch (e) { console.error(e); }
    },

    _renderAdminSalesReportPage(data, start, end) {
        let html = `
            <style>
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 16px; }
            </style>
        `;
        const isCustom = State.salesTab === 'Custom';
        const isCustomEmpty = isCustom && (!start || !end);
        const showSkeleton = !data && !isCustomEmpty;
        const orders = data?.orders || [];
        
        let revTotal = 0;
        const productTally = {};
        
        const now = new Date();
        let displayOrders = isCustomEmpty ? [] : orders;
        
        let dateSub = '';
        
        const todayStr = new Date().toISOString().split('T')[0];
        const minDate = data?.date_bounds?.min || State.salesData?.date_bounds?.min || todayStr;
        const maxDate = data?.date_bounds?.max || State.salesData?.date_bounds?.max || todayStr;
        
        if (!start && !end) {
            if (State.salesTab === 'Daily') {
                dateSub = App.formatDate(now);
            } else if (State.salesTab === 'Weekly') {
                const dayOfWeek = now.getDay() || 7;
                const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
                const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7);
                dateSub = `${App.formatDate(startOfWeek)} - ${App.formatDate(endOfWeek)}`;
            } else if (State.salesTab === 'Monthly') {
                dateSub = now.toLocaleDateString('default', { month: 'long', year: 'numeric' });
            } else if (State.salesTab === 'Custom') {
                dateSub = 'Select date range';
            }
            
            if (State.salesTab !== 'Custom') {
                displayOrders = orders.filter(o => {
                    const d = new Date(o.order_date);
                    if (State.salesTab === 'Daily') return d.toDateString() === now.toDateString();
                    if (State.salesTab === 'Weekly') {
                        const dayOfWeek = now.getDay() || 7;
                        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
                        const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7);
                        const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                        return dTime >= startOfWeek.getTime() && dTime <= endOfWeek.getTime();
                    }
                    if (State.salesTab === 'Monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    return false;
                });
            }
        } else {
            dateSub = `${App.formatDate(start)} to ${App.formatDate(end)}`;
        }

        const customerMap = new Map();
        displayOrders.forEach(o => {
            revTotal += parseFloat(o.total_price);
            if(!productTally[o.product_name]) productTally[o.product_name] = { qty: 0, revenue: 0, price: o.product_price };
            productTally[o.product_name].qty += parseInt(o.quantity);
            productTally[o.product_name].revenue += parseFloat(o.total_price);

            const cid = o.customer_id ? `cid_${o.customer_id}` : (o.full_name || 'Anonymous');
            if (!customerMap.has(cid)) {
                customerMap.set(cid, {
                    customer_id: o.customer_id,
                    full_name: o.full_name || 'Customer',
                    contact_number: o.contact_number || '',
                    total_spent: 0,
                    total_qty: 0,
                    order_count: 0,
                    points: o.user_points || 0,
                    lifetime_points: o.user_lifetime_points || o.user_points || 0
                });
            }
            const c = customerMap.get(cid);
            c.total_spent += parseFloat(o.total_price || 0);
            c.total_qty += parseInt(o.quantity || 0);
            c.order_count += 1;
        });

        const topCustomers = Array.from(customerMap.values()).sort((a, b) => b.total_spent - a.total_spent);
        const displayTopCustomers = State.showAllTopCustomers ? topCustomers : topCustomers.slice(0, 10);

        html += `
            <div class="flex items-center justify-between mb-6">
                <button onclick="UI.goBack('admin_dashboard')" class="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center transition"><i class="fa-solid fa-arrow-left mr-2"></i> Dashboard</button>
                <div class="text-right">
                    <h2 class="text-2xl font-black text-slate-800">Sales Report</h2>
                    <p class="text-xs font-bold text-slate-500">${dateSub}</p>
                </div>
            </div>
            
            <div class="flex bg-slate-200 p-1 rounded-xl mb-4 overflow-x-auto hide-scrollbar shadow-inner">
                ${['Daily', 'Weekly', 'Monthly', 'Custom'].map(tab => `
                    <button onclick="UI.onSalesTabChange('${tab}')" class="flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition ${State.salesTab === tab ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}">${tab}</button>
                `).join('')}
            </div>
            
            ${State.salesTab === 'Custom' ? `
                <div class="bg-white p-4 rounded-2xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all mb-6">
                    <div class="flex flex-col sm:flex-row gap-3">
                        <div class="flex-1">
                            <label class="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                            <input type="text" id="rep-start" value="${start || ''}" placeholder="Select start date" class="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer">
                        </div>
                        <div class="flex-1">
                            <label class="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                            <input type="text" id="rep-end" value="${end || ''}" placeholder="Select end date" class="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer">
                        </div>
                        <button onclick="UI.generateCustomSalesReport()" class="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-5 rounded-lg self-end h-[38px] text-sm transition shrink-0 flex items-center gap-1.5 shadow-sm">
                            <i class="fa-solid fa-bolt text-xs"></i> Generate
                        </button>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5"><i class="fa-solid fa-calendar-check text-blue-500"></i> Available order history: <strong>${App.formatDate(minDate)}</strong> to <strong>${App.formatDate(maxDate)}</strong></p>
                </div>
            ` : ''}
        `;

        if (showSkeleton) {
            html += `
                <div class="bg-blue-50 border border-blue-100 rounded-3xl p-6 shadow-sm mb-6 flex flex-col items-center justify-center">
                    <div class="skeleton h-3 w-32 mb-2"></div>
                    <div class="skeleton h-10 w-48 rounded-lg"></div>
                </div>
                <div class="skeleton h-5 w-32 mb-3"></div>
                <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 p-5 mb-6 space-y-3">
                    <div class="skeleton h-14 w-full rounded-xl"></div>
                    <div class="skeleton h-14 w-full rounded-xl"></div>
                </div>
            `;
            this.html('<div class="max-w-4xl mx-auto w-full">' + html + '</div>');
            return;
        }

        if (isCustomEmpty) {
            html += `
                <div class="mt-2">
                    ${this.emptyState('fa-calendar-days', 'No Date Range Selected', 'Select a start and end date above, then tap Generate to view your custom sales report.')}
                </div>
            `;
        } else {
            html += `
                <div class="bg-blue-50 border border-blue-100 rounded-3xl p-6 text-blue-900 shadow-sm mb-6 text-center">
                    <p class="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Generated Revenue</p>
                    <p class="text-4xl font-black">₱${revTotal.toFixed(2)}</p>
                </div>

                <h3 class="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Items Sold</h3>
            `;

            if(Object.keys(productTally).length === 0) {
                html += this.emptyState('fa-chart-pie', 'No Sales Data', 'There is no sales data to report for this selected period.');
            } else {
                html += `<div class="space-y-3 mb-6">`;
                for (const [productName, stats] of Object.entries(productTally)) {
                    html += `
                        <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 p-4 sm:p-5 flex justify-between items-center transition-all">
                            <div class="flex items-center gap-3.5 min-w-0">
                                <div class="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-inner shrink-0"><i class="fa-solid fa-bottle-water"></i></div>
                                <div class="min-w-0">
                                    <span class="block font-black text-slate-800 text-sm sm:text-base leading-tight truncate">${escapeHtml(productName)}</span>
                                    <span class="block text-xs font-bold text-slate-400 mt-0.5">₱${parseFloat(stats.price || 0).toFixed(2)} / item</span>
                                </div>
                            </div>
                            <div class="text-right shrink-0 pl-3">
                                <span class="block font-black text-slate-900 text-base sm:text-lg">${stats.qty}x</span>
                                <span class="block text-xs sm:text-sm font-black text-blue-600">₱${stats.revenue.toFixed(2)}</span>
                            </div>
                        </div>
                    `;
                }
                html += `</div>`;
            }

            html += `
                <div class="flex justify-between items-center mb-3 mt-8">
                    <h3 class="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                        <i class="fa-solid fa-trophy text-amber-500"></i> Top Customers
                    </h3>
                    <span class="text-xs font-bold text-slate-500">${topCustomers.length} Total</span>
                </div>
            `;

            if(topCustomers.length === 0) {
                html += this.emptyState('fa-users-slash', 'No Customers', 'No customer purchase data found for this period.');
            } else {
                html += `<div class="space-y-3 mb-6">`;
                displayTopCustomers.forEach((cust, idx) => {
                    const rankNum = idx + 1;
                    const loyaltyRank = App.getLoyaltyRank(cust.lifetime_points || cust.points);
                    let rankBadge = `<span class="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">#${rankNum}</span>`;
                    if (rankNum === 1) rankBadge = `<span class="w-8 h-8 rounded-full bg-amber-400 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm"><i class="fa-solid fa-crown text-xs"></i></span>`;
                    else if (rankNum === 2) rankBadge = `<span class="w-8 h-8 rounded-full bg-slate-400 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm"><i class="fa-solid fa-medal text-xs"></i></span>`;
                    else if (rankNum === 3) rankBadge = `<span class="w-8 h-8 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm"><i class="fa-solid fa-award text-xs"></i></span>`;

                    html += `
                        <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 p-4 sm:p-5 flex items-center justify-between transition-all">
                            <div class="flex items-center gap-3.5 min-w-0">
                                ${rankBadge}
                                <div class="min-w-0">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="font-black text-slate-800 text-sm sm:text-base leading-tight truncate">${escapeHtml(cust.full_name)}</span>
                                        <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${loyaltyRank.badgeBg}">
                                            ${loyaltyRank.name}
                                        </span>
                                    </div>
                                    <p class="text-xs text-slate-500 font-medium mt-1">
                                        <span>${cust.total_qty} jugs</span> • <span>${cust.order_count} orders</span>
                                        ${cust.contact_number ? `<span class="text-slate-400 ml-1.5">• ${escapeHtml(cust.contact_number)}</span>` : ''}
                                    </p>
                                </div>
                            </div>
                            <div class="text-right shrink-0 pl-3">
                                <span class="block font-black text-blue-600 text-sm sm:text-base">₱${cust.total_spent.toFixed(2)}</span>
                            </div>
                        </div>
                    `;
                });

                if (topCustomers.length > 10) {
                    html += `
                        <div class="pt-2 text-center">
                            <button onclick="State.showAllTopCustomers = !State.showAllTopCustomers; UI._renderAdminSalesReportPage(State.salesTab === 'Custom' ? (State.customSalesData || State.salesData) : State.salesData, '${start}', '${end}')" class="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-200/80 shadow-xs hover:bg-blue-50 px-4 py-2.5 rounded-xl transition inline-flex items-center gap-1.5 active:scale-95">
                                ${State.showAllTopCustomers ? '<i class="fa-solid fa-chevron-up"></i> Show Top 10 Only' : `<i class="fa-solid fa-chevron-down"></i> See More (${topCustomers.length - 10} more customers)`}
                            </button>
                        </div>
                    `;
                }

                html += `</div>`;
            }
        }

        this.html('<div class="max-w-4xl mx-auto w-full">' + html + '</div>');

        if (State.salesTab === 'Custom' && document.getElementById('rep-start') && typeof flatpickr !== 'undefined') {
            flatpickr('#rep-start', {
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'm/d/y',
                defaultDate: start || null,
                minDate: minDate,
                maxDate: end || maxDate,
                placeholder: 'Select start date',
                onChange: function(selectedDates, dateStr) {
                    const endPicker = document.getElementById('rep-end')?._flatpickr;
                    if (endPicker) endPicker.set('minDate', dateStr);
                }
            });
            flatpickr('#rep-end', {
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'm/d/y',
                defaultDate: end || null,
                minDate: start || minDate,
                maxDate: maxDate,
                placeholder: 'Select end date',
                onChange: function(selectedDates, dateStr) {
                    const startPicker = document.getElementById('rep-start')?._flatpickr;
                    if (startPicker) startPicker.set('maxDate', dateStr);
                }
            });
        }
    },

    async renderAdminLoyalty() {
        if (!State.adminLoyaltyData) {
            const cached = localStorage.getItem('cache_get_admin_loyalty');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    State.adminLoyaltyData = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }
        if (State.adminLoyaltyData) {
            this._renderAdminLoyaltyPage(State.adminLoyaltyData);
        } else {
            this._renderAdminLoyaltyPage(null);
        }
        try {
            const data = await API.request('get_admin_loyalty', 'GET', null, true);
            State.adminLoyaltyData = data;
            if (this._currentView === 'admin_loyalty') {
                this._renderAdminLoyaltyPage(data);
            }
        } catch (e) {
            console.error(e);
            if (this._currentView === 'admin_loyalty') {
                this.html('<div class="max-w-4xl mx-auto w-full p-6">' + this.emptyState('fa-triangle-exclamation', 'Failed to Load', 'Could not load customer loyalty data.') + '</div>');
            }
        }
    },

    _renderAdminLoyaltyPage(data) {
        const showSkeleton = !data;
        const summary = data?.summary || {
            total_members: 0,
            total_points_balance: 0,
            total_points_redeemed: 0,
            tiers: { Diamond: 0, Platinum: 0, Gold: 0, Silver: 0, Bronze: 0, Normal: 0 }
        };
        const customers = data?.customers || [];

        const searchInput = document.getElementById('loyalty-search');
        const searchQuery = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const filterTier = State.loyaltyFilter || 'All';

        let html = `
            <style>
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 16px; }
            </style>
            <div class="flex items-center justify-between mb-6">
                <button onclick="UI.goBack('admin_dashboard')" class="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center transition"><i class="fa-solid fa-arrow-left mr-2"></i> Dashboard</button>
                <div class="text-right">
                    <h2 class="text-2xl font-black text-slate-800">Customer Loyalty</h2>
                    <p class="text-xs font-bold text-slate-500">Rewards & VIP Tiers</p>
                </div>
            </div>

            <!-- Summary KPIs -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div class="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-md relative overflow-hidden">
                    <p class="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Total Members</p>
                    <p class="text-2xl font-black">${showSkeleton ? '<span class="skeleton inline-block h-6 w-12 bg-blue-400"></span>' : summary.total_members}</p>
                    <i class="fa-solid fa-users absolute -right-2 -bottom-2 text-5xl text-white opacity-10"></i>
                </div>
                <div class="bg-gradient-to-br from-cyan-500 to-blue-600 text-white p-4 rounded-2xl shadow-md relative overflow-hidden">
                    <p class="text-[10px] font-bold text-cyan-100 uppercase tracking-wider mb-1">Points in Hand</p>
                    <p class="text-2xl font-black">${showSkeleton ? '<span class="skeleton inline-block h-6 w-12 bg-cyan-400"></span>' : summary.total_points_balance.toLocaleString()} <span class="text-xs font-medium">pts</span></p>
                    <i class="fa-solid fa-gift absolute -right-2 -bottom-2 text-5xl text-white opacity-10"></i>
                </div>
                <div class="bg-gradient-to-br from-amber-500 to-yellow-600 text-white p-4 rounded-2xl shadow-md relative overflow-hidden">
                    <p class="text-[10px] font-bold text-amber-100 uppercase tracking-wider mb-1">Points Redeemed</p>
                    <p class="text-2xl font-black">${showSkeleton ? '<span class="skeleton inline-block h-6 w-12 bg-amber-400"></span>' : (summary.total_points_redeemed || 0).toLocaleString()} <span class="text-xs font-medium">pts</span></p>
                    <i class="fa-solid fa-rotate-left absolute -right-2 -bottom-2 text-5xl text-white opacity-10"></i>
                </div>
                <div class="bg-gradient-to-br from-slate-700 to-slate-900 text-white p-4 rounded-2xl shadow-md relative overflow-hidden">
                    <p class="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">VIP (Dia + Plat)</p>
                    <p class="text-2xl font-black">${showSkeleton ? '<span class="skeleton inline-block h-6 w-12 bg-slate-500"></span>' : (summary.tiers.Diamond + summary.tiers.Platinum)}</p>
                    <i class="fa-solid fa-crown absolute -right-2 -bottom-2 text-5xl text-white opacity-10"></i>
                </div>
            </div>

            <!-- Tier counter select -->
            <div class="mb-6 relative">
                <select onchange="State.loyaltyFilter=this.value; UI._filterAdminLoyalty()" class="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer shadow-sm">
                    ${['All', 'Normal', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].map(t => {
                        const count = t === 'All' ? summary.total_members : (summary.tiers[t] || 0);
                        return `<option value="${t}" ${filterTier === t ? 'selected' : ''}>${t} (${count})</option>`;
                    }).join('')}
                </select>
                <i class="fa-solid fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
            </div>

            <!-- Search Bar -->
            <div class="mb-4">
                <div class="relative">
                    <input type="text" id="loyalty-search" value="${searchQuery}" oninput="UI._filterAdminLoyalty()" placeholder="Search customers by name or phone..." class="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm">
                    <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-slate-400"></i>
                </div>
            </div>

            <!-- Customer List -->
            <div id="loyalty-customer-list" class="space-y-3">
                ${showSkeleton ? `
                    <div class="bg-white rounded-2xl p-4 shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 flex justify-between items-center">
                        <div class="flex-1"><div class="skeleton h-4 w-36 mb-2"></div><div class="skeleton h-3 w-24"></div></div>
                        <div class="skeleton h-6 w-20 rounded-md"></div>
                    </div>
                    <div class="bg-white rounded-2xl p-4 shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 flex justify-between items-center">
                        <div class="flex-1"><div class="skeleton h-4 w-36 mb-2"></div><div class="skeleton h-3 w-24"></div></div>
                        <div class="skeleton h-6 w-20 rounded-md"></div>
                    </div>
                ` : this._renderLoyaltyCustomerListHtml(customers, filterTier, searchQuery)}
            </div>
        `;

        this.html('<div class="max-w-4xl mx-auto w-full">' + html + '</div>');
    },

    _renderLoyaltyCustomerListHtml(customers, filterTier, searchQuery) {
        let filtered = (customers || []).filter(c => {
            if (filterTier && filterTier !== 'All' && c.rank !== filterTier) return false;
            if (searchQuery) {
                const name = (c.full_name || '').toLowerCase();
                const phone = (c.contact_number || '').toLowerCase();
                return name.includes(searchQuery) || phone.includes(searchQuery);
            }
            return true;
        });

        if (filtered.length === 0) {
            return this.emptyState('fa-user-slash', 'No Customers Found', 'No customers match the selected rank filter or search query.');
        }

        return filtered.map(cust => {
            const rank = App.getLoyaltyRank(cust.lifetime_points || cust.points);
            return `
                <div class="bg-white rounded-3xl p-5 shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 hover:border-blue-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="flex items-start gap-3 min-w-0">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${rank.color} text-white flex items-center justify-center text-lg shadow-sm shrink-0">
                            <i class="fa-solid ${rank.icon}"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <h4 class="font-black text-slate-800 text-base leading-snug truncate">${escapeHtml(cust.full_name)}</h4>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${rank.badgeBg}">
                                    <i class="fa-solid ${rank.icon} mr-1"></i>${rank.name}
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 font-medium mt-0.5"><i class="fa-solid fa-phone mr-1 text-slate-400"></i>${escapeHtml(cust.contact_number)}</p>
                            <div class="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <span><strong class="text-slate-700">${cust.total_orders}</strong> orders</span>
                                <span><strong class="text-slate-700">${cust.total_containers}</strong> jugs</span>
                                <span>Total spent: <strong class="text-blue-600">₱${parseFloat(cust.total_spent || 0).toFixed(2)}</strong></span>
                            </div>
                        </div>
                    </div>
                    <div class="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-0 pt-3 sm:pt-0 border-slate-100 shrink-0">
                        <div class="text-left sm:text-right">
                            <span class="text-2xl font-black text-slate-800">${cust.points}</span>
                            <span class="text-xs font-bold text-slate-400 block sm:inline">pts</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    _filterAdminLoyalty() {
        const listEl = document.getElementById('loyalty-customer-list');
        const searchInput = document.getElementById('loyalty-search');
        if (!listEl || !State.adminLoyaltyData) return;
        
        const searchQuery = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const filterTier = State.loyaltyFilter || 'All';
        const customers = State.adminLoyaltyData.customers || [];
        
        listEl.innerHTML = this._renderLoyaltyCustomerListHtml(customers, filterTier, searchQuery);
    },

    async renderAdminProducts() {
        if (!State.adminData) {
            const cached = localStorage.getItem('cache_get_admin_dashboard_data');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    State.adminData = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }
        if (State.adminData) {
            this._renderAdminProductsPage(State.adminData);
        } else {
            this._renderAdminProductsPage(null);
        }
        try {
            const data = await API.request('get_admin_dashboard_data', 'GET', null, true);
            State.adminData = data;
            if (this._currentView === 'admin_products') this._renderAdminProductsPage(data);
        } catch (e) { console.error(e); }
    },

    _renderAdminProductsPage(data) {
        let html = `
            <style>
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 16px; }
            </style>
            <div class="flex items-center justify-between mb-6">
                <button onclick="UI.goBack('admin_dashboard')" class="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center transition"><i class="fa-solid fa-arrow-left mr-2"></i> Dashboard</button>
                <h2 class="text-2xl font-black text-slate-800">Catalog</h2>
            </div>
            
            <button onclick="App.promptAddProduct()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-md transition-all active:scale-95 mb-6 flex items-center justify-center gap-2">
                <i class="fa-solid fa-plus"></i> Add New Product
            </button>
        `;
        
        const showSkeleton = !data;
        const products = data?.products || [];

        if (showSkeleton) {
            html += `
                <div class="space-y-3">
                    <div class="skeleton h-24 w-full rounded-3xl"></div>
                    <div class="skeleton h-24 w-full rounded-3xl"></div>
                    <div class="skeleton h-24 w-full rounded-3xl"></div>
                </div>
            `;
            this.html('<div class="max-w-4xl mx-auto w-full">' + html + '</div>');
            return;
        }

        html += `<div class="space-y-3">`;
        
        if (products.length === 0) {
            html += this.emptyState('fa-boxes-stacked', 'Catalog is Empty', 'Start adding products to your catalog so customers can order from you.');
        } else {
            products.forEach(p => {
                const capGal = parseFloat(p.capacity_gallons || 5.0);
                const capLit = parseFloat(p.capacity_liters || (capGal === 5.0 ? 20.0 : Math.round(capGal * 3.785)));
                html += `
                    <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-5 flex justify-between items-center gap-3">
                        <div class="min-w-0 flex-1 pr-2">
                            <h4 class="font-black text-slate-800 text-lg leading-tight truncate">${escapeHtml(p.name)}</h4>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-blue-600 font-black text-sm">₱${parseFloat(p.price).toFixed(2)}</span>
                                <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">${capGal} Gal (${capLit}L)</span>
                            </div>
                        </div>
                        <div class="flex gap-2 shrink-0">
                            <button data-pid="${p.product_id}" data-price="${p.price}" data-name="${escapeHtml(p.name)}" data-gal="${capGal}" onclick="App.promptEditProduct(this.dataset.pid, this.dataset.price, this.dataset.name, this.dataset.gal)" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition" title="Edit Item">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button onclick="App.deleteProduct(${p.product_id})" class="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition" title="Delete Item">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        html += `</div>`;
        this.html('<div class="max-w-4xl mx-auto w-full">' + html + '</div>');
    },

    async renderAdminSettings() {
        if (!State.adminData) {
            const cached = localStorage.getItem('cache_get_admin_dashboard_data');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    State.adminData = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }
        if (State.adminData) {
            this._renderAdminSettingsPage(State.adminData);
        } else {
            this._renderAdminSettingsPage(null);
        }
        try {
            const data = await API.request('get_admin_dashboard_data', 'GET', null, true);
            State.adminData = data;
            if (this._currentView === 'admin_settings') this._renderAdminSettingsPage(data);
        } catch (e) { console.error(e); }
    },

    _renderAdminSettingsPage(data) {
        let html = `
            <style>
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 16px; }
            </style>
            <div class="flex items-center justify-between mb-6">
                <button onclick="UI.goBack('admin_dashboard')" class="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center transition"><i class="fa-solid fa-arrow-left mr-2"></i> Dashboard</button>
                <h2 class="text-2xl font-black text-slate-800">Settings</h2>
            </div>

            <div class="flex bg-slate-200 p-1 rounded-xl mb-6 overflow-x-auto hide-scrollbar shadow-inner">
                ${['Logistics', 'Maintenance', 'Payments', 'Security'].map(tab => `
                    <button onclick="State.adminSettingsTab='${tab}'; UI._renderAdminSettingsPage(State.adminData)" class="flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition ${State.adminSettingsTab === tab ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}">${tab}</button>
                `).join('')}
            </div>
        `;
        
        const showSkeleton = !data;
        const station = data?.station || {};
        const staff = data?.staff || [];

        if (showSkeleton) {
            html += `
                <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 mb-6">
                    <div class="skeleton h-6 w-1/3 mb-4"></div>
                    <div class="skeleton h-12 w-full mb-4"></div>
                    <div class="skeleton h-12 w-full mb-4"></div>
                </div>
            `;
            this.html('<div class="max-w-3xl mx-auto w-full">' + html + '</div>');
            return;
        }

        if (State.adminSettingsTab === 'Logistics') {
            html += `
            <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 mb-6">
                <h3 class="font-bold text-slate-800 mb-4 flex items-center"><i class="fa-solid fa-power-off text-red-500 mr-2"></i> Station Status</h3>
                <form onsubmit="App.updateStationClosure(event)" class="space-y-4">
                    <label class="flex items-center cursor-pointer p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                        <div class="relative">
                            <input type="checkbox" id="set_manual_close" class="sr-only" ${station.is_manually_closed == 1 ? 'checked' : ''} onchange="document.getElementById('closure_msg_wrap').classList.toggle('hidden', !this.checked)">
                            <div class="block bg-slate-200 w-14 h-8 rounded-full transition-colors duration-300" id="close_toggle_bg"></div>
                            <div class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 shadow"></div>
                        </div>
                        <div class="ml-4">
                            <span class="block text-sm font-bold text-slate-800">Manually Close Station</span>
                            <span class="block text-xs text-slate-500">Temporarily stop accepting new orders</span>
                        </div>
                    </label>
                    <style>
                        #set_manual_close:checked ~ #close_toggle_bg { background-color: #ef4444; }
                        #set_manual_close:checked ~ .dot { transform: translateX(24px); }
                    </style>
                    <div id="closure_msg_wrap" class="${station.is_manually_closed == 1 ? '' : 'hidden'}">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Closure Message (Optional)</label>
                        <input type="text" id="set_closure_msg" placeholder="e.g. Closed for emergency maintenance" value="${escapeHtml(station.closure_message || '')}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    </div>
                    <button type="submit" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-md transition flex justify-center items-center">Update Status</button>
                </form>
            </div>

            <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 mb-6">
                <h3 class="font-bold text-slate-800 mb-4 flex items-center"><i class="fa-solid fa-clock text-blue-500 mr-2"></i> Operating Hours</h3>
                <form onsubmit="App.updateHours(event)" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Opening</label>
                            <input type="time" id="set_open" required value="${station.opening_time}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Closing</label>
                            <input type="time" id="set_close" required value="${station.closing_time}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition flex justify-center items-center">Save Hours</button>
                </form>
            </div>

            <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 mb-6">
                <h3 class="font-bold text-slate-800 mb-4 flex items-center"><i class="fa-solid fa-truck-fast text-blue-500 mr-2"></i> Fees</h3>
                <form onsubmit="App.updateLogistics(event)" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Standard Delivery Fee (₱)</label>
                        <input type="number" step="0.01" id="set_shipping" required value="${station.shipping_fee || '0.00'}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Price per New Jug (₱)</label>
                        <p class="text-[10px] text-slate-400 mb-2 leading-tight">Additional cost when customers choose to buy containers permanently.</p>
                        <input type="number" step="0.01" id="set_jug_price" required value="${station.new_jug_price || '0.00'}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-600">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition flex justify-center items-center">Save Logistics Config</button>
                </form>
            </div>
            `;
        }

        if (State.adminSettingsTab === 'Maintenance') {
            html += `
            <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 mb-6">
                <h3 class="font-bold text-slate-800 mb-4 flex items-center"><i class="fa-solid fa-screwdriver-wrench text-blue-500 mr-2"></i> Maintenance Logs</h3>
                <form onsubmit="App.updateMaintenance(event)" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Last System Cleaned Date</label>
                        <input type="date" id="set_cleaned" value="${station.last_cleaned_date || ''}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Last Filter Changed Date</label>
                        <input type="date" id="set_filter" value="${station.last_filter_changed_date || ''}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition flex justify-center items-center">Save Logs</button>
                </form>
            </div>
            `;
        }

        if (State.adminSettingsTab === 'Payments') {
            html += `
            <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 mb-6">
                <h3 class="font-bold text-slate-800 mb-4 flex items-center"><i class="fa-solid fa-qrcode text-blue-500 mr-2"></i> Payment Profiles (Cashless)</h3>
                <form onsubmit="App.updatePaymentProfile(event)" class="space-y-5">
                    <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <h4 class="font-bold text-slate-700 text-sm">GCash Settings</h4>
                        <input type="text" id="set_gcash_name" placeholder="GCash Account Name" value="${escapeHtml(station.gcash_name || '')}" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm">
                        <input type="tel" id="set_gcash_num" placeholder="GCash Mobile Number" value="${escapeHtml(station.gcash_number || '')}" maxlength="11" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,11)" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Upload New GCash QR Image</label>
                            <input type="file" id="set_gcash_qr" accept="image/*" class="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-100 file:text-blue-700">
                        </div>
                    </div>
                    <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <h4 class="font-bold text-slate-700 text-sm">Maya Settings</h4>
                        <input type="text" id="set_maya_name" placeholder="Maya Account Name" value="${escapeHtml(station.maya_name || '')}" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm">
                        <input type="tel" id="set_maya_num" placeholder="Maya Mobile Number" value="${escapeHtml(station.maya_number || '')}" maxlength="11" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,11)" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 mb-1">Upload New Maya QR Image</label>
                            <input type="file" id="set_maya_qr" accept="image/*" class="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-100 file:text-blue-700">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-md flex justify-center items-center">Save Profiles</button>
                </form>
            </div>
            `;
        }

        if (State.adminSettingsTab === 'Security') {
            html += `
            <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 mb-6">
                <h3 class="font-bold text-slate-800 mb-4 flex items-center"><i class="fa-solid fa-shield-halved text-blue-500 mr-2"></i> Account Security</h3>
                <form onsubmit="App.updateSecurity(event)" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Admin Username</label>
                        <input type="text" id="sec-user" required value="${escapeHtml(State.user.data.username || '')}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">New Password (leave blank to keep current)</label>
                        <div class="relative">
                            <input type="password" id="sec-pass" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold pr-12">
                            <button type="button" onclick="App.togglePassword('sec-pass', 'sec-pass-icon')" class="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-blue-600 transition">
                                <i class="fa-solid fa-eye" id="sec-pass-icon"></i>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
                        <div class="relative">
                            <input type="password" id="sec-conf" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold pr-12">
                            <button type="button" onclick="App.togglePassword('sec-conf', 'sec-conf-icon')" class="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-blue-600 transition">
                                <i class="fa-solid fa-eye" id="sec-conf-icon"></i>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition flex justify-center items-center">Update Security</button>
                </form>
            </div>

            <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 mb-6">
                <h3 class="font-bold text-slate-800 mb-4 flex items-center"><i class="fa-solid fa-motorcycle text-blue-500 mr-2"></i> Delivery Staff</h3>
                <form onsubmit="App.addStaff(event)" class="space-y-3 mb-6">
                    <input type="text" id="staff_user" required placeholder="Staff Username" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <input type="password" id="staff_pass" required placeholder="Staff Password" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition flex justify-center items-center">Register Staff</button>
                </form>
                <h4 class="font-bold text-slate-800 mb-3 text-sm">Active Staff</h4>
                <div class="space-y-2">
            `;

            if(staff.length === 0) html += `<p class="text-sm text-slate-500">No staff registered.</p>`;
            staff.forEach(s => {
                const isRevoked = s.status === 'Revoked';
                html += `
                    <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span class="font-bold text-slate-700 ${isRevoked ? 'line-through text-slate-400' : ''}">${escapeHtml(s.username)}</span>
                        <button onclick="App.toggleStaffStatus(${s.admin_id}, '${isRevoked ? 'Active' : 'Revoked'}')" class="text-xs font-bold px-3 py-1.5 rounded-lg ${isRevoked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                            ${isRevoked ? 'Activate' : 'Revoke'}
                        </button>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        this.html('<div class="max-w-3xl mx-auto w-full">' + html + '</div>');
    },

    async renderDeliveryDashboard() {
        if (!State.deliveryData) {
            const cached = localStorage.getItem('cache_get_admin_dashboard_data');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    State.deliveryData = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                } catch(e) {}
            }
        }
        const isFirstLoad = !State.deliveryData;
        if (State.deliveryData) {
            this._renderDeliveryDashboardPage(false);
        } else {
            this._renderDeliveryDashboardPage(true);
        }
        try {
            const data = await this.prefetch('delivery_dashboard_data', 'get_admin_dashboard_data');
            if (!data) throw new Error("Failed to load data");

            const oldHash = JSON.stringify((State.deliveryData?.orders || []).map(o => o.order_id + o.order_status));
            const newHash = JSON.stringify((data.orders || []).map(o => o.order_id + o.order_status));
            State.deliveryData = data;
            
            if (!State.knownDeliveryOrderIds) State.knownDeliveryOrderIds = new Set();
            if (data.orders && Array.isArray(data.orders)) {
                data.orders.filter(o => o.order_status === 'To Deliver').forEach(o => State.knownDeliveryOrderIds.add(String(o.order_id)));
                State.deliveryPollingInitialized = true;
                State.deliverySessionStartTime = State.deliverySessionStartTime || Date.now();
            }

            if (isFirstLoad && this._currentView === 'delivery_dashboard') {
                this._renderDeliveryDashboardPage(false);
            } else if (this._currentView === 'delivery_dashboard' && oldHash !== newHash) {
                this._updateDeliveryList();
                const countBadge = document.getElementById('delivery-count-badge');
                if (countBadge) {
                    const getUniqueOrderCount = (arr) => {
                        const keys = new Set();
                        arr.forEach(o => keys.add(o.station_order_number ? `${o.customer_id}-${o.station_order_number}` : `solo-${o.order_id}`));
                        return keys.size;
                    };
                    const deliveries = (data.orders || []).filter(o => o.order_status === 'To Deliver');
                    countBadge.innerText = getUniqueOrderCount(deliveries) + ' Orders';
                }
            }
        } catch (e) {
            console.error(e);
            if (isFirstLoad && this._currentView === 'delivery_dashboard') {
                this.html('<div class="max-w-5xl mx-auto w-full p-6">' + this.emptyState('fa-triangle-exclamation', 'Network Error', 'Failed to load delivery data. Please try again.') + '</div>');
            }
        }
    },

    _renderDeliveryDashboardPage(showSkeleton) {
        let deliveriesCount = 0;
        if (!showSkeleton && State.deliveryData) {
            const deliveries = (State.deliveryData.orders || []).filter(o => o.order_status === 'To Deliver' || o.order_status === 'Delivered');
            const keys = new Set();
            deliveries.forEach(o => keys.add(o.station_order_number ? `${o.customer_id}-${o.station_order_number}` : `solo-${o.order_id}`));
            deliveriesCount = keys.size;
        }

        const html = `
            <style>
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 16px; }
            </style>
            <div class="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md px-4 py-3 border-b border-slate-200/50 flex justify-between items-center shadow-sm">
                <h2 class="text-lg font-black text-slate-800 tracking-tight">Active Deliveries</h2>
                <span class="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-200/50 shadow-inner" id="delivery-count-badge">${showSkeleton ? '...' : deliveriesCount} Orders</span>
            </div>
            <div class="p-4 space-y-4" id="delivery-list-container">
                ${showSkeleton ? this._deliveryDashboardSkeleton() : ''}
            </div>
        `;
        this.html('<div class="max-w-4xl mx-auto w-full">' + html + '</div>');

        if (!showSkeleton) {
            this._updateDeliveryList();
            this._setupDeliveryPolling();
        }
    },

    _deliveryDashboardSkeleton() {
        let s = '';
        for (let i = 0; i < 3; i++) {
            s += '<div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-4">' +
                '<div class="flex justify-between items-start mb-3">' +
                '<div class="flex-1"><div class="skeleton h-3 w-20 mb-2"></div><div class="skeleton h-5 w-40"></div></div>' +
                '<div class="skeleton h-5 w-20 rounded-full"></div></div>' +
                '<div class="bg-slate-50 rounded-2xl p-3 mb-4"><div class="skeleton h-4 w-full mb-2"></div><div class="skeleton h-4 w-1/2 mt-2 pt-1 border-t border-slate-200"></div></div>' +
                '<div class="skeleton h-12 w-full rounded-xl"></div>' +
                '</div>';
        }
        return s;
    },

    _updateDeliveryList() {
        const container = document.getElementById('delivery-list-container');
        if (!container) return;

        const deliveries = (State.deliveryData?.orders || []).filter(o => o.order_status === 'To Deliver');
        
        const getUniqueOrderCount = (arr) => {
            const keys = new Set();
            arr.forEach(o => keys.add(o.station_order_number ? `${o.customer_id}-${o.station_order_number}` : `solo-${o.order_id}`));
            return keys.size;
        };

        const badge = document.getElementById('delivery-count-badge');
        if (badge) badge.innerText = `${getUniqueOrderCount(deliveries)} Orders`;

        let html = '<div class="space-y-4">';

        if(deliveries.length === 0) {
            html += this.emptyState('fa-motorcycle', 'No Deliveries', 'You currently have no active deliveries assigned to you.');
        }

        const groupedOrdersArray = [];
        const groupedMap = new Map();
        deliveries.forEach(o => {
            const key = o.station_order_number ? `${o.customer_id}-${o.station_order_number}` : `solo-${o.order_id}`;
            if(!groupedMap.has(key)) {
                groupedMap.set(key, { items: [], info: o });
                groupedOrdersArray.push(groupedMap.get(key));
            }
            groupedMap.get(key).items.push(o);
        });

        groupedOrdersArray.sort((a, b) => {
            const ptsA = a.info.user_lifetime_points || a.info.user_points || 0;
            const ptsB = b.info.user_lifetime_points || b.info.user_points || 0;
            if (ptsA !== ptsB) return ptsB - ptsA;
            return new Date(a.info.order_date) - new Date(b.info.order_date);
        });

        groupedOrdersArray.forEach(group => {
            const o = group.info;
            const rank = App.getLoyaltyRank(o.user_lifetime_points || o.user_points || 0);
            const isPriority = rank.name === 'Gold' || rank.name === 'Platinum' || rank.name === 'Diamond';
            const isDone = o.order_status === 'Delivered';
            
            html += `
                <div class="bg-white rounded-3xl p-5 border ${isPriority ? 'border-amber-300 ring-2 ring-amber-300/30' : 'border-slate-200/80'} shadow-md shadow-blue-500/5 transition-all">
                    <div class="flex justify-between items-start mb-3 pb-3 border-b border-slate-100">
                        <div>
                            <div class="flex items-center gap-1.5 mb-1">
                                <span class="text-xs font-black text-slate-800">#${o.station_order_number || o.order_id}</span>
                                ${isPriority ? `<span class="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1"><i class="fa-solid fa-crown text-[8px]"></i> Priority VIP</span>` : ''}
                            </div>
                            <h3 class="font-extrabold text-slate-900 text-base">${escapeHtml(o.full_name)}</h3>
                            <p class="text-[11px] text-slate-400 font-medium">${App.formatDateTime(o.order_date)}</p>
                        </div>
                        <div class="text-right">
                            <span class="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-lg border border-indigo-100/80 mb-1">${o.payment_method}</span>
                        </div>
                    </div>

                    <div class="bg-slate-50 rounded-2xl p-3.5 space-y-2 mb-4 border border-slate-100">
            `;

            group.items.forEach(item => {
                html += `
                    <div class="flex items-center text-sm font-bold text-slate-700">
                        <i class="fa-solid fa-bottle-water w-5 text-blue-400 text-center"></i> <span class="font-black text-slate-900 mr-1">${item.quantity}x</span>${escapeHtml(item.product_name)} <span class="text-[10px] uppercase text-slate-400 ml-1">(${escapeHtml(item.jug_type)})</span>
                    </div>
                `;
            });

            let containerHtml = '';
            let requiresCollection = false;
            
            if (o.returning_borrowed_flag == 1) {
                containerHtml += `<p class="font-black text-red-600 mb-1 pb-1 border-b border-red-100"><i class="fa-solid fa-triangle-exclamation mr-1"></i> COLLECT PREVIOUSLY BORROWED JUGS!</p>`;
                requiresCollection = true;
            }
            
            group.items.forEach(item => {
                if (item.container_option === 'owned') {
                    requiresCollection = true;
                }
            });

            if (o.container_option === 'borrow') {
                containerHtml += `<p class="font-bold text-amber-600"><i class="fa-solid fa-hand-holding-droplet mr-1"></i> Leave: Borrowed jugs (${o.borrow_round} Round, ${o.borrow_slim} Slim)</p>`;
            } else if (o.container_option === 'owned') {
                containerHtml += `<p class="font-bold text-emerald-600"><i class="fa-solid fa-rotate mr-1"></i> Retrieve: Empty jugs (Swap)</p>`;
            } else if (o.container_option === 'buy') {
                containerHtml += `<p class="font-bold text-blue-600"><i class="fa-solid fa-cart-shopping mr-1"></i> Leave: Bought jugs</p>`;
            }
            
            if (containerHtml) {
                html += `<div class="bg-white p-2 rounded-lg border border-slate-200 mt-1 text-xs">${containerHtml}</div>`;
            }

            html += `
                        <a href="tel:${escapeHtml(o.contact_number)}" class="flex items-center text-sm font-bold text-blue-600 active:scale-95 transition origin-left w-max mt-2">
                            <i class="fa-solid fa-phone w-5 text-center"></i> ${escapeHtml(o.contact_number)}
                        </a>
                        <div class="flex items-start text-xs font-medium text-slate-600 leading-snug">
                            <i class="fa-solid fa-location-dot w-5 mt-0.5 text-red-400 text-center"></i> <span>${escapeHtml(o.delivery_address)}</span>
                        </div>
                    </div>
                    
                    <button onclick="App.confirmDelivery(${o.order_id}, ${requiresCollection})" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                        <i class="fa-solid fa-check-double"></i> Mark as Delivered
                    </button>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    },

    _setupDeliveryPolling() {
        if(State.pollingInterval) clearInterval(State.pollingInterval);
        
        if (!State.knownDeliveryOrderIds) State.knownDeliveryOrderIds = new Set();
        if (State.deliveryData?.orders && Array.isArray(State.deliveryData.orders)) {
            State.deliveryData.orders.filter(o => o.order_status === 'To Deliver').forEach(o => State.knownDeliveryOrderIds.add(String(o.order_id)));
            State.deliveryPollingInitialized = true;
            State.deliverySessionStartTime = State.deliverySessionStartTime || Date.now();
        }
        State.lastDataHash = JSON.stringify((State.deliveryData?.orders || []).filter(o => o.order_status === 'To Deliver' || o.order_status === 'Delivered').map(o => o.order_id + o.order_status));
        
        State.pollingInterval = setInterval(async () => {
            try {
                const newData = await API.request('get_admin_dashboard_data', 'GET', null, true);
                if (!newData || !newData.orders || !Array.isArray(newData.orders)) return;
                const newDelivs = newData.orders.filter(o => o.order_status === 'To Deliver' || o.order_status === 'Delivered');

                if (!State.deliveryPollingInitialized || State.knownDeliveryOrderIds.size === 0) {
                    newDelivs.filter(o => o.order_status === 'To Deliver').forEach(o => State.knownDeliveryOrderIds.add(String(o.order_id)));
                    State.deliveryPollingInitialized = true;
                    State.deliverySessionStartTime = Date.now();
                    State.deliveryData = newData;
                    State.lastDataHash = JSON.stringify(newDelivs.map(o => o.order_id + o.order_status));
                    return;
                }

                const newlyAssigned = [];
                newDelivs.forEach(newOrder => {
                    const orderKey = String(newOrder.order_id);
                    if (newOrder.order_status === 'To Deliver' && !State.knownDeliveryOrderIds.has(orderKey)) {
                        State.knownDeliveryOrderIds.add(orderKey);
                        const orderTime = newOrder.order_date ? new Date(newOrder.order_date.replace(/-/g, '/')).getTime() : Date.now();
                        const sessionStart = State.deliverySessionStartTime || 0;
                        if (orderTime >= (sessionStart - 30000)) {
                            newlyAssigned.push(newOrder);
                        }
                    }
                });

                if (newlyAssigned.length > 0) {
                    const seenGroupKeys = new Set();
                    newlyAssigned.forEach(first => {
                        const gKey = first.station_order_number ? `${first.customer_id}-${first.station_order_number}` : `solo-${first.order_id}`;
                        if (!seenGroupKeys.has(gKey)) {
                            const orderNum = first.station_order_number || first.order_id;
                            const notifyMsg = `New delivery assigned! Order #${orderNum} for ${first.full_name}.`;
                            if (!State.pushSubscriptionSynced) {
                                App.sendNativeNotification('Delivery Assignment', notifyMsg, 'order-' + orderNum);
                            }
                        }
                    });
                }

                const newHash = JSON.stringify(newDelivs.map(o => o.order_id + o.order_status));
                if(State.lastDataHash !== newHash) {
                    State.deliveryData = newData;
                    State.lastDataHash = newHash;
                    this._prefetchCache['delivery_dashboard'] = { loading: false, data: newData, ts: Date.now() };
                    this._updateDeliveryList();
                }
            } catch(e) {}
        }, 8000);
    },
    
    async renderSuperAdminDashboard() {
        State.saTab = State.saTab || 'stations';
        State.saUserSubTab = State.saUserSubTab || 'admins';

        if (!State.saLoadedOnce) {
            this.html(`
                <div class="max-w-4xl mx-auto w-full">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <div class="skeleton h-7 w-48 mb-2"></div>
                            <div class="skeleton h-4 w-60"></div>
                        </div>
                        <div class="skeleton h-10 w-32 rounded-xl"></div>
                    </div>
                    <div class="flex border-b border-slate-200 mb-6 gap-4">
                        <div class="skeleton h-10 w-28"></div>
                        <div class="skeleton h-10 w-36"></div>
                    </div>
                    <div class="space-y-4">
                        <div class="skeleton h-24 w-full rounded-3xl"></div>
                        <div class="skeleton h-24 w-full rounded-3xl"></div>
                        <div class="skeleton h-24 w-full rounded-3xl"></div>
                    </div>
                </div>
            `);
        }

        try {
            let stations = [];
            let usersData = { admins: [], customers: [], stations: [] };

            if (State.saTab === 'stations') {
                stations = await API.request('sa_get_stations', 'GET', null, true);
            } else {
                usersData = await API.request('sa_get_users', 'GET', null, true);
                State.saUsersData = usersData;
                stations = usersData.stations || [];
            }
            State.saLoadedOnce = true;

            const searchQuery = (document.getElementById('sa-user-search')?.value || '').toLowerCase().trim();

            let html = `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 class="text-2xl font-black text-slate-800">Platform Control</h2>
                        <p class="text-xs font-bold text-slate-500">Super Admin Management Center</p>
                    </div>
                    <div class="flex items-center gap-2">
                        ${State.saTab === 'stations' ? `
                            <button onclick="UI.navigate('sa_add_station')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95 flex items-center gap-1.5">
                                <i class="fa-solid fa-plus"></i> New Station
                            </button>
                        ` : (State.saUserSubTab === 'admins' ? `
                            <button onclick="App.openAdminUserModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95 flex items-center gap-1.5">
                                <i class="fa-solid fa-user-plus"></i> Add Staff / Admin
                            </button>
                        ` : '')}
                    </div>
                </div>

                <!-- Main Super Admin Tabs -->
                <div class="flex border-b border-slate-200 mb-6">
                    <button onclick="State.saTab='stations'; UI.renderSuperAdminDashboard();" class="py-3 px-6 text-sm font-black transition-all flex items-center gap-2 border-b-2 ${State.saTab === 'stations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}">
                        <i class="fa-solid fa-store"></i> Stations
                    </button>
                    <button onclick="State.saTab='users'; UI.renderSuperAdminDashboard();" class="py-3 px-6 text-sm font-black transition-all flex items-center gap-2 border-b-2 ${State.saTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}">
                        <i class="fa-solid fa-users-gear"></i> User Management
                    </button>
                </div>
            `;

            if (State.saTab === 'stations') {
                html += `<div class="space-y-4">`;
                if (stations.length === 0) {
                    html += this.emptyState('fa-store-slash', 'No Stations', 'No water stations found in the system.');
                } else {
                    stations.forEach(s => {
                        const isActive = s.status === 'Active';
                        html += `
                            <div class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div class="flex items-center gap-3 mb-1">
                                        <h3 class="font-black text-slate-800 text-lg">${escapeHtml(s.station_name)}</h3>
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${s.status}</span>
                                    </div>
                                    <p class="text-xs text-slate-500 font-medium"><i class="fa-solid fa-user-shield mr-1 text-slate-400"></i>Admin: <strong class="text-slate-700">${escapeHtml(s.admin_username || 'None')}</strong></p>
                                    <p class="text-xs text-slate-500 font-medium mt-0.5"><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i>${escapeHtml(s.address || 'No address')}</p>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="App.toggleStationStatus(${s.station_id}, '${isActive ? 'Suspended' : 'Active'}')" class="px-3.5 py-2 rounded-xl text-xs font-bold ${isActive ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'} transition">
                                        ${isActive ? 'Suspend' : 'Activate'}
                                    </button>
                                    ${!isActive ? `
                                        <button onclick="App.deleteStation(${s.station_id})" class="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition" title="Delete Station">
                                            <i class="fa-solid fa-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    });
                }
                html += `</div>`;
            } else {
                html += `
                    <!-- User Sub Tabs -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div class="flex gap-2">
                            <button onclick="State.saUserSubTab='admins'; UI.renderSuperAdminDashboard();" class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${State.saUserSubTab === 'admins' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">
                                <i class="fa-solid fa-user-shield"></i> Staff & Admins <span class="px-1.5 py-0.2 rounded-full text-[10px] ${State.saUserSubTab === 'admins' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}">${(usersData.admins || []).length}</span>
                            </button>
                            <button onclick="State.saUserSubTab='customers'; UI.renderSuperAdminDashboard();" class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${State.saUserSubTab === 'customers' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">
                                <i class="fa-solid fa-user-group"></i> Customers <span class="px-1.5 py-0.2 rounded-full text-[10px] ${State.saUserSubTab === 'customers' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}">${(usersData.customers || []).length}</span>
                            </button>
                        </div>
                        <div class="relative min-w-[220px]">
                            <input type="text" id="sa-user-search" value="${searchQuery}" oninput="UI._filterSaUsers()" placeholder="Search users..." class="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm">
                            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                        </div>
                    </div>

                    <div id="sa-users-container" class="space-y-3">
                        ${this._renderSaUsersListHtml(usersData, State.saUserSubTab || 'admins', searchQuery)}
                    </div>
                `;
            }

            html += `
                <!-- Admin/Staff Modal -->
                <div id="sa-admin-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
                    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl shadow-blue-500/15 border border-blue-200/80 ring-2 ring-blue-500/30">
                        <div class="flex justify-between items-center mb-4">
                            <h3 id="sa-admin-modal-title" class="font-black text-slate-800 text-lg">Add Staff / Admin</h3>
                            <button onclick="App.closeAdminUserModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onsubmit="App.submitAdminUser(event)" class="space-y-4">
                            <input type="hidden" id="sa-modal-admin-id">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Username</label>
                                <input type="text" id="sa-modal-admin-user" required placeholder="e.g. staff_station1" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 mb-1">Role</label>
                                    <select id="sa-modal-admin-role" onchange="App.toggleAdminStationDropdown()" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="Admin">Admin</option>
                                        <option value="Delivery Staff">Delivery Staff</option>
                                        <option value="Super Admin">Super Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 mb-1">Status</label>
                                    <select id="sa-modal-admin-status" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="Active">Active</option>
                                        <option value="Revoked">Revoked</option>
                                    </select>
                                </div>
                            </div>
                            <div id="sa-modal-station-group">
                                <label class="block text-xs font-bold text-slate-700 mb-1">Assigned Station</label>
                                <select id="sa-modal-admin-station" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">-- Choose Station --</option>
                                    ${(usersData.stations || stations || []).map(st => `
                                        <option value="${st.station_id}">${escapeHtml(st.station_name)}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Password</label>
                                <input type="password" id="sa-modal-admin-pass" placeholder="••••••••" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <p id="sa-admin-pass-help" class="text-[11px] text-slate-400 mt-1">Leave blank to keep existing password</p>
                            </div>
                            <div class="flex gap-2 pt-2">
                                <button type="button" onclick="App.closeAdminUserModal()" class="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm">Cancel</button>
                                <button type="submit" class="w-1/2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md">Save Account</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Customer Edit Modal -->
                <div id="sa-cust-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
                    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl shadow-blue-500/15 border border-blue-200/80 ring-2 ring-blue-500/30">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-black text-slate-800 text-lg">Edit Customer Details</h3>
                            <button onclick="App.closeCustomerModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <form onsubmit="App.submitCustomerEdit(event)" class="space-y-4">
                            <input type="hidden" id="sa-modal-cust-id">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                                <input type="text" id="sa-modal-cust-name" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Contact Number</label>
                                <input type="tel" id="sa-modal-cust-phone" required maxlength="11" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,11)" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Address</label>
                                <textarea id="sa-modal-cust-addr" rows="2" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Verification Status</label>
                                <select id="sa-modal-cust-ver" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="1">Verified</option>
                                    <option value="0">Unverified</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Reset Password (Optional)</label>
                                <input type="password" id="sa-modal-cust-pass" placeholder="Leave blank to keep current password" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            </div>
                            <div class="flex gap-2 pt-2">
                                <button type="button" onclick="App.closeCustomerModal()" class="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm">Cancel</button>
                                <button type="submit" class="w-1/2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md">Update Customer</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            this.html(html);
        } catch (e) { console.error(e); }
    },

    _renderSaUsersListHtml(usersData, subTab, searchQuery) {
        searchQuery = (searchQuery || '').toLowerCase().trim();
        const admins = (usersData?.admins || []).filter(a => {
            if (!searchQuery) return true;
            return (a.username || '').toLowerCase().includes(searchQuery) ||
                   (a.role || '').toLowerCase().includes(searchQuery) ||
                   (a.station_name || '').toLowerCase().includes(searchQuery);
        });

        const customers = (usersData?.customers || []).filter(c => {
            if (!searchQuery) return true;
            return (c.full_name || '').toLowerCase().includes(searchQuery) ||
                   (c.contact_number || '').toLowerCase().includes(searchQuery) ||
                   (c.address || '').toLowerCase().includes(searchQuery);
        });

        if (subTab === 'admins') {
            if (admins.length === 0) {
                return this.emptyState('fa-user-slash', 'No Staff Found', 'No admin or delivery staff accounts match your search.');
            }
            return admins.map(a => {
                const isActive = a.status === 'Active';
                let roleBadge = 'bg-blue-100 text-blue-800 border-blue-200';
                let roleIcon = 'fa-user-gear';
                if (a.role === 'Super Admin') {
                    roleBadge = 'bg-purple-100 text-purple-800 border-purple-200';
                    roleIcon = 'fa-shield-halved';
                } else if (a.role === 'Delivery Staff') {
                    roleBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                    roleIcon = 'fa-motorcycle';
                }

                return `
                    <div class="bg-white rounded-3xl p-4 sm:p-5 shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div class="flex items-center gap-3.5 min-w-0">
                            <div class="w-12 h-12 rounded-2xl ${a.role === 'Super Admin' ? 'bg-purple-50 text-purple-600' : (a.role === 'Delivery Staff' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')} flex items-center justify-center text-xl shadow-inner shrink-0">
                                <i class="fa-solid ${roleIcon}"></i>
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h4 class="font-black text-slate-800 text-base leading-snug truncate">${escapeHtml(a.username)}</h4>
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${roleBadge}">${a.role}</span>
                                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${a.status}</span>
                                </div>
                                <p class="text-xs text-slate-500 mt-1">
                                    <i class="fa-solid fa-store mr-1 text-slate-400"></i>Station: <strong class="text-slate-700">${escapeHtml(a.station_name || (a.role === 'Super Admin' ? 'Global / All Stations' : 'Unassigned'))}</strong>
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 self-end sm:self-center">
                            <button onclick="App.openAdminUserModal(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(a))}')))" class="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition" title="Edit User">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            ${a.role !== 'Super Admin' ? `
                                <button onclick="App.toggleAdminStatus(${a.admin_id}, '${isActive ? 'Revoked' : 'Active'}')" class="px-3 py-1.5 rounded-xl text-xs font-bold ${isActive ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'} transition">
                                    ${isActive ? 'Suspend' : 'Activate'}
                                </button>
                                <button onclick="App.deleteAdminUser(${a.admin_id}, decodeURIComponent('${encodeURIComponent(a.username || '')}'))" class="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition" title="Delete User">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            if (customers.length === 0) {
                return this.emptyState('fa-user-slash', 'No Customers Found', 'No customers match your search query.');
            }
            return customers.map(c => {
                const isVer = c.is_verified == 1;
                return `
                    <div class="bg-white rounded-3xl p-4 sm:p-5 shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div class="flex items-start gap-3.5 min-w-0">
                            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl shadow-inner shrink-0">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h4 class="font-black text-slate-800 text-base leading-snug truncate">${escapeHtml(c.full_name)}</h4>
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isVer ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}">
                                        <i class="fa-solid ${isVer ? 'fa-check' : 'fa-hourglass-half'} mr-1"></i>${isVer ? 'Verified' : 'Unverified'}
                                    </span>
                                </div>
                                <p class="text-xs text-slate-500 font-medium mt-0.5"><i class="fa-solid fa-phone mr-1 text-slate-400"></i>${escapeHtml(c.contact_number)}</p>
                                <p class="text-xs text-slate-400 truncate mt-0.5"><i class="fa-solid fa-location-dot mr-1 text-slate-300"></i>${escapeHtml(c.address || 'No address provided')}</p>
                                <div class="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                    <span><strong class="text-slate-700">${c.total_orders || 0}</strong> orders</span>
                                    <span><strong class="text-slate-700">${c.total_containers || 0}</strong> jugs</span>
                                    <span>Spent: <strong class="text-blue-600">₱${parseFloat(c.total_spent || 0).toFixed(2)}</strong></span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button onclick="App.toggleCustomerVerification(${c.customer_id}, ${c.is_verified || 0})" class="px-3 py-1.5 rounded-xl text-xs font-bold ${isVer ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'} transition">
                                ${isVer ? 'Unverify' : 'Verify'}
                            </button>
                            <button onclick="App.openCustomerModal(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(c))}')))" class="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition" title="Edit Customer">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="App.deleteCustomerUser(${c.customer_id}, decodeURIComponent('${encodeURIComponent(c.full_name || '')}'))" class="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition" title="Delete Customer">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    },

    _filterSaUsers() {
        const container = document.getElementById('sa-users-container');
        const searchInput = document.getElementById('sa-user-search');
        if (!container || !State.saUsersData) return;
        const searchQuery = (searchInput ? searchInput.value : '').toLowerCase().trim();
        container.innerHTML = this._renderSaUsersListHtml(State.saUsersData, State.saUserSubTab || 'admins', searchQuery);
    },
    
    renderSaAddStation() {
        let html = `
            <button onclick="UI.goBack('superadmin_dashboard')" class="text-sm font-bold text-slate-500 hover:text-slate-800 mb-6 flex items-center transition"><i class="fa-solid fa-arrow-left mr-2"></i> Back to Dashboard</button>
            <h2 class="text-2xl font-black text-slate-800 mb-6">Create New Station</h2>
            <form onsubmit="App.submitNewStation(event)" class="bg-white rounded-3xl shadow-md border border-blue-200/80 ring-2 ring-blue-500/30 shadow-blue-500/5 transition-all p-6 space-y-5">
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Station Name</label>
                    <input type="text" id="sa-st-name" required placeholder="e.g., Mababanaba Waters Zone 1" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Complete Address</label>
                    <textarea id="sa-st-addr" required rows="2" placeholder="Barangay Address" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Contact Number</label>
                    <input type="tel" id="sa-st-contact" required placeholder="09xxxxxxxxx" maxlength="11" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,11)" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <hr class="border-slate-100 my-4 border-dashed">
                <h3 class="font-bold text-slate-800 text-lg mb-2">Admin Credentials</h3>
                <p class="text-xs text-slate-500 mb-4">Provide these details to the station owner so they can log in.</p>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Admin Username</label>
                    <input type="text" id="sa-st-user" required placeholder="e.g., admin_zone1" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Admin Password</label>
                    <div class="relative">
                        <input type="password" id="sa-st-pass" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-12">
                        <button type="button" onclick="App.togglePassword('sa-st-pass', 'sa-st-pass-icon')" class="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-blue-600 transition">
                            <i class="fa-solid fa-eye" id="sa-st-pass-icon"></i>
                        </button>
                    </div>
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 text-lg flex items-center justify-center gap-2 mt-4">
                    Register Station
                </button>
            </form>
        `;
        this.html(html);
    }
};


// --- S-Grade Modularity: Sub-namespace Domain Modules ---
UI.Core = {
    escapeHtml: (typeof escapeHtml !== 'undefined' ? escapeHtml : null),
    showToast: (...args) => UI.showToast(...args),
    showPrivacyPolicy: (...args) => UI.showPrivacyPolicy(...args),
    updateOfflineState: (...args) => UI.updateOfflineState(...args),
    CustomDialog: (typeof CustomDialog !== 'undefined' ? CustomDialog : null),
    CustomToast: (typeof CustomToast !== 'undefined' ? CustomToast : null)
};

UI.Auth = {
    renderLogin: (...args) => UI.renderLogin(...args),
    renderRegister: (...args) => UI.renderRegister(...args),
    renderOTPVerify: (...args) => UI.renderOTPVerify(...args),
    renderForgotPassword: (...args) => UI.renderForgotPassword(...args),
    renderResetPassword: (...args) => UI.renderResetPassword(...args),
    renderChangePassword: (...args) => UI.renderChangePassword(...args),
    renderChangePhone: (...args) => UI.renderChangePhone(...args)
};

UI.Customer = {
    renderDashboard: (...args) => UI.renderCustomerDashboard(...args),
    renderStation: (...args) => UI.renderCustomerStation(...args),
    renderCheckout: (...args) => UI.renderCustomerCheckout(...args),
    renderOrders: (...args) => UI.renderCustomerOrders(...args),
    renderLoyalty: (...args) => UI.renderCustomerLoyalty(...args),
    renderReviewModal: (...args) => UI.renderReviewModal(...args)
};

UI.Admin = {
    renderDashboard: (...args) => UI.renderAdminDashboard(...args),
    renderSalesReport: (...args) => UI.renderAdminSalesReport(...args),
    renderInventory: (...args) => UI.renderAdminInventory(...args),
    renderProducts: (...args) => UI.renderAdminProducts(...args),
    renderLoyalty: (...args) => UI.renderAdminLoyalty(...args),
    renderSettings: (...args) => UI.renderAdminSettings(...args),
    renderSuperAdminDashboard: (...args) => UI.renderSuperAdminDashboard(...args),
    renderSuperAdminAddStation: (...args) => UI.renderSuperAdminAddStation(...args)
};

UI.Delivery = {
    renderDashboard: (...args) => UI.renderDeliveryDashboard(...args)
};

if (typeof window !== 'undefined') window.UI = UI;

















