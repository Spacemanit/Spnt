export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function requireOwnership(req, res, next) {
  const paramId = req.params.id || req.params.userId;
  if (paramId && req.userId && String(paramId) !== String(req.userId)) {
    return res.status(403).json({ message: 'Forbidden: user mismatch' });
  }
  next();
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function validateExpenseInput(body, { requireTitle = true } = {}) {
  const errors = [];
  const out = {};

  if (requireTitle) {
    if (!body.title || !String(body.title).trim()) errors.push('Title is required');
    else out.title = String(body.title).trim().slice(0, 120);
  } else if (body.title !== undefined) {
    out.title = String(body.title).trim().slice(0, 120);
  }

  if (body.money !== undefined && body.money !== null && body.money !== '') {
    const n = Number(body.money);
    if (!Number.isFinite(n) || n < 0) errors.push('Money must be a non-negative number');
    else out.money = n;
  } else {
    out.money = 0;
  }

  if (body.category !== undefined && body.category !== null && String(body.category).trim() !== '') {
    out.category = String(body.category).trim().slice(0, 40);
  } else {
    out.category = 'Uncategorized';
  }

  if (body.description !== undefined && body.description !== null) {
    out.description = String(body.description).slice(0, 2000);
  } else {
    out.description = '';
  }

  if (body.date !== undefined && body.date !== null && body.date !== '') {
    const d = new Date(body.date);
    if (Number.isNaN(d.getTime())) errors.push('Invalid date');
    else out.date = d;
  } else {
    out.date = new Date();
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) errors.push('Tags must be an array');
    else {
      out.tags = [
        ...new Set(
          body.tags
            .map((t) => String(t).trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32))
            .filter(Boolean)
        ),
      ].slice(0, 20);
    }
  } else {
    out.tags = [];
  }

  return { errors, value: out };
}

export function validateEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

export function validateCurrency(code) {
  return typeof code === 'string' && /^[A-Za-z]{3}$/.test(code.trim());
}

// Simple in-memory rate limiter (no new deps)
export function rateLimit({ windowMs = 60_000, max = 120 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'global';
    const now = Date.now();
    const entry = hits.get(key) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + windowMs;
    }
    entry.count += 1;
    hits.set(key, entry);
    if (entry.count > max) {
      return res.status(429).json({ message: 'Too many requests, slow down' });
    }
    next();
  };
}

export function notFound(_req, res) {
  res.status(404).json({ message: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // eslint-disable-next-line no-console
  console.error(err);
  if (res.headersSent) return;
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
}
