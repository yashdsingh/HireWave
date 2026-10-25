// Centralized mock data so every page stays consistent.
// Swap any of this for real API calls to your backend later.

export const currentUser = { name: 'Jamie', initials: 'JD' };

export const activeJob = {
  title: 'Senior Full Stack Developer',
  location: 'Remote (US)',
  type: 'Full-time',
  tag: 'AI Engineering',
  skills: ['React', 'TypeScript', 'Postgres', 'AWS'],
  lastRun: '2 hours ago',
  newProfiles: 23,
};

export const dashboardStats = [
  { label: 'Sourced Today', value: 23, delta: '+12', icon: '👥' },
  { label: 'Shortlisted', value: 4, delta: '+2', icon: '🔖' },
  { label: 'Screened', value: 11, delta: '+6', icon: '💬' },
  { label: 'Avg Fit', value: 82, delta: '+5', icon: '🎯' },
];

export const funnel = [
  { stage: 'Sourced', value: 23, pct: 100, color: '#2dd4bf' },
  { stage: 'Screened', value: 11, pct: 48, color: '#22a596' },
  { stage: 'Shortlisted', value: 4, pct: 17, color: '#176b61' },
];

export const candidates = [
  {
    id: 'c1', name: 'Priya Raman', title: 'Full Stack Developer', location: 'Austin, TX',
    skills: ['React', 'TypeScript', 'AWS'], extraSkills: 2, source: 'Job Board',
    fit: 92, stage: 'Screened', color: '#3b82f6', initials: 'PR', timeAgo: '2m ago',
    email: 'priya.raman@example.com', phone: '+1 512 555 0142',
    experience: [
      { role: 'Senior Full Stack Developer', company: 'Fintech labs', period: '2022 - Present', detail: 'Led a team of 3, shipped core billing platform in React/Node.' },
      { role: 'Full Stack Developer', company: 'Appworks', period: '2019 - 2022', detail: 'Built internal tooling and customer dashboards.' },
    ],
    why: 'Priya has deep React and TypeScript experience with AWS deployment background, matching the role tightly. Strong ownership shown through leading a small team.',
    gaps: ['Kubernetes'],
    education: 'B.S. Computer Science',
    opted: true,
  },
  {
    id: 'c2', name: 'Marcus Kim', title: 'Software Engineer', location: 'Seattle, WA',
    skills: ['Python', 'Django', 'AWS'], extraSkills: 2, source: 'Open Web',
    fit: 88, stage: 'Sourced', color: '#a855f7', initials: 'MK', timeAgo: '4m ago',
    email: 'marcus.kim@example.com', phone: '+1 206 555 0199',
    experience: [
      { role: 'Software Engineer', company: 'Northwind', period: '2021 - Present', detail: 'Backend services in Python/Django handling high-traffic APIs.' },
    ],
    why: 'Strong backend fundamentals in Python and Django; AWS experience aligns with infra needs, though frontend depth is unconfirmed.',
    gaps: ['React', 'TypeScript'],
    education: 'B.S. Software Engineering',
    opted: true,
  },
  {
    id: 'c3', name: 'Elena Lopez', title: 'Frontend Developer', location: 'New York, NY',
    skills: ['React', 'Next.js', 'TypeScript'], extraSkills: 1, source: 'Community',
    fit: 76, stage: 'Shortlisted', color: '#22c55e', initials: 'EL', timeAgo: '6m ago',
    email: 'elena.lopez@example.com', phone: '+1 917 555 0133',
    experience: [
      { role: 'Frontend Developer', company: 'Studio Nine', period: '2020 - Present', detail: 'Built design-system-driven React/Next.js products.' },
    ],
    why: 'Excellent frontend craft and design-system experience; limited exposure to backend/infra work the role also needs.',
    gaps: ['AWS', 'Postgres'],
    education: 'B.A. Computer Science',
    opted: true,
  },
  {
    id: 'c4', name: 'James Tran', title: 'Full Stack Developer', location: 'San Francisco, CA',
    skills: ['React', 'Node.js', 'Postgres'], extraSkills: 1, source: 'Job Board',
    fit: 84, stage: 'Sourced', color: '#f97316', initials: 'JT', timeAgo: '8m ago',
    email: 'james.tran@example.com', phone: '+1 415 555 0177',
    experience: [
      { role: 'Full Stack Developer', company: 'Lightbox', period: '2021 - Present', detail: 'End-to-end features across React/Node/Postgres stack.' },
    ],
    why: 'Direct stack match across React, Node and Postgres with solid full-cycle delivery experience.',
    gaps: ['AWS'],
    education: 'B.S. Information Systems',
    opted: true,
  },
  {
    id: 'c5', name: 'Sofia Chen', title: 'Software Engineer', location: 'Toronto, CA',
    skills: ['Python', 'React', 'Docker'], extraSkills: 2, source: 'Open Web',
    fit: 79, stage: 'Screened', color: '#ec4899', initials: 'SL', timeAgo: '11m ago',
    email: 'sofia.chen@example.com', phone: '+1 647 555 0188',
    experience: [
      { role: 'Software Engineer', company: 'Maple Systems', period: '2020 - Present', detail: 'Full-stack feature work with containerized deployments.' },
    ],
    why: 'Well-rounded full-stack profile with containerization experience; fit score moderated by shorter React tenure.',
    gaps: ['TypeScript', 'AWS'],
    education: 'M.S. Computer Science',
    opted: true,
  },
  {
    id: 'c6', name: 'Daniel Park', title: 'Full Stack Developer', location: 'Vancouver, BC',
    skills: ['React', 'Kubernetes', 'AWS'], extraSkills: 1, source: 'Referral',
    fit: 62, stage: 'Opted out', color: '#8b5cf6', initials: 'DR', timeAgo: '15m ago',
    email: 'daniel.park@example.com', phone: '+1 604 555 0166',
    experience: [
      { role: 'Full Stack Developer', company: 'Harbor Digital', period: '2019 - Present', detail: 'Infra-heavy full-stack role with Kubernetes deployments.' },
    ],
    why: 'Good infra skills but has opted out of outreach — respect consent status, do not contact.',
    gaps: ['Postgres'],
    education: 'B.Eng Software Engineering',
    opted: false,
  },
  {
    id: 'c7', name: 'Maya Chen', title: 'Senior Full Stack Engineer', location: 'Berlin, Germany',
    skills: ['React', 'TypeScript', 'Node.js', 'Postgres', 'AWS'], extraSkills: 0, source: 'LinkedIn',
    fit: 87, stage: 'Sourced', color: '#8b5cf6', initials: 'MC', timeAgo: '2 days ago',
    email: 'maya.chen@example.com', phone: '+49 30 555 0144',
    experience: [
      { role: 'Senior Software Engineer', company: 'FintechOS', period: 'Jan 2022 - Present', detail: 'Led a team of 4 engineers, improved API performance by 60% and scaled to 10M+ users.' },
      { role: 'Software Engineer', company: 'Nimbus Labs', period: 'Jun 2019 - Dec 2021', detail: 'Built and maintained full-stack features with React and Node.js.' },
      { role: 'Junior Software Engineer', company: 'BrightApps', period: 'Aug 2017 - May 2019', detail: 'Developed web applications and internal tools.' },
    ],
    why: 'Maya has a strong track record building and scaling full-stack applications with a focus on developer experience and performance. Her experience with React, TypeScript and AWS aligns closely with what we are looking for, and she has led projects that match our stack and scale. She also shows initiative through open source contributions and technical writing.',
    gaps: ['Kubernetes', 'Terraform'],
    education: 'B.Sc Computer Science',
    opted: true,
  },
];

export const outreachDrafts = [
  { id: 'c1', name: 'Priya Raman', match: 92, status: 'Sent' },
  { id: 'c4', name: 'James Tran', match: 84, status: 'Sent' },
  { id: 'c7', name: 'Maya Chen', match: 79, status: 'Draft' },
  { id: 'c3', name: 'Elena Lopez', match: 76, status: 'Sent' },
  { id: 'c2', name: 'Marcus Kim', match: 88, status: 'Sent' },
];


export const jobs = [
  {
    id: 'j1', title: 'Senior Full Stack Developer', location: 'Remote (US)', type: 'Full-time',
    tag: 'AI Engineering', status: 'Active', postedDate: '2026-10-01',
    skills: ['React', 'TypeScript', 'Postgres', 'AWS'],
    seniority: 'Senior', salaryMin: 140000, salaryMax: 180000,
    description: `We're looking for a Senior Full Stack Developer to join our platform team. You'll own features end-to-end across our React/TypeScript frontend and Node/Postgres backend, deployed on AWS.

Responsibilities:
- Design and build new product features end-to-end
- Mentor mid-level engineers and review code
- Improve system performance and reliability at scale

Requirements:
- 5+ years building production web applications
- Strong React, TypeScript, and Postgres experience
- AWS deployment experience
- Experience leading small projects or mentoring`,
    candidateCount: 23, shortlistedCount: 4,
  },
  {
    id: 'j2', title: 'Backend Engineer', location: 'Berlin, Germany (Hybrid)', type: 'Full-time',
    tag: 'Platform', status: 'Active', postedDate: '2026-09-18',
    skills: ['Python', 'Django', 'Postgres', 'Docker'],
    seniority: 'Mid-Senior', salaryMin: 70000, salaryMax: 95000,
    description: `Backend Engineer to build and scale core APIs powering our platform. Python/Django stack with Postgres, containerized with Docker.

Requirements:
- 3+ years Python backend experience
- Experience with relational databases at scale
- Docker/containerization experience`,
    candidateCount: 14, shortlistedCount: 2,
  },
  {
    id: 'j3', title: 'DevOps Engineer', location: 'Remote (EU)', type: 'Contract',
    tag: 'Infrastructure', status: 'Draft', postedDate: '2026-10-10',
    skills: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD'],
    seniority: 'Senior', salaryMin: 90000, salaryMax: 120000,
    description: `Contract DevOps Engineer to harden our Kubernetes infrastructure and build out CI/CD pipelines across environments.

Requirements:
- Deep Kubernetes and Terraform experience
- AWS infrastructure-as-code background
- Experience building CI/CD pipelines`,
    candidateCount: 0, shortlistedCount: 0,
  },
];
