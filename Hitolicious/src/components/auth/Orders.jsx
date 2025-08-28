import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      navigate('/');
      return;
    }

    fetchOrders(userEmail);
  }, [navigate]);

  const fetchOrders = async (userEmail) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/orders/customer/${userEmail}`);
      // Sort orders by creation date (newest first)
      const sortedOrders = response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOrders(sortedOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-orange-100 text-orange-800';
      case 'out_for_delivery':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-black">Your Orders</h1>
            <p className="mt-3 text-xl text-gray-600">
              Track your food orders and delivery status
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🍽️</div>
              <h2 className="text-2xl font-bold text-black mb-4">No Orders Yet</h2>
              <p className="text-gray-600 mb-8">Start your culinary journey by placing your first order!</p>
              <button
                onClick={() => navigate('/foodmenu')}
                className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-900 transition"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.orders_id} className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-black">Order #{order.orders_id}</h3>
                        <p className="text-gray-600 text-sm">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.order_status)}`}>
                          {order.order_status.replace('_', ' ').toUpperCase()}
                        </div>
                        <p className="text-lg font-bold text-black mt-2">₱{parseFloat(order.total_amount).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <h4 className="font-semibold text-black mb-3">Order Items:</h4>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={`${order.orders_id}-${item.food_id}`} className="flex justify-between items-center">
                            <div>
                              <span className="font-medium text-black">{item.food_name}</span>
                              <span className="text-gray-500 ml-2">x{item.quantity}</span>
                            </div>
                            <span className="font-semibold text-black">₱{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Delivery Address:</span>
                          <p className="text-black font-medium">{order.delivery_address}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Contact Number:</span>
                          <p className="text-black font-medium">{order.contact_number}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">Payment Method:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.payment_method === 'gcash'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {order.payment_method === 'gcash' ? 'GCash' : 'Cash on Delivery'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/foodmenu')}
              className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-900 transition"
            >
              Order More Food
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
