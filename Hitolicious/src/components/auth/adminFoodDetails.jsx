import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.jpg';

const AdminFoodDetails = () => {
  const navigate = useNavigate();
  const [foods, setFoods] = useState([]);
  const [foodDetails, setFoodDetails] = useState({});
  const [selectedFood, setSelectedFood] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imageInputType, setImageInputType] = useState('url');
  const [editForm, setEditForm] = useState({
    description: '',
    imageUrl: '',
    imageFile: null
  });
  const [adminData, setAdminData] = useState(null);
  const [activeMenu, setActiveMenu] = useState('Food Details');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState('');

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
      navigate('/admin/signin');
      return;
    }
    try {
      const parsedAdminData = JSON.parse(storedAdminData);
      setAdminData(parsedAdminData);
      
      // Get admin-specific profile picture from localStorage
      const adminEmail = parsedAdminData.admin_email || '';
      const namespacedKey = adminEmail ? `adminProfilePicture:${adminEmail}` : 'adminProfilePicture';
      const adminProfilePicture = localStorage.getItem(namespacedKey) || '';
      setProfilePicture(adminProfilePicture);
    } catch (error) {
      console.error('Error parsing admin data:', error);
      navigate('/admin/signin');
    }

    fetchFoods();
    // Load existing food details from localStorage
    const storedDetails = localStorage.getItem('foodDetails');
    if (storedDetails) {
      setFoodDetails(JSON.parse(storedDetails));
    }
  }, [navigate]);

  const fetchFoods = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/food');
      if (!response.ok) {
        throw new Error('Failed to fetch foods');
      }
      const data = await response.json();
      setFoods(data);
    } catch (error) {
      console.error('Error fetching foods:', error);
    }
  };

  const handleEdit = (food) => {
    setSelectedFood(food);
    const currentDetails = foodDetails[food.food_id] || {};
    setEditForm({
      description: currentDetails.description || '',
      imageUrl: currentDetails.imageUrl || '',
      imageFile: null
    });
    setImageInputType(currentDetails.imageUrl ? 'url' : 'file');
    setIsEditing(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({
          ...prev,
          imageFile: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!selectedFood) return;

    const newDetails = {
      ...foodDetails,
      [selectedFood.food_id]: {
        description: editForm.description,
        imageUrl: imageInputType === 'url' ? editForm.imageUrl : editForm.imageFile
      }
    };

    setFoodDetails(newDetails);
    localStorage.setItem('foodDetails', JSON.stringify(newDetails));
    setIsEditing(false);
    setSelectedFood(null);
    setEditForm({ description: '', imageUrl: '', imageFile: null });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedFood(null);
    setEditForm({ description: '', imageUrl: '', imageFile: null });
    setImageInputType('url');
  };

  const handleLogout = () => {
    localStorage.removeItem('adminData');
    navigate('/adminsignin');
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
            <h2 className="text-3xl font-bold text-gray-800">Food Details Management</h2>
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
          {isEditing && selectedFood ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">
                  Editing: {selectedFood.food_name}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full h-32 px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                      placeholder="Enter food description..."
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Image Upload Method
                    </label>
                    <div className="flex space-x-6 mb-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="url"
                          checked={imageInputType === 'url'}
                          onChange={(e) => setImageInputType(e.target.value)}
                          className="form-radio h-5 w-5 text-black"
                        />
                        <span className="ml-2 text-base">Image URL</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="file"
                          checked={imageInputType === 'file'}
                          onChange={(e) => setImageInputType(e.target.value)}
                          className="form-radio h-5 w-5 text-black"
                        />
                        <span className="ml-2 text-base">Upload File</span>
                      </label>
                    </div>

                    {imageInputType === 'url' ? (
                      <input
                        type="text"
                        value={editForm.imageUrl}
                        onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                        placeholder="Enter image URL..."
                      />
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-base text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-base file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image Preview
                    </label>
                    <div className="w-full h-64 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      {imageInputType === 'url' && editForm.imageUrl ? (
                        <img
                          src={editForm.imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => e.target.src = 'https://via.placeholder.com/400?text=Invalid+Image'}
                        />
                      ) : imageInputType === 'file' && editForm.imageFile ? (
                        <img
                          src={editForm.imageFile}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No image selected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 font-medium transition-colors duration-200"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Food Name
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {foods.map((food) => (
                      <tr key={food.food_id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-base font-medium text-gray-900">{food.food_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {food.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-base text-gray-900 max-w-xs truncate">
                            {foodDetails[food.food_id]?.description || 'No description'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-20 w-20 rounded-lg overflow-hidden bg-gray-100">
                            {foodDetails[food.food_id]?.imageUrl ? (
                              <img
                                src={foodDetails[food.food_id].imageUrl}
                                alt={food.food_name}
                                className="h-full w-full object-cover"
                                onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=Invalid+Image'}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <span className="text-sm text-gray-500">No image</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleEdit(food)}
                            className="text-base text-blue-600 hover:text-blue-900 font-medium transition-colors duration-200"
                          >
                            Edit Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminFoodDetails; 