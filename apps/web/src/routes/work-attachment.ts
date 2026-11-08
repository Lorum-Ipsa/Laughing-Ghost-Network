import type { Route } from './+types/work-attachment';
import { publicSupabaseTextAttachment } from '@/lib/supabase-public.server';

export async function loader({params}:Route.LoaderArgs) {
  const file=await publicSupabaseTextAttachment(params.workId,params.attachmentId);
  if(!file)throw new Response('Attachment not found',{status:404});
  return new Response(file.content,{headers:{
    'Content-Type':'text/plain; charset=utf-8',
    'Content-Disposition':`attachment; filename="${file.filename}.txt"`,
    'X-Content-Type-Options':'nosniff',
    'Cache-Control':'no-store',
  }});
}
