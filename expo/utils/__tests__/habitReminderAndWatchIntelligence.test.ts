import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Task } from '../../types/task';
import type { Habit, Show } from '../../types/habit';
import { buildHabitReminderPlan, collectHabitReminderSources, proposedReminderMinutes, localDateKey } from '../habitReminderPlanner';
import { selectContinueWatching, rankWatchlist } from '../watchQueueIntelligence';

const day=new Date(2026,9,20,6,0);
const ymd=localDateKey(day);
const task=(patch:Partial<Task>={}):Task=>({
  id:'habit-1',title:'Evening walk',description:'',priority:'medium',
  status:'todo',category:'health',tags:[],subTasks:[],reminders:[],attachments:[],
  createdAt:day.toISOString(),updatedAt:day.toISOString(),completionLogs:[],
  progress:0,isRecurring:false,isHabit:true,
  habitFrequency:{days:[2]},
  habitEngine:{reminderMode:'fixed',reminderTime:'18:30',reminderFollowUp:true,windowEnd:'21:00'},
  ...patch,
});
const show=(id:number,title:string,status:Show['status']='Plan to Watch',type:Show['type']='Movie'):Show=>({
  id:String(id),title,type,status,platform:'Other',mediaType:type==='Movie'?'movie':'tv',
  tmdbId:id,createdAt:'2026-10-19T10:00:00Z',updatedAt:'2026-10-19T10:00:00Z',
});
describe('habit notification engine',()=>{
  it('honours exact user preferred times and one follow-up',()=>{
    const sources=collectHabitReminderSources([task()],[]);
    const reminders=buildHabitReminderPlan({userId:'test-user',habits:sources,now:day,quiet:{enabled:true,start:'22:30',end:'07:00'},daysAhead:1});
    assert.deepEqual(reminders.map(r=>r.at.getHours()+':'+String(r.at.getMinutes()).padStart(2,'0')),['18:30','20:00']);
    assert.deepEqual(reminders.map(r=>r.kind),['primary','followup']);
  });
  it('never reminds about a completed, skipped or disabled habit',()=>{
    const completed=task({habitCompletions:{[ymd]:true}});
    assert.equal(buildHabitReminderPlan({userId:'u',habits:collectHabitReminderSources([completed],[]),now:day,quiet:{},daysAhead:1}).length,0);
    const skipped=buildHabitReminderPlan({userId:'u',habits:collectHabitReminderSources([task()],[]),now:day,quiet:{},daysAhead:1,
      suppressedDays:{[`task:habit-1:${ymd}`]:'skip'}});
    assert.equal(skipped.length,0);
    assert.equal(buildHabitReminderPlan({userId:'u',habits:collectHabitReminderSources([task({habitEngine:{reminderMode:'off'}})],[]),now:day,quiet:{},daysAhead:1}).length,0);
  });
  it('defers to quiet hours rather than sending a forbidden alert',()=>{
    const evening=task({habitEngine:{reminderMode:'fixed',reminderTime:'23:30',reminderFollowUp:true}});
    const r=buildHabitReminderPlan({userId:'u',habits:collectHabitReminderSources([evening],[]),now:day,quiet:{enabled:true,start:'22:30',end:'07:00'},daysAhead:1});
    assert.deepEqual(r,[]);
  });
  it('uses past completion patterns only after sufficient observations',()=>{
    const baseline=collectHabitReminderSources([task({habitEngine:{reminderMode:'smart'},completionLogs:[]})],[])[0];
    assert.equal(proposedReminderMinutes(baseline),18*60);
    assert.equal(proposedReminderMinutes({...baseline,completionHours:[20,20,20,20,18]}),20*60);
  });
  it('snoozes once and never keeps the original trigger too',()=>{
    const until=new Date(2026,9,20,19,5);
    const scheduled=buildHabitReminderPlan({userId:'u',habits:collectHabitReminderSources([task()],[]),now:day,quiet:{},daysAhead:1,
      suppressedDays:{[`task:habit-1:${ymd}`]:until.toISOString()}});
    assert.equal(scheduled.length,1);
    assert.equal(scheduled[0].kind,'snooze');
    assert.equal(scheduled[0].at.getHours(),19);
  });
  it('caps reminder volume while keeping preferred first reminders ahead of follow-ups',()=>{
    const many=Array.from({length:10},(_,i)=>task({id:`habit-${i}`,title:`Habit ${i}`}));
    const items=buildHabitReminderPlan({userId:'u',habits:collectHabitReminderSources(many,[]),now:day,quiet:{},daysAhead:1});
    assert.ok(items.length<=6);
    assert.ok(items.every(item=>item.kind==='primary'));
  });
  it('does not duplicate the same legacy and task habit',()=>{
    const legacy:Habit={id:'legacy-1',name:'Evening walk',color:'#ccc',frequency:{type:'specific_days',days:[0,1,2,3,4,5,6]},completions:{},completionLogs:[],createdAt:day.toISOString()};
    assert.equal(collectHabitReminderSources([task()],[legacy]).length,1);
  });
});
describe('intelligent watch rails',()=>{
  it('deduplicates a linked title and manual tracking by TMDB ID',()=>{
    const items=selectContinueWatching({
      providerRows:[{id:'row1',tmdbId:100,mediaType:'tv',showTitle:'Silo',progress:0.35}],
      localShows:[show(100,'Silo','Watching','Series')],
      dismissed:[],
    });
    assert.equal(items.length,1);
    assert.equal(items[0].kind,'younify');
    assert.equal(items[0].progressVerified,true);
  });
  it('excludes provider items with no verified progress and completed films',()=>{
    const items=selectContinueWatching({providerRows:[
      {tmdbId:11,mediaType:'movie',title:'Comedy Special'},
      {tmdbId:12,mediaType:'movie',title:'Film',progress:0.99},
      {tmdbId:13,mediaType:'movie',title:'Film in progress',progress:0.35},
    ],localShows:[],dismissed:[]});
    assert.equal(items.length,1);
  });
  it('does not pretend that a manually saved Watching status proves playback',()=>{
    const list=selectContinueWatching({providerRows:[],localShows:[show(25,'Lions','Watching','Series')],dismissed:[]});
    assert.equal(list[0].progressVerified,false);
  });
  it('can rank saved titles by real genre overlap with currently watched titles',()=>{
    const a=rankWatchlist({shows:[show(70,'Unmatched'),show(80,'Related')],watching:[],
      offers:{'movie:70':{providerNames:[],linkedProviderNames:[],genreIds:[12]},
        'movie:80':{providerNames:[],linkedProviderNames:[],genreIds:[878]}},
      preferredGenreIds:[878],now:day});
    assert.equal(a[0].show.title,'Related');
    assert.match(a[0].explanation,/matches your genres/);
  });
  it('ranks verified streaming offers over unverified titles without implying autoplay',()=>{
    const result=rankWatchlist({shows:[show(1,'Unverified'),show(2,'Verified'),show(3,'Future')],watching:[],
      offers:{'movie:2':{providerNames:['Netflix'],linkedProviderNames:['Netflix'],runtime:90},
        'movie:3':{providerNames:[],linkedProviderNames:[],releaseDate:'2027-01-01'}},now:day});
    assert.deepEqual(result.map(x=>x.show.title),['Verified','Unverified','Future']);
    assert.equal(result[0].available,true);
    assert.match(result[2].explanation,/Coming soon/);
  });
});
