import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../../assets/logo.jpg';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    birthday: '',
    work: '',
    email: '',
    password: '',
    confirmPassword: '',
    admin_phonenumber: '',
    admin_address: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // For phone number, only allow numeric input
    if (name === 'admin_phonenumber') {
      const numericValue = value.replace(/\D/g, ''); // Remove non-numeric characters
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.birthday) newErrors.birthday = 'Birthday is required';
    if (!formData.work.trim()) newErrors.work = 'Work position is required';
    if (!formData.admin_phonenumber.trim()) {
      newErrors.admin_phonenumber = 'Phone number is required';
    } else if (formData.admin_phonenumber.length !== 11) {
      newErrors.admin_phonenumber = 'Phone number must be exactly 11 digits';
    } else if (!/^\d{11}$/.test(formData.admin_phonenumber)) {
      newErrors.admin_phonenumber = 'Phone number must contain only numbers';
    }
    if (!formData.admin_address.trim()) newErrors.admin_address = 'Address is required';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      try {
        const { confirmPassword, ...sendData } = formData; // Exclude confirmPassword
        const res = await axios.post('http://localhost:5000/api/admin/signup', sendData);

        if (res.data.success) {
          alert('Account created successfully!');
          navigate('/adminSignin');
        } else {
          alert('Signup failed: ' + res.data.message);
        }
      } catch (error) {
        console.error('Signup error:', error);
        alert('Something went wrong during signup.');
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

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-[80px] text-center text-[40px] font-bold tracking-tight text-gray-900">
          Admin Sign Up
        </h2>
        <p className="mt-2 text-center text-[25px] text-gray-600">
          Create your admin account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className="block text-[18px] font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  placeholder="Enter your Full Name"
                />
                {errors.fullName && (
                  <p className="mt-2 text-[18px] text-red-600">{errors.fullName}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="birthday" className="block text-[18px] font-medium text-gray-700">
                Birthday
              </label>
              <div className="mt-1">
                <input
                  id="birthday"
                  name="birthday"
                  type="date"
                  required
                  value={formData.birthday}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                />
                {errors.birthday && (
                  <p className="mt-2 text-[18px] text-red-600">{errors.birthday}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="work" className="block text-[18px] font-medium text-gray-700">
                Work Position
              </label>
              <div className="mt-1">
                <input
                  id="work"
                  name="work"
                  type="text"
                  required
                  value={formData.work}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  placeholder="Enter your Work"
                />
                {errors.work && (
                  <p className="mt-2 text-[18px] text-red-600">{errors.work}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="admin_phonenumber" className="block text-[18px] font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  id="admin_phonenumber"
                  name="admin_phonenumber"
                  type="tel"
                  required
                  maxLength={11}
                  value={formData.admin_phonenumber}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  placeholder="Enter your phone number (11 digits)"
                />
                {errors.admin_phonenumber && (
                  <p className="mt-2 text-[18px] text-red-600">{errors.admin_phonenumber}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="admin_address" className="block text-[18px] font-medium text-gray-700">
                Address
              </label>
              <div className="mt-1">
                <textarea
                  id="admin_address"
                  name="admin_address"
                  required
                  rows={3}
                  value={formData.admin_address}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200 resize-none"
                  placeholder="Enter your address"
                />
                {errors.admin_address && (
                  <p className="mt-2 text-[18px] text-red-600">{errors.admin_address}</p>
                )}
              </div>
            </div>

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
                  placeholder="Create a password"
                />
                {errors.password && (
                  <p className="mt-2 text-[18px] text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[18px] font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200"
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="mt-2 text-[18px] text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-[18px] font-semibold text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all duration-200"
              >
                Create account
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
                  Already have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/adminSignin"
                className="w-full flex justify-center py-3 px-4 border-2 border-gray-200 rounded-xl text-[18px] font-semibold text-gray-700 hover:text-black hover:border-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all duration-200"
              >
                Sign in instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
