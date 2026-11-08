import { createClient } from '@supabase/supabase-js';
import { supabasePublicConfig } from '@/lib/supabase-browser';
import type { Database } from '@/lib/supabase.database.types';
import type { DirectoryGhost, GhostProfile, Translation, Work, WorkKind } from '@/lib/network';
import { KIND_ORDER, kindLabels, locationTokens } from '@/lib/network';

// Explicit public-only columns. Auth IDs, role state, deleted_at and email are
// intentionally NOT fetched, including by the server-side public directory.
const PROFILE_FIELDS='id,handle,display_name,pronouns,bio,specialties,developing_specialties,portfolio,location_disclosure,location_country,skills,tools,platform,industry,languages,language,available_for_work,open_to_collaboration,open_to_research,open_to_mentorship,open_to_speaking,collaboration_interests,external_links,avatar_template,featured_work,created_at,updated_at' as const;
type PublicGhostRow=Omit<Database['public']['Tables']['ghost_profiles']['Row'],'owner_id'|'deleted_at'>;

function publicApi() {
  const conf=supabasePublicConfig();
  if(!conf)return null;
  return createClient<Database>(conf.url,conf.key,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  });
}
export function asLegacyProfile(row:PublicGhostRow):GhostProfile {
  return {
    id:row.id,owner:'',handle:row.handle,display_name:row.display_name,
    pronouns:row.pronouns,bio:row.bio,specialties:row.specialties,
    developing_specialties:row.developing_specialties,portfolio:row.portfolio,
    location_disclosure:row.location_disclosure as GhostProfile['location_disclosure'],
    location_country:row.location_country,
    skills:row.skills,tools:row.tools,platform:row.platform,
    industry:row.industry,languages:row.languages,language:row.language,
    available_for_work:row.available_for_work,
    open_to_collaboration:row.open_to_collaboration,
    open_to_research:row.open_to_research,
    open_to_mentorship:row.open_to_mentorship,
    open_to_speaking:row.open_to_speaking,
    collaboration_interests:row.collaboration_interests,
    external_links:row.external_links,
    avatar_template:row.avatar_template,featured_work:row.featured_work,
    member:true,example:false,created:row.created_at,updated:row.updated_at,
  };
}
export async function publicSupabaseGhost(handle:string):Promise<GhostProfile|null>{
  const api=publicApi();
  if(!api)return null;
  const {data,error}=await api.from('ghost_profiles').select(PROFILE_FIELDS)
    .eq('handle',handle).maybeSingle();
  if(error)throw error;
  return data?asLegacyProfile(data as PublicGhostRow):null;
}
export async function publicSupabaseDirectory():Promise<DirectoryGhost[]>{
  const api=publicApi();
  if(!api)return [];
  const [{data,error},{data:work, error:workError}]=await Promise.all([
    api.from('ghost_profiles').select(PROFILE_FIELDS).order('handle',{ascending:true}).limit(500),
    api.from('ghost_contributions').select('id,profile_id,kind,title,summary,tags')
      .eq('status','published').limit(1000),
  ]);
  if(error)throw error;
  if(workError)throw workError;
  return (data||[]).map(row=>{
    const profile=asLegacyProfile(row as PublicGhostRow);
    const evidence=KIND_ORDER.reduce((acc,k)=>{acc[k]=0;return acc;},{} as Record<WorkKind,number>);
    const authored=(work||[]).filter(item=>item.profile_id===profile.id);
    for(const item of authored) {
      if(item.kind in evidence)evidence[item.kind as WorkKind]++;
    }
    const searchIndex=[
      profile.handle,profile.display_name,profile.bio,profile.specialties,
      profile.developing_specialties,profile.skills,profile.tools,profile.platform,
      profile.industry,profile.languages,...locationTokens(profile),
      profile.collaboration_interests,profile.external_links,
      ...authored.flatMap(item=>[item.title,item.summary,item.tags,kindLabels[item.kind as WorkKind]||item.kind]),
    ].filter(Boolean).join(' ').toLowerCase();
    return {profile,evidence,searchIndex};
  });
}


// Only published work is returned by these server-side read-only queries.
// Never use the service-role key for public pages.
const WORK_FIELDS='id,profile_id,kind,title,language,domain,summary,body,tags,source_url,code,status,version,submitted_at,published_at,created_at,updated_at' as const;
type PublicContribution=Omit<Database['public']['Tables']['ghost_contributions']['Row'],'owner_id'|'deleted_at'>;

function asLegacyWork(row:PublicContribution,profile:GhostProfile):Work {
  const kind:WorkKind=Object.prototype.hasOwnProperty.call(kindLabels,row.kind)
    ? row.kind as WorkKind : 'writeup';
  return {
    id:row.id,owner:'',author:profile.id,title:row.title,kind,
    summary:row.summary,body:row.body,tags:row.tags,source:row.source_url,
    code:row.code,status:'published',example:false,
    language:row.language,domain:row.domain,
    version:String(row.version),review_status:'unreviewed',
    created:row.published_at||row.created_at,updated:row.updated_at,
    expand:{author:profile},
  };
}
export async function publicSupabaseWork():Promise<Work[]> {
  const api=publicApi();
  if(!api)return [];
  const work:Work[]=[];
  const pageSize=100;
  for(let offset=0;;offset+=pageSize){
    const {data,error}=await api.from('ghost_contributions')
      .select(`${WORK_FIELDS},ghost_profiles!ghost_contributions_profile_id_fkey(${PROFILE_FIELDS})`)
      .eq('status','published').order('published_at',{ascending:false}).order('id')
      .range(offset,offset+pageSize-1);
    if(error)throw error;
    for(const {ghost_profiles:author,...row} of data){
      if(author)work.push(asLegacyWork(row,asLegacyProfile(author)));
    }
    if(data.length<pageSize)return work;
  }
}

export async function publicSupabaseWorkByProfile(profile:GhostProfile):Promise<Work[]> {
  const api=publicApi();if(!api)return [];
  const {data,error}=await api.from('ghost_contributions').select(WORK_FIELDS)
    .eq('profile_id',profile.id).eq('status','published')
    .order('published_at',{ascending:false}).limit(100);
  if(error)throw error;
  return (data||[]).map(row=>asLegacyWork(row as PublicContribution,profile));
}
export async function publicSupabaseContribution(id:string):Promise<Work|null>{
  const api=publicApi();if(!api)return null;
  const {data,error}=await api.from('ghost_contributions').select(WORK_FIELDS)
    .eq('id',id).eq('status','published').maybeSingle();
  if(error)throw error;
  if(!data)return null;
  const {data:author,error:authorError}=await api.from('ghost_profiles')
    .select(PROFILE_FIELDS).eq('id',data.profile_id).maybeSingle();
  if(authorError)throw authorError;
  if(!author)return null;
  return asLegacyWork(data as PublicContribution,asLegacyProfile(author as PublicGhostRow));
}

export async function publicSupabaseMaterials(id:string,version:number) {
  const api=publicApi();
  if(!api)return {translations:[],attachments:[]};
  const [translated,attached]=await Promise.all([
    api.from('ghost_contribution_translations')
      .select('id,contribution_id,language,title,summary,body,source,created_at')
      .eq('contribution_id',id).eq('version',version).order('language'),
    api.from('ghost_contribution_text_attachments').select('id,filename')
      .eq('contribution_id',id).eq('version',version).order('filename'),
  ]);
  // Existing articles remain available while the optional materials migration
  // is pending in an environment. Other API errors still surface.
  if(translated.error&&translated.error.code!=='PGRST205')throw translated.error;
  if(attached.error&&attached.error.code!=='PGRST205')throw attached.error;
  const translations:Translation[]=(translated.data??[]).map(row=>({
    id:row.id,work:row.contribution_id,language:row.language,title:row.title,
    summary:row.summary,body:row.body,source:row.source==='human'?'human':'machine',
    created:row.created_at,updated:row.created_at,
  }));
  return {translations,attachments:attached.data??[]};
}

export async function publicSupabaseTextAttachment(workId:string,id:string) {
  const api=publicApi();
  if(!api)return null;
  const {data,error}=await api.from('ghost_contribution_text_attachments').select('filename,content')
    .eq('contribution_id',workId).eq('id',id).maybeSingle();
  if(error?.code==='22P02'||error?.code==='PGRST205')return null;
  if(error)throw error;
  return data;
}

export async function publicSupabaseProjects() {
  const api=publicApi();
  if(!api)return [];
  const {data,error}=await api.from('ghost_projects')
    .select('id,title,summary,status,recruiting')
    .eq('visibility','public').neq('status','archived')
    .order('created_at',{ascending:false}).limit(100);
  if(error?.code==='PGRST205')return [];
  if(error)throw error;
  if(!data.length)return [];
  const {data:roles,error:roleError}=await api.from('ghost_project_roles')
    .select('id,project_id,title').in('project_id',data.map(project=>project.id)).order('title');
  if(roleError&&roleError.code!=='PGRST205')throw roleError;
  return data.map(project=>({...project,roles:(roles??[]).filter(role=>role.project_id===project.id)}));
}
