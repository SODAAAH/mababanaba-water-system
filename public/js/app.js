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

    calculateDistanceKm(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const pLat1 = parseFloat(lat1);
        const pLon1 = parseFloat(lon1);
        const pLat2 = parseFloat(lat2);
        const pLon2 = parseFloat(lon2);
        if (isNaN(pLat1) || isNaN(pLon1) || isNaN(pLat2) || isNaN(pLon2)) return null;

        const R = 6371; // Earth radius in km
        const dLat = (pLat2 - pLat1) * Math.PI / 180;
        const dLon = (pLon2 - pLon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(pLat1 * Math.PI / 180) * Math.cos(pLat2 * Math.PI / 180) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;
        return isNaN(dist) ? null : dist;
    },

    calculateDynamicETA(distanceKm, queueCount = 0, userLifetimePoints = 0, jugCount = 1, orderDate = null) {
        const q = Math.max(0, parseInt(queueCount) || 0);
        const rank = this.getLoyaltyRank(userLifetimePoints);

        // Multipliers: Diamond > Platinum > Gold > Silver > Bronze > Normal
        let rankMultiplier = 1.0;
        let priorityLabel = 'Standard Dispatch';
        if (rank.tier === 6) {
            rankMultiplier = 0.20;
            priorityLabel = 'Diamond Priority (80% Queue Skip)';
        } else if (rank.tier === 5) {
            rankMultiplier = 0.35;
            priorityLabel = 'Platinum Priority (65% Queue Skip)';
        } else if (rank.tier === 4) {
            rankMultiplier = 0.55;
            priorityLabel = 'Gold Priority (45% Queue Skip)';
        } else if (rank.tier === 3) {
            rankMultiplier = 0.75;
            priorityLabel = 'Silver Priority (25% Queue Skip)';
        } else if (rank.tier === 2) {
            rankMultiplier = 0.90;
            priorityLabel = 'Bronze Priority (10% Queue Skip)';
        }

        const effectiveQueueDelay = Math.round(q * rankMultiplier * 6); // 6 mins per effective queue slot
        const basePrep = 10; // 10 minutes baseline prep time

        // Volume scaling: ~1.5 mins per additional jug above 1, capped at 20 mins max extra prep
        const safeJugCount = Math.max(1, parseInt(jugCount) || 1);
        const volumePrep = Math.min(20, Math.round((safeJugCount - 1) * 1.5));

        let transitTime = 10; // default 10 minutes transit
        if (distanceKm !== null && distanceKm !== undefined && !isNaN(distanceKm)) {
            // Water refilling stations deliver locally. Cap effective distance to local radius (max 8 km)
            // so testing outside coverage or remote IP geolocation never inflates ETA to hundreds of minutes.
            const localDist = Math.min(Math.max(0.3, distanceKm), 8.0);
            transitTime = Math.max(5, Math.round(localDist * 3.5)); // ~3.5 mins per km, min 5, max 28 mins
        }

        // Total required operational duration
        const totalDuration = basePrep + volumePrep + effectiveQueueDelay + transitTime;

        // Calculate elapsed minutes if orderDate is provided
        let elapsedMins = 0;
        if (orderDate) {
            const orderTimestamp = new Date(orderDate).getTime();
            if (!isNaN(orderTimestamp)) {
                elapsedMins = Math.max(0, Math.floor((Date.now() - orderTimestamp) / 60000));
            }
        }

        // Dynamic remaining window (countdown)
        const remainingMin = Math.max(3, totalDuration - elapsedMins);
        const remainingMax = remainingMin + 10;

        let etaText = `${remainingMin}–${remainingMax} mins`;
        if (remainingMin <= 5) {
            etaText = 'Arriving shortly';
        }

        // Projected target clock arrival time
        const targetArrival = new Date(Date.now() + remainingMin * 60000);
        const targetTimeStr = targetArrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        return {
            min: remainingMin,
            max: remainingMax,
            text: etaText,
            targetTimeStr: targetTimeStr,
            queueCount: q,
            jugCount: safeJugCount,
            elapsedMins: elapsedMins,
            rankName: rank.name,
            rankTier: rank.tier,
            rankMultiplier,
            priorityLabel,
            distanceKm: (distanceKm !== null && !isNaN(distanceKm)) ? Math.min(distanceKm, 8.0).toFixed(1) : null
        };
    },

    async getMapboxToken() {
        if (State.mapboxToken) return State.mapboxToken;
        try {
            const res = await API.request('get_mapbox_token', 'GET', null, true);
            if (res && res.mapbox_token) {
                State.mapboxToken = res.mapbox_token;
                if (typeof mapboxgl !== 'undefined') mapboxgl.accessToken = res.mapbox_token;
                return res.mapbox_token;
            }
        } catch (e) {}
        return State.mapboxToken || '';
    },

    async locateCustomer(forceGps = false) {
        if (!forceGps && State.userLocation && State.userLocation.lat && State.userLocation.lng) {
            return State.userLocation;
        }

        if (!navigator.geolocation) {
            CustomToast.show("Geolocation is not supported by your browser.", "error");
            return State.userLocation;
        }

        return new Promise((resolve) => {
            CustomToast.show("Detecting your location...", "loading", 4000, "gps-locating");
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    CustomToast.dismiss("gps-locating");
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    State.userLocation = {
                        lat,
                        lng,
                        address: State.userLocation?.address || (State.user?.data?.address || '')
                    };

                    const token = await this.getMapboxToken();
                    if (token) {
                        try {
                            const geoRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`);
                            const geoJson = await geoRes.json();
                            if (geoJson?.features?.[0]?.place_name) {
                                State.userLocation.address = geoJson.features[0].place_name;
                            }
                        } catch (e) {}
                    }

                    CustomToast.show("Location detected successfully!", "success");
                    if (UI._currentView === 'customer_home') {
                        UI.renderCustomerHome();
                    }
                    resolve(State.userLocation);
                },
                (err) => {
                    CustomToast.dismiss("gps-locating");
                    console.warn("GPS error:", err);
                    CustomToast.show("Could not access GPS. You can pin your location on the map.", "info");
                    resolve(State.userLocation);
                },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
            );
        });
    },

    openMapLocationModal({ title = 'Pin Location on Map', initialLat, initialLng, initialAddress = '', onSave }) {
        const existing = document.getElementById('mapbox-picker-modal');
        if (existing) existing.remove();

        const token = State.mapboxToken;
        if (!token) {
            CustomToast.show("Mapbox token is loading, please try again in a moment.", "error");
            return;
        }

        let curLat = parseFloat(initialLat) || (State.userLocation?.lat || 15.5056);
        let curLng = parseFloat(initialLng) || (State.userLocation?.lng || 120.4462);
        let curAddress = initialAddress || (State.userLocation?.address || 'Mababanaba, San Jose, Tarlac');

        const modal = document.createElement('div');
        modal.id = 'mapbox-picker-modal';
        modal.className = 'fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm opacity-0 transition-opacity duration-300';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl w-full max-w-2xl shadow-2xl scale-95 transition-transform duration-300 relative flex flex-col overflow-hidden max-h-[92vh]">
                <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base shadow-inner">
                            <i class="fa-solid fa-map-location-dot"></i>
                        </div>
                        <div>
                            <h3 class="font-black text-slate-800 text-base sm:text-lg leading-tight">${escapeHtml(title)}</h3>
                            <p class="text-[11px] text-slate-400 font-medium">Drag the marker or tap anywhere on the map to set exact coordinates</p>
                        </div>
                    </div>
                    <button type="button" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition active:scale-95" onclick="App.closeMapLocationModal()"><i class="fa-solid fa-times"></i></button>
                </div>

                <div class="p-3 bg-slate-50 border-b border-slate-200 flex gap-2 relative z-10">
                    <div class="relative flex-1">
                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
                        <input type="text" id="map-search-input" placeholder="Search address or paste coordinates e.g. (15.500619, 120.455028)..." class="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-xs">
                        <button type="button" id="map-search-clear" class="hidden absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"><i class="fa-solid fa-circle-xmark"></i></button>
                        <div id="map-search-results" class="hidden absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto z-50"></div>
                    </div>
                    <button type="button" id="map-gps-btn" class="px-3 py-2 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shrink-0 shadow-xs" title="Use current GPS location">
                        <i class="fa-solid fa-crosshairs text-blue-500"></i> <span class="hidden sm:inline">Use GPS</span>
                    </button>
                </div>

                <div class="relative w-full h-[320px] sm:h-[380px] bg-slate-100">
                    <div id="mapbox-map-canvas" class="w-full h-full"></div>
                    <div class="absolute bottom-2 left-2 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-slate-700 border border-slate-200 shadow-sm flex items-center gap-2 z-10">
                        <span>Lat: <span id="map-display-lat" class="font-mono">${curLat.toFixed(6)}</span> • Lng: <span id="map-display-lng" class="font-mono">${curLng.toFixed(6)}</span></span>
                        <button type="button" id="map-manual-edit-btn" class="text-blue-600 hover:text-blue-800 text-[10px] font-black underline cursor-pointer" title="Manually type or paste coordinates">Edit</button>
                    </div>
                </div>

                <div class="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="min-w-0 flex-1">
                        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pinned Location</div>
                        <div id="map-address-display" class="text-xs font-bold text-slate-800 truncate mt-0.5">${escapeHtml(curAddress || 'Selected on map')}</div>
                    </div>
                    <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button type="button" class="btn btn-secondary px-4 py-2 text-xs" onclick="App.closeMapLocationModal()">Cancel</button>
                        <button type="button" id="map-confirm-btn" class="btn btn-primary px-5 py-2 text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20">
                            <i class="fa-solid fa-check"></i> <span>Confirm Pin</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.scale-95')?.classList.remove('scale-95');
        });

        setTimeout(() => {
            if (typeof mapboxgl === 'undefined') {
                CustomToast.show("Mapbox library is still loading. Please try again.", "error");
                return;
            }
            mapboxgl.accessToken = token;

            const map = new mapboxgl.Map({
                container: 'mapbox-map-canvas',
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [curLng, curLat],
                zoom: 14
            });

            map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

            const marker = new mapboxgl.Marker({ draggable: true, color: '#2563eb' })
                .setLngLat([curLng, curLat])
                .addTo(map);

            const reverseGeocode = async (lng, lat) => {
                try {
                    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`);
                    const data = await res.json();
                    if (data?.features?.[0]?.place_name) {
                        curAddress = data.features[0].place_name;
                        const addrEl = document.getElementById('map-address-display');
                        if (addrEl) addrEl.textContent = curAddress;
                    }
                } catch (e) {}
            };

            const updateCoords = (lng, lat, doReverse = true) => {
                curLat = lat;
                curLng = lng;
                const latEl = document.getElementById('map-display-lat');
                const lngEl = document.getElementById('map-display-lng');
                if (latEl) latEl.textContent = lat.toFixed(6);
                if (lngEl) lngEl.textContent = lng.toFixed(6);
                if (doReverse) reverseGeocode(lng, lat);
            };

            marker.on('dragend', () => {
                const lngLat = marker.getLngLat();
                updateCoords(lngLat.lng, lngLat.lat, true);
            });

            map.on('click', (e) => {
                marker.setLngLat(e.lngLat);
                updateCoords(e.lngLat.lng, e.lngLat.lat, true);
            });

            if (!curAddress) reverseGeocode(curLng, curLat);

            const searchInput = document.getElementById('map-search-input');
            const searchResults = document.getElementById('map-search-results');
            const searchClear = document.getElementById('map-search-clear');
            let searchTimeout = null;

            const applyManualCoordinates = (coords) => {
                if (!coords) return;
                marker.setLngLat([coords.lng, coords.lat]);
                map.flyTo({ center: [coords.lng, coords.lat], zoom: 16 });
                updateCoords(coords.lng, coords.lat, true);
                searchResults.classList.add('hidden');
                if (searchInput) searchInput.value = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
                CustomToast.show(`Pinned to (${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)})`, 'info');
            };

            const manualEditBtn = document.getElementById('map-manual-edit-btn');
            if (manualEditBtn) {
                manualEditBtn.onclick = () => {
                    const promptVal = prompt("Enter coordinates (e.g. 15.500619, 120.455028):", `${curLat.toFixed(6)}, ${curLng.toFixed(6)}`);
                    if (promptVal) {
                        const parsed = App.parseCoordinates(promptVal);
                        if (parsed) {
                            applyManualCoordinates(parsed);
                        } else {
                            CustomToast.show("Invalid coordinates format. Please use e.g. 15.500619, 120.455028", "error");
                        }
                    }
                };
            }

            if (searchInput) {
                searchInput.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const parsed = App.parseCoordinates(searchInput.value.trim());
                        if (parsed) {
                            applyManualCoordinates(parsed);
                        }
                    }
                };

                searchInput.oninput = () => {
                    const q = searchInput.value.trim();
                    searchClear.classList.toggle('hidden', !q);
                    clearTimeout(searchTimeout);
                    if (!q) {
                        searchResults.classList.add('hidden');
                        searchResults.innerHTML = '';
                        return;
                    }

                    // Check if input is coordinates like (15.500619, 120.455028)
                    const parsedCoords = App.parseCoordinates(q);
                    if (parsedCoords) {
                        searchResults.innerHTML = `
                            <div class="p-3 bg-blue-50/90 hover:bg-blue-100 cursor-pointer border-b border-blue-200 flex items-center justify-between text-xs transition" id="map-coord-jump">
                                <div class="flex items-center gap-2 min-w-0">
                                    <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
                                        <i class="fa-solid fa-crosshairs"></i>
                                    </div>
                                    <div class="truncate">
                                        <div class="font-bold text-blue-900 flex items-center gap-1.5">
                                            <span>Jump to Coordinates</span>
                                            <span class="text-[9px] bg-blue-200 text-blue-800 px-1.5 py-0.2 rounded font-black uppercase">GPS</span>
                                        </div>
                                        <div class="font-mono text-[11px] text-blue-700 font-bold">${parsedCoords.lat.toFixed(6)}, ${parsedCoords.lng.toFixed(6)}</div>
                                    </div>
                                </div>
                                <span class="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shrink-0 shadow-xs">Go to Pin</span>
                            </div>
                        `;
                        searchResults.classList.remove('hidden');
                        document.getElementById('map-coord-jump').onclick = () => {
                            applyManualCoordinates(parsedCoords);
                        };
                        return;
                    }

                    searchTimeout = setTimeout(async () => {
                        try {
                            const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&country=ph&limit=5`);
                            const data = await res.json();
                            if (data?.features?.length > 0) {
                                searchResults.innerHTML = data.features.map(f => `
                                    <div class="p-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-none flex items-start gap-2 text-xs" data-lng="${f.center[0]}" data-lat="${f.center[1]}" data-name="${escapeHtml(f.place_name)}">
                                        <i class="fa-solid fa-location-dot text-blue-500 mt-0.5 text-[10px] shrink-0"></i>
                                        <span class="font-medium text-slate-700">${escapeHtml(f.place_name)}</span>
                                    </div>
                                `).join('');
                                searchResults.classList.remove('hidden');

                                searchResults.querySelectorAll('[data-lng]').forEach(item => {
                                    item.onclick = () => {
                                        const lng = parseFloat(item.getAttribute('data-lng'));
                                        const lat = parseFloat(item.getAttribute('data-lat'));
                                        const name = item.getAttribute('data-name');
                                        marker.setLngLat([lng, lat]);
                                        map.flyTo({ center: [lng, lat], zoom: 16 });
                                        curAddress = name;
                                        const addrDisp = document.getElementById('map-address-display');
                                        if (addrDisp) addrDisp.textContent = name;
                                        updateCoords(lng, lat, false);
                                        searchResults.classList.add('hidden');
                                        searchInput.value = name;
                                    };
                                });
                            } else {
                                searchResults.innerHTML = '<div class="p-3 text-xs text-slate-400 text-center">No matching locations found</div>';
                                searchResults.classList.remove('hidden');
                            }
                        } catch (e) {}
                    }, 300);
                };

                searchClear.onclick = () => {
                    searchInput.value = '';
                    searchClear.classList.add('hidden');
                    searchResults.classList.add('hidden');
                };
            }

            const gpsBtn = document.getElementById('map-gps-btn');
            if (gpsBtn) {
                gpsBtn.onclick = () => {
                    if (!navigator.geolocation) {
                        CustomToast.show("Geolocation is not supported by your browser.", "error");
                        return;
                    }
                    gpsBtn.classList.add('animate-pulse');
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            gpsBtn.classList.remove('animate-pulse');
                            const lat = pos.coords.latitude;
                            const lng = pos.coords.longitude;
                            marker.setLngLat([lng, lat]);
                            map.flyTo({ center: [lng, lat], zoom: 16 });
                            updateCoords(lng, lat, true);
                            CustomToast.show("Centered to your GPS location!", "success");
                        },
                        (err) => {
                            gpsBtn.classList.remove('animate-pulse');
                            CustomToast.show("Could not access GPS location.", "error");
                        },
                        { enableHighAccuracy: true, timeout: 8000 }
                    );
                };
            }

            const confirmBtn = document.getElementById('map-confirm-btn');
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    App.closeMapLocationModal();
                    if (typeof onSave === 'function') {
                        onSave({
                            lat: curLat,
                            lng: curLng,
                            address: curAddress
                        });
                    }
                };
            }
        }, 150);
    },

    closeMapLocationModal() {
        const modal = document.getElementById('mapbox-picker-modal');
        if (modal) {
            modal.classList.add('opacity-0');
            modal.querySelector('.scale-95')?.classList.add('scale-95');
            setTimeout(() => modal.remove(), 250);
        }
    },

    parseCoordinates(str) {
        if (!str || typeof str !== 'string') return null;
        // Clean outer formatting like parentheses, brackets, @ from Google Maps URLs
        const clean = str.replace(/[()\[\]@]/g, ' ').trim();
        // Match two floating numbers separated by comma, slash, or whitespace
        const match = clean.match(/([-+]?[0-9]*\.?[0-9]+)\s*[,/ ]\s*([-+]?[0-9]*\.?[0-9]+)/);
        if (match) {
            let n1 = parseFloat(match[1]);
            let n2 = parseFloat(match[2]);
            if (!isNaN(n1) && !isNaN(n2)) {
                // If coordinates were entered as [lng, lat] (e.g. from GeoJSON or swapped)
                if ((n1 > 90 || Math.abs(n1) > Math.abs(n2)) && Math.abs(n2) <= 90 && Math.abs(n1) <= 180) {
                    return { lat: n2, lng: n1 };
                }
                if (Math.abs(n1) <= 90 && Math.abs(n2) <= 180) {
                    return { lat: n1, lng: n2 };
                }
            }
        }
        return null;
    },

    onCoordinatePasteInput(val) {
        if (!val) return;
        const parsed = this.parseCoordinates(val);
        if (parsed) {
            const latInput = document.getElementById('set_station_lat');
            const lngInput = document.getElementById('set_station_lng');
            if (latInput) latInput.value = parsed.lat;
            if (lngInput) lngInput.value = parsed.lng;
            CustomToast.show(`Coordinates parsed: Lat ${parsed.lat.toFixed(6)}, Lng ${parsed.lng.toFixed(6)}`, 'info');
        }
    },

    onLatInput(inputEl) {
        if (!inputEl || !inputEl.value) return;
        const parsed = this.parseCoordinates(inputEl.value);
        if (parsed) {
            inputEl.value = parsed.lat;
            const lngInput = document.getElementById('set_station_lng');
            if (lngInput) lngInput.value = parsed.lng;
            CustomToast.show(`Coordinates parsed: Lat ${parsed.lat.toFixed(6)}, Lng ${parsed.lng.toFixed(6)}`, 'info');
        }
    },

    async handleManualStationLocation(event) {
        if (event) event.preventDefault();
        const latInput = document.getElementById('set_station_lat');
        const lngInput = document.getElementById('set_station_lng');
        const pasteInput = document.getElementById('set_station_coord_paste');

        let lat = null;
        let lng = null;

        if (pasteInput && pasteInput.value.trim()) {
            const parsed = this.parseCoordinates(pasteInput.value.trim());
            if (parsed) {
                lat = parsed.lat;
                lng = parsed.lng;
                if (latInput) latInput.value = lat;
                if (lngInput) lngInput.value = lng;
            }
        }

        if (lat === null || lng === null) {
            const rawLat = latInput ? latInput.value.trim() : '';
            const rawLng = lngInput ? lngInput.value.trim() : '';

            const parsedFromLat = this.parseCoordinates(rawLat);
            if (parsedFromLat) {
                lat = parsedFromLat.lat;
                lng = parsedFromLat.lng;
                if (latInput) latInput.value = lat;
                if (lngInput) lngInput.value = lng;
            } else {
                lat = parseFloat(rawLat);
                lng = parseFloat(rawLng);
            }
        }

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            CustomToast.show("Please enter valid coordinates like (15.500619, 120.455028)", "error");
            return;
        }

        await this.saveStationLocation(lat, lng);
    },

    openStationMapPicker() {
        const latInput = document.getElementById('set_station_lat');
        const lngInput = document.getElementById('set_station_lng');
        const pasteInput = document.getElementById('set_station_coord_paste');

        let initLat = parseFloat(latInput?.value);
        let initLng = parseFloat(lngInput?.value);

        if (pasteInput && pasteInput.value.trim()) {
            const parsed = this.parseCoordinates(pasteInput.value.trim());
            if (parsed) {
                initLat = parsed.lat;
                initLng = parsed.lng;
            }
        }

        const station = State.adminData?.station || {};
        if (isNaN(initLat)) initLat = parseFloat(station.latitude) || 15.5056;
        if (isNaN(initLng)) initLng = parseFloat(station.longitude) || 120.4462;

        this.openMapLocationModal({
            title: 'Set Station Coordinates',
            initialLat: initLat,
            initialLng: initLng,
            initialAddress: station.address || 'Central Station',
            onSave: (pos) => {
                if (latInput) latInput.value = pos.lat.toFixed(6);
                if (lngInput) lngInput.value = pos.lng.toFixed(6);
                if (pasteInput) pasteInput.value = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
                this.saveStationLocation(pos.lat, pos.lng);
            }
        });
    },

    async saveStationLocation(lat, lng) {
        try {
            CustomToast.show("Saving station pin...", "loading", 4000, "station-loc-save");
            const res = await API.request('admin_update_station_location', 'POST', { latitude: lat, longitude: lng });
            CustomToast.dismiss("station-loc-save");
            if (res && res.success) {
                CustomToast.show("Station map location updated!", "success");
                if (State.adminData && State.adminData.station) {
                    State.adminData.station.latitude = lat;
                    State.adminData.station.longitude = lng;
                }
                if (UI._currentView === 'admin_settings') {
                    UI.renderAdminSettings();
                }
            } else {
                CustomToast.show(res?.error || "Failed to save station location.", "error");
            }
        } catch (e) {
            CustomToast.dismiss("station-loc-save");
            CustomToast.show("Failed to update station location.", "error");
        }
    },

    async saveCustomerLocation(lat, lng, address = '') {
        try {
            CustomToast.show("Saving delivery pin...", "loading", 4000, "cust-loc-save");
            const res = await API.request('customer_update_location', 'POST', { latitude: lat, longitude: lng, address });
            CustomToast.dismiss("cust-loc-save");
            if (res && res.success) {
                CustomToast.show("Delivery pin saved successfully!", "success");
                State.userLocation = { lat, lng, address: address || State.userLocation?.address || '' };
                if (State.user && State.user.data) {
                    State.user.data.latitude = lat;
                    State.user.data.longitude = lng;
                    if (address) State.user.data.address = address;
                }
                if (UI._currentView === 'customer_home') {
                    UI.renderCustomerHome();
                }
            } else {
                CustomToast.show(res?.error || "Failed to save delivery location.", "error");
            }
        } catch (e) {
            CustomToast.dismiss("cust-loc-save");
            CustomToast.show("Failed to update delivery location.", "error");
        }
    },

    async acceptOrderFromProof(orderId) {
        if (!orderId) return;
        State.viewedReceipts[orderId] = true;
        const modal = document.querySelector('.fixed.z-\\[110\\]');
        if (modal) modal.remove();
        await this.updateOrderStatus(orderId, 'Preparing');
    },

    async markCustomersSeen() {
        try {
            const res = await API.request('sa_mark_customers_seen', 'POST');
            if (res && res.success) {
                State.saLastSeenCustomerTime = res.last_seen_customers;
                State.saNewCustomers = [];
                State.saCustomerFilter = 'all';
                UI.renderSuperAdminDashboard();
                CustomToast.show("Marked new customers as viewed.", "success");
            }
        } catch (e) {}
    },

    async checkSuperAdminNewCustomers() {
        if (State.user?.type !== 'admin' || State.user?.data?.role !== 'Super Admin') return;
        try {
            const res = await API.request('sa_get_new_customers', 'GET', null, true);
            if (res && Array.isArray(res.new_customers)) {
                const prevCount = State.saNewCustomers?.length || 0;
                State.saNewCustomers = res.new_customers;
                State.saLastSeenCustomerTime = res.last_seen_customers;

                if (res.new_customers.length > prevCount && prevCount > 0) {
                    const newest = res.new_customers[0];
                    CustomToast.show(`New Customer Registered: ${newest.full_name || 'Customer'} (${newest.contact_number})`, 'info', 7000);
                    if (UI._currentView === 'sa_dashboard') {
                        UI.renderSuperAdminDashboard();
                    }
                }
            }
        } catch (e) {}
    },
    
    async requestNotificationPermission() {
        if ("Notification" in window && Notification.permission === "default") {
            const p = await Notification.requestPermission();
            if (p === "granted") {
                await this.subscribeToPush(false);
            }
        }
    },
    
    sendNativeNotification(title, body, tag = null, inAppFeedback = false) {
        if (inAppFeedback) {
            this.playNotificationChime(tag);
            if (typeof CustomToast !== 'undefined') {
                CustomToast.show(body ? `${title}: ${body}` : title, 'info', 5000, null, tag);
            }
        }
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
                }).catch(() => {
                    new Notification(title, { body: body, icon: './logo.png', tag: tag || undefined });
                });
            } catch (e) {
                try {
                    new Notification(title, { body: body, icon: './logo.png', tag: tag || undefined });
                } catch(err) {}
            }
        }
    },

    _recentNotifs: new Map(),

    shouldNotify(key, ttlMs = 12000) {
        if (!key) return true;
        const now = Date.now();
        if (this._recentNotifs.has(key)) {
            const last = this._recentNotifs.get(key);
            if (now - last < ttlMs) {
                return false;
            }
        }
        this._recentNotifs.set(key, now);
        if (this._recentNotifs.size > 100) {
            for (const [k, v] of this._recentNotifs.entries()) {
                if (now - v > 60000) this._recentNotifs.delete(k);
            }
        }
        return true;
    },

    playNotificationChime(key = null) {
        if (key && !this.shouldNotify('chime-' + key, 4000)) return;
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

    broadcastChannel: null,
    _syncInitialized: false,

    initBroadcastSync() {
        if (typeof window === 'undefined') return;
        if (this._syncInitialized) return;
        this._syncInitialized = true;

        // 1. BroadcastChannel API for modern cross-tab messaging
        if ('BroadcastChannel' in window) {
            try {
                if (!this.broadcastChannel) {
                    this.broadcastChannel = new BroadcastChannel('mbbnb_orders_sync');
                    this.broadcastChannel.onmessage = (event) => {
                        this.handleBroadcastMessage(event.data);
                    };
                }
            } catch (e) {
                console.warn('BroadcastChannel not initialized:', e);
            }
        }

        // 2. Storage event fallback (0ms sync across tabs, windows, and iframes on all browsers)
        window.addEventListener('storage', (e) => {
            if (e.key === 'mbbnb_orders_sync_event' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    this.handleBroadcastMessage(parsed);
                } catch(err) {}
            }
        });
    },

    broadcastOrderUpdate(payload) {
        if (!payload) return;
        // 1. BroadcastChannel
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage(payload);
            } catch (e) {
                console.warn('BroadcastChannel postMessage error:', e);
            }
        }
        // 2. LocalStorage event (fires immediately in 0ms on all other tabs on this device)
        try {
            const eventPayload = JSON.stringify({ ...payload, _ts: Date.now() });
            localStorage.setItem('mbbnb_orders_sync_event', eventPayload);
        } catch(e) {}
    },

    async handleBroadcastMessage(data) {
        if (!data || !data.type) return;

        if (data.type === 'ORDER_STATUS_CHANGED' || data.type === 'NEW_ORDER_PLACED') {
            const rawSon = data.station_order_number || data.orderId || data.order_id;
            const notifKey = rawSon ? (data.type === 'ORDER_STATUS_CHANGED' ? `order-${rawSon}-${data.status || 'chg'}` : `order-${rawSon}`) : null;
            const shouldAlert = !notifKey || this.shouldNotify(notifKey, 14000);
            const orderLabel = data.station_order_number ? `#${data.station_order_number}` : (data.orderId || data.order_id ? `#${data.orderId || data.order_id}` : 'Order');
            
            if (shouldAlert) {
                // 1. In-app audible chime
                this.playNotificationChime(notifKey);

                // 2. Visible in-app toast
                if (typeof CustomToast !== 'undefined') {
                    if (data.type === 'ORDER_STATUS_CHANGED') {
                        CustomToast.show(`Order ${orderLabel} status is now ${data.status || 'Updated'}`, 'info', 5000, null, notifKey);
                    } else if (data.type === 'NEW_ORDER_PLACED') {
                        CustomToast.show(`New Order ${orderLabel} has been placed!`, 'info', 5000, null, notifKey);
                    }
                }

                // 3. Native notification if document is hidden
                if (document.hidden && this.sendNativeNotification) {
                    const title = data.type === 'ORDER_STATUS_CHANGED' ? 'Order Update' : 'New Order';
                    const body = data.type === 'ORDER_STATUS_CHANGED' 
                        ? `Order ${orderLabel} status is now ${data.status || 'Updated'}` 
                        : `New Order ${orderLabel} placed!`;
                    this.sendNativeNotification(title, body, notifKey || ('sync-' + Date.now()), false);
                }
            }

            // 4. Invalidate caches
            if (window.UI && window.UI._prefetchCache) {
                delete window.UI._prefetchCache['admin_dashboard_data'];
                delete window.UI._prefetchCache['delivery_dashboard_data'];
                delete window.UI._prefetchCache['delivery_dashboard'];
                delete window.UI._prefetchCache['customer_orders'];
                delete window.UI._prefetchCache['customer_dashboard'];
            }

            // 5. Instantly update in-memory state for matching order in 0ms
            if (data.type === 'ORDER_STATUS_CHANGED') {
                const oid = data.orderId || data.order_id;
                const son = data.station_order_number;
                const newStatus = data.status;

                if (State.adminData?.orders) {
                    State.adminData.orders.forEach(o => {
                        if ((son && o.station_order_number === son) || (oid && o.order_id == oid)) {
                            o.order_status = newStatus;
                        }
                    });
                }
                const delivOrders = State.deliveryData?.orders || State.deliveryData?.deliveries;
                if (delivOrders) {
                    delivOrders.forEach(o => {
                        if ((son && o.station_order_number === son) || (oid && o.order_id == oid)) {
                            o.order_status = newStatus;
                        }
                    });
                }
                if (State.myOrders && Array.isArray(State.myOrders)) {
                    State.myOrders.forEach(o => {
                        if ((son && o.station_order_number === son) || (oid && o.order_id == oid)) {
                            o.order_status = newStatus;
                        }
                    });
                }

                // Immediately re-render active screen
                if (window.UI) {
                    if (window.UI._currentView === 'admin_dashboard') {
                        window.UI._updateAdminOrdersList();
                    } else if (window.UI._currentView === 'delivery_dashboard') {
                        window.UI._updateDeliveryList();
                    } else if (window.UI._currentView === 'customer_orders') {
                        window.UI._updateOrdersList();
                    } else if (window.UI._currentView === 'customer_dashboard' && typeof window.UI._updateCustomerDashboardActiveOrders === 'function') {
                        window.UI._updateCustomerDashboardActiveOrders();
                    }
                }
            }

            // 6. Fast background server reconciliation
            try {
                if (window.UI && window.UI._currentView === 'admin_dashboard') {
                    const freshAdmin = await API.request('get_admin_dashboard_data', 'GET', null, true);
                    if (freshAdmin && freshAdmin.orders) {
                        State.adminData = freshAdmin;
                        window.UI._updateAdminOrdersList();
                    }
                } else if (window.UI && window.UI._currentView === 'delivery_dashboard') {
                    const freshDeliv = await API.request('get_admin_dashboard_data', 'GET', null, true);
                    if (freshDeliv && freshDeliv.orders) {
                        State.deliveryData = freshDeliv;
                        window.UI._updateDeliveryList();
                    }
                } else if (window.UI && window.UI._currentView === 'customer_orders') {
                    const freshOrders = await API.request('get_customer_orders', 'GET', null, true);
                    if (freshOrders && Array.isArray(freshOrders)) {
                        State.myOrders = freshOrders;
                        window.UI._updateOrdersList();
                    }
                } else if (window.UI && window.UI._currentView === 'customer_dashboard') {
                    const freshOrders = await API.request('get_customer_orders', 'GET', null, true);
                    if (freshOrders && Array.isArray(freshOrders)) {
                        State.myOrders = freshOrders;
                        if (typeof window.UI._updateCustomerDashboardActiveOrders === 'function') {
                            window.UI._updateCustomerDashboardActiveOrders();
                        }
                    }
                }
            } catch (err) {}
        }
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
    
    _proofCache: new Map(),

    async viewProof(orderId) {
        if (!orderId) { CustomToast.show("No payment proof provided", "error"); return; }

        if (this._proofCache.has(orderId)) {
            this._displayProofModal(orderId, this._proofCache.get(orderId));
            return;
        }

        CustomToast.show("Loading receipt...", "loading", 6000, "proof-loading");
        
        try {
            const res = await API.request('get_payment_proof', 'POST', { order_id: orderId }, true);
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

                this._proofCache.set(orderId, base64);
                this._displayProofModal(orderId, base64);
            } else {
                CustomToast.show(res?.error || "No payment proof found for this order", "error");
            }
        } catch (e) {
            CustomToast.dismiss("proof-loading");
            console.error(e);
            CustomToast.show("Error loading payment proof", "error");
        }
    },

    _displayProofModal(orderId, base64) {
        State.viewedReceipts[orderId] = true;
        if (State.user?.type === 'admin') {
            API.request('admin_mark_receipt_viewed', 'POST', { order_id: orderId }, true).catch(() => {});
        }
        if (UI._currentView === 'admin_dashboard' && State.adminData?.orders) {
            const matched = State.adminData.orders.find(o => o.order_id == orderId);
            if (matched) matched.receipt_viewed = 1;
            const cardWrap = document.querySelector(`[data-accept-container-id="${orderId}"]`);
            if (cardWrap) {
                cardWrap.innerHTML = `
                    <button type="button" onclick="App.updateOrderStatus(${orderId}, 'Preparing')" class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2">
                        <i class="fa-solid fa-circle-check text-sm"></i>
                        <span>Accept Order</span>
                    </button>
                `;
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
                <div class="mt-4 flex flex-wrap justify-between items-center gap-3">
                    <a id="proof-download-link" download="Receipt-Order-${orderId}.jpg" class="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-xl text-sm flex items-center gap-2 transition active:scale-95">
                        <i class="fa-solid fa-download"></i> Save Receipt
                    </a>
                    <div class="flex items-center gap-2">
                        ${(State.user?.type === 'admin') ? `
                            <button type="button" onclick="App.acceptOrderFromProof(${orderId})" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer">
                                <i class="fa-solid fa-circle-check"></i> Accept Order
                            </button>
                        ` : ''}
                        <button class="btn btn-primary" onclick="this.closest('.fixed').remove()">Close</button>
                    </div>
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
                if (res.auth_token) {
                    State.authToken = res.auth_token;
                    try {
                        sessionStorage.setItem('auth_token', res.auth_token);
                        localStorage.setItem('auth_token', res.auth_token);
                    } catch(e) {}
                }
                try {
                    localStorage.removeItem('cache_get_customer_orders');
                    localStorage.removeItem('cache_get_stations');
                    State.stations = null;
                    State.myOrders = null;
                    localStorage.setItem('cache_check_session', JSON.stringify({
                        data: {
                            logged_in: true,
                            type: type,
                            data: type === 'customer' ? res : res.admin,
                            auth_token: res.auth_token || State.authToken,
                            csrf_token: res.csrf_token || State.csrfToken,
                            mapbox_token: State.mapboxToken
                        },
                        cachedAt: Date.now()
                    }));
                } catch (e) {}

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
                    <span id="profile-identity-address-text" class="truncate text-slate-500">${escapeHtml(address)}</span>
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

                        ${isCustomer ? `
                        <div>
                            <div class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">Delivery Location & Address</div>
                            <div class="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
                                <button type="button" onclick="App.openChangeAddressModal()" class="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-blue-50/40 active:bg-blue-100/50 transition text-left cursor-pointer group">
                                    <div class="flex items-center gap-3 min-w-0 flex-1">
                                        <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <i class="fa-solid fa-house-chimney text-xs"></i>
                                        </div>
                                        <div class="min-w-0 flex-1 pr-2">
                                            <div class="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Default Delivery Address</div>
                                            <div id="profile-default-address-text" class="text-[10px] text-slate-500 font-medium truncate">${escapeHtml(State.user?.data?.address || State.userLocation?.address || 'No address set')}</div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-1.5 shrink-0">
                                        <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">Edit</span>
                                        <i class="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"></i>
                                    </div>
                                </button>
                                <button type="button" onclick="App.openMapLocationModal({ title: 'Set Delivery Location', initialLat: State.userLocation?.lat, initialLng: State.userLocation?.lng, initialAddress: State.userLocation?.address || State.user?.data?.address, onSave: (pos) => App.saveCustomerLocation(pos.lat, pos.lng, pos.address) })" class="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-blue-50/40 active:bg-blue-100/50 transition text-left cursor-pointer group">
                                    <div class="flex items-center gap-3 min-w-0 flex-1">
                                        <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <i class="fa-solid fa-map-location-dot text-xs"></i>
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <div class="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Pin Delivery Coordinates</div>
                                            <div class="text-[10px] text-slate-400 truncate">${State.userLocation?.lat ? `Lat: ${parseFloat(State.userLocation.lat).toFixed(4)}, Lng: ${parseFloat(State.userLocation.lng).toFixed(4)}` : 'Tap to pin your location on map'}</div>
                                        </div>
                                    </div>
                                    <i class="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0"></i>
                                </button>
                            </div>
                        </div>
                        ` : ''}

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

    openChangeAddressModal() {
        this.closeChangeAddressModal();
        const currentAddr = State.user?.data?.address || State.userLocation?.address || '';
        const modalDiv = document.createElement('div');
        modalDiv.id = 'user-change-address-modal-container';
        modalDiv.innerHTML = `
            <div id="user-change-address-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 opacity-0 transition-opacity duration-200" onclick="if(event.target === this) App.closeChangeAddressModal()">
                <div class="user-change-address-card bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl shadow-blue-500/15 border border-blue-200/80 ring-2 ring-blue-500/30 transform scale-95 transition-all duration-200 relative">
                    <div class="flex justify-between items-center mb-4">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm shrink-0">
                                <i class="fa-solid fa-house-chimney"></i>
                            </div>
                            <h3 class="font-black text-slate-800 text-base">Default Address</h3>
                        </div>
                        <button type="button" onclick="App.closeChangeAddressModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition active:scale-95 cursor-pointer" title="Close">
                            <i class="fa-solid fa-xmark text-sm"></i>
                        </button>
                    </div>

                    <form onsubmit="App.saveCustomerAddress(event)" class="space-y-4">
                        <div>
                            <label class="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">Street / House / Delivery Address</label>
                            <textarea id="modal-customer-address-input" rows="3" required placeholder="e.g. Purok 3, Mababanaba, San Jose, Tarlac" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-xs sm:text-sm text-slate-800 font-medium">${escapeHtml(currentAddr)}</textarea>
                            <p class="text-[10px] text-slate-400 mt-1 px-0.5">This address will be loaded automatically on checkout.</p>
                        </div>

                        <div class="flex items-center gap-2 pt-2">
                            <button type="button" onclick="App.closeChangeAddressModal()" class="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer">
                                Cancel
                            </button>
                            <button type="submit" id="btn-save-customer-address" class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition active:scale-95 shadow-md shadow-blue-500/20 cursor-pointer">
                                Save Address
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        window._addressModalEscHandler = (e) => {
            if (e.key === 'Escape') this.closeChangeAddressModal();
        };
        window.addEventListener('keydown', window._addressModalEscHandler);

        requestAnimationFrame(() => {
            const backdrop = document.getElementById('user-change-address-backdrop');
            if (backdrop) {
                backdrop.classList.remove('opacity-0');
                const card = backdrop.querySelector('.user-change-address-card');
                if (card) card.classList.remove('scale-95');
                const textarea = document.getElementById('modal-customer-address-input');
                if (textarea) {
                    textarea.focus();
                    textarea.select();
                }
            }
        });
    },

    closeChangeAddressModal() {
        const container = document.getElementById('user-change-address-modal-container');
        if (!container) return;
        if (window._addressModalEscHandler) {
            window.removeEventListener('keydown', window._addressModalEscHandler);
            window._addressModalEscHandler = null;
        }
        const backdrop = document.getElementById('user-change-address-backdrop');
        if (backdrop) {
            backdrop.classList.add('opacity-0');
            const card = backdrop.querySelector('.user-change-address-card');
            if (card) card.classList.add('scale-95');
        }
        setTimeout(() => {
            if (container) container.remove();
        }, 200);
    },

    async saveCustomerAddress(e) {
        if (e && e.preventDefault) e.preventDefault();
        const input = document.getElementById('modal-customer-address-input');
        if (!input) return;
        const newAddress = input.value.trim();
        if (!newAddress) {
            CustomToast.show('Please enter a delivery address.', 'error');
            return;
        }

        const saveBtn = document.getElementById('btn-save-customer-address');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...';
        }

        try {
            if (!State.authToken && typeof sessionStorage !== 'undefined') {
                State.authToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token') || null;
            }

            const payload = { 
                address: newAddress, 
                customer_id: State.user?.data?.customer_id,
                csrf_token: State.csrfToken 
            };
            if (State.authToken) {
                payload.auth_token = State.authToken;
            }

            const res = await API.request('customer_update_address', 'POST', payload);
            if (res && res.success) {
                if (res.auth_token) {
                    State.authToken = res.auth_token;
                    try {
                        sessionStorage.setItem('auth_token', res.auth_token);
                        localStorage.setItem('auth_token', res.auth_token);
                    } catch(e) {}
                }

                if (State.user && State.user.data) {
                    State.user.data.address = newAddress;
                }
                if (!State.userLocation) State.userLocation = {};
                State.userLocation.address = newAddress;

                try {
                    const raw = localStorage.getItem('cache_check_session');
                    if (raw) {
                        const cached = JSON.parse(raw);
                        if (cached && cached.data && cached.data.data) {
                            cached.data.data.address = newAddress;
                            localStorage.setItem('cache_check_session', JSON.stringify(cached));
                        }
                    }
                } catch(ign) {}

                const addrLabel = document.getElementById('profile-default-address-text');
                if (addrLabel) addrLabel.innerText = newAddress;
                const identityAddr = document.getElementById('profile-identity-address-text');
                if (identityAddr) identityAddr.innerText = newAddress;
                const coAddr = document.getElementById('co-address');
                if (coAddr) coAddr.value = newAddress;

                CustomToast.show('Default address updated successfully!', 'success');
                this.closeChangeAddressModal();
            } else {
                CustomToast.show(res?.error || 'Failed to update address.', 'error');
            }
        } catch (err) {
            console.error('saveCustomerAddress error:', err);
            if (err.message && (err.message.includes('Unauthorized') || err.message.includes('log in'))) {
                CustomToast.show('Your session has expired. Please sign in to save your address.', 'warning');
                setTimeout(() => {
                    UI.navigate('login');
                }, 1500);
            } else {
                CustomToast.show(err.message || 'Failed to update address.', 'error');
            }
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerText = 'Save Address';
            }
        }
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
            if (last.delivery_latitude && last.delivery_longitude) {
                data.append('delivery_latitude', last.delivery_latitude);
                data.append('delivery_longitude', last.delivery_longitude);
            } else if (State.userLocation?.lat && State.userLocation?.lng) {
                data.append('delivery_latitude', State.userLocation.lat);
                data.append('delivery_longitude', State.userLocation.lng);
            }

            try {
                const res = await API.request('place_order', 'POST', data);
                if (res.success) {
                    State.cart = [];
                    State.myOrders = null;
                    if (window.UI && window.UI._prefetchCache) {
                        delete window.UI._prefetchCache['customer_orders'];
                        delete window.UI._prefetchCache['customer_dashboard'];
                    }
                    State.customerOrderTab = 'active';
                    const placedOrderNum = res.station_order_number || res.order_id;
                    if (placedOrderNum) {
                        this.shouldNotify(`order-${placedOrderNum}`, 18000);
                        this.shouldNotify(`order-${placedOrderNum}-Placed`, 18000);
                    }
                    this.playNotificationChime(`order-${placedOrderNum}`);
                    CustomToast.show('Quick Reorder placed successfully!', 'success', 3000, `placed-${placedOrderNum}`);
                    this.broadcastOrderUpdate({
                        type: 'NEW_ORDER_PLACED',
                        station_order_number: res.station_order_number,
                        order_id: res.order_id
                    });
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
        const station = (State.stations || []).find(s => s.station_id == State.selectedStation) || (State.stations || [])[0] || {};
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
            proofBase64 = await this.compressImage(fileInput.files[0], 1200, 1200, 0.8);
        } else if (method === 'Maya') {
            const fileInput = document.getElementById('co-receipt-maya');
            if (fileInput.files.length === 0) { this.setLoading(btn, false); return CustomToast.show('Please upload your Maya receipt.', 'error'); }
            proofBase64 = await this.compressImage(fileInput.files[0], 1200, 1200, 0.8);
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
        
        const delivLat = document.getElementById('co-delivery-lat')?.value || State.userLocation?.lat || '';
        const delivLng = document.getElementById('co-delivery-lng')?.value || State.userLocation?.lng || '';
        if (delivLat && delivLng) {
            data.append('delivery_latitude', delivLat);
            data.append('delivery_longitude', delivLng);
        }
        
        try {
            const res = await API.request('place_order', 'POST', data);
            if (res.success) {
                State.cart = [];
                State.myOrders = null;
                if (window.UI && window.UI._prefetchCache) {
                    delete window.UI._prefetchCache['customer_orders'];
                    delete window.UI._prefetchCache['customer_dashboard'];
                }
                State.customerOrderTab = 'active';
                const placedOrderNum = res.station_order_number || res.order_id;
                if (placedOrderNum) {
                    this.shouldNotify(`order-${placedOrderNum}`, 18000);
                    this.shouldNotify(`order-${placedOrderNum}-Placed`, 18000);
                }
                this.playNotificationChime(`order-${placedOrderNum}`);
                CustomToast.show('Your order has been placed successfully.', 'success', 3000, `placed-${placedOrderNum}`);
                this.broadcastOrderUpdate({
                    type: 'NEW_ORDER_PLACED',
                    station_order_number: res.station_order_number,
                    order_id: res.order_id
                });
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

        // 1. Optimistic update in Admin State
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

        // 2. Optimistic update in Delivery Staff State (.orders and .deliveries)
        const delivList = State.deliveryData?.orders || State.deliveryData?.deliveries;
        if (delivList) {
            const match = delivList.find(o => o.order_id == orderId);
            if (match) {
                if (!prevStatus) prevStatus = match.order_status;
                if (!targetSon) targetSon = match.station_order_number;
                delivList.forEach(o => {
                    if (targetSon && o.station_order_number === targetSon) {
                        o.order_status = status;
                    } else if (!targetSon && o.order_id == orderId) {
                        o.order_status = status;
                    }
                });
            }
        }

        // 3. Optimistic update in Customer Orders State
        if (State.myOrders && Array.isArray(State.myOrders)) {
            const match = State.myOrders.find(o => o.order_id == orderId);
            if (match) {
                if (!prevStatus) prevStatus = match.order_status;
                if (!targetSon) targetSon = match.station_order_number;
                State.myOrders.forEach(o => {
                    if (targetSon && o.station_order_number === targetSon) {
                        o.order_status = status;
                    } else if (!targetSon && o.order_id == orderId) {
                        o.order_status = status;
                    }
                });
            }
        }

        // 4. Update known status maps so local polling won't re-trigger self-notification
        const orderKey = String(orderId);
        if (State.knownAdminOrderStatuses) State.knownAdminOrderStatuses.set(orderKey, status);
        if (State.knownCustomerOrderStatuses) State.knownCustomerOrderStatuses.set(orderKey, status);

        // 5. Invalidate prefetch caches
        if (UI._prefetchCache) {
            delete UI._prefetchCache['admin_dashboard_data'];
            delete UI._prefetchCache['delivery_dashboard_data'];
            delete UI._prefetchCache['delivery_dashboard'];
            delete UI._prefetchCache['customer_orders'];
            delete UI._prefetchCache['customer_dashboard'];
        }

        // 6. Instant UI re-render (0ms)
        if (!skipRender) {
            if (UI._currentView === 'admin_dashboard') {
                UI._updateAdminOrdersList();
            } else if (UI._currentView === 'delivery_dashboard') {
                UI._updateDeliveryList();
            } else if (UI._currentView === 'customer_orders') {
                UI._updateOrdersList();
            } else if (UI._currentView === 'customer_dashboard' && typeof UI._updateCustomerDashboardActiveOrders === 'function') {
                UI._updateCustomerDashboardActiveOrders();
            }
        }

        // 7. Instant user feedback (toast + chime)
        this.playNotificationChime();
        const displayNum = targetSon ? `#${targetSon}` : `#${orderId}`;
        CustomToast.show(`Order ${displayNum} status updated to ${status}`, 'success', 3000);

        // 8. Instant cross-tab broadcast
        this.broadcastOrderUpdate({
            type: 'ORDER_STATUS_CHANGED',
            orderId: orderId,
            status: status,
            station_order_number: targetSon
        });

        // 9. Send API request in background
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
                const dOrders = State.deliveryData?.orders || State.deliveryData?.deliveries;
                if (dOrders) {
                    dOrders.forEach(o => {
                        if (targetSon && o.station_order_number === targetSon) o.order_status = prevStatus;
                        else if (!targetSon && o.order_id == orderId) o.order_status = prevStatus;
                    });
                }
                if (State.myOrders && Array.isArray(State.myOrders)) {
                    State.myOrders.forEach(o => {
                        if (targetSon && o.station_order_number === targetSon) o.order_status = prevStatus;
                        else if (!targetSon && o.order_id == orderId) o.order_status = prevStatus;
                    });
                }
                if (UI._currentView === 'admin_dashboard') UI._updateAdminOrdersList();
                if (UI._currentView === 'delivery_dashboard') UI._updateDeliveryList();
                if (UI._currentView === 'customer_orders') UI._updateOrdersList();
                if (UI._currentView === 'customer_dashboard' && typeof UI._updateCustomerDashboardActiveOrders === 'function') {
                    UI._updateCustomerDashboardActiveOrders();
                }
                this.broadcastOrderUpdate({
                    type: 'ORDER_STATUS_CHANGED',
                    orderId: orderId,
                    status: prevStatus,
                    station_order_number: targetSon
                });
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
        const allowPour = document.getElementById('set_allow_pour')?.checked ? 1 : 0;
        const allowBorrow = document.getElementById('set_allow_borrow')?.checked ? 1 : 0;
        const allowBuy = document.getElementById('set_allow_buy')?.checked ? 1 : 0;

        if (allowPour === 0 && allowBorrow === 0 && allowBuy === 0) {
            return CustomToast.show('Please enable at least one container option (Pour, Borrow, or Buy).', 'error');
        }

        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const data = new FormData();
        data.append('shipping_fee', document.getElementById('set_shipping').value);
        data.append('jug_discount', '0.00');
        data.append('new_jug_price', document.getElementById('set_jug_price').value);
        data.append('allow_pour', allowPour);
        data.append('allow_swap', allowPour);
        data.append('allow_borrow', allowBorrow);
        data.append('allow_buy', allowBuy);

        try {
            const res = await API.request('admin_update_logistics', 'POST', data);
            if (res && res.error) {
                CustomToast.show(res.error, 'error');
            } else {
                if (State.adminData?.station) {
                    State.adminData.station.shipping_fee = document.getElementById('set_shipping').value;
                    State.adminData.station.new_jug_price = document.getElementById('set_jug_price').value;
                    State.adminData.station.allow_pour = allowPour;
                    State.adminData.station.allow_swap = allowPour;
                    State.adminData.station.allow_borrow = allowBorrow;
                    State.adminData.station.allow_buy = allowBuy;
                }
                if (State.stations && Array.isArray(State.stations)) {
                    const currSid = State.adminData?.station?.station_id;
                    const stMatch = State.stations.find(s => s.station_id == currSid);
                    if (stMatch) {
                        stMatch.shipping_fee = document.getElementById('set_shipping').value;
                        stMatch.new_jug_price = document.getElementById('set_jug_price').value;
                        stMatch.allow_pour = allowPour;
                        stMatch.allow_swap = allowPour;
                        stMatch.allow_borrow = allowBorrow;
                        stMatch.allow_buy = allowBuy;
                    }
                }
                CustomToast.show('Logistics & container options configuration updated.', 'success');
            }
        } catch(err) {
            CustomToast.show(err.message || 'Failed to update configuration.', 'error');
        }
        this.setLoading(btn, false);
    },

    applyContainerPreset(preset) {
        const pourEl = document.getElementById('set_allow_pour');
        const borrowEl = document.getElementById('set_allow_borrow');
        const buyEl = document.getElementById('set_allow_buy');
        if (!pourEl || !borrowEl) return;

        if (preset === 'pour_only') {
            pourEl.checked = true;
            borrowEl.checked = false;
            if (buyEl) buyEl.checked = false;
            CustomToast.show('Preset applied: Pour Only (Customer Jugs/Refill)', 'info');
        } else if (preset === 'borrow_only') {
            pourEl.checked = false;
            borrowEl.checked = true;
            if (buyEl) buyEl.checked = false;
            CustomToast.show('Preset applied: Borrow Jugs Only', 'info');
        } else if (preset === 'all') {
            pourEl.checked = true;
            borrowEl.checked = true;
            if (buyEl) buyEl.checked = true;
            CustomToast.show('Preset applied: All Container Options Enabled', 'info');
        }
        this.handleContainerOptionToggle();
    },

    handleContainerOptionToggle() {
        const pourEl = document.getElementById('set_allow_pour');
        const borrowEl = document.getElementById('set_allow_borrow');
        const buyEl = document.getElementById('set_allow_buy');
        const badge = document.getElementById('services_summary_badge');
        
        const isPour = pourEl?.checked;
        const isBorrow = borrowEl?.checked;
        const isBuy = buyEl?.checked;

        const cardPour = document.getElementById('card_allow_pour');
        const cardBorrow = document.getElementById('card_allow_borrow');
        const cardBuy = document.getElementById('card_allow_buy');

        if (cardPour) {
            cardPour.className = `flex items-start justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none ${isPour ? 'bg-sky-50/50 border-sky-300 ring-1 ring-sky-300/50' : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200'}`;
        }
        if (cardBorrow) {
            cardBorrow.className = `flex items-start justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none ${isBorrow ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300/50' : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200'}`;
        }
        if (cardBuy) {
            cardBuy.className = `flex items-start justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none ${isBuy ? 'bg-purple-50/50 border-purple-300 ring-1 ring-purple-300/50' : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200'}`;
        }

        if (badge) {
            const active = [];
            if (isPour) active.push('Pour');
            if (isBorrow) active.push('Borrow');
            if (isBuy) active.push('Buy');

            if (active.length === 0) {
                badge.innerText = 'None (Invalid)';
                badge.className = 'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200';
            } else if (active.length === 3) {
                badge.innerText = 'All Options Enabled';
                badge.className = 'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200';
            } else if (active.length === 1) {
                badge.innerText = `${active[0]} Only`;
                badge.className = 'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200';
            } else {
                badge.innerText = active.join(' + ');
                badge.className = 'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200';
            }
        }
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
        
        let gcashQrData = State._croppedQrGcash;
        if (!gcashQrData && gcashFile) {
            const cropRes = await this.extractAndCropQr(gcashFile);
            if (!cropRes || !cropRes.isQr) {
                this.setLoading(btn, false);
                CustomToast.show('No QR code detected in the selected GCash photo. Please upload a valid QR code.', 'error');
                return;
            }
            gcashQrData = cropRes.croppedDataUrl;
        }
        if (gcashQrData) data.append('gcash_qr', gcashQrData);

        let mayaQrData = State._croppedQrMaya;
        if (!mayaQrData && mayaFile) {
            const cropRes = await this.extractAndCropQr(mayaFile);
            if (!cropRes || !cropRes.isQr) {
                this.setLoading(btn, false);
                CustomToast.show('No QR code detected in the selected Maya photo. Please upload a valid QR code.', 'error');
                return;
            }
            mayaQrData = cropRes.croppedDataUrl;
        }
        if (mayaQrData) data.append('maya_qr', mayaQrData);
        
        try {
            await API.request('admin_update_payment_profile', 'POST', data);
            State._croppedQrGcash = null;
            State._croppedQrMaya = null;
            State._rawQrData = null;
            State._lastCropBox = null;
            CustomToast.show('Payment profiles saved.', 'success');
            UI.renderAdminSettings(); 
        } catch(e) {
            this.setLoading(btn, false);
        }
    },

    async handleQrUploadPreview(event, type) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const wrap = document.getElementById(`preview_${type}_wrap`);
        const img = document.getElementById(`img_preview_${type}`);
        const statusEl = document.getElementById(`status_preview_${type}`);
        const subEl = document.getElementById(`sub_preview_${type}`);

        if (statusEl) statusEl.innerText = 'Checking QR Code...';
        if (subEl) subEl.innerText = 'Analyzing photo...';
        if (wrap) wrap.classList.remove('hidden');

        try {
            const rawData = await this.getBase64(file);
            const res = await this.extractAndCropQr(rawData);

            if (!res || !res.isQr || !res.croppedDataUrl) {
                // Reject non-QR photo!
                event.target.value = '';
                if (type === 'gcash') {
                    State._croppedQrGcash = null;
                } else if (type === 'maya') {
                    State._croppedQrMaya = null;
                }
                if (State._rawQrData) delete State._rawQrData[type];
                if (State._lastCropBox) delete State._lastCropBox[type];

                const currentStation = (State.adminData && State.adminData.station) || State.station;
                const existingQr = currentStation && (type === 'gcash' ? currentStation.gcash_qr : currentStation.maya_qr);
                if (existingQr) {
                    if (img) img.src = existingQr;
                    if (statusEl) statusEl.innerText = 'Current QR Code';
                    if (subEl) subEl.innerText = 'Ready to accept payments';
                } else {
                    if (wrap) wrap.classList.add('hidden');
                }

                CustomToast.show('No QR code detected in this photo. Please upload a valid QR code image or screenshot.', 'error');
                return;
            }

            State._rawQrData = State._rawQrData || {};
            State._rawQrData[type] = rawData;
            if (type === 'gcash') {
                State._croppedQrGcash = res.croppedDataUrl;
            } else if (type === 'maya') {
                State._croppedQrMaya = res.croppedDataUrl;
            }
            State._lastCropBox = State._lastCropBox || {};
            State._lastCropBox[type] = res.cropBox;

            if (img) img.src = res.croppedDataUrl;
            if (statusEl) statusEl.innerText = 'New QR Code';
            if (subEl) subEl.innerText = 'Ready to accept payments';
            if (wrap) wrap.classList.remove('hidden');
            CustomToast.show('QR code image loaded.', 'success');
        } catch (err) {
            console.error('[QR] Preview extraction failed:', err);
            event.target.value = '';
            const currentStation = (State.adminData && State.adminData.station) || State.station;
            const existingQr = currentStation && (type === 'gcash' ? currentStation.gcash_qr : currentStation.maya_qr);
            if (existingQr) {
                if (img) img.src = existingQr;
                if (statusEl) statusEl.innerText = 'Current QR Code';
                if (subEl) subEl.innerText = 'Ready to accept payments';
            } else {
                if (wrap) wrap.classList.add('hidden');
            }
            CustomToast.show('Failed to process image. Please try another file.', 'error');
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

    openEditStationModal(station) {
        if (!station) return;
        const modal = document.getElementById('sa-station-modal');
        if (!modal) return;
        document.getElementById('sa-modal-station-id').value = station.station_id || '';
        document.getElementById('sa-modal-station-name').value = station.station_name || '';
        document.getElementById('sa-modal-station-addr').value = station.address || '';
        document.getElementById('sa-modal-station-contact').value = station.contact_number || '';
        modal.classList.remove('hidden');
    },

    closeEditStationModal() {
        const modal = document.getElementById('sa-station-modal');
        if (modal) modal.classList.add('hidden');
    },

    async submitEditStation(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        this.setLoading(btn, true);
        const stId = document.getElementById('sa-modal-station-id').value;
        const stName = document.getElementById('sa-modal-station-name').value.trim();
        const stAddr = document.getElementById('sa-modal-station-addr').value.trim();
        const stContact = document.getElementById('sa-modal-station-contact').value.trim();

        if (!stName) {
            CustomToast.show('Station name cannot be empty', 'error');
            this.setLoading(btn, false);
            return;
        }

        const data = new FormData();
        data.append('station_id', stId);
        data.append('station_name', stName);
        data.append('address', stAddr);
        data.append('contact_number', stContact);

        try {
            const res = await API.request('sa_save_station', 'POST', data);
            if (res.success) {
                CustomToast.show('Station details updated successfully!', 'success');
                this.closeEditStationModal();
                State.stations = null;
                State.saUsersData = null;
                try {
                    localStorage.removeItem('cache_get_stations');
                    localStorage.removeItem('cache_sa_get_stations');
                    localStorage.removeItem('cache_sa_get_users');
                } catch(err) {}
                UI.renderSuperAdminDashboard();
            }
        } catch(e) {
            console.error('Failed to update station:', e);
        }
        this.setLoading(btn, false);
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


    /**
     * Automatically detects and crops a QR code from any image or screenshot (16:9, mobile 9:16, etc.)
     * into a clean 1:1 square box with standard quiet-zone margins.
     * Uses a multi-stage detection pipeline:
     * 1. Native BarcodeDetector (fastest if supported)
     * 2. Multi-pass jsQR (standard, contrast-boosted/binarized, and mobile card crops)
     * 3. 1:1:3:1:1 QR Finder Pattern Triplet Detector (detects QR corners even with center logos like GCash/Maya)
     * 4. High-frequency QR transition density quadrant scanner
     * 5. Intelligent 1:1 Screenshot Auto-Crop fallback
     * @param {File|Blob|string} imageSource File object, Blob, or Data URL
     * @returns {Promise<{ croppedDataUrl: string, wasCropped: boolean, cropBox: {x:number, y:number, size:number}, origWidth: number, origHeight: number }>}
     */
    async extractAndCropQr(imageSource) {
        if (!imageSource) return null;

        return new Promise((resolve) => {
            const img = new Image();
            const cleanup = () => {
                if (typeof imageSource === 'object' && imageSource instanceof Blob) {
                    try { URL.revokeObjectURL(img.src); } catch(e) {}
                }
            };

            img.onload = async () => {
                try {
                    const origW = img.naturalWidth || img.width;
                    const origH = img.naturalHeight || img.height;

                    if (!origW || !origH) {
                        cleanup();
                        return resolve({ isQr: false, croppedDataUrl: null, wasCropped: false, cropBox: null, origWidth: 0, origHeight: 0 });
                    }

                    // 1. Run multi-stage detection to locate the QR code box
                    const detection = await this._detectQrBoundingBox(img, origW, origH);

                    if (!detection || !detection.box) {
                        // Strictly reject non-QR photo!
                        cleanup();
                        return resolve({
                            isQr: false,
                            croppedDataUrl: null,
                            wasCropped: false,
                            cropBox: null,
                            origWidth: origW,
                            origHeight: origH,
                            error: 'No QR code detected'
                        });
                    }

                    const bbox = detection.box;
                    const cx = bbox.x + bbox.width / 2;
                    const cy = bbox.y + bbox.height / 2;
                    const qrSide = Math.max(bbox.width, bbox.height);

                    // ~6.5% quiet zone gives the exact 1.14x ratio matching the user reference
                    const pad = Math.round(qrSide * 0.065);
                    const targetSide = Math.min(Math.min(origW, origH), Math.round(qrSide + pad * 2));

                    // Center the 1:1 square crop box around the QR code
                    let cropLeft = Math.round(cx - targetSide / 2);
                    let cropTop = Math.round(cy - targetSide / 2);

                    // Keep within boundaries if possible while maintaining size
                    if (cropLeft < 0) cropLeft = 0;
                    if (cropTop < 0) cropTop = 0;
                    if (cropLeft + targetSide > origW) cropLeft = Math.max(0, origW - targetSide);
                    if (cropTop + targetSide > origH) cropTop = Math.max(0, origH - targetSide);

                    const cropBox = {
                        x: cropLeft,
                        y: cropTop,
                        size: targetSide
                    };

                    // 2. Render into a clean, crisp 1:1 square canvas (600x600)
                    const result = this._cropImageToSquare(img, cropBox.x, cropBox.y, cropBox.size, origW, origH, 600);
                    cleanup();

                    return resolve({
                        isQr: true,
                        croppedDataUrl: result.croppedDataUrl,
                        wasCropped: true,
                        cropBox: cropBox,
                        origWidth: origW,
                        origHeight: origH
                    });

                } catch (err) {
                    console.error('[QR] Failed to crop QR:', err);
                    cleanup();
                    return resolve({ isQr: false, croppedDataUrl: null, wasCropped: false, cropBox: null, origWidth: 0, origHeight: 0 });
                }
            };

            img.onerror = () => {
                cleanup();
                return resolve({ isQr: false, croppedDataUrl: null, wasCropped: false, cropBox: null, origWidth: 0, origHeight: 0 });
            };

            if (typeof imageSource === 'string') {
                img.src = imageSource;
            } else if (imageSource instanceof Blob) {
                img.src = URL.createObjectURL(imageSource);
            } else {
                resolve({ isQr: false, croppedDataUrl: null, wasCropped: false, cropBox: null, origWidth: 0, origHeight: 0 });
            }
        });
    },

    /**
     * Multi-stage QR detector that finds QR bounding boxes across mobile screenshots,
     * photos, or desktop captures, including QR codes with center logos (GCash/Maya).
     */
    async _detectQrBoundingBox(img, origW, origH) {
        const maxScanDim = 1000;
        let scanW = origW;
        let scanH = origH;
        if (scanW > maxScanDim || scanH > maxScanDim) {
            if (scanW > scanH) {
                scanH = Math.round((scanH * maxScanDim) / scanW);
                scanW = maxScanDim;
            } else {
                scanW = Math.round((scanW * maxScanDim) / scanH);
                scanH = maxScanDim;
            }
        }

        const scanCanvas = document.createElement('canvas');
        scanCanvas.width = scanW;
        scanCanvas.height = scanH;
        const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
        scanCtx.drawImage(img, 0, 0, scanW, scanH);
        const imgData = scanCtx.getImageData(0, 0, scanW, scanH);

        let detectedScanBox = null;

        // Stage 1: Native BarcodeDetector (Chrome/Android hardware accelerated)
        if ('BarcodeDetector' in window) {
            try {
                const formats = await BarcodeDetector.getSupportedFormats().catch(() => []);
                if (formats.includes('qr_code')) {
                    const detector = new BarcodeDetector({ formats: ['qr_code'] });
                    const detected = await detector.detect(scanCanvas);
                    if (detected && detected.length > 0) {
                        const b = detected[0].boundingBox;
                        if (b && b.width > 20 && b.height > 20) {
                            detectedScanBox = { x: b.x, y: b.y, width: b.width, height: b.height };
                        }
                    }
                }
            } catch (err) {}
        }

        // Stage 2: Multi-pass jsQR
        if (!detectedScanBox && typeof jsQR === 'function') {
            // Pass 2a: Standard full-canvas scan
            try {
                const code = jsQR(imgData.data, scanW, scanH, { inversionAttempts: 'attemptBoth' });
                if (code && code.location) {
                    detectedScanBox = this._boxFromJsQrLocation(code.location);
                }
            } catch (err) {}

            // Pass 2b: Binarized/high-contrast scan
            if (!detectedScanBox) {
                try {
                    const binarized = this._binarizeImageData(imgData);
                    const code = jsQR(binarized.data, scanW, scanH, { inversionAttempts: 'dontInvert' });
                    if (code && code.location) {
                        detectedScanBox = this._boxFromJsQrLocation(code.location);
                    }
                } catch (err) {}
            }

            // Pass 2c: Central region scan on tall screenshots
            if (!detectedScanBox && scanH > scanW * 1.2) {
                try {
                    const subX = Math.round(scanW * 0.05);
                    const subY = Math.round(scanH * 0.15);
                    const subW = Math.round(scanW * 0.90);
                    const subH = Math.round(scanH * 0.70);
                    const subData = scanCtx.getImageData(subX, subY, subW, subH);
                    const code = jsQR(subData.data, subW, subH, { inversionAttempts: 'attemptBoth' });
                    if (code && code.location) {
                        const locBox = this._boxFromJsQrLocation(code.location);
                        detectedScanBox = {
                            x: locBox.x + subX,
                            y: locBox.y + subY,
                            width: locBox.width,
                            height: locBox.height
                        };
                    }
                } catch (err) {}
            }
        }

        // Stage 3: Invariant 1:1:3:1:1 Finder Pattern Triplet Detector
        // Detects the 3 corner finder patterns even if GCash or Maya put a logo in the center
        if (!detectedScanBox) {
            try {
                detectedScanBox = this._detectQrFinderPatterns(imgData, scanW, scanH);
            } catch (err) {
                console.warn('[QR] Finder pattern detector error:', err);
            }
        }

        // Stage 4: High-frequency QR transition density quadrant scanner
        if (!detectedScanBox) {
            try {
                detectedScanBox = this._detectQrDensityBox(imgData, scanW, scanH);
            } catch (err) {
                console.warn('[QR] Density scanner error:', err);
            }
        }

        if (detectedScanBox && detectedScanBox.width > 20 && detectedScanBox.height > 20) {
            const scaleX = origW / scanW;
            const scaleY = origH / scanH;
            return {
                box: {
                    x: Math.round(detectedScanBox.x * scaleX),
                    y: Math.round(detectedScanBox.y * scaleY),
                    width: Math.round(detectedScanBox.width * scaleX),
                    height: Math.round(detectedScanBox.height * scaleY)
                }
            };
        }

        return null;
    },

    _boxFromJsQrLocation(loc) {
        const xs = [loc.topLeftCorner.x, loc.topRightCorner.x, loc.bottomRightCorner.x, loc.bottomLeftCorner.x];
        const ys = [loc.topLeftCorner.y, loc.topRightCorner.y, loc.bottomRightCorner.y, loc.bottomLeftCorner.y];
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const spanW = maxX - minX;
        const spanH = maxY - minY;
        // jsQR returns finder pattern centers (3.5 modules inward from outer edges).
        // For standard payment QRs, expanding by ~13% accurately hits the outer module bounds.
        const padX = spanW * 0.13;
        const padY = spanH * 0.13;
        return {
            x: Math.max(0, Math.round(minX - padX)),
            y: Math.max(0, Math.round(minY - padY)),
            width: Math.round(spanW + padX * 2),
            height: Math.round(spanH + padY * 2)
        };
    },

    _binarizeImageData(imgData) {
        const w = imgData.width;
        const h = imgData.height;
        const d = imgData.data;
        const out = new ImageData(new Uint8ClampedArray(d), w, h);
        const outD = out.data;

        // Compute average luminance
        let sumLum = 0;
        let count = 0;
        const sampleStep = 8;
        for (let i = 0; i < d.length; i += 4 * sampleStep) {
            sumLum += (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
            count++;
        }
        const avgLum = count > 0 ? (sumLum / count) : 128;
        const threshold = Math.max(60, Math.min(195, avgLum));

        for (let i = 0; i < d.length; i += 4) {
            const lum = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
            const val = lum < threshold ? 0 : 255;
            outD[i] = val;
            outD[i + 1] = val;
            outD[i + 2] = val;
            outD[i + 3] = 255;
        }
        return out;
    },

    /**
     * Scans for 1:1:3:1:1 black-white-black-white-black finder patterns
     * and identifies the right-angled triplet forming a QR code.
     */
    _detectQrFinderPatterns(imgData, width, height) {
        const d = imgData.data;
        let sumLum = 0, sampleCount = 0;
        for (let i = 0; i < d.length; i += 24) {
            sumLum += (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
            sampleCount++;
        }
        const avgLum = sampleCount > 0 ? (sumLum / sampleCount) : 128;
        const threshold = Math.max(65, Math.min(185, Math.round(avgLum * 0.82)));

        const getDark = (x, y) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return false;
            const idx = (y * width + x) * 4;
            const lum = (d[idx] * 77 + d[idx + 1] * 150 + d[idx + 2] * 29) >> 8;
            return lum < threshold;
        };

        const candidates = [];
        const step = 2; // scan every 2 rows

        for (let y = 0; y < height; y += step) {
            let runs = [0, 0, 0, 0, 0];
            let currentState = 0;

            for (let x = 0; x < width; x++) {
                if (getDark(x, y)) {
                    if ((currentState & 1) === 1) {
                        currentState++;
                    }
                    runs[currentState]++;
                } else {
                    if ((currentState & 1) === 0) {
                        if (currentState === 4) {
                            if (this._checkFinderRatio(runs)) {
                                const total = runs[0] + runs[1] + runs[2] + runs[3] + runs[4];
                                const modSize = total / 7;
                                const cx = Math.round(x - runs[4] - runs[3] - runs[2] / 2);
                                const vResult = this._checkVerticalFinder(cx, y, height, modSize, getDark);
                                if (vResult) {
                                    candidates.push({ x: cx, y: vResult.cy, size: total });
                                }
                            }
                            runs[0] = runs[2];
                            runs[1] = runs[3];
                            runs[2] = runs[4];
                            runs[3] = 1;
                            runs[4] = 0;
                            currentState = 3;
                            continue;
                        } else {
                            if (currentState > 0 || runs[0] > 0) {
                                currentState++;
                            }
                        }
                    }
                    if (currentState > 0) {
                        runs[currentState]++;
                    }
                }
            }
        }

        // Deduplicate & cluster nearby candidate points
        const clusters = [];
        for (const c of candidates) {
            let found = false;
            for (const cl of clusters) {
                if (Math.hypot(cl.x - c.x, cl.y - c.y) < cl.size * 0.7) {
                    cl.x = Math.round((cl.x + c.x) / 2);
                    cl.y = Math.round((cl.y + c.y) / 2);
                    cl.size = Math.round((cl.size + c.size) / 2);
                    cl.count = (cl.count || 1) + 1;
                    found = true;
                    break;
                }
            }
            if (!found) clusters.push({ ...c, count: 1 });
        }

        if (clusters.length < 3) return null;
        return this._findQrTriplet(clusters);
    },

    _checkFinderRatio(runs) {
        const total = runs[0] + runs[1] + runs[2] + runs[3] + runs[4];
        if (total < 7) return false;
        const mod = total / 7;
        const maxVar = mod * 0.75;
        return (
            Math.abs(runs[0] - mod) < maxVar &&
            Math.abs(runs[1] - mod) < maxVar &&
            Math.abs(runs[2] - 3 * mod) < maxVar * 1.5 &&
            Math.abs(runs[3] - mod) < maxVar &&
            Math.abs(runs[4] - mod) < maxVar
        );
    },

    _checkVerticalFinder(cx, cy, height, modSize, getDark) {
        if (!getDark(cx, cy)) return null;
        const maxScan = Math.min(height, Math.round(modSize * 8));

        let centerStart = cy;
        while (centerStart >= 0 && getDark(cx, centerStart) && (cy - centerStart) < maxScan) centerStart--;
        centerStart++;

        let centerEnd = cy;
        while (centerEnd < height && getDark(cx, centerEnd) && (centerEnd - cy) < maxScan) centerEnd++;
        centerEnd--;

        const centerDarkLen = centerEnd - centerStart + 1;
        if (Math.abs(centerDarkLen - 3 * modSize) > modSize * 1.6) return null;

        let y = centerStart - 1;
        let upWhite = 0;
        while (y >= 0 && !getDark(cx, y) && upWhite < maxScan) { upWhite++; y--; }
        if (Math.abs(upWhite - modSize) > modSize * 0.85) return null;

        let upBlack = 0;
        while (y >= 0 && getDark(cx, y) && upBlack < maxScan) { upBlack++; y--; }
        if (Math.abs(upBlack - modSize) > modSize * 0.85) return null;

        y = centerEnd + 1;
        let downWhite = 0;
        while (y < height && !getDark(cx, y) && downWhite < maxScan) { downWhite++; y++; }
        if (Math.abs(downWhite - modSize) > modSize * 0.85) return null;

        let downBlack = 0;
        while (y < height && getDark(cx, y) && downBlack < maxScan) { downBlack++; y++; }
        if (Math.abs(downBlack - modSize) > modSize * 0.85) return null;

        return { cy: Math.round((centerStart + centerEnd) / 2) };
    },

    _findQrTriplet(patterns) {
        let bestTriplet = null;
        let bestScore = Infinity;

        for (let i = 0; i < patterns.length; i++) {
            for (let j = 0; j < patterns.length; j++) {
                if (i === j) continue;
                for (let k = 0; k < patterns.length; k++) {
                    if (k === i || k === j) continue;

                    const tl = patterns[i];
                    const tr = patterns[j];
                    const bl = patterns[k];

                    const d1 = Math.hypot(tr.x - tl.x, tr.y - tl.y);
                    const d2 = Math.hypot(bl.x - tl.x, bl.y - tl.y);

                    if (d1 < 25 || d2 < 25) continue;

                    // Arms should be approximately equal length
                    const sideDiff = Math.abs(d1 - d2) / Math.max(d1, d2);
                    if (sideDiff > 0.35) continue;

                    // Check right angle: dot product near 0
                    const v1x = tr.x - tl.x, v1y = tr.y - tl.y;
                    const v2x = bl.x - tl.x, v2y = bl.y - tl.y;
                    const dot = v1x * v2x + v1y * v2y;
                    const cosVal = Math.abs(dot / (d1 * d2));
                    if (cosVal > 0.35) continue;

                    // Ensure valid 2D clockwise/counter-clockwise orientation
                    const cross = v1x * v2y - v1y * v2x;
                    if (cross <= 0) continue;

                    const score = sideDiff + cosVal;
                    if (score < bestScore) {
                        bestScore = score;
                        bestTriplet = { tl, tr, bl };
                    }
                }
            }
        }

        if (!bestTriplet) return null;

        const { tl, tr, bl } = bestTriplet;
        const avgFinderSize = (tl.size + tr.size + bl.size) / 3;
        const half = avgFinderSize / 2;

        const minX = Math.min(tl.x, bl.x) - half;
        const maxX = Math.max(tr.x, tl.x + (tr.x - tl.x)) + half;
        const minY = Math.min(tl.y, tr.y) - half;
        const maxY = Math.max(bl.y, tl.y + (bl.y - tl.y)) + half;

        return {
            x: Math.max(0, Math.round(minX)),
            y: Math.max(0, Math.round(minY)),
            width: Math.round(maxX - minX),
            height: Math.round(maxY - minY)
        };
    },

    /**
     * Fallback quadrant scanner for high-frequency QR transitions in mobile screenshots
     */
    _detectQrDensityBox(imgData, width, height) {
        const d = imgData.data;
        const blockSize = 24;
        const gridW = Math.floor(width / blockSize);
        const gridH = Math.floor(height / blockSize);
        if (gridW < 4 || gridH < 4) return null;

        const density = new Float32Array(gridW * gridH);

        for (let gy = 0; gy < gridH; gy++) {
            for (let gx = 0; gx < gridW; gx++) {
                let transitions = 0;
                const startX = gx * blockSize;
                const startY = gy * blockSize;

                for (let y = startY; y < startY + blockSize - 1; y += 2) {
                    let prevLum = (d[(y * width + startX) * 4] * 77 + d[(y * width + startX) * 4 + 1] * 150 + d[(y * width + startX) * 4 + 2] * 29) >> 8;
                    for (let x = startX + 1; x < startX + blockSize; x++) {
                        const idx = (y * width + x) * 4;
                        const lum = (d[idx] * 77 + d[idx + 1] * 150 + d[idx + 2] * 29) >> 8;
                        if (Math.abs(lum - prevLum) > 55) {
                            transitions++;
                        }
                        prevLum = lum;
                    }
                }
                density[gy * gridW + gx] = transitions / ((blockSize / 2) * blockSize);
            }
        }

        // Look for dense contiguous blocks
        let minGx = Infinity, maxGx = -1, minGy = Infinity, maxGy = -1;
        let highCount = 0;

        for (let gy = 0; gy < gridH; gy++) {
            for (let gx = 0; gx < gridW; gx++) {
                if (density[gy * gridW + gx] > 0.18) {
                    highCount++;
                    if (gx < minGx) minGx = gx;
                    if (gx > maxGx) maxGx = gx;
                    if (gy < minGy) minGy = gy;
                    if (gy > maxGy) maxGy = gy;
                }
            }
        }

        if (highCount >= 10 && maxGx > minGx && maxGy > minGy) {
            const rawW = (maxGx - minGx + 1) * blockSize;
            const rawH = (maxGy - minGy + 1) * blockSize;
            const aspect = Math.min(rawW, rawH) / Math.max(rawW, rawH);
            if (aspect >= 0.70 && rawW >= 70 && rawH >= 70) {
                const subX = Math.max(0, minGx * blockSize);
                const subY = Math.max(0, minGy * blockSize);
                const subW = Math.min(width - subX, rawW);
                const subH = Math.min(height - subY, rawH);

                if (typeof jsQR === 'function') {
                    try {
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = subW;
                        tempCanvas.height = subH;
                        const tempCtx = tempCanvas.getContext('2d');
                        const subImgData = tempCtx.createImageData(subW, subH);
                        for (let y = 0; y < subH; y++) {
                            for (let x = 0; x < subW; x++) {
                                const srcIdx = ((subY + y) * width + (subX + x)) * 4;
                                const dstIdx = (y * subW + x) * 4;
                                subImgData.data[dstIdx] = d[srcIdx];
                                subImgData.data[dstIdx + 1] = d[srcIdx + 1];
                                subImgData.data[dstIdx + 2] = d[srcIdx + 2];
                                subImgData.data[dstIdx + 3] = d[srcIdx + 3];
                            }
                        }
                        const subCode = jsQR(subImgData.data, subW, subH, { inversionAttempts: 'attemptBoth' });
                        if (subCode && subCode.location) {
                            const b = this._boxFromJsQrLocation(subCode.location);
                            return { x: subX + b.x, y: subY + b.y, width: b.width, height: b.height };
                        }
                    } catch (e) {}
                }
            }
        }

        return null;
    },

    /**
     * Crops a 1:1 square from the original image onto a standardized 600x600 canvas
     * with crisp pure white (#FFFFFF) background and quiet zone.
     */
    _cropImageToSquare(img, cropX, cropY, cropSize, origW, origH, outputSize = 600) {
        const canvas = document.createElement('canvas');
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext('2d');

        // Crisp white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, outputSize, outputSize);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Clamp to original image bounds
        const sx = Math.max(0, Math.min(origW, cropX));
        const sy = Math.max(0, Math.min(origH, cropY));
        const sWidth = Math.max(0, Math.min(origW - sx, cropSize));
        const sHeight = Math.max(0, Math.min(origH - sy, cropSize));

        const dx = Math.round(((sx - cropX) / cropSize) * outputSize);
        const dy = Math.round(((sy - cropY) / cropSize) * outputSize);
        const dWidth = Math.round((sWidth / cropSize) * outputSize);
        const dHeight = Math.round((sHeight / cropSize) * outputSize);

        if (sWidth > 0 && sHeight > 0) {
            ctx.drawImage(
                img,
                sx, sy, sWidth, sHeight,
                dx, dy, dWidth, dHeight
            );
        }

        let format = 'image/jpeg';
        try {
            if (canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
                format = 'image/webp';
            }
        } catch (e) {}

        return {
            croppedDataUrl: canvas.toDataURL(format, 0.92),
            cropBox: { x: cropX, y: cropY, size: cropSize }
        };
    },

    /**
     * Opens the interactive 1:1 QR Cropper modal allowing the admin
     * to visually reposition, zoom, scale, or center the square crop box.
     */
    async openQrCropperModal(type) {
        const previewImg = document.getElementById(`img_preview_${type}`);
        const domSrc = (previewImg && previewImg.getAttribute('src') && previewImg.getAttribute('src').trim()) ? previewImg.getAttribute('src').trim() : null;
        const currentStation = (State.adminData && State.adminData.station) || State.station || {};
        const stationQr = (type === 'gcash' ? currentStation.gcash_qr : currentStation.maya_qr) || null;

        const rawSrc = (State._rawQrData && State._rawQrData[type]) ||
            (type === 'gcash' ? State._croppedQrGcash : State._croppedQrMaya) ||
            stationQr ||
            domSrc;

        if (!rawSrc) {
            CustomToast.show('Please choose a QR image first.', 'warning');
            return;
        }

        const img = new Image();
        if (typeof rawSrc === 'string' && rawSrc.startsWith('http') && !rawSrc.includes(window.location.host)) {
            img.crossOrigin = 'anonymous';
        }
        let ready = false;
        const onImageReady = async () => {
            if (ready) return;
            ready = true;
            const origW = img.naturalWidth || img.width;
            const origH = img.naturalHeight || img.height;

            if (!origW || !origH) {
                CustomToast.show('Could not read image dimensions.', 'error');
                return;
            }

            let cropBox = State._lastCropBox && State._lastCropBox[type];
            if (!cropBox) {
                const isSquare = Math.abs(origW - origH) <= 4;
                if (isSquare) {
                    cropBox = {
                        x: 0,
                        y: 0,
                        size: Math.min(origW, origH)
                    };
                } else {
                    // Automatically detect the QR code so the default zoom is tightly framed around the QR
                    try {
                        const detection = await this._detectQrBoundingBox(img, origW, origH);
                        if (detection && detection.box) {
                            const bbox = detection.box;
                            const cx = bbox.x + bbox.width / 2;
                            const cy = bbox.y + bbox.height / 2;
                            const qrSide = Math.max(bbox.width, bbox.height);
                            const pad = Math.round(qrSide * 0.065);
                            const targetSide = Math.min(Math.min(origW, origH), Math.round(qrSide + pad * 2));
                            cropBox = {
                                x: Math.max(0, Math.min(origW - targetSide, Math.round(cx - targetSide / 2))),
                                y: Math.max(0, Math.min(origH - targetSide, Math.round(cy - targetSide / 2))),
                                size: targetSide
                            };
                        }
                    } catch (e) {
                        console.warn('[QR] Auto-detect crop box error:', e);
                    }

                    if (!cropBox) {
                        const initSize = Math.round(Math.min(origW, origH) * 0.40);
                        cropBox = {
                            x: Math.round((origW - initSize) / 2),
                            y: origH > origW * 1.2 ? Math.round(origH * 0.35) : Math.round((origH - initSize) / 2),
                            size: initSize
                        };
                    }
                }
            }

            this._cropperState = {
                type,
                img,
                origW,
                origH,
                cropX: Math.max(0, Math.min(origW - cropBox.size, cropBox.x)),
                cropY: Math.max(0, Math.min(origH - cropBox.size, cropBox.y)),
                cropSize: Math.min(Math.min(origW, origH), cropBox.size),
                isDragging: false,
                dragMode: null,
                startX: 0,
                startY: 0,
                startCropX: 0,
                startCropY: 0,
                startCropSize: 0
            };

            this._mountCropperModalDom();
            this._renderCropperCanvas();
        };

        img.onload = onImageReady;
        img.onerror = () => {
            CustomToast.show('Failed to load image for cropping.', 'error');
        };
        img.src = rawSrc;
        if (img.complete && img.naturalWidth > 0) {
            onImageReady();
        }
    },

    _mountCropperModalDom() {
        let root = document.getElementById('qr-cropper-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'qr-cropper-modal-root';
            document.body.appendChild(root);
        }

        const titleLabel = this._cropperState.type === 'gcash' ? 'GCash QR' : 'Maya QR';

        root.innerHTML = `
        <div id="qr-cropper-backdrop" class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 opacity-0 transition-opacity duration-200">
            <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col overflow-hidden max-h-[92vh] transform scale-95 transition-transform duration-200">
                <!-- Header -->
                <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <i class="fa-solid fa-crop-simple text-sm"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-slate-800">Crop ${titleLabel} to 1:1 Box</h3>
                            <p class="text-[11px] text-slate-500">Frame only the QR code for crisp display</p>
                        </div>
                    </div>
                    <button type="button" onclick="App.closeQrCropperModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition active:scale-95">
                        <i class="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>
                <!-- Interactive Canvas Workspace -->
                <div class="p-4 bg-slate-950 flex flex-col items-center justify-center select-none overflow-hidden relative" style="min-height: 290px; max-height: 52vh;">
                    <canvas id="qr-cropper-canvas" class="max-w-full max-h-[46vh] object-contain cursor-move rounded-lg shadow-inner"></canvas>
                    <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none px-2">
                        <span class="text-[10px] text-slate-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs font-semibold">1:1 Square</span>
                        <span class="text-[10px] text-slate-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">Drag to move • Corner to scale</span>
                    </div>
                </div>
                <!-- Controls and Live Preview Bar -->
                <div class="px-4 py-3 bg-slate-50 border-t border-b border-slate-100 flex items-center justify-between gap-2 text-xs flex-wrap">
                    <div class="flex items-center gap-1.5">
                        <button type="button" onclick="App.cropperZoom(-1)" class="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 transition flex items-center gap-1 shadow-xs">
                            <i class="fa-solid fa-magnifying-glass-minus text-[11px]"></i> Smaller
                        </button>
                        <button type="button" onclick="App.cropperZoom(1)" class="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 transition flex items-center gap-1 shadow-xs">
                            <i class="fa-solid fa-magnifying-glass-plus text-[11px]"></i> Larger
                        </button>
                        <button type="button" onclick="App.cropperCenter()" class="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-100 transition flex items-center gap-1 shadow-xs">
                            <i class="fa-solid fa-arrows-to-dot text-[11px]"></i> Center
                        </button>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[11px] font-bold text-slate-500">Live 1:1:</span>
                        <canvas id="qr-live-preview" width="56" height="56" class="w-11 h-11 rounded-lg border border-slate-300 bg-white p-0.5 object-contain shadow-xs aspect-square"></canvas>
                    </div>
                </div>
                <!-- Footer Action Buttons -->
                <div class="px-5 py-3.5 bg-white flex items-center justify-end gap-2.5">
                    <button type="button" onclick="App.closeQrCropperModal()" class="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Cancel</button>
                    <button type="button" onclick="App.applyQrCropperModal()" class="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md shadow-blue-500/20 flex items-center gap-1.5 active:scale-95">
                        <i class="fa-solid fa-check"></i> Apply 1:1 Crop
                    </button>
                </div>
            </div>
        </div>
        `;

        requestAnimationFrame(() => {
            const backdrop = document.getElementById('qr-cropper-backdrop');
            if (backdrop) {
                backdrop.classList.remove('opacity-0');
                if (backdrop.firstElementChild) backdrop.firstElementChild.classList.remove('scale-95');
            }
        });

        const canvas = document.getElementById('qr-cropper-canvas');
        if (canvas) {
            canvas.addEventListener('mousedown', (e) => this._handleCropperPointerDown(e));
            window.addEventListener('mousemove', this._cropperMoveHandler = (e) => this._handleCropperPointerMove(e));
            window.addEventListener('mouseup', this._cropperUpHandler = (e) => this._handleCropperPointerUp(e));

            // Touch support
            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    const t = e.touches[0];
                    this._handleCropperPointerDown({ clientX: t.clientX, clientY: t.clientY, target: canvas, preventDefault: () => e.preventDefault() });
                }
            }, { passive: false });

            window.addEventListener('touchmove', this._cropperTouchMoveHandler = (e) => {
                if (e.touches.length === 1 && this._cropperState && this._cropperState.isDragging) {
                    const t = e.touches[0];
                    this._handleCropperPointerMove({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => e.preventDefault() });
                }
            }, { passive: false });

            window.addEventListener('touchend', this._cropperTouchUpHandler = () => this._handleCropperPointerUp({}));

            // Mouse wheel zoom
            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                this.cropperZoom(e.deltaY < 0 ? 1 : -1);
            }, { passive: false });
        }
    },

    _renderCropperCanvas() {
        const state = this._cropperState;
        if (!state) return;

        const canvas = document.getElementById('qr-cropper-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const viewW = 440;
        const viewH = Math.round((state.origH * viewW) / state.origW);

        canvas.width = viewW;
        canvas.height = viewH;

        const scale = viewW / state.origW;

        // 1. Draw original screenshot
        ctx.drawImage(state.img, 0, 0, viewW, viewH);

        const screenX = state.cropX * scale;
        const screenY = state.cropY * scale;
        const screenSize = state.cropSize * scale;

        // 2. Dark translucent mask outside the 1:1 box
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
        ctx.fillRect(0, 0, viewW, screenY);
        ctx.fillRect(0, screenY, screenX, screenSize);
        ctx.fillRect(screenX + screenSize, screenY, viewW - (screenX + screenSize), screenSize);
        ctx.fillRect(0, screenY + screenSize, viewW, viewH - (screenY + screenSize));

        // 3. Crisp white + blue box border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(screenX, screenY, screenSize, screenSize);

        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(screenX - 1, screenY - 1, screenSize + 2, screenSize + 2);

        // 4. Subtle grid lines inside box
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenX + screenSize / 3, screenY);
        ctx.lineTo(screenX + screenSize / 3, screenY + screenSize);
        ctx.moveTo(screenX + (screenSize * 2) / 3, screenY);
        ctx.lineTo(screenX + (screenSize * 2) / 3, screenY + screenSize);
        ctx.moveTo(screenX, screenY + screenSize / 3);
        ctx.lineTo(screenX + screenSize, screenY + screenSize / 3);
        ctx.moveTo(screenX, screenY + (screenSize * 2) / 3);
        ctx.lineTo(screenX + screenSize, screenY + (screenSize * 2) / 3);
        ctx.stroke();

        // 5. Corner resize handle at bottom-right
        const handleX = screenX + screenSize;
        const handleY = screenY + screenSize;
        ctx.fillStyle = '#2563EB';
        ctx.beginPath();
        ctx.arc(handleX, handleY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        // 6. Update live 1:1 preview canvas
        const liveCanvas = document.getElementById('qr-live-preview');
        if (liveCanvas) {
            const liveCtx = liveCanvas.getContext('2d');
            liveCtx.fillStyle = '#FFFFFF';
            liveCtx.fillRect(0, 0, liveCanvas.width, liveCanvas.height);
            liveCtx.imageSmoothingEnabled = true;
            liveCtx.imageSmoothingQuality = 'high';
            liveCtx.drawImage(
                state.img,
                state.cropX, state.cropY, state.cropSize, state.cropSize,
                0, 0, liveCanvas.width, liveCanvas.height
            );
        }
    },

    _handleCropperPointerDown(e) {
        const state = this._cropperState;
        if (!state) return;

        const canvas = document.getElementById('qr-cropper-canvas');
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        const mouseX = (clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (clientY - rect.top) * (canvas.height / rect.height);

        const scale = canvas.width / state.origW;
        const screenX = state.cropX * scale;
        const screenY = state.cropY * scale;
        const screenSize = state.cropSize * scale;

        // Check if clicking near bottom-right resize handle (within 18px)
        const distToHandle = Math.hypot(mouseX - (screenX + screenSize), mouseY - (screenY + screenSize));
        if (distToHandle < 20) {
            state.isDragging = true;
            state.dragMode = 'resize';
            state.startX = clientX;
            state.startY = clientY;
            state.startCropSize = state.cropSize;
            return;
        }

        // Check if clicking inside crop box
        if (mouseX >= screenX && mouseX <= screenX + screenSize && mouseY >= screenY && mouseY <= screenY + screenSize) {
            state.isDragging = true;
            state.dragMode = 'move';
            state.startX = clientX;
            state.startY = clientY;
            state.startCropX = state.cropX;
            state.startCropY = state.cropY;
            return;
        }

        // Clicking outside centers the box at this position
        const clickedImgX = mouseX / scale;
        const clickedImgY = mouseY / scale;
        state.cropX = Math.round(Math.max(0, Math.min(state.origW - state.cropSize, clickedImgX - state.cropSize / 2)));
        state.cropY = Math.round(Math.max(0, Math.min(state.origH - state.cropSize, clickedImgY - state.cropSize / 2)));
        state.isDragging = true;
        state.dragMode = 'move';
        state.startX = clientX;
        state.startY = clientY;
        state.startCropX = state.cropX;
        state.startCropY = state.cropY;
        this._renderCropperCanvas();
    },

    _handleCropperPointerMove(e) {
        const state = this._cropperState;
        if (!state || !state.isDragging) return;

        const canvas = document.getElementById('qr-cropper-canvas');
        if (!canvas) return;

        const scale = canvas.width / state.origW;
        const dx = (e.clientX - state.startX) / scale;
        const dy = (e.clientY - state.startY) / scale;

        if (state.dragMode === 'move') {
            state.cropX = Math.round(Math.max(0, Math.min(state.origW - state.cropSize, state.startCropX + dx)));
            state.cropY = Math.round(Math.max(0, Math.min(state.origH - state.cropSize, state.startCropY + dy)));
            this._renderCropperCanvas();
        } else if (state.dragMode === 'resize') {
            const delta = Math.max(dx, dy);
            const minSize = Math.round(Math.min(state.origW, state.origH) * 0.15);
            const maxSize = Math.min(state.origW - state.cropX, state.origH - state.cropY);
            state.cropSize = Math.round(Math.max(minSize, Math.min(maxSize, state.startCropSize + delta)));
            this._renderCropperCanvas();
        }
    },

    _handleCropperPointerUp() {
        if (this._cropperState) {
            this._cropperState.isDragging = false;
            this._cropperState.dragMode = null;
        }
    },

    cropperZoom(dir) {
        const state = this._cropperState;
        if (!state) return;

        const factor = dir > 0 ? 1.12 : 0.89;
        const minSize = Math.round(Math.min(state.origW, state.origH) * 0.15);
        const maxSize = Math.min(state.origW, state.origH);

        const newSize = Math.round(Math.max(minSize, Math.min(maxSize, state.cropSize * factor)));
        const delta = newSize - state.cropSize;

        let newX = Math.round(state.cropX - delta / 2);
        let newY = Math.round(state.cropY - delta / 2);

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX + newSize > state.origW) newX = state.origW - newSize;
        if (newY + newSize > state.origH) newY = state.origH - newSize;

        state.cropSize = newSize;
        state.cropX = newX;
        state.cropY = newY;
        this._renderCropperCanvas();
    },

    cropperCenter() {
        const state = this._cropperState;
        if (!state) return;

        state.cropX = Math.round((state.origW - state.cropSize) / 2);
        state.cropY = state.origH > state.origW * 1.2 ? Math.round(state.origH * 0.35) : Math.round((state.origH - state.cropSize) / 2);
        this._renderCropperCanvas();
    },

    applyQrCropperModal() {
        const state = this._cropperState;
        if (!state) return;

        const res = this._cropImageToSquare(state.img, state.cropX, state.cropY, state.cropSize, state.origW, state.origH, 600);
        if (state.type === 'gcash') {
            State._croppedQrGcash = res.croppedDataUrl;
        } else if (state.type === 'maya') {
            State._croppedQrMaya = res.croppedDataUrl;
        }

        State._lastCropBox = State._lastCropBox || {};
        State._lastCropBox[state.type] = res.cropBox;

        const previewImg = document.getElementById(`img_preview_${state.type}`);
        if (previewImg) previewImg.src = res.croppedDataUrl;

        const statusEl = document.getElementById(`status_preview_${state.type}`);
        if (statusEl) statusEl.innerText = 'New QR Code';

        const subEl = document.getElementById(`sub_preview_${state.type}`);
        if (subEl) subEl.innerText = 'Ready to accept payments';

        this.closeQrCropperModal();
        CustomToast.show('QR crop updated.', 'success');
    },

    closeQrCropperModal() {
        if (this._cropperMoveHandler) window.removeEventListener('mousemove', this._cropperMoveHandler);
        if (this._cropperUpHandler) window.removeEventListener('mouseup', this._cropperUpHandler);
        if (this._cropperTouchMoveHandler) window.removeEventListener('touchmove', this._cropperTouchMoveHandler);
        if (this._cropperTouchUpHandler) window.removeEventListener('touchend', this._cropperTouchUpHandler);

        const backdrop = document.getElementById('qr-cropper-backdrop');
        if (backdrop) {
            backdrop.classList.add('opacity-0');
            if (backdrop.firstElementChild) backdrop.firstElementChild.classList.add('scale-95');
        }
        setTimeout(() => {
            const root = document.getElementById('qr-cropper-modal-root');
            if (root) root.innerHTML = '';
            this._cropperState = null;
        }, 200);
    },

    /**
     * Previews the full size 1:1 QR code in a high-resolution dialog.
     */
    viewQrFull(type) {
        const previewImg = document.getElementById(`img_preview_${type}`);
        const domSrc = (previewImg && previewImg.getAttribute('src') && previewImg.getAttribute('src').trim()) ? previewImg.getAttribute('src').trim() : null;
        const currentStation = (State.adminData && State.adminData.station) || State.station || {};
        const stationQr = (type === 'gcash' ? currentStation.gcash_qr : currentStation.maya_qr) || null;

        const qrSrc = (type === 'gcash' ? State._croppedQrGcash : State._croppedQrMaya) ||
            stationQr ||
            domSrc;

        if (!qrSrc) {
            CustomToast.show('No QR code available to preview.', 'warning');
            return;
        }
        const name = type === 'gcash' ? (document.getElementById('set_gcash_name')?.value || currentStation.gcash_name || 'Account') : (document.getElementById('set_maya_name')?.value || currentStation.maya_name || 'Account');
        const num = type === 'gcash' ? (document.getElementById('set_gcash_num')?.value || currentStation.gcash_number || '') : (document.getElementById('set_maya_num')?.value || currentStation.maya_number || '');
        const title = type === 'gcash' ? 'GCash QR Code (1:1)' : 'Maya QR Code (1:1)';

        CustomDialog.show({
            type: 'custom',
            title,
            confirmText: 'Close',
            extraHtml: `
                <div class="mt-4 flex flex-col items-center">
                    <div class="w-64 h-64 p-3 bg-white rounded-2xl border border-slate-200 shadow-md flex items-center justify-center">
                        <img src="${qrSrc}" class="w-full h-full object-contain aspect-square rounded-lg" alt="${title}">
                    </div>
                    <div class="mt-3 text-center">
                        <p class="text-sm font-bold text-slate-800">${escapeHtml(name)}</p>
                        ${num ? `<p class="text-xs font-semibold text-slate-500 tracking-wider">${escapeHtml(num)}</p>` : ''}
                        <p class="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center justify-center gap-1"><i class="fa-solid fa-check"></i> 1:1 Square Format (Ready for Customers)</p>
                    </div>
                </div>
            `
        });
    },

    async compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.82) {
        if (!file) return null;
        if (!file.type || !file.type.startsWith('image/')) {
            return this.getBase64(file);
        }
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width;
                    let h = img.height;
                    if (w > maxWidth || h > maxHeight) {
                        if (w > h) {
                            h = Math.round((h * maxWidth) / w);
                            w = maxWidth;
                        } else {
                            w = Math.round((w * maxHeight) / h);
                            h = maxHeight;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    let format = 'image/jpeg';
                    try {
                        const webpTest = canvas.toDataURL('image/webp');
                        if (webpTest.startsWith('data:image/webp')) {
                            format = 'image/webp';
                        }
                    } catch (err) {}
                    resolve(canvas.toDataURL(format, quality));
                };
                img.onerror = () => resolve(e.target.result);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve(null);
        });
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
    logout: (...args) => UI.logout(...args)
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
    applyContainerPreset: (...args) => App.applyContainerPreset(...args),
    handleContainerOptionToggle: (...args) => App.handleContainerOptionToggle(...args),
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
    if (window.App && window.App.initBroadcastSync) {
        window.App.initBroadcastSync();
    }

    const topLogo = document.querySelector('nav .cursor-pointer');
    if (topLogo) {
        topLogo.onclick = (e) => {
            e.preventDefault();
            UI.goHome();
        };
    }

    try {
        const res = await API.request('check_session', 'GET', null, true);
        if (res && res.mapbox_token) {
            State.mapboxToken = res.mapbox_token;
            if (typeof mapboxgl !== 'undefined') {
                mapboxgl.accessToken = res.mapbox_token;
            }
        }
        if (res && res.csrf_token) {
            State.csrfToken = res.csrf_token;
            try {
                sessionStorage.setItem('csrf_token', res.csrf_token);
                localStorage.setItem('csrf_token', res.csrf_token);
            } catch (ign) {}
        }
        if (res && res.auth_token) {
            State.authToken = res.auth_token;
            try {
                sessionStorage.setItem('auth_token', res.auth_token);
                localStorage.setItem('auth_token', res.auth_token);
            } catch (ign) {}
        }
        if (res && res.logged_in) {
            State.user = { type: res.type, data: res.data };
            try {
                localStorage.setItem('cache_check_session', JSON.stringify({
                    data: res,
                    cachedAt: Date.now()
                }));
            } catch (ign) {}

            if (res.type === 'customer' && res.data) {
                if (res.data.latitude && res.data.longitude) {
                    State.userLocation = {
                        lat: parseFloat(res.data.latitude),
                        lng: parseFloat(res.data.longitude),
                        address: res.data.address || ''
                    };
                }
            } else if (res.type === 'admin' && res.data?.role === 'Super Admin') {
                App.checkSuperAdminNewCustomers();
                setInterval(() => App.checkSuperAdminNewCustomers(), 45000);
            }
            App.initPushNotifications();
            
            const initialHash = window.location.hash.replace('#', '');
            if (initialHash && UI.canAccessView(initialHash)) {
                UI.navigate(initialHash, 'replace');
            } else {
                UI.goHome('replace');
            }
        } else {
            // Server explicitly says not logged in
            const offlineSession = localStorage.getItem('cache_check_session');
            if (offlineSession && API.isOffline()) {
                try {
                    const parsed = JSON.parse(offlineSession);
                    const sData = parsed.data || parsed;
                    if (sData && sData.logged_in) {
                        State.user = { type: sData.type, data: sData.data };
                        if (sData.mapbox_token) {
                            State.mapboxToken = sData.mapbox_token;
                            if (typeof mapboxgl !== 'undefined') mapboxgl.accessToken = sData.mapbox_token;
                        }
                        if (sData.csrf_token) State.csrfToken = sData.csrf_token;
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
            try {
                localStorage.removeItem('cache_check_session');
                localStorage.removeItem('cache_get_customer_orders');
            } catch (ign) {}
            UI.navigate('login', 'replace');
        }
    } catch (e) {
        console.warn('Session check error or offline mode:', e);
        const isOffline = API.isOffline();
        const offlineSession = localStorage.getItem('cache_check_session');
        if (offlineSession && isOffline) {
            try {
                const parsed = JSON.parse(offlineSession);
                const sData = parsed.data || parsed;
                if (sData && sData.logged_in) {
                    State.user = { type: sData.type, data: sData.data };
                    if (sData.mapbox_token) {
                        State.mapboxToken = sData.mapbox_token;
                        if (typeof mapboxgl !== 'undefined') mapboxgl.accessToken = sData.mapbox_token;
                    }
                    if (sData.csrf_token) State.csrfToken = sData.csrf_token;
                    if (sData.type === 'customer' && sData.data) {
                        if (sData.data.latitude && sData.data.longitude) {
                            State.userLocation = {
                                lat: parseFloat(sData.data.latitude),
                                lng: parseFloat(sData.data.longitude),
                                address: sData.data.address || ''
                            };
                        }
                    }
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
        try {
            localStorage.removeItem('cache_check_session');
            localStorage.removeItem('cache_get_customer_orders');
        } catch (ign) {}
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
            if (res && res.logged_in) {
                State.user = { type: res.type, data: res.data };
                try {
                    localStorage.setItem('cache_check_session', JSON.stringify({
                        data: res,
                        cachedAt: Date.now()
                    }));
                } catch (ign) {}
                if (!UI.canAccessView(UI._currentView)) {
                    UI.goHome('replace');
                }
            } else if (res && res.logged_in === false) {
                if (!API.isOffline()) {
                    State.user = null;
                    try {
                        localStorage.removeItem('cache_check_session');
                        localStorage.removeItem('cache_get_customer_orders');
                    } catch (ign) {}
                    UI.navigate('login', 'replace');
                }
            }
        } catch (err) {
            console.warn('Pageshow check_session error:', err);
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
            
            const orderNumMatch = (payload.title || '').match(/#(\d+)/) || (payload.body || '').match(/#(\d+)/);
            const extractedSon = orderNumMatch ? orderNumMatch[1] : null;
            const notifKey = extractedSon ? `order-${extractedSon}` : (payload.title || 'push-order');

            // Deduplicate: if this order alert was already emitted or handled locally, suppress duplicate
            const shouldAlert = window.App && window.App.shouldNotify ? window.App.shouldNotify(notifKey, 14000) : true;

            if (shouldAlert) {
                // Audible chime feedback
                if (window.App && window.App.playNotificationChime) {
                    window.App.playNotificationChime(notifKey);
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
                    }, notifKey);
                }
            }

            if (window.UI && window.UI._prefetchCache) {
                delete window.UI._prefetchCache['customer_orders'];
                delete window.UI._prefetchCache['customer_dashboard'];
                delete window.UI._prefetchCache['admin_dashboard_data'];
                delete window.UI._prefetchCache['delivery_dashboard_data'];
                delete window.UI._prefetchCache['delivery_dashboard'];
            }

            // 0ms instant optimistic update directly from push notification payload
            let extractedStatus = null;
            const textToInspect = `${payload.title || ''} ${payload.body || ''}`;
            if (/being prepared|preparing/i.test(textToInspect)) extractedStatus = 'Preparing';
            else if (/out for delivery|to deliver|delivery is on its way/i.test(textToInspect)) extractedStatus = 'To Deliver';
            else if (/delivered/i.test(textToInspect)) extractedStatus = 'Delivered';
            else if (/cancelled/i.test(textToInspect)) extractedStatus = 'Cancelled';

            if (extractedStatus && extractedSon) {
                if (State.myOrders && Array.isArray(State.myOrders)) {
                    State.myOrders.forEach(o => {
                        if (o.station_order_number == extractedSon || o.order_id == extractedSon) {
                            o.order_status = extractedStatus;
                        }
                    });
                    if (window.UI && window.UI._currentView === 'customer_orders') window.UI._updateOrdersList();
                    if (window.UI && window.UI._currentView === 'customer_dashboard' && typeof window.UI._updateCustomerDashboardActiveOrders === 'function') {
                        window.UI._updateCustomerDashboardActiveOrders();
                    }
                }
                if (State.adminData?.orders) {
                    State.adminData.orders.forEach(o => {
                        if (o.station_order_number == extractedSon || o.order_id == extractedSon) {
                            o.order_status = extractedStatus;
                        }
                    });
                    if (window.UI && window.UI._currentView === 'admin_dashboard') window.UI._updateAdminOrdersList();
                }
                const dOrders = State.deliveryData?.orders || State.deliveryData?.deliveries;
                if (dOrders) {
                    dOrders.forEach(o => {
                        if (o.station_order_number == extractedSon || o.order_id == extractedSon) {
                            o.order_status = extractedStatus;
                        }
                    });
                    if (window.UI && window.UI._currentView === 'delivery_dashboard') window.UI._updateDeliveryList();
                }
            }
            if (window.UI && window.UI._currentView === 'customer_orders') {
                try {
                    const freshOrders = await API.request('get_customer_orders', 'GET', null, true);
                    if (freshOrders && Array.isArray(freshOrders)) {
                        State.myOrders = freshOrders;
                        window.UI._updateOrdersList();
                    }
                } catch(e) {}
            } else if (window.UI && window.UI._currentView === 'customer_dashboard') {
                try {
                    const freshOrders = await API.request('get_customer_orders', 'GET', null, true);
                    if (freshOrders && Array.isArray(freshOrders)) {
                        State.myOrders = freshOrders;
                        if (typeof window.UI._updateCustomerDashboardActiveOrders === 'function') {
                            window.UI._updateCustomerDashboardActiveOrders();
                        }
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

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });

        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'VERSION_UPDATED' && !refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
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

// Automatically adjust polling rate when tab visibility changes (Fast 1s in foreground, steady 3s in background)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (window.UI && window.UI._adjustPollingInterval) {
            window.UI._adjustPollingInterval(3000);
        }
    } else {
        if (window.UI && window.UI._adjustPollingInterval) {
            window.UI._adjustPollingInterval(1000);
        }
        if (window.App && window.App.refreshCurrentView) {
            window.App.refreshCurrentView();
        }
    }
});