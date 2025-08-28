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

// ================= IMPROVED ORDER CREATION =================
app.post('/api/orders', (req, res) => {
  const { customer_email, items, total_amount, delivery_address, contact_number, payment_method, notes, gcash_details, currency } = req.body;

  console.log('📦 Creating new order:', {
    customer_email,
    items: items?.length || 0,
    total_amount,
    delivery_address,
    contact_number,
    payment_method,
    currency
  });

  // Validation
  if (!customer_email || !items || !Array.isArray(items) || items.length === 0) {
    console.error('❌ Missing required fields:', { customer_email, items: items?.length });
    return res.status(400).json({ error: 'Customer email and items are required' });
  }

  if (!total_amount || !delivery_address || !contact_number || !payment_method) {
    console.error('❌ Missing order details:', { total_amount, delivery_address, contact_number, payment_method });
    return res.status(400).json({ error: 'Order details are incomplete' });
  }

  db.beginTransaction(err => {
    if (err) {
      console.error('❌ Transaction start error:', err);
      return res.status(500).json({ error: 'Database transaction error' });
    }

    // 1. Insert payment first
    const paymentSql = `
      INSERT INTO payments (amount, currency, payment_method, gcash_details)
      VALUES (?, ?, ?, ?)
    `;
    
    console.log('💳 Creating payment record:', { total_amount, currency: currency || 'PHP', payment_method });
    
    db.query(paymentSql, [total_amount, currency || 'PHP', payment_method, gcash_details || null], (err, paymentResult) => {
      if (err) {
        console.error('❌ Payment creation error:', err);
        return db.rollback(() => res.status(500).json({ error: 'Failed to create payment: ' + err.message }));
      }

      const paymentId = paymentResult.insertId;
      console.log('✅ Payment created with ID:', paymentId);

      // 2. Insert order with payment_id as FK
      const orderSql = `
        INSERT INTO orders (customer_email, total_amount, delivery_address, contact_number, order_status, payment_method, notes, payment_id, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, NOW())
      `;
      
      console.log('📋 Creating order record for:', customer_email);
      
      db.query(orderSql, [customer_email, total_amount, delivery_address, contact_number, payment_method, notes, paymentId], (err, result) => {
        if (err) {
          console.error('❌ Order creation error:', err);
          return db.rollback(() => res.status(500).json({ error: 'Failed to create order: ' + err.message }));
        }

        const orderId = result.insertId;
        console.log('✅ Order created with ID:', orderId);

        const itemSql = 'INSERT INTO order_items (order_id, food_id, quantity, price) VALUES (?, ?, ?, ?)';
        let completed = 0;
        let hasError = false;

        console.log(`��️ Processing ${items.length} order items...`);

        items.forEach((item, index) => {
          if (hasError) return;

          console.log(`Processing item ${index + 1}:`, { food_id: item.food_id, quantity: item.quantity, price: item.price });

          // First check if there's enough stock
          db.query('SELECT quantity FROM stocks WHERE food_id = ?', [item.food_id], (err, stockResult) => {
            if (hasError) return;
            
            if (err) {
              console.error('❌ Stock check error:', err);
              hasError = true;
              return db.rollback(() => res.status(500).json({ error: 'Failed to check stock: ' + err.message }));
            }

            if (stockResult.length === 0) {
              console.error('❌ No stock record found for food_id:', item.food_id);
              hasError = true;
              return db.rollback(() => res.status(500).json({ error: `No stock record found for food item ${item.food_id}` }));
            }

            const availableStock = stockResult[0].quantity;
            if (availableStock < item.quantity) {
              console.error('❌ Insufficient stock:', { food_id: item.food_id, requested: item.quantity, available: availableStock });
              hasError = true;
              return db.rollback(() => res.status(400).json({ error: `Insufficient stock for food item ${item.food_id}. Available: ${availableStock}, Requested: ${item.quantity}` }));
            }

            // Insert order item
            db.query(itemSql, [orderId, item.food_id, item.quantity, item.price], (err) => {
              if (hasError) return;
              
              if (err) {
                console.error('❌ Order item creation error:', err);
                hasError = true;
                return db.rollback(() => res.status(500).json({ error: 'Failed to create order item: ' + err.message }));
              }

              console.log(`✅ Order item ${index + 1} created`);

              // Update stock
              db.query('UPDATE stocks SET quantity = quantity - ? WHERE food_id = ?', [item.quantity, item.food_id], (err, updateResult) => {
                if (hasError) return;
                
                if (err) {
                  console.error('❌ Stock update error:', err);
                  hasError = true;
                  return db.rollback(() => res.status(500).json({ error: 'Failed to update stock: ' + err.message }));
                }

                console.log(`✅ Stock updated for food_id ${item.food_id}: -${item.quantity}`);

                completed++;
                if (completed === items.length) {
                  db.commit(err => {
                    if (err) {
                      console.error('❌ Transaction commit error:', err);
                      return db.rollback(() => res.status(500).json({ error: 'Transaction commit failed: ' + err.message }));
                    }

                    console.log(`✅ Order ${orderId} completed successfully with ${completed} items`);
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

// ================= ARCHIVE FUNCTION =================
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

      // Insert into orders_archive
      const archiveQuery = `
        INSERT INTO orders_archive (
          original_order_id, customer_email, total_amount, payment_id, 
          delivery_address, contact_number, order_status, payment_method, 
          gcash_details, created_at, updated_at, archived_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const paymentIdStr = order.payment_id ? order.payment_id.toString() : null;

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
        archivedBy || 'admin'
      ], (err, archiveResult) => {
        if (err) {
          console.error('❌ Error archiving order:', err);
          return db.rollback(() => res.status(500).json({ error: 'Failed to archive order: ' + err.message }));
        }

        console.log(`✅ Archived order ${orderId} to orders_archive with ID ${archiveResult.insertId}`);

        // Get and archive order items
        db.query('SELECT oi.*, f.food_name FROM order_items oi LEFT JOIN food f ON oi.food_id = f.food_id WHERE oi.order_id = ?', [orderId], (err, orderItems) => {
          if (err) {
            console.error('❌ Error fetching order items:', err);
            return db.rollback(() => res.status(500).json({ error: 'Failed to fetch order items' }));
          }

          if (orderItems.length > 0) {
            let itemsArchived = 0;
            
            orderItems.forEach(item => {
              const archiveItemQuery = `
                INSERT INTO order_items_archive (food_id, food_name, quantity, price)
                VALUES (?, ?, ?, ?)
              `;

              db.query(archiveItemQuery, [
                item.food_id,
                item.food_name || 'Unknown Food',
                item.quantity,
                item.price
              ], (err, itemArchiveResult) => {
                if (err) {
                  console.error('❌ Error archiving order item:', err);
                  return db.rollback(() => res.status(500).json({ error: 'Failed to archive order items' }));
                }

                itemsArchived++;
                if (itemsArchived === orderItems.length) {
                  // Delete original records
                  db.query('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
                    if (err) {
                      console.error('❌ Error deleting order items:', err);
                      return db.rollback(() => res.status(500).json({ error: 'Failed to delete order items' }));
                    }

                    db.query('DELETE FROM orders WHERE orders_id = ?', [orderId], (err) => {
                      if (err) {
                        console.error('❌ Error deleting order:', err);
                        return db.rollback(() => res.status(500).json({ error: 'Failed to delete order' }));
                      }

                      db.commit(err => {
                        if (err) {
                          console.error('❌ Transaction commit error:', err);
                          return db.rollback(() => res.status(500).json({ error: 'Transaction commit failed' }));
                        }

                        console.log(`✅ Successfully archived order ${orderId} with ${itemsArchived} items`);
                        res.json({ 
                          success: true, 
                          message: 'Order archived successfully',
                          archived_id: archiveResult.insertId,
                          archived_items: itemsArchived
                        });
                      });
                    });
                  });
                }
              });
            });
          } else {
            // No items, just delete the order
            db.query('DELETE FROM orders WHERE orders_id = ?', [orderId], (err) => {
              if (err) {
                console.error('❌ Error deleting order:', err);
                return db.rollback(() => res.status(500).json({ error: 'Failed to delete order' }));
              }

              db.commit(err => {
                if (err) {
                  console.error('❌ Transaction commit error:', err);
                  return db.rollback(() => res.status(500).json({ error: 'Transaction commit failed' }));
                }

                console.log(`✅ Successfully archived order ${orderId} (no items)`);
                res.json({ 
                  success: true, 
                  message: 'Order archived successfully',
                  archived_id: archiveResult.insertId,
                  archived_items: 0
                });
              });
            });
          }
        });
      });
    });
  });
});

// Get archived orders
app.get('/api/orders/archived', (req, res) => {
  const query = `SELECT * FROM orders_archive ORDER BY archived_at DESC`;
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
      
      db.query('SELECT * FROM stocks WHERE food_id = ?', [foodId], (err, stocksResult) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error checking stocks for food:', err);
            res.status(500).json({ error: 'Database error' });
          });
        }

        const archiveQuery = `INSERT INTO food_archive (food_id, food_name, category, price, archived_at) VALUES (?, ?, ?, ?, NOW())`;
        db.query(archiveQuery, [food.food_id, food.food_name, food.category, food.price], (err, archiveResult) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error inserting into food_archive:', err);
              res.status(500).json({ error: 'Database error' });
            });
          }
          
          if (stocksResult.length > 0) {
            db.query('DELETE FROM stocks WHERE food_id = ?', [foodId], (err, stockDeleteResult) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error deleting stocks for food:', err);
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
                  
                  res.json({ 
                    success: true, 
                    archive_id: archiveResult.insertId,
                    deleted_stocks: stockDeleteResult.affectedRows
                  });
                });
              });
            });
          } else {
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
                
                res.json({ 
                  success: true, 
                  archive_id: archiveResult.insertId,
                  deleted_stocks: 0
                });
              });
            });
          }
        });
      });
    });
  });
});

// Restore food from archive
app.post('/api/food/restore/:id', (req, res) => {
  const foodId = req.params.id;
  
  console.log(`🔄 Attempting to restore food with ID: ${foodId}`);
  
  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Find the archived food
    db.query('SELECT * FROM food_archive WHERE food_id = ?', [foodId], (err, archivedResult) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error fetching archived food:', err);
          res.status(500).json({ error: 'Database error' });
        });
      }
      
      if (archivedResult.length === 0) {
        return db.rollback(() => {
          console.log(`❌ No archived food found with ID: ${foodId}`);
          res.status(404).json({ error: 'Archived food not found' });
        });
      }
      
      const archivedFood = archivedResult[0];
      console.log(`✅ Found archived food: ${archivedFood.food_name}`);
      
      // Check if food already exists in main table (prevent duplicates)
      db.query('SELECT * FROM food WHERE food_id = ?', [foodId], (err, existingResult) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error checking existing food:', err);
            res.status(500).json({ error: 'Database error' });
          });
        }
        
        if (existingResult.length > 0) {
          return db.rollback(() => {
            console.log(`❌ Food with ID ${foodId} already exists in main table`);
            res.status(400).json({ error: 'Food already exists' });
          });
        }
        
        // Restore food to main table
        const restoreQuery = `INSERT INTO food (food_id, food_name, category, price) VALUES (?, ?, ?, ?)`;
        db.query(restoreQuery, [archivedFood.food_id, archivedFood.food_name, archivedFood.category, archivedFood.price], (err, restoreResult) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error restoring food to main table:', err);
              res.status(500).json({ error: 'Database error' });
            });
          }
          
          console.log(`✅ Restored food to main table: ${archivedFood.food_name}`);
          
          // Remove from archive
          db.query('DELETE FROM food_archive WHERE food_id = ?', [foodId], (err, deleteResult) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error removing from archive:', err);
                res.status(500).json({ error: 'Database error' });
              });
            }
            
            console.log(`✅ Removed food from archive: ${archivedFood.food_name}`);
            
            // Create initial stock entry with 0 quantity
            db.query('INSERT INTO stocks (food_id, admin_id, quantity) VALUES (?, 1, 0)', [foodId], (err, stockResult) => {
              if (err) {
                console.warn('Warning: Could not create initial stock entry:', err);
                // Don't fail the transaction for this, just log the warning
              } else {
                console.log(`✅ Created initial stock entry for restored food`);
              }
              
              db.commit(err => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Error committing transaction:', err);
                    res.status(500).json({ error: 'Database error' });
                  });
                }
                
                console.log(`✅ Successfully restored food: ${archivedFood.food_name} (ID: ${foodId})`);
                res.json({ 
                  success: true,
                  message: 'Food restored successfully',
                  food: {
                    food_id: archivedFood.food_id,
                    food_name: archivedFood.food_name,
                    category: archivedFood.category,
                    price: archivedFood.price
                  }
                });
              });
            });
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

  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    db.query('SELECT * FROM stocks WHERE food_id = ?', [foodId], (err, stocksResult) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error checking stocks for food:', err);
          res.status(500).json({ error: 'Database error' });
        });
      }

      if (stocksResult.length > 0) {
        db.query('DELETE FROM stocks WHERE food_id = ?', [foodId], (err, stockDeleteResult) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error deleting stocks for food:', err);
              res.status(500).json({ error: 'Database error' });
            });
          }
          
          const deleteQuery = 'DELETE FROM food WHERE food_id = ?';
          db.query(deleteQuery, [foodId], (err, result) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error deleting from food table:', err);
                res.status(500).json({ error: 'Database error' });
              });
            }
            
            if (result.affectedRows === 0) {
              return db.rollback(() => {
                res.status(404).json({ error: 'Food not found' });
              });
            }
            
            db.commit(err => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error committing transaction:', err);
                  res.status(500).json({ error: 'Database error' });
                });
              }
              
              res.json({ 
                success: true,
                deleted_stocks: stockDeleteResult.affectedRows
              });
            });
          });
        });
      } else {
        const deleteQuery = 'DELETE FROM food WHERE food_id = ?';
        db.query(deleteQuery, [foodId], (err, result) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error deleting from food table:', err);
              res.status(500).json({ error: 'Database error' });
            });
          }
          
          if (result.affectedRows === 0) {
            return db.rollback(() => {
              res.status(404).json({ error: 'Food not found' });
            });
          }
          
          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error('Error committing transaction:', err);
                res.status(500).json({ error: 'Database error' });
              });
            }
            
            res.json({ 
              success: true,
              deleted_stocks: 0
            });
          });
        });
      }
    });
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