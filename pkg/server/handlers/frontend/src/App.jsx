import { useState, useEffect } from "react";
import "./App.css";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const fpPromise = FingerprintJS.load();

const getId = async () => {
  const fp = await fpPromise;
  const result = await fp.get();
  return result.visitorId;
};

function App() {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState("/");
  const [visitorId, setVisitorId] = useState("");

  const ws = new WebSocket(`ws://192.168.0.102:9091/connect`);
  // const ws = new WebSocket(`ws://${window.location.host}/connect`);

  useEffect(() => {
    ws.onopen = async function (evt) {
      const id = await getId();
      setVisitorId(id);
      ws.send(`CONNECT: ${id}`);
      ws.send(`FILES: ${currentPath}`);
    };

    ws.onmessage = function (evt) {
      const message = evt.data;

      console.log(message);

      if (message.startsWith("FILES:")) {
        setFiles(JSON.parse(message.replace("FILES: ", "")));
      } else {
        console.log("RESPONSE: " + evt.data);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected.");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, []);

  const navigateTo = (path) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setCurrentPath(path);
      ws.send(`FILES: ${path}`);
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

  const handleBackClick = () => {
    if (currentPath !== "/") {
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf("/"));
      navigateTo(parentPath === "" ? "/" : parentPath);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">File Browser</h1>
      <p className="mb-2">Current Path: {currentPath}</p>
      <p className="mb-4">Visitor ID: {visitorId}</p>

      <div className="flex space-x-2 mb-4">
        {currentPath !== "/" && (
          <button
            onClick={handleBackClick}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              ></path>
            </svg>
            Back
          </button>
        )}
      </div>

      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Name</th>
              <th className="py-3 px-6 text-left">Type</th>
              <th className="py-3 px-6 text-left">Size</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {files.map((file, index) => (
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
