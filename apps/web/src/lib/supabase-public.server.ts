import { createClient } from '@supabase/supabase-js';
import { supabasePublicConfig } from '@/lib/supabase-browser';
import type { Database } from '@/lib/supabase.database.types';
import type { DirectoryGhost, GhostProfile, WorkKind } from '@/lib/network';
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
