const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { cart, region } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    if (region !== 'IM') {
      return res.status(400).json({ error: 'We only deliver to the Isle of Man.' });
    }

    let totalQty = 0;
    cart.forEach(item => totalQty += item.qty);
    
    if (totalQty > 15) {
      return res.status(400).json({ error: 'Maximum 15 items per order' });
    }

    const line_items = cart.map(item => ({
      price_data: {
        currency: 'gbp',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    }));

    line_items.push({
      price_data: {
        currency: 'gbp',
        product_data: { name: 'Delivery (Isle of Man)' },
        unit_amount: 150,
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: 'https://manxbiltong.com/cart/?success=true',
      cancel_url: 'https://manxbiltong.com/cart/?canceled=true',
      shipping_address_collection: { allowed_countries: ['IM'] },
    });

    return res.status(200).json({ id: session.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
