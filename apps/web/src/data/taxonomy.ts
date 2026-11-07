/**
 * Broad cybersecurity taxonomy used to seed the Ghost directory filters and the
 * profile editor suggestions.
 *
 * These lists are NOT a closed set — members can enter any free-text value, and
 * every value that appears on a profile is also collected and offered as a
 * filter option at runtime (see `directory.tsx`). The lists here simply make the
 * most common field-wide terms discoverable up front, so the taxonomy can grow
 * organically with the network instead of being curated by hand.
 */

/** Technical skills, methods, frameworks, languages, and analysis techniques. */
export const SKILL_OPTIONS: string[] = [
  // Methods & analysis
  'Threat Hunting', 'Detection Engineering', 'Digital Forensics', 'Incident Response',
  'Malware Analysis', 'Reverse Engineering', 'Static Analysis', 'Dynamic Analysis',
  'Memory Analysis', 'Packet Analysis', 'Log Analysis', 'Vulnerability Research',
  'Exploit Development', 'Penetration Testing', 'Red Teaming', 'Adversary Emulation',
  'Purple Teaming', 'Social Engineering', 'OSINT', 'Threat Intelligence', 'Attribution',
  'Attack Surface Management', 'Threat Modeling', 'Risk Assessment', 'Cryptanalysis',
  'Side-Channel Analysis', 'Hardware Security', 'Firmware Analysis', 'Secure Code Review',
  'Cloud Security', 'Container Security', 'Kubernetes Security', 'Mobile Security',
  'Web Application Security', 'API Security', 'Network Security', 'Endpoint Security',
  'IAM', 'Zero Trust', 'DevSecOps', 'CI/CD Security', 'Security Architecture',
  'Security Engineering', 'AppSec', 'GRC', 'Compliance', 'Privacy Engineering',
  'Audit', 'Security Assurance', 'SIEM', 'SOAR', 'EDR/XDR',
  // Frameworks & methodologies
  'MITRE ATT&CK', 'D3FEND', 'OWASP', 'NIST CSF', 'NIST 800-53', 'ISO 27001',
  'CIS Controls', 'SOC 2', 'PCI DSS', 'HIPAA', 'GDPR', 'STRIDE', 'Cyber Kill Chain',
  // Programming & scripting languages
  'Python', 'Go', 'Rust', 'C', 'C++', 'C#', 'Java', 'JavaScript', 'TypeScript',
  'PowerShell', 'Bash', 'Ruby', 'Lua', 'SQL', 'Assembly', 'Scala', 'Kotlin', 'Swift',
  // Query & rule languages
  'KQL', 'SPL', 'Sigma', 'YARA', 'Rego', 'Lucene',
];

/**
 * Legitimate cybersecurity tools and platforms. Members may also enter any tool
 * not listed here, or select "Custom" to indicate bespoke / self-built tooling.
 */
export const TOOL_OPTIONS: string[] = [
  'Custom',
  // SIEM / SOAR / XDR
  'Splunk', 'Microsoft Sentinel', 'Elastic', 'ELK', 'IBM QRadar', 'Sumo Logic',
  'Chronicle', 'Securonix', 'Exabeam', 'Tines', 'Shuffle', 'Torq',
  // EDR / DFIR / collection
  'CrowdStrike', 'SentinelOne', 'Defender for Endpoint', 'Velociraptor', 'KAPE',
  'Velociraptor', 'GRR', 'osquery', 'Wazuh', 'Sysmon',
  // Forensics & malware analysis
  'Volatility', 'Autopsy', 'FTK Imager', 'Wireshark', 'tcpdump', 'Ghidra', 'IDA',
  'IDA Pro', 'Binary Ninja', 'Radare2', 'Cutter', 'x64dbg', 'OllyDbg', 'dnSpy',
  'PE Studio', 'Detect It Easy', 'YARA', 'FLOSS', 'Strings',
  // Offensive / pentest
  'Burp Suite', 'Metasploit', 'Nmap', 'Nessus', 'OpenVAS', 'Acunetix', 'Cobalt Strike',
  'Sliver', 'Mythic', 'Empire', 'Beacon', 'sqlmap', 'Hydra', 'Hashcat', 'John the Ripper',
  'CrackMapExec', 'Impacket', 'Responder', 'BloodHound', 'SharpHound', 'Rubeus', 'Mimikatz',
  // Cloud / infrastructure / IaC
  'Terraform', 'Ansible', 'Pulumi', 'CloudFormation', 'Prowler', 'ScoutSuite',
  'CloudSploit', 'kube-bench', 'kube-hunter', 'Trivy', 'Falco', 'OPA', 'Checkov',
  // Network & AD
  'Active Directory', 'BloodHound', 'PingCastle', 'Purple Knight', 'Semperis',
  // Web & API
  'ZAP', 'ffuf', 'Gobuster', 'DirBuster', 'Nikto', 'Postman', 'Kiterunner',
  // OSINT & intelligence
  'Maltego', 'Shodan', 'Censys', 'ZoomEye', 'SpiderFoot', 'theHarvester', 'Recon-ng',
  // Mobile
  'MobSF', 'Frida', 'Objection', 'Jadx', 'Apktool',
];

/** Platforms, operating systems, and environments a Ghost works in. */
export const PLATFORM_OPTIONS: string[] = [
  'Windows', 'Linux', 'macOS', 'Unix',
  'AWS', 'Azure', 'GCP', 'OCI', 'Alibaba Cloud',
  'Kubernetes', 'Docker', 'Containers', 'Serverless',
  'Active Directory', 'Entra ID', 'Okta', 'Identity',
  'SaaS', 'Google Workspace', 'Microsoft 365',
  'Mobile', 'iOS', 'Android',
  'Embedded', 'IoT', 'OT/ICS', 'SCADA', 'Firmware', 'Hardware',
  'Cloud', 'On-prem', 'Hybrid', 'Multi-cloud', 'Edge',
  'Network', 'SD-WAN', 'Zero Trust Network',
];

/** Industries and domains a Ghost has experience in. */
export const INDUSTRY_OPTIONS: string[] = [
  'Healthcare', 'Finance', 'Banking', 'Insurance', 'Government', 'Defense',
  'Education', 'Telecom', 'Energy', 'Utilities', 'Manufacturing', 'Automotive',
  'Aerospace', 'Maritime', 'Retail', 'E-commerce', 'Technology', 'Software',
  'Legal', 'Media', 'Hospitality', 'Transportation', 'Logistics', 'Real Estate',
  'Agriculture', 'Pharmaceutical', 'Critical Infrastructure', 'Public Sector',
  'Non-profit', 'Gaming', 'Cryptocurrency', 'Fintech', 'SaaS',
];

/** Common working language names, merged with values members enter. */
export const LANGUAGE_NAMES: string[] = [
  'English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch',
  'Polish', 'Russian', 'Ukrainian', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
  'Japanese', 'Chinese', 'Korean', 'Arabic', 'Hebrew', 'Hindi', 'Turkish',
  'Vietnamese', 'Indonesian', 'Persian', 'Romanian', 'Czech', 'Greek',
];
