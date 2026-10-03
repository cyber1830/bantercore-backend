import { useEffect, useState } from "react";
import "./App.css";

const api = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

function App() {
  const [discussions, setDiscussions] = useState([]);
  const [activeFilter, setActiveFilter] = useState("For you");
  const [thread, setThread] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("bantercore_profile") || "null"),
  );
  const [token, setToken] = useState(
    () => localStorage.getItem("bantercore_token") || "",
  );
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const loadDiscussions = async () => {
    setLoading(true);
    try {
      setDiscussions(await api("/v1/discussions"));
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiscussions();
  }, []);

  const signOut = () => {
    localStorage.removeItem("bantercore_token");
    localStorage.removeItem("bantercore_profile");
    setToken("");
    setUser(null);
  };

  const sortedDiscussions = [...discussions].sort((a, b) => {
    if (activeFilter === "Newest")
      return new Date(b.createdAt) - new Date(a.createdAt);
    return activeFilter === "Trending" ? b.body.length - a.body.length : 0;
  });

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top">
          Banter<span>Core</span>
        </a>
        <nav>
          <a href="#discover">Discover</a>
          <a href="#topics">Topics</a>
          <a href="#about">About</a>
        </nav>
        <div className="account-actions">
          {user ? (
            <button
              className="avatar"
              onClick={signOut}
              title="Click to sign out"
            >
              {user.username?.[0]?.toUpperCase()}
            </button>
          ) : (
            <button className="signin" onClick={() => setAuthMode("signin")}>
              Sign in
            </button>
          )}
          {!user && (
            <button className="signup" onClick={() => setAuthMode("signup")}>
              Create account
            </button>
          )}
        </div>
      </header>

      <main id="top">
        <section className="hero" id="discover">
          <div>
            <p className="eyebrow">A BETTER PLACE FOR BETTER BANTER</p>
            <h1>
              Talk about
              <br />
              <em>what matters.</em>
            </h1>
            <p className="hero-copy">
              Find thoughtful people, explore fresh perspectives, and join
              conversations that stay with you.
            </p>
            <button
              className="primary"
              onClick={() =>
                user
                  ? document
                      .querySelector("#composer")
                      .scrollIntoView({ behavior: "smooth" })
                  : setAuthMode("choice")
              }
            >
              Start a discussion <span>↗</span>
            </button>
          </div>
          <div className="hero-art">
            <div className="orb">✦</div>
            <div className="quote">
              “The best ideas get
              <br />
              better in conversation.”
            </div>
          </div>
        </section>
        <section className="community" id="topics">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE COMMUNITY</p>
              <h2>Latest discussions</h2>
            </div>
            <div className="filters">
              {["For you", "Trending", "Newest"].map((filter) => (
                <button
                  className={
                    activeFilter === filter ? "filter active" : "filter"
                  }
                  onClick={() => setActiveFilter(filter)}
                  key={filter}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          {user && (
            <Composer
              token={token}
              onPublished={loadDiscussions}
              setNotice={setNotice}
            />
          )}
          {notice && <p className="notice">{notice}</p>}
          <p className="muted">
            {loading
              ? "Loading conversations..."
              : `${sortedDiscussions.length} discussions`}
          </p>
          <div className="feed">
            {sortedDiscussions.map((discussion) => (
              <article
                className="discussion"
                key={discussion.id}
                onClick={() => setThread(discussion)}
              >
                <div className="topic-label">{discussion.topic}</div>
                <h3>{discussion.body}</h3>
                <p>
                  Community member · <span>Open thread →</span>
                </p>
              </article>
            ))}
            {!loading && !sortedDiscussions.length && (
              <div className="empty">
                No discussions yet. Start the first one.
              </div>
            )}
          </div>
        </section>
        <section className="about" id="about">
          <p className="eyebrow">WHY BANTERCORE</p>
          <h2>Better conversations start with better questions.</h2>
          <p>
            Join thoughtful threads, discover new perspectives, and build
            conversations that matter.
          </p>
        </section>
      </main>
      <footer>
        <b>
          Banter<span>Core</span>
        </b>
        <small>Built for meaningful conversations.</small>
      </footer>
      {authMode === "choice" && (
        <AuthChoice onClose={() => setAuthMode(null)} onSelect={setAuthMode} />
      )}
      {authMode && authMode !== "choice" && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSuccess={(data) => {
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem("bantercore_token", data.token);
            localStorage.setItem(
              "bantercore_profile",
              JSON.stringify(data.user),
            );
            setAuthMode(null);
          }}
        />
      )}
      {thread && (
        <ThreadModal
          discussion={thread}
          token={token}
          user={user}
          onClose={() => setThread(null)}
          onAuth={() => setAuthMode("signin")}
        />
      )}
    </div>
  );
}

function Composer({ token, onPublished, setNotice }) {
  const [topic, setTopic] = useState("");
  const [body, setBody] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    try {
      await api("/v1/discussions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, body }),
      });
      setTopic("");
      setBody("");
      setNotice("Discussion published.");
      onPublished();
    } catch (error) {
      setNotice(error.message);
    }
  };
  return (
    <form className="composer" id="composer" onSubmit={submit}>
      <input
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        placeholder="Topic"
        required
      />
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="What do you want to discuss?"
        required
      />
      <button className="primary">Publish discussion</button>
    </form>
  );
}

function AuthChoice({ onClose, onSelect }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card choice-card">
        <button className="close" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">JOIN THE CONVERSATION</p>
        <h2>How would you like to continue?</h2>
        <p className="muted">
          Sign in if you already have an account, or create one to start your
          first discussion.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button
            className="primary"
            style={{ flex: 1 }}
            onClick={() => onSelect("signin")}
          >
            Sign in
          </button>
          <button
            style={{
              flex: 1,
              border: "1px solid #e7e8e3",
              borderRadius: 10,
              background: "#fff",
              color: "#1b2028",
              padding: "13px 20px",
              fontWeight: 800,
              cursor: "pointer",
            }}
            onClick={() => onSelect("signup")}
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ mode, onClose, onSuccess }) {
  const signup = mode === "signup";
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    try {
      onSuccess(
        await api(`/v1/auth/${signup ? "register" : "login"}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
      );
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <button className="close" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">
          {signup ? "JOIN THE COMMUNITY" : "WELCOME BACK"}
        </p>
        <h2>{signup ? "Create your account" : "Sign in"}</h2>
        <form onSubmit={submit}>
          <input
            placeholder="Username"
            minLength="3"
            required
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          {signup && (
            <input
              type="email"
              placeholder="Email"
              required
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          )}
          <input
            type="password"
            placeholder={signup ? "Password (8+ characters)" : "Password"}
            minLength={signup ? 8 : undefined}
            required
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error && <p className="error">{error}</p>}
          <button className="primary">
            {signup ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ThreadModal({ discussion, token, user, onClose, onAuth }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  useEffect(() => {
    api(`/v1/discussions/${discussion.id}/comments`).then(setComments);
  }, [discussion.id]);
  const reply = async (event) => {
    event.preventDefault();
    if (!token) return onAuth();
    try {
      const comment = await api(`/v1/discussions/${discussion.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      });
      setComments([...comments, comment]);
      setBody("");
    } catch {}
  };
  return (
    <div className="modal-backdrop">
      <div className="modal-card thread-modal">
        <button className="close" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">THREAD</p>
        <h2>{discussion.topic}</h2>
        <p className="thread-body">{discussion.body}</p>
        <div className="comments">
          {comments.length ? (
            comments.map((comment) => (
              <p key={comment.id}>
                <b>
                  {user && comment.authorId === user.id
                    ? "You"
                    : "Community member"}
                </b>{" "}
                {comment.body}
              </p>
            ))
          ) : (
            <p className="muted">No replies yet. Start the conversation.</p>
          )}
        </div>
        <form onSubmit={reply}>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={!token}
            placeholder={token ? "Join this discussion" : "Sign in to reply"}
            required
          />
          <button
            className="primary"
            type={token ? "submit" : "button"}
            onClick={!token ? onAuth : undefined}
          >
            {token ? "Reply" : "Sign in to reply"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
