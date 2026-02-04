import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import { usersAPI, customersAPI, billsAPI, feedbacksAPI } from '../../services/api';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Create Customer Modal
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    password: '',
    contact: '',
    address: ''
  });

  // Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, customersRes, billsRes, feedbacksRes] = await Promise.all([
        usersAPI.getAll(),
        customersAPI.getAll(),
        billsAPI.getAll(),
        feedbacksAPI.getAll()
      ]);

      setUsers(usersRes.data.users || []);
      setCustomers(customersRes.data.customers || []);
      setBills(billsRes.data.bills || []);
      setFeedbacks(feedbacksRes.data.feedbacks || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email || !newCustomer.password) {
      showMessage('error', 'Name, email, and password are required');
      return;
    }

    try {
      await customersAPI.create(newCustomer);
      
      showMessage('success', 'Customer created successfully!');
      setShowCreateCustomerModal(false);
      setNewCustomer({ name: '', email: '', password: '', contact: '', address: '' });
      fetchData();
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to create customer');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteTarget) return;

    try {
      await customersAPI.remove(deleteTarget.profileId);
      
      showMessage('success', 'Customer deleted successfully!');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchData();
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to delete customer');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Calculate statistics
  const totalUsers = users.length;
  const totalCustomers = customers.length;
  const totalStaff = users.filter(u => u.role === 'Staff').length;
  const totalAdmins = users.filter(u => u.role === 'Admin').length;
  const totalBills = bills.length;
  const unpaidBills = bills.filter(b => b.status === 'UNPAID').length;
  const totalRevenue = bills.filter(b => b.status === 'PAID').reduce((sum, b) => sum + b.amount, 0);
  const pendingRevenue = bills.filter(b => b.status === 'UNPAID').reduce((sum, b) => sum + b.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm opacity-90">Welcome, {user?.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-red-600 text-red-600'
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'border-b-2 border-red-600 text-red-600'
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                All Users
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'customers'
                    ? 'border-b-2 border-red-600 text-red-600'
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                Manage Customers
              </button>
              <button
                onClick={() => setActiveTab('bills')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'bills'
                    ? 'border-b-2 border-red-600 text-red-600'
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                All Bills
              </button>
              <button
                onClick={() => setActiveTab('feedbacks')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'feedbacks'
                    ? 'border-b-2 border-red-600 text-red-600'
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                All Feedbacks
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">System Overview</h2>
                
                {/* User Statistics */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700">User Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow">
                      <h4 className="text-sm opacity-90">Total Users</h4>
                      <p className="text-4xl font-bold mt-2">{totalUsers}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow">
                      <h4 className="text-sm opacity-90">Customers</h4>
                      <p className="text-4xl font-bold mt-2">{totalCustomers}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow">
                      <h4 className="text-sm opacity-90">Staff</h4>
                      <p className="text-4xl font-bold mt-2">{totalStaff}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-lg shadow">
                      <h4 className="text-sm opacity-90">Admins</h4>
                      <p className="text-4xl font-bold mt-2">{totalAdmins}</p>
                    </div>
                  </div>
                </div>

                {/* Billing Statistics */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700">Billing Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white border-2 border-gray-200 p-6 rounded-lg shadow-sm">
                      <h4 className="text-sm text-gray-600">Total Bills</h4>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{totalBills}</p>
                    </div>
                    <div className="bg-white border-2 border-orange-200 p-6 rounded-lg shadow-sm">
                      <h4 className="text-sm text-gray-600">Unpaid Bills</h4>
                      <p className="text-3xl font-bold text-orange-600 mt-2">{unpaidBills}</p>
                    </div>
                    <div className="bg-white border-2 border-green-200 p-6 rounded-lg shadow-sm">
                      <h4 className="text-sm text-gray-600">Total Revenue</h4>
                      <p className="text-3xl font-bold text-green-600 mt-2">RM {totalRevenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-white border-2 border-yellow-200 p-6 rounded-lg shadow-sm">
                      <h4 className="text-sm text-gray-600">Pending Revenue</h4>
                      <p className="text-3xl font-bold text-yellow-600 mt-2">RM {pendingRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-700">Recent Feedbacks</h3>
                  <div className="space-y-3">
                    {feedbacks.slice(0, 3).map((feedback) => (
                      <div key={feedback.feedbackId} className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{feedback.customerName}</p>
                            <p className="text-sm text-gray-600">{feedback.content}</p>
                            <p className="text-xs text-gray-500 mt-1">{feedback.createdAt}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs ${
                            feedback.status === 'Open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {feedback.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-bold mb-4">All Users</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">User ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Username</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Role</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map((u) => (
                        <tr key={u.userId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">#{u.userId}</td>
                          <td className="px-4 py-3 font-medium">{u.username}</td>
                          <td className="px-4 py-3">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              u.role === 'Admin' ? 'bg-red-100 text-red-700' :
                              u.role === 'Staff' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{u.createdAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Manage Customers</h2>
                  <button
                    onClick={() => setShowCreateCustomerModal(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
                  >
                    + Create Customer
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Contact</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Address</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {customers.map((customer) => (
                        <tr key={customer.customerId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">#{customer.customerId}</td>
                          <td className="px-4 py-3 font-medium">{customer.name}</td>
                          <td className="px-4 py-3">{customer.email}</td>
                          <td className="px-4 py-3">{customer.contact}</td>
                          <td className="px-4 py-3 text-sm">{customer.address}</td>
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                              {customer.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setDeleteTarget(customer);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-800 font-medium text-sm"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bills Tab */}
            {activeTab === 'bills' && (
              <div>
                <h2 className="text-xl font-bold mb-4">All Bills</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Bill ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Customer</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Period</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Usage</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bills.map((bill) => (
                        <tr key={bill.billId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">#{bill.billId}</td>
                          <td className="px-4 py-3">{bill.customerName}</td>
                          <td className="px-4 py-3 text-sm">{bill.periodStart} to {bill.periodEnd}</td>
                          <td className="px-4 py-3">{bill.usageKWh} kWh</td>
                          <td className="px-4 py-3 font-semibold">RM {bill.amount.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              bill.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {bill.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Feedbacks Tab */}
            {activeTab === 'feedbacks' && (
              <div>
                <h2 className="text-xl font-bold mb-4">All Customer Feedbacks</h2>
                <div className="space-y-4">
                  {feedbacks.map((feedback) => (
                    <div key={feedback.feedbackId} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{feedback.customerName}</h3>
                          <p className="text-sm text-gray-600">Rating: {'⭐'.repeat(feedback.rating)} ({feedback.rating}/5)</p>
                          <p className="text-sm text-gray-500">{feedback.createdAt}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          feedback.status === 'Open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {feedback.status}
                        </span>
                      </div>
                      <p className="text-gray-700 mt-2">{feedback.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Customer Modal */}
      {showCreateCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Create New Customer</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Full Name *</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Email *</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Password *</label>
                <input
                  type="password"
                  value={newCustomer.password}
                  onChange={(e) => setNewCustomer({...newCustomer, password: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Contact</label>
                <input
                  type="text"
                  value={newCustomer.contact}
                  onChange={(e) => setNewCustomer({...newCustomer, contact: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="012-3456789"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Address</label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="123 Main St, KL"
                  rows="2"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateCustomer}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-semibold"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateCustomerModal(false);
                    setNewCustomer({ name: '', email: '', password: '', contact: '', address: '' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Delete Customer?</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCustomer}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-semibold"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;