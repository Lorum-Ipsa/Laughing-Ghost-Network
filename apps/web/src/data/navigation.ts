export const navigation = [
  { path: '/ghosts', label: 'Ghosts' },
  { path: '/research', label: 'Research' },
  { path: '/arsenal', label: 'Arsenal' },
  { path: '/projects', label: 'Projects' },
  { path: '/table-talks', label: 'Table Talks' },
  { path: '/about', label: 'About' },
];
export const librarySections = {
  research: { title: 'Research', number: '02', eyebrow: 'SEARCH · DOCUMENT · SHARE', description: 'Research and analysis from across cybersecurity. Methods documented. Results reproducible. Limitations explicit.', kinds: ['research', 'writeup', 'intelligence', 'investigation', 'analysis', 'experiment', 'case_study', 'malware_analysis', 'vulnerability_research', 'papers', 'advisories', 'datasets', 'peer_review'], filters: ['All', 'Research', 'Investigation', 'Analysis', 'Paper', 'Advisory', 'Writeup', 'Dataset', 'Experiment', 'Case Study', 'Peer Review'] },
  arsenal: { title: 'Arsenal', number: '03', eyebrow: 'EQUIP · DETECT · VALIDATE', description: 'Operational artifacts for cybersecurity work. Tools, rules, queries, datasets, playbooks, code, and more—with context, limitations, and provenance.', subtitle: 'Use what fits. Validate before deployment.', kinds: ['detection', 'tool', 'rules', 'queries', 'code', 'datasets', 'playbooks', 'frameworks', 'labs'], filters: ['All', 'Detection', 'Tool', 'Rules', 'Queries', 'Code', 'Datasets', 'Playbooks', 'Frameworks', 'Labs'] },
  projects: { title: 'Projects', number: '04', eyebrow: 'BUILD TOGETHER', description: 'Open workstreams, concrete deliverables, and community contributions. Find a topic, propose a method, build with other Ghosts.', kinds: ['project', 'community'], filters: ['All', 'Project', 'Community Contributions'] },
  'table-talks': { title: 'Table Talks', number: '05', eyebrow: 'PRACTICE · COMPARE · LEARN', description: 'Realistic cybersecurity exercises built around judgment, tradeoffs, incomplete information, and collaborative reasoning.', subtitle: 'No rankings. No ego contests. Just decisions, discussion, and debrief.', kinds: ['exercise'], filters: ['All', 'Exercise'] },
} as const;
