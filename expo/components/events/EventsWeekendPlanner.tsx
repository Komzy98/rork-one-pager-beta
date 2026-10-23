import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { CalendarDays, ChevronRight, ImageOff, RefreshCw, Users, WandSparkles } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import type { LocalEvent } from '@/types/events';
import type { EventsPalette } from '@/utils/eventsPalette';
import { resolveEventPosterUrl } from '@/utils/eventPosterImage';
import { registerDiscoveryEvents } from '@/utils/eventCatalog';
import { getRealTravelLeg, findEventDeparture, validCoordinates, type Coordinates, type TravelLeg, type TravelMode } from '@/utils/eventTravelRouting';
import {
  alternativesForSlot, buildWeekendItinerary, fridayKey, itineraryShareText,
  ticketSubtotal, weekendCandidateEvents, type PlannedWeekendEvent, type PlannerOptions,
  type WeekendDay, type WeekendMood, type WeekendSlot,
} from '@/utils/weekendItinerary';

type DayChoice = WeekendDay | 'any';
type Budget = 'any' | '20' | '50' | '100';
type Radius = 25 | 50 | 75;
interface Props {
  visible: boolean;
  events: LocalEvent[];
  palette: EventsPalette;
  onClose: () => void;
  onSave: (event: LocalEvent) => Promise<unknown> | void;
  onOpenEvent: (event: LocalEvent) => void;
  onInviteEvent?: (event: LocalEvent) => void;
  isSaved: (id: string) => boolean;
  userCoords: Coordinates | null;
  userId?: string | null;
}
const LABELS: Record<WeekendSlot, string> = {
  'friday-evening': 'Friday evening', 'saturday-afternoon': 'Saturday afternoon',
  'saturday-evening': 'Saturday evening', 'sunday-daytime': 'Sunday daytime',
};
const DAY: Record<WeekendSlot, WeekendDay> = {
  'friday-evening': 'friday', 'saturday-afternoon': 'saturday',
  'saturday-evening': 'saturday', 'sunday-daytime': 'sunday',
};
const SLOTS: WeekendSlot[] = ['friday-evening','saturday-afternoon','saturday-evening','sunday-daytime'];
const MOODS: {value: WeekendMood;label:string}[] = [
  {value:'any',label:'Surprise me'}, {value:'social',label:'Social'},
  {value:'date',label:'Date night'}, {value:'music',label:'Live music'},
  {value:'food',label:'Food & drink'}, {value:'relaxed',label:'Relaxing'},
  {value:'active',label:'Active'},
];
const MODES: {value: TravelMode; label: string}[] = [
  {value:'driving',label:'Drive'}, {value:'transit',label:'Public transport'},
  {value:'walking',label:'Walk'}, {value:'cycling',label:'Cycle'},
];
const pounds = (n: number) => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:0,maximumFractionDigits:2}).format(n);

function Chips<T extends string | number>({
  value, choices, onChange, palette,
}: {
  value: T; choices: ReadonlyArray<{value:T;label:string}>;
  onChange:(v:T)=>void; palette:EventsPalette;
}) {
  return <View style={{flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:8, marginBottom:16}}>
    {choices.map(c=><TouchableOpacity key={String(c.value)} accessibilityRole="button"
      accessibilityState={{selected:c.value===value}}
      onPress={()=>onChange(c.value)}
      style={{borderRadius:18, paddingHorizontal:13, paddingVertical:10, borderWidth:1,
        borderColor:value===c.value?palette.primary:palette.border,
        backgroundColor:value===c.value?palette.primaryLight:palette.card}}>
      <Text style={{fontWeight:'600',color:value===c.value?palette.primary:palette.text}}>{c.label}</Text>
    </TouchableOpacity>)}
  </View>;
}

function Poster({event,palette}:{event:LocalEvent;palette:EventsPalette}) {
  const url=resolveEventPosterUrl(event.image);
  return url ? <Image source={{uri:url}} cachePolicy="memory-disk" transition={180}
      contentFit="cover" accessibilityLabel={event.title+' event poster'}
      style={{width:99,height:132,borderRadius:12,backgroundColor:palette.surfaceLight}}/>
    : <View style={{width:99,height:132,borderRadius:12,backgroundColor:palette.surfaceLight,
      alignItems:'center',justifyContent:'center',gap:6,borderWidth:1,borderColor:palette.border}}>
      <ImageOff size={21} color={palette.textSecondary}/>
      <Text style={{fontSize:11,color:palette.textSecondary}}>No poster</Text>
    </View>;
}

function EventCard({
  event,palette,leg,mode,onOpen,onSave,isSaved,invite,
}:{
  event:LocalEvent;palette:EventsPalette;leg:TravelLeg|null|undefined;mode:TravelMode;
  onOpen:()=>void;onSave:()=>void;isSaved:boolean;invite?:()=>void;
}) {
  const destination=event.latitude+','+event.longitude;
  const directions=()=>{
    const url='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination)+
      '&travelmode='+(mode==='cycling'?'bicycling':mode);
    void Linking.openURL(url).catch(()=>Alert.alert('Directions unavailable','Please open your maps app.'));
  };
  return <View style={{borderRadius:18,borderWidth:1,borderColor:palette.border,padding:13,
    backgroundColor:palette.card,marginTop:10}}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={'View '+event.title}
      onPress={onOpen} style={{flexDirection:'row',gap:12,alignItems:'flex-start'}}>
      <View style={{flex:1,minWidth:0}}>
        <Text numberOfLines={3} style={{color:palette.text,fontSize:16,fontWeight:'700'}}>{event.title}</Text>
        <Text style={{color:palette.textSecondary,marginTop:6}} numberOfLines={2}>
          {event.date} · {event.time}
        </Text>
        <Text style={{color:palette.textSecondary,marginTop:3}} numberOfLines={2}>{event.venue}</Text>
        <Text style={{color:palette.textSecondary,marginTop:4}} numberOfLines={2}>
          {event.price || 'Price not provided'} · {event.location}
        </Text>
        <Text style={{fontSize:12,marginTop:9,fontWeight:'600',color:palette.primary}}>View details ›</Text>
      </View>
      <Poster event={event} palette={palette}/>
    </TouchableOpacity>
    <Text style={{color:palette.textSecondary,fontSize:12,marginTop:10}}>
      {leg
        ? mode+' · '+leg.minutes+' min verified route · depart by '+
          (findEventDeparture(event,leg)?.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})??'check time')
        : 'Travel time unavailable — check live directions'}
    </Text>
    <View style={{flexDirection:'row',gap:14,marginTop:12,alignItems:'center',flexWrap:'wrap'}}>
      <TouchableOpacity accessibilityRole="button" onPress={directions}>
        <Text style={{color:palette.primary,fontWeight:'600'}}>Directions</Text>
      </TouchableOpacity>
      {invite ? <TouchableOpacity accessibilityRole="button" onPress={invite}>
        <Text style={{color:palette.primary,fontWeight:'600'}}>Invite friends</Text>
      </TouchableOpacity> : null}
      <TouchableOpacity accessibilityRole="button" disabled={isSaved} onPress={onSave}
        style={{backgroundColor:isSaved?palette.primaryLight:palette.primary,
          paddingHorizontal:13,paddingVertical:9,borderRadius:11,marginLeft:'auto'}}>
        <Text style={{color:isSaved?palette.primary:'#FFF',fontWeight:'700'}}>{isSaved?'Saved':'Save'}</Text>
      </TouchableOpacity>
    </View>
  </View>;
}

export function EventsWeekendPlanner({
  visible,events,palette,onClose,onSave,onOpenEvent,onInviteEvent,isSaved,userCoords,userId,
}:Props) {
  const [day,setDay]=useState<DayChoice>('any');
  const [mood,setMood]=useState<WeekendMood>('any');
  const [budget,setBudget]=useState<Budget>('any');
  const [mode,setMode]=useState<TravelMode>('driving');
  const [radius,setRadius]=useState<Radius>(50);
  const [travelSpend,setTravelSpend]=useState(5);
  const [routeLegs,setRouteLegs]=useState<Record<string,TravelLeg|null>>({});
  const [journeys,setJourneys]=useState<Record<string,number|null>>({});
  const [overrides,setOverrides]=useState<Partial<Record<WeekendSlot,string>>>({});
  const [expandedSwap,setExpandedSwap]=useState<WeekendSlot|null>(null);
  const [savedPlan,setSavedPlan]=useState<PlannedWeekendEvent[]|null>(null);
  const [hydrated,setHydrated]=useState(false);
  const [busy,setBusy]=useState(false);
  const [saving,setSaving]=useState(false);
  const [showMore,setShowMore]=useState(false);
  const coordsOk=validCoordinates(userCoords);
  const key='onepager:weekend-itinerary:v2:'+(userId||'guest');
  const activeWeekend=fridayKey();
  const query=trpc.events.getNearby.useQuery({
    latitude:coordsOk?userCoords.latitude:0,longitude:coordsOk?userCoords.longitude:0,
    radiusMiles:radius,size:120,
  },{enabled:visible&&coordsOk,staleTime:5*60000,refetchOnWindowFocus:false,retry:1});

  const allEvents=useMemo(()=>{
    const uniq=new Map<string,LocalEvent>();
    for(const e of [...events,...(query.data?.events||[]),...(savedPlan?.map(x=>x.event)||[])]) {
      if(e.startIso) uniq.set(e.id,e);
    }
    return [...uniq.values()];
  },[events,query.data?.events,savedPlan]);
  useEffect(()=>{if(visible) registerDiscoveryEvents(allEvents);},[visible,allEvents]);

  useEffect(()=>{
    if(!visible)return;
    let active=true;
    setHydrated(false);
    void AsyncStorage.getItem(key).then(raw=>{
      if(!active)return;
      let parsed: {weekendKey?:string;items?:PlannedWeekendEvent[];
        day?:DayChoice;mood?:WeekendMood;budget?:Budget;radius?:Radius;
        travelSpend?:number;mode?:TravelMode}|null=null;
      try{parsed=raw?JSON.parse(raw):null;}catch{parsed=null;}
      if(parsed?.weekendKey===activeWeekend&&Array.isArray(parsed.items)){
        const valid=parsed.items.filter(x=>x&&x.event&&SLOTS.includes(x.slot));
        setSavedPlan(valid);
        setOverrides(Object.fromEntries(valid.map(x=>[x.slot,x.event.id])) as Partial<Record<WeekendSlot,string>>);
        if(['any','friday','saturday','sunday'].includes(parsed.day||''))setDay(parsed.day!);
        if(MOODS.some(x=>x.value===parsed.mood))setMood(parsed.mood!);
        if(['any','20','50','100'].includes(parsed.budget||''))setBudget(parsed.budget!);
        if([25,50,75].includes(parsed.radius||0))setRadius(parsed.radius!);
        if([0,5,10,20].includes(parsed.travelSpend??-1))setTravelSpend(parsed.travelSpend!);
        if(MODES.some(x=>x.value===parsed.mode))setMode(parsed.mode!);
      }else{setSavedPlan(null);setOverrides({});}
    }).catch(()=>setSavedPlan(null)).finally(()=>{if(active)setHydrated(true);});
    return()=>{active=false;};
  },[visible,key,activeWeekend]);
  const options=useMemo<PlannerOptions>(()=>({
    day,mood,maxTicketPrice:budget==='any'?null:Number(budget),journeyMinutes:journeys,
  }),[day,mood,budget,journeys]);
  const candidates=useMemo(()=>weekendCandidateEvents(allEvents,options),[allEvents,options]);
  const plan=useMemo(()=>buildWeekendItinerary(candidates,options,overrides),[candidates,options,overrides]);
  const planIds=plan.map(x=>x.event.id).join('|');
  useEffect(()=>{
    if(!visible||!coordsOk){setRouteLegs({});setJourneys({});return;}
    let cancelled=false;
    const eligible=candidates.slice(0,18);
    const requests:Promise<{key:string;leg:TravelLeg|null}>[]=[
      ...eligible.map(async e=>({
        key:e.id,leg:await getRealTravelLeg(userCoords,{latitude:e.latitude,longitude:e.longitude},mode),
      })),
    ];
    for(let i=1;i<plan.length;i++){
      const first=plan[i-1].event,last=plan[i].event;
      requests.push(getRealTravelLeg(
        {latitude:first.latitude,longitude:first.longitude},
        {latitude:last.latitude,longitude:last.longitude},mode,
      ).then(leg=>({key:first.id+'|'+last.id,leg})));
    }
    void Promise.all(requests).then(results=>{
      if(cancelled)return;
      const legs=Object.fromEntries(results.map(({key,leg})=>[key,leg]));
      setRouteLegs(legs);
      setJourneys(Object.fromEntries(results.map(({key,leg})=>[key,leg?.minutes??null])));
    }).catch(()=>{if(!cancelled){setRouteLegs({});setJourneys({});}});
    return()=>{cancelled=true;};
  },[visible,coordsOk,userCoords?.latitude,userCoords?.longitude,mode,planIds,
    candidates.slice(0,18).map(e=>e.id).join('|')]);

  const markChanged=()=>setSavedPlan(null);
  const changeDay=(value:DayChoice)=>{setDay(value);setOverrides({});markChanged();};
  const changeMood=(value:WeekendMood)=>{setMood(value);setOverrides({});markChanged();};
  const changeBudget=(value:Budget)=>{setBudget(value);setOverrides({});markChanged();};
  const selectSwap=(slot:WeekendSlot,id:string)=>{
    setOverrides(previous=>({...previous,[slot]:id}));setExpandedSwap(null);markChanged();
  };
  const saveWeekend=async()=>{
    if(!plan.length||saving)return;
    setSaving(true);
    try{
      // Save each event into My Events as well as the account-scoped itinerary.
      for(const {event} of plan){if(!isSaved(event.id)) await onSave(event);}
      const payload={weekendKey:activeWeekend,items:plan,travelSpend,mode,day,mood,budget,radius,savedAt:new Date().toISOString()};
      await AsyncStorage.setItem(key,JSON.stringify(payload));
      setSavedPlan(plan);
      Alert.alert('Weekend saved','Your itinerary is saved on this device and the events are in My Events. Booking is separate.');
    }catch(error){
      Alert.alert('Could not save weekend',error instanceof Error?error.message:'Please try again.');
    }finally{setSaving(false);}
  };
  const shareWeekend=()=>{
    if(!plan.length)return;
    void Share.share({message:itineraryShareText(plan,travelSpend)}).catch(()=>{
      Alert.alert('Sharing unavailable','Please try again.');
    });
  };
  const refresh=async()=>{if(busy||!coordsOk)return;setBusy(true);try{await query.refetch();}finally{setBusy(false);}};
  const onEvent=(event:LocalEvent)=>{onClose();onOpenEvent(event);};
  const onInvite=(event:LocalEvent)=>{onClose();onInviteEvent?.(event);};
  const total=ticketSubtotal(plan.map(item=>item.event));
  const travelTotal=plan.length*travelSpend;
  const selectedSlots=SLOTS.filter(s=>day==='any'||DAY[s]===day);
  const recommendation=candidates.filter(e=>!plan.some(x=>x.event.id===e.id));
  const metadata=<Text style={{color:palette.textSecondary,fontSize:12,marginTop:5}}>
    {query.isLoading?'Discovering more events nearby…':query.isError?
      'Extra discovery temporarily unavailable. Showing loaded events.':
      coordsOk?'Searching up to '+radius+' miles from your location':'Enable location to search beyond loaded events.'}
  </Text>;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.64)'}}>
      <View style={{maxHeight:'93%',borderTopLeftRadius:26,borderTopRightRadius:26,
        backgroundColor:palette.card,paddingTop:13}}>
        <View style={{alignSelf:'center',width:38,height:4,borderRadius:3,backgroundColor:palette.border,marginBottom:10}}/>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:20,paddingBottom:55}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
            <View style={{flexDirection:'row',gap:9,alignItems:'center'}}>
              <WandSparkles size={20} color={palette.primary}/>
              <Text style={{fontSize:24,color:palette.text,fontWeight:'800'}}>Plan your weekend</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close weekend planner" onPress={onClose}>
              <Text style={{fontWeight:'700',color:palette.primary}}>Close</Text>
            </TouchableOpacity>
          </View>
          <Text style={{color:palette.textSecondary,marginBottom:18}}>
            A real itinerary, built around your time, mood and budget.
          </Text>
          <Text style={{fontWeight:'700',color:palette.text}}>Which day?</Text>
          <Chips value={day} choices={[{value:'any',label:'Whole weekend'},{value:'friday',label:'Fri'},
            {value:'saturday',label:'Sat'},{value:'sunday',label:'Sun'}]} palette={palette} onChange={changeDay}/>
          <Text style={{fontWeight:'700',color:palette.text}}>Your vibe</Text>
          <Chips value={mood} choices={MOODS} palette={palette} onChange={changeMood}/>
          <Text style={{fontWeight:'700',color:palette.text}}>Max ticket price per event</Text>
          <Chips value={budget} choices={[{value:'any',label:'Any'},{value:'20',label:'£20'},
            {value:'50',label:'£50'},{value:'100',label:'£100'}]} palette={palette} onChange={changeBudget}/>
          <Text style={{fontWeight:'700',color:palette.text}}>Travel</Text>
          <Chips value={mode} choices={MODES} palette={palette} onChange={v=>{setMode(v);markChanged();}}/>
          <Text style={{color:palette.textSecondary,fontSize:12,marginBottom:6}}>
            Public transport times need a live timetable; where no real route is available, One Pager will direct you to Maps.
          </Text>
          <Text style={{fontWeight:'700',color:palette.text}}>Expected return travel spend per outing</Text>
          <Chips value={travelSpend} choices={[{value:0,label:'£0'},{value:5,label:'£5'},
            {value:10,label:'£10'},{value:20,label:'£20'}]} onChange={v=>{setTravelSpend(v);markChanged();}} palette={palette}/>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
            <Text style={{fontWeight:'700',color:palette.text}}>Discover events near you</Text>
            <TouchableOpacity onPress={()=>void refresh()} disabled={!coordsOk||busy} accessibilityRole="button"
              accessibilityLabel="Refresh weekend suggestions"><RefreshCw size={19} color={palette.primary}/></TouchableOpacity>
          </View>
          <Chips value={radius} choices={[{value:25,label:'25 mi'},{value:50,label:'50 mi'},{value:75,label:'75 mi'}]}
            palette={palette} onChange={v=>{setRadius(v);markChanged();}}/>
          {metadata}
          <View style={{marginTop:22,borderTopWidth:1,borderTopColor:palette.border,paddingTop:19}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <CalendarDays size={20} color={palette.primary}/>
              <Text style={{fontSize:20,color:palette.text,fontWeight:'800'}}>Your suggested itinerary</Text>
            </View>
            <Text style={{color:palette.textSecondary,marginTop:5}}>
              {candidates.length} matching future event{candidates.length===1?'':'s'}. Plans avoid clashes using published end times or a two-hour duration allowance.
            </Text>
            {query.isLoading ? <ActivityIndicator style={{marginTop:12}} color={palette.primary}/> : null}
            {!plan.length ? <Text style={{color:palette.textSecondary,marginTop:14}}>
              No safe matches for these choices. Try another day, higher budget or wider search.
            </Text>:null}
            {selectedSlots.map(slot=>{
              const chosenIndex=plan.findIndex(x=>x.slot===slot);
              const chosen=chosenIndex>=0?plan[chosenIndex].event:undefined;
              const previous=chosenIndex>0?plan[chosenIndex-1]:null;
              const transfer=previous && chosen && DAY[previous.slot]===DAY[slot]
                ? routeLegs[previous.event.id+'|'+chosen.id]:null;
              const alternatives=alternativesForSlot(candidates,slot,plan,options);
              return <View key={slot} style={{marginTop:15}}>
                <Text style={{color:palette.text,fontWeight:'800',fontSize:16}}>{LABELS[slot]}</Text>
                {transfer ? <Text style={{color:palette.textSecondary,fontSize:12,marginTop:5}}>
                  Verified transfer from previous event: {transfer.minutes} min
                </Text> : null}
                {chosen ? <EventCard event={chosen} palette={palette} mode={mode}
                  leg={routeLegs[chosen.id]} isSaved={isSaved(chosen.id)}
                  onOpen={()=>onEvent(chosen)}
                  onSave={()=>{void Promise.resolve(onSave(chosen)).catch(()=>Alert.alert('Save failed','Please try again.'));}}
                  invite={onInviteEvent?()=>onInvite(chosen):undefined}
                />:<Text style={{color:palette.textSecondary,marginTop:7}}>Nothing suitable at this time.</Text>}
                {alternatives.length>1 ? <TouchableOpacity accessibilityRole="button"
                  onPress={()=>setExpandedSwap(expandedSwap===slot?null:slot)}
                  style={{marginTop:8,alignSelf:'flex-start',paddingVertical:5}}>
                  <Text style={{color:palette.primary,fontWeight:'700'}}>
                    {expandedSwap===slot?'Hide alternatives':'Swap this suggestion'}
                  </Text>
                </TouchableOpacity>:null}
                {expandedSwap===slot ? alternatives.filter(x=>x.id!==chosen?.id).slice(0,6).map(other=>
                  <TouchableOpacity key={other.id} accessibilityRole="button" onPress={()=>selectSwap(slot,other.id)}
                    style={{padding:12,borderBottomWidth:1,borderBottomColor:palette.border,flexDirection:'row',gap:10,alignItems:'center'}}>
                    <View style={{flex:1}}>
                      <Text style={{fontWeight:'700',color:palette.text}} numberOfLines={2}>{other.title}</Text>
                      <Text style={{fontSize:12,color:palette.textSecondary}}>{other.time} · {other.price}</Text>
                    </View>
                    <ChevronRight size={18} color={palette.primary}/>
                  </TouchableOpacity>) : null}
              </View>;
            })}
            {plan.length ? <View style={{borderRadius:15,backgroundColor:palette.surfaceLight,
              padding:15,marginTop:18,gap:6}}>
              <Text style={{color:palette.text,fontWeight:'800',fontSize:17}}>Estimated weekend cost</Text>
              <Text style={{color:palette.textSecondary}}>Known tickets: {pounds(total.knownPounds)}</Text>
              <Text style={{color:palette.textSecondary}}>Your travel allowance: {pounds(travelTotal)}</Text>
              <Text style={{color:palette.text,fontWeight:'800',fontSize:19}}>From {pounds(total.knownPounds+travelTotal)}</Text>
              {total.unknownCount ? <Text style={{color:palette.textSecondary,fontSize:12}}>
                {total.unknownCount} event price{total.unknownCount===1?' is':'s are'} unknown; total is a minimum estimate.
              </Text> : null}
              <Text style={{color:palette.textSecondary,fontSize:12}}>
                Travel cost is your estimate, not a live fare. Tickets, availability and route times must be checked.
              </Text>
            </View>:null}
            <View style={{flexDirection:'row',gap:10,marginTop:15}}>
              <TouchableOpacity disabled={!plan.length||saving||!hydrated} accessibilityRole="button"
                onPress={()=>void saveWeekend()}
                style={{flex:1,backgroundColor:palette.primary,borderRadius:13,padding:14,alignItems:'center',opacity:plan.length?1:0.5}}>
                <Text style={{color:'#FFF',fontWeight:'800'}}>{saving?'Saving…':savedPlan?'Update saved plan':'Save weekend'}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!plan.length} accessibilityRole="button"
                onPress={shareWeekend} style={{borderWidth:1,borderColor:palette.primary,padding:14,borderRadius:13,
                  flexDirection:'row',gap:7,alignItems:'center'}}>
                <Users size={18} color={palette.primary}/>
                <Text style={{color:palette.primary,fontWeight:'800'}}>Share</Text>
              </TouchableOpacity>
            </View>
            <Text style={{color:palette.textSecondary,fontSize:12,marginTop:9}}>
              Saving an event is not a ticket booking or attendance confirmation.
            </Text>
          </View>
          {recommendation.length ? <View style={{marginTop:27}}>
            <Text style={{color:palette.text,fontSize:18,fontWeight:'800'}}>More weekend ideas</Text>
            <Text style={{color:palette.textSecondary,fontSize:12,marginTop:4}}>
              Tap a card to open the event. Swap itinerary suggestions above.
            </Text>
            {(showMore?recommendation.slice(0,25):recommendation.slice(0,5)).map(event=>
              <EventCard key={event.id} event={event} palette={palette} mode={mode}
                leg={routeLegs[event.id]} isSaved={isSaved(event.id)}
                onOpen={()=>onEvent(event)}
                onSave={()=>{void Promise.resolve(onSave(event)).catch(()=>Alert.alert('Save failed','Please try again.'));}}
                invite={onInviteEvent?()=>onInvite(event):undefined}/>)}
            {recommendation.length>5?<TouchableOpacity accessibilityRole="button"
              onPress={()=>setShowMore(v=>!v)} style={{marginTop:14,padding:10,alignItems:'center'}}>
              <Text style={{color:palette.primary,fontWeight:'700'}}>{showMore?'Show fewer':'Show more events'}</Text>
            </TouchableOpacity>:null}
          </View>:null}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
