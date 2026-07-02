// ============================================================
// Admin panel for managing the Our Team grid (Supabase).
// Login is handled by Supabase Auth (email + password).
// Add / edit / delete + photo upload, protected by Row Level Security.
// ============================================================
(function () {
  const $ = (id) => document.getElementById(id);

  const warn = $('config-warning');
  const app = $('admin-app');
  const loginView = $('login-view');
  const dashView = $('dashboard-view');

  const cfg = window.SUPABASE_CONFIG;
  const notConfigured = !cfg || !cfg.url || cfg.url.indexOf('YOUR_') === 0;
  if (notConfigured || !window.supabase) {
    if (app) app.style.display = 'block';
    if (warn) warn.style.display = 'block';
    if (loginView) loginView.style.display = 'none';
    return;
  }

  const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
  const PHOTO_BUCKET = 'team-photos';
  let editingId = null;
  let editingImageUrl = null; // current photo url of the member being edited

  // The password-reset email link returns with "#type=recovery" — show the
  // "set new password" form instead of the dashboard while that's happening.
  const hash = window.location.hash || '';
  let recovering = hash.indexOf('type=recovery') !== -1;

  // A dead / already-used / expired link comes back as "#error=...&error_code=otp_expired".
  // Surface it on the login screen instead of silently dumping the user on the form.
  if (hash.indexOf('error') !== -1) {
    const hp = new URLSearchParams(hash.replace(/^#/, ''));
    const code = hp.get('error_code');
    if (hp.get('error') || code) {
      const expired = code === 'otp_expired' || /expired|invalid/i.test(hp.get('error_description') || '');
      // defer until DOM refs below are ready
      window.__resetLinkError = expired
        ? 'That reset link has expired or was already used. Enter your email and click “Forgot password?” to get a fresh one.'
        : decodeURIComponent((hp.get('error_description') || 'Reset link error').replace(/\+/g, ' '));
      // clean the ugly hash out of the address bar
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  let resetEmail = '';

  // viaLink=true  -> user arrived through a still-valid email link (session already
  //                  established); just ask for the new password.
  // viaLink=false -> code flow: ask for the 6-digit code + new password.
  function showResetForm(viaLink) {
    loginView.style.display = 'flex';
    app.style.display = 'none';
    $('login-card').style.display = 'none';
    $('reset-card').style.display = 'block';
    const codeInput = $('reset-code');
    if (viaLink) {
      $('reset-code-field').style.display = 'none';
      codeInput.required = false;
      $('reset-title').textContent = 'Set a new password';
      $('reset-intro').style.display = 'none';
    } else {
      $('reset-code-field').style.display = '';
      codeInput.required = true;
      $('reset-title').textContent = 'Reset your password';
      $('reset-intro').style.display = '';
    }
  }

  if (recovering) showResetForm(true);

  // Show a friendly message if the email link came back expired/invalid.
  if (window.__resetLinkError) {
    const fm = $('forgot-msg');
    if (fm) { fm.className = 'admin-error admin-small'; fm.textContent = window.__resetLinkError; }
  }

  // ---------- View switching ----------
  function showLogged(session) {
    if (recovering) return; // stay on the reset form until password is updated
    if (session) {
      loginView.style.display = 'none';
      app.style.display = 'block';
      dashView.style.display = 'block';
      const ue = $('user-email');
      if (ue) ue.textContent = session.user.email;
      loadMembers();
    } else {
      loginView.style.display = 'flex';
      app.style.display = 'none';
      dashView.style.display = 'none';
    }
  }

  sb.auth.getSession().then(({ data }) => showLogged(data.session));
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') { recovering = true; showResetForm(true); return; }
    showLogged(session);
  });

  // ---------- Login / Logout ----------
  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('login-error');
    err.textContent = '';
    const { error } = await sb.auth.signInWithPassword({
      email: $('email').value.trim(),
      password: $('password').value
    });
    if (error) err.textContent = error.message;
  });

  $('logout-btn').addEventListener('click', async () => {
    await sb.auth.signOut();
  });

  // ---------- Show / hide password toggles ----------
  document.querySelectorAll('.pw-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = $(btn.dataset.target);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      input.focus();
    });
  });

  // ---------- Forgot password (send reset email) ----------
  $('forgot-link').addEventListener('click', async (e) => {
    e.preventDefault();
    const msg = $('forgot-msg');
    const email = $('email').value.trim();
    if (!email) {
      msg.className = 'admin-error admin-small';
      msg.textContent = 'Enter your email above first, then click “Forgot password?”.';
      $('email').focus();
      return;
    }
    msg.className = 'admin-muted admin-small';
    msg.textContent = 'Sending reset code…';
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href.split('#')[0]
    });
    if (error) {
      msg.className = 'admin-error admin-small';
      msg.textContent = error.message;
      return;
    }
    msg.textContent = '';
    resetEmail = email;
    $('reset-email').textContent = email;
    showResetForm(false);
    $('reset-code').focus();
  });

  // "Back to login" from the reset card
  const resetBack = $('reset-back');
  if (resetBack) resetBack.addEventListener('click', (e) => {
    e.preventDefault();
    recovering = false;
    $('reset-card').style.display = 'none';
    $('login-card').style.display = 'block';
  });

  // ---------- Set a new password (after clicking the email link) ----------
  $('reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('reset-msg');
    msg.className = 'admin-error';
    msg.textContent = '';

    // Code flow: exchange the 6-digit code for a session first.
    if ($('reset-code').required) {
      const token = $('reset-code').value.replace(/\s+/g, '');
      const email = resetEmail || $('email').value.trim();
      if (!/^\d{6,10}$/.test(token)) { msg.textContent = 'Enter the numeric code from the email.'; return; }
      const v = await sb.auth.verifyOtp({ email, token, type: 'recovery' });
      if (v.error) {
        msg.textContent = /expired|invalid|token/i.test(v.error.message)
          ? 'That code is wrong or has expired. Go back and request a new one.'
          : v.error.message;
        return;
      }
    }

    const { error } = await sb.auth.updateUser({ password: $('new-password').value });
    if (error) { msg.textContent = error.message; return; }
    recovering = false;
    resetEmail = '';
    $('reset-form').reset();
    $('reset-card').style.display = 'none';
    $('login-card').style.display = 'block';
    const { data } = await sb.auth.getSession();
    showLogged(data.session);
  });

  function initialsOf(m) {
    if (m.initials) return m.initials;
    return (m.name || '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  // ---------- Toast + modal helpers ----------
  let toastTimer;
  function showToast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  const memberModal = $('member-modal');
  const confirmModal = $('confirm-modal');
  function openModal(el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeModal(el) { el.classList.remove('open'); document.body.style.overflow = ''; }

  [memberModal, confirmModal].forEach((m) => {
    m.addEventListener('click', (e) => { if (e.target === m) closeModal(m); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(memberModal); closeModal(confirmModal); }
  });

  // ---------- List ----------
  async function loadMembers() {
    const list = $('members-list');
    const count = $('member-count');
    list.innerHTML = '<p class="admin-muted">Loading…</p>';
    const { data, error } = await sb.from('team_members')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) { list.innerHTML = '<p class="admin-error">' + esc(error.message) + '</p>'; return; }

    if (count) count.textContent = data.length ? (data.length + (data.length === 1 ? ' member' : ' members')) : '';

    if (!data.length) {
      list.innerHTML = '<div class="admin-empty">No team members yet. Click “+ Add Member” to create your first.</div>';
      return;
    }

    list.innerHTML = data.map((m) => {
      const details = [m.meta1_value, m.meta2_value, m.meta3_value].filter(Boolean).join(' · ');
      const avatar = m.image_url
        ? '<img class="member-avatar" src="' + esc(m.image_url) + '" alt="" />'
        : '<span class="member-avatar">' + esc(initialsOf(m)) + '</span>';
      return '<div class="member-row">' +
        '<div class="member-row-main">' +
          avatar +
          '<span>' +
            '<span class="member-name">' + esc(m.name) + '</span>' +
            (m.designation ? ' <span class="admin-muted">— ' + esc(m.designation) + '</span>' : '') +
            (details ? '<div class="admin-muted admin-small">' + esc(details) + '</div>' : '') +
          '</span>' +
        '</div>' +
        '<div class="member-actions">' +
          '<button class="btn btn-outline admin-btn-sm" data-edit="' + m.id + '">Edit</button>' +
          '<button class="btn admin-btn-sm admin-btn-danger" data-del="' + m.id + '">Delete</button>' +
        '</div>' +
      '</div>';
    }).join('');

    list.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => startEdit(data.find((m) => m.id === b.dataset.edit))));
    list.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => askDelete(data.find((m) => m.id === b.dataset.del))));
  }

  // ---------- Photo upload ----------
  // Returns: a URL string (new upload), or undefined (no new file chosen).
  async function uploadPhotoIfAny() {
    const fileInput = $('f-photo');
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) return undefined;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = Date.now() + '-' + Math.round(Math.random() * 1e6) + '.' + ext;
    const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type
    });
    if (error) throw error;
    const { data } = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  // ---------- Form (add / edit) ----------
  function readForm() {
    return {
      name: $('f-name').value.trim(),
      designation: $('f-designation').value.trim() || null,
      initials: $('f-initials').value.trim() || null,
      meta1_label: $('f-meta1-label').value.trim() || null,
      meta1_value: $('f-meta1-value').value.trim() || null,
      meta2_label: $('f-meta2-label').value.trim() || null,
      meta2_value: $('f-meta2-value').value.trim() || null,
      meta3_label: $('f-meta3-label').value.trim() || null,
      meta3_value: $('f-meta3-value').value.trim() || null,
      bio: $('f-bio').value.trim() || null,
      sort_order: parseInt($('f-sort').value, 10) || 0
    };
  }

  function fillForm(m) {
    $('f-name').value = m.name || '';
    $('f-designation').value = m.designation || '';
    $('f-initials').value = m.initials || '';
    $('f-meta1-label').value = m.meta1_label || '';
    $('f-meta1-value').value = m.meta1_value || '';
    $('f-meta2-label').value = m.meta2_label || '';
    $('f-meta2-value').value = m.meta2_value || '';
    $('f-meta3-label').value = m.meta3_label || '';
    $('f-meta3-value').value = m.meta3_value || '';
    $('f-bio').value = m.bio || '';
    $('f-sort').value = m.sort_order != null ? m.sort_order : 0;
    showPreview(m.image_url);
  }

  function showPreview(url) {
    const wrap = $('photo-preview-wrap');
    const img = $('photo-preview');
    $('f-remove-photo').checked = false;
    if (url) { img.src = url; wrap.style.display = 'flex'; }
    else { img.removeAttribute('src'); wrap.style.display = 'none'; }
  }

  // ---------- Custom file input (Choose file → filename + clear) ----------
  const photoInput = $('f-photo');
  function setFileChosen(file) {
    if (file) {
      $('f-photo-name').textContent = file.name;
      $('f-photo-chosen').style.display = 'flex';
      $('f-photo-btn').style.display = 'none';
    } else {
      $('f-photo-chosen').style.display = 'none';
      $('f-photo-btn').style.display = '';
    }
  }
  $('f-photo-btn').addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', () => setFileChosen(photoInput.files[0] || null));
  $('f-photo-clear').addEventListener('click', () => { photoInput.value = ''; setFileChosen(null); });

  function resetForm() {
    editingId = null;
    editingImageUrl = null;
    $('member-form').reset();
    $('f-sort').value = 0;
    setFileChosen(null);
    showPreview(null);
    $('form-msg').className = 'admin-error';
    $('form-msg').textContent = '';
  }

  // ---------- Add / Edit (open the modal) ----------
  function openAdd() {
    resetForm();
    $('form-title').textContent = 'Add team member';
    $('save-btn').textContent = 'Add Team Member';
    openModal(memberModal);
    $('f-name').focus();
  }

  function startEdit(m) {
    if (!m) return;
    resetForm();
    editingId = m.id;
    editingImageUrl = m.image_url || null;
    fillForm(m);
    $('form-title').textContent = 'Edit team member';
    $('save-btn').textContent = 'Save Changes';
    openModal(memberModal);
  }

  $('add-member-btn').addEventListener('click', openAdd);
  $('member-modal-close').addEventListener('click', () => closeModal(memberModal));
  $('cancel-edit').addEventListener('click', () => closeModal(memberModal));

  $('member-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('form-msg');
    msg.textContent = '';
    const payload = readForm();
    if (!payload.name) { msg.className = 'admin-error'; msg.textContent = 'Name is required.'; return; }

    const saveBtn = $('save-btn');
    const prevLabel = saveBtn.textContent;
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';

    try {
      // Resolve the photo: new upload > remove > keep existing.
      const uploaded = await uploadPhotoIfAny();
      if (uploaded !== undefined) {
        payload.image_url = uploaded;
      } else if ($('f-remove-photo').checked) {
        payload.image_url = null;
      } else if (editingId) {
        payload.image_url = editingImageUrl; // unchanged
      } else {
        payload.image_url = null;
      }

      let error;
      if (editingId) {
        ({ error } = await sb.from('team_members').update(payload).eq('id', editingId));
      } else {
        ({ error } = await sb.from('team_members').insert(payload));
      }
      if (error) throw error;

      const wasEdit = !!editingId;
      closeModal(memberModal);
      resetForm();
      await loadMembers();
      showToast(wasEdit ? 'Member updated' : 'Member added');
    } catch (err) {
      msg.className = 'admin-error';
      msg.textContent = (err && err.message) ? err.message : 'Something went wrong.';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = prevLabel;
    }
  });

  // ---------- Delete (styled confirmation) ----------
  let pendingDelete = null;
  function askDelete(m) {
    if (!m) return;
    pendingDelete = m.id;
    $('confirm-text').innerHTML = 'Delete <strong>' + esc(m.name) + '</strong>? This can’t be undone.';
    openModal(confirmModal);
  }
  $('confirm-close').addEventListener('click', () => closeModal(confirmModal));
  $('confirm-cancel').addEventListener('click', () => closeModal(confirmModal));
  $('confirm-delete').addEventListener('click', async () => {
    if (!pendingDelete) return;
    const btn = $('confirm-delete');
    btn.disabled = true; btn.textContent = 'Deleting…';
    const { error } = await sb.from('team_members').delete().eq('id', pendingDelete);
    btn.disabled = false; btn.textContent = 'Delete';
    if (error) { showToast(error.message); return; }
    pendingDelete = null;
    closeModal(confirmModal);
    await loadMembers();
    showToast('Member deleted');
  });

  resetForm();
})();
