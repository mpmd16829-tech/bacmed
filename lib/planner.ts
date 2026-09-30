import type { Subject } from './bac-data'
import type { Locale } from './i18n'
import { pick } from './i18n'
export type StudySession={id:string;day:string;subjectId:string;subject:string;title:string;duration:number;type:'course'|'exercise';done:boolean}
const days=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
export function generatePlan(subjects:Subject[],minutes:number,completed:string[]=[],locale:Locale='fr'):StudySession[]{if(!subjects.length)return[];return days.flatMap((day,d)=>Array.from({length:Math.max(1,Math.min(3,Math.floor(minutes/30)))},(_,slot)=>{const subject=subjects[(d+slot)%subjects.length];const chapter=subject.chapters[(d+slot)%subject.chapters.length];const type=(d+slot)%2===0?'course':'exercise';const id=`${day}-${slot}-${subject.id}-${chapter.id}`;return{id,day,subjectId:subject.id,subject:pick(subject.name,locale),title:pick(chapter.title,locale),duration:Math.floor(minutes/Math.max(1,Math.min(3,Math.floor(minutes/30)))),type,done:completed.includes(id)}}))}
