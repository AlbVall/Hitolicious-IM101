import React, { useEffect, useState } from 'react';
import logo from '../../assets/logo.jpg';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const defaultBestSellers = [
  {
    name: 'Signature Kare-Kare',
    description: 'A Filipino classic with rich peanut sauce and tender oxtail.',
    image: logo, // Replace with actual image or use logo as placeholder
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

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/foodmenu', label: 'Menu' },
  { to: '/order', label: 'Order' },
  { to: '/cart', label: 'Cart' },
];

const Header = () => {
  const location = useLocation();
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
        <div className="flex justify-between h-24 items-center px-2">
          <div className="flex-shrink-0 flex items-center">
            <img src={logo} alt="Hitolicious" className="h-24 w-auto object-contain pl-2" />
          </div>
          <div className="hidden sm:flex sm:space-x-8 sm:items-center pr-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-base px-3 py-2 ${
                  link.label === 'Home'
                    ? 'border-b-2 border-black text-black'
                    : location.pathname === link.to
                      ? 'text-black border-b-2 border-black'
                      : 'text-gray-700 hover:text-black'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="relative ml-4">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center space-x-2 text-gray-700 hover:text-black focus:outline-none">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-base font-medium">{userInitials}</span>
                </div>
                <span className="text-base">{userName}</span>
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-md z-10">
                  <a href="/profile" className="block px-4 py-3 text-gray-700 hover:bg-gray-100">Your Profile</a>
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

const HomePage = () => {
  const [bestSellers, setBestSellers] = useState(defaultBestSellers);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('bestSellers');
    if (stored) {
      setBestSellers(JSON.parse(stored));
    }
    // Restrict access if not signed in
    if (!localStorage.getItem('userEmail')) {
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center flex-1 text-center px-4 pt-12 pb-4">
        <h1 className="text-4xl font-extrabold text-black">Welcome to Hitolicious!</h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-600">
          Experience the best of Filipino cuisine, crafted with passion and served with love. Explore our best sellers and discover your new favorites!
        </p>
        <Link to="/foodmenu" className="mt-8 inline-block bg-black hover:bg-gray-900 text-white text-lg font-semibold px-8 py-3 rounded-full shadow-lg transition">View Menu</Link>
      </section>

      {/* Best Sellers Showcase */}
      <section className="max-w-7xl mx-auto py-12 px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Best Sellers</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {bestSellers.map((item, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-100 flex items-center justify-center">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" onError={e => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/400x300?text=No+Image'; }} />
                ) : (
                  <span className="text-gray-500">No Image Available</span>
                )}
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                  </div>
                  <span className="text-lg font-bold">₱{item.price}</span>
                </div>
                <p className="mt-4 text-gray-600 text-sm text-left">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-6 text-center text-gray-500 text-sm shadow-inner mt-auto">
        &copy; {new Date().getFullYear()} Hitolicious. All rights reserved.
      </footer>
    </div>
  );
};

export default HomePage; 