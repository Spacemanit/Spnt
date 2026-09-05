import express from 'express';
import mongoose from 'mongoose';
import Data from '../models/Data.js';
import User from '../models/User.js';
import { asyncHandler, requireOwnership, validateExpenseInput } from '../middleware/validate.js';

const router = express.Router({ mergeParams: true });

router.use(requireOwnership);

function buildFilter(userId, q) {
  const filter = { userId: new mongoose.Types.ObjectId(userId) };
  if (q.month && /^\d{4}-\d{2}$/.test(q.month)) {
    const [y, m] = q.month.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    filter.date = { $gte: start, $lt: end };
  }
  if (q.category && q.category !== 'All') {
    filter.category = String(q.category);
  }
  if (q.tags) {
    const tags = String(q.tags)
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (tags.length) filter.tags = { $in: tags };
  }
  if (q.q) {
    const rx = new RegExp(String(q.q).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }
  return filter;
}

function sortFor(param) {
  switch (param) {
    case 'date-asc':
      return { date: 1 };
    case 'money-desc':
      return { money: -1 };
    case 'money-asc':
      return { money: 1 };
    case 'date-desc':
    default:
      return { date: -1 };
  }
}

router.post(
  '/:id/new',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { errors, value } = validateExpenseInput(req.body, { requireTitle: true });
    if (errors.length) return res.status(400).json({ message: errors[0] });
    const doc = new Data({ userId, ...value });
    await doc.save();
    return res.status(201).json({ message: 'Success', data: doc });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const filter = buildFilter(userId, req.query);
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '200'), 10) || 200));
    const skip = (page - 1) * limit;
    const sort = sortFor(String(req.query.sort || 'date-desc'));
    const [data, total] = await Promise.all([
      Data.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Data.countDocuments(filter),
    ]);
    if (!data.length) return res.status(200).json({ message: 'NULL', data: [], meta: { total, page, limit, pages: 0 } });
    return res.status(200).json({
      message: 'Success',
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  '/:id/summary',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const oid = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const monthParam =
      typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)
        ? req.query.month
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [y, m] = monthParam.split('-').map(Number);
    const mStart = new Date(Date.UTC(y, m - 1, 1));
    const mEnd = new Date(Date.UTC(y, m, 1));
    // Previous month range (handles Jan -> Dec wrap)
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const pStart = new Date(Date.UTC(prevY, prevM - 1, 1));
    const pEnd = new Date(Date.UTC(prevY, prevM, 1));
    const prevKey = `${prevY}-${String(prevM).padStart(2, '0')}`;

    const [totalAgg, monthAgg, prevAgg, byCat, byMonth, user] = await Promise.all([
      Data.aggregate([{ $match: { userId: oid } }, { $group: { _id: null, total: { $sum: '$money' }, count: { $sum: 1 } } }]),
      Data.aggregate([
        { $match: { userId: oid, date: { $gte: mStart, $lt: mEnd } } },
        { $group: { _id: null, total: { $sum: '$money' }, count: { $sum: 1 } } },
      ]),
      Data.aggregate([
        { $match: { userId: oid, date: { $gte: pStart, $lt: pEnd } } },
        { $group: { _id: null, total: { $sum: '$money' } } },
      ]),
      Data.aggregate([
        { $match: { userId: oid } },
        { $group: { _id: '$category', total: { $sum: '$money' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 12 },
      ]),
      Data.aggregate([
        { $match: { userId: oid } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            total: { $sum: '$money' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ]),
      User.findById(userId).lean(),
    ]);

    const totalSpent = totalAgg[0]?.total ?? 0;
    const monthlySpent = monthAgg[0]?.total ?? 0;
    const prevSpent = prevAgg[0]?.total ?? 0;
    const budget = user?.budget ?? 0;
    const rolloverEnabled = !!user?.rolloverEnabled;
    // Rollover carries leftover AND debt (can be negative)
    const rollover = budget ? budget - prevSpent : 0;
    const effectiveBudget = budget ? (rolloverEnabled ? budget + rollover : budget) : 0;
    const budgetLeft = budget ? effectiveBudget - monthlySpent : null;
    // Single savings goal: saved = effective (or base) - spent
    const savingsTarget = user?.savingsTarget ?? 0;
    const savedThisMonth = budget ? effectiveBudget - monthlySpent : 0;
    const savingsPct = savingsTarget ? Math.round((savedThisMonth / savingsTarget) * 100) : 0;
    res.status(200).json({
      message: 'Success',
      data: {
        totalSpent,
        monthlySpent,
        month: monthParam,
        count: totalAgg[0]?.count ?? 0,
        budget,
        budgetLeft,
        rolloverEnabled,
        rollover: rolloverEnabled ? rollover : 0,
        prevMonth: prevKey,
        prevSpent,
        effectiveBudget: budget ? effectiveBudget : budget,
        savings: {
          label: user?.savingsLabel || '',
          target: savingsTarget,
          deadline: user?.savingsDeadline ? new Date(user.savingsDeadline).toISOString().slice(0, 10) : '',
          savedThisMonth,
          pct: savingsPct,
        },
        byCategory: byCat.map((c) => ({ category: c._id || 'Uncategorized', total: c.total, count: c.count })),
        byMonth: byMonth.map((b) => ({ month: b._id, total: b.total, count: b.count })).reverse(),
      },
    });
  })
);

function dupeKey(title, date, money) {
  const t = String(title || '').trim().toLowerCase();
  const d = date instanceof Date ? date.toISOString().slice(0, 10) : String(date || '').slice(0, 10);
  const m = Number(money ?? 0).toFixed(2);
  return `${t}|${d}|${m}`;
}

router.post(
  '/:id/import',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const entries = req.body.entries;
    if (!Array.isArray(entries)) return res.status(400).json({ message: 'entries must be an array' });
    if (!entries.length) return res.status(400).json({ message: 'No entries to import' });
    if (entries.length > 1000) return res.status(400).json({ message: 'Max 1000 rows per import' });

    // Existing keys for dupe detection (title+date+money)
    const existing = await Data.find({ userId }).select('title date money').limit(5000).lean();
    const seen = new Set(existing.map((r) => dupeKey(r.title, r.date ? new Date(r.date) : '', r.money)));

    const toInsert = [];
    const skipped = [];
    entries.forEach((raw, i) => {
      // row = CSV line number (header is row 1, so +2)
      const row = i + 2;
      const { errors, value } = validateExpenseInput(raw || {}, { requireTitle: true });
      if (errors.length) {
        skipped.push({
          row,
          title: String(raw?.title || '').slice(0, 60),
          date: String(raw?.date || '').slice(0, 10),
          money: raw?.money ?? '',
          reason: errors[0],
        });
        return;
      }
      const key = dupeKey(value.title, value.date, value.money);
      if (seen.has(key)) {
        skipped.push({
          row,
          title: value.title.slice(0, 60),
          date: value.date.toISOString().slice(0, 10),
          money: value.money,
          reason: 'DUPLICATE',
        });
        return;
      }
      seen.add(key);
      toInsert.push({ userId, ...value });
    });

    if (toInsert.length) await Data.insertMany(toInsert, { ordered: false });
    return res.status(200).json({ message: 'Success', imported: toInsert.length, skipped });
  })
);

router.get(
  '/:id/export',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const filter = buildFilter(userId, req.query);
    const rows = await Data.find(filter).sort({ date: -1 }).limit(5000).lean();
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = ['title,money,category,date,description,tags'];
    for (const r of rows) {
      lines.push(
        [esc(r.title), r.money ?? 0, esc(r.category), r.date ? new Date(r.date).toISOString().slice(0, 10) : '', esc(r.description), esc((r.tags || []).join('|'))].join(',')
      );
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="spnt-export.csv"');
    res.status(200).send(lines.join('\n'));
  })
);

router.delete(
  '/:id/delete/:dataId',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const result = await Data.deleteOne({ _id: req.params.dataId, userId });
    if (!result.deletedCount) return res.status(404).json({ message: 'Entry not found' });
    return res.status(200).json({ message: 'Success' });
  })
);

router.put(
  '/:id/edit',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { dataId, ...rest } = req.body;
    if (!dataId) return res.status(400).json({ message: 'dataId required' });
    const { errors, value } = validateExpenseInput({ ...rest, tags: rest.tags }, { requireTitle: true });
    if (errors.length) return res.status(400).json({ message: errors[0] });
    const data = await Data.findOneAndUpdate({ _id: dataId, userId }, value, { new: true });
    if (!data) return res.status(404).json({ message: 'Entry not found' });
    return res.status(200).json({ message: 'Success', data });
  })
);

export default router;
