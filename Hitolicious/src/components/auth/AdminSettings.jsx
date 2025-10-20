import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.jpg';

const AdminSettings = () => {
  const [qrImage, setQrImage] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [gcashName, setGcashName] = useState('');
  const [gcashNumber, setGcashNumber] = useState('');
  const [success, setSuccess] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');
  const navigate = useNavigate();

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
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminData');
    navigate('/adminSignin');
  };

  useEffect(() => {
    // Check for admin session
    const storedAdminData = localStorage.getItem('adminData');
    if (storedAdminData) {
      try {
        const admin = JSON.parse(storedAdminData);
        setAdminData(admin);
        
        // Get admin-specific profile picture from localStorage
        const adminEmail = admin.admin_email || '';
        const namespacedKey = adminEmail ? `adminProfilePicture:${adminEmail}` : 'adminProfilePicture';
        const adminProfilePicture = localStorage.getItem(namespacedKey) || '';
        setProfilePicture(adminProfilePicture);
      } catch (e) {
        setAdminData(null);
      }
    }
  }, []);

  // Load existing GCash settings (QR, name, number) from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gcashSettings');
      if (saved) {
        const data = JSON.parse(saved);
        setGcashName(data.gcashName || '');
        setGcashNumber(data.gcashNumber || '');
        if (data.qrImageDataUrl) {
          setQrPreview(data.qrImageDataUrl);
        }
      }
    } catch (_) {
      // ignore parse errors
    }
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setQrImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Save a preview as base64 data URL (also used for persistence)
        setQrPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setQrPreview(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Persist settings locally so OnlinePayment can read them
    const payload = {
      gcashName,
      gcashNumber,
      // store the image as a base64 data URL for easy rendering later
      qrImageDataUrl: qrPreview || null,
    };
    try {
      localStorage.setItem('gcashSettings', JSON.stringify(payload));
    } catch (_) {
      // If storage fails, still show success to avoid blocking UX; consider adding a user-facing error
    }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-black text-white flex flex-col">
        <div className="p-6 border-b border-gray-800 flex flex-col items-center">
          <img src={logo} alt="Hitolicious Logo" className="h-32 w-auto object-contain mb-2 shadow-lg bg-white p-6" />
        </div>
        <nav className="mt-6">
          {menuItems.filter(item => item.name !== 'Logout').map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 px-6 py-4 text-lg font-medium transition-colors duration-200 rounded-lg mb-2 hover:bg-gray-800 focus:bg-gray-800 ${
                item.name === 'GCash Settings' ? 'bg-gray-800 text-white' : 'text-gray-200'
              }`}
            >
              <span>{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-8 py-4 flex justify-between items-center">
            <h2 className="text-3xl font-bold text-gray-800">GCash Payment Settings</h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)} 
                  className="flex items-center space-x-2 text-gray-700 hover:text-black focus:outline-none"
                >
                  <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center text-2xl font-semibold overflow-hidden border border-gray-300">
                    {profilePicture ? (
                      <img 
                        src={profilePicture} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextSibling;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span 
                      className="text-2xl font-semibold"
                      style={{ display: profilePicture ? 'none' : 'flex' }}
                    >
                      {adminData?.admin_fullname?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-base font-medium text-gray-700">{adminData?.admin_fullname || 'Admin'}</p>
                    <p className="text-sm text-gray-500">{adminData?.admin_email || 'admin@example.com'}</p>
                  </div>
                </button>
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-md">
                    <a href="/AdminProfile" className="block px-4 py-3 text-gray-700 hover:bg-gray-100">Your Profile</a>
                    <a href="/adminSignin" className="block px-4 py-3 text-red-600 hover:bg-gray-100" onClick={() => {
                      localStorage.removeItem('adminData');
                      window.location.href='/adminSignin';
                    }}>Sign out</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-8 flex justify-center items-start overflow-auto" style={{ height: 'calc(100vh - 73px)' }}>
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block font-semibold mb-2 text-gray-700">GCash QR Image</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-black" />
                {qrPreview && (
                  <img src={qrPreview} alt="QR Preview" className="mt-4 w-full max-h-[400px] object-contain rounded-lg border border-gray-200 shadow" />
                )}
              </div>
              <div className="mb-6">
                <label className="block font-semibold mb-2 text-gray-700">GCash Name</label>
                <input
                  type="text"
                  value={gcashName}
                  onChange={(e) => setGcashName(e.target.value)}
                  placeholder="Enter GCash account name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="mb-6">
                <label className="block font-semibold mb-2 text-gray-700">GCash Number</label>
                <input
                  type="text"
                  value={gcashNumber}
                  onChange={(e) => setGcashNumber(e.target.value)}
                  placeholder="Enter GCash number"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <button type="submit" className="w-full bg-black text-white py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors">Save Changes</button>
              {success && <div className="mt-4 text-green-600 font-semibold text-center">Settings updated!</div>}
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminSettings;
