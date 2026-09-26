const feed = document.querySelector('#feed');
const status = document.querySelector('#status');
const form = document.querySelector('#form');
const auth = document.querySelector('#auth');
const authForm = document.querySelector('#auth-form');

const state = {
  token: localStorage.getItem('bantercore_token') || '',
  profile: JSON.parse(localStorage.getItem('bantercore_profile') || 'null'),
  rows: [],
};

let signup = false;

const esc = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
}[char]));

const author = id => (state.profile && id === state.profile.id) ? 'You' : 'Community member';

const showAuth = () => { auth.hidden = false; };

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}),
});

const renderFeed = () => {
  feed.innerHTML = state.rows.map(item => `
    <article class="post">
      <strong>${esc(item.topic)}</strong>
      <h3 class="thread-link" data-id="${item.id}">${esc(item.body)}</h3>
      <small>by ${author(item.authorId)} · <button class="open-thread" data-id="${item.id}">Open thread</button></small>
    </article>
  `).join('') || 'No discussions yet.';

  document.querySelectorAll('.thread-link,.open-thread').forEach(button => {
    button.onclick = () => openThread(state.rows.find(item => item.id === button.dataset.id));
  });
};

const loadDiscussions = async () => {
  const response = await fetch('/api/v1/discussions');
  state.rows = response.ok ? await response.json() : [];
  status.textContent = `${state.rows.length} discussions`;
  renderFeed();
};

const openThread = discussion => {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-card">
      <button class="close">×</button>
      <p class="eyebrow">THREAD</p>
      <h2>${esc(discussion.topic)}</h2>
      <p>${esc(discussion.body)}</p>
      <hr>
      <div class="comments">Loading replies...</div>
      <form class="reply-form">
        <input placeholder="${state.token ? 'Join this discussion' : 'Sign in to reply'}" required ${state.token ? '' : 'disabled'}>
        <button class="primary" type="button">${state.token ? 'Reply' : 'Sign in to reply'}</button>
      </form>
    </div>
  `;

  document.body.append(modal);
  modal.querySelector('.close').onclick = () => modal.remove();

  const commentsBox = modal.querySelector('.comments');
  const replyForm = modal.querySelector('.reply-form');
  const replyButton = replyForm.querySelector('button');

  const paintComments = comments => {
    commentsBox.innerHTML = comments.length
      ? comments.map(comment => `<p><b>${author(comment.authorId)}</b> ${esc(comment.body)}</p>`).join('')
      : 'No replies yet. Start the conversation.';
  };

  fetch('/api/v1/discussions/' + discussion.id + '/comments')
    .then(response => response.json())
    .then(paintComments);

  if (!state.token) {
    replyButton.onclick = showAuth;
    return;
  }

  replyButton.type = 'submit';
  replyForm.onsubmit = async event => {
    event.preventDefault();
    const input = event.target.querySelector('input');
    const response = await fetch('/api/v1/discussions/' + discussion.id + '/comments', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ body: input.value }),
    });

    if (response.status === 401) {
      showAuth();
      return;
    }

    if (response.ok) {
      const comment = await response.json();
      commentsBox.innerHTML += `<p><b>${author(comment.authorId)}</b> ${esc(comment.body)}</p>`;
      input.value = '';
    }
  };
};

document.querySelectorAll('nav a[href^="#"]').forEach(link => {
  link.onclick = event => {
    event.preventDefault();
    document.querySelectorAll('nav a').forEach(item => item.classList.toggle('active', item === link));

    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
});

document.querySelector('#new').onclick = () => {
  if (!state.token) {
    showAuth();
    return;
  }

  form.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.querySelector('#topic').focus();
};

form.onsubmit = async event => {
  event.preventDefault();
  if (!state.token) {
    showAuth();
    return;
  }

  const topic = document.querySelector('#topic').value.trim();
  const body = document.querySelector('#body').value.trim();
  const response = await fetch('/api/v1/discussions', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ topic, body }),
  });

  if (response.status === 401) {
    status.textContent = 'Please sign in again.';
    showAuth();
    return;
  }

  if (!response.ok) {
    status.textContent = 'Could not publish discussion.';
    return;
  }

  form.reset();
  form.hidden = true;
  await loadDiscussions();
};

document.querySelectorAll('.chip').forEach((button, index) => {
  button.onclick = () => {
    document.querySelectorAll('.chip').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected');

    const sorted = [...state.rows];
    if (index === 1) sorted.reverse();
    if (index === 2) sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const previous = state.rows;
    state.rows = sorted;
    renderFeed();
    state.rows = previous;
  };
});

document.querySelector('.login').onclick = () => {
  signup = false;
  auth.hidden = false;
};

document.querySelector('#signup').onclick = () => {
  signup = true;
  auth.hidden = false;
};

document.querySelector('#close-auth').onclick = () => auth.hidden = true;
document.querySelector('#switch-auth').onclick = () => {
  signup = !signup;
  auth.hidden = false;
};

authForm.onsubmit = async event => {
  event.preventDefault();
  const username = document.querySelector('#auth-username').value;
  const password = document.querySelector('#auth-password').value;
  const payload = { username, password };
  const url = signup ? '/api/v1/auth/register' : '/api/v1/auth/login';

  if (signup) payload.email = document.querySelector('#auth-email').value;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    document.querySelector('#auth-error').textContent = data.error || 'Unable to continue';
    return;
  }

  state.token = data.token;
  state.profile = data.user;
  localStorage.setItem('bantercore_token', state.token);
  localStorage.setItem('bantercore_profile', JSON.stringify(state.profile));
  auth.hidden = true;
  location.reload();
};

loadDiscussions();

