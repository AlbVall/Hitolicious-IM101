// Add test order items to order 70
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
  
  // Add some test order items to order 73
  const orderItems = [
    { order_id: 73, food_id: 1, quantity: 2, price: 50.00 },
    { order_id: 73, food_id: 2, quantity: 1, price: 75.00 }
  ];
  
  let itemsAdded = 0;
  
  orderItems.forEach(item => {
    const query = 'INSERT INTO order_items (order_id, food_id, quantity, price) VALUES (?, ?, ?, ?)';
    
    db.query(query, [item.order_id, item.food_id, item.quantity, item.price], (err, result) => {
      if (err) {
        console.error('❌ Error adding order item:', err);
      } else {
        console.log(`✅ Added order item with ID: ${result.insertId}`);
      }
      
      itemsAdded++;
      if (itemsAdded === orderItems.length) {
        console.log('🎉 All test order items added!');
        db.end();
      }
    });
  });
});