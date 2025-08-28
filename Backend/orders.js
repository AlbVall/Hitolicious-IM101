const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust if your DB connection is elsewhere

// POST: create new order
router.post('/', async (req, res) => {
  const { customer_email, items, total_amount, delivery_address, contact_number, payment_method } = req.body;

  try {
    // Insert into orders table
    const [orderResult] = await db.execute(
      'INSERT INTO orders (customer_email, total_amount, delivery_address, contact_number, payment_method) VALUES (?, ?, ?, ?, ?)',
      [customer_email, total_amount, delivery_address, contact_number, payment_method]
    );

    const orderId = orderResult.insertId;

    // Insert each item
    for (const item of items) {
      await db.execute(
        'INSERT INTO order_items (order_id, food_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.food_id, item.quantity, item.price]
      );
    }

    res.json({ success: true, orderId });
  } catch (error) {
    console.error('❌ Error saving order:', error);
    res.status(500).json({ success: false, error: 'Failed to save order' });
  }
});

module.exports = router;
