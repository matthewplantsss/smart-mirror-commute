import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const BACKEND_URL = import.meta.env.DEV ? "http://127.0.0.1:5050" : window.location.origin;

function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getScoreClass(score) {
  if (score >= 9) return "miserable";
  if (score >= 7) return "severe";
  if (score >= 5) return "frustrating";
  if (score >= 3) return "mild";
  return "easy";
}

function getStatusText(connected) {
  return connected ? "Live connection" : "Reconnecting";
}

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [commute, setCommute] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const socket = useMemo(
    () =>
      io(BACKEND_URL, {
        autoConnect: false,
        transports: ["websocket", "polling"],
        reconnection: true,
      }),
    []
  );

  useEffect(() => {
    const clockInterval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    function handleConnect() {
      setConnected(true);
      setError("");
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handleConnectError(connectionError) {
      console.error(connectionError);
      setConnected(false);
      setError(
        "Could not connect to the commute server. Make sure the backend is running on port 5050."
      );
    }

    function handleCommuteUpdate(update) {
      setCommute(update);
      setRefreshing(false);
      setError("");
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("commute:update", handleCommuteUpdate);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("commute:update", handleCommuteUpdate);
      socket.disconnect();
    };
  }, [socket]);

  function refreshCommute() {
    if (!socket.connected) {
      setError("The dashboard is not connected to the backend.");
      return;
    }

    setRefreshing(true);
    socket.emit("commute:refresh");
  }

  if (!commute) {
    return (
      <main className="loading-screen">
        <div className="loading-orb" />
        <p className="eyebrow">Smart Mirror</p>
        <h1>Connecting to your commute…</h1>

        {error && <p className="error-message">{error}</p>}
      </main>
    );
  }

  const score = commute.miseryIndex.score;
  const scoreClass = getScoreClass(score);
  const gaugePercentage = Math.min(100, Math.max(0, score * 10));

  const delayPercentage = Math.min(
    100,
    Math.max(
      0,
      (commute.travel.delayMinutes /
        Math.max(commute.travel.normalMinutes, 1)) *
        100
    )
  );

  return (
    <main className={`mirror-shell score-${scoreClass}`}>
      <header className="mirror-header">
        <div className="clock-section">
          <p className="eyebrow">Smart Mirror Commute</p>
          <h1>{formatTime(currentTime)}</h1>
          <p className="date-text">{formatDate(currentTime)}</p>
        </div>

        <div className="connection-panel">
          <span
            className={`connection-dot ${
              connected ? "connected" : "disconnected"
            }`}
          />
          <div>
            <strong>{getStatusText(connected)}</strong>
            <small>
              Updates every five seconds
            </small>
          </div>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="hero-grid">
        <article className="glass-card misery-card">
          <div className="card-heading">
            <div>
              <p className="section-label">Current conditions</p>
              <h2>Commute Misery Index</h2>
            </div>

            <span className={`severity-badge ${scoreClass}`}>
              {commute.miseryIndex.level}
            </span>
          </div>

          <div
            className="score-gauge"
            style={{
              "--score-angle": `${gaugePercentage * 3.6}deg`,
            }}
          >
            <div className="score-gauge-inner">
              <strong>{score}</strong>
              <span>out of 10</span>
            </div>
          </div>

          <p className="recommendation">
            {commute.miseryIndex.recommendation}
          </p>

          <button
            className="refresh-button"
            type="button"
            onClick={refreshCommute}
            disabled={refreshing || !connected}
          >
            {refreshing
              ? "Refreshing conditions…"
              : "Refresh commute now"}
          </button>
        </article>

        <article className="glass-card route-card">
          <div className="card-heading">
            <div>
              <p className="section-label">Your route</p>
              <h2>
                {commute.route.origin} →{" "}
                {commute.route.destination}
              </h2>
            </div>
          </div>

          <div className="travel-time">
            <strong>
              {commute.travel.currentMinutes}
            </strong>
            <span>minutes right now</span>
          </div>

          <div className="comparison-row">
            <div>
              <span>Normal commute</span>
              <strong>
                {commute.travel.normalMinutes} min
              </strong>
            </div>

            <div>
              <span>Current delay</span>
              <strong className="delay-value">
                +{commute.travel.delayMinutes} min
              </strong>
            </div>
          </div>

          <div className="delay-track">
            <div
              className="delay-fill"
              style={{
                width: `${Math.max(
                  4,
                  delayPercentage
                )}%`,
              }}
            />
          </div>

          <div className="route-recommendation">
            <span>Primary</span>
            <strong>
              {commute.route.primaryRoute}
            </strong>

            <span>Alternative</span>
            <strong>
              {commute.route.alternativeRoute}
            </strong>
          </div>
        </article>
      </section>

      <section className="metric-grid">
        <article className="glass-card metric-card">
          <div className="metric-icon">☁</div>

          <div className="metric-heading">
            <span>Weather</span>
            <strong>
              {commute.weather.temperatureFahrenheit}°F
            </strong>
          </div>

          <h3>{commute.weather.condition}</h3>

          <div className="score-row">
            <span>Severity</span>
            <strong>
              {commute.weather.severityScore}/10
            </strong>
          </div>

          {commute.weather.alertActive && (
            <p className="alert-pill">
              Weather alert active
            </p>
          )}
        </article>

        <article className="glass-card metric-card">
          <div className="metric-icon">↔</div>

          <div className="metric-heading">
            <span>Transit</span>
            <strong>
              {commute.transit.disruptionScore}/10
            </strong>
          </div>

          <h3>
            {commute.transit.activeIncident}
          </h3>

          <div className="compact-stats">
            <div>
              <span>Delayed</span>
              <strong>
                {commute.transit.delayedServices}
              </strong>
            </div>

            <div>
              <span>Cancelled</span>
              <strong>
                {commute.transit.cancelledServices}
              </strong>
            </div>
          </div>
        </article>

        <article className="glass-card metric-card">
          <div className="metric-icon">◉</div>

          <div className="metric-heading">
            <span>Commuter sentiment</span>
            <strong>
              {commute.sentiment.negativityScore}/10
            </strong>
          </div>

          <h3>{commute.sentiment.label}</h3>

          <div className="score-row">
            <span>Posts analyzed</span>
            <strong>
              {commute.sentiment.postsAnalyzed}
            </strong>
          </div>
        </article>

        <article className="glass-card metric-card">
          <div className="metric-icon">✓</div>

          <div className="metric-heading">
            <span>Route reliability</span>
            <strong>
              {commute.reliability.score}/10
            </strong>
          </div>

          <h3>
            {commute.reliability.score >= 7
              ? "Unreliable today"
              : commute.reliability.score >= 4
                ? "Mixed reliability"
                : "Running reliably"}
          </h3>

          <div className="score-row">
            <span>Alternative route</span>
            <strong>
              {commute.route.alternativeRoute}
            </strong>
          </div>
        </article>
      </section>

      <footer className="mirror-footer">
        <p>
          Last update:{" "}
          {formatTime(
            new Date(commute.generatedAt)
          )}
        </p>

        <p>
          Live transit, weather and commuter
          sentiment simulation
        </p>
      </footer>
    </main>
  );
}

export default App;
