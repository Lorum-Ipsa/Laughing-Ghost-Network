import { expect, test } from 'bun:test';
import type { Work } from '../src/lib/network';
import { artifactPlatforms, artifactTools, workIdentifiers, workSearchText } from '../src/lib/work-search';
import { ATTACK_PATTERN, RESEARCH_KINDS, VULN_PATTERN } from '../src/data/research';
import { ARSENAL_KINDS } from '../src/data/arsenal';

const artifact={
  title:'Detection example',kind:'sigma_rules',summary:'References CWE-79',body:'See CVE-2026-1234.',
  code:'technique: T1059.001\nselection: code_only_value',platform:'Windows',tool:'Sigma',
  expand:{author:{handle:'Ghost//One',display_name:'Night Analyst',platform:'Linux',tools:'Splunk'}},
} as Work;

test('search covers code, public author names and pseudonymous handles',()=>{
  const index=workSearchText(artifact);
  for(const term of ['code_only_value','night analyst','ghost//one','cwe-79','t1059.001'])
    expect(index).toContain(term);
});

test('identifier filters discover values outside tags',()=>{
  expect(workIdentifiers(artifact,VULN_PATTERN)).toEqual(['CWE-79','CVE-2026-1234']);
  expect(workIdentifiers(artifact,ATTACK_PATTERN)).toEqual(['T1059.001']);
});

test('artifact filters use both artifact and public author metadata',()=>{
  expect(artifactPlatforms(artifact)).toEqual(['Windows','Linux']);
  expect(artifactTools(artifact)).toEqual(['Sigma','Splunk']);
});

test('each library includes its intended kinds, with datasets intentionally shared',()=>{
  expect(RESEARCH_KINDS).toContain('presentations');
  expect(RESEARCH_KINDS).toContain('malware_analysis');
  expect(RESEARCH_KINDS).not.toContain('sigma_rules');
  expect(ARSENAL_KINDS).toContain('sigma_rules');
  expect(ARSENAL_KINDS).toContain('malware_samples');
  expect(ARSENAL_KINDS).not.toContain('malware_analysis');
  expect(RESEARCH_KINDS).toContain('datasets');
  expect(ARSENAL_KINDS).toContain('datasets');
});
