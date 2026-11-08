import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { validNewGhostHandle } from '@/lib/ghost-handle';

export type GhostIdentity = {
  id: string;
  handle: string;
  display_name: string;
  pronouns: string;
  bio: string;
  specialties: string;
  developing_specialties: string;
  portfolio: string;
  location_disclosure: string;
  location_country: string;
  created_at: string;
  updated_at: string;
  skills: string;
  tools: string;
  platform: string;
  industry: string;
  languages: string;
  language: string;
  available_for_work: boolean;
  open_to_collaboration: boolean;
  open_to_research: boolean;
  open_to_mentorship: boolean;
  open_to_speaking: boolean;
  collaboration_interests: string;
  external_links: string;
  avatar_template: string;
  featured_work: string;
};

const FIELDS = 'id,handle,display_name,pronouns,bio,specialties,developing_specialties,portfolio,location_disclosure,location_country,skills,tools,platform,industry,languages,language,available_for_work,open_to_collaboration,open_to_research,open_to_mentorship,open_to_speaking,collaboration_interests,external_links,avatar_template,featured_work,created_at,updated_at' as const;
// The new helper enforces paired slashes and the actual character limit.
export { HANDLE_PATTERN } from '@/lib/ghost-handle';

export function signupDetails(user: User) {
  const data = user.user_metadata ?? {};
  const locationDisclosure = ['undisclosed','remote','country'].includes(data.lgn_location_disclosure)
    ? data.lgn_location_disclosure as string : 'undisclosed';
  return {
    handle: typeof data.lgn_handle === 'string' ? data.lgn_handle.trim() : '',
    specialties: typeof data.lgn_specialties === 'string' ? data.lgn_specialties.slice(0,250) : '',
    developing_specialties: typeof data.lgn_developing_specialties === 'string' ? data.lgn_developing_specialties.slice(0,250) : '',
    portfolio: typeof data.lgn_portfolio === 'string' ? data.lgn_portfolio.slice(0,2048) : '',
    location_disclosure: locationDisclosure,
    location_country: typeof data.lgn_location_country === 'string' ? data.lgn_location_country.slice(0,100) : '',
  };
}

export async function findMyGhostProfile(): Promise<GhostIdentity | null> {
  const api = supabaseBrowser();
  // Link rows are owner-scoped by RLS. Never select owner_id from public APIs.
  const { data: link, error: linkError } = await api.from('ghost_profile_links').select('profile_id').maybeSingle();
  if (linkError) throw linkError;
  if (!link) return null;
  const { data, error } = await api.from('ghost_profiles').select(FIELDS).eq('id', link.profile_id).maybeSingle();
  if (error) throw error;
  return data as GhostIdentity | null;
}

export async function claimGhostProfile(user: User, handle: string, fields: {
  specialties?: string;
  developing_specialties?: string;
  portfolio?: string;
  location_disclosure?: string;
  location_country?: string;
} = {}): Promise<GhostIdentity> {
  if (!user.email_confirmed_at) throw new Error('Verify your email before claiming a Ghost handle.');
  if (!validNewGhostHandle(handle)) throw new Error('Use 3–40 characters starting with a letter or digit. Punctuation includes . _ - ! @ # $ & + ~ and // (not single slashes or ///).');
  const previous = await findMyGhostProfile();
  if (previous) return previous;
  const disclosure = ['undisclosed','remote','country'].includes(fields.location_disclosure || '')
    ? fields.location_disclosure! : 'undisclosed';
  const { error } = await supabaseBrowser().from('ghost_profiles').insert({
    owner_id: user.id,
    handle,
    specialties: (fields.specialties || '').slice(0,250),
    developing_specialties: (fields.developing_specialties || '').slice(0,250),
    portfolio: (fields.portfolio || '').slice(0,2048),
    location_disclosure: disclosure,
    location_country: disclosure === 'country' ? (fields.location_country || '').slice(0,100) : '',
  });
  if (error) {
    if (error.code === '23505') throw new Error('That handle is reserved, or you already have a profile. Choose another.');
    throw error;
  }
  const result = await findMyGhostProfile();
  if (!result) throw new Error('Profile created, but it could not be loaded. Refresh the dashboard.');
  return result;
}
