import webpush from 'npm:web-push@3.6.7';

type Keys={public_key:string;private_key:string};
type Job={job_id:string;notification_id:string;lease_id:string;endpoint:string;p256dh:string;auth:string};
const projectUrl=Deno.env.get('SUPABASE_URL')??'';
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';

async function rpc<T>(name:string,args:Record<string,string>={}):Promise<T>{
  const response=await fetch(projectUrl+'/rest/v1/rpc/'+name,{
    method:'POST',
    headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json'},
    body:JSON.stringify(args),
  });
  if(!response.ok)throw new Error('Push database operation failed');
  const body=await response.text();
  return body ? JSON.parse(body) as T : undefined as T;
}

function supportedEndpoint(value:string){
  try{
    const url=new URL(value);
    const host=url.hostname;
    return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.hash&&(
      host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||
      host==='web.push.apple.com'||host.endsWith('.web.push.apple.com')||host.endsWith('.notify.windows.com')
    );
  }catch{return false;}
}

async function send(job:Job,keys:Keys){
  let result='delivered';
  if(!supportedEndpoint(job.endpoint))result='expired';
  else{
    try{
      await webpush.sendNotification({endpoint:job.endpoint,keys:{p256dh:job.p256dh,auth:job.auth}},
        JSON.stringify({id:job.notification_id}),{
          TTL:3600,timeout:10000,
          vapidDetails:{subject:projectUrl,publicKey:keys.public_key,privateKey:keys.private_key},
        });
    }catch(error){
      const status=typeof error==='object'&&error!==null&&'statusCode' in error?Number(error.statusCode):0;
      result=status===404||status===410?'expired':!status||status===429||status>=500?'retry':'failed';
    }
  }
  await rpc('finish_ghost_push_job',{p_job_id:job.job_id,p_lease_id:job.lease_id,p_result:result});
  return result;
}

Deno.serve(async request=>{
  if(request.method!=='POST')return new Response(null,{status:405});
  const token=request.headers.get('x-lgn-push-token')??'';
  if(!/^[a-f0-9]{64}$/.test(token))return new Response(null,{status:401});
  if(!projectUrl||!serviceKey)return new Response(null,{status:503});
  try{
    const candidate=webpush.generateVAPIDKeys();
    const keys=await rpc<Keys|null>('ghost_push_worker_context',{
      p_token:token,p_public:candidate.publicKey,p_private:candidate.privateKey,
    });
    if(!keys)return new Response(null,{status:401});
    const jobs=await rpc<Job[]>('claim_ghost_push_jobs');
    const results=await Promise.all(jobs.map(job=>send(job,keys)));
    return Response.json({claimed:jobs.length,delivered:results.filter(result=>result==='delivered').length});
  }catch{
    return Response.json({error:'Push dispatch failed'},{status:503});
  }
});
