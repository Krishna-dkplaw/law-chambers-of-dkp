// ============================================================
// Admin panel for managing the Our Team grid (Supabase).
// Login is handled by Supabase Auth (email + password).
// Add / edit / delete + photo upload, protected by Row Level Security.
// ============================================================
(function () {
  const $ = (id) => document.getElementById(id);

  const warn = $('config-warning');
  const loginView = $('login-view');
  const dashView = $('dashboard-view');

  const cfg = window.SUPABASE_CONFIG;
  const notConfigured = !cfg || !cfg.url || cfg.url.indexOf('YOUR_') === 0;
  if (notConfigured || !window.supabase) {
    if (warn) warn.style.display = 'block';
    if (loginView) loginView.style.display = 'none';
    return;
  }

  const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
  const PHOTO_BUCKET = 'team-photos';
  let editingId = null;
  let editingImageUrl = null; // current photo url of the member being edited

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- View switching ----------
  function showLogged(session) {
    if (session) {
      loginView.style.display = 'none';
      dashView.style.display = 'block';
      const ue = $('user-email');
      if (ue) ue.textContent = session.user.email;
      loadMembers();
    } else {
      loginView.style.display = 'block';
      dashView.style.display = 'none';
    }
  }

  sb.auth.getSession().then(({ data }) => showLogged(data.session));
  sb.auth.onAuthStateChange((_event, session) => showLogged(session));

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

  function initialsOf(m) {
    if (m.initials) return m.initials;
    return (m.name || '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  // ---------- List ----------
  async function loadMembers() {
    const list = $('members-list');
    list.innerHTML = '<p class="admin-muted">Loading…</p>';
    const { data, error } = await sb.from('team_members')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) { list.innerHTML = '<p class="admin-error">' + esc(error.message) + '</p>'; return; }
    if (!data.length) { list.innerHTML = '<p class="admin-muted">No team members yet. Add one above.</p>'; return; }

    list.innerHTML = data.map((m) => {
      const details = [m.meta1_value, m.meta2_value, m.meta3_value].filter(Boolean).join(' · ');
      const thumb = m.image_url
        ? '<img src="' + esc(m.image_url) + '" alt="" style="width:44px;height:44px;object-fit:cover;border:1px solid var(--color-line);flex:none;" />'
        : '<span style="width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--color-charcoal);color:#fff;font-family:var(--font-serif);">' + esc(initialsOf(m)) + '</span>';
      return '<div class="admin-row">' +
        '<div class="admin-row-main" style="display:flex;align-items:center;gap:.85rem;">' +
          thumb +
          '<span>' +
            '<strong>' + esc(m.name) + '</strong>' +
            (m.designation ? ' <span class="admin-muted">— ' + esc(m.designation) + '</span>' : '') +
            (details ? '<div class="admin-muted admin-small">' + esc(details) + '</div>' : '') +
          '</span>' +
        '</div>' +
        '<div class="admin-row-actions">' +
          '<button class="btn btn-outline admin-btn-sm" data-edit="' + m.id + '">Edit</button>' +
          '<button class="btn admin-btn-sm admin-btn-danger" data-del="' + m.id + '">Delete</button>' +
        '</div>' +
      '</div>';
    }).join('');

    list.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => startEdit(data.find((m) => m.id === b.dataset.edit))));
    list.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => removeMember(b.dataset.del)));
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

  function resetForm() {
    editingId = null;
    editingImageUrl = null;
    $('member-form').reset();
    $('f-sort').value = 0;
    showPreview(null);
    $('save-btn').textContent = 'Add Team Member';
    $('cancel-edit').style.display = 'none';
    $('form-title').textContent = 'Add a team member';
  }

  function startEdit(m) {
    if (!m) return;
    editingId = m.id;
    editingImageUrl = m.image_url || null;
    fillForm(m);
    $('save-btn').textContent = 'Update Team Member';
    $('cancel-edit').style.display = 'inline-block';
    $('form-title').textContent = 'Edit team member';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('cancel-edit').addEventListener('click', resetForm);

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

      msg.className = 'admin-success';
      msg.textContent = editingId ? 'Team member updated.' : 'Team member added.';
      resetForm();
      loadMembers();
    } catch (err) {
      msg.className = 'admin-error';
      msg.textContent = (err && err.message) ? err.message : 'Something went wrong.';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = prevLabel;
    }
  });

  async function removeMember(id) {
    if (!window.confirm('Delete this team member? This cannot be undone.')) return;
    const { error } = await sb.from('team_members').delete().eq('id', id);
    if (error) { window.alert(error.message); return; }
    loadMembers();
  }

  resetForm();
})();
