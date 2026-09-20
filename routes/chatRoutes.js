import express from 'express';
import { searchProducts } from '../services/productService.js';
import { extractSearchCriteria, generateReply, detectIntent } from '../services/aiService.js';
import Inquiry from '../models/inquiry.js';

const router = express.Router();

const handoffNotes = {
  'ready-to-buy': 'A staff member will contact you shortly to complete your order.',
  'wants-delivery': 'A staff member will contact you shortly about delivery.',
  'wants-negotiation': 'A staff member will contact you shortly to discuss the price.',
  'wants-warranty-info': 'A staff member will contact you shortly with warranty details.',
  'needs-human-help': 'A staff member will contact you shortly.',
};

// POST /api/chat  { "message": "...", "customerName": "...", "customerContact": "...", "channel": "whatsapp" }
router.post('/', async (req, res) => {
  try {
    const { message, customerName, customerContact, channel } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const criteria = await extractSearchCriteria(message);
    let products = await searchProducts(criteria);
    let isAlternative = false;

    // Nothing matched exactly: fall back to what is in stock for the same
    // category and brand, then the same category only
    if (products.length === 0) {
      const { category, brand } = criteria;
      if (category || brand) {
        products = await searchProducts({ category, brand });
        if (products.length === 0 && brand && category) {
          products = await searchProducts({ category });
        }
        isAlternative = products.length > 0;
      }
    }

    const reply = isAlternative
      ? await generateReply(message, products, 'We do not have an exact match for that, but these are in stock:')
      : await generateReply(message, products);

    const intent = detectIntent(message);
    const needsHandoff = intent !== 'other';

    // Only promise a callback if we actually have a way to reach the customer
  const followUp = customerContact
      ? (isAlternative
          ? 'A staff member will contact you shortly to help you find what you need.'
          : handoffNotes[intent])
      : 'Please share your phone number or WhatsApp so a staff member can reach you.';
    const finalReply = needsHandoff ? `${reply}\n\n${followUp}` : reply;

    // Snapshot exactly what the customer was shown, so this record stays
    // accurate even if prices/stock change later.
    //
    // If product.configurations is an array, no single configuration was
    // matched (a plain browse) -- keep all of them. If it's a single
    // object, the search already narrowed to that exact match (via
    // $unwind), so that IS the configuration to snapshot.
    const matchedItems = products.map((product) => ({
      productId: product._id,
      name: product.name,
      configurationSnapshot: product.configurations,
    }));

    // Only log an Inquiry when it actually needs staff attention --
    // routine browsing ("do you have servers?") shouldn't fill this
    // collection with noise that buries the leads that matter.
    let inquiryId = null;
    if (needsHandoff) {
    const inquiry = await Inquiry.create({
        customerName,
        customerContact,
        channel: channel || 'web',
        message,
        matchedItems,
        closestMatches: isAlternative,
        needsHandoff,
        handoffReason: intent,
      });
      inquiryId = inquiry._id;
    }

    res.json({
      reply: finalReply,
      matchedProducts: products,
      criteriaUsed: criteria,
      closestMatches: isAlternative,
      inquiryId,
      needsHandoff,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;