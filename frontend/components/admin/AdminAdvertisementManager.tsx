import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store";
import {
  fetchAllAdvertisements,
  createNewAdvertisement,
  updateAdvertisementData,
  toggleAdvertisement,
  deleteAdvertisementData,
  clearError,
} from "@/lib/redux/advertisementSlice";
import { Advertisement } from "@/lib/service/advertisementService";

const AdminAdvertisementManager: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    allAdvertisements: advertisements,
    loading,
    error,
  } = useSelector((state: RootState) => state.advertisement);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchAllAdvertisements());
  }, [dispatch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
    }
  };

  const handleCreateAdvertisement = async () => {
    if (!selectedFile) {
      alert("Please select a video file");
      return;
    }

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      await dispatch(createNewAdvertisement(formData)).unwrap();
      setSelectedFile(null);
      setIsCreating(false);
      alert("Advertisement created successfully");
    } catch {
      alert("Failed to create advertisement");
    }
  };

  const handleUpdateAdvertisement = async (id: string) => {
    if (!selectedFile) {
      alert("Please select a video file");
      return;
    }

    const formData = new FormData();
    formData.append("video", selectedFile);

    try {
      await dispatch(updateAdvertisementData({ id, formData })).unwrap();
      setSelectedFile(null);
      setEditingId(null);
      alert("Advertisement updated successfully");
    } catch {
      alert("Failed to update advertisement");
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await dispatch(toggleAdvertisement(id)).unwrap();
    } catch {
      alert("Failed to toggle advertisement status");
    }
  };

  const handleDeleteAdvertisement = async (id: string) => {
    if (confirm("Are you sure you want to delete this advertisement?")) {
      try {
        await dispatch(deleteAdvertisementData(id)).unwrap();
        alert("Advertisement deleted successfully");
      } catch {
        alert("Failed to delete advertisement");
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Manage Advertisements</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button
            onClick={() => dispatch(clearError())}
            className="ml-2 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Create Advertisement Section */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-xl font-semibold mb-4">
          {isCreating ? "Create New Advertisement" : "Add Advertisement"}
        </h3>

        {isCreating ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="font-semibold">Select Video File</label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="p-2 border border-gray-300 rounded"
              />
              {selectedFile && (
                <p className="text-sm text-green-600">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateAdvertisement}
                disabled={!selectedFile || loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                {loading ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + New Advertisement
          </button>
        )}
      </div>

      {/* Advertisements List */}
      <div>
        <h3 className="text-xl font-semibold mb-4">
          All Advertisements ({advertisements.length})
        </h3>

        {loading && !editingId ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : advertisements.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No advertisements yet. Create one to get started!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    ID
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Video
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Views
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Status
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Created
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {advertisements.map((ad: Advertisement) => (
                  <tr key={ad.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 text-sm font-mono">
                      {ad.id.slice(0, 8)}...
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      {ad.videoFilename}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {ad.views}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span
                        className={`px-3 py-1 rounded text-white text-sm ${
                          ad.isActive ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        {ad.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      {new Date(ad.createdAt).toLocaleDateString()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm space-y-2">
                      {editingId === ad.id ? (
                        <div className="space-y-2">
                          <div className="flex flex-col gap-2">
                            <input
                              type="file"
                              accept="video/*"
                              onChange={handleFileChange}
                              className="p-2 border border-gray-300 rounded text-xs"
                            />
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdateAdvertisement(ad.id)}
                              disabled={!selectedFile || loading}
                              className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-400"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setSelectedFile(null);
                              }}
                              className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => setEditingId(ad.id)}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(ad.id)}
                            disabled={loading}
                            className={`px-2 py-1 rounded text-xs text-white ${
                              ad.isActive
                                ? "bg-orange-500 hover:bg-orange-600"
                                : "bg-green-500 hover:bg-green-600"
                            } disabled:bg-gray-400`}
                          >
                            {ad.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDeleteAdvertisement(ad.id)}
                            disabled={loading}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:bg-gray-400"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAdvertisementManager;
