/**
 * Canonical cybersecurity specialty taxonomy for the Ghost directory.
 *
 * Specialties are stored on `ghost_profiles.specialties` as a comma-separated
 * text field (multiple values). This file is the single source of truth for the
 * grouped categories shown in the directory filters and the profile editor.
 *
 * Add a specialty here and it becomes available everywhere — the directory
 * filter, the profile editor checkboxes, and the search index. Keep names
 * stable: they are stored verbatim on member profiles.
 */
export type SpecialtyGroup = {
	name: string;
	specialties: string[];
};

export const SPECIALTY_GROUPS: SpecialtyGroup[] = [
	{
		name: 'Defensive Security',
		specialties: [
			'Threat Hunting',
			'Detection Engineering',
			'SOC',
			'Incident Response',
			'DFIR',
			'Threat Intelligence',
		],
	},
	{
		name: 'Offensive Security',
		specialties: [
			'Penetration Testing',
			'Red Teaming',
			'Adversary Emulation',
			'Exploit Development',
			'Vulnerability Research',
		],
	},
	{
		name: 'Engineering',
		specialties: [
			'Security Engineering',
			'AppSec',
			'Cloud',
			'DevSecOps',
			'Network Security',
			'Endpoint Security',
			'IAM',
		],
	},
	{
		name: 'Research',
		specialties: [
			'Malware Analysis',
			'Reverse Engineering',
			'Cryptography',
			'AI Security',
			'Hardware',
			'Firmware',
		],
	},
	{
		name: 'Specialized Domains',
		specialties: [
			'ICS/OT',
			'Healthcare',
			'Automotive',
			'Aerospace',
			'Maritime',
			'Telecom',
			'IoT',
		],
	},
	{
		name: 'Governance & Strategy',
		specialties: [
			'GRC',
			'Risk',
			'Compliance',
			'Audit',
			'Privacy',
			'Security Assurance',
			'Cyber Law',
			'Cyber Strategy',
		],
	},
	{
		name: 'Community & Education',
		specialties: [
			'OSINT',
			'Social Engineering',
			'CTF',
			'Training',
			'Research',
			'Leadership',
		],
	},
];

/** Flat list of every canonical specialty, in group order. */
export const ALL_SPECIALTIES: string[] = SPECIALTY_GROUPS.flatMap(
	(group) => group.specialties,
);

/** The group a specialty belongs to, or `undefined` for free-text values. */
export function specialtyGroup(name: string): SpecialtyGroup | undefined {
	return SPECIALTY_GROUPS.find((group) => group.specialties.includes(name));
}
