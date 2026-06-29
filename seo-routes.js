// Server-side SEO for blog posts — ensures Google sees titles, excerpts, images,
// and BlogPosting schema in the initial HTML (not only after JavaScript runs).
const fs = require('fs');
const path = require('path');
const { postIsPublic, publicPostsFilter } = require('./post-helpers');

function escHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Make a cover URL absolute for crawlers/social cards. Relative /uploads paths are
// resolved against the current host; Cloudinary/external URLs are returned untouched.
function absImg(coverImage, base) {
    if (!coverImage) return '';
    if (/^https?:\/\//i.test(coverImage)) return coverImage;
    return `${base}${coverImage.charAt(0) === '/' ? '' : '/'}${coverImage}`;
}

function postImage(post, base) {
    return absImg(post.coverImage, base) || `${base}/precious-enoch-2.jpg`;
}

function blogPostingSchema(post, base, postUrl) {
    const img = postImage(post, base);
    const desc = (post.excerpt || '').slice(0, 200);
    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: desc,
        image: {
            '@type': 'ImageObject',
            url: img,
            name: post.title,
            caption: post.excerpt || post.title,
            representativeOfPage: true
        },
        datePublished: post.created_at || post.date,
        dateModified: post.created_at || post.date,
        url: postUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
        articleSection: post.category,
        author: { '@type': 'Person', name: post.author || 'Precious C. Enoch, Esq.' },
        publisher: {
            '@type': 'Organization',
            name: 'Enoch & Enoch Legal',
            logo: { '@type': 'ImageObject', url: `${base}/favicon.svg` }
        }
    };
}

function renderPostBody(post) {
    const cover = post.coverImage
        ? `<img src="${escHtml(post.coverImage)}" alt="${escHtml(post.title)}" class="blog-post-cover-image" width="1200" height="630">`
        : '';
    return (
        `<div class="blog-post-header">` +
        cover +
        `<div class="blog-post-meta">` +
        `<span>📅 ${escHtml(post.date)}</span>` +
        `<span>✍️ ${escHtml(post.author)}</span>` +
        `<span>⏱️ ${escHtml(post.read_time || post.readTime || '5 min read')}</span>` +
        `</div>` +
        `<h1>${escHtml(post.title)}</h1>` +
        `<p class="blog-post-excerpt">${escHtml(post.excerpt)}</p>` +
        `</div>` +
        `<div class="blog-post-content">${post.content}</div>` +
        `<div class="author-bio">` +
        `<h3>About the Author</h3>` +
        `<p><strong>Precious C. Enoch, Esq.</strong> is the Principal Partner at Enoch & Enoch Legal, a firm structured to deliver clear, practical, and commercially sound legal solutions. Her practice spans commercial law, insolvency, mediation, debt recovery, and regulatory compliance.</p>` +
        `</div>`
    );
}

function patchPostHead(html, post, base, postUrl) {
    const img = postImage(post, base);
    const desc = (post.excerpt || '').slice(0, 200);
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escHtml(post.title)} - Enoch & Enoch Legal</title>`);
    html = html.replace(
        /<meta name="description" content="[^"]*">/,
        `<meta name="description" content="${escHtml(desc)}">`
    );
    // Replace an existing <meta property|name="key" content="..."> in place, or inject
    // it before </head> if the page doesn't have it. (The old version used CSS-selector
    // brackets in the regex and silently matched nothing, so social tags never updated.)
    function setMetaTag(doc, attr, key, val) {
        const re = new RegExp('(<meta ' + attr + '="' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '" content=")[^"]*(">)');
        if (re.test(doc)) return doc.replace(re, '$1' + escHtml(val) + '$2');
        return doc.replace('</head>', '<meta ' + attr + '="' + key + '" content="' + escHtml(val) + '">\n</head>');
    }
    const meta = [
        ['property', 'og:title', post.title],
        ['property', 'og:description', desc],
        ['property', 'og:url', postUrl],
        ['property', 'og:image', img],
        ['property', 'og:image:secure_url', img],
        ['property', 'og:image:alt', post.title],
        ['name', 'twitter:title', post.title],
        ['name', 'twitter:description', desc],
        ['name', 'twitter:image', img],
        ['name', 'twitter:image:alt', post.title]
    ];
    meta.forEach(([attr, key, val]) => { html = setMetaTag(html, attr, key, val); });
    html = html.replace(
        /<link rel="canonical" href="[^"]*">/,
        `<link rel="canonical" href="${escHtml(postUrl)}">`
    );
    // Article-level Open Graph + keywords injected into the server-rendered head
    const published = post.created_at ? new Date(post.created_at).toISOString() : '';
    const articleMeta =
        (published ? `<meta property="article:published_time" content="${escHtml(published)}">\n` : '') +
        (post.updated_at ? `<meta property="article:modified_time" content="${escHtml(new Date(post.updated_at).toISOString())}">\n` : '') +
        `<meta property="article:author" content="${escHtml(post.author || 'Precious C. Enoch, Esq.')}">\n` +
        `<meta property="article:section" content="${escHtml(post.category || 'Legal Insights')}">\n` +
        `<meta property="article:tag" content="${escHtml(post.category || 'law')}">\n` +
        `<meta name="keywords" content="${escHtml([post.category, 'Enoch & Enoch Legal', 'legal insight', 'Nigeria law', post.title].filter(Boolean).join(', '))}">\n`;
    html = html.replace('</head>', `${articleMeta}</head>`);
    const ld = `<script type="application/ld+json">${JSON.stringify(blogPostingSchema(post, base, postUrl))}</script>`;
    html = html.replace('</head>', `${ld}\n</head>`);
    if (!html.includes('max-image-preview')) {
        html = html.replace('</head>',
            `<meta name="googlebot" content="index, follow, max-image-preview:large">\n` +
            `<meta property="og:locale" content="en_NG">\n</head>`);
    }
    return html;
}

function itemListSchema(posts, base) {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Legal Insights by Enoch & Enoch Legal',
        description: 'Articles on corporate law, compliance, debt recovery, and insolvency.',
        itemListElement: posts.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${base}/blog-post.html?id=${p.id}`,
            name: p.title,
            description: p.excerpt,
            image: p.coverImage ? { '@type': 'ImageObject', url: absImg(p.coverImage, base), name: p.title, caption: p.excerpt } : undefined
        }))
    };
}

function renderBlogIndexExtras(posts, base) {
    const noscript = posts.map(p => {
        const url = `${base}/blog-post.html?id=${p.id}`;
        const img = p.coverImage
            ? `<img src="${escHtml(p.coverImage)}" alt="${escHtml(p.title)}" width="400" height="225">`
            : '';
        return (
            `<li>` +
            `<a href="${escHtml(url)}">` +
            img +
            `<strong>${escHtml(p.title)}</strong>` +
            `<span>${escHtml(p.excerpt)}</span>` +
            `</a></li>`
        );
    }).join('\n');
    const ld = JSON.stringify(itemListSchema(posts, base));
    return {
        head: `<link rel="alternate" type="application/rss+xml" title="Enoch &amp; Enoch Legal Blog" href="${base}/feed.xml">` +
            `<script type="application/ld+json">${ld}</script>`,
        body: `<noscript class="seo-post-index"><h2>Legal Insights</h2><ul>${noscript}</ul></noscript>`
    };
}

function patchStaticPageSeo(html, base, pagePath) {
    const url = base + pagePath;
    html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${escHtml(url)}">`);
    html = html.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${escHtml(url)}">`);
    html = html.replace(/content="(precious-enoch-2\.jpg)"/g, `content="${escHtml(base + '/precious-enoch-2.jpg')}"`);
    html = html.replace(/content="(favicon\.svg)"/g, `content="${escHtml(base + '/favicon.svg')}"`);
    if (!html.includes('max-image-preview')) {
        html = html.replace('</head>',
            `<meta name="googlebot" content="index, follow, max-image-preview:large">\n` +
            `<meta property="og:locale" content="en_NG">\n</head>`);
    }
    return html;
}

function sendStaticPage(res, root, base, file, pagePath) {
    let html = fs.readFileSync(path.join(root, file), 'utf8');
    html = patchStaticPageSeo(html, base, pagePath);
    res.type('html').send(html);
}

function registerSeoRoutes(app, ctx) {
    const root = ctx.rootDir;

    async function getPosts() {
        if (!ctx.isConnected() || !ctx.postsCollection()) return [];
        const rows = await ctx.postsCollection().find(publicPostsFilter(), {
            projection: { id: 1, title: 1, excerpt: 1, content: 1, category: 1, author: 1, date: 1, read_time: 1, readTime: 1, coverImage: 1, created_at: 1, publishAt: 1, status: 1 }
        }).sort({ id: -1 }).toArray();
        return rows.filter(p => postIsPublic(p));
    }

    async function sendBlogPost(req, res, id) {
        let html = fs.readFileSync(path.join(root, 'blog-post.html'), 'utf8');
        const base = ctx.siteBase(req);
        const postUrl = `${base}/blog-post.html?id=${id}`;

        if (id && ctx.isConnected() && ctx.postsCollection()) {
            const post = await ctx.postsCollection().findOne({ id: parseInt(id, 10) });
            if (post) {
                html = patchPostHead(html, post, base, postUrl);
                const body = renderPostBody(post);
                html = html.replace(
                    /<div id="postContent">[\s\S]*?<\/div>(\s*\n\s*<\/article>)/,
                    `<div id="postContent" data-server-rendered="1">${body}</div>$1`
                );
            }
        }
        res.type('html').send(html);
    }

    app.get('/blog-post.html', (req, res) => sendBlogPost(req, res, req.query.id));
    app.get('/insights/:id', (req, res) => sendBlogPost(req, res, req.params.id));

    app.get(['/blog.html', '/insights'], async (req, res) => {
        let html = fs.readFileSync(path.join(root, 'blog.html'), 'utf8');
        const base = ctx.siteBase(req);
        const pagePath = req.path === '/insights' ? '/insights' : '/blog.html';
        html = patchStaticPageSeo(html, base, pagePath);
        try {
            const posts = await getPosts();
            if (posts.length) {
                const extras = renderBlogIndexExtras(posts, base);
                html = html.replace('</head>', `${extras.head}\n</head>`);
                html = html.replace('<div id="blogList">', `${extras.body}\n            <div id="blogList">`);
            }
        } catch (e) {
            console.log('⚠️ blog SEO inject skipped:', e.message);
        }
        res.type('html').send(html);
    });

    app.get('/feed.xml', async (req, res) => {
        const base = ctx.siteBase(req);
        const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        let items = '';
        try {
            const posts = await getPosts();
            items = posts.map(p => {
                const link = `${base}/blog-post.html?id=${p.id}`;
                const pub = p.created_at ? new Date(p.created_at).toUTCString() : new Date().toUTCString();
                const media = p.coverImage
                    ? `\n      <media:content url="${esc(absImg(p.coverImage, base))}" medium="image">\n        <media:title>${esc(p.title)}</media:title>\n        <media:description>${esc(p.excerpt)}</media:description>\n      </media:content>`
                    : '';
                return (
                    `    <item>\n` +
                    `      <title>${esc(p.title)}</title>\n` +
                    `      <link>${esc(link)}</link>\n` +
                    `      <guid isPermaLink="true">${esc(link)}</guid>\n` +
                    `      <pubDate>${pub}</pubDate>\n` +
                    `      <description>${esc(p.excerpt)}</description>${media}\n` +
                    `    </item>`
                );
            }).join('\n');
        } catch (e) {
            console.log('⚠️ feed.xml:', e.message);
        }
        res.type('application/xml').send(
            `<?xml version="1.0" encoding="UTF-8"?>\n` +
            `<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">\n` +
            `<channel>\n` +
            `  <title>Enoch &amp; Enoch Legal — Legal Insights</title>\n` +
            `  <link>${esc(base)}/insights</link>\n` +
            `  <description>Articles on corporate law, compliance, debt recovery, and insolvency by Precious C. Enoch, Esq.</description>\n` +
            `  <language>en-ng</language>\n` +
            items +
            `\n</channel>\n</rss>\n`
        );
    });

    // Static pages — server-side canonical + social URLs for Google (no hard-coded domain)
    app.get('/', (req, res) => sendStaticPage(res, root, ctx.siteBase(req), 'index.html', '/'));
    app.get('/about', (req, res) => sendStaticPage(res, root, ctx.siteBase(req), 'about.html', '/about'));
    app.get('/practice', (req, res) => sendStaticPage(res, root, ctx.siteBase(req), 'practice.html', '/practice'));
    app.get('/contact', (req, res) => sendStaticPage(res, root, ctx.siteBase(req), 'contact.html', '/contact'));
}

module.exports = { registerSeoRoutes, escHtml, postImage };
