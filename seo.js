// SEO helper — runs on every public page. Injects a comprehensive set of meta tags
// + JSON-LD structured data (host-aware, so it is correct on Netlify, a custom
// domain, or the Railway server). Nothing here overwrites tags a page already sets;
// it only ADDS what is missing.
//
// 👉 Firm facts live in one place (FIRM below) — edit them once if anything changes.
(function () {
  try {
    var base = location.origin;
    var url = base + location.pathname + location.search;

    var FIRM = {
      name: 'Enoch & Enoch Legal',
      legalName: 'Enoch & Enoch Legal',
      phone: '+2348131539182',
      email: 'info@enochlegal.com',
      whatsapp: 'https://wa.me/2348131539182',
      locality: 'Lagos',
      region: 'Lagos',
      regionCode: 'NG-LA',
      country: 'NG',
      lat: 6.5244,           // Lagos (city-level)
      lng: 3.3792,
      founderName: 'Precious C. Enoch, Esq.',
      founderJob: 'Principal Partner',
      themeColor: '#15294f',
      keywords: 'Enoch & Enoch Legal, corporate law firm Lagos, corporate lawyer Nigeria, ' +
        'regulatory compliance, debt recovery lawyer, insolvency and restructuring, ' +
        'commercial law, contract drafting, business law Nigeria, Precious Enoch lawyer',
      services: [
        'Corporate Law', 'Regulatory Compliance', 'Debt Recovery', 'Insolvency & Restructuring'
      ]
    };
    var partnerImg = base + '/precious-enoch-2.jpg';

    // ---- helpers --------------------------------------------------------------
    function metaBy(attr, key, content) {
      if (!content) return;
      if (document.head.querySelector('meta[' + attr + '="' + key + '"]')) return;
      var m = document.createElement('meta');
      m.setAttribute(attr, key);
      m.setAttribute('content', content);
      document.head.appendChild(m);
    }
    var name = function (k, c) { metaBy('name', k, c); };
    var prop = function (k, c) { metaBy('property', k, c); };
    function linkRel(rel, href, hreflang) {
      var q = 'link[rel="' + rel + '"]' + (hreflang ? '[hreflang="' + hreflang + '"]' : '');
      if (document.head.querySelector(q)) return;
      var l = document.createElement('link');
      l.setAttribute('rel', rel);
      l.setAttribute('href', href);
      if (hreflang) l.setAttribute('hreflang', hreflang);
      document.head.appendChild(l);
    }

    // ---- canonical + og:url (backup for static-served pages) ------------------
    var can = document.head.querySelector('link[rel="canonical"]');
    if (!can) { can = document.createElement('link'); can.rel = 'canonical'; document.head.appendChild(can); }
    can.href = url;
    var ogUrl = document.head.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', url); else prop('og:url', url);

    // ---- absolutise social images + mirror alt text ---------------------------
    ['meta[property="og:image"]', 'meta[name="twitter:image"]'].forEach(function (sel) {
      var el = document.head.querySelector(sel);
      if (el) {
        var c = el.getAttribute('content') || '';
        if (c && !/^https?:\/\//.test(c)) el.setAttribute('content', base + '/' + c.replace(/^\//, ''));
      }
    });
    var ogImgEl = document.head.querySelector('meta[property="og:image"]');
    var ogImg = ogImgEl ? ogImgEl.getAttribute('content') : partnerImg;
    var ogAlt = document.head.querySelector('meta[property="og:image:alt"]');
    if (ogAlt && !document.head.querySelector('meta[name="twitter:image:alt"]')) {
      name('twitter:image:alt', ogAlt.getAttribute('content') || '');
    }

    // ---- robots / crawl directives --------------------------------------------
    name('googlebot', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    name('bingbot', 'index, follow, max-image-preview:large');
    if (!document.head.querySelector('meta[name="robots"]')) {
      name('robots', 'index, follow, max-image-preview:large, max-snippet:-1');
    }

    // ---- authorship / publication ---------------------------------------------
    name('author', FIRM.founderName);
    name('publisher', FIRM.name);
    name('copyright', FIRM.name);
    name('rating', 'general');
    name('distribution', 'global');
    name('coverage', 'Worldwide');
    name('revisit-after', '7 days');
    name('referrer', 'strict-origin-when-cross-origin');
    if (!document.head.querySelector('meta[name="keywords"]')) name('keywords', FIRM.keywords);

    // ---- local SEO: geo targeting (Lagos, Nigeria) ----------------------------
    name('geo.region', FIRM.regionCode);
    name('geo.placename', FIRM.locality + ', Nigeria');
    name('geo.position', FIRM.lat + ';' + FIRM.lng);
    name('ICBM', FIRM.lat + ', ' + FIRM.lng);

    // ---- Open Graph extras -----------------------------------------------------
    prop('og:site_name', FIRM.name);
    prop('og:locale', 'en_NG');
    prop('og:locale:alternate', 'en_GB');
    prop('og:image:secure_url', ogImg);
    prop('og:image:width', '1200');
    prop('og:image:height', '630');
    prop('og:image:type', 'image/jpeg');
    prop('og:updated_time', new Date().toISOString());

    // ---- Twitter card extras ---------------------------------------------------
    if (!document.head.querySelector('meta[name="twitter:card"]')) name('twitter:card', 'summary_large_image');
    name('twitter:domain', location.host);
    name('twitter:url', url);

    // ---- mobile / PWA polish ---------------------------------------------------
    name('theme-color', FIRM.themeColor);
    name('application-name', FIRM.name);
    name('apple-mobile-web-app-title', FIRM.name);
    name('apple-mobile-web-app-capable', 'yes');
    name('apple-mobile-web-app-status-bar-style', 'black-translucent');
    name('mobile-web-app-capable', 'yes');
    name('msapplication-TileColor', FIRM.themeColor);

    // ---- language alternates ---------------------------------------------------
    linkRel('alternate', url, 'en-NG');
    linkRel('alternate', url, 'x-default');

    // ---- breadcrumb (Home > current page) -------------------------------------
    var pageNames = {
      '/': 'Home', '/index.html': 'Home',
      '/about': 'About', '/about.html': 'About',
      '/practice': 'Practice Areas', '/practice.html': 'Practice Areas',
      '/contact': 'Contact', '/contact.html': 'Contact',
      '/blog.html': 'Insights', '/insights': 'Insights',
      '/blog-post.html': 'Article'
    };
    var crumbs = [{ name: 'Home', item: base + '/' }];
    var p = location.pathname;
    if (p !== '/' && p !== '/index.html') {
      crumbs.push({ name: pageNames[p] || document.title || 'Page', item: url });
    }
    var breadcrumb = {
      '@type': 'BreadcrumbList',
      '@id': url + '#breadcrumb',
      itemListElement: crumbs.map(function (c, i) {
        return { '@type': 'ListItem', position: i + 1, name: c.name, item: c.item };
      })
    };

    // ---- service catalogue (strong signal for a law firm) ---------------------
    var offerCatalog = {
      '@type': 'OfferCatalog',
      name: 'Legal Services',
      itemListElement: FIRM.services.map(function (svc) {
        return {
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: svc, provider: { '@id': base + '/#firm' } }
        };
      })
    };

    // ---- JSON-LD knowledge graph ----------------------------------------------
    var ld = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': ['LegalService', 'Attorney', 'LocalBusiness'],
          '@id': base + '/#firm',
          name: FIRM.name,
          legalName: FIRM.legalName,
          url: base + '/',
          description: 'Corporate and compliance law firm in Lagos, Nigeria, advising businesses on corporate law, regulatory compliance, debt recovery, and insolvency.',
          slogan: 'Corporate Law And Compliance',
          areaServed: [
            { '@type': 'Country', name: 'Nigeria' },
            { '@type': 'AdministrativeArea', name: 'Lagos' }
          ],
          telephone: FIRM.phone,
          email: FIRM.email,
          foundingDate: '2024',
          priceRange: '$$',
          currenciesAccepted: 'NGN',
          paymentAccepted: 'Bank transfer',
          address: {
            '@type': 'PostalAddress',
            addressLocality: FIRM.locality,
            addressRegion: FIRM.region,
            addressCountry: FIRM.country
          },
          geo: { '@type': 'GeoCoordinates', latitude: FIRM.lat, longitude: FIRM.lng },
          openingHoursSpecification: [{
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '09:00', closes: '17:00'
          }],
          founder: { '@id': base + '/#founder' },
          employee: { '@id': base + '/#founder' },
          knowsAbout: ['Corporate Law', 'Regulatory Compliance', 'Debt Recovery', 'Insolvency & Restructuring', 'Commercial Law', 'Contract Drafting'],
          hasOfferCatalog: offerCatalog,
          sameAs: [FIRM.whatsapp],
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: FIRM.phone,
            email: FIRM.email,
            contactType: 'customer service',
            areaServed: 'NG',
            availableLanguage: ['en']
          },
          image: {
            '@type': 'ImageObject',
            url: partnerImg,
            name: FIRM.founderName,
            caption: FIRM.founderName + ', Principal Partner at ' + FIRM.name + ', Lagos, Nigeria.'
          },
          logo: { '@type': 'ImageObject', url: base + '/favicon.svg' }
        },
        {
          '@type': 'Person',
          '@id': base + '/#founder',
          name: FIRM.founderName,
          jobTitle: FIRM.founderJob,
          worksFor: { '@id': base + '/#firm' },
          image: partnerImg,
          knowsAbout: ['Corporate Law', 'Regulatory Compliance', 'Debt Recovery', 'Insolvency & Restructuring'],
          knowsLanguage: 'en',
          nationality: { '@type': 'Country', name: 'Nigeria' }
        },
        {
          '@type': 'WebSite',
          '@id': base + '/#website',
          url: base + '/',
          name: FIRM.name,
          inLanguage: 'en-NG',
          publisher: { '@id': base + '/#firm' }
        },
        {
          '@type': 'WebPage',
          '@id': url + '#webpage',
          url: url,
          name: document.title || FIRM.name,
          isPartOf: { '@id': base + '/#website' },
          about: { '@id': base + '/#firm' },
          inLanguage: 'en-NG',
          primaryImageOfPage: { '@type': 'ImageObject', url: ogImg },
          breadcrumb: { '@id': url + '#breadcrumb' }
        },
        breadcrumb
      ]
    };

    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  } catch (e) { /* SEO must never break the page */ }
})();
