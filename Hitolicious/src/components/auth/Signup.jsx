import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../../assets/logo.jpg';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    birthday: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Enforce digits-only for phone while typing
    const nextValue = name === 'phone' ? value.replace(/\D/g, '') : value;
    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.birthday) newErrors.birthday = 'Birthday is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    else if (!/^\d{11}$/.test(formData.phone)) newErrors.phone = 'Phone must be exactly 11 digits';
    if (!formData.address.trim()) newErrors.address = 'Address is required';

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
        const { confirmPassword, ...sendData } = formData;
        const res = await axios.post('http://localhost:5000/api/customer/signup', sendData);

        if (res.data.success) {
          // Store user data in localStorage after successful signup
          localStorage.setItem('userFullName', formData.fullName);
          localStorage.setItem('userEmail', formData.email);
          localStorage.setItem('userBirthday', formData.birthday);
          localStorage.setItem('userPhone', formData.phone);
          localStorage.setItem('userAddress', formData.address);
          
          const initials = formData.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
          localStorage.setItem('userInitials', initials);
          localStorage.setItem('userName', formData.email.split('@')[0]);
          
          alert('Account created successfully!');
          navigate('/signin');
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
        <h2 className="mt-[100px] text-center text-[40px] font-bold tracking-tight text-gray-900">
          Welcome to Hitolicious
        </h2>
        <p className="mt-2 text-center text-[25px] text-gray-600">
          Create your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className="block text-[18px] font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-black"
                placeholder="Enter your Full Name"
              />
              {errors.fullName && <p className="text-red-600">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="birthday" className="block text-[18px] font-medium text-gray-700">
                Birthday
              </label>
              <input
                id="birthday"
                name="birthday"
                type="date"
                required
                value={formData.birthday}
                onChange={handleChange}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-black"
              />
              {errors.birthday && <p className="text-red-600">{errors.birthday}</p>}
            </div>

          <div>
            <label htmlFor="phone" className="block text-[18px] font-medium text-gray-700">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              maxLength={11}
              value={formData.phone}
              onChange={handleChange}
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-black"
              placeholder="Enter your phone number"
            />
            {errors.phone && <p className="text-red-600">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="address" className="block text-[18px] font-medium text-gray-700">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              required
              value={formData.address}
              onChange={handleChange}
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-black"
              placeholder="Enter your full address"
            />
            {errors.address && <p className="text-red-600">{errors.address}</p>}
          </div>

            <div>
              <label htmlFor="email" className="block text-[18px] font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-black"
                placeholder="Enter your email"
              />
              {errors.email && <p className="text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-[18px] font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-black"
                placeholder="Create a password"
              />
              {errors.password && <p className="text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[18px] font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-black"
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && <p className="text-red-600">{errors.confirmPassword}</p>}
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-[18px] font-semibold text-white bg-black hover:bg-gray-800 transition-all duration-200"
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
                to="/signin"
                className="w-full flex justify-center py-3 px-4 border-2 border-gray-200 rounded-xl text-[18px] font-semibold text-gray-700 hover:text-black hover:border-black"
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
