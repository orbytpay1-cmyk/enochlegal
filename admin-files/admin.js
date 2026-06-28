// Same-origin: admin panel is served by the same Express server as the API.
const API_URL = '';
const TOKEN_KEY = 'eel_admin_token';

// ---- Token helpers ------------------------------------------------------------
function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
function setToken(t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {} }
function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
function authHeaders(extra) {
    const h = Object.assign({}, extra || {});
    const t = getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
}
function handleUnauthorized() { clearToken(); showLogin(); }

// ---- Auth flow ----------------------------------------------------------------
async function checkAuth() {
    const t = getToken();
    if (!t) return showLogin();
    try {
        const r = await fetch(`${API_URL}/api/admin/verify`, { headers: authHeaders() });
        if (r.ok) showDashboard(); else handleUnauthorized();
    } catch (e) { showLogin(); }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('loginError');
    try {
        const r = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await r.json().catch(() => ({}));
        if (r.ok && data.token) {
            setToken(data.token);
            showDashboard();
        } else {
            errorDiv.textContent = data.error || 'Invalid access code';
            errorDiv.classList.add('show');
            setTimeout(() => errorDiv.classList.remove('show'), 3000);
        }
    } catch (err) {
        errorDiv.textContent = 'Could not reach the server. Please try again.';
        errorDiv.classList.add('show');
        setTimeout(() => errorDiv.classList.remove('show'), 3000);
    }
});

function showLogin() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('dashboard').classList.remove('active');
    stopAnalytics();
}
function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    loadBlogPosts();
    startAnalytics();
}
function logout() {
    clearToken();
    location.reload();
}

// ---- Tabs ---------------------------------------------------------------------
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');

    if (tabName === 'manage-posts') loadBlogPosts();
    else if (tabName === 'messages') loadMessages();
    else if (tabName === 'analytics') refreshAnalytics();
}

// ============================================================
//  ANALYTICS — live viewers + visitor stats (auto-refreshing)
// ============================================================
let analyticsTimer = null;

function startAnalytics() {
    refreshAnalytics();
    if (analyticsTimer) clearInterval(analyticsTimer);
    analyticsTimer = setInterval(refreshAnalytics, 4000); // real-time feel
}
function stopAnalytics() {
    if (analyticsTimer) { clearInterval(analyticsTimer); analyticsTimer = null; }
}

function fmtDuration(ms) {
    ms = Math.max(0, ms || 0);
    const s = Math.round(ms / 1000);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60), rs = s % 60;
    if (m < 60) return m + 'm ' + rs + 's';
    const h = Math.floor(m / 60), rm = m % 60;
    return h + 'h ' + rm + 'm';
}
function timeAgo(date) {
    if (!date) return '—';
    const diff = Date.now() - new Date(date).getTime();
    const s = Math.round(diff / 1000);
    if (s < 10) return 'just now';
    if (s < 60) return s + 's ago';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
}
function prettyPage(p) {
    if (!p) return '/';
    const map = { '/': 'Home', '/about': 'About', '/practice': 'Practice Areas', '/contact': 'Contact', '/blog.html': 'Blog' };
    if (map[p]) return map[p];
    if (p.indexOf('/blog-post.html') === 0) return 'Article';
    return p;
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function num(n) { return (n || 0).toLocaleString(); }

async function refreshAnalytics() {
    try {
        const r = await fetch(`${API_URL}/api/admin/analytics`, { headers: authHeaders() });
        if (r.status === 401) return handleUnauthorized();
        if (!r.ok) return;
        const d = await r.json();

        // Header + stat cards
        setText('headLive', (d.liveNow || 0) + ' live now');
        setText('statLive', num(d.liveNow));
        setText('statVisitors', num(d.totalVisitors));
        setText('statToday', num(d.today));
        setText('statViews', num(d.totalPageviews));
        setText('statAvgTime', fmtDuration(d.avgTimeMs));

        renderLive(d.live || []);
        renderTopPages(d.topPages || []);
        renderRecent(d.recent || []);
    } catch (e) { /* keep last view on transient errors */ }
}
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

function renderLive(live) {
    const el = document.getElementById('liveList');
    if (!el) return;
    if (!live.length) { el.innerHTML = '<li class="muted-note">No visitors on the site right now.</li>'; return; }
    el.innerHTML = live.map(v => `
        <li class="live-item">
            <div class="live-avatar">${esc((v.id || '?').slice(0, 2).toUpperCase())}</div>
            <div class="live-meta">
                <div class="lm-page">${esc(prettyPage(v.page))} <span class="pill-live">LIVE</span></div>
                <div class="lm-sub">${esc((v.device && v.device.type) || 'Device')} · ${esc((v.device && v.device.browser) || '')} · ${esc(v.referrer || 'direct')}</div>
            </div>
            <div class="live-time">${fmtDuration(v.totalMs)}</div>
        </li>
    `).join('');
}
function renderTopPages(pages) {
    const el = document.getElementById('topPages');
    if (!el) return;
    if (!pages.length) { el.innerHTML = '<li class="muted-note">No data yet.</li>'; return; }
    const max = Math.max.apply(null, pages.map(p => p.visitors));
    el.innerHTML = pages.map(p => `
        <li class="top-page-row">
            <span class="tp-path">${esc(prettyPage(p.path))}</span>
            <span class="tp-count">${num(p.visitors)}</span>
        </li>
    `).join('');
}
function renderRecent(rows) {
    const el = document.getElementById('recentVisitors');
    if (!el) return;
    if (!rows.length) { el.innerHTML = '<tr><td colspan="7" class="muted-note">No visitors recorded yet.</td></tr>'; return; }
    el.innerHTML = rows.map(v => `
        <tr>
            <td>${esc(v.id)} ${v.live ? '<span class="tag dot-live">live</span>' : ''}</td>
            <td>${esc(prettyPage(v.page))}</td>
            <td>${num(v.pageviews)}</td>
            <td><strong>${fmtDuration(v.totalMs)}</strong></td>
            <td><span class="tag">${esc((v.device && v.device.type) || '—')} · ${esc((v.device && v.device.os) || '')}</span></td>
            <td>${esc(v.referrer || 'direct')}</td>
            <td>${timeAgo(v.lastSeen)}</td>
        </tr>
    `).join('');
}

// ============================================================
//  BLOG POSTS
// ============================================================
function insertTag(tag) {
    const textarea = document.getElementById('postContent');
    const start = textarea.selectionStart, end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let insertion = '';
    switch (tag) {
        case 'h2': insertion = `<h2>${selectedText || 'Heading'}</h2>\n`; break;
        case 'h3': insertion = `<h3>${selectedText || 'Subheading'}</h3>\n`; break;
        case 'p': insertion = `<p>${selectedText || 'Your paragraph text here'}</p>\n`; break;
        case 'ul': insertion = `<ul>\n    <li>${selectedText || 'List item 1'}</li>\n    <li>List item 2</li>\n</ul>\n`; break;
        case 'blockquote': insertion = `<blockquote>\n    "${selectedText || 'Your quote here'}"\n</blockquote>\n`; break;
    }
    textarea.value = textarea.value.substring(0, start) + insertion + textarea.value.substring(end);
    textarea.focus();
}

function textToHtml(text) {
    const paragraphs = text.split(/\n\n+/);
    let html = '';
    paragraphs.forEach(para => {
        para = para.trim();
        if (!para) return;
        if (para.length < 60 && !para.match(/[.!?]$/)) html += `<h2>${para}</h2>\n`;
        else html += `<p>${para}</p>\n`;
    });
    return html;
}

document.getElementById('newPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const contentHtml = textToHtml(document.getElementById('postContent').value);
    let coverImageUrl = null;

    const imageFile = document.getElementById('postCoverImage').files[0];
    if (imageFile) {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            const uploadResponse = await fetch(`${API_URL}/api/upload-image`, {
                method: 'POST', headers: authHeaders(), body: formData
            });
            if (uploadResponse.status === 401) return handleUnauthorized();
            if (uploadResponse.ok) {
                coverImageUrl = (await uploadResponse.json()).url;
            } else {
                alert('Failed to upload cover image. Continuing without image...');
            }
        } catch (error) {
            alert('Error uploading image. Continuing without image...');
        }
    }

    const newPost = {
        title: document.getElementById('postTitle').value,
        excerpt: document.getElementById('postExcerpt').value,
        content: contentHtml,
        readTime: document.getElementById('postReadTime').value,
        category: document.getElementById('postCategory').value,
        featured: document.getElementById('postFeatured').checked,
        icon: document.getElementById('postIcon').value,
        coverImage: coverImageUrl
    };

    try {
        const response = await fetch(`${API_URL}/api/posts`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(newPost)
        });
        if (response.status === 401) return handleUnauthorized();
        if (response.ok) {
            const successMsg = document.getElementById('successMessage');
            successMsg.textContent = '✅ Blog post published successfully!';
            successMsg.classList.add('show');
            document.getElementById('newPostForm').reset();
            document.getElementById('uploadPlaceholder').style.display = 'block';
            document.getElementById('imagePreview').style.display = 'none';
            setTimeout(() => successMsg.classList.remove('show'), 5000);
            loadBlogPosts();
        } else {
            let msg = 'Unknown error';
            try { const ed = await response.json(); msg = ed.error || ed.message || JSON.stringify(ed); } catch (e) {}
            alert('❌ Error publishing post: ' + msg);
        }
    } catch (error) {
        alert('❌ Error connecting to server: ' + error.message);
    }
});

// Image preview + drag/drop
document.getElementById('postCoverImage').addEventListener('change', function (e) {
    const file = e.target.files[0]; if (file) displayImagePreview(file);
});
const uploadArea = document.getElementById('imageUploadArea');
const fileInput = document.getElementById('postCoverImage');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');
uploadArea.addEventListener('click', (e) => {
    if (e.target.id !== 'removeImageBtn' && !e.target.closest('#removeImageBtn')) fileInput.click();
});
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
    uploadArea.addEventListener(ev, preventDefaults, false);
    document.body.addEventListener(ev, preventDefaults, false);
});
function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
['dragenter', 'dragover'].forEach(ev => uploadArea.addEventListener(ev, () => uploadArea.classList.add('drag-over'), false));
['dragleave', 'drop'].forEach(ev => uploadArea.addEventListener(ev, () => uploadArea.classList.remove('drag-over'), false));
uploadArea.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) { fileInput.files = files; displayImagePreview(file); }
        else alert('Please upload an image file (JPG, PNG, or WebP)');
    }
});
removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation(); fileInput.value = '';
    uploadPlaceholder.style.display = 'block'; imagePreview.style.display = 'none';
});
function displayImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        document.getElementById('previewImg').src = e.target.result;
        uploadPlaceholder.style.display = 'none'; imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function loadBlogPosts() {
    const blogList = document.getElementById('blogList');
    try {
        const response = await fetch(`${API_URL}/api/posts`);
        if (!response.ok) { blogList.innerHTML = '<p class="muted-note">Error loading posts.</p>'; return; }
        const posts = await response.json();
        if (!posts.length) { blogList.innerHTML = '<p class="muted-note">No blog posts yet. Create your first post!</p>'; return; }

        const categories = {
            'corporate': { name: 'Corporate Law', posts: [] },
            'compliance': { name: 'Compliance', posts: [] },
            'insolvency': { name: 'Insolvency', posts: [] },
            'debt-recovery': { name: 'Debt Recovery', posts: [] }
        };
        posts.forEach(post => { if (categories[post.category]) categories[post.category].posts.push(post); });

        let html = '';
        Object.keys(categories).forEach(catKey => {
            const cat = categories[catKey];
            if (cat.posts.length > 0) {
                html += `
                    <div class="category-section">
                        <div class="category-header" onclick="toggleCategory('${catKey}')">
                            <h3>${cat.name}</h3>
                            <span class="category-count">${cat.posts.length} article${cat.posts.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div id="category-${catKey}" class="category-posts">
                            ${cat.posts.map(post => `
                                <div class="blog-item" style="margin-bottom:15px;">
                                    <div class="blog-item-content">
                                        ${post.coverImage ? `<img src="${esc(post.coverImage)}" alt="${esc(post.title)}" style="width:100%; max-width:200px; border-radius:8px; margin-bottom:10px;">` : ''}
                                        <h3>${esc(post.title)}</h3>
                                        <div class="blog-item-meta">${esc(post.date)} • ${esc(post.read_time || post.readTime || '')} ${post.featured ? '• <strong style="color:#ad8838;">FEATURED</strong>' : ''}</div>
                                        <p style="color:#6b7488; margin-top:10px;">${esc(post.excerpt)}</p>
                                    </div>
                                    <div class="blog-item-actions">
                                        <button class="btn-small btn-delete" onclick="deletePostById(${post.id})">Delete</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
            }
        });
        blogList.innerHTML = html || '<p class="muted-note">No blog posts yet. Create your first post!</p>';
    } catch (error) {
        blogList.innerHTML = '<p class="muted-note">Error loading posts.</p>';
    }
}
function toggleCategory(categoryKey) {
    document.getElementById(`category-${categoryKey}`).classList.toggle('active');
}
async function deletePostById(id) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
        const response = await fetch(`${API_URL}/api/posts/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (response.status === 401) return handleUnauthorized();
        if (response.ok) { loadBlogPosts(); }
        else alert('Error deleting post. Please try again.');
    } catch (error) { alert('Error connecting to server.'); }
}

// ============================================================
//  MESSAGES
// ============================================================
async function loadMessages() {
    const messagesList = document.getElementById('messagesList');
    try {
        const response = await fetch(`${API_URL}/api/messages`, { headers: authHeaders() });
        if (response.status === 401) return handleUnauthorized();
        if (!response.ok) { messagesList.innerHTML = '<p class="muted-note">Error loading messages.</p>'; return; }
        const messages = await response.json();
        if (!messages.length) {
            messagesList.innerHTML = `<div class="no-messages"><div class="no-messages-icon">📭</div><h3>No messages yet</h3><p>Contact form submissions will appear here</p></div>`;
            return;
        }
        const unreadCount = messages.filter(m => !m.read).length;
        const badge = document.getElementById('unreadBadge');
        if (unreadCount > 0) { badge.textContent = unreadCount; badge.style.display = 'inline-block'; }
        else badge.style.display = 'none';

        messagesList.innerHTML = messages.map(msg => `
            <div class="message-item ${msg.read ? '' : 'unread'}">
                <div class="message-header">
                    <div class="message-info">
                        <h3>${esc(msg.name)}</h3>
                        <div class="message-meta">
                            <span>📧 ${esc(msg.email)}</span>
                            <span>📅 ${new Date(msg.date).toLocaleString()}</span>
                            ${!msg.read ? '<span style="color:#e0a800; font-weight:600;">● NEW</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="message-subject">Subject: ${esc(msg.subject)}</div>
                <div class="message-body">${esc(msg.message)}</div>
                <div class="message-actions">
                    <a href="mailto:${esc(msg.email)}?subject=Re: ${encodeURIComponent(msg.subject)}" class="btn-small btn-reply">Reply via Email</a>
                    ${!msg.read ? `<button class="btn-small btn-mark-read" onclick="markAsRead(${msg.id})">Mark as Read</button>` : ''}
                    <button class="btn-small btn-delete" onclick="deleteMessage(${msg.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        messagesList.innerHTML = '<p class="muted-note">Error loading messages.</p>';
    }
}
async function markAsRead(id) {
    try {
        const response = await fetch(`${API_URL}/api/messages/${id}/read`, { method: 'PATCH', headers: authHeaders() });
        if (response.status === 401) return handleUnauthorized();
        if (response.ok) loadMessages(); else alert('Error marking message as read.');
    } catch (error) { alert('Error connecting to server.'); }
}
async function deleteMessage(id) {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
        const response = await fetch(`${API_URL}/api/messages/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (response.status === 401) return handleUnauthorized();
        if (response.ok) loadMessages(); else alert('Error deleting message.');
    } catch (error) { alert('Error connecting to server.'); }
}

// Auto-refresh messages every 30s when on that tab
setInterval(() => {
    const messagesTab = document.getElementById('messages');
    if (messagesTab && messagesTab.classList.contains('active')) loadMessages();
}, 30000);

// Init
checkAuth();
