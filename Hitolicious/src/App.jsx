import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import Signup from './components/auth/Signup'
import Signin from './components/auth/Signin'
import AdminSignup from './components/auth/adminSignup'
import FoodMenu from './components/auth/foodmenu' 
import AdminFoodDashboard from './components/auth/adminFoodDashboard'
import AdminSignin from './components/auth/adminSignin'
import AdminFoodDetails from './components/auth/adminFoodDetails';
import HomePage from './components/auth/HomePage';
import AdminBestSellers from './components/auth/AdminBestSellers';
import Cart from './components/auth/Cart';
import Orders from './components/auth/Orders';
import AdminOrders from './components/auth/AdminOrders';
import PaymentCOD from './components/auth/PaymentCOD';
import OnlinePayment from './components/auth/OnlinePayment';
import AdminSettings from './components/auth/AdminSettings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/adminSignup" element={<AdminSignup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/adminSignin" element={<AdminSignin />} />
        <Route path="/foodmenu" element={<FoodMenu />} />
        <Route path="/adminFoodDashboard" element={<AdminFoodDashboard />} />
        <Route path="/adminFoodDetails" element={<AdminFoodDetails />} />
        <Route path="/adminBestSellers" element={<AdminBestSellers />} />
        <Route path="/adminSettings" element={<AdminSettings />} />
        <Route path="/adminOrders" element={<AdminOrders />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/order" element={<Orders />} />
        <Route path="/payment-cod" element={<PaymentCOD />} />
        <Route path="/online-payment" element={<OnlinePayment />} />
        <Route path="/" element={<Signin />} />
        <Route path="/home" element={<HomePage />} />
      </Routes>
    </Router>
  )
}

export default App
