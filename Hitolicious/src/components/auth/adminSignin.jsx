import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../../assets/logo.jpg';
import NotificationModal from '../common/NotificationModal';
import useNotification from '../../useNotification';

const Signin = () => {
  const navigate = useNavigate();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      try {
        const res = await axios.post('http://localhost:5000/api/admin/signin', formData);

        if (res.data.success) {
          // Make sure we store the admin data with the correct structure
          const adminData = {
            ...res.data.user,
            id: res.data.user.id // Ensure we have the ID field
          };
          localStorage.setItem('adminData', JSON.stringify(adminData));
          showSuccess('Welcome to the admin panel! You have successfully signed in.', 'Login Successful');
          
          // Navigate after a short delay to show the success message
          setTimeout(() => {
            navigate('/adminFoodDashboard');
          }, 1500);
        } else {
          showError(res.data.message || 'Invalid email or password. Please try again.', 'Login Failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        
        // Check if it's a network/connection error
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || !error.response) {
          showError('Unable to connect to the server. Please check your internet connection and try again.', 'Connection Error');
        } 
        // Check if it's an authentication error (401 status)
        else if (error.response && error.response.status === 401) {
          showError('Invalid email or password. Please check your credentials and try again.', 'Login Failed');
        }
        // Check if server returned an error message
        else if (error.response && error.response.data && error.response.data.message) {
          showError(error.response.data.message, 'Login Failed');
        }
        // Generic error fallback
        else {
          showError('Something went wrong during login. Please try again.', 'Login Error');
        }
      }
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col py-12 sm:px-6 lg:px-8">
      <div className="absolute top-8 left-8">
        <img src={logo} alt="Hitolicious Logo" className="h-[140px] w-auto" />
      </div>
      <div className="absolute top-8 right-8">
        <Link
          to="/"
          className="px-4 py-2 text-[16px] font-semibold text-gray-700 border-2 border-gray-200 rounded-xl hover:text-black hover:border-black transition-all duration-200"
        >
          Customer Sign In
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-[200px] text-center text-[40px] font-bold tracking-tight text-gray-900">
          Hitolicious Admin Panel
        </h2>
        <p className="mt-2 text-center text-[25px] text-gray-600">
          Sign in to your admin account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-[18px] font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-2 text-[18px] text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[18px] font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="mt-2 text-[18px] text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-[18px] font-semibold text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all duration-200"
              >
                Sign in
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-[18px]">
                <span className="px-2 bg-white text-gray-500">
                  New here?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/adminSignup"
                className="w-full flex justify-center py-3 px-4 border-2 border-gray-200 rounded-xl text-[18px] font-semibold text-gray-700 hover:text-black hover:border-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all duration-200"
              >
                Create an account
              </Link>
            </div>
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

export default Signin;
