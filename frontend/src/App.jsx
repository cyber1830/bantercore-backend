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
  const [search, setSearch] = useState("");
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const openThread = (discussion) => {
    setThread(discussion);
    window.history.pushState({}, "", `#thread-${discussion.id}`);
  };
  const closeThread = () => {
    setThread(null);
    if (window.location.hash.startsWith("#thread-")) window.history.pushState({}, "", window.location.pathname);
  };

  const loadDiscussions = async () => {
    setLoading(true);
    try {
      setDiscussions(
        await api("/v1/discussions", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      );
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiscussions();
  }, [token]);

  useEffect(() => {
    const syncThread = () => {
      const id = window.location.hash.startsWith("#thread-")
        ? window.location.hash.slice(8)
        : "";
      const matched = id
        ? discussions.find((discussion) => String(discussion.id) === String(id))
        : null;
      if (matched) setThread(matched);
      if (!id) setThread(null);
    };
    window.addEventListener("popstate", syncThread);
    window.addEventListener("hashchange", syncThread);
    syncThread();
    return () => {
      window.removeEventListener("popstate", syncThread);
      window.removeEventListener("hashchange", syncThread);
    };
  }, [discussions]);

  const signOut = () => {
    localStorage.removeItem("bantercore_token");
    localStorage.removeItem("bantercore_profile");
    setToken("");
    setUser(null);
  };

  const filteredDiscussions = discussions.filter((discussion) => {
    const query = search.trim().toLowerCase();
    return !query || `${discussion.topic} ${discussion.body}`.toLowerCase().includes(query);
  });
  const sortedDiscussions = [...filteredDiscussions].sort((a, b) => {
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
            <div style={{ position: "relative" }}>
              <button className="avatar" onClick={() => setProfileMenuOpen(!profileMenuOpen)} title="Open profile menu">
                {user.username?.[0]?.toUpperCase()}
              </button>
              {profileMenuOpen && <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 20, minWidth: 180, padding: 12, background: "#fff", border: "1px solid #e7e8e3", borderRadius: 12, boxShadow: "0 12px 30px #0002" }}>
                <small style={{ display: "block", color: "#7d8490", marginBottom: 8 }}>{user.email || user.username}</small>
                <button className="signin" style={{ width: "100%" }} onClick={signOut}>Log out</button>
              </div>}
            </div>
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
            <div className="community-tools">
              <label className="search-box">
                <span>⌕</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search discussions" />
              </label>
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
                onClick={() => openThread(discussion)}
              >
          <div className="topic-label">{discussion.visibility === "private" ? "private" : "public"} · {discussion.type || "open"} · {discussion.topic}</div>
                <h3>{discussion.body}</h3>
                <p>
                  Community member · {discussion.createdAt ? new Date(discussion.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Today"} · <span>Open thread →</span>
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
          onSwitch={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}
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
          fullPage
          onClose={closeThread}
          onAuth={() => setAuthMode("signin")}
        />
      )}
    </div>
  );
}

function Composer({ token, onPublished, setNotice }) {
  const [topic, setTopic] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("open");
  const [visibility, setVisibility] = useState("public");
  const submit = async (event) => {
    event.preventDefault();
    try {
      await api("/v1/discussions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, body, type, visibility }),
      });
      setTopic("");
      setBody("");
      setType("open");
      setVisibility("public");
      setNotice("Discussion published.");
      onPublished();
    } catch (error) {
      setNotice(error.message);
    }
  };
  return (
    <form className="composer" id="composer" onSubmit={submit}>
      <label className="discussion-type">
        <span>Discussion format</span>
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Discussion format">
        <option value="open">Open discussion</option>
        <option value="question">Question</option>
        <option value="debate">Debate</option>
        </select>
      </label>
      <label className="discussion-type">
        <span>Who can see this?</span>
        <select value={visibility} onChange={(event) => setVisibility(event.target.value)} aria-label="Discussion visibility">
          <option value="public">Public discussion</option>
          <option value="private">Private discussion</option>
        </select>
      </label>
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

function AuthModal({ mode, onClose, onSuccess, onSwitch }) {
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
        <button className="auth-switch" type="button" onClick={onSwitch}>
          {signup ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}

function ThreadModal({ discussion, token, user, onClose, onAuth, fullPage = false }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [replyError, setReplyError] = useState("");
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  useEffect(() => {
    api(`/v1/discussions/${discussion.id}/comments`).then((data) => setComments(data || []));
  }, [discussion.id]);
  const reply = async (event) => {
    event.preventDefault();
    if (!token) return onAuth();
    if (!body.trim()) return;
    setReplyError("");
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
    } catch (error) {
      setReplyError(error.message);
    }
  };
  const acceptComment = async (commentId) => {
    if (!token) return onAuth();
    try {
      const accepted = await api(
        `/v1/discussions/${discussion.id}/comments/${commentId}/accept`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      setComments(
        comments.map((comment) => ({
          ...comment,
          accepted: comment.id === accepted.id,
        })),
      );
    } catch {}
  };
  const summarizeThread = async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_AGENT_URL || (import.meta.env.DEV ? "http://localhost:4110" : "https://bantercore-agent.onrender.com")}/v1/thread-summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: discussion.topic,
            body: discussion.body,
            replies: comments.map((comment) => comment.body),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to summarize thread");
      setSummary(data);
    } catch (error) {
      setSummaryError(error.message);
    } finally {
      setSummaryLoading(false);
    }
  };
  return (
    <div className={fullPage ? "thread-page" : "modal-backdrop"}>
      <div className={fullPage ? "thread-page-card" : "modal-card thread-modal"}>
        <button className="close" onClick={onClose}>
          {fullPage ? "← Back to discussions" : "×"}
        </button>
        <p className="eyebrow">THREAD</p>
        <h2>{discussion.topic}</h2>
        <p className="thread-body">{discussion.body}</p>
        <div className="thread-ai-actions">
          <button className="secondary-button" type="button" onClick={summarizeThread} disabled={summaryLoading}>
            {summaryLoading ? "Summarizing..." : "Summarize with AI"}
          </button>
          {summaryError && <span className="error">{summaryError}</span>}
        </div>
        {summary && (
          <div className="ai-summary">
            <div>
              <b>AI summary</b>
              <p>{summary.summary}</p>
            </div>
            <div>
              <b>Key viewpoints</b>
              <ul>
                {summary.keyViewpoints.map((viewpoint) => <li key={viewpoint}>{viewpoint}</li>)}
              </ul>
            </div>
          </div>
        )}
        <div className="viewpoints" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "16px 0", borderTop: "1px solid #e7e8e3", borderBottom: "1px solid #e7e8e3" }}>
          <b>Key viewpoints</b>
          <span className="muted" style={{ display: "block", marginTop: 4 }}>{comments.length ? `${comments.length} community perspective${comments.length === 1 ? "" : "s"}` : "Be the first to share a perspective"}</span>
        </div>
        <div className="comments">
          {comments.length ? (
            comments.map((comment) => (
              <p key={comment.id} className={comment.accepted ? "comment accepted" : "comment"} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", lineHeight: 1.5 }}>
                <b>
                  {user && comment.authorId === user.id
                    ? "You"
                    : "Community member"}
                </b>{" "}
                {comment.body}
                {comment.accepted && <span title="Accepted reply" aria-label="Accepted reply" style={{ marginLeft: "auto", width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", background: "#2f9e62", color: "#fff", fontWeight: 900 }}>✓</span>}
                {user && user.id === discussion.authorId && !comment.accepted && (
                  <button className="accept-button" title="Mark this reply as helpful" aria-label="Mark this reply as helpful" style={{ marginLeft: "auto", width: 28, height: 28, border: "1px solid #e7e8e3", borderRadius: "50%", background: "#fff", color: "#7d8490", cursor: "pointer", fontWeight: 900 }} onClick={() => acceptComment(comment.id)}>✓</button>
                )}
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
        {replyError && <p className="error thread-error">{replyError}</p>}
      </div>
    </div>
  );
}

export default App;
