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

// ====================== CUSTOMER & ADMIN AUTH ======================
app.post('/api/customer/signup', (req, res) => {
  const { fullName, birthday, email, password, phone, address } = req.body;

  // Use function for phone validation
  db.query('SELECT fn_validate_phone(?) as is_valid', [phone], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!result[0].is_valid) {
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

  // Use function for phone validation
  db.query('SELECT fn_validate_phone(?) as is_valid', [phone], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!result[0].is_valid) {
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

  // Use function for phone validation
  db.query('SELECT fn_validate_phone(?) as is_valid', [admin_phonenumber], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!result[0].is_valid) {
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

  // Use function for phone validation
  db.query('SELECT fn_validate_phone(?) as is_valid', [admin_phonenumber], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!result[0].is_valid) {
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
          updated_by: row.updated_by,
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
          updated_by: row.updated_by,
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

  // Use stored procedure for order creation
  db.query('CALL sp_create_order(?, ?, ?, ?, ?, ?, ?, ?, ?, @order_id, @payment_id)', 
    [customer_email, JSON.stringify(items), total_amount, delivery_address, contact_number, payment_method, notes, gcash_details, currency], 
    (err, result) => {
      if (err) {
        console.error('❌ Order creation error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // Get the output parameters
      db.query('SELECT @order_id as order_id, @payment_id as payment_id', (err, ids) => {
        if (err) {
          console.error('❌ Error getting order IDs:', err);
          return res.status(500).json({ error: 'Order created but failed to get IDs' });
        }
        
        console.log(`✅ Order ${ids[0].order_id} completed successfully with ${items.length} items`);
        res.json({ success: true, orderId: ids[0].order_id, paymentId: ids[0].payment_id });
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

    db.query('UPDATE orders SET order_status = ?, updated_at = NOW(), updated_by = ? WHERE orders_id = ?', [dbStatus, updated_by || admin_email || 'admin', orderId], (err, result) => {
      if (err) {
        console.error('❌ Order status update error:', err);
        return res.status(500).json({ error: err.message });
      }
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });

      // Log admin action
      const adminIdentifier = admin_email || updated_by || 'admin'; // Use admin email, name, or default to 'admin'
      // Note: Admin action logging is now handled automatically by triggers

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

  // Use stored procedure for order archiving
  db.query('CALL sp_archive_order(?, ?, @archive_id)', [orderId, archivedBy || 'admin'], (err, result) => {
    if (err) {
      console.error('❌ Order archiving error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Get the output parameter
    db.query('SELECT @archive_id as archive_id', (err, ids) => {
      if (err) {
        console.error('❌ Error getting archive ID:', err);
        return res.status(500).json({ error: 'Order archived but failed to get archive ID' });
      }
      
      console.log(`✅ Successfully archived order ${orderId}`);
      res.json({ 
        success: true, 
        message: 'Order archived successfully',
        archived_id: ids[0].archive_id
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
  
  // Use stored procedure for food archiving
  db.query('CALL sp_manage_food(?, ?, ?, @result_message)', [foodId, 'archive', admin_email || 'admin'], (err, result) => {
    if (err) {
      console.error('❌ Food archiving error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Get the result message
    db.query('SELECT @result_message as message', (err, msg) => {
      if (err) {
        console.error('❌ Error getting result message:', err);
        return res.status(500).json({ error: 'Food archived but failed to get result message' });
      }
      
      console.log(`✅ ${msg[0].message}`);
      res.json({ 
        success: true, 
        message: msg[0].message
      });
    });
  });
});

// Restore food from archive
app.post('/api/food/restore/:id', (req, res) => {
  const foodId = req.params.id;
  const { admin_email } = req.body;
  
  console.log(`🔄 Attempting to restore food with ID: ${foodId}`);
  
  // Use stored procedure for food restoration
  db.query('CALL sp_restore_food(?, ?, @result_message)', [foodId, admin_email || 'admin'], (err, result) => {
    if (err) {
      console.error('❌ Food restoration error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Get the result message
    db.query('SELECT @result_message as message', (err, msg) => {
      if (err) {
        console.error('❌ Error getting result message:', err);
        return res.status(500).json({ error: 'Food restored but failed to get result message' });
      }
      
      console.log(`✅ ${msg[0].message}`);
      res.json({ 
        success: true,
        message: msg[0].message,
        food: {
          food_id: foodId
        }
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
    
    // Log admin action with actual admin name
    db.query('CALL sp_log_admin_action_with_name(?, ?)', [admin_email || 'system@admin.com', `Added new food item: ${food_name} (ID: ${result.insertId})`], (err) => {
      if (err) console.error('Failed to log admin action:', err);
    });
    
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
    
    // Log admin action with actual admin name
    db.query('CALL sp_log_admin_action_with_name(?, ?)', [admin_email || 'system@admin.com', `Updated food item: ${food_name} (ID: ${foodId})`], (err) => {
      if (err) console.error('Failed to log admin action:', err);
    });
    
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
              // Note: Admin action logging is now handled automatically by triggers
              
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
            // Note: Admin action logging is now handled automatically by triggers
            
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

  // Use stored procedure for stock upsert
  db.query('CALL sp_upsert_stock(?, ?, ?, ?, @stocks_id)', [food_id, admin_id, quantity, admin_email || admin_id], (err, result) => {
    if (err) {
      console.error('❌ Stock upsert error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Get the stocks_id
    db.query('SELECT @stocks_id as stocks_id', (err, ids) => {
      if (err) {
        console.error('❌ Error getting stocks ID:', err);
        return res.status(500).json({ error: 'Stock updated but failed to get stocks ID' });
      }
      
      res.json({ success: true, stocks_id: ids[0].stocks_id });
    });
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
    // Note: Admin action logging is now handled automatically by triggers
    
    res.json({ success: true });
  });
});

// ========================== SERVER ================================
app.listen(5000, () => {
  console.log('🚀 Server running at http://localhost:5000');
});
