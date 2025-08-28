import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logo from '../../assets/logo.jpg';
import { useNavigate } from 'react-router-dom';
import NotificationModal from '../common/NotificationModal';
import useNotification from '../../useNotification';

const Header = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState('John Doe');
  const [userInitials, setUserInitials] = useState('JD');

  useEffect(() => {
    const storedFullName = localStorage.getItem('userFullName');
    const storedInitials = localStorage.getItem('userInitials');
    if (storedFullName && storedInitials) {
      setUserName(storedFullName);
      setUserInitials(storedInitials);
    }
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
            <a href="/menu" className="text-black border-b-2 border-black px-3 py-2 text-base">Menu</a>
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

const FoodMenu = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [foodItems, setFoodItems] = useState([]);
  const [foodDetails, setFoodDetails] = useState({});
  const [stocks, setStocks] = useState([]);
  const navigate = useNavigate();
  const { notification, showSuccess, hideNotification } = useNotification();

  useEffect(() => {
    fetchFoodItems();
    fetchStocks();
    // Load food details from localStorage
    const storedDetails = localStorage.getItem('foodDetails');
    if (storedDetails) {
      setFoodDetails(JSON.parse(storedDetails));
    }
    // Restrict access if not signed in
    if (!localStorage.getItem('userEmail')) {
      navigate('/');
    }
  }, [navigate]);

  const fetchFoodItems = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/food');
      setFoodItems(response.data);
    } catch (error) {
      console.error('Failed to fetch food:', error);
    }
  };

  const fetchStocks = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/stocks');
      setStocks(response.data);
    } catch (error) {
      console.error('Failed to fetch stocks:', error);
    }
  };

  const getStockForFood = (foodId) => {
    const stock = stocks.find(s => s.food_id === foodId);
    return stock ? stock.quantity : 0;
  };

  const addToCart = (food) => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) return;
    const cartKey = `cartItems_${userEmail}`;
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    const existing = cart.find(item => item.food_id === food.food_id);
    if (existing) {
      existing.quantity += 1;
      showSuccess(`${food.food_name} quantity updated in cart! (${existing.quantity} items)`, 'Added to Cart');
    } else {
      cart.push({ ...food, quantity: 1 });
      showSuccess(`${food.food_name} has been added to your cart!`, 'Added to Cart');
    }
    localStorage.setItem(cartKey, JSON.stringify(cart));
  };

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'Appetizer', name: 'Appetizer' },
    { id: 'Main Course', name: 'Main Course' },
    { id: 'Desserts', name: 'Desserts' },
    { id: 'Drinks', name: 'Drinks' }
  ];

  const getFilteredItems = () => {
    if (selectedCategory === 'all') return foodItems;
    return foodItems.filter(item => item.category === selectedCategory);
  };

  const renderCategorySection = (categoryId) => {
    const items = foodItems.filter(item => item.category === categoryId);
    if (items.length === 0) return null;

    return (
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{categoryId}</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.food_id} className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-100">
                {foodDetails[item.food_id]?.imageUrl ? (
                  <img
                    src={foodDetails[item.food_id].imageUrl}
                    alt={item.food_name}
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.src = 'https://via.placeholder.com/400x300?text=No+Image'}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-500">No Image Available</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{item.food_name}</h3>
                  </div>
                  <span className="text-lg font-bold">₱{parseFloat(item.price).toFixed(2)}</span>
                </div>
                <p className="mt-4 text-gray-600 text-sm">
                  {foodDetails[item.food_id]?.description || 'No description available'}
                </p>
                <button
                  onClick={() => addToCart(item)}
                  className={`mt-4 w-full px-4 py-2 rounded-lg font-semibold transition ${getStockForFood(item.food_id) === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-black hover:bg-gray-900 text-white'}`}
                  disabled={getStockForFood(item.food_id) === 0}
                >
                  {getStockForFood(item.food_id) === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <div className="mt-2 text-sm text-gray-500">Stock: {getStockForFood(item.food_id)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-black">Our Menu</h1>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-600">
              Discover our carefully curated selection of dishes
            </p>
          </div>

          {/* Category Filter */}
          <div className="mt-10 flex justify-center space-x-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  selectedCategory === category.id
                    ? 'bg-black text-white'
                    : 'bg-white text-black border border-black hover:bg-gray-100'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Food Grid */}
          <div className="mt-12">
            {selectedCategory === 'all' ? (
              <>
                {renderCategorySection('Appetizer')}
                {renderCategorySection('Main Course')}
                {renderCategorySection('Desserts')}
                {renderCategorySection('Drinks')}
              </>
            ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {getFilteredItems().map((item) => (
              <div key={item.food_id} className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="h-48 bg-gray-100">
                      {foodDetails[item.food_id]?.imageUrl ? (
                        <img
                          src={foodDetails[item.food_id].imageUrl}
                          alt={item.food_name}
                          className="w-full h-full object-cover"
                          onError={(e) => e.target.src = 'https://via.placeholder.com/400x300?text=No+Image'}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-500">No Image Available</span>
                        </div>
                      )}
                </div>
                <div className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">{item.food_name}</h3>
                        </div>
                    <span className="text-lg font-bold">₱{parseFloat(item.price).toFixed(2)}</span>
                  </div>
                      <p className="mt-4 text-gray-600 text-sm">
                        {foodDetails[item.food_id]?.description || 'No description available'}
                      </p>
                      <button
                        onClick={() => addToCart(item)}
                        className={`mt-4 w-full px-4 py-2 rounded-lg font-semibold transition ${getStockForFood(item.food_id) === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-black hover:bg-gray-900 text-white'}`}
                        disabled={getStockForFood(item.food_id) === 0}
                      >
                        {getStockForFood(item.food_id) === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                      <div className="mt-2 text-sm text-gray-500">Stock: {getStockForFood(item.food_id)}</div>
                </div>
              </div>
            ))}
            {getFilteredItems().length === 0 && (
              <div className="text-center text-gray-600 col-span-full">
                No items available in this category.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={hideNotification}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
};

export default FoodMenu;
