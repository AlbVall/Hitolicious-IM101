import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.jpg';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [activeMenu, setActiveMenu] = useState('Food Menu');
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState(null);
  const [foods, setFoods] = useState([]);
  const [archivedFoods, setArchivedFoods] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newFood, setNewFood] = useState({
    food_name: '',
    category: '',
    price: ''
  });
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [newStock, setNewStock] = useState({
    food_id: '',
    quantity: ''
  });
  const [editingFood, setEditingFood] = useState(null);
  const [editingFoodData, setEditingFoodData] = useState({
    food_name: '',
    category: '',
    price: '',
  });

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
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (activeMenu === 'Food Menu') {
        setIsLoading(true);
        setError(null);
        try {
          await Promise.all([fetchFoods(), fetchStocks()]);
        } catch (err) {
          if (isMounted) {
            setError('Failed to load data. Please try again.');
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [activeMenu]);

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
      throw error;
    }
  };

  const fetchStocks = async () => {
    try {
      console.log('Fetching stocks...');
      const response = await fetch('http://localhost:5000/api/stocks');
      
      const responseText = await response.text();
      console.log('Raw stocks response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid JSON response from server');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stocks');
      }

      setStocks(data);
    } catch (error) {
      console.error('Error fetching stocks:', error);
      throw error;
    }
  };

  const fetchArchivedFoods = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/food/archived');
      const contentType = response.headers.get('content-type') || '';
      const responseText = await response.text();

      console.log('Archived foods status:', response.status, response.statusText);
      console.log('Raw archived foods response:', responseText);

      if (!response.ok) {
        let errMsg = `Failed to fetch archived foods (HTTP ${response.status})`;
        if (contentType.includes('application/json')) {
          try {
            const errData = responseText ? JSON.parse(responseText) : null;
            if (errData && (errData.error || errData.message)) {
              errMsg = errData.error || errData.message;
            }
          } catch (_) {
            // ignore parse error for error body
          }
        } else if (responseText) {
          errMsg += `: ${responseText.substring(0, 200)}`;
        }
        setError(errMsg);
        setArchivedFoods([]);
        return;
      }

      if (contentType.includes('application/json')) {
        try {
          const data = responseText ? JSON.parse(responseText) : [];
          setArchivedFoods(Array.isArray(data) ? data : []);
        } catch (_) {
          console.warn('Archived foods endpoint returned non-JSON with 2xx; defaulting to empty list.');
          setArchivedFoods([]);
        }
      } else {
        // Not JSON; treat as empty list to avoid breaking UI
        setArchivedFoods([]);
      }
    } catch (error) {
      console.error('Error fetching archived foods:', error);
      setError('Failed to load archived foods. Please try again.');
    }
  };

  useEffect(() => {
    if (showArchived) {
      fetchArchivedFoods();
    }
  }, [showArchived]);

  const handleAddFood = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFood),
      });
      if (!response.ok) {
        throw new Error('Failed to add food');
      }
      const data = await response.json();
      if (data.success) {
        setNewFood({ food_name: '', category: '', price: '' });
        setIsAddingFood(false);
        await Promise.all([fetchFoods(), fetchStocks()]);
      }
    } catch (error) {
      console.error('Error adding food:', error);
      setError('Failed to add food. Please try again.');
    }
  };

  const handleDeleteFood = async (foodId) => {
    if (window.confirm('Are you sure you want to delete this food item?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/food/${foodId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error('Failed to delete food');
        }
        const data = await response.json();
        if (data.success) {
          await Promise.all([fetchFoods(), fetchStocks()]);
        }
      } catch (error) {
        console.error('Error deleting food:', error);
        setError('Failed to delete food. Please try again.');
      }
    }
  };

  const handleArchiveFood = async (foodId) => {
    if (window.confirm('Are you sure you want to archive this food item?')) {
      try {
        console.log('Attempting to archive food:', foodId);
        const response = await fetch(`http://localhost:5000/api/food/${foodId}/archive`, {
          method: 'POST',
        });

        const responseText = await response.text();
        console.log('Archive response:', responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('Error parsing response:', e);
          throw new Error('Invalid response from server');
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to archive food');
        }

        if (data.success) {
          await Promise.all([fetchFoods(), fetchStocks()]);
          if (showArchived) {
            await fetchArchivedFoods();
          }
          // Show success message
          setError(null);
        } else {
          throw new Error(data.message || 'Failed to archive food');
        }
      } catch (error) {
        console.error('Error archiving food:', error);
        setError(`Failed to archive food: ${error.message}`);
      }
    }
  };

  const handleRestoreFood = async (foodId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/food/restore/${foodId}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to restore food');
      }
      const data = await response.json();
      if (data.success) {
        await Promise.all([fetchFoods(), fetchStocks(), fetchArchivedFoods()]);
      }
    } catch (error) {
      console.error('Error restoring food:', error);
      setError('Failed to restore food. Please try again.');
    }
  };

  const handleAddStock = async (foodId) => {
    if (!adminData) {
      setError('Please log in again to manage stocks.');
      return;
    }

    if (!adminData.id) {
      console.error('Admin ID is missing:', adminData);
      setError('Invalid admin session. Please log in again.');
      return;
    }

    try {
      const stockData = {
        food_id: foodId,
        admin_id: adminData.id,
        quantity: parseInt(newStock.quantity)
      };
      console.log('Adding stock with data:', stockData);

      const response = await fetch('http://localhost:5000/api/stocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockData),
      });

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid JSON response from server');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add stock');
      }

      if (data.success) {
        setNewStock({ food_id: '', quantity: '' });
        setEditingStock(null);
        await fetchStocks();
      } else {
        throw new Error(data.message || 'Failed to add stock');
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      setError(`Failed to add stock: ${error.message}`);
    }
  };

  const handleUpdateStock = async (stockId, quantity) => {
    try {
      console.log('Updating stock with data:', {
        stockId,
        quantity: parseInt(quantity)
      });

      const response = await fetch(`http://localhost:5000/api/stocks/${stockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: parseInt(quantity) }),
      });

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid JSON response from server');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update stock');
      }

      if (data.success) {
        setEditingStock(null);
        await fetchStocks();
      } else {
        throw new Error(data.message || 'Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      setError(`Failed to update stock: ${error.message}`);
    }
  };

  const handleUpdateFood = async (foodId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/food/${foodId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingFoodData),
      });

      if (!response.ok) {
        throw new Error('Failed to update food');
      }

      const data = await response.json();
      if (data.success) {
        setEditingFood(null);
        setEditingFoodData({ food_name: '', category: '', price: '' });
        await fetchFoods();
      }
    } catch (error) {
      console.error('Error updating food:', error);
      setError('Failed to update food. Please try again.');
    }
  };

  const getStockForFood = (foodId) => {
    return stocks.find(stock => stock.food_id === foodId);
  };

  const renderAddFoodModal = () => (
    <Modal isOpen={isAddingFood} onClose={() => setIsAddingFood(false)}>
      <h2 className="text-2xl font-bold mb-6">Add New Food Item</h2>
      <form onSubmit={handleAddFood} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Food Name</label>
          <input
            type="text"
            value={newFood.food_name}
            onChange={(e) => setNewFood({ ...newFood, food_name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={newFood.category}
            onChange={(e) => setNewFood({ ...newFood, category: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
            required
          >
            <option value="">Select a category</option>
            <option value="Appetizer">Appetizer</option>
            <option value="Main Course">Main Course</option>
            <option value="Desserts">Desserts</option>
            <option value="Drinks">Drinks</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Price</label>
          <input
            type="number"
            value={newFood.price}
            onChange={(e) => setNewFood({ ...newFood, price: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
            required
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => setIsAddingFood(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            Add Food
          </button>
        </div>
      </form>
    </Modal>
  );

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
            <h2 className="text-3xl font-bold text-gray-800">{activeMenu}</h2>
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
          {activeMenu === 'Food Menu' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center space-x-4">
                  <h3 className="text-2xl font-semibold text-gray-800">
                    {showArchived ? 'Deleted Food Items' : 'Food Items'}
                  </h3>
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="px-4 py-2 text-lg text-gray-600 hover:text-gray-800 flex items-center transition-colors duration-200"
                  >
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {showArchived ? 'Show Active' : 'Show Deleted'}
                  </button>
                </div>
                {!showArchived && (
                  <button
                    onClick={() => setIsAddingFood(true)}
                    className="bg-black text-white px-6 py-3 text-lg rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center font-medium"
                  >
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Food
                  </button>
                )}
              </div>

              {isLoading && !showArchived ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm">
                  <div className="text-xl text-gray-600">Loading...</div>
                </div>
              ) : error ? (
                <div className="bg-red-50 p-6 rounded-lg">
                  <div className="text-red-800">{error}</div>
                  <button
                    onClick={() => {
                      setError(null);
                      fetchFoods();
                      fetchStocks();
                      if (showArchived) fetchArchivedFoods();
                    }}
                    className="mt-3 text-red-600 hover:text-red-800 font-medium transition-colors duration-200"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Price</th>
                          {!showArchived && (
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                          )}
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(showArchived ? archivedFoods : foods).map((food) => {
                          const stock = !showArchived ? getStockForFood(food.food_id) : null;
                          const isEditing = editingStock === food.food_id;
                          const isEditingFood = editingFood === food.food_id;

                          return (
                            <tr key={food.food_id} className="hover:bg-gray-50 transition-colors duration-150">
                              <td className="px-6 py-4 whitespace-nowrap">
                                {isEditingFood ? (
                                  <input
                                    type="text"
                                    value={editingFoodData.food_name}
                                    onChange={(e) => setEditingFoodData({ ...editingFoodData, food_name: e.target.value })}
                                    className="w-full text-base rounded-md border-gray-300 shadow-sm focus:ring-black focus:border-black"
                                  />
                                ) : (
                                  <div className="text-base font-medium text-gray-900">{food.food_name}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {isEditingFood ? (
                                  <select
                                    value={editingFoodData.category}
                                    onChange={(e) => setEditingFoodData({ ...editingFoodData, category: e.target.value })}
                                    className="w-full text-base rounded-md border-gray-300 shadow-sm focus:ring-black focus:border-black"
                                  >
                                    <option value="Appetizer">Appetizer</option>
                                    <option value="Main Course">Main Course</option>
                                    <option value="Desserts">Desserts</option>
                                    <option value="Drinks">Drinks</option>
                                  </select>
                                ) : (
                                  <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                    {food.category}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {isEditingFood ? (
                                  <input
                                    type="number"
                                    value={editingFoodData.price}
                                    onChange={(e) => setEditingFoodData({ ...editingFoodData, price: e.target.value })}
                                    className="w-32 text-base rounded-md border-gray-300 shadow-sm focus:ring-black focus:border-black"
                                  />
                                ) : (
                                  <div className="text-base text-gray-900">₱{food.price}</div>
                                )}
                              </td>
                              {!showArchived && (
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {isEditing ? (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="number"
                                        value={newStock.quantity}
                                        onChange={(e) => setNewStock({ ...newStock, quantity: e.target.value })}
                                        className="w-20 text-base rounded-md border-gray-300 shadow-sm focus:ring-black focus:border-black"
                                        min="0"
                                      />
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={() => {
                                            if (stock) {
                                              handleUpdateStock(stock.stocks_id, newStock.quantity);
                                            } else {
                                              handleAddStock(food.food_id);
                                            }
                                          }}
                                          className="text-black hover:text-gray-700 transition-colors duration-200"
                                          title="Save"
                                        >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingStock(null);
                                            setNewStock({ food_id: '', quantity: '' });
                                          }}
                                          className="text-black hover:text-gray-700 transition-colors duration-200"
                                          title="Cancel"
                                        >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <span className="text-base font-medium text-gray-900">{stock ? stock.quantity : 0}</span>
                                      <button
                                        onClick={() => {
                                          setEditingStock(food.food_id);
                                          setNewStock({
                                            food_id: food.food_id,
                                            quantity: stock ? stock.quantity.toString() : '0'
                                          });
                                        }}
                                        className="text-black hover:text-gray-700 transition-colors duration-200"
                                        title="Edit Stock"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </td>
                              )}
                              <td className="px-6 py-4 whitespace-nowrap">
                                {showArchived ? (
                                  <button
                                    onClick={() => handleRestoreFood(food.food_id)}
                                    className="text-green-600 hover:text-green-900 flex items-center font-medium transition-colors duration-200"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Restore
                                  </button>
                                ) : (
                                  <div className="flex items-center space-x-3">
                                    {isEditingFood ? (
                                      <>
                                        <button
                                          onClick={() => handleUpdateFood(food.food_id)}
                                          className="text-green-600 hover:text-green-900 font-medium transition-colors duration-200"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingFood(null);
                                            setEditingFoodData({ food_name: '', category: '', price: '' });
                                          }}
                                          className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditingFood(food.food_id);
                                            setEditingFoodData({
                                              food_name: food.food_name,
                                              category: food.category,
                                              price: food.price.toString()
                                            });
                                          }}
                                          className="text-blue-600 hover:text-blue-900 font-medium transition-colors duration-200"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleArchiveFood(food.food_id)}
                                          className="text-red-600 hover:text-red-900 flex items-center font-medium transition-colors duration-200"
                                        >
                                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                          </svg>
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <p className="text-gray-600">Welcome to {activeMenu} section</p>
            </div>
          )}
        </main>
      </div>

      {/* Add Food Modal */}
      {renderAddFoodModal()}
    </div>
  );
};

export default AdminDashboard;
