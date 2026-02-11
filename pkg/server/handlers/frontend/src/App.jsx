import React,{ useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./App.css";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import {
  FaFolder,
  FaFileAlt,
  FaImage,
  FaVideo,
  FaMusic,
  FaFile,
  FaBox,
  FaChevronLeft,
  FaChevronRight,
  FaHome,
  FaTimes,
  FaDownload,
  FaSpinner,
} from "react-icons/fa";

const fpPromise = FingerprintJS.load();

const getId = async () => {
  const fp = await fpPromise;
  const result = await fp.get();
  return result.visitorId;
};

// Utility function to format file sizes
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const Breadcrumbs = ({ path, navigateTo }) => {
  const parts = path.split("/").filter(Boolean);
  const breadcrumbs = [{ name: "Root", path: "/" }];

  let currentPath = "";
  for (const part of parts) {
    currentPath += `/${part}`;
    breadcrumbs.push({ name: part, path: currentPath });
  }

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        {breadcrumbs.map((crumb, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && (
              <svg
                className="w-4 h-4 text-gray-400 mx-1"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <button
              onClick={() => {
                if (index < breadcrumbs.length - 1 || breadcrumbs.length === 1) {
                  navigateTo(crumb.path);
                }
              }}
              className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                index === breadcrumbs.length - 1
                  ? "text-gray-700 cursor-default"
                  : "text-blue-600 hover:text-blue-800 hover:underline"
              }`}
              disabled={index === breadcrumbs.length - 1 && breadcrumbs.length > 1}
            >
              {index === 0 && <FaHome className="w-4 h-4" />}
              {crumb.name}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Map mimeType to category
const getCategoryFromMime = (mime) => {
  if (!mime) return "Others";
  if (mime.startsWith("image/")) return "Pictures";
  if (mime.startsWith("video/")) return "Videos";
  if (mime.startsWith("audio/")) return "Music";

  if (
    mime.includes("pdf") ||
    mime.includes("msword") ||
    mime.includes("text") ||
    mime.includes("officedocument") ||
    mime.includes("presentation") ||
    mime.includes("spreadsheet")
  ) {
    return "Documents";
  }

  return "Others";
};

const Icon = {
  Directories: FaFolder,
  Documents: FaFileAlt,
  Pictures: FaImage,
  Videos: FaVideo,
  Music: FaMusic,
  Others: FaFile,
  All: FaBox,
  ToggleLeft: FaChevronLeft,
  ToggleRight: FaChevronRight,
};

const FileViewModal = ({ file, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  if (!file) return null;

  const fileViewUrl = `/download?file=${encodeURIComponent(file.path)}&view=1`;

  const handleLoad = () => setLoading(false);
  const handleError = () => {
    setLoading(false);
    setError("Failed to load preview");
  };

  const renderPreview = () => {
    const mime = file.mimeType;
    
    if (mime.startsWith("image/")) {
      return (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <FaSpinner className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          )}
          <img
            src={fileViewUrl}
            alt="Preview"
            className="max-w-full h-auto mx-auto"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      );
    } else if (mime.startsWith("video/")) {
      return (
        <video
          controls
          className="w-full max-h-96"
          onLoadedData={handleLoad}
          onError={handleError}
        >
          <source src={fileViewUrl} type={file.mimeType} />
          Your browser does not support the video tag.
        </video>
      );
    } else if (mime.startsWith("audio/")) {
      return (
        <div className="p-8">
          <audio
            controls
            className="w-full"
            onLoadedData={handleLoad}
            onError={handleError}
          >
            <source src={fileViewUrl} type={file.mimeType} />
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    } else if (mime === "application/pdf") {
      return (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <FaSpinner className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          )}
          <iframe
            src={fileViewUrl}
            className="w-full h-96"
            title="PDF Preview"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      );
    } else if (mime.startsWith("text/")) {
      return (
        <div className="p-4 bg-gray-50 rounded overflow-auto max-h-96">
          <iframe
            src={fileViewUrl}
            className="w-full h-96 bg-white"
            title="Text Preview"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      );
    } else {
      return (
        <div className="text-center p-8">
          <div className="text-6xl text-gray-400 mb-4">
            <FaFile className="mx-auto" />
          </div>
          <p className="mb-4 text-gray-600">No preview available for this file type.</p>
          <a
            href={`/download?file=${encodeURIComponent(file.path)}`}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            download
          >
            <FaDownload />
            Download File
          </a>
        </div>
      );
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-xl font-semibold text-gray-800 truncate">
              {file.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {file.size && `Size: ${file.size}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <FaTimes className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {error ? (
            <div className="flex items-center justify-center h-full text-red-500">
              <p>{error}</p>
            </div>
          ) : (
            renderPreview()
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
          <a
            href={`/download?file=${encodeURIComponent(file.path)}`}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            download
          >
            <FaDownload />
            Download
          </a>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ category, searchQuery }) => {
  return (
    <tr>
      <td colSpan={3} className="py-16 text-center">
        <div className="text-gray-400 text-6xl mb-4">
          <FaFolder className="mx-auto" />
        </div>
        <p className="text-gray-600 text-lg">
          {searchQuery
            ? `No files found matching "${searchQuery}"`
            : `No ${category.toLowerCase()} found`}
        </p>
      </td>
    </tr>
  );
};

function App() {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState("/");
  const [visitorId, setVisitorId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [config, setConfig] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All Files");
  const [showFileViewModal, setShowFileViewModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const categories = [
    { key: "All Files", label: "All Files", icon: Icon.All },
    { key: "Directories", label: "Folders", icon: Icon.Directories },
    { key: "Documents", label: "Documents", icon: Icon.Documents },
    { key: "Pictures", label: "Pictures", icon: Icon.Pictures },
    { key: "Videos", label: "Videos", icon: Icon.Videos },
    { key: "Music", label: "Music", icon: Icon.Music },
    { key: "Others", label: "Others", icon: Icon.Others },
  ];

  const connectWebSocket = useCallback(async () => {
    try {
      setConnectionStatus("connecting");
      ws.current = new WebSocket(`ws://${window.location.host}/connect`);

      ws.current.onopen = async () => {
        setConnectionStatus("connected");
        setError(null);
        const id = await getId();
        setVisitorId(id);
        ws.current.send(`CONNECT: ${id}`);
        ws.current.send(`FILES: /`);
      };

      ws.current.onmessage = (evt) => {
        const message = evt.data;

        if (message.startsWith("FILES:")) {
          try {
            const filesData = JSON.parse(message.replace("FILES: ", ""));
            setFiles(filesData);
            setError(null);
          } catch (err) {
            console.error("Failed to parse FILES message", err);
            setError("Failed to load files");
          }
        } else if (message.startsWith("CONFIG:")) {
          try {
            setConfig(JSON.parse(message.replace("CONFIG: ", "")));
          } catch (err) {
            console.error("Failed to parse CONFIG message", err);
          }
        } else {
          console.log("RESPONSE:", message);
        }
      };

      ws.current.onclose = () => {
        console.log("WebSocket disconnected");
        setConnectionStatus("disconnected");
        // Attempt to reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.current.onerror = (err) => {
        console.error("WebSocket error", err);
        setConnectionStatus("error");
        setError("Connection error occurred");
      };
    } catch (err) {
      console.error("Failed to connect", err);
      setError("Failed to establish connection");
    }
  }, []);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connectWebSocket]);

  const navigateTo = useCallback((path) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      setCurrentPath(path);
      setSearchQuery(""); // Clear search when navigating
      ws.current.send(`FILES: ${path}`);
    }
  }, []);

  const handleFileClick = useCallback((file) => {
    if (file.is_dir) {
      const newPath =
        currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
      navigateTo(newPath);
    } else {
      setSelectedFile(file);
      setShowFileViewModal(true);
    }
  }, [currentPath, navigateTo]);

  const handleSort = useCallback(() => {
    setSortDirection((cur) => (cur === "asc" ? "desc" : "asc"));
  }, []);

  const handleReset = useCallback(() => {
    setActiveCategory("All Files");
    setSearchQuery("");
    setSortDirection("asc");
  }, []);

  const nameFiltered = useMemo(
    () =>
      files.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [files, searchQuery]
  );

  const sortedAndFilteredFiles = useMemo(() => {
    let items = nameFiltered.map((f) => {
      const filePath = currentPath === "/" ? `/${f.name}` : `${currentPath}/${f.name}`;
      const category = f.is_dir ? "Directories" : getCategoryFromMime(f.mimeType);
      
      // Parse size if it's a number (bytes) and format it
      let formattedSize = f.size;
      if (typeof f.size === 'number') {
        formattedSize = formatFileSize(f.size);
      }
      
      return {
        ...f,
        path: filePath,
        category,
        size: formattedSize,
      };
    });

    if (activeCategory && activeCategory !== "All Files") {
      items = items.filter((i) => i.category === activeCategory);
    }

    items.sort((a, b) => {
      if (activeCategory === "All Files") {
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
      }

      if (a.category < b.category) return -1;
      if (a.category > b.category) return 1;

      const A = a.name.toLowerCase();
      const B = b.name.toLowerCase();

      if (A < B) return sortDirection === "asc" ? -1 : 1;
      if (A > B) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return items;
  }, [nameFiltered, sortDirection, activeCategory, currentPath]);

  const categoryCounts = useMemo(() => {
    const counts = {
      Directories: 0,
      Documents: 0,
      Pictures: 0,
      Videos: 0,
      Music: 0,
      Others: 0,
    };
    for (const file of nameFiltered) {
      const category = file.is_dir
        ? "Directories"
        : getCategoryFromMime(file.mimeType);
      if (counts[category] !== undefined) {
        counts[category]++;
      }
    }
    return counts;
  }, [nameFiltered]);

  const grouped = useMemo(() => {
    const map = {};
    for (const item of sortedAndFilteredFiles) {
      const cat = item.category || "Others";
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    return map;
  }, [sortedAndFilteredFiles]);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {connectionStatus === "error" ? "Connection error..." : "Loading..."}
          </p>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r transition-all duration-300 flex flex-col shadow-lg ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b bg-gradient-to-r from-blue-50 to-blue-100">
          {!sidebarCollapsed && (
            <h2 className="text-lg font-bold text-gray-800">Categories</h2>
          )}
          <button
            onClick={() => setSidebarCollapsed((s) => !s)}
            className="p-2 rounded-lg hover:bg-white hover:shadow transition-all"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <Icon.ToggleRight className="w-5 h-5 text-gray-600" />
            ) : (
              <Icon.ToggleLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-auto py-4 px-2">
          <ul className="space-y-1">
            {categories.map((c) => {
              const active = activeCategory === c.key;
              const count = c.key === "All Files" 
                ? nameFiltered.length 
                : categoryCounts[c.key] || 0;
              
              return (
                <li key={c.key}>
                  <button
                    onClick={() => setActiveCategory(c.key)}
                    className={`w-full flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 ${
                      active
                        ? "bg-blue-500 text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    title={sidebarCollapsed ? c.label : ""}
                  >
                    <c.icon className={`w-5 h-5 ${active ? "text-white" : "text-gray-500"}`} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="text-sm font-medium flex-1 text-left">
                          {c.label}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          active ? "bg-blue-600" : "bg-gray-200 text-gray-600"
                        }`}>
                          {count}
                        </span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-4 py-3 border-t bg-gray-50">
          {!sidebarCollapsed && (
            <div className="text-xs">
              <p className="text-gray-500 font-medium mb-1">Visitor ID:</p>
              <p className="text-gray-700 break-all font-mono text-[10px]">
                {visitorId || "Loading..."}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-500"
                      : connectionStatus === "connecting"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="text-gray-600 capitalize">{connectionStatus}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-3">
              {config.Name || "File Browser"}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Breadcrumbs path={currentPath} navigateTo={navigateTo} />
              
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
                />
                <button
                  onClick={handleSort}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  title="Toggle sort direction"
                >
                  {sortDirection === "asc" ? "A→Z" : "Z→A"}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  title="Reset filters"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Files table */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Size
                    </th>
                  </tr>
                </thead>

                <tbody className="text-gray-700 divide-y divide-gray-200">
                  {sortedAndFilteredFiles.length === 0 ? (
                    <EmptyState category={activeCategory} searchQuery={searchQuery} />
                  ) : activeCategory === "All Files" ? (
                    ["Directories", "Documents", "Pictures", "Videos", "Music", "Others"].map(
                      (group) => {
                        const groupItems = grouped[group] || [];
                        if (!groupItems.length) return null;

                        return (
                          <tr key={group}>
                            <td colSpan={3} className="p-0">
                              <div className="py-3 px-6 bg-gray-50 font-bold text-gray-800 border-t-2 border-gray-300">
                                <div className="flex items-center gap-3">
                                  {React.createElement(Icon[group] || Icon.All, {
                                    className: "w-5 h-5 text-gray-600",
                                  })}
                                  <span>{group}</span>
                                  <span className="ml-2 text-sm text-gray-500 font-normal">
                                    ({groupItems.length})
                                  </span>
                                </div>
                              </div>

                              <table className="min-w-full">
                                <tbody className="divide-y divide-gray-100">
                                  {groupItems.map((file, idx) => (
                                    <tr
                                      key={`${file.name}-${idx}`}
                                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                                      onClick={() => handleFileClick(file)}
                                    >
                                      <td className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                          <div className="text-2xl text-gray-600">
                                            {React.createElement(
                                              Icon[file.is_dir ? "Directories" : group] || Icon.Others,
                                              { className: "w-6 h-6" }
                                            )}
                                          </div>
                                          <div className="truncate font-medium">
                                            {file.name}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-4 px-6 text-sm text-gray-600">
                                        {file.is_dir ? "Folder" : file.category}
                                      </td>
                                      <td className="py-4 px-6 text-sm text-gray-600">
                                        {file.is_dir ? "—" : file.size}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        );
                      }
                    )
                  ) : (
                    sortedAndFilteredFiles.map((file, idx) => (
                      <tr
                        key={`${file.name}-${idx}`}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => handleFileClick(file)}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <div className="text-2xl text-gray-600">
                              {React.createElement(
                                Icon[file.is_dir ? "Directories" : activeCategory] || Icon.Others,
                                { className: "w-6 h-6" }
                              )}
                            </div>
                            <div className="truncate font-medium">{file.name}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {file.is_dir ? "Folder" : file.category}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {file.is_dir ? "—" : file.size}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* File preview modal */}
      {showFileViewModal && (
        <FileViewModal
          file={selectedFile}
          onClose={() => {
            setShowFileViewModal(false);
            setSelectedFile(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
