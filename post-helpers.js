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
        status = 'published';
        publishAt = parseDateInput(body.scheduleAt) || now;
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

module.exports = {
    formatDisplayDate,
    parseDateInput,
    postIsPublic,
    publicPostsFilter,
    buildPostFields
};
