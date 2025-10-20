import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.jpg';
import axios from 'axios';


const AdminProfile = () => {
  const [activeMenu, setActiveMenu] = useState('Your Profile');
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
  const fileInputRef = useRef(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarMode, setAvatarMode] = useState('upload'); // 'upload' | 'url'
  const [tempProfilePicture, setTempProfilePicture] = useState('');
  const [tempUrl, setTempUrl] = useState('');
  const [avatarError, setAvatarError] = useState('');

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

  useEffect(() => {
    // Check for admin session
    const storedAdminData = localStorage.getItem('adminData');
    if (!storedAdminData) {
      navigate('/adminSignin');
      return;
    }
    try {
      const parsedAdminData = JSON.parse(storedAdminData);
      console.log('Admin data loaded:', parsedAdminData);
      setAdminData(parsedAdminData);
    } catch (error) {
      console.error('Error parsing admin data:', error);
      navigate('/adminSignin');
    }
  }, [navigate]);

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
    // Check if admin is logged in
    const adminData = localStorage.getItem('adminData');
    if (!adminData) {
      navigate('/adminSignin');
      return;
    }

    try {
      const admin = JSON.parse(adminData);
      console.log('Admin data from localStorage:', admin);

      // Fetch admin profile data from database
      const fetchAdminProfile = async () => {
        try {
          const response = await axios.get(`http://localhost:5000/api/admin/profile/${admin.id}`);
          console.log('Admin profile from database:', response.data);
          
          if (response.data.success) {
            const profileData = response.data.admin;
            
            // Get admin-specific profile picture from localStorage (keep this for profile pictures)
            const adminEmail = admin.admin_email || '';
            const namespacedKey = adminEmail ? `adminProfilePicture:${adminEmail}` : 'adminProfilePicture';
            const adminProfilePicture = localStorage.getItem(namespacedKey) || '';

            // Set user data from database
            setUser({
              fullName: profileData.admin_fullname || 'Admin',
              email: profileData.admin_email || adminEmail,
              birthday: profileData.adminbirth || 'Not provided',
              phone: profileData.admin_phonenumber || 'Not provided',
              address: profileData.admin_address || 'Not provided',
              joinDate: new Date().toLocaleDateString(),
              profilePicture: adminProfilePicture
            });

            // Initialize edit form with database data
            setEditForm({
              fullName: profileData.admin_fullname || 'Admin',
              phone: profileData.admin_phonenumber || '',
              address: profileData.admin_address || '',
              birthday: profileData.adminbirth || '',
              profilePicture: adminProfilePicture
            });
          }
        } catch (error) {
          console.error('Error fetching admin profile from database:', error);
          
          // Fallback to localStorage data if database fetch fails
          const adminEmail = admin.admin_email || '';
          const adminFullName = admin.admin_fullname || 'Admin';
          const adminBirthday = admin.adminbirth || '';
          const adminPhone = admin.admin_phonenumber || '';
          const adminAddress = admin.admin_address || '';
          
          // Get admin-specific profile picture
          const namespacedKey = adminEmail ? `adminProfilePicture:${adminEmail}` : 'adminProfilePicture';
          const adminProfilePicture = localStorage.getItem(namespacedKey) || '';

          // Set user data from localStorage fallback
    setUser({
            fullName: adminFullName,
            email: adminEmail,
            birthday: adminBirthday || 'Not provided',
            phone: adminPhone || 'Not provided',
            address: adminAddress || 'Not provided',
            joinDate: new Date().toLocaleDateString(),
            profilePicture: adminProfilePicture
    });

    // Initialize edit form
    setEditForm({
            fullName: adminFullName,
            phone: adminPhone,
            address: adminAddress,
            birthday: adminBirthday,
            profilePicture: adminProfilePicture
          });
        }
      };

      fetchAdminProfile();
    } catch (error) {
      console.error('Error parsing admin data:', error);
      navigate('/adminSignin');
    }
  }, [navigate]);

  // Remove order history functionality for admin profile

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Client-side phone validation before attempting save
    if (editForm.phone && editForm.phone.length !== 11) {
      alert('Phone must be exactly 11 digits');
      return;
    }

    // Get current admin data
    const adminData = JSON.parse(localStorage.getItem('adminData'));
    const adminEmail = adminData.admin_email || '';
    
    try {
      // Save profile data to database (excluding profile picture)
      const updateData = {
        admin_id: adminData.id,
        admin_fullname: editForm.fullName,
        adminbirth: editForm.birthday,
        admin_phonenumber: editForm.phone,
        admin_address: editForm.address
      };
      
      console.log('Sending admin profile update to database:', updateData);
      
      const response = await axios.put('http://localhost:5000/api/admin/profile', updateData);
      console.log('Admin profile update response:', response.data);

      if (response.data.success) {
        // Save profile picture to localStorage (keep this for profile pictures)
        const namespacedKey = adminEmail ? `adminProfilePicture:${adminEmail}` : 'adminProfilePicture';
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
        localStorage.setItem(`adminInitials:${adminEmail}`, initials);

    // Trigger custom event to update header
    window.dispatchEvent(new CustomEvent('profileUpdated'));

        // Refresh the page after successful update
        window.location.reload();
      } else {
        alert('Failed to update profile: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error updating admin profile:', error);
      alert('Failed to update profile. Please try again.');
    }
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
                setActiveMenu(item.name);
                navigate(item.path);
              }}
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
                    {user.profilePicture ? (
                      <img 
                        src={user.profilePicture} 
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
                      style={{ display: user.profilePicture ? 'none' : 'flex' }}
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
                    <a href="/adminProfile" className="block px-4 py-3 text-gray-700 hover:bg-gray-100">Your Profile</a>
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
          <div className="max-w-4xl mx-auto">
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

          
                          </div>
                        </div>
                      </div>
        </main>
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

    </div>
  );
};

export default AdminProfile;
