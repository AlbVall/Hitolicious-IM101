import React, { useEffect, useState } from 'react';
import logo from '../../assets/logo.jpg';
import { useNavigate } from 'react-router-dom';

const defaultBestSellers = [
  {
    name: 'Signature Kare-Kare',
    description: 'A Filipino classic with rich peanut sauce and tender oxtail.',
    image: logo,
    price: '350.00',
  },
  {
    name: 'Crispy Pata',
    description: 'Deep-fried pork leg, crispy on the outside, juicy on the inside.',
    image: logo,
    price: '480.00',
  },
  {
    name: 'Leche Flan',
    description: 'Creamy caramel custard dessert, a sweet Filipino favorite.',
    image: logo,
    price: '120.00',
  },
];

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

const AdminBestSellers = () => {
  const [bestSellers, setBestSellers] = useState(defaultBestSellers);
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', image: '' });
  const [imageMode, setImageMode] = useState('url');
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('Best Sellers');
  const [adminData, setAdminData] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('bestSellers');
    if (stored) {
      setBestSellers(JSON.parse(stored));
    }

    // Load admin data
    const storedAdminData = localStorage.getItem('adminData');
    if (storedAdminData) {
      const admin = JSON.parse(storedAdminData);
      setAdminData(admin);
      
      // Get admin-specific profile picture from localStorage
      const adminEmail = admin.admin_email || '';
      const namespacedKey = adminEmail ? `adminProfilePicture:${adminEmail}` : 'adminProfilePicture';
      const adminProfilePicture = localStorage.getItem(namespacedKey) || '';
      setProfilePicture(adminProfilePicture);
    } else {
      navigate('/adminSignin');
    }
  }, [navigate]);

  const handleEdit = (idx) => {
    setEditingIndex(idx);
    setForm({
      name: bestSellers[idx].name,
      description: bestSellers[idx].description,
      price: bestSellers[idx].price,
      image: bestSellers[idx].image,
    });
    setImageMode(bestSellers[idx].image?.startsWith('data:') ? 'upload' : 'url');
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setForm({ name: '', description: '', price: '', image: '' });
    setImageMode('url');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const updated = bestSellers.map((item, idx) =>
      idx === editingIndex ? { ...form } : item
    );
    setBestSellers(updated);
    localStorage.setItem('bestSellers', JSON.stringify(updated));
    setEditingIndex(null);
    setForm({ name: '', description: '', price: '', image: '' });
    setImageMode('url');
  };


  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-black text-white">
        <div className="p-6 border-b border-gray-800 flex flex-col items-center">
          <img src={logo} alt="Hitolicious Logo" className="h-32 w-auto object-contain mb-2 shadow-lg bg-white p-6" />
        </div>
        <nav className="mt-6">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 px-6 py-4 text-lg font-medium transition-colors duration-200 rounded-lg mb-2 hover:bg-gray-800 focus:bg-gray-800 ${
                (item.name === activeMenu) ? 'bg-gray-800 text-white' : 'text-gray-200'
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
            <h2 className="text-3xl font-bold text-gray-800">{activeMenu}</h2>
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
                    <a href="/adminprofile" className="block px-4 py-3 text-gray-700 hover:bg-gray-100">Your Profile</a>
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
        <main className="p-8 overflow-auto" style={{ height: 'calc(100vh - 73px)' }}>
          <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl p-10 border border-gray-200 relative mx-auto">
            <h1 className="text-4xl font-extrabold text-black mb-12 text-center tracking-tight sticky top-0 bg-white z-10 py-4 border-b border-gray-100">Edit Best Sellers</h1>
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {bestSellers.map((item, idx) => (
                <div key={idx} className="bg-gradient-to-b from-gray-50 to-white rounded-2xl shadow-lg p-8 flex flex-col items-center border border-gray-200 hover:shadow-2xl transition group">
                  <div className="w-full h-48 rounded-xl overflow-hidden bg-gray-100 mb-6 flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <span className="text-gray-400 text-lg">No Image Available</span>
                    )}
                  </div>
                  {editingIndex === idx ? (
                    <>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full mb-3 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-black bg-white font-semibold text-lg placeholder-gray-400"
                        placeholder="Name"
                      />
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        className="w-full mb-3 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-black bg-white font-medium placeholder-gray-400"
                        placeholder="Description"
                      />
                      <input
                        type="number"
                        name="price"
                        value={form.price}
                        onChange={handleChange}
                        className="w-full mb-3 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-black bg-white font-semibold placeholder-gray-400"
                        placeholder="Price"
                        min="0"
                        step="0.01"
                      />
                      <div className="w-full mb-3">
                        <label className="block text-xs font-semibold mb-1 text-gray-700">Image</label>
                        <div className="flex space-x-2 mb-2">
                          <button
                            className={`px-3 py-1 rounded-lg border font-semibold transition ${imageMode === 'url' ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:bg-gray-100'}`}
                            onClick={() => setImageMode('url')}
                            type="button"
                          >
                            URL
                          </button>
                          <button
                            className={`px-3 py-1 rounded-lg border font-semibold transition ${imageMode === 'upload' ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:bg-gray-100'}`}
                            onClick={() => setImageMode('upload')}
                            type="button"
                          >
                            Upload
                          </button>
                        </div>
                        {imageMode === 'url' ? (
                          <input
                            type="text"
                            name="image"
                            value={form.image}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-black bg-white placeholder-gray-400"
                            placeholder="Image URL"
                          />
                        ) : (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="w-full"
                          />
                        )}
                      </div>
                      <div className="flex space-x-2 mt-2 w-full">
                        <button
                          onClick={handleSave}
                          className="flex-1 bg-black hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-bold transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex-1 bg-white hover:bg-gray-200 text-black border border-gray-400 px-4 py-2 rounded-lg font-bold transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-black mb-2 text-center">{item.name}</h2>
                      <p className="text-gray-700 text-sm mb-3 text-center font-medium">{item.description}</p>
                      <span className="text-lg font-extrabold text-black mb-3 block">₱{item.price}</span>
                      <button
                        onClick={() => handleEdit(idx)}
                        className="mt-2 w-full bg-black hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-bold transition"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminBestSellers; 