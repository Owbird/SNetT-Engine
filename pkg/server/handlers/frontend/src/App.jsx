import { useState, useEffect, useRef, useMemo } from "react";
import "./App.css";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const fpPromise = FingerprintJS.load();

const getId = async () => {
  const fp = await fpPromise;
  const result = await fp.get();
  return result.visitorId;
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
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {breadcrumbs.map((crumb, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && (
              <svg
                className="w-6 h-6 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                ></path>
              </svg>
            )}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (index < breadcrumbs.length - 1) {
                  navigateTo(crumb.path);
                }
              }}
              className={`ml-1 text-sm font-medium ${
                index === breadcrumbs.length - 1
                  ? "text-gray-400 cursor-default"
                  : "text-blue-600 hover:underline"
              }`}
            >
              {crumb.name}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};

function App() {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState("/");
  const [visitorId, setVisitorId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [config, setConfig] = useState();
  const ws = useRef(null);

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

      console.log(message);

      if (message.startsWith("FILES:")) {
        setFiles(JSON.parse(message.replace("FILES: ", "")));
      } else if (message.startsWith("CONFIG:")) {
        setConfig(JSON.parse(message.replace("CONFIG: ", "")));
      } else {
        console.log("RESPONSE: " + evt.data);
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected.");
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    const wsCurrent = ws.current;

    return () => {
      wsCurrent.close();
    };
  }, []);

  const navigateTo = (path) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      setCurrentPath(path);
      ws.current.send(`FILES: ${path}`);
    }
  };

  const handleFileClick = (file) => {
    if (file.is_dir) {
      const newPath =
        currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
      navigateTo(newPath);
    } else {
      alert(`Clicked on file: ${file.name}, Size: ${file.size}`);
    }
  };

  const handleSort = () => {
    setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const sortedAndFilteredFiles = useMemo(() => {
    let sortableFiles = [...filteredFiles];
    sortableFiles.sort((a, b) => {
      if (a.is_dir && !b.is_dir) return -1;
      if (!a.is_dir && b.is_dir) return 1;

      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      if (nameA < nameB) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (nameA > nameB) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sortableFiles;
  }, [filteredFiles, sortDirection]);


  if (!config) return <div>Loading...</div>;


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{config.Name}</h1>
      <Breadcrumbs path={currentPath} navigateTo={navigateTo} />
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search files and directories..."
          className="w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <p className="mb-4">Visitor ID: {visitorId}</p>

      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">
                <button onClick={handleSort} className="flex items-center">
                  Name
                  {sortDirection === "asc" ? (
                    <span className="ml-2">▲</span>
                  ) : (
                    <span className="ml-2">▼</span>
                  )}
                </button>
              </th>
              <th className="py-3 px-6 text-left">Type</th>
              <th className="py-3 px-6 text-left">Size</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {sortedAndFilteredFiles.map((file, index) => (
              <tr
                key={index}
                className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleFileClick(file)}
              >
                <td className="py-3 px-6 text-left whitespace-nowrap">
                  <div className="flex items-center">
                    {file.is_dir ? (
                      <svg
                        className="w-5 h-5 text-blue-500 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-gray-500 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0113 3.414L16.586 7A2 2 0 0118 8.414V16a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm4.5 1A1.5 1.5 0 007 6.5v5A1.5 1.5 0 008.5 13h3A1.5 1.5 0 0013 11.5v-5A1.5 1.5 0 0011.5 5h-3z"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    )}
                    <span>{file.name}</span>
                  </div>
                </td>
                <td className="py-3 px-6 text-left">
                  {file.is_dir ? "Directory" : "File"}
                </td>
                <td className="py-3 px-6 text-left">
                  {file.is_dir ? "-" : file.size}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
