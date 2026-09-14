import mongoose from 'mongoose';
const { Schema } = mongoose;

const inquirySchema = new Schema(
  {
    customerName: { type: String, trim: true },
    customerContact: { type: String, trim: true }, // phone/WhatsApp number

    channel: {
      type: String,
      enum: ['web', 'whatsapp', 'messenger'],
      default: 'web',
    },

    message: { type: String, required: true, trim: true },

    // Snapshot of what was actually shown to the customer -- not a live
    // reference -- so this record stays accurate even if prices/stock
    // change later.
    matchedItems: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        configurationSnapshot: Schema.Types.Mixed,
      },
    ],

    needsHandoff: { type: Boolean, default: false },
    handoffReason: {
      type: String,
      enum: ['ready-to-buy', 'wants-delivery', 'wants-negotiation', 'wants-warranty-info', 'needs-human-help', 'other'],
    },
    handoffNote: { type: String, trim: true }, // short optional free-text detail

    status: {
      type: String,
      enum: ['new', 'in-progress', 'resolved'],
      default: 'new',
    },

    staffNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('Inquiry', inquirySchema);