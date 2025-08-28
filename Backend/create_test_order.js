// Create a test order to test archiving
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
  
  // Create a test order
  const testOrder = {
    customer_email: 'test@example.com',
    total_amount: 100.00,
    delivery_address: '123 Test Street',
    contact_number: '09123456789',
    order_status: 'delivered',
    payment_method: 'cod',
    notes: 'Test order for archiving',
    payment_id: '123',
    created_at: new Date(),
    updated_at: new Date()
  };
  
  const insertQuery = `
    INSERT INTO orders (
      customer_email, total_amount, delivery_address, contact_number, 
      order_status, payment_method, notes, payment_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(insertQuery, [
    testOrder.customer_email,
    testOrder.total_amount,
    testOrder.delivery_address,
    testOrder.contact_number,
    testOrder.order_status,
    testOrder.payment_method,
    testOrder.notes,
    testOrder.payment_id,
    testOrder.created_at,
    testOrder.updated_at
  ], (err, result) => {
    if (err) {
      console.error('❌ Error creating test order:', err);
    } else {
      console.log(`✅ Created test order with ID: ${result.insertId}`);
      console.log('🔧 You can now test archiving this order via the admin panel');
    }
    
    db.end();
  });
});