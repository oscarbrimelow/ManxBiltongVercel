// Vercel serverless function for Stripe Checkout Sessions
// Place this file in /api/create-checkout-session.js in your Vercel project
// Your Stripe secret key must be set as an environment variable: STRIPE_SECRET_KEY


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // Vercel expects the body to be parsed as JSON
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    // Parse body if not already parsed (for local dev)
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    const { cart, region } = body;
    if (!Array.isArray(cart) || !region) {
      res.status(400).json({ error: 'Missing cart or region' });
      return;
    }
    // Only allow Isle of Man (IM)
    if (region !== 'IM') {
      res.status(400).json({ error: 'We only deliver to the Isle of Man.' });
      return;
    }
    // Enforce max quantity per order
    const maxQty = 15;
    let totalQty = 0;
    cart.forEach(item => { totalQty += item.qty; });
    if (totalQty > maxQty) {
      res.status(400).json({ error: 'For bulk orders, please contact us directly.' });
      return;
    }
    // Map cart to Stripe line items
    const line_items = cart.map(item => ({
      price_data: {
        currency: 'gbp',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    }));
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: 'https://manxbiltong.com/cart/index.html?success=true',
      cancel_url: 'https://manxbiltong.com/cart/index.html?canceled=true',
      shipping_address_collection: { allowed_countries: ['IM'] },
      metadata: { admin_email: 'orders@manxbiltong.com' },
    });
    res.status(200).json({ id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
