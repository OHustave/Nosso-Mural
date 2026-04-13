(function () {
    'use strict';

    // ==================== IDENTITY (localStorage) ====================
    const Identity = {
        get() {
            try { return JSON.parse(localStorage.getItem('album_identity')); } catch { return null; }
        },
        set(id, name) {
            localStorage.setItem('album_identity', JSON.stringify({ id, name }));
        },
        clear() { localStorage.removeItem('album_identity'); },
        showIndicator() {
            const me = this.get();
            if (!me) return;
            const indicator = document.getElementById('identity-indicator');
            const dot = document.getElementById('identity-dot');
            const nameEl = document.getElementById('identity-name-display');
            indicator.style.display = '';
            dot.className = `identity-dot person-${me.id}`;
            nameEl.textContent = me.name;
        }
    };

    // ==================== TOAST ====================
    const Toast = {
        show(msg, type = 'info') {
            const c = document.getElementById('toast-container');
            const t = document.createElement('div');
            t.className = `toast toast-${type}`;
            t.textContent = msg;
            c.appendChild(t);
            setTimeout(() => {
                t.style.opacity = '0';
                t.style.transition = 'opacity 0.3s';
                setTimeout(() => t.remove(), 300);
            }, 3000);
        }
    };

    // ==================== UTILS ====================
    function esc(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function timeAgo(ts) {
        const diff = Date.now() - ts;
        if (diff < 60000) return 'agora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
        return `${Math.floor(diff / 86400000)}d`;
    }

    function formatDate(ts) {
        return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function formatDateShort(dateStr) {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function badgeHtml(addedBy, addedByName) {
        if (!addedBy) return '';
        return `<span class="poster-badge person-${addedBy}">${esc(addedByName || ('Pessoa ' + addedBy))}</span>`;
    }

    let appConfig = {};

    function updateNames(config) {
        appConfig = config;
        const names = `${config.name1} & ${config.name2}`;
        const el = (id) => document.getElementById(id);
        if (el('home-names')) el('home-names').textContent = names;
        if (el('footer-names')) el('footer-names').textContent = names;
        if (el('nav-brand')) el('nav-brand').textContent = `💕 ${names}`;
        if (el('msg-filter-1')) el('msg-filter-1').textContent = config.name1;
        if (el('msg-filter-2')) el('msg-filter-2').textContent = config.name2;
    }

    // ==================== ACTIVITY LOG ====================
    const ActivityLog = {
        iconMap: {
            'foto_add': '📷', 'foto_del': '🗑️', 'foto_fav': '⭐',
            'video_add': '🎬', 'video_del': '🗑️',
            'msg_add': '💌', 'msg_del': '🗑️', 'msg_fav': '⭐',
            'music_add': '🎵', 'music_del': '🗑️', 'music_play': '▶️',
            'timeline_add': '📅', 'timeline_del': '🗑️',
            'config': '⚙️'
        },
        data: [],
        add(action, detail) {
            const me = Identity.get();
            this.data.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                action, detail, timestamp: Date.now(),
                addedBy: me ? me.id : '0',
                addedByName: me ? me.name : 'Sistema'
            });
            this.saveToStorage();
            this.render();
        },
        saveToStorage() {
            localStorage.setItem('album_log', JSON.stringify(this.data));
        },
        render() {
            const list = document.getElementById('log-list');
            const empty = document.getElementById('log-empty');
            if (!this.data.length) { list.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            list.innerHTML = this.data.slice().reverse().map(l => `
                <div class="log-item">
                    <span class="log-icon">${this.iconMap[l.action] || '📋'}</span>
                    <span class="log-detail">${esc(l.detail)} ${badgeHtml(l.addedBy, l.addedByName)}</span>
                    <span class="log-time">${timeAgo(l.timestamp)}</span>
                </div>
            `).join('');
        }
    };

    // ==================== WELCOME & SETUP ====================
    const Welcome = {
        init() {
            document.getElementById('welcome-loading').style.display = 'none';
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('navbar').style.display = '';
            document.getElementById('main-content').style.display = '';
            document.getElementById('footer').style.display = '';

            const config = this.loadConfig();
            if (!config || !config.name1) {
                document.getElementById('welcome-screen').style.display = 'flex';
                document.getElementById('setup-form').style.display = '';
                document.getElementById('setup-btn').addEventListener('click', () => this.saveSetup());
            } else {
                updateNames(config);
                IdentityPicker.show(config);
            }
        },
        loadConfig() {
            try {
                const config = localStorage.getItem('album_config');
                return config ? JSON.parse(config) : null;
            } catch {
                return null;
            }
        },
        saveSetup() {
            const n1 = document.getElementById('setup-name1').value.trim();
            const n2 = document.getElementById('setup-name2').value.trim();
            const d = document.getElementById('setup-date').value;
            if (!n1 || !n2 || !d) { Toast.show('Preencha todos os campos!', 'error'); return; }
            const config = { name1: n1, name2: n2, startDate: d };
            localStorage.setItem('album_config', JSON.stringify(config));
            updateNames(config);
            this.showWelcome(config);
            ActivityLog.add('config', 'Álbum configurado');
        },
        showWelcome(config) {
            document.getElementById('welcome-display').style.display = '';
            document.getElementById('welcome-names').textContent = `${config.name1} & ${config.name2}`;
            if (config.startDate) {
                Counter.init(config.startDate);
                Quotes.startRotation();
            }
            document.getElementById('enter-btn').addEventListener('click', () => this.enter());
        },
        enter() {
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('navbar').style.display = '';
            document.getElementById('main-content').style.display = '';
            document.getElementById('footer').style.display = '';
            App.startApp();
        }
    };

    // ==================== IDENTITY PICKER ====================
    const IdentityPicker = {
        show(config) {
            document.getElementById('identity-name-1').textContent = config.name1;
            document.getElementById('identity-name-2').textContent = config.name2;
            document.getElementById('identity-modal').style.display = '';

            document.getElementById('identity-btn-1').onclick = () => this.pick('1', config.name1, config);
            document.getElementById('identity-btn-2').onclick = () => this.pick('2', config.name2, config);
        },
        pick(id, name, config) {
            Identity.set(id, name);
            Identity.showIndicator();
            document.getElementById('identity-modal').style.display = 'none';
            Welcome.showWelcome(config);
        }
    };

    // ==================== COUNTER ====================
    const Counter = {
        interval: null,
        init(startDate) {
            if (!startDate) return;
            const grid = document.getElementById('counter-grid');
            grid.innerHTML = ['Anos', 'Meses', 'Dias', 'Horas', 'Minutos', 'Segundos'].map((label, i) =>
                `<div class="counter-item glass-card"><span class="counter-value" id="cv-${i}">0</span><span class="counter-label">${label}</span></div>`
            ).join('');
            this.update(startDate);
            this.interval = setInterval(() => this.update(startDate), 1000);
        },
        update(startDate) {
            const start = new Date(startDate);
            const now = new Date();
            let years = now.getFullYear() - start.getFullYear();
            let months = now.getMonth() - start.getMonth();
            let days = now.getDate() - start.getDate();
            if (days < 0) { months--; days += 30; }
            if (months < 0) { years--; months += 12; }
            const diff = now - start;
            const h = ((diff % 86400000) / 3600000) | 0;
            const m = ((diff % 3600000) / 60000) | 0;
            const s = ((diff % 60000) / 1000) | 0;
            [years, months, days, h, m, s].forEach((v, i) => {
                const el = document.getElementById(`cv-${i}`);
                if (el) el.textContent = v;
            });
        }
    };

    // ==================== GALLERY ====================
    const Gallery = {
        data: [],
        currentFilter: 'all',
        searchTerm: '',
        lightboxIndex: 0,
        _filtered: [],
        init() {
            this.data = JSON.parse(localStorage.getItem('album_photos') || '[]');
            document.getElementById('photo-input').addEventListener('change', (e) => this.handleUpload(e));
            document.getElementById('photo-search').addEventListener('input', (e) => { this.searchTerm = e.target.value; this.render(); });
            document.querySelectorAll('[data-filter]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentFilter = btn.dataset.filter;
                    this.render();
                });
            });
            document.getElementById('gallery-grid').addEventListener('click', (e) => this.handleGridClick(e));
            this.initLightbox();
            this.render();
        },
        handleUpload(e) {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            const me = Identity.get();
            let count = 0;
            Toast.show(`Carregando ${files.length} foto(s)...`, 'info');

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = () => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const maxW = 800;
                        let w = img.width, h = img.height;
                        if (w > maxW) { h = (h * maxW) / w; w = maxW; }
                        canvas.width = w;
                        canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        const compressed = canvas.toDataURL('image/jpeg', 0.8);
                        this.data.push({
                            id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                            url: compressed,
                            caption: '',
                            timestamp: Date.now(),
                            addedBy: me ? me.id : '0',
                            addedByName: me ? me.name : 'Anônimo',
                            favorite: false
                        });
                        count++;
                        if (count === files.length) {
                            this.saveToStorage();
                            this.render();
                            document.getElementById('stat-photos').textContent = this.data.length;
                            ActivityLog.add('foto_add', `${files.length} foto(s) adicionada(s)`);
                        }
                    };
                    img.src = reader.result;
                };
                reader.readAsDataURL(file);
            });
            e.target.value = '';
        },
        saveToStorage() {
            localStorage.setItem('album_photos', JSON.stringify(this.data));
        },
        render() {
            let photos = this.data.slice();
            if (this.currentFilter === 'favorites') photos = photos.filter(p => p.favorite);
            if (this.searchTerm) photos = photos.filter(p => p.caption.toLowerCase().includes(this.searchTerm.toLowerCase()));
            this._filtered = photos;
            const grid = document.getElementById('gallery-grid');
            const empty = document.getElementById('gallery-empty');
            if (!photos.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            grid.innerHTML = photos.map((p, i) => `
                <div class="photo-card" data-id="${p.id}">
                    ${badgeHtml(p.addedBy, p.addedByName) ? `<span class="photo-poster-badge">${badgeHtml(p.addedBy, p.addedByName)}</span>` : ''}
                    <img src="${esc(p.url)}" alt="${esc(p.caption)}" loading="lazy">
                    <div class="photo-overlay">
                        <span class="photo-caption">${esc(p.caption)}</span>
                        <div class="photo-actions">
                            <button class="fav-btn ${p.favorite ? 'fav-active' : ''}" data-id="${p.id}" title="Favoritar">⭐</button>
                            <button class="del-btn" data-id="${p.id}" title="Excluir">🗑️</button>
                        </div>
                    </div>
                </div>
            `).join('');
        },
        handleGridClick(e) {
            const favBtn = e.target.closest('.fav-btn');
            const delBtn = e.target.closest('.del-btn');
            if (favBtn) {
                const id = favBtn.dataset.id;
                const photo = this.data.find(p => p.id === id);
                if (photo) {
                    photo.favorite = !photo.favorite;
                    this.saveToStorage();
                    this.render();
                    ActivityLog.add('foto_fav', photo.favorite ? 'Foto favoritada' : 'Foto desfavoritada');
                }
            }
            if (delBtn) {
                const id = delBtn.dataset.id;
                this.data = this.data.filter(p => p.id !== id);
                this.saveToStorage();
                this.render();
                document.getElementById('stat-photos').textContent = this.data.length;
                ActivityLog.add('foto_del', 'Foto excluída');
            }
            const card = e.target.closest('.photo-card');
            if (card && !e.target.closest('.fav-btn') && !e.target.closest('.del-btn')) {
                const idx = this._filtered.findIndex(p => p.id === card.dataset.id);
                if (idx >= 0) this.openLightbox(idx);
            }
        },
        initLightbox() {
            const lb = document.getElementById('lightbox');
            document.getElementById('lightbox-close').addEventListener('click', () => lb.style.display = 'none');
            document.getElementById('lightbox-prev').addEventListener('click', () => this.navLightbox(-1));
            document.getElementById('lightbox-next').addEventListener('click', () => this.navLightbox(1));
            document.addEventListener('keydown', (e) => {
                if (lb.style.display !== '') return;
                if (e.key === 'ArrowLeft') this.navLightbox(-1);
                if (e.key === 'ArrowRight') this.navLightbox(1);
                if (e.key === 'Escape') lb.style.display = 'none';
            });
            let touchX = 0;
            lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; });
            lb.addEventListener('touchend', (e) => {
                const diff = e.changedTouches[0].clientX - touchX;
                if (Math.abs(diff) > 50) this.navLightbox(diff > 0 ? -1 : 1);
            });
        },
        openLightbox(index) {
            const photos = this._filtered;
            if (!photos[index]) return;
            this.lightboxIndex = index;
            document.getElementById('lightbox-img').src = photos[index].url;
            document.getElementById('lightbox-caption').textContent = photos[index].caption || '';
            document.getElementById('lightbox').style.display = '';
        },
        navLightbox(dir) {
            const photos = this._filtered;
            if (!photos.length) return;
            this.lightboxIndex = (this.lightboxIndex + dir + photos.length) % photos.length;
            document.getElementById('lightbox-img').src = photos[this.lightboxIndex].url;
            document.getElementById('lightbox-caption').textContent = photos[this.lightboxIndex].caption || '';
        }
    };

    // ==================== VIDEOS ====================
    const Videos = {
        data: [],
        init() {
            this.data = JSON.parse(localStorage.getItem('album_videos') || '[]');
            document.getElementById('add-video-btn').addEventListener('click', () => this.add());
            document.getElementById('video-grid').addEventListener('click', (e) => {
                const delBtn = e.target.closest('.del-btn');
                if (delBtn) {
                    const id = delBtn.dataset.id;
                    this.data = this.data.filter(v => v.id !== id);
                    this.saveToStorage();
                    this.render();
                    ActivityLog.add('video_del', 'Vídeo excluído');
                }
            });
            this.render();
        },
        saveToStorage() {
            localStorage.setItem('album_videos', JSON.stringify(this.data));
        },
        parseYouTube(url) {
            const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            return m ? m[1] : null;
        },
        add() {
            const url = document.getElementById('video-url').value.trim();
            const title = document.getElementById('video-title').value.trim();
            if (!url) { Toast.show('Cole uma URL!', 'error'); return; }
            const ytId = this.parseYouTube(url);
            if (!ytId) { Toast.show('URL inválida!', 'error'); return; }
            const me = Identity.get();
            this.data.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                ytId, title: title || 'Sem título', timestamp: Date.now(),
                addedBy: me ? me.id : '0', addedByName: me ? me.name : ''
            });
            this.saveToStorage();
            this.render();
            document.getElementById('video-url').value = '';
            document.getElementById('video-title').value = '';
            ActivityLog.add('video_add', `Vídeo "${title || 'Sem título'}" adicionado`);
            Toast.show('Vídeo adicionado! 🎬', 'success');
        },
        render() {
            const grid = document.getElementById('video-grid');
            const empty = document.getElementById('video-empty');
            if (!this.data.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            grid.innerHTML = this.data.map(v => `
                <div class="video-card glass-card">
                    <iframe width="100%" height="315" src="https://www.youtube.com/embed/${v.ytId}" title="YouTube video" allowfullscreen="" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" loading="lazy"></iframe>
                    <div class="video-card-header">
                        <span class="video-card-title">${esc(v.title)} ${badgeHtml(v.addedBy, v.addedByName)}</span>
                        <button class="del-btn btn-icon" data-id="${v.id}" title="Excluir">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
    };

    // ==================== MESSAGES ====================
    const Messages = {
        data: [],
        currentFilter: 'all',
        currentAuthor: null,
        emojis: ['❤️','😍','🥰','💕','💖','💗','💓','💘','💝','😘','🤗','😊','🥺','✨','🌹','🌸','💐','🦋','🌙','⭐','🔥','💋','👫','🤍','💜','💙','🧡','💚','🎉','😂'],
        init() {
            this.data = JSON.parse(localStorage.getItem('album_messages') || '[]');
            const me = Identity.get();
            this.currentAuthor = me ? me.id : '1';
            document.getElementById('send-msg-btn').addEventListener('click', () => this.send());
            document.getElementById('msg-input').addEventListener('keydown', (e) => { if (e.ctrlKey && e.key === 'Enter') this.send(); });
            document.getElementById('emoji-toggle').addEventListener('click', () => {
                const ep = document.getElementById('emoji-picker');
                ep.style.display = ep.style.display === 'none' ? '' : 'none';
            });
            const ep = document.getElementById('emoji-picker');
            ep.innerHTML = this.emojis.map(e => `<button class="emoji-btn" data-emoji="${e}">${e}</button>`).join('');
            ep.addEventListener('click', (e) => {
                if (e.target.dataset.emoji) {
                    document.getElementById('msg-input').value += e.target.dataset.emoji;
                    ep.style.display = 'none';
                }
            });
            document.querySelectorAll('[data-msg-filter]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('[data-msg-filter]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentFilter = btn.dataset.msgFilter;
                    this.render();
                });
            });
            document.getElementById('messages-list').addEventListener('click', (e) => {
                const favBtn = e.target.closest('.msg-fav-btn');
                const delBtn = e.target.closest('.msg-delete-btn');
                if (favBtn) {
                    const id = favBtn.dataset.id;
                    const msg = this.data.find(m => m.id === id);
                    if (msg) { msg.favorite = !msg.favorite; this.saveToStorage(); this.render(); }
                }
                if (delBtn) {
                    const id = delBtn.dataset.id;
                    this.data = this.data.filter(m => m.id !== id);
                    this.saveToStorage();
                    this.render();
                    ActivityLog.add('msg_del', 'Mensagem excluída');
                }
            });
            this.render();
        },
        saveToStorage() {
            localStorage.setItem('album_messages', JSON.stringify(this.data));
        },
        send() {
            const input = document.getElementById('msg-input');
            const text = input.value.trim();
            if (!text) { Toast.show('Digite uma mensagem!', 'error'); return; }
            const me = Identity.get();
            this.data.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                author: me ? me.id : '1',
                authorName: me ? me.name : 'Anônimo',
                text, timestamp: Date.now(),
                favorite: false
            });
            this.saveToStorage();
            this.render();
            input.value = '';
            document.getElementById('stat-messages').textContent = this.data.length;
            ActivityLog.add('msg_add', 'Mensagem enviada');
        },
        render() {
            let msgs = this.data.slice();
            if (this.currentFilter === '1') msgs = msgs.filter(m => m.author === '1');
            if (this.currentFilter === '2') msgs = msgs.filter(m => m.author === '2');
            if (this.currentFilter === 'favorites') msgs = msgs.filter(m => m.favorite);
            const list = document.getElementById('messages-list');
            const empty = document.getElementById('msg-empty');
            if (!msgs.length) { list.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            list.innerHTML = msgs.slice().reverse().map(m => `
                <div class="message-bubble author-${m.author}">
                    <div class="msg-author-name">${esc(m.authorName)}</div>
                    <div class="msg-text">${esc(m.text)}</div>
                    <div class="msg-meta">
                        <span>${timeAgo(m.timestamp)}</span>
                        <div>
                            <button class="msg-fav-btn" data-id="${m.id}" title="Favoritar">${m.favorite ? '⭐' : '☆'}</button>
                            <button class="msg-delete-btn" data-id="${m.id}" title="Excluir">🗑️</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    };

    // ==================== MUSIC ====================
    const Music = {
        data: [],
        currentPlaying: null,
        init() {
            this.data = JSON.parse(localStorage.getItem('album_music') || '[]');
            document.getElementById('add-music-btn').addEventListener('click', () => this.add());
            document.getElementById('playlist').addEventListener('click', (e) => {
                const playBtn = e.target.closest('.playlist-item');
                const delBtn = e.target.closest('.playlist-item-delete');
                if (delBtn && !e.target.closest('.playlist-item-delete')) {
                    const id = delBtn.dataset.id;
                    this.data = this.data.filter(m => m.id !== id);
                    this.saveToStorage();
                    this.render();
                    ActivityLog.add('music_del', 'Música removida');
                }
                if (playBtn && !e.target.closest('.playlist-item-delete')) this.play(playBtn.dataset.id);
            });
            this.render();
        },
        saveToStorage() {
            localStorage.setItem('album_music', JSON.stringify(this.data));
        },
        parseUrl(url) {
            const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (ytMatch) return { platform: 'youtube', id: ytMatch[1] };
            const spotMatch = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
            if (spotMatch) return { platform: 'spotify', id: spotMatch[1] };
            return null;
        },
        add() {
            const url = document.getElementById('music-url').value.trim();
            const title = document.getElementById('music-title').value.trim();
            if (!url) { Toast.show('Cole uma URL!', 'error'); return; }
            const parsed = this.parseUrl(url);
            if (!parsed) { Toast.show('URL inválida!', 'error'); return; }
            const me = Identity.get();
            this.data.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                title: title || 'Sem título',
                platform: parsed.platform,
                embedId: parsed.id,
                timestamp: Date.now(),
                addedBy: me ? me.id : '0',
                addedByName: me ? me.name : ''
            });
            this.saveToStorage();
            this.render();
            document.getElementById('music-url').value = '';
            document.getElementById('music-title').value = '';
            ActivityLog.add('music_add', `Música "${title || 'Sem título'}" adicionada`);
            Toast.show('Música adicionada! 🎵', 'success');
        },
        play(id) {
            const music = this.data.find(m => m.id === id);
            if (!music) return;
            this.currentPlaying = id;
            const container = document.getElementById('player-container');
            const player = document.getElementById('music-player');
            if (music.platform === 'youtube') {
                container.innerHTML = `<iframe width="100%" height="80" src="https://www.youtube.com/embed/${music.embedId}" title="YouTube music" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen="" loading="lazy"></iframe>`;
            } else if (music.platform === 'spotify') {
                container.innerHTML = `<iframe src="https://open.spotify.com/embed/track/${music.embedId}" width="100%" height="80" frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
            }
            player.style.display = '';
            this.render();
            ActivityLog.add('music_play', `Tocando "${music.title}"`);
        },
        autoplayFirst() {
            if (this.data.length) this.play(this.data[0].id);
        },
        render() {
            const list = document.getElementById('playlist');
            const empty = document.getElementById('music-empty');
            if (!this.data.length) { list.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            list.innerHTML = this.data.map(m => `
                <div class="playlist-item ${this.currentPlaying === m.id ? 'playing' : ''}" data-id="${m.id}">
                    <span class="playlist-item-icon">${m.platform === 'youtube' ? '🎬' : '🎵'}</span>
                    <div>
                        <div class="playlist-item-title">${esc(m.title)}</div>
                        <span class="playlist-item-platform">${m.platform === 'youtube' ? 'YouTube' : 'Spotify'} ${badgeHtml(m.addedBy, m.addedByName)}</span>
                    </div>
                    <button class="playlist-item-delete btn-icon" data-id="${m.id}">🗑️</button>
                </div>
            `).join('');
        }
    };

    // ==================== TIMELINE ====================
    const Timeline = {
        data: [],
        init() {
            this.data = JSON.parse(localStorage.getItem('album_timeline') || '[]');
            document.getElementById('add-timeline-btn').addEventListener('click', () => this.add());
            this.render();
        },
        saveToStorage() {
            localStorage.setItem('album_timeline', JSON.stringify(this.data));
        },
        add() {
            const date = document.getElementById('timeline-date').value;
            const title = document.getElementById('timeline-title').value.trim();
            const desc = document.getElementById('timeline-desc').value.trim();
            if (!date || !title) { Toast.show('Preencha data e título!', 'error'); return; }
            const me = Identity.get();
            this.data.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                date, title, desc, timestamp: Date.now(),
                addedBy: me ? me.id : '0',
                addedByName: me ? me.name : ''
            });
            this.saveToStorage();
            this.render();
            document.getElementById('timeline-date').value = '';
            document.getElementById('timeline-title').value = '';
            document.getElementById('timeline-desc').value = '';
            ActivityLog.add('timeline_add', `Memória "${title}" adicionada`);
            Toast.show('Memória adicionada! 📅', 'success');
        },
        render() {
            const list = document.getElementById('timeline-list');
            const empty = document.getElementById('timeline-empty');
            if (!this.data.length) { list.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            const sorted = this.data.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
            list.innerHTML = sorted.map(t => `
                <div class="timeline-item">
                    <div class="timeline-date">${formatDateShort(t.date)}</div>
                    <div class="timeline-item-title">${esc(t.title)}</div>
                    <div class="timeline-item-desc">${esc(t.desc)}</div>
                    <div class="timeline-item-actions">
                        <button class="del-btn btn-icon" data-id="${t.id}">🗑️</button>
                    </div>
                </div>
            `).join('');
            list.addEventListener('click', (e) => {
                const delBtn = e.target.closest('.del-btn');
                if (delBtn) {
                    const id = delBtn.dataset.id;
                    this.data = this.data.filter(t => t.id !== id);
                    this.saveToStorage();
                    this.render();
                    ActivityLog.add('timeline_del', 'Memória excluída');
                }
            });
        }
    };

    // ==================== SETTINGS ====================
    const Settings = {
        init() {
            document.getElementById('settings-btn').addEventListener('click', () => this.open());
            document.getElementById('settings-close').addEventListener('click', () => this.close());
            document.getElementById('save-settings').addEventListener('click', () => this.save());
        },
        open() {
            const config = Welcome.loadConfig();
            if (config) {
                document.getElementById('setting-name1').value = config.name1 || '';
                document.getElementById('setting-name2').value = config.name2 || '';
                document.getElementById('setting-date').value = config.startDate || '';
            }
            document.getElementById('settings-modal').style.display = '';
        },
        close() {
            document.getElementById('settings-modal').style.display = 'none';
        },
        save() {
            const n1 = document.getElementById('setting-name1').value.trim();
            const n2 = document.getElementById('setting-name2').value.trim();
            const d = document.getElementById('setting-date').value;
            if (!n1 || !n2 || !d) { Toast.show('Preencha todos os campos!', 'error'); return; }
            const config = { name1: n1, name2: n2, startDate: d };
            localStorage.setItem('album_config', JSON.stringify(config));
            updateNames(config);
            this.close();
            ActivityLog.add('config', 'Configurações atualizadas');
            Toast.show('Configurações salvas!', 'success');
        }
    };

    // ==================== DARK MODE ====================
    const DarkMode = {
        init() {
            const theme = localStorage.getItem('album_theme') || 'light';
            if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
            const toggle = document.getElementById('dark-mode-toggle');
            if (toggle) toggle.addEventListener('click', () => this.toggle());
            this.updateIcon();
        },
        toggle() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
            localStorage.setItem('album_theme', isDark ? 'light' : 'dark');
            this.updateIcon();
        },
        updateIcon() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const icon = document.getElementById('theme-icon');
            const label = document.getElementById('theme-label');
            if (icon) icon.textContent = isDark ? '☀️' : '🌙';
            if (label) label.textContent = isDark ? 'Claro' : 'Escuro';
        }
    };

    // ==================== HEARTS ====================
    const Hearts = {
        interval: null,
        heartChars: ['❤️', '💕', '💖', '💗', '💓', '🤍', '💜'],
        init() {
            const container = document.getElementById('hearts-container');
            if (container) this.interval = setInterval(() => this.spawn(), 500);
        },
        spawn() {
            const container = document.getElementById('hearts-container');
            if (!container) return;
            const h = document.createElement('div');
            h.className = 'floating-heart';
            h.textContent = this.heartChars[Math.floor(Math.random() * this.heartChars.length)];
            h.style.left = Math.random() * 100 + '%';
            container.appendChild(h);
            setTimeout(() => h.remove(), 3000);
        }
    };

    // ==================== QUOTES ====================
    const Quotes = {
        list: [
            '"O amor não se vê com os olhos, mas com o coração."',
            '"Amar não é olhar um para o outro, é olhar juntos na mesma direção."',
            '"Você é o meu hoje e todos os meus amanhãs."',
            '"Em você eu encontrei o amor que nem nos contos de fadas eu vi."',
            '"Cada momento ao seu lado é um presente que guardo no coração."',
            '"O melhor da minha vida começou quando te encontrei."',
            '"Seu sorriso é a minha poesia favorita."',
            '"Juntos somos um poema que nunca terá ponto final."',
            '"Você é a razão dos meus sorrisos mais sinceros."',
            '"Nosso amor é a mais bela das histórias."',
            '"Contigo, até o silêncio fala de amor."',
            '"Meu lugar favorito no mundo é ao seu lado."',
            '"Amar você é a minha aventura preferida."',
            '"Você transforma dias comuns em momentos mágicos."',
            '"Nosso amor cresce a cada batida do coração."',
            '"Com você, cada dia é um novo capítulo de felicidade."',
            '"Você é o sonho que eu não quero acordar."',
            '"Meu coração escolheu você, e escolheria de novo."',
            '"Juntos, somos mais bonitos que qualquer pôr do sol."',
            '"Você é minha pessoa favorita em qualquer universo."'
        ],
        interval: null,
        show() {
            const quote = document.getElementById('love-quote');
            if (quote) quote.textContent = this.list[Math.floor(Math.random() * this.list.length)];
        },
        startRotation() {
            this.show();
            this.interval = setInterval(() => this.show(), 8000);
        }
    };

    // ==================== NAVBAR ====================
    const Nav = {
        init() {
            const hamburger = document.getElementById('hamburger');
            const navLinks = document.getElementById('nav-links');
            const links = navLinks.querySelectorAll('.nav-link');

            if (hamburger) {
                hamburger.addEventListener('click', () => {
                    hamburger.classList.toggle('active');
                    navLinks.classList.toggle('open');
                });
            }

            links.forEach(link => {
                link.addEventListener('click', (e) => {
                    const section = link.dataset.section;
                    if (section) {
                        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                        link.classList.add('active');
                        const el = document.getElementById(section);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                        hamburger.classList.remove('active');
                        navLinks.classList.remove('open');
                    }
                });
            });

            document.getElementById('change-identity-btn').addEventListener('click', () => {
                const config = Welcome.loadConfig();
                if (config) IdentityPicker.show(config);
            });
        }
    };

    // ==================== REAL-TIME LISTENERS ====================
    function setupListeners() {
        Gallery.render();
        document.getElementById('stat-photos').textContent = Gallery.data.length;

        Videos.render();

        Messages.render();
        document.getElementById('stat-messages').textContent = Messages.data.length;

        Music.autoplayFirst();
        Music.render();

        Timeline.render();

        ActivityLog.data = JSON.parse(localStorage.getItem('album_log') || '[]');
        ActivityLog.render();
    }

    // ==================== APP ====================
    const App = {
        init() {
            DarkMode.init();
            Welcome.init();
        },
        startApp() {
            Gallery.init();
            Videos.init();
            Messages.init();
            Music.init();
            Timeline.init();
            Settings.init();
            Nav.init();
            Hearts.init();
            setupListeners();
            Identity.showIndicator();
        }
    };

    window.addEventListener('DOMContentLoaded', () => App.init());
})();(function () {
    'use strict';

    // ==================== IDENTITY (localStorage) ====================
    const Identity = {
        get() {
            try { return JSON.parse(localStorage.getItem('album_identity')); } catch { return null; }
        },
        set(id, name) {
            localStorage.setItem('album_identity', JSON.stringify({ id, name }));
        },
        clear() { localStorage.removeItem('album_identity'); },
        showIndicator() {
            const me = this.get();
            if (!me) return;
            const indicator = document.getElementById('identity-indicator');
            const dot = document.getElementById('identity-dot');
            const nameEl = document.getElementById('identity-name-display');
            indicator.style.display = '';
            dot.className = `identity-dot person-${me.id}`;
            nameEl.textContent = me.name;
        }
    };

    // ==================== TOAST ====================
    const Toast = {
        show(msg, type = 'info') {
            const c = document.getElementById('toast-container');
            const t = document.createElement('div');
            t.className = `toast toast-${type}`;
            t.textContent = msg;
            c.appendChild(t);
            setTimeout(() => {
                t.style.opacity = '0';
                t.style.transition = 'opacity 0.3s';
                setTimeout(() => t.remove(), 300);
            }, 3000);
        }
    };

    // ==================== UTILS ====================
    function esc(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function timeAgo(ts) {
        const diff = Date.now() - ts;
        if (diff < 60000) return 'agora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
        return `${Math.floor(diff / 86400000)}d`;
    }

    function formatDate(ts) {
        return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function formatDateShort(dateStr) {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function badgeHtml(addedBy, addedByName) {
        if (!addedBy) return '';
        return `<span class="poster-badge person-${addedBy}">${esc(addedByName || ('Pessoa ' + addedBy))}</span>`;
    }

    let appConfig = {};

    function updateNames(config) {
        appConfig = config;
        const names = `${config.name1} & ${config.name2}`;
        const el = (id) => document.getElementById(id);
        if (el('home-names')) el('home-names').textContent = names;
        if (el('footer-names')) el('footer-names').textContent = names;
        if (el('nav-brand')) el('nav-brand').textContent = `💕 ${names}`;
        if (el('msg-filter-1')) el('msg-filter-1').textContent = config.name1;
        if (el('msg-filter-2')) el('msg-filter-2').textContent = config.name2;
    }

    // ==================== ACTIVITY LOG ====================
    const ActivityLog = {
        iconMap: {
            'foto_add': '📷', 'foto_del': '🗑️', 'foto_fav': '⭐',
            'video_add': '🎬', 'video_del': '🗑️',
            'msg_add': '💌', 'msg_del': '🗑️', 'msg_fav': '⭐',
            'music_add': '🎵', 'music_del': '🗑️', 'music_play': '▶️',
            'timeline_add': '📅', 'timeline_del': '🗑️',
            'config': '⚙️'
        },
        data: [],
        add(action, detail) {
            const me = Identity.get();
            this.data.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                action, detail, timestamp: Date.now(),
                addedBy: me ? me.id : '0',
                addedByName: me ? me.name : 'Sistema'
            });
            this.saveToStorage();
            this.render();
        },
        saveToStorage() {
            localStorage.setItem('album_log', JSON.stringify(this.data));
        },
        render() {
            const list = document.getElementById('log-list');
            const empty = document.getElementById('log-empty');
            if (!this.data.length) { list.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            list.innerHTML = this.data.slice().reverse().map(l => `
                <div class="log-item">
                    <span class="log-icon">${this.iconMap[l.action] || '📋'}</span>
                    <span class="log-detail">${esc(l.detail)} ${badgeHtml(l.addedBy, l.addedByName)}</span>
                    <span class="log-time">${timeAgo(l.timestamp)}</span>
                </div>
            `).join('');
        }
    };

    // ==================== WELCOME & SETUP ====================
    const Welcome = {
        init() {
            document.getElementById('welcome-loading').style.display = 'none';
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('navbar').style.display = '';
            document.getElementById('main-content').style.display = '';
            document.getElementById('footer').style.display = '';

            const config = this.loadConfig();
            if (!config || !config.name1) {
                document.getElementById('welcome-screen').style.display = 'flex';
                document.getElementById('setup-form').style.display = '';
                document.getElementById('setup-btn').addEventListener('click', () => this.saveSetup());
            } else {
                updateNames(config);
                IdentityPicker.show(config);
            }
        },
        loadConfig() {
            try {
                const config = localStorage.getItem('album_config');
                return config ? JSON.parse(config) : null;
            } catch {
                return null;
            }
        },
        saveSetup() {
            const n1 = document.getElementById('setup-name1').value.trim();
            const n2 = document.getElementById('setup-name2').value.trim();
            const d = document.getElementById('setup-date').value;
            if (!n1 || !n2 || !d) { Toast.show('Preencha todos os campos!', 'error'); return; }
            const config = { name1: n1, name2: n2, startDate: d };
            localStorage.setItem('album_config', JSON.stringify(config));
            updateNames(config);
            this.showWelcome(config);
            ActivityLog.add('config', 'Álbum configurado');
        },
        showWelcome(config) {
            document.getElementById('welcome-display').style.display = '';
            document.getElementById('welcome-names').textContent = `${config.name1} & ${config.name2}`;
            if (config.startDate) {
                Counter.init(config.startDate);
                Quotes.startRotation();
            }
            document.getElementById('enter-btn').addEventListener('click', () => this.enter());
        },
        enter() {
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('navbar').style.display = '';
            document.getElementById('main-content').style.display = '';
            document.getElementById('footer').style.display = '';
            App.startApp();
        }
    };

    // ==================== IDENTITY PICKER ====================
    const IdentityPicker = {
        show(config) {
            document.getElementById('identity-name-1').textContent = config.name1;
            document.getElementById('identity-name-2').textContent = config.name2;
            document.getElementById('identity-modal').style.display = '';

            document.getElementById('identity-btn-1').onclick = () => this.pick('1', config.name1, config);
            document.getElementById('identity-btn-2').onclick = () => this.pick('2', config.name2, config);
        },
        pick(id, name, config) {
            Identity.set(id, name);
            Identity.showIndicator();
            document.getElementById('identity-modal').style.display = 'none';
            Welcome.showWelcome(config);
        }
    };

    // ==================== COUNTER ====================
    const Counter = {
        interval: null,
        init(startDate) {
            if (!startDate) return;
            const grid = document.getElementById('counter-grid');
            grid.innerHTML = ['Anos', 'Meses', 'Dias', 'Horas', 'Minutos', 'Segundos'].map((label, i) =>
                `<div class="counter-item glass-card"><span class="counter-value" id="cv-${i}">0</span><span class="counter-label">${label}</span></div>`
            ).join('');
            this.update(startDate);
            this.interval = setInterval(() => this.update(startDate), 1000);
        },
        update(startDate) {
            const start = new Date(startDate);
            const now = new Date();
            let years = now.getFullYear() - start.getFullYear();
            let months = now.getMonth() - start.getMonth();
            let days = now.getDate() - start.getDate();
            if (days < 0) { months--; days += 30; }
            if (months < 0) { years--; months += 12; }
            const diff = now - start;
            const h = ((diff % 86400000) / 3600000) | 0;
            const m = ((diff % 3600000) / 60000) | 0;
            const s = ((diff % 60000) / 1000) | 0;
            [years, months, days, h, m, s].forEach((v, i) => {
                const el = document.getElementById(`cv-${i}`);
                if (el) el.textContent = v;
            });
        }
    };

    // ==================== GALLERY ====================
    const Gallery = {
        data: [],
        currentFilter: 'all',
        searchTerm: '',
        lightboxIndex: 0,
        _filtered: [],
        init() {
            this.data = JSON.parse(localStorage.getItem('album_photos') || '[]');
            document.getElementById('photo-input').addEventListener('change', (e) => this.handleUpload(e));
            document.getElementById('photo-search').addEventListener('input', (e) => { this.searchTerm = e.target.value; this.render(); });
            document.querySelectorAll('[data-filter]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentFilter = btn.dataset.filter;
                    this.render();
                });
            });
            document.getElementById('gallery-grid').addEventListener('click', (e) => this.handleGridClick(e));
            this.initLightbox();
            this.render();
        },
        handleUpload(e) {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            const me = Identity.get();
            let count = 0;
            Toast.show(`Carregando ${files.length} foto(s)...`, 'info');

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = () => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const maxW = 800;
                        let w = img.width, h = img.height;
                        if (w > maxW) { h = (h * maxW) / w; w = maxW; }
                        canvas.width = w;
                        canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        const compressed = canvas.toDataURL('image/jpeg', 0.8);
                        this.data.push({
                            id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                            url: compressed,
                            caption: '',
                            timestamp: Date.now(),
                            addedBy: me ? me.id : '0',
                            addedByName: me ? me.name : 'Anônimo',
                            favorite: false
                        });
                        count++;
                        if (count === files.length) {
                            this.saveToStorage();
                            this.render();
                            document.getElementById('stat-photos').textContent = this.data.length;
                            ActivityLog.add('foto_add', `${files.length} foto(s) adicionada(s)`);
                        }
                    };
                    img.src = reader.result;
                };
                reader.readAsDataURL(file);
            });
            e.target.value = '';
        },
        saveToStorage() {
            localStorage.setItem('album_photos', JSON.stringify(this.data));
        },
        render() {
            let photos = this.data.slice();
            if (this.currentFilter === 'favorites') photos = photos.filter(p => p.favorite);
            if (this.searchTerm) photos = photos.filter(p => p.caption.toLowerCase().includes(this.searchTerm.toLowerCase()));
            this._filtered = photos;
            const grid = document.getElementById('gallery-grid');
            const empty = document.getElementById('gallery-empty');
            if (!photos.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            grid.innerHTML = photos.map((p, i) => `
                <div class="photo-card" data-id="${p.id}">
                    ${badgeHtml(p.addedBy, p.addedByName) ? `<span class="photo-poster-badge">${badgeHtml(p.addedBy, p.addedByName)}</span>` : ''}
                    <img src="${esc(p.url)}" alt="${esc(p.caption)}" loading="lazy">
                    <div class="photo-overlay">
                        <span class="photo-caption">${esc(p.caption)}</span>
                        <div class="photo-actions">
                            <button class="fav-btn ${p.favorite ? 'fav-active' : ''}" data-id="${p.id}" title="Favoritar">⭐</button>
                            <button class="del-btn" data-id="${p.id}" title="Excluir">🗑️</button>
                        </div>
                    </div>
                </div>
            `).join('');
        },
        handleGridClick(e) {
            const favBtn = e.target.closest('.fav-btn');
            const delBtn = e.target.closest('.del-btn');
            if (favBtn) {
                const id = favBtn.dataset.id;
                const photo = this.data.find(p => p.id === id);
                if (photo) {
                    photo.favorite = !photo.favorite;
                    this.saveToStorage();
                    this.render();
                    ActivityLog.add('foto_fav', photo.favorite ? 'Foto favoritada' : 'Foto desfavoritada');
                }
            }
            if (delBtn) {
                const id = delBtn.dataset.id;
                this.data = this.data.filter(p => p.id !== id);
                this.saveToStorage();
                this.render();
                document.getElementById('stat-photos').textContent = this.data.length;
                ActivityLog.add('foto_del', 'Foto excluída');
            }
            const card = e.target.closest('.photo-card');
            if (card && !e.target.closest('.fav-btn') && !e.target.closest('.del-btn')) {
                const idx = this._filtered.findIndex(p => p.id === card.dataset.id);
                if (idx >= 0) this.openLightbox(idx);
            }
        },
        initLightbox() {
            const lb = document.getElementById('lightbox');
            document.getElementById('lightbox-close').addEventListener('click', () => lb.style.display = 'none');
            document.getElementById('lightbox-prev').addEventListener('click', () => this.navLightbox(-1));
            document.getElementById('lightbox-next').addEventListener('click', () => this.navLightbox(1));
            document.addEventListener('keydown', (e) => {
                if (lb.style.display !== '') return;
                if (e.key === 'ArrowLeft') this.navLightbox(-1);
                if (e.key === 'ArrowRight') this.navLightbox(1);
                if (e.key === 'Escape') lb.style.display = 'none';
            });
            let touchX = 0;
            lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; });
            lb.addEventListener('touchend', (e) => {
                const diff = e.changedTouches[0].clientX - touchX;
                if (Math.abs(diff) > 50) this.navLightbox(diff > 0 ? -1 : 1);
            });
        },
        openLightbox(index) {
            const photos = this._filtered;
            if (!photos[index]) return;
            this.lightboxIndex = index;
            document.getElementById('lightbox-img').src = photos[index].url;
            document.getElementById('lightbox-caption').textContent = photos[index].caption || '';
            document.getElementById('lightbox').style.display = '';
        },
        navLightbox(dir) {
            const photos = this._filtered;
            if (!photos.length) return;
            this.lightboxIndex = (this.lightboxIndex + dir + photos.length) % photos.length;
            document.getElementById('lightbox-img').src = photos[this.lightboxIndex].url;
            document.getElementById('lightbox-caption').textContent = photos[this.lightboxIndex].caption || '';
        }
    };

    // ==================== VIDEOS ====================
    const Videos = {
        data: [],
        init() {
            this.data = JSON.parse(localStorage.getItem('album_videos') || '[]');
            document.getElementById('add-video-btn').addEventListener('click', () => this.add());
            document.getElementById('video-grid').addEventListener('click', (e) => {
                const delBtn = e.target.closest('.del-btn');
                if (delBtn) {
                    const id = delBtn.dataset.id;
                    this.data = this.data.filter(v => v.id !== id);
                    this.saveToStorage();
                    this.render();
                    ActivityLog.add('video_del', 'Vídeo excluído');
                }
            });
            this.render();
        },
        saveToStorage() {
            localStorage.setItem('album_videos', JSON.stringify(this.data));
        },
        parseYouTube(url) {
            const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            return m ? m[1] : null;
        },
        add() {
            const url = document.getElementById('video-url').value.trim();
            const title = document.getElementById('video-title').value.trim();
            if (!url) { Toast.show('Cole uma URL!', 'error'); return; }
            const ytId = this.parseYouTube(url);
            if (!ytId) { Toast.show('URL inválida!', 'error'); return; }
            const me = Identity.get();
            this.data.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                ytId, title: title || 'Sem título', timestamp: Date.now(),
                addedBy: me ? me.id : '0', addedByName: me ? me.name : ''
            });
            this.saveToStorage();
            this.render();
            document.getElementById('video-url').value = '';
            document.getElementById('video-title').value = '';
            ActivityLog.add('video_add', `Vídeo "${title || 'Sem título'}" adicionado`);
            Toast.show('Vídeo adicionado! 🎬', 'success');
        },
        render() {
            const grid = document.getElementById('video-grid');
            const empty = document.getElementById('video-empty');
            if (!this.data.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            grid.innerHTML = this.data.map(v => `
                <div class="video-card glass-card">
                    <iframe src="https://www.youtube.com/embed/${v.ytId}" allowfullscreen loading="lazy"></iframe>
                    <div class="video-card-header">
                        <span class="video-card-title">${esc(v.title)} ${badgeHtml(v.addedBy, v.addedByName)}</span>
                        <button class="del-btn btn-icon" data-id="${v.id}" title="Excluir">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
    };

    // ==================== MESSAGES ====================
    const Messages = {
        data: [],
        currentFilter: 'all',
        currentAuthor: null,
        emojis: ['❤️','😍','🥰','💕','💖','💗','💓','💘','💝','😘','🤗','😊','🥺','✨','🌹','🌸','💐','🦋','🌙','⭐','🔥','💋','👫','🤍','💜','💙','🧡','💚','🎉','😂'],
        init() {
            this.data = JSON.parse(localStorage.getItem('album_messages') || '[]');
            const me = Identity.get();
            this.currentAuthor = me ? me.id : '1';
            document.getElementById('send-msg-btn').addEventListener('click', () => this.send());
            document.getElementById('msg-input').addEventListener('keydown', (e) => { if (e.ctrlKey && e.key === 'Enter') this.send(); });
            document.getElementById('emoji-toggle').addEventListener('click', () => {
                const ep = document.getElementById('emoji-picker');
                ep.style.display = ep.style.display === 'none' ? '' : 'none';
            });
            const ep = document.getElementById('emoji-picker');
            ep.innerHTML = this.emojis.map(e => `<button class="emoji-btn" data-emoji="${e}">${e}</button>`).join('');
            ep.addEventListener('click', (e) => {
                if (e.target.dataset.emoji) {
                    document.getElementById('msg-input').value += e.target.dataset.emoji;
                    ep.style.display = 'none';
                }
            });
            document.querySelectorAll('[data-msg-filter]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('[data-msg-filter]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentFilter = btn.dataset.msgFilter;
                    this.render();
                });
            });
            document.getElementById('messages-list').addEventListener('click', (e) => {
                const favBtn = e.target.closest('.msg-fav-btn');
                const delBtn = e.target.closest('.msg-delete-btn');
                if (favBtn) {
                    const id = favBtn.dataset.id;
                    const msg = this.data.find(m => m.id === id);
                    if (msg) { msg.favorite = !msg.favorite; this.saveToStorage(); this.render(); }
                }
                if (delBtn) {
                    const id = delBtn.dataset.id;
                    this.data = this.data.filter(m => m.id !== id);
                    this.saveToStorage();
                    this.render();
                    ActivityLog.add('msg_del', 'Mensagem excluída');
                }
            });
            this.render();
        },
        saveToStorage() {
            localStorage.setItem('album_messages', JSON.stringify(this.data));
        },
        send() {
            const input = document.getElementById('msg-input');
            const text = input.value.trim();
            if (!text) { Toast.show('Digite uma mensagem!', 'error'); return; }
            const me = Identity.get();
            this.data.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                author: me ? me.id : '1',
                authorName: me ? me.name : 'Anônimo',
                text, timestamp: Date.now(),
                favorite: false
            });
            this.saveToStorage();
            this.render();
            input.value = '';
            document.getElementById('stat-messages').textContent = this.data.length;
            ActivityLog.add('msg_add', 'Mensagem enviada');
        },
        render() {
            let msgs = this.data.slice();
            if (this.currentFilter === '1') msgs = msgs.filter(m => m.author === '1');
            if (this.currentFilter === '2') msgs = msgs.filter(m => m.author === '2');
            if (this.currentFilter === 'favorites') msgs = msgs.filter(m => m.favorite);
            const list = document.getElementById('messages-list');
            const empty = document.getElementById('msg-empty');
            if (!msgs.length) { list.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            list.innerHTML = msgs.slice().reverse().map(m => `
                <div class="message-bubble author-${m.author}">
                    <div class="msg-author-name">${esc(m.authorName)}</div>
                    <div class="msg-text">${esc(m.text)}</div>
                    <div class="msg-meta">
                        <span>${timeAgo(m.timestamp)}</span>
                        <div>
                            <button class="msg-fav-btn" data-id="${m.id}" title="Favoritar">${m.favorite ? '⭐' : '☆'}</button>
                            <button class="msg-delete-btn" data-id="${m.id}" title="Excluir">🗑️</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    };

    // ==================== MUSIC ====================
    const Music = {
        data: [],
        currentPlaying: null,
        init() {
            this.data = JSON.parse(localStorage.getItem('album_music') || '[]');
            document.getElementById('add-music-btn').addEventListener('click', () => this.add());
            document.getElementById('playlist').addEventListener('click', (e) => {
                const playBtn = e.target.closest('.playlist-item');
                const delBtn = e.target.closest('.playlist-item-delete');
                if (delBtn) {
                    const id = delBtn.dataset.id;
                    this.data = this.data.filter(m => m.id !== id);
                    this.saveToStorage();
                    this.render();
                    ActivityLog.add('music_del', 'Música removida');
                }
                if (playBtn && !e.target.closest('.playlist-item-delete')) this.play(playBtn.dataset.id);
            });
            this.render();
        },
        saveToStorage() {
            localStorage.setItem('album_music', JSON.stringify(this.data));
        },
        parseUrl(url) {
            let ytId = null, spotId = null;
            const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (ytMatch) return { platform: 'youtube', id: ytMatch[1] };
            const spotMatch = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
            if (spotMatch) return { platform: 'spotify', id: spotMatch[1] };
            return null;
        },
        add() {
            const url = document.getElementById('music-url').value.trim();
            const title = document.getElementById('music-title').value.trim();
            if (!url) { Toast.show('Cole uma URL!', 'error'); return; }
            const parsed = this.parseUrl(url);
            if (!parsed) { Toast.show('URL inválida!', 'error'); return; }
            const me = Identity.get();
            this.data.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                title: title || 'Sem título',
                platform: parsed.platform,
                embedId: parsed.id,
                timestamp: Date.now(),
                addedBy: me ? me.id : '0',
                addedByName: me ? me.name : ''
            });
            this.saveToStorage();
            this.render();
            document.getElementById('music-url').value = '';
            document.getElementById('music-title').value = '';
            ActivityLog.add('music_add', `Música "${title || 'Sem título'}" adicionada`);
            Toast.show('Música adicionada! 🎵', 'success');
        },
        play(id) {
            const music = this.data.find(m => m.id === id);
            if (!music) return;
            this.currentPlaying = id;
            const container = document.getElementById('player-container');
            const player = document.getElementById('music-player');
            if (music.platform === 'youtube') {
                container.innerHTML = `<iframe src="https://www.youtube.com/embed/${music.embedId}" allowfullscreen></iframe>`;
            } else if (music.platform === 'spotify') {
                container.innerHTML = `<iframe src="https://open.spotify.com/embed/track/${music.embedId}" height="80" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
            }
            player.style.display = '';
            this.render();
            ActivityLog.add('music_play', `Tocando "${music.title}"`);
        },
        autoplayFirst() {
            if (this.data.length) this.play(this.data[0].id);
        },
        render() {
            const list = document.getElementById('playlist');
            const empty = document.getElementById('music-empty');
            if (!this.data.length) { list.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            list.innerHTML = this.data.map(m => `
                <div class="playlist-item ${this.currentPlaying === m.id ? 'playing' : ''}" data-id="${m.id}">
                    <span class="playlist-item-icon">${m.platform === 'youtube' ? '🎬' : '🎵'}</span>
                    <div>
                        <div class="playlist-item-title">${esc(m.title)}</div>
                        <span class="playlist-item-platform">${m.platform === 'youtube' ? 'YouTube' : 'Spotify'} ${badgeHtml(m.addedBy, m.addedByName)}</span>
                    </div>
                    <button class="playlist-item-delete btn-icon" data-id="${m.id}">🗑️</button>
                </div>
            `).join('');
        }
    };

    // ==================== TIMELINE ====================
    const Timeline = {
        data: [],
        init() {
            this.data = JSON.parse(localStorage.getItem('album_timeline') || '[]');
            document.getElementById('add-timeline-btn').addEventListener('click', () => this.add());
            this.render();
        },
        saveToStorage() {
            localStorage.setItem('album_timeline', JSON.stringify(this.data));
        },
        add() {
            const date = document.getElementById('timeline-date').value;
            const title = document.getElementById('timeline-title').value.trim();
            const desc = document.getElementById('timeline-desc').value.trim();
            if (!date || !title) { Toast.show('Preencha data e título!', 'error'); return; }
            const me = Identity.get();
            this.data.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                date, title, desc, timestamp: Date.now(),
                addedBy: me ? me.id : '0',
                addedByName: me ? me.name : ''
            });
            this.saveToStorage();
            this.render();
            document.getElementById('timeline-date').value = '';
            document.getElementById('timeline-title').value = '';
            document.getElementById('timeline-desc').value = '';
            ActivityLog.add('timeline_add', `Memória "${title}" adicionada`);
            Toast.show('Memória adicionada! 📅', 'success');
        },
        render() {
            const list = document.getElementById('timeline-list');
            const empty = document.getElementById('timeline-empty');
            if (!this.data.length) { list.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            const sorted = this.data.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
            list.innerHTML = sorted.map(t => `
                <div class="timeline-item">
                    <div class="timeline-date">${formatDateShort(t.date)}</div>
                    <div class="timeline-item-title">${esc(t.title)}</div>
                    <div class="timeline-item-desc">${esc(t.desc)}</div>
                    <div class="timeline-item-actions">
                        <button class="del-btn btn-icon" data-id="${t.id}">🗑️</button>
                    </div>
                </div>
            `).join('');
            list.addEventListener('click', (e) => {
                const delBtn = e.target.closest('.del-btn');
                if (delBtn) {
                    const id = delBtn.dataset.id;
                    this.data = this.data.filter(t => t.id !== id);
                    this.saveToStorage();
                    this.render();
                    ActivityLog.add('timeline_del', 'Memória excluída');
                }
            });
        }
    };

    // ==================== SETTINGS ====================
    const Settings = {
        init() {
            document.getElementById('settings-btn').addEventListener('click', () => this.open());
            document.getElementById('settings-close').addEventListener('click', () => this.close());
            document.getElementById('settings-modal').addEventListener('click', (e) => {
                if (e.target === document.getElementById('settings-modal')) this.close();
            });
            document.getElementById('save-settings').addEventListener('click', () => this.save());
        },
        open() {
            document.getElementById('setting-name1').value = appConfig.name1 || '';
            document.getElementById('setting-name2').value = appConfig.name2 || '';
            document.getElementById('setting-date').value = appConfig.startDate || '';
            document.getElementById('settings-modal').style.display = '';
        },
        close() { document.getElementById('settings-modal').style.display = 'none'; },
        save() {
            const config = { ...appConfig };
            config.name1 = document.getElementById('setting-name1').value.trim() || config.name1;
            config.name2 = document.getElementById('setting-name2').value.trim() || config.name2;
            config.startDate = document.getElementById('setting-date').value || config.startDate;
            db.ref('album/config').set(config);
            this.close();
            ActivityLog.add('config', 'Configurações atualizadas');
            Toast.show('Configurações salvas!', 'success');
        }
    };

    // ==================== DARK MODE ====================
    const DarkMode = {
        init() {
            const theme = localStorage.getItem('album_theme') || 'light';
            if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('dark-mode-toggle').addEventListener('click', () => this.toggle());
            this.updateIcon();
        },
        toggle() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
            localStorage.setItem('album_theme', isDark ? 'light' : 'dark');
            this.updateIcon();
        },
        updateIcon() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            document.getElementById('theme-icon').textContent = isDark ? '☀️' : '🌙';
            document.getElementById('theme-label').textContent = isDark ? 'Claro' : 'Escuro';
        }
    };

    // ==================== HEARTS ====================
    const Hearts = {
        interval: null,
        heartChars: ['❤️', '💕', '💖', '💗', '💓', '🤍', '💜'],
        init() {
            const container = document.getElementById('hearts-container');
            if (container) this.interval = setInterval(() => this.spawn(), 500);
        },
        spawn() {
            const container = document.getElementById('hearts-container');
            if (!container) return;
            const h = document.createElement('div');
            h.className = 'floating-heart';
            h.textContent = this.heartChars[Math.floor(Math.random() * this.heartChars.length)];
            h.style.left = Math.random() * 100 + '%';
            container.appendChild(h);
            setTimeout(() => h.remove(), 3000);
        }
    };

    // ==================== QUOTES ====================
    const Quotes = {
        list: [
            '"O amor não se vê com os olhos, mas com o coração."',
            '"Amar não é olhar um para o outro, é olhar juntos na mesma direção."',
            '"Você é o meu hoje e todos os meus amanhãs."',
            '"Em você eu encontrei o amor que nem nos contos de fadas eu vi."',
            '"Cada momento ao seu lado é um presente que guardo no coração."',
            '"O melhor da minha vida começou quando te encontrei."',
            '"Seu sorriso é a minha poesia favorita."',
            '"Juntos somos um poema que nunca terá ponto final."',
            '"Você é a razão dos meus sorrisos mais sinceros."',
            '"Nosso amor é a mais bela das histórias."',
            '"Contigo, até o silêncio fala de amor."',
            '"Meu lugar favorito no mundo é ao seu lado."',
            '"Amar você é a minha aventura preferida."',
            '"Você transforma dias comuns em momentos mágicos."',
            '"Nosso amor cresce a cada batida do coração."',
            '"Com você, cada dia é um novo capítulo de felicidade."',
            '"Você é o sonho que eu não quero acordar."',
            '"Meu coração escolheu você, e escolheria de novo."',
            '"Juntos, somos mais bonitos que qualquer pôr do sol."',
            '"Você é minha pessoa favorita em qualquer universo."'
        ],
        interval: null,
        show() {
            const quote = document.getElementById('love-quote');
            if (quote) quote.textContent = this.list[Math.floor(Math.random() * this.list.length)];
        },
        startRotation() {
            this.show();
            this.interval = setInterval(() => this.show(), 8000);
        }
    };

    // ==================== NAVBAR ====================
    const Nav = {
        init() {
            const hamburger = document.getElementById('hamburger');
            const navLinks = document.getElementById('nav-links');
            const links = navLinks.querySelectorAll('.nav-link');

            if (hamburger) {
                hamburger.addEventListener('click', () => {
                    hamburger.classList.toggle('active');
                    navLinks.classList.toggle('open');
                });
            }

            links.forEach(link => {
                link.addEventListener('click', (e) => {
                    const section = link.dataset.section;
                    if (section) {
                        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                        link.classList.add('active');
                        const el = document.getElementById(section);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                        hamburger.classList.remove('active');
                        navLinks.classList.remove('open');
                    }
                });
            });

            document.getElementById('change-identity-btn').addEventListener('click', () => {
                const config = Welcome.loadConfig();
                if (config) IdentityPicker.show(config);
            });
        }
    };

    // ==================== REAL-TIME LISTENERS ====================
    function setupListeners() {
        Gallery.render();
        document.getElementById('stat-photos').textContent = Gallery.data.length;

        Videos.render();

        Messages.render();
        document.getElementById('stat-messages').textContent = Messages.data.length;

        Music.autoplayFirst();
        Music.render();

        Timeline.render();

        ActivityLog.data = JSON.parse(localStorage.getItem('album_log') || '[]');
        ActivityLog.render();
    }

    // ==================== APP ====================
    const App = {
        init() {
            DarkMode.init();
            Welcome.init();
        },
        startApp() {
            Gallery.init();
            Videos.init();
            Messages.init();
            Music.init();
            Timeline.init();
            Settings.init();
            Nav.init();
            Hearts.init();
            setupListeners();
            Identity.showIndicator();
        }
    };

    window.addEventListener('DOMContentLoaded', () => App.init());
})();// ====================================================
//  CONFIGURE SEU FIREBASE AQUI
//  1. Acesse https://console.firebase.google.com
//  2. Crie um projeto (ex: "nosso-album")
//  3. Vá em Realtime Database → Criar banco de dados
//     - Escolha "modo de teste"
//  4. Vá em Storage → Começar (modo de teste)
//  5. Configurações do projeto → Adicionar app Web
//  6. Copie os valores da sua config abaixo:
// ====================================================
const FIREBASE_CONFIG = {
    apiKey: "COLE_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_ID",
    appId: "SEU_APP_ID"
};

(function () {
    'use strict';

    // ==================== FIREBASE CHECK ====================
    const isConfigured = FIREBASE_CONFIG.apiKey !== "COLE_AQUI";

    if (!isConfigured) {
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('firebase-overlay').style.display = '';
        });
        return;
    }

    firebase.initializeApp(FIREBASE_CONFIG);
    const db = firebase.database();
    const storage = firebase.storage();

    // ==================== IDENTITY (localStorage) ====================
    const Identity = {
        get() {
            try { return JSON.parse(localStorage.getItem('album_identity')); } catch { return null; }
        },
        set(id, name) {
            localStorage.setItem('album_identity', JSON.stringify({ id, name }));
        },
        clear() { localStorage.removeItem('album_identity'); },
        showIndicator() {
            const me = this.get();
            if (!me) return;
            const indicator = document.getElementById('identity-indicator');
            const dot = document.getElementById('identity-dot');
            const nameEl = document.getElementById('identity-name-display');
            indicator.style.display = '';
            dot.className = `identity-dot person-${me.id}`;
            nameEl.textContent = me.name;
        }
    };

    // ==================== TOAST ====================
    const Toast = {
        show(msg, type = 'info') {
            const c = document.getElementById('toast-container');
            const t = document.createElement('div');
            t.className = `toast toast-${type}`;
            t.textContent = msg;
            c.appendChild(t);
            setTimeout(() => {
                t.style.opacity = '0';
                t.style.transition = 'opacity 0.3s';
                setTimeout(() => t.remove(), 300);
            }, 3000);
        }
    };

    // ==================== UTILS ====================
    function esc(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function timeAgo(ts) {
        const diff = Date.now() - ts;
        if (diff < 60000) return 'agora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
        return `${Math.floor(diff / 86400000)}d`;
    }

    function formatDate(ts) {
        return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function formatDateShort(dateStr) {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function badgeHtml(addedBy, addedByName) {
        if (!addedBy) return '';
        return `<span class="poster-badge person-${addedBy}">${esc(addedByName || ('Pessoa ' + addedBy))}</span>`;
    }

    let appConfig = {};

    function updateNames(config) {
        appConfig = config;
        const names = `${config.name1} & ${config.name2}`;
        const el = (id) => document.getElementById(id);
        if (el('home-names')) el('home-names').textContent = names;
        if (el('footer-names')) el('footer-names').textContent = names;
        if (el('nav-brand')) el('nav-brand').textContent = `💕 ${names}`;
        if (el('msg-filter-1')) el('msg-filter-1').textContent = config.name1;
        if (el('msg-filter-2')) el('msg-filter-2').textContent = config.name2;
    }

    // ==================== ACTIVITY LOG ====================
    const ActivityLog = {
        iconMap: {
            'foto_add': '📷', 'foto_del': '🗑️', 'foto_fav': '⭐',
            'video_add': '🎬', 'video_del': '🗑️',
            'msg_add': '💌', 'msg_del': '🗑️', 'msg_fav': '⭐',
            'music_add': '🎵', 'music_del': '🗑️', 'music_play': '▶️',
            'timeline_add': '📅', 'timeline_del': '🗑️',
            'config': '⚙️'
        },
        data: [],
        add(action, detail) {
            const me = Identity.get();
            db.ref('album/log').push({
                action, detail, timestamp: Date.now(),
                addedBy: me ? me.id : '0',
                addedByName: me ? me.name : 'Sistema'
            });
        },
        render() {
            const list = document.getElementById('log-list');
            const empty = document.getElementById('log-empty');
            if (!this.data.length) { list.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            list.innerHTML = this.data.map(l => `
                <div class="log-item">
                    <span class="log-icon">${this.iconMap[l.action] || '📋'}</span>
                    <span class="log-detail">${esc(l.detail)} ${badgeHtml(l.addedBy, l.addedByName)}</span>
                    <span class="log-time">${timeAgo(l.timestamp)}</span>
                </div>
            `).join('');
        }
    };

    // ==================== WELCOME & SETUP ====================
    const Welcome = {
        async init() {
            const snap = await db.ref('album/config').once('value');
            const config = snap.val();

            document.getElementById('welcome-loading').style.display = 'none';

            if (!config || !config.name1) {
                document.getElementById('setup-form').style.display = '';
                document.getElementById('setup-btn').addEventListener('click', () => this.saveSetup());
            } else {
                updateNames(config);
                const identity = Identity.get();
                if (!identity) {
                    IdentityPicker.show(config);
                } else {
                    Identity.showIndicator();
                    this.showWelcome(config);
                }
            }
        },
        saveSetup() {
            const n1 = document.getElementById('setup-name1').value.trim();
            const n2 = document.getElementById('setup-name2').value.trim();
            const d = document.getElementById('setup-date').value;
            if (!n1 || !n2 || !d) { Toast.show('Preencha todos os campos!', 'error'); return; }
            const config = { name1: n1, name2: n2, startDate: d };
            db.ref('album/config').set(config).then(() => {
                updateNames(config);
                ActivityLog.add('config', 'Álbum configurado');
                Toast.show('Álbum criado! ❤️', 'success');
                document.getElementById('setup-form').style.display = 'none';
                IdentityPicker.show(config);
            });
        },
        showWelcome(config) {
            document.getElementById('welcome-display').style.display = '';
            document.getElementById('welcome-names').textContent = `${config.name1} & ${config.name2}`;
            if (config.startDate) {
                const diff = Date.now() - new Date(config.startDate).getTime();
                const days = Math.floor(diff / 86400000);
                document.getElementById('welcome-counter').textContent = `${days} dias juntos ❤️`;
            }
            document.getElementById('enter-btn').addEventListener('click', () => this.enter());
        },
        enter() {
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('navbar').style.display = '';
            document.getElementById('main-content').style.display = '';
            document.getElementById('footer').style.display = '';
            App.startApp();
        }
    };

    // ==================== IDENTITY PICKER ====================
    const IdentityPicker = {
        show(config) {
            document.getElementById('identity-name-1').textContent = config.name1;
            document.getElementById('identity-name-2').textContent = config.name2;
            document.getElementById('identity-modal').style.display = '';

            document.getElementById('identity-btn-1').onclick = () => this.pick('1', config.name1, config);
            document.getElementById('identity-btn-2').onclick = () => this.pick('2', config.name2, config);
        },
        pick(id, name, config) {
            Identity.set(id, name);
            Identity.showIndicator();
            document.getElementById('identity-modal').style.display = 'none';
            Welcome.showWelcome(config);
        }
    };

    // ==================== COUNTER ====================
    const Counter = {
        interval: null,
        init(startDate) {
            if (!startDate) return;
            const grid = document.getElementById('counter-grid');
            grid.innerHTML = ['Anos', 'Meses', 'Dias', 'Horas', 'Minutos', 'Segundos'].map((label, i) =>
                `<div class="counter-item glass-card"><span class="counter-value" id="cv-${i}">0</span><span class="counter-label">${label}</span></div>`
            ).join('');
            this.update(startDate);
            this.interval = setInterval(() => this.update(startDate), 1000);
        },
        update(startDate) {
            const start = new Date(startDate);
            const now = new Date();
            let years = now.getFullYear() - start.getFullYear();
            let months = now.getMonth() - start.getMonth();
            let days = now.getDate() - start.getDate();
            if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
            if (months < 0) { years--; months += 12; }
            const diff = now - start;
            const h = ((diff % 86400000) / 3600000) | 0;
            const m = ((diff % 3600000) / 60000) | 0;
            const s = ((diff % 60000) / 1000) | 0;
            [years, months, days, h, m, s].forEach((v, i) => {
                const el = document.getElementById(`cv-${i}`);
                if (el) el.textContent = v;
            });
        }
    };

    // ==================== GALLERY ====================
    const Gallery = {
        data: [],
        currentFilter: 'all',
        searchTerm: '',
        lightboxIndex: 0,
        _filtered: [],
        init() {
            document.getElementById('photo-input').addEventListener('change', (e) => this.handleUpload(e));
            document.getElementById('photo-search').addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.render();
            });
            document.querySelectorAll('[data-filter]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentFilter = btn.dataset.filter;
                    this.render();
                });
            });
            document.getElementById('gallery-grid').addEventListener('click', (e) => this.handleGridClick(e));
            this.initLightbox();
        },
        handleUpload(e) {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            const me = Identity.get();
            let count = 0;
            Toast.show(`Enviando ${files.length} foto(s)...`, 'info');

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let w = img.width, h = img.height;
                        if (w > 800) { h = (800 / w) * h; w = 800; }
                        canvas.width = w; canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        canvas.toBlob((blob) => {
                            const path = `photos/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
                            const ref = storage.ref(path);
                            ref.put(blob).then(() => ref.getDownloadURL()).then((url) => {
                                db.ref('album/photos').push({
                                    url,
                                    caption: file.name.replace(/\.[^.]+$/, ''),
                                    timestamp: Date.now(),
                                    addedBy: me ? me.id : '0',
                                    addedByName: me ? me.name : '',
                                    favorite: false
                                });
                                count++;
                                if (count === files.length) {
                                    ActivityLog.add('foto_add', `${files.length} foto(s) adicionada(s)`);
                                    Toast.show('Foto(s) enviada(s)! 📷', 'success');
                                }
                            }).catch(() => {
                                Toast.show('Erro ao enviar foto', 'error');
                            });
                        }, 'image/jpeg', 0.6);
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            });
            e.target.value = '';
        },
        render() {
            let photos = this.data.slice();
            if (this.currentFilter === 'favorites') photos = photos.filter(p => p.favorite);
            if (this.searchTerm) photos = photos.filter(p => (p.caption || '').toLowerCase().includes(this.searchTerm));
            this._filtered = photos;
            const grid = document.getElementById('gallery-grid');
            const empty = document.getElementById('gallery-empty');
            if (!photos.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            grid.innerHTML = photos.map((p, i) => `
                <div class="photo-card" data-index="${i}" data-id="${p.id}">
                    ${badgeHtml(p.addedBy, p.addedByName) ? `<span class="photo-poster-badge">${badgeHtml(p.addedBy, p.addedByName)}</span>` : ''}
                    <img src="${esc(p.url)}" alt="${esc(p.caption)}" loading="lazy">
                    <div class="photo-overlay">
                        <span class="photo-caption">${esc(p.caption)}</span>
                        <div class="photo-actions">
                            <button class="fav-btn ${p.favorite ? 'fav-active' : ''}" data-id="${p.id}" title="Favoritar">⭐</button>
                            <button class="del-btn" data-id="${p.id}" title="Excluir">🗑️</button>
                        </div>
                    </div>
                </div>
            `).join('');
        },
        handleGridClick(e) {
            const favBtn = e.target.closest('.fav-btn');
            const delBtn = e.target.closest('.del-btn');
            if (favBtn) {
                e.stopPropagation();
                const id = favBtn.dataset.id;
                const p = this.data.find(x => x.id === id);
                if (p) {
                    db.ref(`album/photos/${id}/favorite`).set(!p.favorite);
                    ActivityLog.add('foto_fav', `Foto ${!p.favorite ? 'favoritada' : 'desfavoritada'}`);
                }
                return;
            }
            if (delBtn) {
                e.stopPropagation();
                db.ref(`album/photos/${delBtn.dataset.id}`).remove();
                ActivityLog.add('foto_del', 'Foto excluída');
                Toast.show('Foto excluída', 'info');
                return;
            }
            const card = e.target.closest('.photo-card');
            if (card) this.openLightbox(parseInt(card.dataset.index));
        },
        initLightbox() {
            const lb = document.getElementById('lightbox');
            document.getElementById('lightbox-close').addEventListener('click', () => lb.style.display = 'none');
            document.getElementById('lightbox-prev').addEventListener('click', () => this.navLightbox(-1));
            document.getElementById('lightbox-next').addEventListener('click', () => this.navLightbox(1));
            document.addEventListener('keydown', (e) => {
                if (lb.style.display === 'none') return;
                if (e.key === 'Escape') lb.style.display = 'none';
                if (e.key === 'ArrowLeft') this.navLightbox(-1);
                if (e.key === 'ArrowRight') this.navLightbox(1);
            });
            let touchX = 0;
            lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; });
            lb.addEventListener('touchend', (e) => {
                const dx = e.changedTouches[0].clientX - touchX;
                if (Math.abs(dx) > 50) this.navLightbox(dx > 0 ? -1 : 1);
            });
        },
        openLightbox(index) {
            const photos = this._filtered;
            if (!photos[index]) return;
            this.lightboxIndex = index;
            document.getElementById('lightbox-img').src = photos[index].url;
            document.getElementById('lightbox-caption').textContent = photos[index].caption || '';
            document.getElementById('lightbox').style.display = '';
        },
        navLightbox(dir) {
            const photos = this._filtered;
            if (!photos.length) return;
            this.lightboxIndex = (this.lightboxIndex + dir + photos.length) % photos.length;
            document.getElementById('lightbox-img').src = photos[this.lightboxIndex].url;
            document.getElementById('lightbox-caption').textContent = photos[this.lightboxIndex].caption || '';
        }
    };

    // ==================== VIDEOS ====================
    const Videos = {
        data: [],
        init() {
            document.getElementById('add-video-btn').addEventListener('click', () => this.add());
            document.getElementById('video-grid').addEventListener('click', (e) => {
                const del = e.target.closest('.del-btn');
                if (del) {
                    db.ref(`album/videos/${del.dataset.id}`).remove();
                    ActivityLog.add('video_del', 'Vídeo excluído');
                    Toast.show('Vídeo excluído', 'info');
                }
            });
        },
        parseYouTube(url) {
            const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            return m ? m[1] : null;
        },
        add() {
            const url = document.getElementById('video-url').value.trim();
            const title = document.getElementById('video-title').value.trim();
            if (!url) { Toast.show('Cole uma URL do YouTube', 'error'); return; }
            const ytId = this.parseYouTube(url);
            if (!ytId) { Toast.show('URL do YouTube inválida', 'error'); return; }
            const me = Identity.get();
            db.ref('album/videos').push({
                ytId, title: title || 'Sem título', timestamp: Date.now(),
                addedBy: me ? me.id : '0', addedByName: me ? me.name : ''
            });
            document.getElementById('video-url').value = '';
            document.getElementById('video-title').value = '';
            ActivityLog.add('video_add', `Vídeo "${title || 'Sem título'}" adicionado`);
            Toast.show('Vídeo adicionado! 🎬', 'success');
        },
        render() {
            const grid = document.getElementById('video-grid');
            const empty = document.getElementById('video-empty');
            if (!this.data.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            grid.innerHTML = this.data.map(v => `
                <div class="video-card glass-card">
                    <iframe src="https://www.youtube.com/embed/${v.ytId}" allowfullscreen loading="lazy"></iframe>
                    <div class="video-card-header">
                        <span class="video-card-title">${esc(v.title)} ${badgeHtml(v.addedBy, v.addedByName)}</span>
                        <button class="del-btn btn-icon" data-id="${v.id}" title="Excluir">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
    };

    // ==================== MESSAGES ====================
    const Messages = {
        data: [],
        currentFilter: 'all',
        emojis: ['❤️','😍','🥰','💕','💖','💗','💓','💘','💝','😘','🤗','😊','🥺','✨','🌹','🌸','💐','🦋','🌙','⭐','🔥','💋','👫','🤍','💜','💙','🧡','💚','🎉','😂'],
        init() {
            document.getElementById('send-msg-btn').addEventListener('click', () => this.send());
            document.getElementById('msg-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
            });
            const picker = document.getElementById('emoji-picker');
            picker.innerHTML = this.emojis.map(em => `<button class="emoji-btn">${em}</button>`).join('');
            document.getElementById('emoji-toggle').addEventListener('click', () => {
                picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
            });
            picker.addEventListener('click', (e) => {
                if (e.target.classList.contains('emoji-btn')) {
                    const input = document.getElementById('msg-input');
                    const pos = input.selectionStart;
                    const val = input.value;
                    input.value = val.slice(0, pos) + e.target.textContent + val.slice(pos);
                    input.focus();
                    input.selectionStart = input.selectionEnd = pos + e.target.textContent.length;
                }
            });
            document.querySelectorAll('[data-msg-filter]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('[data-msg-filter]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentFilter = btn.dataset.msgFilter;
                    this.render();
                });
            });
            document.getElementById('messages-list').addEventListener('click', (e) => {
                const fav = e.target.closest('.msg-fav-btn');
                const del = e.target.closest('.msg-delete-btn');
                if (fav) {
                    const m = this.data.find(x => x.id === fav.dataset.id);
                    if (m) db.ref(`album/messages/${fav.dataset.id}/favorite`).set(!m.favorite);
                }
                if (del) {
                    db.ref(`album/messages/${del.dataset.id}`).remove();
                    ActivityLog.add('msg_del', 'Mensagem excluída');
                }
            });
        },
        send() {
            const input = document.getElementById('msg-input');
            const text = input.value.trim();
            if (!text) return;
            const me = Identity.get();
            if (!me) { Toast.show('Identifique-se primeiro', 'error'); return; }
            db.ref('album/messages').push({
                author: me.id,
                authorName: me.name,
                text, timestamp: Date.now(), favorite: false
            });
            input.value = '';
            document.getElementById('emoji-picker').style.display = 'none';
            ActivityLog.add('msg_add', `Mensagem de ${me.name}`);
        },
        render() {
            let msgs = this.data.slice();
            if (this.currentFilter === 'favorites') msgs = msgs.filter(m => m.favorite);
            else if (this.currentFilter !== 'all') msgs = msgs.filter(m => m.author === this.currentFilter);
            const list = document.getElementById('messages-list');
            const empty = document.getElementById('msg-empty');
            if (!msgs.length) { list.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            list.innerHTML = msgs.map(m => `
                <div class="message-bubble author-${m.author}">
                    <div class="msg-author-name">${esc(m.authorName)}</div>
                    <div class="msg-text">${esc(m.text)}</div>
                    <div class="msg-meta">
                        <span>${formatDate(m.timestamp)}</span>
                        <span>
                            <button class="msg-fav-btn" data-id="${m.id}">${m.favorite ? '⭐' : '☆'}</button>
                            <button class="msg-delete-btn" data-id="${m.id}">✕</button>
                        </span>
                    </div>
                </div>
            `).join('');
            const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 100;
            if (atBottom) list.scrollTop = list.scrollHeight;
        }
    };

    // ==================== MUSIC ====================
    const Music = {
        data: [],
        currentPlaying: null,
        init() {
            document.getElementById('add-music-btn').addEventListener('click', () => this.add());
            document.getElementById('playlist').addEventListener('click', (e) => {
                const del = e.target.closest('.playlist-item-delete');
                if (del) {
                    e.stopPropagation();
                    db.ref(`album/music/${del.dataset.id}`).remove();
                    ActivityLog.add('music_del', 'Música removida');
                    Toast.show('Música removida', 'info');
                    return;
                }
                const item = e.target.closest('.playlist-item');
                if (item) this.play(item.dataset.id);
            });
        },
        parseUrl(url) {
            const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (yt) return { platform: 'youtube', embedId: yt[1] };
            const sp = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
            if (sp) return { platform: 'spotify', embedId: sp[1] };
            return null;
        },
        add() {
            const url = document.getElementById('music-url').value.trim();
            const title = document.getElementById('music-title').value.trim();
            if (!url) { Toast.show('Cole uma URL', 'error'); return; }
            const parsed = this.parseUrl(url);
            if (!parsed) { Toast.show('URL inválida. Use YouTube ou Spotify.', 'error'); return; }
            const me = Identity.get();
            db.ref('album/music').push({
                title: title || 'Sem título', ...parsed, timestamp: Date.now(),
                addedBy: me ? me.id : '0', addedByName: me ? me.name : ''
            });
            document.getElementById('music-url').value = '';
            document.getElementById('music-title').value = '';
            ActivityLog.add('music_add', `Música "${title || 'Sem título'}" adicionada`);
            Toast.show('Música adicionada! 🎵', 'success');
        },
        play(id) {
            const track = this.data.find(m => m.id === id);
            if (!track) return;
            this.currentPlaying = id;
            const container = document.getElementById('player-container');
            const player = document.getElementById('music-player');
            player.style.display = '';
            if (track.platform === 'youtube') {
                container.innerHTML = `<iframe src="https://www.youtube.com/embed/${track.embedId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
            } else {
                container.innerHTML = `<iframe src="https://open.spotify.com/embed/track/${track.embedId}?autoplay=1" allow="autoplay; encrypted-media"></iframe>`;
            }
            this.render();
        },
        autoplayFirst() {
            if (this.data.length) this.play(this.data[0].id);
        },
        render() {
            const list = document.getElementById('playlist');
            const empty = document.getElementById('music-empty');
            if (!this.data.length) { list.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            list.innerHTML = this.data.map(m => `
                <div class="playlist-item ${this.currentPlaying === m.id ? 'playing' : ''}" data-id="${m.id}">
                    <span class="playlist-item-icon">${this.currentPlaying === m.id ? '▶️' : '🎵'}</span>
                    <span class="playlist-item-title">${esc(m.title)} ${badgeHtml(m.addedBy, m.addedByName)}</span>
                    <span class="playlist-item-platform">${m.platform === 'youtube' ? 'YouTube' : 'Spotify'}</span>
                    <button class="playlist-item-delete" data-id="${m.id}">✕</button>
                </div>
            `).join('');
        }
    };

    // ==================== TIMELINE ====================
    const Timeline = {
        data: [],
        init() {
            document.getElementById('add-timeline-btn').addEventListener('click', () => this.add());
            document.getElementById('timeline-list').addEventListener('click', (e) => {
                const del = e.target.closest('.del-btn');
                if (del) {
                    db.ref(`album/timeline/${del.dataset.id}`).remove();
                    ActivityLog.add('timeline_del', 'Memória removida');
                }
            });
        },
        add() {
            const date = document.getElementById('timeline-date').value;
            const title = document.getElementById('timeline-title').value.trim();
            const desc = document.getElementById('timeline-desc').value.trim();
            if (!date || !title) { Toast.show('Preencha data e título', 'error'); return; }
            const me = Identity.get();
            db.ref('album/timeline').push({
                date, title, desc, timestamp: Date.now(),
                addedBy: me ? me.id : '0', addedByName: me ? me.name : ''
            });
            document.getElementById('timeline-date').value = '';
            document.getElementById('timeline-title').value = '';
            document.getElementById('timeline-desc').value = '';
            ActivityLog.add('timeline_add', `Memória "${title}" adicionada`);
            Toast.show('Memória adicionada! 📅', 'success');
        },
        render() {
            const list = document.getElementById('timeline-list');
            const empty = document.getElementById('timeline-empty');
            if (!this.data.length) { list.innerHTML = ''; empty.style.display = ''; return; }
            empty.style.display = 'none';
            list.innerHTML = this.data.map(t => `
                <div class="timeline-item">
                    <div class="timeline-date">${formatDateShort(t.date)} ${badgeHtml(t.addedBy, t.addedByName)}</div>
                    <div class="timeline-item-title">${esc(t.title)}</div>
                    <div class="timeline-item-desc">${esc(t.desc)}</div>
                    <div class="timeline-item-actions">
                        <button class="del-btn btn-icon" data-id="${t.id}">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
    };

    // ==================== SETTINGS ====================
    const Settings = {
        init() {
            document.getElementById('settings-btn').addEventListener('click', () => this.open());
            document.getElementById('settings-close').addEventListener('click', () => this.close());
            document.getElementById('settings-modal').addEventListener('click', (e) => {
                if (e.target === document.getElementById('settings-modal')) this.close();
            });
            document.getElementById('save-settings').addEventListener('click', () => this.save());
        },
        open() {
            document.getElementById('setting-name1').value = appConfig.name1 || '';
            document.getElementById('setting-name2').value = appConfig.name2 || '';
            document.getElementById('setting-date').value = appConfig.startDate || '';
            document.getElementById('settings-modal').style.display = '';
        },
        close() { document.getElementById('settings-modal').style.display = 'none'; },
        save() {
            const config = { ...appConfig };
            config.name1 = document.getElementById('setting-name1').value.trim() || config.name1;
            config.name2 = document.getElementById('setting-name2').value.trim() || config.name2;
            config.startDate = document.getElementById('setting-date').value || config.startDate;
            db.ref('album/config').set(config);
            this.close();
            ActivityLog.add('config', 'Configurações atualizadas');
            Toast.show('Configurações salvas!', 'success');
        }
    };

    // ==================== DARK MODE ====================
    const DarkMode = {
        init() {
            const theme = localStorage.getItem('album_theme') || 'light';
            if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('dark-mode-toggle').addEventListener('click', () => this.toggle());
            this.updateIcon();
        },
        toggle() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
            localStorage.setItem('album_theme', isDark ? 'light' : 'dark');
            this.updateIcon();
        },
        updateIcon() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            document.getElementById('theme-icon').textContent = isDark ? '☀️' : '🌙';
            document.getElementById('theme-label').textContent = isDark ? 'Claro' : 'Escuro';
        }
    };

    // ==================== HEARTS ====================
    const Hearts = {
        interval: null,
        heartChars: ['❤️', '💕', '💖', '💗', '💓', '🤍', '💜'],
        init() {
            const isMobile = window.innerWidth < 768;
            this.interval = setInterval(() => this.spawn(), isMobile ? 5000 : 3000);
        },
        spawn() {
            const container = document.getElementById('hearts-container');
            if (container.children.length >= 5) return;
            const heart = document.createElement('span');
            heart.className = 'floating-heart';
            heart.textContent = this.heartChars[Math.random() * this.heartChars.length | 0];
            heart.style.left = Math.random() * 100 + '%';
            heart.style.animationDuration = (6 + Math.random() * 6) + 's';
            heart.style.fontSize = (1 + Math.random() * 1.2) + 'rem';
            container.appendChild(heart);
            heart.addEventListener('animationend', () => heart.remove());
        }
    };

    // ==================== QUOTES ====================
    const Quotes = {
        list: [
            '"O amor não se vê com os olhos, mas com o coração."',
            '"Amar não é olhar um para o outro, é olhar juntos na mesma direção."',
            '"Você é o meu hoje e todos os meus amanhãs."',
            '"Em você eu encontrei o amor que nem nos contos de fadas eu vi."',
            '"Cada momento ao seu lado é um presente que guardo no coração."',
            '"O melhor da minha vida começou quando te encontrei."',
            '"Seu sorriso é a minha poesia favorita."',
            '"Juntos somos um poema que nunca terá ponto final."',
            '"Você é a razão dos meus sorrisos mais sinceros."',
            '"Nosso amor é a mais bela das histórias."',
            '"Contigo, até o silêncio fala de amor."',
            '"Meu lugar favorito no mundo é ao seu lado."',
            '"Amar você é a minha aventura preferida."',
            '"Você transforma dias comuns em momentos mágicos."',
            '"Nosso amor cresce a cada batida do coração."',
            '"Com você, cada dia é um novo capítulo de felicidade."',
            '"Você é o sonho que eu não quero acordar."',
            '"Meu coração escolheu você, e escolheria de novo."',
            '"Juntos, somos mais bonitos que qualquer pôr do sol."',
            '"Você é minha pessoa favorita em qualquer universo."'
        ],
        show() {
            document.getElementById('love-quote').textContent = this.list[Math.random() * this.list.length | 0];
        },
        startRotation() { this.show(); setInterval(() => this.show(), 10000); }
    };

    // ==================== NAVBAR ====================
    const Nav = {
        init() {
            const hamburger = document.getElementById('hamburger');
            const links = document.getElementById('nav-links');
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                links.classList.toggle('open');
            });
            links.addEventListener('click', (e) => {
                if (e.target.classList.contains('nav-link')) {
                    hamburger.classList.remove('active');
                    links.classList.remove('open');
                }
            });
            const sections = document.querySelectorAll('.section');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                        const link = document.querySelector(`.nav-link[data-section="${entry.target.id}"]`);
                        if (link) link.classList.add('active');
                    }
                });
            }, { rootMargin: '-50% 0px -50% 0px' });
            sections.forEach(s => observer.observe(s));

            // Change identity button
            document.getElementById('change-identity-btn').addEventListener('click', () => {
                IdentityPicker.show(appConfig);
            });
        }
    };

    // ==================== FIREBASE HELPERS ====================
    function snapToArray(snap) {
        const data = snap.val();
        if (!data) return [];
        return Object.entries(data).map(([id, v]) => ({ id, ...v }));
    }

    // ==================== REAL-TIME LISTENERS ====================
    function setupListeners() {
        // Config
        db.ref('album/config').on('value', (snap) => {
            const config = snap.val();
            if (config) {
                updateNames(config);
                Counter.init(config.startDate);
            }
        });

        // Photos
        db.ref('album/photos').on('value', (snap) => {
            Gallery.data = snapToArray(snap).sort((a, b) => b.timestamp - a.timestamp);
            Gallery.render();
            document.getElementById('stat-photos').textContent = Gallery.data.length;
        });

        // Videos
        db.ref('album/videos').on('value', (snap) => {
            Videos.data = snapToArray(snap).sort((a, b) => b.timestamp - a.timestamp);
            Videos.render();
        });

        // Messages
        db.ref('album/messages').on('value', (snap) => {
            Messages.data = snapToArray(snap).sort((a, b) => a.timestamp - b.timestamp);
            Messages.render();
            document.getElementById('stat-messages').textContent = Messages.data.length;
        });

        // Music
        db.ref('album/music').on('value', (snap) => {
            Music.data = snapToArray(snap).sort((a, b) => a.timestamp - b.timestamp);
            Music.render();
            document.getElementById('stat-music').textContent = Music.data.length;
        });

        // Timeline
        db.ref('album/timeline').on('value', (snap) => {
            Timeline.data = snapToArray(snap).sort((a, b) => new Date(b.date) - new Date(a.date));
            Timeline.render();
        });

        // Activity Log
        db.ref('album/log').orderByChild('timestamp').limitToLast(50).on('value', (snap) => {
            ActivityLog.data = snapToArray(snap).sort((a, b) => b.timestamp - a.timestamp);
            ActivityLog.render();
        });
    }

    // ==================== APP ====================
    const App = {
        init() {
            Welcome.init();
        },
        startApp() {
            DarkMode.init();
            Nav.init();
            Gallery.init();
            Videos.init();
            Messages.init();
            Music.init();
            Timeline.init();
            Settings.init();
            Hearts.init();
            Quotes.startRotation();
            setupListeners();

            // Autoplay music after user gesture (enter button click)
            setTimeout(() => Music.autoplayFirst(), 500);
        }
    };

    window.addEventListener('DOMContentLoaded', () => App.init());
})();
