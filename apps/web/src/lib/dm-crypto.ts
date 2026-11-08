// LGN DM v1 uses the browser's Web Crypto implementation. Private keys never
// leave IndexedDB. The safety code binds both profile IDs to their public keys.
export type DmIdentity={privateKey:CryptoKey;publicKey:string};
export type DmPeer={profileId:string;publicKey:string};

const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});
const domain='LGN-DM-v1';
const messageLimit=4000;

function encode(bytes:Uint8Array){
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}

function decode(value:string){
  if(!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('Invalid encrypted data.');
  const base64=value.replaceAll('-','+').replaceAll('_','/');
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length/4)*4,'=')),character=>character.charCodeAt(0));
}

export async function generateDmIdentity():Promise<DmIdentity>{
  const keys=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
  const publicKey=encode(new Uint8Array(await crypto.subtle.exportKey('raw',keys.publicKey)));
  return {privateKey:keys.privateKey,publicKey};
}

export async function createDmCipher(identity:DmIdentity,selfId:string,peer:DmPeer){
  if(selfId===peer.profileId||identity.privateKey.extractable)throw new Error('Invalid messaging identity.');
  const publicKey=await crypto.subtle.importKey('raw',decode(peer.publicKey),
    {name:'ECDH',namedCurve:'P-256'},false,[]);
  const identities=[{profileId:selfId,publicKey:identity.publicKey},peer]
    .sort((a,b)=>a.profileId<b.profileId?-1:1)
    .map(item=>[item.profileId,item.publicKey]);
  const context=encoder.encode(JSON.stringify([domain,identities]));
  const bits=await crypto.subtle.deriveBits({name:'ECDH',public:publicKey},identity.privateKey,256);
  const material=await crypto.subtle.importKey('raw',bits,'HKDF',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({
    name:'HKDF',hash:'SHA-256',salt:encoder.encode(domain),info:context,
  },material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',context));
  const safetyCode=Array.from(digest,byte=>byte.toString(16).padStart(2,'0')).join('');
  function params(iv:Uint8Array<ArrayBuffer>,sender:string,recipient:string){
    return {name:'AES-GCM',iv,additionalData:encoder.encode(JSON.stringify([domain,sender,recipient])),tagLength:128};
  }

  return {
    safetyCode,
    async encrypt(body:string){
      if(!body.trim()||body.length>messageLimit)throw new Error('Enter a message of 1 to 4000 characters.');
      const iv=crypto.getRandomValues(new Uint8Array(12));
      const encrypted=await crypto.subtle.encrypt(params(iv,selfId,peer.profileId),key,encoder.encode(body));
      return `v1.${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
    },
    async decrypt(envelope:string,sender:string){
      if(sender!==selfId&&sender!==peer.profileId)throw new Error('Unknown message sender.');
      if(!/^v1[.][A-Za-z0-9_-]{16}[.][A-Za-z0-9_-]{23,}$/.test(envelope)||envelope.length>22000)
        throw new Error('Invalid encrypted message.');
      const [,iv,ciphertext]=envelope.split('.');
      const recipient=sender===selfId?peer.profileId:selfId;
      const plaintext=await crypto.subtle.decrypt(params(decode(iv),sender,recipient),key,decode(ciphertext));
      return decoder.decode(plaintext);
    },
  };
}

function openVault():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('lgn-private-messaging',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('keys');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Close other LGN tabs and try again.'));
  });
}

async function vault<T>(mode:IDBTransactionMode,operation:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  const db=await openVault();
  try{
    return await new Promise((resolve,reject)=>{
      const transaction=db.transaction('keys',mode);
      const request=operation(transaction.objectStore('keys'));
      transaction.oncomplete=()=>resolve(request.result);
      transaction.onabort=()=>reject(request.error??transaction.error);
    });
  }finally{db.close();}
}

export function readDmIdentity(profileId:string):Promise<DmIdentity|undefined>{
  return vault('readonly',store=>store.get('identity:'+profileId));
}

export async function getOrCreateDmIdentity(profileId:string):Promise<DmIdentity>{
  const existing=await readDmIdentity(profileId);
  if(existing)return existing;
  const identity=await generateDmIdentity();
  try{
    await vault('readwrite',store=>store.add(identity,'identity:'+profileId));
    return identity;
  }catch(error){
    const winner=await readDmIdentity(profileId);
    if(winner)return winner;
    throw error;
  }
}

export function readDmVerification(selfId:string,peerId:string):Promise<string|undefined>{
  return vault('readonly',store=>store.get(`verified:${selfId}:${peerId}`));
}

export async function verifyDmSafetyCode(selfId:string,peerId:string,code:string){
  const key=`verified:${selfId}:${peerId}`;
  try{await vault('readwrite',store=>store.add(code,key));}
  catch(error){if(await readDmVerification(selfId,peerId)!==code)throw error;}
}
