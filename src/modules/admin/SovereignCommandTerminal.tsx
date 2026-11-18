import { parseCommand, commandHelp } from '../../terminal/parser';
import React, { useRef, useState } from 'react';

type Line = { kind: 'command' | 'output' | 'error'; text: string };
const initial: Line[] = [{kind:'output',text:'PORTAL-OS1 command interface initialized.'},{kind:'output',text:'Type “help” to explore available commands.'}];
export default function SovereignCommandTerminal() {
  const [lines,setLines]=useState<Line[]>(initial); const [input,setInput]=useState(''); const [busy,setBusy]=useState(false); const inputRef=useRef<HTMLInputElement>(null);
  const run = async (event:React.FormEvent) => {
    event.preventDefault(); const command=input.trim(); if(!command || busy) return; setInput('');
    if(command.toLowerCase()==='clear'){setLines([]);return;}
    setLines(previous=>[...previous,{kind:'command',text:command}]);
    const parsed=parseCommand(command);
    if(parsed.kind==='help') { setLines(previous=>[...previous,{kind:'output',text:commandHelp}]); return; }

    if(parsed.kind!=='request') { setLines(previous=>[...previous,{kind:'error',text:'Unknown command. Type “help” for available commands.'}]); return; }
    setBusy(true);
    try { const response=await fetch(parsed.path, {headers:{Accept:'application/json'}}); const contentType=response.headers.get('content-type') || ''; if(!contentType.includes('application/json')) throw new Error(`Worker returned a non-JSON response (HTTP ${response.status}).`); const data=await response.json(); setLines(previous=>[...previous,{kind:response.ok?'output':'error',text:`HTTP ${response.status} ${JSON.stringify(data)}`}]); }
    catch(error) { setLines(previous=>[...previous,{kind:'error',text:`Worker request failed: ${error instanceof Error ? error.message : 'Unknown error'}`}]); }
    finally {setBusy(false); inputRef.current?.focus();}
  };
  return <div className="terminal-body"><div className="terminal-output" role="log" aria-live="polite">{lines.map((line,i)=><div className={`terminal-line ${line.kind}`} key={i}>{line.kind==='command'&&<span>portal@sovereign:~$ </span>}{line.text}</div>)}</div><form className="terminal-input" onSubmit={run}><label htmlFor="command-input">portal@sovereign:~$</label><input id="command-input" ref={inputRef} value={input} onChange={event=>setInput(event.target.value)} placeholder={busy?'Running command…':'Enter a command...'} disabled={busy} autoComplete="off" spellCheck={false}/><button type="submit" disabled={busy}>RUN ↗</button></form><div className="terminal-hint"><span>TRY: <button onClick={()=>setInput('help')}>help</button> <button onClick={()=>setInput('status')}>status</button> <button onClick={()=>setInput('d1 art list')}>d1 art list</button></span><span>READ-ONLY COMMANDS</span></div></div>;
}
