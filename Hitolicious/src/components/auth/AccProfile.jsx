import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.jpg';
import axios from 'axios';

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
        <div className="flex justify-between h-24 items-center px-2">
          <div className="flex-shrink-0 flex items-center">
            <img src={logo} alt="Hitolicious" className="h-24 w-auto object-contain pl-2" />
          </div>
          <div className="hidden sm:flex sm:space-x-8 sm:items-center pr-8">
            <a href="/home" className="text-gray-700 hover:text-black px-3 py-2 text-base">Home</a>
            <a href="/foodmenu" className="text-gray-700 hover:text-black px-3 py-2 text-base">Menu</a>
            <a href="/order" className="text-gray-700 hover:text-black px-3 py-2 text-base">Order</a>
            <a href="/cart" className="text-gray-700 hover:text-black px-3 py-2 text-base">Cart</a>
            <div className="relative ml-4">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center space-x-2 text-gray-700 hover:text-black focus:outline-none">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
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
                    className="text-base font-medium"
                    style={{ display: profilePicture ? 'none' : 'flex' }}
                  >
                    {userInitials}
                  </span>
                </div>
                <span className="text-base">{userName}</span>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-md z-10">
                  <a href="/profile" className="block px-4 py-3 text-black bg-gray-100 font-semibold">Your Profile</a>
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

const AccProfile = () => {
  const [user, setUser] = useState({
    fullName: '',
    email: '',
    birthday: '',
    phone: '',
    address: '',
    joinDate: '',
    profilePicture: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    birthday: '',
    profilePicture: ''
  });
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarMode, setAvatarMode] = useState('upload'); // 'upload' | 'url'
  const [tempProfilePicture, setTempProfilePicture] = useState('');
  const [tempUrl, setTempUrl] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [orderHistory, setOrderHistory] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const handleAvatarClick = () => {
    if (!isEditing) return;
    setAvatarError('');
    setTempProfilePicture(editForm.profilePicture || '');
    setTempUrl('');
    setAvatarMode('upload');
    setIsAvatarModalOpen(true);
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setTempProfilePicture(String(dataUrl));
      setAvatarError('');
    };
    reader.readAsDataURL(file);
  };

  const validateUrl = (url) => {
    try {
      const parsed = new URL(url);
      return /^https?:/.test(parsed.protocol);
    } catch {
      return false;
    }
  };

  const handleAvatarModalSave = () => {
    if (avatarMode === 'upload') {
      if (!tempProfilePicture) {
        setAvatarError('Please upload an image.');
        return;
      }
      setEditForm(prev => ({ ...prev, profilePicture: tempProfilePicture }));
    } else {
      if (!tempUrl || !validateUrl(tempUrl)) {
        setAvatarError('Please enter a valid http(s) image URL.');
        return;
      }
      setEditForm(prev => ({ ...prev, profilePicture: tempUrl }));
    }
    setIsAvatarModalOpen(false);
  };

  const handleAvatarModalClose = () => {
    setIsAvatarModalOpen(false);
  };

  const formatBirthday = (raw) => {
    if (!raw || raw === 'Not provided') return 'Not provided';
    // Accept common formats: ISO date, yyyy-mm-dd, with/without time
    const date = new Date(raw);
    if (isNaN(date.getTime())) return raw; // fallback to raw if unparsable
    return date.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit'
    });
  };

  useEffect(() => {
    // Check if user is logged in
    const userEmail = localStorage.getItem('userEmail');
    const userFullName = localStorage.getItem('userFullName');
    const userBirthday = localStorage.getItem('userBirthday');
    const userPhone = localStorage.getItem('userPhone');
    const userAddress = localStorage.getItem('userAddress');
    
    if (!userEmail) {
      navigate('/');
      return;
    }

    console.log('Profile data from localStorage:', {
      userEmail,
      userFullName,
      userBirthday,
      userPhone,
      userAddress
    });

    // Get user-specific profile picture
    const namespacedKey = userEmail ? `userProfilePicture:${userEmail}` : 'userProfilePicture';
    const userProfilePicture = localStorage.getItem(namespacedKey) || '';

    // Set user data
    setUser({
      fullName: userFullName || 'John Doe',
      email: userEmail,
      birthday: userBirthday || 'Not provided',
      phone: userPhone || 'Not provided',
      address: userAddress || 'Not provided',
      joinDate: localStorage.getItem('userJoinDate') || new Date().toLocaleDateString(),
      profilePicture: userProfilePicture
    });

    // Initialize edit form
    setEditForm({
      fullName: userFullName || 'John Doe',
      phone: userPhone || '',
      address: userAddress || '',
      birthday: userBirthday || '',
      profilePicture: userProfilePicture
    });
  }, [navigate]);

  // Fetch order history
  const fetchOrderHistory = async () => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      console.log('❌ No user email found in localStorage');
      return;
    }

    console.log(`🔍 Fetching order history for user: ${userEmail}`);
    setIsLoadingOrders(true);
    
    try {
      const url = `http://localhost:5000/api/orders/archived/customer/${encodeURIComponent(userEmail)}`;
      console.log(`📡 Making request to: ${url}`);
      
      const response = await axios.get(url);
      console.log('📦 Order history API response:', response);
      console.log('📦 Order history data:', response.data);
      
      setOrderHistory(response.data || []);
    } catch (err) {
      console.error('❌ Failed to fetch order history:', err);
      console.error('❌ Error details:', err.response?.data);
      setOrderHistory([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Fetch order history when component mounts
  useEffect(() => {
    fetchOrderHistory();
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Client-side phone validation before attempting save
    if (editForm.phone && editForm.phone.length !== 11) {
      alert('Phone must be exactly 11 digits');
      return;
    }
    // Update localStorage
    localStorage.setItem('userFullName', editForm.fullName);
    localStorage.setItem('userPhone', editForm.phone);
    localStorage.setItem('userAddress', editForm.address);
    localStorage.setItem('userBirthday', editForm.birthday);
    
    // Save profile picture with namespaced key
    const email = localStorage.getItem('userEmail') || '';
    const namespacedKey = email ? `userProfilePicture:${email}` : 'userProfilePicture';
    localStorage.setItem(namespacedKey, editForm.profilePicture);
    
    // Update user state
    setUser(prev => ({
      ...prev,
      fullName: editForm.fullName,
      phone: editForm.phone || 'Not provided',
      address: editForm.address || 'Not provided',
      birthday: editForm.birthday || 'Not provided',
      profilePicture: editForm.profilePicture || ''
    }));

    // Update initials
    const initials = editForm.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    localStorage.setItem('userInitials', initials);

    // Trigger custom event to update header
    window.dispatchEvent(new CustomEvent('profileUpdated'));

    // Refresh the page to ensure all components update
    setTimeout(() => {
      window.location.reload();
    }, 100);

    // Persist to backend
    try {
      const email = localStorage.getItem('userEmail');
      const updateData = {
        email,
        fullName: editForm.fullName,
        birthday: editForm.birthday,
        phone: editForm.phone,
        address: editForm.address,
        profilePicture: editForm.profilePicture
      };
      
      console.log('Sending profile update:', updateData);
      
      const response = await axios.put('http://localhost:5000/api/customer/profile', updateData);
      console.log('Profile update response:', response.data);

      // Refetch latest profile to ensure UI reflects DB
      const refetch = await axios.get('http://localhost:5000/api/customer/profile', {
        params: { email }
      });
      if (refetch.data.success && refetch.data.user) {
        const latest = refetch.data.user;
        localStorage.setItem('userFullName', latest.customer_fullname || editForm.fullName);
        localStorage.setItem('userBirthday', latest.Customer_birthday || editForm.birthday);
        localStorage.setItem('userPhone', latest.Customer_phone || editForm.phone);
        localStorage.setItem('userAddress', latest.Customer_Address || editForm.address);
        localStorage.setItem('userProfilePicture', latest.Customer_profile_picture || editForm.profilePicture);

        setUser(prev => ({
          ...prev,
          fullName: latest.customer_fullname || editForm.fullName,
          birthday: latest.Customer_birthday || 'Not provided',
          phone: latest.Customer_phone || 'Not provided',
          address: latest.Customer_Address || 'Not provided',
          profilePicture: latest.Customer_profile_picture || ''
        }));
      }
    } catch (err) {
      console.error('Failed to update profile on server:', err);
      alert(err?.response?.data?.error || 'Failed to update profile on server');
      // Optional: show a toast here
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      fullName: user.fullName,
      phone: user.phone === 'Not provided' ? '' : user.phone,
      address: user.address === 'Not provided' ? '' : user.address,
      birthday: user.birthday === 'Not provided' ? '' : user.birthday,
      profilePicture: user.profilePicture || ''
    });
    setIsEditing(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-black px-6 py-8">
            <div className="flex items-center space-x-6">
              <div className="relative h-24 w-24 rounded-full bg-white flex items-center justify-center shadow-lg overflow-hidden cursor-pointer" onClick={handleAvatarClick}>
                {(isEditing ? editForm.profilePicture : user.profilePicture) ? (
                  <img 
                    src={isEditing ? editForm.profilePicture : user.profilePicture} 
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
                  className={`text-2xl font-bold text-gray-800 ${ (isEditing ? editForm.profilePicture : user.profilePicture) ? 'hidden' : 'flex items-center justify-center'}`}
                  style={{ display: (isEditing ? editForm.profilePicture : user.profilePicture) ? 'none' : 'flex' }}
                >
                  {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>

                {isEditing && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center text-white text-xs">
                    <span className="px-2 py-1 rounded bg-black/60">Change photo</span>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
              <div className="text-white">
                <h1 className="text-3xl font-bold">{user.fullName}</h1>
                <p className="text-gray-300 text-lg">{user.email}</p>
                <p className="text-gray-400 text-sm">Member since {user.joinDate}</p>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="px-6 py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="bg-black hover:bg-gray-900 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="space-x-3">
                  <button
                    onClick={handleSave}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Personal Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="fullName"
                      value={editForm.fullName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{user.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="birthday"
                      value={editForm.birthday}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{formatBirthday(user.birthday)}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Contact Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  {isEditing ? (
                    <>
                      <input
                        type="tel"
                        name="phone"
                        value={editForm.phone}
                        onChange={(e) => {
                          const next = e.target.value.replace(/\D/g, '').slice(0, 11);
                          handleInputChange({ target: { name: 'phone', value: next } });
                        }}
                        placeholder="Enter 11-digit phone number"
                        maxLength={11}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                      {editForm.phone && editForm.phone.length !== 11 && (
                        <p className="text-red-500 text-xs mt-1">Phone must be exactly 11 digits</p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{user.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  {isEditing ? (
                    <textarea
                      name="address"
                      value={editForm.address}
                      onChange={handleInputChange}
                      placeholder="Enter your address"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg whitespace-pre-line">{user.address}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Order History Section */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">Order History</h3>
              
              {isLoadingOrders ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <div className="text-gray-500 mb-2">
                    <svg className="animate-spin mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-gray-600">Loading order history...</p>
                </div>
              ) : orderHistory.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <div className="text-gray-500 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Order History</h4>
                  <p className="text-gray-600 mb-4">You haven't placed any orders yet</p>
                  <a
                    href="/foodmenu"
                    className="inline-block bg-black hover:bg-gray-900 text-white px-6 py-2 rounded-lg font-semibold transition"
                  >
                    Browse Menu
                  </a>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
                  <div className="space-y-4 p-4">
                    {orderHistory.map((order) => (
                      <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">Order #{order.original_order_id}</h4>
                            <p className="text-sm text-gray-600">
                              {new Date(order.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">₱{order.total_amount}</p>
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              order.order_status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.order_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1).replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <h5 className="text-sm font-bold text-black mb-1 text-left">Items:</h5>
                          <div className="space-y-1 text-left">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, index) => (
                                <div key={index} className="flex justify-between text-sm text-gray-600">
                                  <span className="text-left">{item.food_name} x{item.quantity}</span>
                                  <span className="text-right">₱{item.price}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 text-left">No items found</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <div className="text-left">
                            <p className="text-left"><span className="font-bold text-black">Payment:</span> {order.payment_method}</p>
                            <p className="text-left"><span className="font-bold text-black">Delivery:</span> {order.delivery_address}</p>
                          </div>
                          <div className="text-left mt-2">
                            <p className="text-xs text-gray-500">
                              Archived: {new Date(order.archived_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Modal */}
      {isEditing && isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleAvatarModalClose} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Update Profile Picture</h3>
              <button onClick={handleAvatarModalClose} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex space-x-2 text-sm">
                <button
                  onClick={() => { setAvatarMode('upload'); setAvatarError(''); }}
                  className={`px-3 py-1 rounded-full border ${avatarMode === 'upload' ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-700'}`}
                >Upload</button>
                <button
                  onClick={() => { setAvatarMode('url'); setAvatarError(''); }}
                  className={`px-3 py-1 rounded-full border ${avatarMode === 'url' ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-700'}`}
                >Use URL</button>
              </div>

              {avatarMode === 'upload' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    <div className="h-24 w-24 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border">
                      {tempProfilePicture ? (
                        <img src={tempProfilePicture} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-400 text-xs">No image</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <button
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
                      onClick={() => fileInputRef.current?.click()}
                    >Choose File</button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="https://example.com/your-image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <div className="flex items-center justify-center">
                    <div className="h-24 w-24 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border">
                      {tempUrl ? (
                        <img src={tempUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = ''; }} />
                      ) : (
                        <span className="text-gray-400 text-xs">Preview</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {avatarError && <p className="text-red-600 text-sm">{avatarError}</p>}

              <div className="pt-2 flex justify-end space-x-2">
                <button onClick={handleAvatarModalClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
                <button onClick={handleAvatarModalSave} className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-900">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white py-6 text-center text-gray-500 text-sm shadow-inner mt-12">
        &copy; {new Date().getFullYear()} Hitolicious. All rights reserved.
      </footer>
    </div>
  );
};

export default AccProfile;
