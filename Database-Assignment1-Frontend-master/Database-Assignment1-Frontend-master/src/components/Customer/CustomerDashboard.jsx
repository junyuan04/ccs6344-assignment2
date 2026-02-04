import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext.jsx";
import { billsAPI, feedbacksAPI } from "../../services/api";

const CustomerDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [bills, setBills] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("bills");

  // Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackContent, setFeedbackContent] = useState("");

  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get customer's bills
      const billsRes = await billsAPI.getMy(user.userId);
      setBills(billsRes.data.bills || []);

      // Get customer's feedbacks
      const feedbacksRes = await feedbacksAPI.getMy(user.userId);
      setFeedbacks(feedbacksRes.data.feedbacks || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      showMessage("error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (bill) => {
    try {
      // Simulate payment (update bill status)
      await billsAPI.update(bill.billId, { status: "PAID" });

      showMessage("success", "Payment successful!");
      fetchData(); // Refresh data
    } catch (error) {
      showMessage("error", error.response?.data?.message || "Payment failed");
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackContent.trim()) {
      showMessage("error", "Please enter feedback content");
      return;
    }

    try {
      await feedbacksAPI.create({
        customerId: user.userId, // Will be mapped in mock API
        rating,
        content: feedbackContent,
      });

      showMessage("success", "Feedback submitted successfully!");
      setShowFeedbackModal(false);
      setRating(5);
      setFeedbackContent("");
      fetchData();
    } catch (error) {
      showMessage(
        "error",
        error.response?.data?.message || "Failed to submit feedback"
      );
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const unpaidBills = bills.filter((b) => b.status === "UNPAID");
  const totalUnpaid = unpaidBills.reduce((sum, bill) => sum + bill.amount, 0);

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
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          
          <div>
            <h1 className="text-2xl font-bold">Customer Dashboard</h1>
            <p className="text-sm opacity-90">Welcome, {user?.username}</p>
          </div>

          <div className="flex gap-3">
            <Link 
              to="/profile" 
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center"
            >
              Edit Profile
            </Link>
            
            <button
              onClick={handleLogout}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Logout
            </button>
          </div>

        </div>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Unpaid Bills</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {unpaidBills.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">
              Total Amount Due
            </h3>
            <p className="text-3xl font-bold text-red-600 mt-2">
              RM {totalUnpaid.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-medium">Total Bills</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {bills.length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab("bills")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "bills"
                    ? "border-b-2 border-purple-600 text-purple-600"
                    : "text-gray-600 hover:text-purple-600"
                }`}
              >
                My Bills
              </button>
              <button
                onClick={() => setActiveTab("feedbacks")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "feedbacks"
                    ? "border-b-2 border-purple-600 text-purple-600"
                    : "text-gray-600 hover:text-purple-600"
                }`}
              >
                My Feedbacks
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Bills Tab */}
            {activeTab === "bills" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Electricity Bills</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Period
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Usage (kWh)
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Due Date
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bills.map((bill) => (
                        <tr key={bill.billId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {bill.periodStart} to {bill.periodEnd}
                          </td>
                          <td className="px-4 py-3">{bill.usageKWh}</td>
                          <td className="px-4 py-3 font-semibold">
                            RM {bill.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">{bill.dueDate}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-sm ${
                                bill.status === "PAID"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {bill.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {bill.status === "UNPAID" && (
                              <button
                                onClick={() => handlePayment(bill)}
                                className="bg-purple-600 text-white px-4 py-1 rounded hover:bg-purple-700"
                              >
                                Pay Now
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Feedbacks Tab */}
            {activeTab === "feedbacks" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">My Feedbacks</h2>
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    Submit New Feedback
                  </button>
                </div>
                <div className="space-y-4">
                  {feedbacks.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No feedbacks yet. Submit your first feedback!
                    </p>
                  ) : (
                    feedbacks.map((feedback) => (
                      <div
                        key={feedback.feedbackId}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">
                                Rating: {feedback.rating}/5
                              </h3>
                              <span className="text-yellow-500">
                                {"⭐".repeat(feedback.rating)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {feedback.createdAt}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              feedback.status === "Open"
                                ? "bg-yellow-100 text-yellow-700"
                                : feedback.status === "Resolved"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {feedback.status}
                          </span>
                        </div>
                        <p className="text-gray-700">{feedback.content}</p>

                        {feedback.replies && feedback.replies.length > 0 && (
                          <div className="mt-3 pl-4 border-l-2 border-gray-300">
                            <p className="text-sm font-semibold text-gray-600">
                              Staff Reply:
                            </p>
                            {feedback.replies.map((reply) => (
                              <div key={reply.replyId} className="mt-2">
                                <p className="text-sm text-gray-700">
                                  {reply.content}
                                </p>
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

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Submit Feedback</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Rating
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ Excellent (5)</option>
                  <option value={4}>⭐⭐⭐⭐ Good (4)</option>
                  <option value={3}>⭐⭐⭐ Average (3)</option>
                  <option value={2}>⭐⭐ Poor (2)</option>
                  <option value={1}>⭐ Very Poor (1)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Your Feedback
                </label>
                <textarea
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  placeholder="Please share your feedback..."
                  rows="4"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleFeedbackSubmit}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                  Submit
                </button>
                <button
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setFeedbackContent("");
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

export default CustomerDashboard;
