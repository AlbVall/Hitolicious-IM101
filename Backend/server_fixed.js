require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'hitolicious_db'
});

db.connect((err) => {
  if (err) console.error('❌ DB connection failed:', err.message);
  else console.log('✅ Connected to MySQL');
});

// ====================== CUSTOMER & ADMIN AUTH ======================
app.post('/api/customer/signup', (req, res) => {
  const { fullName, birthday, email, password } = req.body;
  const sql = `
    INSERT INTO users (customer_fullname, Customer_birthday, customer_email, Customer_password) 
    VALUES (?, ?, ?, ?)
  `;
  db.query(sql, [fullName, birthday, email, password], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/customer/signin', (req, res) => {
  const { email, password } = req.body;
  const sql = `SELECT * FROM users WHERE customer_email = ? AND Customer_password = ?`;
  db.query(sql, [email, password], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length > 0) res.json({ success: true, user: result[0] });
    else res.status(401).json({ success: false, message: 'Invalid credentials' });
  });
});

// ==================== ADMIN SIGN IN ====================
app.post('/api/admin/signin', (req, res) => {
  const { email, password } = req.body;

  console.log('🔐 Admin login attempt:', email, password);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const sql = 'SELECT * FROM admins WHERE admin_email = ? AND admin_password = ?';
  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.error('❌ Admin sign-in DB error:', err);
      return res.status(500).json({ error: 'Server error' });
    }

    if (result.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const admin = result[0];
    res.json({
      success: true,
      user: {
        id: admin.id,
        admin_email: admin.admin_email,
        admin_fullname: admin.admin_fullname
      }
    });
  });
});

// ============================ FOOD ================================
app.get('/api/food', (req, res) => {
  const sql = 'SELECT * FROM food';
  db.query(sql, (err, result) => {
    if (err) {
      console.error('❌ Error fetching food:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(result);
  });
});

// ============================ STOCKS ===============================
app.get('/api/stocks', (req, res) => {
  const sql = `
    SELECT s.*, f.food_name
    FROM stocks s
    JOIN food f ON s.food_id = f.food_id
  `;
  db.query(sql, (err, result) => {
    if (err) {
      console.error('❌ Error fetching stocks:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(result);
  });
});

// =========================== ORDERS ===============================
app.get('/api/orders', (req, res) => {
  db.query('SELECT * FROM orders ORDER BY created_at DESC', async (err, orders) => {
    if (err) return res.status(500).json({ error: err.message });

    const ordersWithItems = await Promise.all(
      orders.map((order) => {
        return new Promise((resolve, reject) => {
          db.query(
            'SELECT oi.*, f.food_name FROM order_items oi LEFT JOIN food f ON oi.food_id = f.food_id WHERE oi.order_id = ?',
            [order.orders_id],
            (err, items) => {
              if (err) reject(err);
              else resolve({ ...order, items });
            }
          );
        });
      })
    );

    res.json(ordersWithItems);
  });
});

// Get orders for a specific customer
app.get('/api/orders/customer/:email', (req, res) => {
  const { email } = req.params;
  
  db.query('SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC', [email], async (err, orders) => {
    if (err) return res.status(500).json({ error: err.message });

    const ordersWithItems = await Promise.all(
      orders.map((order) => {
        return new Promise((resolve, reject) => {
          db.query(
            'SELECT oi.*, f.food_name FROM order_items oi LEFT JOIN food f ON oi.food_id = f.food_id WHERE oi.order_id = ?',
            [order.orders_id],
            (err, items) => {
              if (err) reject(err);
              else resolve({ ...order, items });
            }
          );
        });
      })
    );

    res.json(ordersWithItems);
  });
});

app.post('/api/orders', (req, res) => {
  const { customer_email, items, total_amount, delivery_address, contact_number, payment_method, notes, gcash_details, currency } = req.body;

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: err.message });

    // 1. Insert payment first
    const paymentSql = `
      INSERT INTO payments (amount, currency, payment_method, gcash_details)
      VALUES (?, ?, ?, ?)
    `;
    db.query(paymentSql, [total_amount, currency || 'PHP', payment_method, gcash_details || null], (err, paymentResult) => {
      if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

      const paymentId = paymentResult.insertId;

      // 2. Insert order with payment_id as FK
      const orderSql = `
        INSERT INTO orders (customer_email, total_amount, delivery_address, contact_number, order_status, payment_method, notes, payment_id, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, NOW())
      `;
      db.query(orderSql, [customer_email, total_amount, delivery_address, contact_number, payment_method, notes, paymentId], (err, result) => {
        if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

        const orderId = result.insertId;
        const itemSql = 'INSERT INTO order_items (order_id, food_id, quantity, price) VALUES (?, ?, ?, ?)';

        let completed = 0;
        items.forEach(item => {
          db.query(itemSql, [orderId, item.food_id, item.quantity, item.price], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

            db.query('UPDATE stocks SET quantity = quantity - ? WHERE food_id = ?', [item.quantity, item.food_id], (err) => {
              if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

              completed++;
              if (completed === items.length) {
                db.commit(err => {
                  if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                  res.json({ success: true, orderId, paymentId });
                });
              }
            });
          });
        });
      });
    });
  });
});

app.put('/api/orders/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  db.query('UPDATE orders SET order_status = ?, updated_at = NOW() WHERE orders_id = ?', [status, orderId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  });
});

// ================= FIXED ARCHIVE FUNCTION =================
app.post('/api/orders/:orderId/archive', (req, res) => {
  const { orderId } = req.params;
  const { archivedBy } = req.body;

  console.log(`🗃️ Archiving order ${orderId} by ${archivedBy || 'admin'}`);

  db.beginTransaction(err => {
    if (err) {
      console.error('❌ Transaction start error:', err);
      return res.status(500).json({ error: 'Database transaction error' });
    }

    // Get the complete order data
    db.query('SELECT * FROM orders WHERE orders_id = ?', [orderId], (err, orderResult) => {
      if (err) {
        console.error('❌ Order lookup error:', err);
        return db.rollback(() => res.status(500).json({ error: 'Database error' }));
      }
      
      if (orderResult.length === 0) {
        return db.rollback(() => res.status(404).json({ error: 'Order not found' }));
      }

      const order = orderResult[0];
      console.log(`✅ Found order ${orderId}, proceeding with archive`);

      // Insert into orders_archive using your existing table structure
      const archiveQuery = `
        INSERT INTO orders_archive (
          original_order_id, customer_email, total_amount, payment_id, 
          delivery_address, contact_number, order_status, payment_method, 
          gcash_details, created_at, updated_at, archived_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(archiveQuery, [
        order.orders_id,
        order.customer_email,
        order.total_amount,
        order.payment_id,
        order.delivery_address,
        order.contact_number,
        order.order_status,
        order.payment_method,
        order.gcash_details,
        order.created_at,
        order.updated_at,
        archivedBy || 'admin'
      ], (err, archiveResult) => {
        if (err) {
          console.error('❌ Error archiving order:', err);
          return db.rollback(() => res.status(500).json({ error: 'Failed to archive order: ' + err.message }));
        }

        console.log(`✅ Archived order ${orderId} to orders_archive with ID ${archiveResult.insertId}`);

        // Now delete order items first (foreign key constraint)
        db.query('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
          if (err) {
            console.error('❌ Error deleting order items:', err);
            return db.rollback(() => res.status(500).json({ error: 'Failed to delete order items' }));
          }

          console.log(`✅ Deleted order items for order ${orderId}`);

          // Delete the original order
          db.query('DELETE FROM orders WHERE orders_id = ?', [orderId], (err) => {
            if (err) {
              console.error('❌ Error deleting order:', err);
              return db.rollback(() => res.status(500).json({ error: 'Failed to delete order' }));
            }

            console.log(`✅ Deleted original order ${orderId}`);

            // Commit the transaction
            db.commit(err => {
              if (err) {
                console.error('❌ Transaction commit error:', err);
                return db.rollback(() => res.status(500).json({ error: 'Transaction commit failed' }));
              }

              console.log(`✅ Successfully archived order ${orderId}`);
              res.json({ 
                success: true, 
                message: 'Order archived successfully',
                archived_id: archiveResult.insertId
              });
            });
          });
        });
      });
    });
  });
});

// Get archived orders
app.get('/api/orders/archived', (req, res) => {
  const query = `
    SELECT * FROM orders_archive 
    ORDER BY archived_at DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching archived orders:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results || []);
  });
});

// ================= FOOD ROUTES =================
app.get('/api/food/archived', (req, res) => {
  const query = `
    SELECT archived_id, food_id, food_name, category, price, archived_at
    FROM food_archive
    ORDER BY archived_at DESC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching archived foods:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

app.post('/api/food/:id/archive', (req, res) => {
  const foodId = req.params.id;
  
  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    db.query('SELECT * FROM food WHERE food_id = ?', [foodId], (err, foodResult) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error fetching food for archive:', err);
          res.status(500).json({ error: 'Database error' });
        });
      }
      if (foodResult.length === 0) {
        return db.rollback(() => {
          res.status(404).json({ error: 'Food not found' });
        });
      }
      
      const food = foodResult[0];
      
      const archiveQuery = `INSERT INTO food_archive (food_id, food_name, category, price, archived_at) VALUES (?, ?, ?, ?, NOW())`;
      db.query(archiveQuery, [food.food_id, food.food_name, food.category, food.price], (err, archiveResult) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error inserting into food_archive:', err);
            res.status(500).json({ error: 'Database error' });
          });
        }
        
        const deleteQuery = 'DELETE FROM food WHERE food_id = ?';
        db.query(deleteQuery, [foodId], (err, deleteResult) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error deleting from food table:', err);
              res.status(500).json({ error: 'Database error' });
            });
          }
          
          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error('Error committing transaction:', err);
                res.status(500).json({ error: 'Database error' });
              });
            }
            
            res.json({ success: true, archive_id: archiveResult.insertId });
          });
        });
      });
    });
  });
});

app.post('/api/food/restore/:id', (req, res) => {
  const foodId = req.params.id;
  if (!foodId) {
    return res.status(400).json({ error: 'Food ID is required' });
  }

  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    db.query('SELECT * FROM food_archive WHERE food_id = ?', [foodId], (err, archivedResult) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error fetching archived food:', err);
          res.status(500).json({ error: 'Database error' });
        });
      }
      if (archivedResult.length === 0) {
        return db.rollback(() => {
          res.status(404).json({ error: 'Archived food not found' });
        });
      }

      const archivedFood = archivedResult[0];

      const restoreQuery = `INSERT INTO food (food_id, food_name, category, price) VALUES (?, ?, ?, ?)`;
      db.query(restoreQuery, [archivedFood.food_id, archivedFood.food_name, archivedFood.category, archivedFood.price], (err, restoreResult) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error inserting back into food table:', err);
            res.status(500).json({ error: 'Database error' });
          });
        }

        const deleteQuery = `DELETE FROM food_archive WHERE food_id = ?`;
        db.query(deleteQuery, [foodId], (err, deleteResult) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error deleting from food_archive:', err);
              res.status(500).json({ error: 'Database error' });
            });
          }

          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error('Error committing transaction:', err);
                res.status(500).json({ error: 'Database error' });
              });
            }

            res.json({ success: true, restored: deleteResult.affectedRows });
          });
        });
      });
    });
  });
});

app.post('/api/food', (req, res) => {
  const { food_name, category, price } = req.body;

  if (!food_name || !category || !price) {
    return res.status(400).json({ error: 'Food name, category and price are required' });
  }

  const query = 'INSERT INTO food (food_name, category, price) VALUES (?, ?, ?)';
  db.query(query, [food_name, category, price], (err, result) => {
    if (err) {
      console.error('Error adding food:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, food_id: result.insertId });
  });
});

app.put('/api/food/:id', (req, res) => {
  const foodId = req.params.id;
  const { food_name, category, price } = req.body;

  if (!food_name || !category || !price) {
    return res.status(400).json({ error: 'Food name, category and price are required' });
  }

  const query = 'UPDATE food SET food_name = ?, category = ?, price = ? WHERE food_id = ?';
  db.query(query, [food_name, category, price, foodId], (err, result) => {
    if (err) {
      console.error('Error updating food:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Food not found' });
    }
    res.json({ success: true });
  });
});

app.delete('/api/food/:id', (req, res) => {
  const foodId = req.params.id;

  const query = 'DELETE FROM food WHERE food_id = ?';
  db.query(query, [foodId], (err, result) => {
    if (err) {
      console.error('Error deleting food:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Food not found' });
    }
    res.json({ success: true });
  });
});

// ================= STOCK ROUTES =================
app.post('/api/stocks', (req, res) => {
  const { food_id, admin_id, quantity } = req.body;

  if (!food_id || !admin_id || quantity === undefined) {
    return res.status(400).json({ error: 'Food ID, admin ID and quantity are required' });
  }

  db.query('SELECT * FROM stocks WHERE food_id = ?', [food_id], (err, existing) => {
    if (err) {
      console.error('Error checking existing stock:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existing.length > 0) {
      const query = 'UPDATE stocks SET quantity = ?, admin_id = ? WHERE food_id = ?';
      db.query(query, [quantity, admin_id, food_id], (err, result) => {
        if (err) {
          console.error('Error updating stock:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, stocks_id: existing[0].stocks_id });
      });
    } else {
      const query = 'INSERT INTO stocks (food_id, admin_id, quantity) VALUES (?, ?, ?)';
      db.query(query, [food_id, admin_id, quantity], (err, result) => {
        if (err) {
          console.error('Error adding stock:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, stocks_id: result.insertId });
      });
    }
  });
});

app.put('/api/stocks/:id', (req, res) => {
  const stockId = req.params.id;
  const { quantity } = req.body;

  if (quantity === undefined) {
    return res.status(400).json({ error: 'Quantity is required' });
  }

  const query = 'UPDATE stocks SET quantity = ? WHERE stocks_id = ?';
  db.query(query, [quantity, stockId], (err, result) => {
    if (err) {
      console.error('Error updating stock:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    res.json({ success: true });
  });
});

// ========================== SERVER ================================
app.listen(5000, () => {
  console.log('🚀 Server running at http://localhost:5000');
});