/** Starter FAQ content — seeded once (admin-editable thereafter). */
export interface SeedFaq {
  question: string;
  answer: string;
  category?: string;
}

export const faqSeed: SeedFaq[] = [
  {
    category: "Delivery & collection",
    question: "Do you deliver nationwide?",
    answer:
      "Yes — we deliver across South Africa by courier. At checkout you enter your address and see live courier options with prices and estimated times, then pick the one that suits you.",
  },
  {
    category: "Delivery & collection",
    question: "Can I collect my order instead?",
    answer:
      "Absolutely. Choose Collection at checkout and we’ll arrange a time for you to pick up in Observatory, Cape Town.",
  },
  {
    category: "Delivery & collection",
    question: "How long does delivery take?",
    answer:
      "Most pieces are made to order in small batches — we’ll confirm timing when you order. Once your parcel ships you’ll get a tracking link to follow it to your door.",
  },
  {
    category: "Orders & payment",
    question: "How do I pay?",
    answer:
      "You can pay securely online by instant EFT or card at checkout. Your order is confirmed once payment is received.",
  },
  {
    category: "Orders & payment",
    question: "Can I track my order?",
    answer:
      "Yes. Create an account and you’ll see all your orders, their status and tracking in your dashboard — and we’ll email you updates along the way.",
  },
  {
    category: "Orders & payment",
    question: "Do I need an account to order?",
    answer:
      "No — you can check out as a guest. An account just makes life easier: save addresses, track orders, reorder in a tap and leave reviews.",
  },
  {
    category: "Custom & gifts",
    question: "Do you make custom orders?",
    answer:
      "We love a bespoke piece — your scent, colour, vessel, or a sculptural form. Tell us what you have in mind on the Custom page or over WhatsApp and we’ll make it happen.",
  },
  {
    category: "Custom & gifts",
    question: "Do you do gift hampers?",
    answer:
      "Yes — see Hampers for curated gift boxes, wrapped in eco-friendly packaging. We can also put a custom one together for you.",
  },
  {
    category: "Care",
    question: "How do I care for my candle?",
    answer:
      "On the first burn, let the wax melt fully across the top to avoid tunnelling. Trim the wick to about 5mm before each light, keep it away from draughts, and never leave a burning candle unattended.",
  },
  {
    category: "Care",
    question: "Are your products eco-conscious?",
    answer:
      "Yes — small batches, thoughtfully chosen ingredients and eco-friendly packaging. Bring your own clean jar and mention it for 10% off your refill.",
  },
];
