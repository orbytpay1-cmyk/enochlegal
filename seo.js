// SEO helper — runs on every page.
// 1) Makes canonical + og:url host-aware so they are correct on the Railway URL,
//    a custom domain, or localhost with zero hard-coded URLs.
// 2) Absolutises social-share images.
// 3) Injects sitewide LegalService + WebSite structured data (JSON-LD).
// Per-post BlogPosting data is added separately by blog-post.html.
(function () {
  var base = location.origin;
  var url = base + location.pathname + location.search;

  // Canonical
  var can = document.head.querySelector('link[rel="canonical"]');
  if (!can) { can = document.createElement('link'); can.rel = 'canonical'; document.head.appendChild(can); }
  can.href = url;

  // og:url
  var ogUrl = document.head.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', url);

  // Absolutise share images (so previews work when shared)
  ['meta[property="og:image"]', 'meta[name="twitter:image"]'].forEach(function (sel) {
    var el = document.head.querySelector(sel);
    if (el) {
      var c = el.getAttribute('content') || '';
      if (c && !/^https?:\/\//.test(c)) el.setAttribute('content', base + '/' + c.replace(/^\//, ''));
    }
  });

  // Sitewide structured data
  var ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LegalService",
        "@id": base + "/#firm",
        "name": "Enoch & Enoch Legal",
        "url": base + "/",
        "description": "Corporate and compliance law firm in Lagos, Nigeria, advising businesses on corporate law, regulatory compliance, debt recovery, and insolvency.",
        "areaServed": "NG",
        "telephone": "+2348131539182",
        "email": "info@enochlegal.com",
        "foundingDate": "2024",
        "address": { "@type": "PostalAddress", "addressLocality": "Lagos", "addressCountry": "NG" },
        "founder": { "@type": "Person", "name": "Precious C. Enoch, Esq.", "jobTitle": "Principal Partner" },
        "knowsAbout": ["Corporate Law", "Regulatory Compliance", "Debt Recovery", "Insolvency & Restructuring", "Commercial Law"],
        "image": base + "/precious-enoch-2.jpg",
        "logo": base + "/favicon.svg",
        "priceRange": "$$"
      },
      {
        "@type": "WebSite",
        "@id": base + "/#website",
        "url": base + "/",
        "name": "Enoch & Enoch Legal",
        "publisher": { "@id": base + "/#firm" }
      }
    ]
  };
  var s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
})();
