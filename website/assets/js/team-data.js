// ============================================================
// Renders the Our Team grid on team.html from Supabase.
// If Supabase isn't configured yet (or returns no rows), the
// static cards already in the HTML are left untouched as a fallback.
// ============================================================
(function () {
  const cfg = window.SUPABASE_CONFIG;
  const grid = document.getElementById('team-grid');
  if (!grid) return;

  const notConfigured = !cfg || !cfg.url || cfg.url.indexOf('YOUR_') === 0;
  if (notConfigured || !window.supabase) return; // keep static fallback cards

  const sb = window.supabase.createClient(cfg.url, cfg.anonKey);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function initialsFor(m) {
    if (m.initials) return m.initials;
    return (m.name || '')
      .split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function metaItem(label, value) {
    if (!label || !value) return '';
    return '<div class="team-meta-item">' +
      '<span class="team-meta-label">' + esc(label) + '</span>' +
      '<span class="team-meta-value">' + esc(value) + '</span></div>';
  }

  function card(m) {
    const avatar = m.image_url
      ? '<div class="team-image"><img src="' + esc(m.image_url) + '" alt="' + esc(m.name) + '" /></div>'
      : '<div class="team-image">' + esc(initialsFor(m)) + '</div>';

    const bioHtml = (m.bio || '')
      .split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
      .map((p) => '<p class="team-bio">' + esc(p) + '</p>').join('');

    const meta = metaItem(m.meta1_label, m.meta1_value) +
                 metaItem(m.meta2_label, m.meta2_value) +
                 metaItem(m.meta3_label, m.meta3_value);

    return '<div class="team-card">' +
      avatar +
      '<h3>' + esc(m.name) + '</h3>' +
      (m.designation ? '<span class="team-designation">' + esc(m.designation) + '</span>' : '') +
      bioHtml +
      (meta ? '<div class="team-meta">' + meta + '</div>' : '') +
      '</div>';
  }

  sb.from('team_members')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .then(function (res) {
      if (res.error) { console.error('team_members load error:', res.error); return; }
      const data = res.data || [];
      if (!data.length) return; // keep static fallback cards
      grid.innerHTML = data.map(card).join('');
    });
})();
