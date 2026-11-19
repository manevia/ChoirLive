import SessionManager from './SessionManager'
import {readInvitation} from './sessionInvitations'
import MicrophoneTest from './MicrophoneTest'
import ChoirCoreRoom from './ChoirCoreRoom'
import ChoirCoreOutputDesk from './ChoirCoreOutputDesk'
import {useEffect,useState} from 'react'
import './App.css'
import HeroSection from './sections/HeroSection'
import ArchitectureSection from './sections/ArchitectureSection'
import FeaturesSection from './sections/FeaturesSection'
import TechSpecsSection from './sections/TechSpecsSection'
import DataFlowSection from './sections/DataFlowSection'
import FooterSection from './sections/FooterSection'
import Navigation from './components/Navigation'
import ScrollProgress from './components/ScrollProgress'
import './ChoirRoom.css'

const titles={singer:'Singer rehearsal',conductor:'Conductor rehearsal',engineer:'Sound Engineer desk'};
function App(){
 const [invitation]=useState(readInvitation);
 const [view]=useState(()=>new URLSearchParams(window.location.search).get('view')||'home');
 const [invalidInvitation]=useState(()=>window.location.hash.includes('invite=')&&!readInvitation());
 useEffect(()=>{
  if(invitation){const url=new URL(window.location.href);url.searchParams.set('view',invitation.role);url.hash='';window.history.replaceState(null,'',url.pathname+url.search);}
 },[invitation]);
 const roleView=invitation||invalidInvitation||['singer','conductor','engineer'].includes(view);
 if(roleView){
  return <main className="choir-role-page min-h-screen bg-slate-900 text-slate-100">
   <header className="choir-page-header"><img src={import.meta.env.BASE_URL+'choir-mark.svg'} alt="ChoirLive"/><span>ChoirLive · {invitation?titles[invitation.role]:'Private rehearsal invitation'}</span></header>
   {!invitation?<section className="choir-app"><div className="choir-shell"><h2>Open your original invitation link</h2><p className="choir-hint">This page requires a current role-specific link. Return to the invitation sent by your conductor.</p></div></section>:<>
    {invitation.role==='engineer'?<ChoirCoreOutputDesk invitation={invitation}/>:<ChoirCoreRoom invitation={invitation}/>}
   </>}
  </main>
 }
 if(view==='workspace'||view==='audio')return <main className="min-h-screen bg-slate-900 text-slate-100">
  <header className="choir-page-header"><a href={import.meta.env.BASE_URL}><img src={import.meta.env.BASE_URL+'choir-mark.svg'} alt="ChoirLive"/></a><span>{view==='workspace'?'ChoirLive · Workspace management':'ChoirLive · Device check'}</span><a href={import.meta.env.BASE_URL}>Home</a></header>
  {view==='workspace'?<SessionManager/>:<MicrophoneTest/>}
 </main>
 return <div className="min-h-screen bg-slate-900 text-slate-100"><ScrollProgress/><Navigation/><main><HeroSection/><ArchitectureSection/><FeaturesSection/><TechSpecsSection/><DataFlowSection/><FooterSection/></main></div>
}
export default App
