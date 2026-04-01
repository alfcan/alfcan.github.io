const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  document.getElementById('theme-toggle').textContent = theme === 'dark' ? '🌙' : '☀️';
};

const setUpThemeToggle = () => {
  const preferred = localStorage.getItem('theme') || 'light';
  applyTheme(preferred);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
};

const fetchJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Cannot load ${path}`);
  return response.json();
};

const renderProfile = (profile) => {
  document.title = `${profile.name} | PhD Student`;
  document.getElementById('brand-name').textContent = profile.name;
  document.getElementById('hero-name').textContent = profile.name;
  document.getElementById('hero-tagline').textContent = profile.tagline;
  document.getElementById('hero-bio').textContent = profile.bio;
  document.getElementById('about-text').textContent = profile.bio;
  document.getElementById('research-track').textContent = profile.researchTrack;
  document.getElementById('footer-name').textContent = profile.name;

  const supervisors = profile.supervisors
    .map((s) => `<a href="${s.url}" target="_blank" rel="noreferrer">${s.name}</a>`)
    .join(', ');
  document.getElementById('supervisors').innerHTML = supervisors;

  const researchList = document.getElementById('research-list');
  researchList.innerHTML = profile.researchInterests.map((interest) => `<li>${interest}</li>`).join('');

  const links = document.getElementById('hero-links');
  links.innerHTML = profile.links
    .map((link) => `<a href="${link.url}" target="_blank" rel="noreferrer">${link.label}</a>`)
    .join('');

  const scholar = profile.links.find((link) => link.label.toLowerCase().includes('scholar'));
  if (scholar) {
    const scholarLink = document.getElementById('scholar-link');
    scholarLink.href = scholar.url;
  }

  const studentsList = document.getElementById('students-list');
  if (!profile.students?.length) {
    studentsList.innerHTML = '<li class="muted">No students added yet.</li>';
  } else {
    studentsList.innerHTML = profile.students
      .map((student) => `<li><strong>${student.name}</strong> — ${student.topic || ''}</li>`)
      .join('');
  }

  const projectsList = document.getElementById('projects-list');
  if (!profile.projects?.length) {
    projectsList.innerHTML = '<li class="muted">No projects added yet.</li>';
  } else {
    projectsList.innerHTML = profile.projects
      .map((project) => `<li><strong>${project.name}</strong>${project.description ? ` — ${project.description}` : ''}</li>`)
      .join('');
  }

  const teachingList = document.getElementById('teaching-list');
  if (!profile.teaching?.length) {
    teachingList.innerHTML = '<li class="muted">No teaching activities added yet.</li>';
  } else {
    teachingList.innerHTML = profile.teaching
      .map((course) => `<li><strong>${course.name}</strong>${course.role ? ` — ${course.role}` : ''}</li>`)
      .join('');
  }

  const email = document.getElementById('email-link');
  email.href = `mailto:${profile.email}`;
  email.textContent = profile.email;
};

const renderPublications = (publications, config) => {
  const grid = document.getElementById('publications-grid');
  const note = document.getElementById('pub-sync-note');

  if (config?.lastPublicationSync) {
    note.innerHTML = `Publications source: <code>${config.publicationSource}</code>. Last sync: <strong>${config.lastPublicationSync}</strong>.`;
  }

  if (!publications.length) {
    grid.innerHTML = `<article class="pub-card">
      <h3>No publications added yet</h3>
      <p class="pub-meta">Run <code>python scripts/sync_publications.py</code> or manually edit <code>data/publications.json</code>.</p>
    </article>`;
    return;
  }

  const sorted = [...publications].sort((a, b) => (b.year || 0) - (a.year || 0));
  grid.innerHTML = sorted
    .map(
      (pub) => `<article class="pub-card">
        <h3>${pub.url ? `<a href="${pub.url}" target="_blank" rel="noreferrer">${pub.title}</a>` : pub.title}</h3>
        <p class="pub-meta">${pub.authors || 'Authors not provided'}</p>
        <p class="pub-meta">${pub.venue || 'Venue not provided'} · ${pub.year || 'n.d.'}${pub.type ? ` · ${pub.type}` : ''}</p>
      </article>`
    )
    .join('');
};

const init = async () => {
  setUpThemeToggle();
  document.getElementById('year').textContent = new Date().getFullYear();

  try {
    const [profile, publications, config] = await Promise.all([
      fetchJson('data/profile.json'),
      fetchJson('data/publications.json'),
      fetchJson('data/site-config.json')
    ]);
    renderProfile(profile);
    renderPublications(publications, config);
  } catch (error) {
    console.error(error);
  }
};

init();
