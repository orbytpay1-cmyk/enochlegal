// Blog post status, dates, and public visibility helpers.

function formatDisplayDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function parseDateInput(value) {
    if (!value) return null;
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Legacy posts without status are treated as published. */
function postIsPublic(post, now) {
    now = now || new Date();
    if (post.status === 'draft') return false;
    if (post.publishAt) {
        const pub = new Date(post.publishAt);
        if (!Number.isNaN(pub.getTime()) && pub > now) return false;
    }
    if (post.status === 'scheduled') {
        const pub = post.publishAt ? new Date(post.publishAt) : null;
        if (!pub || pub > now) return false;
    }
    return true;
}

function publicPostsFilter(now) {
    now = now || new Date();
    return {
        status: { $ne: 'draft' },
        $or: [
            { publishAt: { $exists: false } },
            { publishAt: null },
            { publishAt: { $lte: now } }
        ]
    };
}

function buildPostFields(body, existing) {
    const now = new Date();
    const publishMode = body.publishMode || 'now'; // now | schedule | draft
    const displayDate = parseDateInput(body.displayDate) || parseDateInput(body.displayDateISO) || now;
    let publishAt = null;
    let status = 'published';

    if (publishMode === 'draft') {
        status = 'draft';
        publishAt = null;
    } else if (publishMode === 'schedule') {
        const sched = parseDateInput(body.scheduleAt);
        if (!sched) throw new Error('Schedule date and time are required for scheduled posts');
        if (sched <= now) {
            status = 'published';
            publishAt = sched;
        } else {
            status = 'scheduled';
            publishAt = sched;
        }
    } else {
        // Publish now — always use current time. Do not reuse scheduleAt (hidden field
        // can still hold a future date and accidentally hide the post from the public API).
        status = 'published';
        publishAt = now;
    }

    return {
        title: body.title,
        excerpt: body.excerpt,
        content: body.content,
        category: body.category,
        read_time: body.readTime || body.read_time || '5 min read',
        icon: body.icon || '📝',
        featured: !!body.featured,
        coverImage: body.coverImage !== undefined ? body.coverImage : (existing && existing.coverImage) || null,
        author: (existing && existing.author) || 'Precious C. Enoch, Esq.',
        displayDate,
        date: formatDisplayDate(displayDate),
        publishAt,
        status,
        updated_at: now
    };
}

// Convert a host-baked cover URL (e.g. http://old-host/uploads/x.jpg, saved by an
// older build) into a relative /uploads/x.jpg so it resolves on any domain and can
// be proxied/served by the current backend. Cloudinary / external URLs are left as-is.
function relativizeCover(post) {
    if (post && typeof post.coverImage === 'string') {
        const m = post.coverImage.match(/^https?:\/\/[^/]+(\/uploads\/.+)$/i);
        if (m) post.coverImage = m[1];
    }
    return post;
}

module.exports = {
    formatDisplayDate,
    parseDateInput,
    postIsPublic,
    publicPostsFilter,
    buildPostFields,
    relativizeCover
};
