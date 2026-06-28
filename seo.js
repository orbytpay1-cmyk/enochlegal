// SEO helper — runs on every public page.
// 1) Host-aware canonical + og:url (backup for any static-served pages)
// 2) Absolutises social-share images + alt tags
// 3) Sitewide LegalService + WebSite JSON-LD
(function () {
  var base = location.origin;
  var url = base + location.pathname + location.search;

  var can = document.head.querySelector('link[rel="canonical"]');
  if (!can) { can = document.createElement('link'); can.rel = 'canonical'; document.head.appendChild(can); }
  can.href = url;

  var ogUrl = document.head.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', url);

  if (!document.head.querySelector('meta[property="og:locale"]')) {
    var loc = document.createElement('meta');
    loc.setAttribute('property', 'og:locale');
    loc.setAttribute('content', 'en_NG');
    document.head.appendChild(loc);
  }

  ['meta[property="og:image"]', 'meta[name="twitter:image"]'].forEach(function (sel) {
    var el = document.head.querySelector(sel);
    if (el) {
      var c = el.getAttribute('content') || '';
      if (c && !/^https?:\/\//.test(c)) el.setAttribute('content', base + '/' + c.replace(/^\//, ''));
    }
  });

  var ogAlt = document.head.querySelector('meta[property="og:image:alt"]');
  if (ogAlt && !document.head.querySelector('meta[name="twitter:image:alt"]')) {
    var twAlt = document.createElement('meta');
    twAlt.setAttribute('name', 'twitter:image:alt');
    twAlt.setAttribute('content', ogAlt.getAttribute('content') || '');
    document.head.appendChild(twAlt);
  }

  var partnerImg = base + '/precious-enoch-2.jpg';
  var ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LegalService",
        "@id": base + "/#firm",
        "name": "Enoch & Enoch Legal",
        "url": base + "/",
        "description": "Corporate and compliance law firm in Lagos, Nigeria, advising businesses on corporate law, regulatory compliance, debt recovery, and insolvency.",
        "areaServed": { "@type": "Country", "name": "Nigeria" },
        "telephone": "+2348131539182",
        "email": "info@enochlegal.com",
        "foundingDate": "2024",
        "address": { "@type": "PostalAddress", "addressLocality": "Lagos", "addressCountry": "NG" },
        "founder": { "@type": "Person", "name": "Precious C. Enoch, Esq.", "jobTitle": "Principal Partner" },
        "knowsAbout": ["Corporate Law", "Regulatory Compliance", "Debt Recovery", "Insolvency & Restructuring", "Commercial Law"],
        "image": {
          "@type": "ImageObject",
          "url": partnerImg,
          "name": "Precious C. Enoch, Esq.",
          "caption": "Precious C. Enoch, Esq., Principal Partner at Enoch & Enoch Legal, Lagos, Nigeria."
        },
        "logo": { "@type": "ImageObject", "url": base + "/favicon.svg" },
        "priceRange": "$$"
      },
      {
        "@type": "WebSite",
        "@id": base + "/#website",
        "url": base + "/",
        "name": "Enoch & Enoch Legal",
        "inLanguage": "en-NG",
        "publisher": { "@id": base + "/#firm" }
      }
    ]
  };
  var s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
})();
