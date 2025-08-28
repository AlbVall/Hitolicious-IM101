// Create a test order with proper payment reference
const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'hitolicious_db'
});

db.connect((err) => {
  if (err) {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL');
  
  // First create a payment record
  const paymentQuery = `
    INSERT INTO payments (amount, currency, payment_method, gcash_details)
    VALUES (?, ?, ?, ?)
  `;
  
  db.query(paymentQuery, [100.00, 'PHP', 'cod', null], (err, paymentResult) => {
    if (err) {
      console.error('❌ Error creating payment:', err);
      db.end();
      return;
    }
    
    const paymentId = paymentResult.insertId;
    console.log(`✅ Created payment with ID: ${paymentId}`);
    
    // Now create the order
    const orderQuery = `
      INSERT INTO orders (
        customer_email, total_amount, delivery_address, contact_number, 
        order_status, payment_method, notes, payment_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    db.query(orderQuery, [
      'test@example.com',
      100.00,
      '123 Test Street',
      '09123456789',
      'delivered',
      'cod',
      'Test order for archiving',
      paymentId
    ], (err, orderResult) => {
      if (err) {
        console.error('❌ Error creating test order:', err);
      } else {
        console.log(`✅ Created test order with ID: ${orderResult.insertId}`);
        console.log('🔧 You can now test archiving this order via the admin panel');
        console.log(`📋 Order ID to test: ${orderResult.insertId}`);
      }
      
      db.end();
    });
  });
});