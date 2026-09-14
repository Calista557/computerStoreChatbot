import express from 'express';
import Inquiry from '../models/Inquiry.js';

const router = express.Router();

// POST /api/inquiries -- create an inquiry directly (e.g. logging a phone-in
// customer manually). The chat flow will normally create these automatically.
router.post('/', async (req, res) => {
  try {
    const inquiry = await Inquiry.create(req.body);
    res.status(201).json(inquiry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/inquiries?status=new&needsHandoff=true&channel=whatsapp
// The staff-facing "what needs my attention" view.
router.get('/', async (req, res) => {
  try {
    const { status, needsHandoff, channel } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (needsHandoff !== undefined) filter.needsHandoff = needsHandoff === 'true';
    if (channel) filter.channel = channel;

    // Newest first -- staff want to see recent activity at the top.
    const inquiries = await Inquiry.find(filter).sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inquiries/:id -- full detail on one inquiry
router.get('/:id', async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/inquiries/:id -- staff update status or add notes,
// e.g. { "status": "resolved", "staffNotes": "Called back, sold the SSD unit" }
router.patch('/:id', async (req, res) => {
  try {
    const allowedUpdates = ['status', 'staffNotes'];
    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, updates, {
      new: true, // return the updated document, not the original
      runValidators: true, // re-check enum/required rules on the update
    });
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    res.json(inquiry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;