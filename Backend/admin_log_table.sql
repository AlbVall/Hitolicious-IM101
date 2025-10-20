-- Drop the existing admin_log table if it exists
DROP TABLE IF EXISTS admin_log;

-- Create the admin_log table with proper structure
CREATE TABLE admin_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    Admin_name VARCHAR(255) NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Add an index for better performance when querying by admin name
CREATE INDEX idx_admin_name ON admin_log(Admin_name);

-- Optional: Add an index for better performance when querying by date
CREATE INDEX idx_created_at ON admin_log(created_at);
