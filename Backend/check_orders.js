// Check available orders
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
  
  // Check available orders
  db.query('SELECT orders_id, customer_email, order_status, total_amount FROM orders ORDER BY orders_id DESC LIMIT 5', (err, orders) => {
    if (err) {
      console.error('❌ Error:', err);
      process.exit(1);
    }
    
    console.log('📋 Available orders:');
    console.table(orders);
    
    // Check orders_archive table
    db.query('SELECT id, original_order_id, customer_email, archived_by FROM orders_archive ORDER BY id DESC LIMIT 5', (err, archived) => {
      if (err) {
        console.error('❌ Archive table error:', err);
      } else {
        console.log('📋 Archived orders:');
        console.table(archived);
      }
      
      db.end();
    });
  });
});