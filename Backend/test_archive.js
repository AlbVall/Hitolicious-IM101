// Test archive function
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
  
  // Test the archive function
  testArchive();
});

function testArchive() {
  const orderId = 70; // Use the test order we just created
  
  console.log(`🗃️ Testing archive for order ${orderId}`);
  
  // Get order data
  db.query('SELECT * FROM orders WHERE orders_id = ?', [orderId], (err, orderResult) => {
    if (err) {
      console.error('❌ Order lookup error:', err);
      process.exit(1);
    }
    
    if (orderResult.length === 0) {
      console.log('❌ Order not found');
      process.exit(1);
    }

    const order = orderResult[0];
    console.log('✅ Found order:', order);
    
    // Test archive insert
    const archiveQuery = `
      INSERT INTO orders_archive (
        original_order_id, customer_email, total_amount, payment_id, 
        delivery_address, contact_number, order_status, payment_method, 
        gcash_details, created_at, updated_at, archived_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Convert payment_id to string
    const paymentIdStr = order.payment_id ? order.payment_id.toString() : null;

    console.log('📝 Archive data:', {
      original_order_id: order.orders_id,
      customer_email: order.customer_email,
      total_amount: order.total_amount,
      payment_id: paymentIdStr,
      delivery_address: order.delivery_address,
      contact_number: order.contact_number,
      order_status: order.order_status,
      payment_method: order.payment_method,
      gcash_details: order.gcash_details,
      created_at: order.created_at,
      updated_at: order.updated_at,
      archived_by: 'test'
    });

    db.query(archiveQuery, [
      order.orders_id,
      order.customer_email,
      order.total_amount,
      paymentIdStr,
      order.delivery_address,
      order.contact_number,
      order.order_status,
      order.payment_method,
      order.gcash_details,
      order.created_at,
      order.updated_at,
      'test'
    ], (err, archiveResult) => {
      if (err) {
        console.error('❌ Error archiving order:', err);
        console.error('❌ SQL Error details:', err.sqlMessage);
        console.error('❌ SQL State:', err.sqlState);
        console.error('❌ Error Code:', err.code);
      } else {
        console.log(`✅ Successfully inserted into orders_archive with ID ${archiveResult.insertId}`);
      }
      
      db.end();
    });
  });
}