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

   const ASK_FOR_CONTACT =
     'Certainly. Please enter your name and phone number or WhatsApp in the boxes above and press Send, and a staff member will contact you.';

// POST /api/chat  { "message": "...", "customerName": "...", "customerContact": "...", "channel": "whatsapp" }
router.post('/', async (req, res) => {
  try {
    const { message, customerName, customerContact, channel } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const criteria = await extractSearchCriteria(message);
    const intent = detectIntent(message);
    const needsHandoff = intent !== 'other';

    // A staff request with nothing to search for ("I want to speak to
    // someone", "Do you deliver?") should redirect to staff, not list
    // the whole shop.
    const hasSearchCriteria = Object.keys(criteria).length > 0;
    const staffOnly = needsHandoff && !hasSearchCriteria;

        // Nothing to search for and no staff request ("hello", "</>", "**"):
    // ask what they need, instead of listing the whole shop
    if (!hasSearchCriteria && !needsHandoff) {
      return res.json({
        reply: 'Please tell me what you are looking for, for example a laptop, a Dell with 8GB RAM, or a computer within your budget.',
        matchedProducts: [],
        criteriaUsed: criteria,
        closestMatches: false,
        inquiryId: null,
        needsHandoff: false,
      });
    }

    let products = [];
    let isAlternative = false;

    if (!staffOnly) {
      products = await searchProducts(criteria);

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
    }

    let finalReply;

    if (staffOnly) {
      finalReply = customerContact ? handoffNotes[intent] : ASK_FOR_CONTACT;
    } else {
      const reply = isAlternative
        ? await generateReply(message, products, 'We do not have an exact match for that, but these are in stock:')
        : await generateReply(message, products);

      // Only promise a callback if we actually have a way to reach the customer
      const followUp = customerContact
        ? (isAlternative
            ? 'A staff member will contact you shortly to help you find what you need.'
            : handoffNotes[intent])
        :    'To arrange this, please enter your name and phone number or WhatsApp in the boxes above and press Send, then ask again.'

      finalReply = needsHandoff ? `${reply}\n\n${followUp}` : reply;
    }

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

    // Only log an Inquiry when it needs staff attention AND staff have a
    // way to reach the customer. Routine browsing ("do you have servers?")
    // should not fill this collection with noise that buries real leads.
    let inquiryId = null;
    if (needsHandoff && customerContact) {
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