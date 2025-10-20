import React, { useEffect, useState } from 'react';
import logo from '../../assets/logo.jpg';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Header = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState('John Doe');
  const [userInitials, setUserInitials] = useState('JD');
  const [profilePicture, setProfilePicture] = useState('');

  useEffect(() => {
    const updateProfileData = () => {
      const storedFullName = localStorage.getItem('userFullName');
      const storedInitials = localStorage.getItem('userInitials');
      const email = localStorage.getItem('userEmail') || '';
      const namespacedKey = email ? `userProfilePicture:${email}` : 'userProfilePicture';
      const storedProfilePicture = localStorage.getItem(namespacedKey) || '';
      if (storedFullName && storedInitials) {
        setUserName(storedFullName);
        setUserInitials(storedInitials);
      }
      setProfilePicture(storedProfilePicture);
    };

    // Initial load
    updateProfileData();

    // Listen for localStorage changes
    const handleStorageChange = (e) => {
      const email = localStorage.getItem('userEmail') || '';
      const namespacedKey = email ? `userProfilePicture:${email}` : 'userProfilePicture';
      if (e.key === namespacedKey || e.key === 'userProfilePicture' || e.key === 'userFullName' || e.key === 'userInitials') {
        updateProfileData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (for same-tab updates)
    window.addEventListener('profileUpdated', updateProfileData);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdated', updateProfileData);
    };
  }, []);

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
            <a href="/cart" className="text-black border-b-2 border-black px-3 py-2 text-base">Cart</a>
            <div className="relative ml-4">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center space-x-2 text-gray-700 hover:text-black focus:outline-none">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span 
                    className={`text-base font-medium ${profilePicture ? 'hidden' : 'flex items-center justify-center'}`}
                    style={{ display: profilePicture ? 'none' : 'flex' }}
                  >
                    {userInitials}
                  </span>
                </div>
                <span className="text-base">{userName}</span>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-md">
                  <a href="/profile" className="block px-4 py-3 text-gray-700 hover:bg-gray-100">Your Profile</a>
                  <a href="/" className="block px-4 py-3 text-red-600 hover:bg-gray-100" onClick={() => {
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('userName');
                    localStorage.removeItem('userFullName');
                    localStorage.removeItem('userInitials');
                    localStorage.removeItem('userPhone');
                    localStorage.removeItem('userAddress');
                    localStorage.removeItem('userBirthday');
                    window.location.href='/';
                  }}>Sign out</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) return;
    const cartKey = `cartItems_${userEmail}`;
    const stored = localStorage.getItem(cartKey);
    if (stored) {
      setCartItems(JSON.parse(stored));
    }
  }, []);

  const updateCart = (items) => {
    setCartItems(items);
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) return;
    const cartKey = `cartItems_${userEmail}`;
    localStorage.setItem(cartKey, JSON.stringify(items));
  };

  const handleQuantity = (food_id, delta) => {
    const updated = cartItems.map(item =>
      item.food_id === food_id
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    );
    updateCart(updated);
  };

  const handleRemove = (food_id) => {
    const updated = cartItems.filter(item => item.food_id !== food_id);
    updateCart(updated);
  };

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-8">
      <div className="absolute top-0 left-0 w-full">
        <Header />
      </div>
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-10 border border-gray-100 mt-32">
        <h1 className="text-4xl font-extrabold text-black mb-10 text-center tracking-tight">Your Cart</h1>
        {cartItems.length === 0 ? (
          <div className="text-center text-gray-500 text-lg py-16">Your cart is empty.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full mb-10 border-separate border-spacing-y-2">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-4 text-left text-gray-700 font-semibold text-lg">Food</th>
                  <th className="py-4 text-center text-gray-700 font-semibold text-lg">Price</th>
                  <th className="py-4 text-center text-gray-700 font-semibold text-lg">Quantity</th>
                  <th className="py-4 text-center text-gray-700 font-semibold text-lg">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map(item => (
                  <tr key={item.food_id} className="bg-white shadow rounded-lg hover:bg-gray-50 transition">
                    <td className="py-4 px-4 text-base text-black font-medium rounded-l-lg">{item.food_name}</td>
                    <td className="py-4 px-4 text-center text-base text-gray-800">₱{parseFloat(item.price).toFixed(2)}</td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleQuantity(item.food_id, -1)} className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold text-lg">-</button>
                        <span className="px-2 text-lg font-semibold">{item.quantity}</span>
                        <button onClick={() => handleQuantity(item.food_id, 1)} className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold text-lg">+</button>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-base text-black font-semibold">₱{(item.price * item.quantity).toFixed(2)}</td>
                    <td className="py-4 px-4 text-center rounded-r-lg">
                      <button onClick={() => handleRemove(item.food_id)} className="text-red-500 hover:text-red-700 font-semibold px-3 py-1 rounded-lg transition">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4">
          <button
            onClick={() => navigate('/foodmenu')}
            className="bg-gray-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-600 transition text-lg shadow"
          >
            Back to Menu
          </button>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-extrabold text-black">
              Total: ₱{total.toFixed(2)}
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cartItems.length === 0}
              className={`px-8 py-3 rounded-lg font-bold transition text-lg shadow ${
                cartItems.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-black hover:bg-gray-900 text-white'
              }`}
            >
              Proceed to Payment
            </button>
            {/* Payment Option Modal */}
            {showPaymentModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center">
                  <h3 className="text-2xl font-bold mb-6 text-center">Choose Payment Method</h3>
                  <button
                    className="w-full mb-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white py-3 rounded-lg font-bold text-lg hover:from-emerald-700 hover:to-green-900 transition shadow-xl"
                    onClick={() => { setShowPaymentModal(false); navigate('/payment-cod'); }}
                  >
                    Cash on Delivery
                  </button>
                  <button
                    className="w-full mb-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-blue-900 transition shadow-xl"
                    onClick={() => { setShowPaymentModal(false); navigate('/online-payment'); }}
                  >
                    GCASH / Online Payment
                  </button>
                  <button
                    className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold mt-2 hover:bg-gray-400 transition"
                    onClick={() => setShowPaymentModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart; 