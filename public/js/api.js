const API = {
    base: '/api/api.php',
    
    clearCache() {
        try {
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('cache_') || key.startsWith('mbbnb_') || key.includes('session'))) {
                    toRemove.push(key);
                }
            }
            toRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) {
            console.warn('Failed to clear cache:', e);
        }
    },

    isOffline() {
        return typeof navigator !== 'undefined' && !navigator.onLine;
    },

    async request(action, method = 'GET', data = null, silent = false) {
        const cleanActionKey = 'cache_' + action.replace(/&_t=\d+/, '');

        // Intercept mutations if client is strictly offline
        if (this.isOffline() && method !== 'GET') {
            if (typeof CustomToast !== 'undefined' && !silent) {
                CustomToast.show('You are currently offline. Please reconnect to submit this transaction.', 'warning');
            }
            throw new Error("Offline: Network connection required to complete this action.");
        }

        // Instant offline fallback for GET requests when offline
        if (this.isOffline() && method === 'GET') {
            const cachedEntry = localStorage.getItem(cleanActionKey) || localStorage.getItem('cache_' + action);
            if (cachedEntry) {
                try {
                    const parsed = JSON.parse(cachedEntry);
                    const data = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                    if (data && typeof data === 'object') {
                        data._fromOfflineCache = true;
                    }
                    if (window.UI && window.UI.updateOfflineState) {
                        window.UI.updateOfflineState(true);
                    }
                    console.warn('⚡ Offline mode active. Serving directly from offline cache for action:', action);
                    return data;
                } catch (e) {
                    console.warn('Failed to parse cached entry for:', cleanActionKey);
                }
            }
        }

        const options = { 
            method: method, 
            headers: { 'Cache-Control': 'no-cache' }, 
            credentials: 'same-origin' 
        };

        if (State.csrfToken && method !== 'GET') {
            options.headers['X-CSRF-TOKEN'] = State.csrfToken;
        }

        if (data) {
            if (data instanceof FormData) {
                options.body = data;
            } else if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) {
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                options.body = data.toString();
            } else if (typeof data === 'string') {
                options.headers['Content-Type'] = 'application/json';
                options.body = data;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
        }
        
        try {
            const res = await fetch(`${this.base}?action=${action}&_t=${Date.now()}`, options);
            if (res.status === 401 || res.status === 403 || res.status === 429) {
                try { localStorage.removeItem(cleanActionKey); } catch(e) {}
                let errMsg = (res.status === 429) ? "Too many attempts. Please try again in 5 minutes." : "Unauthorized";
                try {
                    const errTxt = await res.text();
                    const errJson = JSON.parse(errTxt);
                    if (errJson && errJson.error) errMsg = errJson.error;
                    if (errJson && errJson.message) errMsg = errJson.message;
                } catch(ign) {}
                if (errMsg.includes('Imunify360') || errMsg.includes('bot-protection')) {
                    errMsg = "Access temporarily flagged by server security (Imunify360). Please whitelist your IP in cPanel or wait a few moments.";
                }

                throw new Error(errMsg);
            }
            const text = await res.text();
            const trimmed = text.trim();
            const isHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<head');
            const isWafChallenge = isHtml && (
                text.includes('wsidchk') || 
                text.includes('Please wait while your request is being verified') || 
                text.includes('imunify360') ||
                text.includes('One moment, please...')
            );

            if (isWafChallenge) {
                console.warn('WAF security verification challenge detected from server.');
                if (typeof CustomToast !== 'undefined' && !silent) {
                    CustomToast.show('Security verification required. Tap to verify with server.', 'warning', 10000, () => {
                        window.location.reload();
                    });
                }
                throw new Error("Security verification required by server firewall. Please refresh the page to verify.");
            }
            
            try {
                const json = JSON.parse(text);
                if (json && json.error) throw new Error("API_ERR:" + json.error);
                if (json && json.csrf_token) State.csrfToken = json.csrf_token;

                // Cache successful GET responses for instant offline and resilient access
                const actionBase = action.split('&')[0];
                const cacheableActions = ['get_stations', 'get_vapid_public_key', 'get_customer_orders'];
                if (method === 'GET' && json && !json.error) {
                    if (cacheableActions.includes(actionBase)) {
                        try { 
                            localStorage.setItem(cleanActionKey, JSON.stringify({
                                data: json,
                                cachedAt: Date.now()
                            })); 
                        } catch(e) { 
                            console.warn('Cache quota exceeded for:', cleanActionKey); 
                        }
                    } else if (actionBase === 'check_session') {
                        if (json.logged_in) {
                            try {
                                localStorage.setItem('cache_check_session', JSON.stringify({
                                    data: json,
                                    cachedAt: Date.now()
                                }));
                            } catch(e) {}
                        } else {
                            try {
                                localStorage.removeItem('cache_check_session');
                                localStorage.removeItem('cache_get_customer_orders');
                            } catch(e) {}
                        }
                    }
                }

                if (window.UI && window.UI.updateOfflineState) {
                    window.UI.updateOfflineState(false);
                }

                return json;
            } catch (e) {
                if (e.message && e.message.startsWith("API_ERR:")) throw new Error(e.message.replace("API_ERR:", ""));
                
                try {
                    let clean = text.replace(/<script[\s\S]*?<\/script>/gi, '').trim();
                    let startObj = clean.indexOf('{');
                    let startArr = clean.indexOf('[');
                    let startIdx = (startObj === -1) ? startArr : (startArr === -1 ? startObj : Math.min(startObj, startArr));
                    
                    if(startIdx === -1) throw new Error("No JSON structure found in response");
                    
                    let isArr = clean[startIdx] === '[';
                    let endIdx = isArr ? clean.lastIndexOf(']') : clean.lastIndexOf('}');
                    let jsonStr = clean.substring(startIdx, endIdx + 1);
                    
                    const json = JSON.parse(jsonStr);
                    if (json && json.error) throw new Error(json.error);
                    if (json && json.csrf_token) State.csrfToken = json.csrf_token;

                    const actionBaseFallback = action.split('&')[0];
                    if (method === 'GET' && json && !json.error) {
                        if (['get_stations', 'get_vapid_public_key', 'get_customer_orders'].includes(actionBaseFallback)) {
                            try { 
                                localStorage.setItem(cleanActionKey, JSON.stringify({
                                    data: json,
                                    cachedAt: Date.now()
                                })); 
                            } catch(e) { 
                                console.warn('Cache quota exceeded for:', cleanActionKey); 
                            }
                        } else if (actionBaseFallback === 'check_session') {
                            if (json.logged_in) {
                                try {
                                    localStorage.setItem('cache_check_session', JSON.stringify({
                                        data: json,
                                        cachedAt: Date.now()
                                    }));
                                } catch(e) {}
                            } else {
                                try {
                                    localStorage.removeItem('cache_check_session');
                                    localStorage.removeItem('cache_get_customer_orders');
                                } catch(e) {}
                            }
                        }
                    }

                    if (window.UI && window.UI.updateOfflineState) {
                        window.UI.updateOfflineState(false);
                    }

                    return json;
                } catch (fallbackErr) {
                    if (fallbackErr.message && (
                        fallbackErr.message.includes('Unauthorized') || 
                        fallbackErr.message.includes('Invalid CSRF') ||
                        fallbackErr.message.includes('Security verification') ||
                        fallbackErr.message.includes('Imunify360')
                    )) {
                        throw fallbackErr;
                    }
                    console.error("Raw Server Response:", text);
                    if(text.includes('<br') || text.includes('<b>')) throw new Error("Server configuration error (PHP Warning).");
                    if (isHtml) throw new Error("Received an unexpected HTML response from server. Please refresh the page.");
                    throw new Error(e.message || "Invalid JSON from server");
                }
            }
        } catch (err) {
            const isAuthError = err.message && (
                err.message.toLowerCase().includes('unauthorized') ||
                err.message.toLowerCase().includes('invalid csrf token') ||
                err.message.toLowerCase().includes('session expired')
            );
            
            if (isAuthError) {
                try { localStorage.removeItem(cleanActionKey); } catch(e) {}
                if (window.UI && window.UI.canAccessView && !window.UI.canAccessView(window.UI._currentView)) {
                    window.UI.goHome('replace');
                }
                throw err;
            }

            // Offline Cache Fallback for GET requests
            if (method === 'GET') {
                const cachedEntry = localStorage.getItem(cleanActionKey) || localStorage.getItem('cache_' + action);
                if (cachedEntry) {
                    try {
                        const parsed = JSON.parse(cachedEntry);
                        const data = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
                        if (data && typeof data === 'object') {
                            data._fromOfflineCache = true;
                        }
                        if (window.UI && window.UI.updateOfflineState) {
                            window.UI.updateOfflineState(true);
                        }
                        console.warn('⚡ Network unavailable. Serving from offline cache for action:', action);
                        return data;
                    } catch (e) {
                        console.warn('Failed to parse cached entry for:', cleanActionKey);
                    }
                }
            }

            // If fetch failed and no cache was found
            if (!silent && typeof CustomToast !== 'undefined') {
                if (this.isOffline()) {
                    CustomToast.show('Network offline. Unable to load fresh data.', 'warning');
                } else {
                    CustomToast.show(err.message || 'Network request failed', 'error');
                }
            }
            throw err;
        }
    }
};

if (typeof window !== 'undefined') window.API = API;