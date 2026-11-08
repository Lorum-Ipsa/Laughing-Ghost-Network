type Options={sourceLanguage:string;targetLanguage:string};
type BrowserTranslator={translate(text:string):Promise<string>;destroy():void};
type TranslatorApi={
  availability(options:Options):Promise<string>;
  create(options:Options):Promise<BrowserTranslator>;
};

function browserApi():TranslatorApi|undefined{
  return (globalThis as typeof globalThis & {Translator?:TranslatorApi}).Translator;
}

export function hasBrowserTranslator(){return !!browserApi();}

export async function withTranslator<T>(sourceLanguage:string,targetLanguage:string,
  action:(translate:(text:string)=>Promise<string>)=>Promise<T>):Promise<T>{
  const api=browserApi();
  if(!api)throw new Error('Automatic translation is unavailable in this browser.');
  const options={sourceLanguage,targetLanguage};
  if(await api.availability(options)==='unavailable')throw new Error('This language pair is unavailable in your browser.');
  const translator=await api.create(options);
  try{return await action(text=>translator.translate(text));}
  finally{translator.destroy();}
}

// Translate prose in bounded chunks. Preserve whitespace and explicitly marked
// fenced/inline code, plus URLs and common security identifiers, byte for byte.
export async function translateProse(text:string,translate:(part:string)=>Promise<string>){
  const protectedText=/(^[ \t]{0,3}(?:```|~~~)[^\n]*\n[\s\S]*?(?:^[ \t]{0,3}(?:```|~~~)[^\n]*(?:\n|$)|(?![\s\S]))|^(?: {4}|\t)[^\n]+|`[^`\n]+`|https?:\/\/[^\s]+|\b(?:CVE-\d{4}-\d+|CWE-\d+|T\d{4}(?:\.\d{3})?)\b)/gim;
  let output='',offset=0;
  async function prose(value:string){
    const chunks=value.split(/(\r\n|[\n\r\u2028\u2029])/u)
      .flatMap(line=>line.match(/[\s\S]{1,1500}/gu)??[]);
    for(const chunk of chunks){
      const leading=chunk.match(/^\s*/)?.[0]??'';
      const trimmed=chunk.trim();
      if(!trimmed){output+=chunk;continue;}
      const trailing=chunk.match(/\s*$/)?.[0]??'';
      output+=leading+await translate(trimmed)+trailing;
    }
  }
  for(const match of text.matchAll(protectedText)){
    const start=match.index??0;
    await prose(text.slice(offset,start));
    output+=match[0];
    offset=start+match[0].length;
  }
  await prose(text.slice(offset));
  return output;
}
