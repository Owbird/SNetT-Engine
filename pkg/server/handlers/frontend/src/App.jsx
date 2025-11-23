import { useState, useEffect, useRef, useMemo } from "react";
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
} from "react-icons/fa";

const fpPromise = FingerprintJS.load();

const getId = async () => {
  const fp = await fpPromise;
  const result = await fp.get();
  return result.visitorId;
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

// Icon components from react-icons
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

function App() {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState("/");
  const [visitorId, setVisitorId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [config, setConfig] = useState();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All Files");
  const ws = useRef(null);

  // categories in the sidebar, key must match category assigned later
  const categories = [
    { key: "Directories", label: "Directories", icon: Icon.Directories },
    { key: "Documents", label: "Documents", icon: Icon.Documents },
    { key: "Pictures", label: "Pictures", icon: Icon.Pictures },
    { key: "Videos", label: "Videos", icon: Icon.Videos },
    { key: "Music", label: "Music", icon: Icon.Music },
    { key: "Others", label: "Others", icon: Icon.Others },
    { key: "All Files", label: "All Files", icon: Icon.All },
  ];

  useEffect(() => {
    ws.current = new WebSocket(`ws://${window.location.host}/connect`);

    ws.current.onopen = async () => {
      const id = await getId();
      setVisitorId(id);
      ws.current.send(`CONNECT: ${id}`);
      ws.current.send(`FILES: /`);
    };

    ws.current.onmessage = (evt) => {
      const message = evt.data;

      if (message.startsWith("FILES:")) {
        try {
          setFiles(JSON.parse(message.replace("FILES: ", "")));
        } catch (err) {
          console.error("Failed to parse FILES message", err, message);
        }
      } else if (message.startsWith("CONFIG:")) {
        try {
          setConfig(JSON.parse(message.replace("CONFIG: ", "")));
        } catch (err) {
          console.error("Failed to parse CONFIG message", err, message);
        }
      } else {
        console.log("RESPONSE:", evt.data);
      }
    };

    ws.current.onclose = () => console.log("WebSocket disconnected");
    ws.current.onerror = (err) => console.error("WebSocket error", err);

    return () => {
      try {
        ws.current.close();
      } catch (e) {
      }
    };
  }, []);

  const navigateTo = (path) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      setCurrentPath(path);
      ws.current.send(`FILES: ${path}`);
    } else {
      setCurrentPath(path);
    }
  };

  const handleFileClick = (file) => {
    if (file.is_dir) {
      const newPath =
        currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
      navigateTo(newPath);
    } else {
      alert(`Clicked: ${file.name}\nSize: ${file.size}`);
    }
  };

  const handleSort = () => {
    setSortDirection((cur) => (cur === "asc" ? "desc" : "asc"));
  };

  const nameFiltered = useMemo(
    () =>
      files.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [files, searchQuery],
  );

  // attach category from mimeType, and apply activeCategory filter
  const sortedAndFilteredFiles = useMemo(() => {
    let items = nameFiltered.map((f) => ({
      ...f,
      category: f.is_dir ? "Directories" : getCategoryFromMime(f.mimeType),
    }));

    if (activeCategory && activeCategory !== "All Files") {
      items = items.filter((i) => i.category === activeCategory);
    }

    // sort by category then name (directories first when viewing All Files)
    items.sort((a, b) => {
      if (activeCategory === "All Files") {
        // keep directories on top
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
  }, [nameFiltered, sortDirection, activeCategory]);

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

  // grouped view for UI (only used when showing All Files)
  const grouped = useMemo(() => {
    const map = {};
    for (const it of sortedAndFilteredFiles) {
      const cat = it.category || "Others";
      if (!map[cat]) map[cat] = [];
      map[cat].push(it);
    }
    return map;
  }, [sortedAndFilteredFiles]);

  if (!config) return <div className="p-6">Loading...</div>;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r transition-all duration-300 flex flex-col ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          {!sidebarCollapsed && (
            <h2 className="text-lg font-semibold text-gray-800">Categories</h2>
          )}
          <button
            onClick={() => setSidebarCollapsed((s) => !s)}
            className="p-2 rounded-full hover:bg-gray-200"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <Icon.ToggleRight className="w-6 h-6 text-gray-600" />
            ) : (
              <Icon.ToggleLeft className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-auto py-4">
          <ul className="space-y-2">
            {categories.map((c) => {
              const active = activeCategory === c.key;
              return (
                <li key={c.key}>
                  <button
                    onClick={() => setActiveCategory(c.key)}
                    className={`w-full flex items-center gap-4 py-3 px-4 rounded-r-full transition-colors duration-200 ${
                      active
                        ? "bg-blue-100 text-blue-600"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <c.icon
                      className={`w-6 h-6 ${active ? "text-blue-600" : ""}`}
                    />
                    {!sidebarCollapsed && (
                      <span
                        className={`text-base font-medium ${
                          active ? "text-blue-600" : ""
                        }`}
                      >
                        {c.label}
                      </span>
                    )}
                    {!sidebarCollapsed && (
                      <span className="ml-auto text-sm text-gray-500">
                        {c.key === "All Files"
                          ? `(${nameFiltered.length})`
                          : `(${categoryCounts[c.key] || 0})`}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-4 py-3 border-t">
          {!sidebarCollapsed && (
            <div className="text-xs text-gray-500">
              Visitor ID:
              <div className="mt-1 text-sm text-gray-700 break-all">
                {visitorId}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {config.Name}
              </h1>
              <div className="text-base text-gray-600">Path: {currentPath}</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSort}
                  className="px-4 py-2 bg-white border rounded-full hover:bg-gray-100"
                  title="Toggle sort direction"
                >
                  {sortDirection === "asc" ? "A-Z" : "Z-A"}
                </button>
                <button
                  onClick={() => {
                    setActiveCategory("All Files");
                    setSearchQuery("");
                    setSortDirection("asc");
                  }}
                  className="px-4 py-2 bg-white border rounded-full hover:bg-gray-100"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-200">
                <tr>
                  <th className="py-3 px-6 text-left text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="py-3 px-6 text-left text-sm font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="py-3 px-6 text-left text-sm font-semibold text-gray-700">
                    Size
                  </th>
                </tr>
              </thead>

              <tbody className="text-gray-700">
                {activeCategory === "All Files"
                  ? [
                      "Directories",
                      "Documents",
                      "Pictures",
                      "Videos",
                      "Music",
                      "Others",
                    ].map((group) => {
                      const groupItems = grouped[group] || [];
                      if (!groupItems.length) return null;

                      return (
                        <tr key={group}>
                          <td colSpan={3} className="p-0">
                            <div className="py-3 px-6 bg-gray-100 font-bold text-gray-800">
                              <div className="flex items-center gap-3">
                                <Icon.All className="w-5 h-5" />
                                <span>{group}</span>
                                <span className="ml-2 text-sm text-gray-500">
                                  ({groupItems.length})
                                </span>
                              </div>
                            </div>

                            <table className="min-w-full">
                              <tbody>
                                {groupItems.map((file, idx) => (
                                  <tr
                                    key={`${file.name}-${idx}`}
                                    className="border-b hover:bg-gray-50 cursor-pointer"
                                    onClick={() => handleFileClick(file)}
                                  >
                                    <td className="py-4 px-6">
                                      <div className="flex items-center gap-4">
                                        <div className="text-2xl text-gray-600">
                                          {file.is_dir ? (
                                            <Icon.Directories />
                                          ) : group === "Pictures" ? (
                                            <Icon.Pictures />
                                          ) : group === "Videos" ? (
                                            <Icon.Videos />
                                          ) : group === "Music" ? (
                                            <Icon.Music />
                                          ) : group === "Documents" ? (
                                            <Icon.Documents />
                                          ) : (
                                            <Icon.Others />
                                          )}
                                        </div>
                                        <div className="truncate font-medium">
                                          {file.name}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      {file.is_dir
                                        ? "Directory"
                                        : file.category}
                                    </td>
                                    <td className="py-4 px-6">
                                      {file.is_dir ? "-" : file.size}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      );
                    })
                  : sortedAndFilteredFiles.map((file, idx) => (
                      <tr
                        key={`${file.name}-${idx}`}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleFileClick(file)}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <div className="text-2xl text-gray-600">
                              {file.is_dir ? (
                                <Icon.Directories />
                              ) : activeCategory === "Pictures" ? (
                                <Icon.Pictures />
                              ) : activeCategory === "Videos" ? (
                                <Icon.Videos />
                              ) : activeCategory === "Music" ? (
                                <Icon.Music />
                              ) : activeCategory === "Documents" ? (
                                <Icon.Documents />
                              ) : (
                                <Icon.Others />
                              )}
                            </div>
                            <div className="truncate font-medium">
                              {file.name}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {file.is_dir ? "Directory" : file.category}
                        </td>
                        <td className="py-4 px-6">
                          {file.is_dir ? "-" : file.size}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
