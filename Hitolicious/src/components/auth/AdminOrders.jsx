import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.jpg';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminData');
    navigate('/adminsignin');
  };

  const menuItems = [
    { name: 'Food Menu', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
    ), path: '/adminFoodDashboard' },
    { name: 'Food Details', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
    ), path: '/adminFoodDetails' },
    { name: 'Best Sellers', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 17.75L18.2 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.44 4.73L5.8 21z" /></svg>
    ), path: '/adminBestSellers' },
    { name: 'Orders', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h4a4 4 0 014 4v2M9 17H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4" /></svg>
    ), path: '/adminOrders' },
    { name: 'GCash Settings', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
    ), path: '/adminSettings' },
    { name: 'Logout', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
    ), path: '/', action: handleLogout },
  ];

  useEffect(() => {
    // Check for admin session
    const storedAdminData = localStorage.getItem('adminData');
    if (!storedAdminData) {
      navigate('/admin/signin');
      return;
    }
    try {
      const parsedAdminData = JSON.parse(storedAdminData);
      console.log('Admin data loaded:', parsedAdminData);
      setAdminData(parsedAdminData);
    } catch (error) {
      console.error('Error parsing admin data:', error);
      navigate('/admin/signin');
    }
    fetchOrders();
  }, [navigate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/orders');
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    if (!orderId) {
      alert('Order ID missing. Cannot update status.');
      return;
    }

    try {
      setUpdatingOrder(orderId);
      await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, {
        status: newStatus,
      });

      setOrders((prev) =>
        prev.map((order) =>
          order.orders_id === orderId ? { ...order, order_status: newStatus } : order
        )
      );
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('Failed to update order status.');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const archiveOrder = async (orderId) => {
    if (!orderId) return;

    if (!window.confirm('Are you sure you want to archive this order?')) return;

    try {
      setUpdatingOrder(orderId);
      await axios.post(`http://localhost:5000/api/orders/${orderId}/archive`, {
        archivedBy: adminData?.admin_fullname || adminData?.admin_email || 'admin',
      });

      setOrders((prev) => prev.filter((order) => order.orders_id !== orderId));
    } catch (err) {
      console.error('Failed to archive order:', err);
      alert('Archive failed. Try again.');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'out_for_delivery':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFilteredOrders = () => {
    if (selectedStatus === 'all') return orders;
    return orders.filter(
      (order) =>
        order.order_status?.toLowerCase() === selectedStatus.toLowerCase()
    );
  };

  const getPendingOrders = () => {
    return orders.filter(order => order.order_status?.toLowerCase() === 'pending');
  };

  const getOtherOrders = () => {
    return orders.filter(order => order.order_status?.toLowerCase() !== 'pending');
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const renderOrderTable = (orders, title, emptyMessage) => (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.orders_id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">#{order.orders_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.customer_email}</div>
                    <div className="text-sm text-gray-500">{order.contact_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="mb-1">
                          {item.food_name} x{item.quantity}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">₱{parseFloat(order.total_amount).toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700 max-w-xs truncate" title={order.notes}>{order.notes || <span className="text-gray-400 italic">No notes</span>}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.order_status)}`}>
                      {order.order_status?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {order.order_status !== 'delivered' && order.order_status !== 'cancelled' && (
                        <select
                          value={order.order_status}
                          onChange={(e) => updateOrderStatus(order.orders_id, e.target.value)}
                          disabled={updatingOrder === order.orders_id}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {(order.order_status === 'delivered' || order.order_status === 'cancelled') && (
                        <button
                          onClick={() => archiveOrder(order.orders_id)}
                          disabled={updatingOrder === order.orders_id}
                          className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors duration-200 disabled:opacity-50"
                        >
                          {updatingOrder === order.orders_id ? 'Archiving...' : 'Archive'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-black text-white">
          <div className="p-6 border-b border-gray-800 flex flex-col items-center">
            <img src={logo} alt="Hitolicious Logo" className="h-32 w-auto object-contain mb-2 shadow-lg bg-white p-6" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl text-gray-600">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-black text-white">
        <div className="p-6 border-b border-gray-800 flex flex-col items-center">
          <img src={logo} alt="Hitolicious Logo" className="h-32 w-auto object-contain mb-2 shadow-lg bg-white p-6" />
        </div>
        <nav className="mt-6">
          {menuItems.filter(item => item.name !== 'Logout').map((item) => (
            <button
              key={item.name}
              onClick={() => {
                navigate(item.path);
              }}
              className={`w-full flex items-center gap-4 px-6 py-4 text-lg font-medium transition-colors duration-200 rounded-lg mb-2 hover:bg-gray-800 focus:bg-gray-800 ${
                (item.name === 'Orders') ? 'bg-gray-800 text-white' : 'text-gray-200'
              }`}
            >
              <span>{item.icon}</span>
              {item.name}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 text-lg font-medium text-red-400 rounded-lg transition-colors duration-200 hover:bg-gray-800 mb-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
            Logout
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-8 py-4 flex justify-between items-center">
            <h2 className="text-3xl font-bold text-gray-800">Order Management</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-2xl font-semibold">
                  {adminData?.admin_fullname?.charAt(0) || 'A'}
                </div>
                <div className="ml-3">
                  <p className="text-base font-medium text-gray-700">{adminData?.admin_fullname || 'Admin'}</p>
                  <p className="text-sm text-gray-500">{adminData?.admin_email || 'admin@example.com'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-8 overflow-auto" style={{ height: 'calc(100vh - 73px)' }}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                  <p className="text-2xl font-semibold text-gray-900">{getPendingOrders().length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-semibold text-gray-900">{orders.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Delivered</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {orders.filter(o => o.order_status === 'delivered').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Cancelled</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {orders.filter(o => o.order_status === 'cancelled').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">All Orders</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pending Orders Table */}
          <div className="mb-8">
            {renderOrderTable(
              getPendingOrders(),
              `Pending Orders (${getPendingOrders().length})`,
              'No pending orders at the moment.'
            )}
          </div>

          {/* Other Orders Table */}
          <div className="mb-8">
            {renderOrderTable(
              getOtherOrders(),
              `Other Orders (${getOtherOrders().length})`,
              'No other orders at the moment.'
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminOrders;
