/* ==========================================
   NOSSO MURAL DE MEMORIAS - SCRIPT
   Firebase Realtime Database + All Features
   ========================================== */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  var $ = function (s, p) { return (p || document).querySelector(s); };
  var $$ = function (s, p) { return Array.from((p || document).querySelectorAll(s)); };
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function ts() { return new Date().toISOString(); }
  function fmtDate(d) {
    if (!d) return "";
    var p = d.split("T")[0].split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  function fmtTime(d) {
    if (!d) return "";
    var dt = new Date(d);
    return dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  function escHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  /* ---------- state ---------- */
  var db = null;           // firebase.database() reference
  var state = {
    config: null,          // { name1, name2, startDate }
    photos: {},
    videos: {},
    messages: {},
    music: {},
    timeline: {},
    log: {}
  };
  var currentPerson = null; // "1" or "2"
  var currentSection = "home";
  var lightboxPhotos = [];
  var lightboxIdx = 0;
  var counterInterval = null;

  /* ==========================================
     FIREBASE
     ========================================== */
  function getFirebaseConfig() {
    return {
      apiKey: "AIzaSyBiWcEOtg4c5-BwjShrKx-0BxiW3XvavEs",
      authDomain: "teste-b38b5.firebaseapp.com",
      databaseURL: "https://teste-b38b5-default-rtdb.firebaseio.com",
      projectId: "teste-b38b5",
      storageBucket: "teste-b38b5.firebasestorage.app",
      messagingSenderId: "404183604492",
      appId: "1:404183604492:web:18a052b946e0f78097fd29",
      measurementId: "G-GCCXQF89Z2"
    };
  }

  function saveFirebaseConfig(cfg) {
    localStorage.setItem("fbConfig", JSON.stringify(cfg));
  }

  function initFirebase(cfg) {
    if (!window.firebase) { toast("Firebase SDK nao carregado. Recarregue a pagina.", "error"); return false; }
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      db = firebase.database();
      return true;
    } catch (e) {
      toast("Erro ao conectar ao Firebase: " + e.message, "error");
      return false;
    }
  }

  function fbSet(path, val) {
    if (!db) return Promise.resolve();
    return db.ref(path).set(val);
  }

  function fbPush(path, val) {
    if (!db) return Promise.resolve();
    var ref = db.ref(path).push();
    return ref.set(val).then(function () { return ref.key; });
  }

  function fbRemove(path) {
    if (!db) return Promise.resolve();
    return db.ref(path).remove();
  }

  function fbUpdate(path, val) {
    if (!db) return Promise.resolve();
    return db.ref(path).update(val);
  }

  function fbListen(path, cb) {
    if (!db) return;
    db.ref(path).on("value", function (snap) {
      cb(snap.val() || {});
    });
  }

  /* ==========================================
     TOAST
     ========================================== */
  function toast(msg, type) {
    type = type || "info";
    var c = $("#toast-container");
    var t = document.createElement("div");
    t.className = "toast toast-" + type;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; t.style.transform = "translateX(100%)"; }, 2800);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3200);
  }

  /* ==========================================
     ACTIVITY LOG
     ========================================== */
  function addLog(icon, detail) {
    var entry = { id: uid(), icon: icon, detail: detail, time: ts(), person: currentPerson || "?" };
    fbPush("log", entry);
  }

  function renderLog(data) {
    state.log = data || {};
    var list = $("#log-list");
    var empty = $("#log-empty");
    var items = Object.values(state.log).sort(function (a, b) { return b.time.localeCompare(a.time); });
    if (items.length === 0) { list.innerHTML = ""; empty.style.display = ""; return; }
    empty.style.display = "none";
    list.innerHTML = items.slice(0, 50).map(function (l) {
      var name = getPersonName(l.person);
      return '<div class="log-item"><span class="log-icon">' + l.icon +
        '</span><span class="log-detail"><strong>' + escHtml(name) + ':</strong> ' + escHtml(l.detail) +
        '</span><span class="log-time">' + fmtTime(l.time) + '</span></div>';
    }).join("");
  }

  /* ==========================================
     IDENTITY
     ========================================== */
  function getPersonName(p) {
    if (!state.config) return "Pessoa " + p;
    return p === "1" ? (state.config.name1 || "Pessoa 1") : (state.config.name2 || "Pessoa 2");
  }

  function showIdentityModal() {
    var modal = $("#identity-modal");
    $("#identity-name-1").textContent = getPersonName("1");
    $("#identity-name-2").textContent = getPersonName("2");
    modal.style.display = "flex";
  }

  function pickIdentity(p) {
    currentPerson = p;
    localStorage.setItem("currentPerson", p);
    $("#identity-modal").style.display = "none";
    updateIdentityIndicator();
    toast("Voce esta como " + getPersonName(p), "success");
  }

  function updateIdentityIndicator() {
    var ind = $("#identity-indicator");
    if (!currentPerson) { ind.style.display = "none"; return; }
    ind.style.display = "flex";
    var dot = $("#identity-dot");
    dot.className = "identity-dot person-" + currentPerson;
    $("#identity-name-display").textContent = getPersonName(currentPerson);
  }

  /* ==========================================
     NAVIGATION
     ========================================== */
  function showSection(name) {
    currentSection = name;
    $$(".section").forEach(function (s) { s.style.display = "none"; });
    var el = $("#" + name);
    if (el) el.style.display = "";
    $$(".nav-link").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-section") === name);
    });
    // close mobile menu
    var nl = $("#nav-links");
    if (nl) nl.classList.remove("open");
    var hb = $("#hamburger");
    if (hb) hb.classList.remove("active");
  }

  /* ==========================================
     DARK MODE
     ========================================== */
  function initDarkMode() {
    var saved = localStorage.getItem("theme");
    if (saved === "dark") applyTheme("dark");
    else applyTheme("light");
  }

  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
    var icon = $("#theme-icon");
    var label = $("#theme-label");
    if (t === "dark") {
      if (icon) icon.innerHTML = "&#x2600;&#xFE0F;";
      if (label) label.textContent = "Claro";
    } else {
      if (icon) icon.innerHTML = "&#x1F319;";
      if (label) label.textContent = "Escuro";
    }
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme");
    applyTheme(cur === "dark" ? "light" : "dark");
  }

  /* ==========================================
     FLOATING HEARTS
     ========================================== */
  function spawnHeart() {
    var c = $("#hearts-container");
    if (!c) return;
    var h = document.createElement("span");
    h.className = "floating-heart";
    var hearts = ["\u2764\uFE0F", "\uD83D\uDC95", "\uD83D\uDC96", "\uD83D\uDC97", "\uD83D\uDC9C", "\uD83D\uDC9B", "\uD83E\uDE77"];
    h.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    h.style.left = Math.random() * 100 + "%";
    h.style.animationDuration = (6 + Math.random() * 6) + "s";
    h.style.fontSize = (0.8 + Math.random() * 1.2) + "rem";
    c.appendChild(h);
    setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 12000);
  }

  /* ==========================================
     LOVE QUOTES
     ========================================== */
  var quotes = [
    "O amor nao se ve com os olhos, mas com o coracao.",
    "Amar nao e olhar um para o outro, e olhar juntos na mesma direcao.",
    "Voce e meu hoje e todos os meus amanha.",
    "Cada momento com voce e um presente.",
    "O melhor da vida e ter alguem para compartilha-la.",
    "Eu te amo nao pelo que voce e, mas pelo que sou quando estou com voce.",
    "Voce e a poesia que eu nunca soube escrever.",
    "Meu lugar favorito e ao seu lado.",
    "Contigo, ate o silencio fala.",
    "Voce e o sonho que eu nao quero acordar."
  ];

  function randomQuote() {
    var q = quotes[Math.floor(Math.random() * quotes.length)];
    var el = $("#love-quote");
    if (el) el.textContent = '"' + q + '"';
  }

  /* ==========================================
     COUNTER (days together)
     ========================================== */
  function startCounter() {
    if (counterInterval) clearInterval(counterInterval);
    updateCounter();
    counterInterval = setInterval(updateCounter, 1000);
  }

  function updateCounter() {
    if (!state.config || !state.config.startDate) return;
    var start = new Date(state.config.startDate + "T00:00:00");
    var now = new Date();
    var diff = now - start;
    if (diff < 0) diff = 0;

    var totalSec = Math.floor(diff / 1000);
    var days = Math.floor(totalSec / 86400);
    var hours = Math.floor((totalSec % 86400) / 3600);
    var mins = Math.floor((totalSec % 3600) / 60);
    var secs = totalSec % 60;
    var months = Math.floor(days / 30);
    var years = Math.floor(days / 365);

    var grid = $("#counter-grid");
    if (grid) {
      grid.innerHTML =
        counterCard(years, "Anos") +
        counterCard(months, "Meses") +
        counterCard(days, "Dias") +
        counterCard(hours, "Horas") +
        counterCard(mins, "Minutos") +
        counterCard(secs, "Segundos");
    }

    var wc = $("#welcome-counter");
    if (wc) wc.textContent = days + " dias juntos";
  }

  function counterCard(val, label) {
    return '<div class="counter-item glass-card"><div class="counter-value">' + val +
      '</div><div class="counter-label">' + label + '</div></div>';
  }

  /* ==========================================
     STATS
     ========================================== */
  function updateStats() {
    var sp = $("#stat-photos");
    var sm = $("#stat-messages");
    var smu = $("#stat-music");
    if (sp) sp.textContent = Object.keys(state.photos).length;
    if (sm) sm.textContent = Object.keys(state.messages).length;
    if (smu) smu.textContent = Object.keys(state.music).length;
  }

  /* ==========================================
     GALLERY (photos as base64)
     ========================================== */
  function handlePhotoInput(e) {
    var files = e.target.files;
    if (!files || files.length === 0) return;
    if (!currentPerson) { toast("Identifique-se primeiro!", "error"); showIdentityModal(); return; }

    Array.from(files).forEach(function (file) {
      if (file.size > 800000) {
        toast("Foto muito grande (max 800KB): " + file.name, "error");
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        var photo = {
          id: uid(),
          src: ev.target.result,
          caption: "",
          favorite: false,
          person: currentPerson,
          date: ts()
        };
        fbPush("photos", photo).then(function () {
          addLog("\uD83D\uDCF7", "adicionou uma foto");
          toast("Foto adicionada!", "success");
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function renderGallery(data) {
    state.photos = data || {};
    updateStats();
    var grid = $("#gallery-grid");
    var empty = $("#gallery-empty");
    var searchVal = ($("#photo-search") || {}).value || "";
    var filterVal = $(".filter-btns .btn-sm.active");
    var filter = filterVal ? filterVal.getAttribute("data-filter") : "all";
    var items = Object.entries(state.photos);

    // search filter
    if (searchVal.trim()) {
      var q = searchVal.toLowerCase();
      items = items.filter(function (e) { return (e[1].caption || "").toLowerCase().includes(q); });
    }
    // favorites filter
    if (filter === "favorites") {
      items = items.filter(function (e) { return e[1].favorite; });
    }
    // sort newest first
    items.sort(function (a, b) { return (b[1].date || "").localeCompare(a[1].date || ""); });

    if (items.length === 0) { grid.innerHTML = ""; empty.style.display = ""; return; }
    empty.style.display = "none";

    lightboxPhotos = items.map(function (e) { return { key: e[0], src: e[1].src, caption: e[1].caption }; });

    grid.innerHTML = items.map(function (e, idx) {
      var key = e[0], p = e[1];
      var badge = personBadge(p.person);
      var favClass = p.favorite ? " fav-active" : "";
      return '<div class="photo-card" data-idx="' + idx + '">' +
        '<span class="poster-badge photo-poster-badge person-' + p.person + '">' + badge + '</span>' +
        '<img src="' + p.src + '" alt="foto" loading="lazy">' +
        '<div class="photo-overlay">' +
        '<span class="photo-caption">' + escHtml(p.caption || "") + '</span>' +
        '<div class="photo-actions">' +
        '<button class="photo-fav-btn' + favClass + '" data-key="' + key + '" title="Favoritar">' + (p.favorite ? "\u2B50" : "\u2606") + '</button>' +
        '<button class="photo-cap-btn" data-key="' + key + '" title="Legenda">\u270F\uFE0F</button>' +
        '<button class="photo-del-btn" data-key="' + key + '" title="Excluir">\uD83D\uDDD1\uFE0F</button>' +
        '</div></div></div>';
    }).join("");
  }

  function personBadge(p) {
    return getPersonName(p);
  }

  /* gallery event delegation */
  function onGalleryClick(e) {
    var tgt = e.target;
    if (tgt.classList.contains("photo-fav-btn") || tgt.closest(".photo-fav-btn")) {
      e.stopPropagation();
      var btn = tgt.classList.contains("photo-fav-btn") ? tgt : tgt.closest(".photo-fav-btn");
      var key = btn.getAttribute("data-key");
      if (state.photos[key] !== undefined) {
        // find the firebase key - photos are stored with push keys
        togglePhotoFav(key);
      }
      return;
    }
    if (tgt.classList.contains("photo-cap-btn") || tgt.closest(".photo-cap-btn")) {
      e.stopPropagation();
      var btn2 = tgt.classList.contains("photo-cap-btn") ? tgt : tgt.closest(".photo-cap-btn");
      var key2 = btn2.getAttribute("data-key");
      editPhotoCaption(key2);
      return;
    }
    if (tgt.classList.contains("photo-del-btn") || tgt.closest(".photo-del-btn")) {
      e.stopPropagation();
      var btn3 = tgt.classList.contains("photo-del-btn") ? tgt : tgt.closest(".photo-del-btn");
      var key3 = btn3.getAttribute("data-key");
      deletePhoto(key3);
      return;
    }
    // click on photo card => lightbox
    var card = tgt.closest(".photo-card");
    if (card) {
      var idx = parseInt(card.getAttribute("data-idx"), 10);
      openLightbox(idx);
    }
  }

  function findFbKey(collection, id) {
    // photos are stored with firebase push keys as outer key, and item has .id field
    // but we stored using fbPush which uses firebase key as the outer key
    // In renderGallery we use Object.entries so key = firebase push key
    return id; // the key IS the firebase key
  }

  function togglePhotoFav(key) {
    var items = state.photos;
    if (!items[key]) return;
    var cur = items[key].favorite;
    fbUpdate("photos/" + key, { favorite: !cur });
  }

  function editPhotoCaption(key) {
    var items = state.photos;
    if (!items[key]) return;
    var cap = prompt("Legenda da foto:", items[key].caption || "");
    if (cap === null) return;
    fbUpdate("photos/" + key, { caption: cap });
    addLog("\u270F\uFE0F", "editou legenda de uma foto");
  }

  function deletePhoto(key) {
    if (!confirm("Excluir esta foto?")) return;
    fbRemove("photos/" + key).then(function () {
      addLog("\uD83D\uDDD1\uFE0F", "excluiu uma foto");
      toast("Foto excluida!", "info");
    });
  }

  /* ---------- lightbox ---------- */
  function openLightbox(idx) {
    if (!lightboxPhotos.length) return;
    lightboxIdx = idx;
    var lb = $("#lightbox");
    lb.style.display = "flex";
    updateLightbox();
  }

  function updateLightbox() {
    var p = lightboxPhotos[lightboxIdx];
    if (!p) return;
    $("#lightbox-img").src = p.src;
    $("#lightbox-caption").textContent = p.caption || "";
  }

  function closeLightbox() { $("#lightbox").style.display = "none"; }

  function lightboxPrev() {
    lightboxIdx = (lightboxIdx - 1 + lightboxPhotos.length) % lightboxPhotos.length;
    updateLightbox();
  }

  function lightboxNext() {
    lightboxIdx = (lightboxIdx + 1) % lightboxPhotos.length;
    updateLightbox();
  }

  /* ==========================================
     VIDEOS (YouTube embed)
     ========================================== */
  function extractYoutubeId(url) {
    var m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function addVideo() {
    var urlEl = $("#video-url");
    var titleEl = $("#video-title");
    var url = (urlEl.value || "").trim();
    var title = (titleEl.value || "").trim();
    if (!url) { toast("Cole uma URL do YouTube!", "error"); return; }
    if (!currentPerson) { toast("Identifique-se primeiro!", "error"); showIdentityModal(); return; }

    var ytId = extractYoutubeId(url);
    if (!ytId) { toast("URL do YouTube invalida!", "error"); return; }

    var video = {
      id: uid(),
      ytId: ytId,
      title: title || "Video sem titulo",
      person: currentPerson,
      date: ts()
    };

    fbPush("videos", video).then(function () {
      addLog("\uD83C\uDFAC", "adicionou um video: " + video.title);
      toast("Video adicionado!", "success");
      urlEl.value = "";
      titleEl.value = "";
    });
  }

  function renderVideos(data) {
    state.videos = data || {};
    var grid = $("#video-grid");
    var empty = $("#video-empty");
    var items = Object.entries(state.videos).sort(function (a, b) { return (b[1].date || "").localeCompare(a[1].date || ""); });

    if (items.length === 0) { grid.innerHTML = ""; empty.style.display = ""; return; }
    empty.style.display = "none";

    grid.innerHTML = items.map(function (e) {
      var key = e[0], v = e[1];
      var badge = '<span class="poster-badge person-' + v.person + '">' + personBadge(v.person) + '</span>';
      return '<div class="video-card glass-card">' +
        '<iframe src="https://www.youtube.com/embed/' + v.ytId + '" allowfullscreen loading="lazy"></iframe>' +
        '<div class="video-card-header">' +
        '<span class="video-card-title">' + escHtml(v.title) + '</span>' +
        badge +
        '<button class="btn-icon video-del-btn" data-key="' + key + '" title="Excluir">\uD83D\uDDD1\uFE0F</button>' +
        '</div></div>';
    }).join("");
  }

  function onVideoGridClick(e) {
    var btn = e.target.closest(".video-del-btn");
    if (!btn) return;
    var key = btn.getAttribute("data-key");
    if (!confirm("Excluir este video?")) return;
    fbRemove("videos/" + key).then(function () {
      addLog("\uD83D\uDDD1\uFE0F", "excluiu um video");
      toast("Video excluido!", "info");
    });
  }

  /* ==========================================
     MESSAGES
     ========================================== */
  function sendMessage() {
    var input = $("#msg-input");
    var text = (input.value || "").trim();
    if (!text) { toast("Escreva uma mensagem!", "error"); return; }
    if (!currentPerson) { toast("Identifique-se primeiro!", "error"); showIdentityModal(); return; }

    var msg = {
      id: uid(),
      text: text,
      person: currentPerson,
      favorite: false,
      date: ts()
    };

    fbPush("messages", msg).then(function () {
      addLog("\uD83D\uDC8C", "enviou uma mensagem");
      toast("Mensagem enviada!", "success");
      input.value = "";
    });
  }

  function renderMessages(data) {
    state.messages = data || {};
    updateStats();
    var list = $("#messages-list");
    var empty = $("#msg-empty");

    // get active filter
    var filterBtn = $(".msg-filters .btn-sm.active");
    var filter = filterBtn ? filterBtn.getAttribute("data-msg-filter") : "all";

    var items = Object.entries(state.messages);

    if (filter === "1") items = items.filter(function (e) { return e[1].person === "1"; });
    else if (filter === "2") items = items.filter(function (e) { return e[1].person === "2"; });
    else if (filter === "favorites") items = items.filter(function (e) { return e[1].favorite; });

    items.sort(function (a, b) { return (a[1].date || "").localeCompare(b[1].date || ""); });

    if (items.length === 0 && Object.keys(state.messages).length === 0) {
      list.innerHTML = "";
      empty.style.display = "";
      return;
    }
    empty.style.display = "none";

    list.innerHTML = items.map(function (e) {
      var key = e[0], m = e[1];
      var authorClass = "author-" + m.person;
      var favIcon = m.favorite ? "\u2B50" : "\u2606";
      return '<div class="message-bubble ' + authorClass + '">' +
        '<div class="msg-author-name">' + escHtml(getPersonName(m.person)) + '</div>' +
        '<div class="msg-text">' + escHtml(m.text) + '</div>' +
        '<div class="msg-meta">' +
        '<span>' + fmtDate(m.date) + ' ' + fmtTime(m.date) + '</span>' +
        '<span>' +
        '<button class="msg-fav-btn" data-key="' + key + '">' + favIcon + '</button> ' +
        '<button class="msg-delete-btn" data-key="' + key + '">\uD83D\uDDD1\uFE0F</button>' +
        '</span></div></div>';
    }).join("");

    // auto-scroll to bottom
    list.scrollTop = list.scrollHeight;
  }

  function onMessagesClick(e) {
    var favBtn = e.target.closest(".msg-fav-btn");
    if (favBtn) {
      var key = favBtn.getAttribute("data-key");
      if (state.messages[key] !== undefined) {
        fbUpdate("messages/" + key, { favorite: !state.messages[key].favorite });
      }
      return;
    }
    var delBtn = e.target.closest(".msg-delete-btn");
    if (delBtn) {
      var key2 = delBtn.getAttribute("data-key");
      if (confirm("Excluir esta mensagem?")) {
        fbRemove("messages/" + key2).then(function () {
          addLog("\uD83D\uDDD1\uFE0F", "excluiu uma mensagem");
          toast("Mensagem excluida!", "info");
        });
      }
    }
  }

  /* ---------- emoji picker ---------- */
  var emojis = [
    "\u2764\uFE0F", "\uD83D\uDC95", "\uD83D\uDC96", "\uD83D\uDC97", "\uD83D\uDC98", "\uD83D\uDC9D",
    "\uD83D\uDC9E", "\uD83D\uDC9F", "\uD83D\uDC9C", "\uD83D\uDC9B", "\uD83E\uDE77", "\uD83D\uDE18",
    "\uD83D\uDE0D", "\uD83E\uDD70", "\uD83D\uDE1A", "\uD83D\uDE17", "\uD83D\uDE19", "\uD83E\uDD79",
    "\uD83D\uDE0A", "\uD83D\uDE07", "\uD83E\uDD29", "\uD83D\uDE02", "\uD83D\uDE05", "\uD83D\uDE0B",
    "\uD83C\uDF39", "\uD83C\uDF3B", "\uD83C\uDF38", "\uD83C\uDF3A", "\uD83C\uDF37", "\u2728",
    "\uD83C\uDF1F", "\uD83C\uDF08", "\uD83C\uDF1E", "\uD83C\uDF19", "\uD83D\uDCAB", "\uD83D\uDD25"
  ];

  function initEmojiPicker() {
    var picker = $("#emoji-picker");
    if (!picker) return;
    picker.innerHTML = emojis.map(function (em) {
      return '<button class="emoji-btn" type="button">' + em + '</button>';
    }).join("");
  }

  function onEmojiClick(e) {
    if (!e.target.classList.contains("emoji-btn")) return;
    var emoji = e.target.textContent;
    var input = $("#msg-input");
    input.value += emoji;
    input.focus();
  }

  /* ==========================================
     MUSIC
     ========================================== */
  function addMusic() {
    var urlEl = $("#music-url");
    var titleEl = $("#music-title");
    var url = (urlEl.value || "").trim();
    var title = (titleEl.value || "").trim();
    if (!url) { toast("Cole uma URL!", "error"); return; }
    if (!currentPerson) { toast("Identifique-se primeiro!", "error"); showIdentityModal(); return; }

    var platform = "link";
    var embedUrl = "";

    // YouTube
    var ytId = extractYoutubeId(url);
    if (ytId) {
      platform = "youtube";
      embedUrl = "https://www.youtube.com/embed/" + ytId;
    }
    // Spotify
    var spMatch = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    if (spMatch) {
      platform = "spotify";
      embedUrl = "https://open.spotify.com/embed/" + spMatch[1] + "/" + spMatch[2];
    }

    if (!embedUrl) { toast("URL nao reconhecida. Use YouTube ou Spotify.", "error"); return; }

    var song = {
      id: uid(),
      url: url,
      embedUrl: embedUrl,
      title: title || "Musica sem titulo",
      platform: platform,
      person: currentPerson,
      date: ts()
    };

    fbPush("music", song).then(function () {
      addLog("\uD83C\uDFB5", "adicionou uma musica: " + song.title);
      toast("Musica adicionada!", "success");
      urlEl.value = "";
      titleEl.value = "";
    });
  }

  function renderMusic(data) {
    state.music = data || {};
    updateStats();
    var list = $("#playlist");
    var empty = $("#music-empty");
    var items = Object.entries(state.music).sort(function (a, b) { return (b[1].date || "").localeCompare(a[1].date || ""); });

    if (items.length === 0) { list.innerHTML = ""; empty.style.display = ""; return; }
    empty.style.display = "none";

    list.innerHTML = items.map(function (e) {
      var key = e[0], s = e[1];
      var icon = s.platform === "spotify" ? "\uD83C\uDFB5" : "\u25B6\uFE0F";
      var badge = '<span class="poster-badge person-' + s.person + '" style="margin-left:auto;">' + personBadge(s.person) + '</span>';
      return '<div class="playlist-item" data-key="' + key + '" data-embed="' + escHtml(s.embedUrl) + '">' +
        '<span class="playlist-item-icon">' + icon + '</span>' +
        '<span class="playlist-item-title">' + escHtml(s.title) + '</span>' +
        '<span class="playlist-item-platform">' + s.platform + '</span>' +
        badge +
        '<button class="playlist-item-delete" data-key="' + key + '" title="Excluir">\uD83D\uDDD1\uFE0F</button>' +
        '</div>';
    }).join("");
  }

  function onPlaylistClick(e) {
    var delBtn = e.target.closest(".playlist-item-delete");
    if (delBtn) {
      e.stopPropagation();
      var key = delBtn.getAttribute("data-key");
      if (confirm("Excluir esta musica?")) {
        fbRemove("music/" + key).then(function () {
          addLog("\uD83D\uDDD1\uFE0F", "excluiu uma musica");
          toast("Musica excluida!", "info");
          $("#music-player").style.display = "none";
        });
      }
      return;
    }
    var item = e.target.closest(".playlist-item");
    if (!item) return;
    var embedUrl = item.getAttribute("data-embed");
    if (!embedUrl) return;

    // highlight playing
    $$(".playlist-item").forEach(function (pi) { pi.classList.remove("playing"); });
    item.classList.add("playing");

    // show player
    var player = $("#music-player");
    var container = $("#player-container");
    container.innerHTML = '<iframe src="' + embedUrl + '?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
    player.style.display = "";
  }

  /* ==========================================
     TIMELINE
     ========================================== */
  function addTimeline() {
    var dateEl = $("#timeline-date");
    var titleEl = $("#timeline-title");
    var descEl = $("#timeline-desc");
    var date = (dateEl.value || "").trim();
    var title = (titleEl.value || "").trim();
    var desc = (descEl.value || "").trim();

    if (!title) { toast("Preencha o titulo!", "error"); return; }
    if (!currentPerson) { toast("Identifique-se primeiro!", "error"); showIdentityModal(); return; }

    var entry = {
      id: uid(),
      date: date || new Date().toISOString().split("T")[0],
      title: title,
      description: desc,
      person: currentPerson,
      createdAt: ts()
    };

    fbPush("timeline", entry).then(function () {
      addLog("\uD83D\uDCC5", "adicionou na timeline: " + title);
      toast("Memoria adicionada!", "success");
      dateEl.value = "";
      titleEl.value = "";
      descEl.value = "";
    });
  }

  function renderTimeline(data) {
    state.timeline = data || {};
    var list = $("#timeline-list");
    var empty = $("#timeline-empty");
    var items = Object.entries(state.timeline).sort(function (a, b) { return (b[1].date || "").localeCompare(a[1].date || ""); });

    if (items.length === 0) { list.innerHTML = ""; empty.style.display = ""; return; }
    empty.style.display = "none";

    list.innerHTML = items.map(function (e) {
      var key = e[0], t = e[1];
      var badge = '<span class="poster-badge person-' + t.person + '">' + personBadge(t.person) + '</span>';
      return '<div class="timeline-item">' +
        '<div class="timeline-date">' + fmtDate(t.date + "T00:00:00") + ' ' + badge + '</div>' +
        '<div class="timeline-item-title">' + escHtml(t.title) + '</div>' +
        '<div class="timeline-item-desc">' + escHtml(t.description || "") + '</div>' +
        '<div class="timeline-item-actions">' +
        '<button class="btn-icon timeline-del-btn" data-key="' + key + '" title="Excluir">\uD83D\uDDD1\uFE0F</button>' +
        '</div></div>';
    }).join("");
  }

  function onTimelineClick(e) {
    var btn = e.target.closest(".timeline-del-btn");
    if (!btn) return;
    var key = btn.getAttribute("data-key");
    if (!confirm("Excluir esta memoria?")) return;
    fbRemove("timeline/" + key).then(function () {
      addLog("\uD83D\uDDD1\uFE0F", "excluiu uma memoria da timeline");
      toast("Memoria excluida!", "info");
    });
  }

  /* ==========================================
     SETTINGS
     ========================================== */
  function openSettings() {
    var modal = $("#settings-modal");
    if (state.config) {
      $("#setting-name1").value = state.config.name1 || "";
      $("#setting-name2").value = state.config.name2 || "";
      $("#setting-date").value = state.config.startDate || "";
    }
    modal.style.display = "flex";
  }

  function closeSettings() {
    $("#settings-modal").style.display = "none";
  }

  function saveSettings() {
    var name1 = ($("#setting-name1").value || "").trim();
    var name2 = ($("#setting-name2").value || "").trim();
    var date = ($("#setting-date").value || "").trim();
    if (!name1 || !name2) { toast("Preencha os nomes!", "error"); return; }

    var cfg = { name1: name1, name2: name2, startDate: date };
    fbSet("config", cfg).then(function () {
      toast("Configuracoes salvas!", "success");
      closeSettings();
    });
  }

  function resetFirebase() {
    if (!confirm("Deseja reconfigurar o Firebase? A pagina sera recarregada.")) return;
    localStorage.removeItem("fbConfig");
    location.reload();
  }

  /* ==========================================
     SETUP / WELCOME FLOW
     ========================================== */
  function showFirebaseOverlay() {
    $$("#firebase-overlay, #welcome-screen, #navbar, #main-content, #footer, #identity-modal").forEach(function (el) {
      if (el) el.style.display = "none";
    });
    $("#firebase-overlay").style.display = "flex";
  }

  function showWelcomeScreen() {
    $("#firebase-overlay").style.display = "none";
    $("#welcome-screen").style.display = "flex";
    $("#navbar").style.display = "none";
    $("#main-content").style.display = "none";
    $("#footer").style.display = "none";

    // Check if config exists in Firebase
    if (db) {
      db.ref("config").once("value").then(function (snap) {
        var cfg = snap.val();
        $("#welcome-loading").style.display = "none";
        if (cfg && cfg.name1 && cfg.name2) {
          state.config = cfg;
          $("#welcome-names").textContent = cfg.name1 + " & " + cfg.name2;
          $("#welcome-display").style.display = "";
          startCounter();
        } else {
          $("#setup-form").style.display = "";
        }
      });
    } else {
      $("#welcome-loading").style.display = "none";
      $("#setup-form").style.display = "";
    }
  }

  function saveSetup() {
    var name1 = ($("#setup-name1").value || "").trim();
    var name2 = ($("#setup-name2").value || "").trim();
    var date = ($("#setup-date").value || "").trim();
    if (!name1 || !name2) { toast("Preencha os dois nomes!", "error"); return; }
    var cfg = { name1: name1, name2: name2, startDate: date };
    fbSet("config", cfg).then(function () {
      state.config = cfg;
      toast("Configuracao salva!", "success");
      enterApp();
    });
  }

  function enterApp() {
    $("#welcome-screen").style.display = "none";
    $("#navbar").style.display = "flex";
    $("#main-content").style.display = "";
    $("#footer").style.display = "";

    // update names
    if (state.config) {
      var names = state.config.name1 + " & " + state.config.name2;
      var hn = $("#home-names"); if (hn) hn.textContent = names;
      var fn = $("#footer-names"); if (fn) fn.textContent = names;
      var nb = $("#nav-brand"); if (nb) nb.innerHTML = "\uD83D\uDC95 " + names;

      // update message filter labels
      var mf1 = $("#msg-filter-1"); if (mf1) mf1.textContent = state.config.name1;
      var mf2 = $("#msg-filter-2"); if (mf2) mf2.textContent = state.config.name2;
    }

    // show identity modal if not set
    currentPerson = localStorage.getItem("currentPerson");
    if (!currentPerson) {
      showIdentityModal();
    } else {
      updateIdentityIndicator();
    }

    // start listeners
    startFirebaseListeners();

    // start counter, hearts, quote
    startCounter();
    randomQuote();
    setInterval(spawnHeart, 3000);
    spawnHeart();

    showSection("home");
  }

  function startFirebaseListeners() {
    if (!db) return;

    fbListen("config", function (cfg) {
      if (cfg) {
        state.config = cfg;
        var names = cfg.name1 + " & " + cfg.name2;
        var hn = $("#home-names"); if (hn) hn.textContent = names;
        var fn = $("#footer-names"); if (fn) fn.textContent = names;
        var nb = $("#nav-brand"); if (nb) nb.innerHTML = "\uD83D\uDC95 " + names;
        var mf1 = $("#msg-filter-1"); if (mf1) mf1.textContent = cfg.name1;
        var mf2 = $("#msg-filter-2"); if (mf2) mf2.textContent = cfg.name2;
        updateIdentityIndicator();
        startCounter();
      }
    });

    fbListen("photos", renderGallery);
    fbListen("videos", renderVideos);
    fbListen("messages", renderMessages);
    fbListen("music", renderMusic);
    fbListen("timeline", renderTimeline);
    fbListen("log", renderLog);
  }

  /* ==========================================
     FIREBASE SETUP OVERLAY HANDLER
     ========================================== */
  function saveFirebaseSetup() {
    var fields = ["apiKey", "authDomain", "databaseURL", "projectId", "storageBucket", "messagingSenderId", "appId"];
    var cfg = {};
    var missing = false;
    fields.forEach(function (f) {
      var val = ($("#fb-" + f).value || "").trim();
      if (f === "apiKey" || f === "databaseURL") {
        if (!val) missing = true;
      }
      cfg[f] = val;
    });
    if (missing) {
      toast("Preencha pelo menos apiKey e databaseURL!", "error");
      return;
    }
    // test connection
    if (!initFirebase(cfg)) return;

    saveFirebaseConfig(cfg);
    toast("Firebase conectado!", "success");
    showWelcomeScreen();
  }

  /* ==========================================
     BOOT
     ========================================== */
  function boot() {
    initDarkMode();
    initEmojiPicker();

    // Check for saved Firebase config
    var fbCfg = getFirebaseConfig();
    initFirebase(fbCfg);
    showWelcomeScreen();

    /* ---------- wire up event listeners ---------- */

    // Firebase setup
    var fbSaveBtn = $("#fb-save-btn");
    if (fbSaveBtn) fbSaveBtn.addEventListener("click", saveFirebaseSetup);

    // Welcome / setup
    var setupBtn = $("#setup-btn");
    if (setupBtn) setupBtn.addEventListener("click", saveSetup);

    var enterBtn = $("#enter-btn");
    if (enterBtn) enterBtn.addEventListener("click", enterApp);

    // Identity
    var idBtn1 = $("#identity-btn-1");
    if (idBtn1) idBtn1.addEventListener("click", function () { pickIdentity("1"); });
    var idBtn2 = $("#identity-btn-2");
    if (idBtn2) idBtn2.addEventListener("click", function () { pickIdentity("2"); });
    var changeIdBtn = $("#change-identity-btn");
    if (changeIdBtn) changeIdBtn.addEventListener("click", showIdentityModal);

    // Navigation
    $$(".nav-link").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        showSection(a.getAttribute("data-section"));
      });
    });

    // Hamburger
    var hamburger = $("#hamburger");
    if (hamburger) {
      hamburger.addEventListener("click", function () {
        hamburger.classList.toggle("active");
        $("#nav-links").classList.toggle("open");
      });
    }

    // Dark mode
    var dmToggle = $("#dark-mode-toggle");
    if (dmToggle) dmToggle.addEventListener("click", toggleTheme);

    // Settings
    var settingsBtn = $("#settings-btn");
    if (settingsBtn) settingsBtn.addEventListener("click", openSettings);
    var settingsClose = $("#settings-close");
    if (settingsClose) settingsClose.addEventListener("click", closeSettings);
    var saveSettingsBtn = $("#save-settings");
    if (saveSettingsBtn) saveSettingsBtn.addEventListener("click", saveSettings);
    var resetFbBtn = $("#reset-firebase");
    if (resetFbBtn) resetFbBtn.addEventListener("click", resetFirebase);

    // Settings modal backdrop click
    var settingsModal = $("#settings-modal");
    if (settingsModal) {
      settingsModal.addEventListener("click", function (e) {
        if (e.target === settingsModal) closeSettings();
      });
    }

    // Gallery
    var photoInput = $("#photo-input");
    if (photoInput) photoInput.addEventListener("change", handlePhotoInput);

    var galleryGrid = $("#gallery-grid");
    if (galleryGrid) galleryGrid.addEventListener("click", onGalleryClick);

    // Photo search
    var photoSearch = $("#photo-search");
    if (photoSearch) {
      photoSearch.addEventListener("input", function () {
        renderGallery(state.photos);
      });
    }

    // Photo filters
    $$(".filter-btns .btn-sm").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".filter-btns .btn-sm").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        renderGallery(state.photos);
      });
    });

    // Lightbox
    var lbClose = $("#lightbox-close");
    if (lbClose) lbClose.addEventListener("click", closeLightbox);
    var lbPrev = $("#lightbox-prev");
    if (lbPrev) lbPrev.addEventListener("click", lightboxPrev);
    var lbNext = $("#lightbox-next");
    if (lbNext) lbNext.addEventListener("click", lightboxNext);

    // Lightbox keyboard
    document.addEventListener("keydown", function (e) {
      if ($("#lightbox").style.display === "none") return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    });

    // Lightbox backdrop click
    var lightbox = $("#lightbox");
    if (lightbox) {
      lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox) closeLightbox();
      });
    }

    // Videos
    var addVideoBtn = $("#add-video-btn");
    if (addVideoBtn) addVideoBtn.addEventListener("click", addVideo);

    var videoGrid = $("#video-grid");
    if (videoGrid) videoGrid.addEventListener("click", onVideoGridClick);

    // Messages
    var sendMsgBtn = $("#send-msg-btn");
    if (sendMsgBtn) sendMsgBtn.addEventListener("click", sendMessage);

    var msgInput = $("#msg-input");
    if (msgInput) {
      msgInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    var msgList = $("#messages-list");
    if (msgList) msgList.addEventListener("click", onMessagesClick);

    // Message filters
    $$(".msg-filters .btn-sm").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".msg-filters .btn-sm").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        renderMessages(state.messages);
      });
    });

    // Emoji
    var emojiToggle = $("#emoji-toggle");
    if (emojiToggle) {
      emojiToggle.addEventListener("click", function () {
        var picker = $("#emoji-picker");
        picker.style.display = picker.style.display === "none" ? "flex" : "none";
      });
    }
    var emojiPicker = $("#emoji-picker");
    if (emojiPicker) emojiPicker.addEventListener("click", onEmojiClick);

    // Music
    var addMusicBtn = $("#add-music-btn");
    if (addMusicBtn) addMusicBtn.addEventListener("click", addMusic);

    var playlist = $("#playlist");
    if (playlist) playlist.addEventListener("click", onPlaylistClick);

    // Timeline
    var addTimelineBtn = $("#add-timeline-btn");
    if (addTimelineBtn) addTimelineBtn.addEventListener("click", addTimeline);

    var timelineList = $("#timeline-list");
    if (timelineList) timelineList.addEventListener("click", onTimelineClick);
  }

  /* ---------- run ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
