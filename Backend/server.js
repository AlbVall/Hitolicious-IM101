require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Create profile pictures directory if it doesn't exist
const profilePicsDir = path.join(__dirname, 'profile_pictures');
if (!fs.existsSync(profilePicsDir)) {
  fs.mkdirSync(profilePicsDir, { recursive: true });
}

// Serve profile pictures statically
app.use('/profile_pictures', express.static(profilePicsDir));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'hitolicious_db_new'
});

db.connect((err) => {
  if (err) console.error('❌ DB connection failed:', err.message);
  else {
    console.log('✅ Connected to MySQL');
    
    // Check admin_log table structure
    db.query('DESCRIBE admin_log', (err, result) => {
      if (err) {
        console.error('❌ Could not check admin_log table structure:', err);
      } else {
        console.log('📋 admin_log table structure:', result);
      }
    });
  }
});

// ====================== ADMIN LOGGING HELPER ======================
const logAdminAction = (adminIdentifier, action, callback) => {
  console.log(`🔍 Logging admin action - Identifier: "${adminIdentifier}", Action: "${action}"`);
  
  // If adminIdentifier is an email, try to get the admin name from the database
  if (adminIdentifier && adminIdentifier.includes('@')) {
    console.log(`📧 Detected email: ${adminIdentifier}, looking up admin name...`);
    const getAdminNameSql = 'SELECT admin_fullname FROM admins WHERE admin_email = ?';
    db.query(getAdminNameSql, [adminIdentifier], (err, result) => {
      if (err || !result || result.length === 0) {
        console.log(`❌ Could not find admin with email: ${adminIdentifier}`);
        // If we can't find the admin name, use the email
        const adminName = adminIdentifier || 'Unknown Admin';
        insertLogEntry(adminName, action, callback);
      } else {
        // Use the admin's full name
        const adminName = result[0].admin_fullname || adminIdentifier;
        console.log(`✅ Found admin name: ${adminName} for email: ${adminIdentifier}`);
        insertLogEntry(adminName, action, callback);
      }
    });
  } else {
    console.log(`📝 Using identifier directly: ${adminIdentifier}`);
    // Use the identifier directly (could be a name or default 'admin')
    const adminName = adminIdentifier || 'Unknown Admin';
    insertLogEntry(adminName, action, callback);
  }
};

const insertLogEntry = (adminName, action, callback) => {
  const logSql = 'INSERT INTO admin_log (Admin_name, action, created_at) VALUES (?, ?, NOW())';
  db.query(logSql, [adminName, action], (err, result) => {
    if (err) {
      console.error('❌ Failed to log admin action:', err);
    } else {
      console.log(`📝 Admin ${adminName} logged: ${action} (Log ID: ${result.insertId})`);
    }
    if (callback) callback(err);
  });
};

// ====================== CUSTOMER & ADMIN AUTH ======================
app.post('/api/customer/signup', (req, res) => {
  const { fullName, birthday, email, password, phone, address } = req.body;

  // Basic phone validation: exactly 11 digits if provided
  if (phone && !/^\d{11}$/.test(String(phone))) {
    return res.status(400).json({ error: 'Phone must be exactly 11 digits' });
  }

  const sql = `
    INSERT INTO users (customer_fullname, Customer_birthday, customer_email, Customer_password, Customer_phone, Customer_Address)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  console.log('Signup data:', { fullName, birthday, email, phone, address });

  db.query(sql, [fullName, birthday, email, password, phone || null, address || null], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/customer/signin', (req, res) => {
  const { email, password } = req.body;
  const sql = `SELECT * FROM users WHERE customer_email = ? AND Customer_password = ?`;
  db.query(sql, [email, password], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length > 0) {
      console.log('User found:', result[0]);
      res.json({ success: true, user: result[0] });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });
});

// ====================== CUSTOMER PROFILE UPDATE ======================
app.put('/api/customer/profile', (req, res) => {
  const { email, fullName, birthday, phone, address, profilePicture } = req.body;

  console.log('Profile update request:', { email, fullName, birthday, phone, address, profilePicture });

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (phone && phone !== '' && !/^\d{11}$/.test(String(phone))) {
    console.log('Phone validation failed:', { phone, length: phone.length, isDigits: /^\d+$/.test(phone) });
    return res.status(400).json({ error: 'Phone must be exactly 11 digits' });
  }

  const sql = `
    UPDATE users
    SET customer_fullname = COALESCE(?, customer_fullname),
        Customer_birthday = COALESCE(?, Customer_birthday),
        Customer_phone = ?,
        Customer_Address = ?
    WHERE customer_email = ?
  `;

  // Convert empty strings to null for proper database handling
  const phoneValue = phone && phone.trim() !== '' ? phone : null;
  const addressValue = address && address.trim() !== '' ? address : null;

  console.log('SQL update with values:', [fullName || null, birthday || null, phoneValue, addressValue, email]);

  db.query(sql, [fullName || null, birthday || null, phoneValue, addressValue, email], (err, result) => {
    if (err) {
      console.error('❌ Profile update error:', err);
      return res.status(500).json({ error: `Failed to update profile: ${err.message}` });
    }
    
    console.log('Update result:', { affectedRows: result.affectedRows, changedRows: result.changedRows });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return updated user
    db.query('SELECT * FROM users WHERE customer_email = ?', [email], (fetchErr, rows) => {
      if (fetchErr) {
        console.error('❌ Fetch after update error:', fetchErr);
        return res.status(500).json({ error: 'Updated but failed to fetch user' });
      }
      
      console.log('Updated user from DB:', rows[0]);
      
      res.json({ success: true, user: rows[0] });
    });
  });
});

// Fetch a customer's profile by email
app.get('/api/customer/profile', (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  db.query('SELECT * FROM users WHERE customer_email = ?', [email], (err, rows) => {
    if (err) {
      console.error('❌ Fetch profile error:', err);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user: rows[0] });
  });
});

// ==================== ADMIN SIGNUP ====================
app.post('/api/admin/signup', (req, res) => {
  const { fullName, birthday, work, email, password, admin_phonenumber, admin_address } = req.body;

  // Basic phone validation: exactly 11 digits if provided
  if (admin_phonenumber && !/^\d{11}$/.test(String(admin_phonenumber))) {
    return res.status(400).json({ error: 'Phone number must be exactly 11 digits' });
  }

  const sql = `
    INSERT INTO admins (admin_fullname, adminbirth, work, admin_email, admin_password, admin_phonenumber, admin_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  console.log('Admin signup data:', { fullName, birthday, work, email, admin_phonenumber, admin_address });

  db.query(sql, [fullName, birthday, work, email, password, admin_phonenumber || null, admin_address || null], (err) => {
    if (err) {
      console.error('❌ Admin signup DB error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Admin account created successfully' });
  });
});

// ==================== ADMIN PROFILE FETCH ====================
app.get('/api/admin/profile/:id', (req, res) => {
  const adminId = req.params.id;

  const sql = 'SELECT * FROM admins WHERE id = ?';
  
  console.log('Fetching admin profile for ID:', adminId);

  db.query(sql, [adminId], (err, result) => {
    if (err) {
      console.error('❌ Admin profile fetch DB error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    res.json({ success: true, admin: result[0] });
  });
});

// ==================== ADMIN PROFILE UPDATE ====================
app.put('/api/admin/profile', (req, res) => {
  const { admin_id, admin_fullname, adminbirth, admin_phonenumber, admin_address } = req.body;

  // Basic phone validation: exactly 11 digits if provided
  if (admin_phonenumber && !/^\d{11}$/.test(String(admin_phonenumber))) {
    return res.status(400).json({ error: 'Phone number must be exactly 11 digits' });
  }

  const sql = `
    UPDATE admins 
    SET admin_fullname = ?, adminbirth = ?, admin_phonenumber = ?, admin_address = ?
    WHERE id = ?
  `;
  
  console.log('Admin profile update data:', { admin_id, admin_fullname, adminbirth, admin_phonenumber, admin_address });

  db.query(sql, [admin_fullname, adminbirth, admin_phonenumber, admin_address, admin_id], (err, result) => {
    if (err) {
      console.error('❌ Admin profile update DB error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Admin profile updated successfully' });
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
  const sql = `
    SELECT 
      o.*,
      oi.orderitems_id,
      oi.food_id,
      oi.quantity,
      oi.price,
      f.food_name
    FROM orders o
    LEFT JOIN order_items oi ON o.orders_id = oi.order_id
    LEFT JOIN food f ON oi.food_id = f.food_id
    ORDER BY o.created_at DESC, oi.orderitems_id ASC
  `;
  
  db.query(sql, async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Group results by order
    const orderMap = new Map();
    
    results.forEach(row => {
      const orderId = row.orders_id;
      
      if (!orderMap.has(orderId)) {
        // Normalize status for UI
        const normalizedStatus = (row.order_status || '').toLowerCase() === 'out for delivery'
          ? 'out_for_delivery'
          : row.order_status;
          
        orderMap.set(orderId, {
          orders_id: row.orders_id,
          customer_email: row.customer_email,
          total_amount: row.total_amount,
          delivery_address: row.delivery_address,
          contact_number: row.contact_number,
          order_status: normalizedStatus,
          payment_method: row.payment_method,
          notes: row.notes,
          payment_id: row.payment_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          items: []
        });
      }
      
      // Add item if it exists (food_id is not null)
      if (row.food_id) {
        orderMap.get(orderId).items.push({
          orderitems_id: row.orderitems_id,
          food_id: row.food_id,
          food_name: row.food_name,
          quantity: row.quantity,
          price: row.price
        });
      }
    });

    const ordersWithItems = Array.from(orderMap.values());
    res.json(ordersWithItems);
  });
});

// Get orders for a specific customer
app.get('/api/orders/customer/:email', (req, res) => {
  const { email } = req.params;
  
  const sql = `
    SELECT 
      o.*,
      oi.orderitems_id,
      oi.food_id,
      oi.quantity,
      oi.price,
      f.food_name
    FROM orders o
    LEFT JOIN order_items oi ON o.orders_id = oi.order_id
    LEFT JOIN food f ON oi.food_id = f.food_id
    WHERE o.customer_email = ?
    ORDER BY o.created_at DESC, oi.orderitems_id ASC
  `;
  
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Group results by order
    const orderMap = new Map();
    
    results.forEach(row => {
      const orderId = row.orders_id;
      
      if (!orderMap.has(orderId)) {
        // Normalize status for UI
        const normalizedStatus = (row.order_status || '').toLowerCase() === 'out for delivery'
          ? 'out_for_delivery'
          : row.order_status;
          
        orderMap.set(orderId, {
          orders_id: row.orders_id,
          customer_email: row.customer_email,
          total_amount: row.total_amount,
          delivery_address: row.delivery_address,
          contact_number: row.contact_number,
          order_status: normalizedStatus,
          payment_method: row.payment_method,
          notes: row.notes,
          payment_id: row.payment_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          items: []
        });
      }
      
      // Add item if it exists (food_id is not null)
      if (row.food_id) {
        orderMap.get(orderId).items.push({
          orderitems_id: row.orderitems_id,
          food_id: row.food_id,
          food_name: row.food_name,
          quantity: row.quantity,
          price: row.price
        });
      }
    });

    const ordersWithItems = Array.from(orderMap.values());
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

      // 2. Check stock availability for all items first
      let stockCheckCompleted = 0;
      let stockCheckError = false;
      const stockResults = [];

      console.log(`🛒 Checking stock for ${items.length} order items...`);

      items.forEach((item, index) => {
        if (stockCheckError) return;

        db.query('SELECT quantity FROM stocks WHERE food_id = ?', [item.food_id], (err, stockResult) => {
          if (stockCheckError) return;
          
          if (err) {
            console.error('❌ Stock check error:', err);
            stockCheckError = true;
            return db.rollback(() => res.status(500).json({ error: 'Failed to check stock: ' + err.message }));
          }

          if (stockResult.length === 0) {
            console.error('❌ No stock record found for food_id:', item.food_id);
            stockCheckError = true;
            return db.rollback(() => res.status(500).json({ error: `No stock record found for food item ${item.food_id}` }));
          }

          const availableStock = stockResult[0].quantity;
          if (availableStock < item.quantity) {
            console.error('❌ Insufficient stock:', { food_id: item.food_id, requested: item.quantity, available: availableStock });
            stockCheckError = true;
            return db.rollback(() => res.status(400).json({ error: `Insufficient stock for food item ${item.food_id}. Available: ${availableStock}, Requested: ${item.quantity}` }));
          }

          stockResults.push({ item, availableStock });
          stockCheckCompleted++;

          if (stockCheckCompleted === items.length) {
            // All stock checks passed, proceed with order creation
            console.log('✅ All stock checks passed, creating order...');

            // Prepare items with food names for JSON storage
            const itemsWithNames = items.map(item => ({
              food_id: item.food_id,
              food_name: item.food_name || 'Unknown Food',
              quantity: item.quantity,
              price: item.price
            }));

            // 3. Insert order with payment_id as FK
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

              // 4. Insert order items into order_items table
              let orderItemsCompleted = 0;
              let orderItemsError = false;

              items.forEach((item) => {
                if (orderItemsError) return;

                const orderItemSql = `INSERT INTO order_items (order_id, food_id, quantity, price) VALUES (?, ?, ?, ?)`;
                db.query(orderItemSql, [orderId, item.food_id, item.quantity, item.price], (err, itemResult) => {
                  if (orderItemsError) return;
                  
                  if (err) {
                    console.error('❌ Order item creation error:', err);
                    orderItemsError = true;
                    return db.rollback(() => res.status(500).json({ error: 'Failed to create order items: ' + err.message }));
                  }

                  console.log(`✅ Order item created for food_id ${item.food_id}`);
                  orderItemsCompleted++;
                  
                  if (orderItemsCompleted === items.length) {
                    // Update stock for all items
                    let stockUpdateCompleted = 0;
                    let stockUpdateError = false;

                    stockResults.forEach(({ item, availableStock }) => {
                      if (stockUpdateError) return;

                      db.query('UPDATE stocks SET quantity = quantity - ? WHERE food_id = ?', [item.quantity, item.food_id], (err, updateResult) => {
                        if (stockUpdateError) return;
                        
                        if (err) {
                          console.error('❌ Stock update error:', err);
                          stockUpdateError = true;
                          return db.rollback(() => res.status(500).json({ error: 'Failed to update stock: ' + err.message }));
                        }

                        console.log(`✅ Stock updated for food_id ${item.food_id}: -${item.quantity}`);

                        stockUpdateCompleted++;
                        if (stockUpdateCompleted === stockResults.length) {
                          db.commit(err => {
                            if (err) {
                              console.error('❌ Transaction commit error:', err);
                              return db.rollback(() => res.status(500).json({ error: 'Transaction commit failed: ' + err.message }));
                            }

                            console.log(`✅ Order ${orderId} completed successfully with ${items.length} items`);
                            res.json({ success: true, orderId, paymentId });
                          });
                        }
                      });
                    });
                  }
                });
              });
            });
          }
        });
      });
    });
  });
});

app.put('/api/orders/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status, updated_by, admin_email } = req.body;

  console.log(`🔍 Order status update request body:`, req.body);
  console.log(`🔍 Extracted values - status: "${status}", updated_by: "${updated_by}", admin_email: "${admin_email}"`);

  // Accept both API-friendly and DB-friendly variants
  const validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'out for delivery', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  // Discover ENUM options for order_status and map desired status to an allowed value
  db.query("SHOW COLUMNS FROM orders LIKE 'order_status'", (colErr, colRows) => {
    if (colErr || !colRows || colRows.length === 0) {
      console.warn('⚠️ Could not read order_status column type; proceeding with best-guess mapping');
    }

    let enumValues = [];
    try {
      const type = colRows?.[0]?.Type || '';
      const match = type.match(/^enum\((.*)\)$/i);
      if (match && match[1]) {
        enumValues = match[1]
          .split(',')
          .map(s => s.trim().replace(/^'(.*)'$/, '$1'));
      }
    } catch {}

    const desired = status; // incoming status variant
    const candidates = [
      desired,
      desired.replace(/_/g, ' '), // out_for_delivery -> out for delivery
      desired.replace(/\s+/g, '_'), // out for delivery -> out_for_delivery
      desired.toLowerCase(),
      desired.replace(/_/g, ' ').toLowerCase(),
      desired.replace(/\s+/g, '_').toLowerCase(),
    ];

    let dbStatus = candidates[0];
    if (enumValues.length > 0) {
      // Find first enum value that matches ignoring case and underscores/spaces
      const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '_');
      const desiredNorms = candidates.map(norm);
      const found = enumValues.find(ev => desiredNorms.includes(norm(ev)));
      if (found) dbStatus = found;
    } else {
      // Fallback best guess
      if (desired === 'out_for_delivery') dbStatus = 'out for delivery';
    }

    console.log(`📝 Updating order ${orderId} status to '${status}' (DB: '${dbStatus}') by ${updated_by || 'admin'}`);

    db.query('UPDATE orders SET order_status = ?, updated_at = NOW() WHERE orders_id = ?', [dbStatus, orderId], (err, result) => {
      if (err) {
        console.error('❌ Order status update error:', err);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });

      // Log admin action
      const adminIdentifier = admin_email || updated_by || 'admin'; // Use admin email, name, or default to 'admin'
      logAdminAction(adminIdentifier, `Updated order ${orderId} status to '${dbStatus}'`);

      // Verify the update by querying the database
      db.query('SELECT order_status FROM orders WHERE orders_id = ?', [orderId], (verifyErr, verifyResult) => {
        if (verifyErr) {
          console.error('❌ Error verifying status update:', verifyErr);
          return res.json({ success: true, resolved_status: dbStatus });
        }
        const stored = verifyResult?.[0]?.order_status ?? '';
        console.log(`🔍 Verified status in DB: '${stored}'`);
        if (String(stored) === '') {
          // MySQL may coerce invalid ENUMs to '' if sql_mode permits; surface as error with allowed values
          return res.status(422).json({ 
            error: "Database rejected status value. Allowed statuses do not match your selection.", 
            resolved_status: dbStatus,
            allowed_statuses: enumValues
          });
        }
        return res.json({ success: true, resolved_status: stored, allowed_statuses: enumValues });
      });
    });
  });
});

// Update order items
app.put('/api/orders/:orderId/items', (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body;

  console.log(`📝 Updating order ${orderId} items`);

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items must be an array' });
  }

  db.beginTransaction(err => {
    if (err) {
      console.error('❌ Transaction start error:', err);
      return res.status(500).json({ error: 'Database transaction error' });
    }

    // Delete existing order items
    db.query('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
      if (err) {
        console.error('❌ Error deleting existing order items:', err);
        return db.rollback(() => res.status(500).json({ error: err.message }));
      }

      // Insert new order items
      let itemsCompleted = 0;
      let itemsError = false;

      if (items.length === 0) {
        // No items to insert, update the order's updated_at timestamp and commit
        db.query('UPDATE orders SET updated_at = NOW() WHERE orders_id = ?', [orderId], (err) => {
          if (err) {
            console.error('❌ Error updating order timestamp:', err);
            return db.rollback(() => res.status(500).json({ error: 'Failed to update order timestamp' }));
          }
          
          db.commit(err => {
            if (err) {
              console.error('❌ Transaction commit error:', err);
              return db.rollback(() => res.status(500).json({ error: 'Transaction commit failed' }));
            }
            console.log(`✅ Order ${orderId} items updated successfully (no items)`);
            res.json({ success: true });
          });
        });
        return;
      }

      items.forEach((item) => {
        if (itemsError) return;

        const orderItemSql = `INSERT INTO order_items (order_id, food_id, quantity, price) VALUES (?, ?, ?, ?)`;
        db.query(orderItemSql, [orderId, item.food_id, item.quantity, item.price], (err, itemResult) => {
          if (itemsError) return;
          
          if (err) {
            console.error('❌ Order item update error:', err);
            itemsError = true;
            return db.rollback(() => res.status(500).json({ error: 'Failed to update order items: ' + err.message }));
          }

          console.log(`✅ Order item updated for food_id ${item.food_id}`);
          itemsCompleted++;
          
          if (itemsCompleted === items.length) {
            // Update the order's updated_at timestamp
            db.query('UPDATE orders SET updated_at = NOW() WHERE orders_id = ?', [orderId], (err) => {
              if (err) {
                console.error('❌ Error updating order timestamp:', err);
                return db.rollback(() => res.status(500).json({ error: 'Failed to update order timestamp' }));
              }
              
              db.commit(err => {
                if (err) {
                  console.error('❌ Transaction commit error:', err);
                  return db.rollback(() => res.status(500).json({ error: 'Transaction commit failed' }));
                }

                console.log(`✅ Order ${orderId} items updated successfully with ${items.length} items`);
                res.json({ success: true });
              });
            });
          }
        });
      });
    });
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

    // Get the complete order data with items
    const sql = `
      SELECT 
        o.*,
        oi.orderitems_id,
        oi.food_id,
        oi.quantity,
        oi.price,
        f.food_name
      FROM orders o
      LEFT JOIN order_items oi ON o.orders_id = oi.order_id
      LEFT JOIN food f ON oi.food_id = f.food_id
      WHERE o.orders_id = ?
      ORDER BY oi.orderitems_id ASC
    `;

    db.query(sql, [orderId], (err, orderResult) => {
      if (err) {
        console.error('❌ Order lookup error:', err);
        return db.rollback(() => res.status(500).json({ error: 'Database error' }));
      }
      
      if (orderResult.length === 0) {
        return db.rollback(() => res.status(404).json({ error: 'Order not found' }));
      }

      const order = orderResult[0];
      console.log(`✅ Found order ${orderId}, proceeding with archive`);

      // Collect order items for JSON storage
      const orderItems = orderResult
        .filter(row => row.food_id) // Only include rows with food items
        .map(row => ({
          orderitems_id: row.orderitems_id,
          food_id: row.food_id,
          food_name: row.food_name,
          quantity: row.quantity,
          price: row.price
        }));

      // Insert into orders_archive with orders_items field
      const archiveQuery = `
        INSERT INTO orders_archive (
          original_order_id, customer_email, total_amount, payment_id, 
          delivery_address, contact_number, order_status, payment_method, 
          gcash_details, orders_items, created_at, updated_at, archived_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        JSON.stringify(orderItems), // Store the items as JSON
        order.created_at,
        order.updated_at,
        archivedBy || 'admin'
      ], (err, archiveResult) => {
        if (err) {
          console.error('❌ Error archiving order:', err);
          return db.rollback(() => res.status(500).json({ error: 'Failed to archive order: ' + err.message }));
        }

        console.log(`✅ Archived order ${orderId} to orders_archive with ID ${archiveResult.insertId}`);

        // Delete order items first
        db.query('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
          if (err) {
            console.error('❌ Error deleting order items:', err);
            return db.rollback(() => res.status(500).json({ error: 'Failed to delete order items' }));
          }

          // Delete original order
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

              // Log admin action
              const adminIdentifier = archivedBy || 'admin';
              logAdminAction(adminIdentifier, `Archived order ${orderId} (archived_id: ${archiveResult.insertId})`);

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
  const query = `SELECT * FROM orders_archive ORDER BY archived_at DESC`;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching archived orders:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Parse orders_items JSON field for each archived order
    const ordersWithItems = results.map(order => {
      let items = [];
      try {
        if (order.orders_items) {
          items = JSON.parse(order.orders_items);
        }
      } catch (err) {
        console.error('Error parsing orders_items JSON:', err);
        items = [];
      }
      return { ...order, items };
    });
    
    res.json(ordersWithItems);
  });
});

// Get archived orders for a specific customer
app.get('/api/orders/archived/customer/:email', (req, res) => {
  const { email } = req.params;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  console.log(`📋 Fetching archived orders for customer: ${email}`);

  const query = `SELECT * FROM orders_archive WHERE customer_email = ? ORDER BY archived_at DESC`;
  
  db.query(query, [email], (err, orderResults) => {
    if (err) {
      console.error('Error fetching customer archived orders:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log(`🔍 Found ${orderResults.length} archived orders for ${email}:`, orderResults);

    // Parse orders_items JSON field for each archived order
    const ordersWithItems = orderResults.map(order => {
      let items = [];
      try {
        if (order.orders_items) {
          items = JSON.parse(order.orders_items);
        }
      } catch (err) {
        console.error('Error parsing orders_items JSON:', err);
        items = [];
      }
      return { ...order, items };
    });

    console.log(`✅ Returning ${ordersWithItems.length} orders with items`);
    res.json(ordersWithItems);
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
  const { admin_email } = req.body;
  
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
                  
                  // Log admin action
                  const adminIdentifier = admin_email || 'admin';
                  logAdminAction(adminIdentifier, `Archived food item: ${food.food_name} (ID: ${foodId}) and ${stockDeleteResult.affectedRows} stock records`);
                  
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
                
                // Log admin action
                const adminIdentifier = admin_email || 'admin';
                logAdminAction(adminIdentifier, `Archived food item: ${food.food_name} (ID: ${foodId}) with no stock records`);
                
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
  const { admin_email } = req.body;
  
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
                
                // Log admin action
                const adminIdentifier = admin_email || 'admin';
                logAdminAction(adminIdentifier, `Restored food item: ${archivedFood.food_name} (ID: ${foodId}) from archive`);
                
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
  const { food_name, category, price, admin_id, admin_email } = req.body;

  console.log(`🔍 Add food request body:`, req.body);
  console.log(`🔍 Extracted values - admin_id: "${admin_id}", admin_email: "${admin_email}"`);

  if (!food_name || !category || !price) {
    return res.status(400).json({ error: 'Food name, category and price are required' });
  }

  const query = 'INSERT INTO food (food_name, category, price) VALUES (?, ?, ?)';
  db.query(query, [food_name, category, price], (err, result) => {
    if (err) {
      console.error('Error adding food:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Log admin action
    const adminIdentifier = admin_email || admin_id || 'admin';
    logAdminAction(adminIdentifier, `Added new food item: ${food_name} (ID: ${result.insertId})`);
    
    res.json({ success: true, food_id: result.insertId });
  });
});

app.put('/api/food/:id', (req, res) => {
  const foodId = req.params.id;
  const { food_name, category, price, admin_id, admin_email } = req.body;

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
    
    // Log admin action
    const adminIdentifier = admin_email || admin_id || 'admin';
    logAdminAction(adminIdentifier, `Updated food item: ${food_name} (ID: ${foodId})`);
    
    res.json({ success: true });
  });
});

app.delete('/api/food/:id', (req, res) => {
  const foodId = req.params.id;
  const { admin_id, admin_email } = req.body;

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
              
              // Log admin action
              const adminIdentifier = admin_email || admin_id || 'admin';
              logAdminAction(adminIdentifier, `Deleted food item (ID: ${foodId}) and ${stockDeleteResult.affectedRows} stock records`);
              
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
            
            // Log admin action
            const adminIdentifier = admin_email || admin_id || 'admin';
            logAdminAction(adminIdentifier, `Deleted food item (ID: ${foodId}) with no stock records`);
            
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
  const { food_id, admin_id, quantity, admin_email } = req.body;

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
        
        // Log admin action
        const adminIdentifier = admin_email || admin_id;
        logAdminAction(adminIdentifier, `Updated stock for food ID ${food_id} to quantity ${quantity}`);
        
        res.json({ success: true, stocks_id: existing[0].stocks_id });
      });
    } else {
      const query = 'INSERT INTO stocks (food_id, admin_id, quantity) VALUES (?, ?, ?)';
      db.query(query, [food_id, admin_id, quantity], (err, result) => {
        if (err) {
          console.error('Error adding stock:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Log admin action
        const adminIdentifier = admin_email || admin_id;
        logAdminAction(adminIdentifier, `Created new stock for food ID ${food_id} with quantity ${quantity}`);
        
        res.json({ success: true, stocks_id: result.insertId });
      });
    }
  });
});

app.put('/api/stocks/:id', (req, res) => {
  const stockId = req.params.id;
  const { quantity, admin_id, admin_email } = req.body;

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
    
    // Log admin action
    const adminIdentifier = admin_email || admin_id || 'admin';
    logAdminAction(adminIdentifier, `Updated stock ID ${stockId} to quantity ${quantity}`);
    
    res.json({ success: true });
  });
});

// ========================== SERVER ================================
app.listen(5000, () => {
  console.log('🚀 Server running at http://localhost:5000');
});
