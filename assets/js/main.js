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

const toggleNavLinkVisibility = (href, show) => {
  document.querySelectorAll(`nav a[href="${href}"]`).forEach((link) => {
    link.style.display = show ? 'inline-block' : 'none';
  });
};

const setUpMobileMenu = () => {
  const mobileMenu = document.getElementById('mobile-menu');
  const menuToggle = document.getElementById('menu-toggle');
  
  if (!mobileMenu || !menuToggle) return;

  // Toggle active/expanded state attributes
  mobileMenu.addEventListener('toggle', (event) => {
    const isOpen = event.newState === 'open';
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close popover drawer when any link is clicked
  mobileMenu.querySelectorAll('.mobile-nav a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileMenu.hidePopover();
    });
  });
};

const fetchJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Cannot load ${path}`);
  return response.json();
};

const fetchJsonSafe = async (path) => {
  try {
    const response = await fetch(path);
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
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

  const researchSection = document.getElementById('research');
  const hasResearch = !!profile.researchInterests?.length;
  toggleNavLinkVisibility('#research', hasResearch);
  if (!hasResearch) {
    if (researchSection) researchSection.style.display = 'none';
  } else {
    document.getElementById('research-list').innerHTML = profile.researchInterests
      .map((interest) => `<li>${interest}</li>`)
      .join('');
  }

  const cvSection = document.getElementById('cv');
  const hasCv = !!profile.cv;
  toggleNavLinkVisibility('#cv', hasCv);
  if (!hasCv) {
    if (cvSection) cvSection.style.display = 'none';
  } else {
    if (cvSection) cvSection.style.display = 'block';
  }

  const links = document.getElementById('hero-links');
  links.innerHTML = profile.links
    .map((link) => `<a href="${link.url}" target="_blank" rel="noreferrer">${link.label}</a>`)
    .join('');

  const scholar = profile.links.find((link) => link.label.toLowerCase().includes('scholar'));
  if (scholar) {
    document.getElementById('scholar-link').href = scholar.url;
  }

  const projectsSection = document.getElementById('projects');
  const hasProjects = !!profile.projects?.length;
  toggleNavLinkVisibility('#projects', hasProjects);
  if (!hasProjects) {
    if (projectsSection) projectsSection.style.display = 'none';
  } else {
    if (projectsSection) projectsSection.style.display = 'block';
    document.getElementById('projects-list').innerHTML = profile.projects
      .map(
        (project) =>
          `<li><strong>${project.name}</strong>${project.description ? ` — ${project.description}` : ''}</li>`
      )
      .join('');
  }

  const email = document.getElementById('email-link');
  email.href = `mailto:${profile.email}`;
  email.textContent = profile.email;
};

const renderPublications = (publications) => {
  const grid = document.getElementById('publications-grid');
  const pubSection = document.getElementById('publications');
  const hasPublications = !!publications.length;

  toggleNavLinkVisibility('#publications', hasPublications);
  if (!hasPublications) {
    if (pubSection) pubSection.style.display = 'none';
    return;
  }

  if (pubSection) pubSection.style.display = 'block';

  const sorted = [...publications].sort((a, b) => (b.year || 0) - (a.year || 0));

  const renderGrid = (filter) => {
    const filtered = sorted.filter((pub) => {
      if (filter === 'all') return true;
      return (pub.category || '').toLowerCase() === filter;
    });

    if (!filtered.length) {
      grid.innerHTML = `<article class="pub-card"><p class="pub-meta">No publications found for this category.</p></article>`;
      return;
    }

    grid.innerHTML = filtered
      .map(
        (pub) => `<article class="pub-card" data-type="${(pub.type || '').toLowerCase()}">
          ${pub.type ? `<span class="pub-category">${pub.type}</span>` : ''}
          <h3>${pub.url ? `<a href="${pub.url}" target="_blank" rel="noreferrer">${pub.title}</a>` : pub.title}</h3>
          <p class="pub-meta">${pub.authors || 'Authors not provided'}</p>
          <p class="pub-meta">${pub.venue || 'Venue not provided'} ${pub.year ? `· ${pub.year}` : ''}</p>
          ${pub.pdf ? `
          <div class="pub-links">
            <a href="${pub.pdf}" target="_blank" rel="noreferrer" class="pub-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              PDF
            </a>
          </div>` : ''}
        </article>`
      )
      .join('');
  };

  renderGrid('all');

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      renderGrid(e.target.dataset.filter);
    });
  });
};

// ─── Teaching ────────────────────────────────────────────────────────────────

const TEACHING_TYPE_LABELS = {
  lab: 'Lab',
  exercise: 'Exercise Session',
  course: 'Course',
  lecture: 'Lecture',
  seminar: 'Seminar',
  workshop: 'Workshop',
  tutoring: 'Tutoring',
};

const renderTeaching = (teaching) => {
  const section = document.getElementById('teaching');
  const hasTeaching = !!teaching?.length;

  toggleNavLinkVisibility('#teaching', hasTeaching);
  if (!hasTeaching) {
    if (section) section.style.display = 'none';
    return;
  }

  if (section) section.style.display = 'block';

  const grouped = teaching.reduce((acc, entry) => {
    const year = entry.academicYear || 'Other';
    if (!acc[year]) acc[year] = [];
    acc[year].push(entry);
    return acc;
  }, {});

  const sortedYears = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const renderCard = (entry) => {
    const typeLabel = TEACHING_TYPE_LABELS[entry.type] || entry.type || '';
    const meta = [entry.program, entry.institution, entry.semester].filter(Boolean);

    return `<div class="teaching-card">
      <div class="teaching-card-header">
        ${typeLabel ? `<span class="teaching-type" data-type="${entry.type}">${typeLabel}</span>` : ''}
        ${entry.hours ? `<span class="teaching-hours">${entry.hours}h</span>` : ''}
      </div>
      <h3 class="teaching-title">${entry.title}</h3>
      <p class="teaching-role">${entry.role}</p>
      ${meta.length ? `<p class="teaching-meta">${meta.map((m) => `<span>${m}</span>`).join('')}</p>` : ''}
      ${entry.description ? `<p class="teaching-description">${entry.description}</p>` : ''}
      ${entry.url ? `<a href="${entry.url}" target="_blank" rel="noreferrer" class="item-link">Course page <span class="arrow">→</span></a>` : ''}
    </div>`;
  };

  document.getElementById('teaching-content').innerHTML = sortedYears
    .map(
      (year) => `<div class="content-year-group">
        <p class="year-label">${year}</p>
        <div class="teaching-cards">${grouped[year].map(renderCard).join('')}</div>
      </div>`
    )
    .join('');
};

// ─── Student Supervision ─────────────────────────────────────────────────────

const DEGREE_LABELS = {
  bachelor: "Bachelor's",
  master: "Master's",
  phd: 'PhD',
};

const renderStudents = (students) => {
  const section = document.getElementById('students');
  const hasStudents = !!students?.length;

  toggleNavLinkVisibility('#students', hasStudents);
  if (!hasStudents) {
    if (section) section.style.display = 'none';
    return;
  }

  if (section) section.style.display = 'block';

  const ongoing = students.filter((s) => s.status === 'ongoing');
  const completed = students.filter((s) => s.status === 'completed');

  const renderCard = (student) => {
    const degreeLabel = DEGREE_LABELS[student.degree] || student.degree || '';
    const coSups = student.coSupervisors?.length
      ? student.coSupervisors
          .map((s) =>
            s.url
              ? `<a href="${s.url}" target="_blank" rel="noreferrer">${s.name}</a>`
              : s.name
          )
          .join(', ')
      : null;

    return `<div class="student-card">
      <div class="student-card-header">
        ${degreeLabel ? `<span class="student-degree" data-degree="${student.degree}">${degreeLabel} Thesis</span>` : ''}
        <span class="student-status" data-status="${student.status}">
          <span class="student-status-dot"></span>
          ${student.status === 'ongoing' ? 'Ongoing' : 'Completed'}
        </span>
      </div>
      <h3 class="student-name">${student.name}</h3>
      ${student.topic ? `<p class="student-topic">&ldquo;${student.topic}&rdquo;</p>` : ''}
      ${student.description ? `<p class="student-description">${student.description}</p>` : ''}
      ${coSups ? `<p class="student-cosup"><span class="student-cosup-label">Co-supervised with</span> ${coSups}</p>` : ''}
      <div class="student-footer">
        <span class="student-year">${student.academicYear || ''}</span>
        <div class="student-footer-right">
          ${student.grade ? `<span class="student-grade">${student.grade}</span>` : ''}
          ${student.thesisUrl ? `<a href="${student.thesisUrl}" target="_blank" rel="noreferrer" class="item-link">Thesis <span class="arrow">→</span></a>` : ''}
        </div>
      </div>
    </div>`;
  };

  const renderGroup = (group, label) => {
    if (!group.length) return '';
    return `<div class="students-group">
      <p class="year-label">
        ${label}
        <span class="group-count">${group.length}</span>
      </p>
      <div class="students-grid">${group.map(renderCard).join('')}</div>
    </div>`;
  };

  document.getElementById('students-content').innerHTML =
    renderGroup(ongoing, 'Current Students') + renderGroup(completed, 'Alumni');
};

const setUpScrollReveal = () => {
  const revealElements = document.querySelectorAll('.reveal');
  
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.05,
    rootMargin: '0px 0px -20px 0px'
  });

  revealElements.forEach((el) => {
    observer.observe(el);
  });
};

// ─── Init ─────────────────────────────────────────────────────────────────────

const init = async () => {
  setUpThemeToggle();
  setUpMobileMenu();
  document.getElementById('year').textContent = new Date().getFullYear();

  // Load profile first as it is core to the entire site layout
  let profile = null;
  try {
    profile = await fetchJson('data/profile.json');
    renderProfile(profile);
  } catch (error) {
    console.error('Failed to load profile:', error);
    document.querySelector('main').insertAdjacentHTML(
      'afterbegin',
      `<div class="error-banner">
        Failed to load profile data. If running locally, serve via <code>npx serve .</code> instead of opening the file directly.
      </div>`
    );
    setUpScrollReveal();
    return;
  }

  // Load other sections independently so a failure in one doesn't crash the whole page
  try {
    const publications = await fetchJson('data/publications.json');
    renderPublications(publications);
  } catch (error) {
    console.error('Failed to load publications:', error);
    const pubSection = document.getElementById('publications');
    if (pubSection) pubSection.style.display = 'block';
    const pubGrid = document.getElementById('publications-grid');
    if (pubGrid) {
      pubGrid.innerHTML = `
        <div class="error-banner" style="margin-top: 1rem;">
          Failed to load publications. Please try reloading the page.
        </div>
      `;
    }
  }

  try {
    const teaching = await fetchJson('data/teaching.json');
    renderTeaching(teaching);
  } catch (error) {
    console.error('Failed to load teaching:', error);
    const teachingSection = document.getElementById('teaching');
    if (teachingSection) teachingSection.style.display = 'block';
    const teachingContent = document.getElementById('teaching-content');
    if (teachingContent) {
      teachingContent.innerHTML = `
        <div class="error-banner" style="margin-top: 1rem;">
          Failed to load teaching data. Please try reloading the page.
        </div>
      `;
    }
  }

  try {
    const students = await fetchJson('data/students.json');
    renderStudents(students);
  } catch (error) {
    console.error('Failed to load students:', error);
    const studentsSection = document.getElementById('students');
    if (studentsSection) studentsSection.style.display = 'block';
    const studentsContent = document.getElementById('students-content');
    if (studentsContent) {
      studentsContent.innerHTML = `
        <div class="error-banner" style="margin-top: 1rem;">
          Failed to load student supervision data. Please try reloading the page.
        </div>
      `;
    }
  }

  setUpScrollReveal();
};

init();
