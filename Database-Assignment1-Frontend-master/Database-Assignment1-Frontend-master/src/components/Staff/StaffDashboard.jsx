import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import { billsAPI, feedbacksAPI, customersAPI } from '../../services/api';

const StaffDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bills');

  // Feedback Reply Modal State
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  // Update Status Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Staff can see all bills
      const billsRes = await billsAPI.getAll();
      setBills(billsRes.data.bills || []);

      // Get all customers
      const customersRes = await customersAPI.getAll();
      setCustomers(customersRes.data.customers || []);

      // Get all feedbacks
      const feedbacksRes = await feedbacksAPI.getAll();
      setFeedbacks(feedbacksRes.data.feedbacks || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFeedbackStatus = async () => {
    if (!selectedFeedback || !newStatus) return;

    try {
      await feedbacksAPI.updateStatus(selectedFeedback.feedbackId, newStatus);
      
      showMessage('success', 'Feedback status updated!');
      setShowStatusModal(false);
      setSelectedFeedback(null);
      setNewStatus('');
      fetchData();
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to update status');
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
  const totalBills = bills.length;
  const unpaidBills = bills.filter(b => b.status === 'UNPAID').length;
  const totalRevenue = bills.filter(b => b.status === 'PAID').reduce((sum, b) => sum + b.amount, 0);
  const openFeedbacks = feedbacks.filter(f => f.status === 'Open').length;

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
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Staff Dashboard</h1>
            <p className="text-sm opacity-90">Welcome, {user?.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
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

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Total Bills</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{totalBills}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Unpaid Bills</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">{unpaidBills}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">RM {totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Open Feedbacks</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">{openFeedbacks}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('bills')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'bills'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                All Bills
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'customers'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Customers
              </button>
              <button
                onClick={() => setActiveTab('feedbacks')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'feedbacks'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Feedbacks
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Bills Tab */}
            {activeTab === 'bills' && (
              <div>
                <h2 className="text-xl font-bold mb-4">All Electricity Bills</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Bill ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Customer</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Period</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Usage (kWh)</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Due Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bills.map((bill) => (
                        <tr key={bill.billId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">#{bill.billId}</td>
                          <td className="px-4 py-3">{bill.customerName}</td>
                          <td className="px-4 py-3 text-sm">
                            {bill.periodStart} to {bill.periodEnd}
                          </td>
                          <td className="px-4 py-3">{bill.usageKWh}</td>
                          <td className="px-4 py-3 font-semibold">RM {bill.amount.toFixed(2)}</td>
                          <td className="px-4 py-3">{bill.dueDate}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              bill.status === 'PAID'
                                ? 'bg-green-100 text-green-700'
                                : bill.status === 'OVERDUE'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
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

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Customer List</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Customer ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Contact</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Address</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
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
                <h2 className="text-xl font-bold mb-4">Customer Feedbacks</h2>
                <div className="space-y-4">
                  {feedbacks.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No feedbacks yet.</p>
                  ) : (
                    feedbacks.map((feedback) => (
                      <div key={feedback.feedbackId} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{feedback.customerName}</h3>
                              <span className="text-yellow-500 text-sm">
                                {'⭐'.repeat(feedback.rating)} ({feedback.rating}/5)
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{feedback.createdAt}</p>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              feedback.status === 'Open' ? 'bg-yellow-100 text-yellow-700' :
                              feedback.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {feedback.status}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedFeedback(feedback);
                                setNewStatus(feedback.status);
                                setShowStatusModal(true);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              Update Status
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-700 mb-3">{feedback.content}</p>
                        
                        {feedback.replies && feedback.replies.length > 0 && (
                          <div className="mt-3 pl-4 border-l-2 border-blue-300 bg-white p-3 rounded">
                            <p className="text-sm font-semibold text-blue-600">Staff Replies:</p>
                            {feedback.replies.map((reply) => (
                              <div key={reply.replyId} className="mt-2">
                                <p className="text-sm text-gray-700">{reply.content}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  by {reply.replierName} on {reply.createdAt}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Update Status Modal */}
      {showStatusModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Update Feedback Status</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Feedback from: <span className="font-semibold">{selectedFeedback.customerName}</span>
                </p>
                <p className="text-sm text-gray-700 italic">"{selectedFeedback.content}"</p>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Open">Open</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpdateFeedbackStatus}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Update
                </button>
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedFeedback(null);
                    setNewStatus('');
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
    </div>
  );
};

export default StaffDashboard;