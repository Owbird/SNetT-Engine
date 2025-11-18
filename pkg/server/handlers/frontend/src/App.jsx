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
  const ws = new WebSocket(`ws://${window.location.host}/connect`);

  useEffect(() => {
    ws.onopen = async function (evt) {
      const visitorId = await getId();

      ws.send(`CONNECT: ${visitorId}`);
    };

    ws.onmessage = function (evt) {
      alert("RESPONSE: " + evt.data);
    };
  }, []);

  return <p className=""></p>;
}

export default App;
