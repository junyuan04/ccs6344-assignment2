import React, { useState, useEffect } from "react";
import { customerAPI } from "../../services/api";

const Profile = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Fetch Data
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await customerAPI.getProfile();
      const data = response.data.customer || response.data;

      setFormData({
        name: data.name || "",
        email: data.email || "",
        contact: data.contact || "",
        address: data.address || "",
      });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load profile." });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Submit Updates
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      // Only send contact and address
      await customerAPI.updateProfile({
        contact: formData.contact,
        address: formData.address,
      });
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMessage({ type: "error", text: "Update failed. Please try again." });
    }
  };

  if (loading) return <div className="p-8 text-center">Loading profile...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700">
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">My Profile</h2>

        {message.text && (
          <div
            className={`p-3 rounded mb-4 ${
              message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Read Only */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-600 text-sm mb-1">
                Name (Read-only)
              </label>
              <input
                type="text"
                value={formData.name}
                readOnly
                className="w-full p-2 bg-gray-100 border rounded cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-gray-600 text-sm mb-1">
                Email (Read-only)
              </label>
              <input
                type="text"
                value={formData.email}
                readOnly
                className="w-full p-2 bg-gray-100 border rounded cursor-not-allowed"
              />
            </div>
          </div>

          {/* Editable Fields */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Contact Number</label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-1">Address</label>
            <textarea
              name="address"
              rows="3"
              value={formData.address}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 rounded hover:bg-purple-700 transition"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
