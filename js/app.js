const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxVfcaexxiBC1ofphglrPsQ1W2tDAumIb8FyAjEwi_ao0VlUrZB04EW5UY2HkWLUjQ3RQ/exec"; 

const PASSWORD_ANGGOTA = "pejuang2026";
const PASSWORD_DEVELOPER = "devpejuang";

let cachedFiles = [];
let selectedRole = 'anggota'; // Default role pas pertama buka

document.addEventListener("DOMContentLoaded", () => {
    checkActiveSession();
});

// Mengatur pergantian tab login Anggota vs Developer
function setRoleLogin(role) {
    selectedRole = role;
    const tabAnggota = document.getElementById('tab-anggota');
    const tabDev = document.getElementById('tab-developer');
    const passLabel = document.getElementById('pass-label');
    
    if (role === 'developer') {
        tabDev.style.background = 'var(--accent)';
        tabDev.style.color = '#090D16';
        tabDev.style.fontWeight = '700';
        tabAnggota.style.background = 'transparent';
        tabAnggota.style.color = 'var(--text-muted)';
        tabAnggota.style.fontWeight = '600';
        passLabel.textContent = 'Password Developer';
    } else {
        tabAnggota.style.background = 'var(--accent)';
        tabAnggota.style.color = '#090D16';
        tabAnggota.style.fontWeight = '700';
        tabDev.style.background = 'transparent';
        tabDev.style.color = 'var(--text-muted)';
        tabDev.style.fontWeight = '600';
        passLabel.textContent = 'Password Anggota';
    }
}

function handleAuthGate() {
    const name = document.getElementById("gate-name").value.trim();
    const password = document.getElementById("gate-password").value.trim();

    if (!name || !password) {
        alert("Mohon isi nama dan password terlebih dahulu!");
        return;
    }

    if (selectedRole === 'developer') {
        if (password === PASSWORD_DEVELOPER) {
            localStorage.setItem("utbk_role", "developer");
        } else {
            alert("Password Developer Salah!");
            return;
        }
    } else {
        if (password === PASSWORD_ANGGOTA) {
            localStorage.setItem("utbk_role", "anggota");
        } else {
            alert("Password Anggota Salah!");
            return;
        }
    }

    localStorage.setItem("utbk_user_name", name);
    checkActiveSession();
}

function checkActiveSession() {
    const savedName = localStorage.getItem("utbk_user_name");
    const role = localStorage.getItem("utbk_role");

    if (savedName && role) {
        document.getElementById("view-gate").classList.add("hidden");
        document.getElementById("main-header").classList.remove("hidden");
        document.getElementById("main-nav").classList.remove("hidden");
        
        document.getElementById("user-greeting").textContent = `Halo, ${savedName}!`;
        
        // Penyesuaian teks status di bawah nama berdasarkan peran akun
        const subTitle = document.getElementById("user-target");
        if (role === "developer") {
            subTitle.textContent = "Mode Akses: Console Developer Aktif";
            document.getElementById("nav-admin").classList.remove("hidden");
        } else {
            subTitle.textContent = "Mode Akses: Anggota Belajar Kelompok";
            document.getElementById("nav-admin").classList.add("hidden");
        }

        switchView('dashboard');
        fetchDataFromDrive();
    } else {
        document.getElementById("view-gate").classList.remove("hidden");
        document.getElementById("main-header").classList.add("hidden");
        document.getElementById("main-nav").classList.add("hidden");
    }
}

function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    const targetNav = document.getElementById(`nav-${viewName}`);
    if (targetNav) targetNav.classList.add('active');
    
    if (viewName === 'dashboard') calculateGlobalProgress();
    if (viewName === 'diskusi') fetchChatForum();
}

async function fetchDataFromDrive() {
    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes("...")) return;
    try {
        const response = await fetch(`${GAS_WEB_APP_URL}?action=getFiles`);
        cachedFiles = await response.json();
        calculateGlobalProgress();
    } catch (error) {
        console.error("Gagal sinkronisasi file Drive:", error);
    }
}

function openCategory(key, fullName) {
    switchView('category');
    document.getElementById("category-title").textContent = fullName;
    const container = document.getElementById("material-list");
    container.innerHTML = `<div class="loader">Memindai folder subtes '${key}' di Drive...</div>`;
    
    // PERBAIKAN 1: Ganti f.category menjadi f.folder agar cocok dengan data Drive
    const filtered = cachedFiles.filter(f => f.folder === key);
    if(filtered.length === 0) {
        container.innerHTML = `<div class="loader">Folder '${key}' kosong atau tidak ditemukan di Drive.</div>`;
        return;
    }
    
    container.innerHTML = "";
    const username = localStorage.getItem("utbk_user_name") || "default";

    filtered.forEach(file => {
        const isRead = localStorage.getItem(`read_${username}_${file.url}`) === 'true';
        
        // PERBAIKAN 2: Beri antisipasi jika file.date belum dikirim dari backend
        const tanggalArsip = file.date ? new Date(file.date).toLocaleDateString('id-ID') : 'Baru';

        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-meta">
                <h4>${file.name}</h4>
                <p>Arsip Masuk: ${tanggalArsip}</p>
            </div>
            <div class="item-actions">
                <label class="checkbox-label">
                    <input type="checkbox" onchange="toggleRead('${file.url}')" ${isRead ? 'checked' : ''}> Selesai Pelajari
                </label>
                <button class="btn-open" onclick="viewFileDirectly('${file.url}', '${file.name.replace(/'/g, "\\'")}')">Buka File</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function calculateGlobalProgress() {
    if (cachedFiles.length === 0) return;
    const username = localStorage.getItem("utbk_user_name") || "default";
    let reads = 0;
    cachedFiles.forEach(f => { 
        if(localStorage.getItem(`read_${username}_${f.url}`) === 'true') reads++; 
    });
    const percent = Math.round((reads / cachedFiles.length) * 100) || 0;
    document.getElementById("progress-text").textContent = `${percent}% Selesai`;
    document.getElementById("progress-bar").style.width = `${percent}%`;
}

// LOGIKA UTAMA FITUR CHAT INTERNAL
async function fetchChatForum() {
    const display = document.getElementById("chat-box-display");
    display.innerHTML = `<div class="loader">Memuat obrolan...</div>`;
    try {
        const res = await fetch(`${GAS_WEB_APP_URL}?action=getChat`);
        const chats = await res.json();
        display.innerHTML = "";
        
        if(chats.length === 0) {
            display.innerHTML = `<div style="text-align:center;color:var(--text-muted);font-size:12px;margin:auto 0;">Belum ada diskusi dimulai.</div>`;
            return;
        }

        chats.forEach(chat => {
            const bubble = document.createElement('div');
            bubble.style.cssText = "background:var(--bg-surface-elevated); padding:10px 14px; border-radius:12px; border:1px solid var(--border); max-width:85%; align-self:flex-start;";
            bubble.innerHTML = `
                <div style="font-size:11px; font-weight:700; color:var(--accent); display:flex; gap:6px;">
                    <span>${chat.name}</span>
                </div>
                <p style="font-size:13px; color:var(--text-main); margin-top:4px; word-break:break-word;">${chat.message}</p>
                <div style="font-size:9px; color:var(--text-muted); text-align:right; margin-top:2px;">${chat.timestamp}</div>
            `;
            display.appendChild(bubble);
        });
    } catch(err) {
        display.innerHTML = `<div class="loader">Gagal memuat chat.</div>`;
    }
}

async function submitChat() {
    const input = document.getElementById("chat-message-input");
    const msg = input.value.trim();
    if(!msg) return;

    const payload = {
        action: "sendChat",
        name: localStorage.getItem("utbk_user_name"),
        target: "User",
        message: msg
    };

    input.value = "";
    fetchChatForum(); 

    await fetch(GAS_WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) });
    fetchChatForum();
}

function viewFileDirectly(url, name) {
    let previewUrl = url.includes("/view") ? url.replace("/view", "/preview") : url;
    document.getElementById("modal-file-title").textContent = name;
    document.getElementById("viewer-frame").src = previewUrl;
    document.getElementById("video-viewer-modal").classList.remove("hidden");
}

function closeModalViewer() {
    document.getElementById("video-viewer-modal").classList.add("hidden");
    document.getElementById("viewer-frame").src = "";
}

function executeUpload() {
    const fileInput = document.getElementById("file-picker");
    const category = document.getElementById("upload-category").value;
    const statusDiv = document.getElementById("upload-status");
    const btn = document.getElementById("btn-upload-exec");

    if (fileInput.files.length === 0) {
        alert("Silakan pilih file!");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    btn.disabled = true;
    statusDiv.textContent = "Mengunggah berkas ke folder Drive...";

    reader.onload = function(e) {
        const base64Data = e.target.result.split(',')[1];
        const payload = {
            filename: file.name,
            mimeType: file.type,
            categoryKey: category,
            fileData: base64Data
        };

        fetch(GAS_WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(() => {
            statusDiv.textContent = "Sukses diunggah ke sub-folder Drive!";
            fileInput.value = "";
            btn.disabled = false;
            fetchDataFromDrive();
        })
        .catch(() => {
            statusDiv.textContent = "Sinkronisasi selesai.";
            btn.disabled = false;
            fileInput.value = "";
            fetchDataFromDrive();
        });
    };
    reader.readAsDataURL(file);
}

// LOGOUT CERDAS: Menghapus sesi login, tapi membiarkan data progres di komputer tetap aman
function logout() {
    localStorage.removeItem("utbk_user_name");
    localStorage.removeItem("utbk_role");
    checkActiveSession();
}