import React, { useState, useEffect } from 'react';
import logo from '../../assets/logo.jpg';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem('userFullName') || 'John Doe');
  const [userInitials, setUserInitials] = useState(localStorage.getItem('userInitials') || 'JD');

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between h-24">
          <div className="flex-shrink-0">
            <img src={logo} alt="Hitolicious" className="h-24 w-auto object-contain pl-2" />
          </div>
          <div className="hidden sm:flex sm:space-x-8 sm:items-center pr-8">
            <a href="/home" className="text-gray-700 hover:text-black px-3 py-2 text-base">Home</a>
            <a href="/foodmenu" className="text-gray-700 hover:text-black px-3 py-2 text-base">Menu</a>
            <a href="/order" className="text-gray-700 hover:text-black px-3 py-2 text-base">Order</a>
            <a href="/cart" className="text-gray-700 hover:text-black px-3 py-2 text-base">Cart</a>
            <div className="relative ml-4">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center space-x-2 text-gray-700 hover:text-black focus:outline-none">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-base font-medium">{userInitials}</span>
                </div>
                <span className="text-base">{userName}</span>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-md">
                  <a href="/profile" className="block px-4 py-3 text-gray-700 hover:bg-gray-100">Your Profile</a>
                  <a href="/account" className="block px-4 py-3 text-gray-700 hover:bg-gray-100">Account Settings</a>
                  <a href="/" className="block px-4 py-3 text-red-600 hover:bg-gray-100" onClick={() => {localStorage.removeItem('userEmail');localStorage.removeItem('userName');window.location.href='/';}}>Sign out</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

const OnlinePayment = () => {
  const [form, setForm] = useState({
    address: '',
    contact: '',
    note: '',
    gcashName: '',
    gcashNumber: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();
  // Shop GCash info loaded from AdminSettings (localStorage)
  const [shopGcashName, setShopGcashName] = useState('');
  const [shopGcashNumber, setShopGcashNumber] = useState('');
  const [shopQrImage, setShopQrImage] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gcashSettings');
      if (saved) {
        const data = JSON.parse(saved);
        setShopGcashName(data.gcashName || '');
        setShopGcashNumber(data.gcashNumber || '');
        setShopQrImage(data.qrImageDataUrl || null);
      }
    } catch (_) {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) return;
    const cartKey = `cartItems_${userEmail}`;
    const stored = localStorage.getItem(cartKey);
    if (stored) {
      setCartItems(JSON.parse(stored));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.address || !form.contact || !form.gcashName || !form.gcashNumber) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const userEmail = localStorage.getItem('userEmail') || '';
      const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const gcashDetails = JSON.stringify({ name: form.gcashName, number: form.gcashNumber });
      const orderPayload = {
        customer_email: userEmail,
        items: cartItems,
        total_amount: totalAmount,
        delivery_address: form.address,
        contact_number: form.contact,
        notes: form.note,
        payment_method: 'gcash',
        currency: 'PHP',
        gcash_details: gcashDetails
      };
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      if (!response.ok) throw new Error('Failed to place order');
      setSuccess(true);
      
      // Clear cart after successful order
      const cartKey = `cartItems_${userEmail}`;
      localStorage.removeItem(cartKey);
      setCartItems([]);
    } catch (err) {
      setError('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="absolute top-0 left-0 w-full z-10">
        <Header />
      </div>
      <div className="flex items-center justify-center py-10 px-2">
        <div className="bg-white rounded-xl shadow-2xl flex flex-col md:flex-row w-full max-w-4xl overflow-hidden mt-32">
          {/* Left: Order Summary & QR */}
          <div className="md:w-1/2 w-full bg-gradient-to-br from-gray-50 to-gray-200 p-8 flex flex-col justify-between border-r border-gray-200">
            <div>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Order Summary</h2>
              {cartItems.length === 0 ? (
                <div className="text-gray-500 text-sm">No items in cart.</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {cartItems.map(item => (
                    <li key={item.food_id} className="py-3 flex justify-between items-center">
                      <span className="font-medium text-gray-800">{item.food_name} <span className="text-xs text-gray-500">x{item.quantity}</span></span>
                      <span className="font-semibold text-gray-900">₱{(item.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-300">
              <span className="font-bold text-gray-900 text-lg">Total</span>
              <span className="font-bold text-black text-2xl">
                ₱{cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
              </span>
            </div>
            <div className="mt-8 flex flex-col items-center">
              {shopQrImage ? (
                <img src={shopQrImage} alt="GCASH QR Code" className="w-48 h-48 object-contain border rounded-lg mb-4" />
              ) : (
                <div className="w-48 h-48 border rounded-lg mb-4 flex items-center justify-center text-gray-400 text-sm">
                  No QR image set
                </div>
              )}
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-700">Shop GCASH Name:</div>
                <div className="text-xl font-bold text-blue-700">{shopGcashName}</div>
                <div className="text-lg font-semibold text-gray-700 mt-2">Shop GCASH Number:</div>
                <div className="text-xl font-bold text-blue-700">{shopGcashNumber}</div>
              </div>
            </div>
          </div>
          {/* Right: Payment Form */}
          <form onSubmit={handleSubmit} className="md:w-1/2 w-full p-8 flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center md:text-left">Online Payment Details</h2>
            {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
            <div className="mb-4">
              <label className="block mb-1 font-medium">Delivery Address<span className="text-red-500">*</span></label>
              <textarea name="address" value={form.address} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Contact Number<span className="text-red-500">*</span></label>
              <input type="text" name="contact" value={form.contact} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Customer Note (Optional)</label>
              <textarea name="note" value={form.note} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Your GCASH Name<span className="text-red-500">*</span></label>
              <input type="text" name="gcashName" value={form.gcashName} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Your GCASH Number<span className="text-red-500">*</span></label>
              <input type="text" name="gcashNumber" value={form.gcashNumber} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-blue-900 transition shadow-xl disabled:opacity-60" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Payment'}
            </button>
            {/* Confirmation Modal */}
            {success && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center">
                  <svg className="w-16 h-16 text-green-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <h3 className="text-2xl font-bold mb-2 text-center">Payment Successful!</h3>
                  <p className="text-gray-600 mb-6 text-center">Thank you for your payment. Your order will be processed soon after the payment is reflected.</p>
                  <button
                    className="bg-black text-white px-8 py-2 rounded-lg font-bold text-lg hover:bg-gray-900 transition"
                    onClick={() => {
                      setSuccess(false);
                      navigate('/foodmenu');
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default OnlinePayment;
