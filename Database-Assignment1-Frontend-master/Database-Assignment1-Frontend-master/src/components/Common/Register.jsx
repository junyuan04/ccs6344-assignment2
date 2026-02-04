import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    contact: '',
    address: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Call the backend registration API
      const response = await authAPI.register(formData);
      
      if (response.data.success) {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Create an Account</h2>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Username</label>
            <input 
              type="text" name="username" required 
              className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Email</label>
            <input 
              type="email" name="email" required 
              className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Password</label>
            <input 
              type="password" name="password" required 
              className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Contact Number</label>
            <input 
              type="text" name="contact" 
              className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Address</label>
            <textarea 
              name="address" rows="2"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
              onChange={handleChange}
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 rounded hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;