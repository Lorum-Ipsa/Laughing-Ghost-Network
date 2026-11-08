import { kindLabels, tagsOf, type Work } from './network';

export function workSearchText(item:Work):string {
  const author=item.expand?.author;
  return [
    item.title,item.summary,item.body,item.code,item.tags,item.kind,kindLabels[item.kind],
    item.source,item.repository,item.domain,item.language,item.platform,item.format,item.tool,
    item.version,item.license,author?.handle,author?.display_name,author?.specialties,
    author?.skills,author?.tools,author?.platform,author?.industry,author?.languages,
  ].filter(Boolean).join(' ').toLowerCase();
}

export function workIdentifiers(item:Work,pattern:RegExp):string[] {
  const text=[item.title,item.summary,item.body,item.tags,item.code,item.source,item.repository].join(' ');
  return [...new Set((text.match(pattern)??[]).map(id=>id.toUpperCase()))];
}

export function artifactPlatforms(item:Work):string[] {
  return [...tagsOf(item.platform||''),...tagsOf(item.expand?.author?.platform||'')];
}

export function artifactTools(item:Work):string[] {
  return [...tagsOf(item.tool||''),...tagsOf(item.expand?.author?.tools||'')];
}
