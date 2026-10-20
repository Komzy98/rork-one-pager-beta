import type { Show } from '@/types/habit';
import { inferYounifyRowMediaType } from '@/utils/younifyRowMedia';

// Provider row metadata is intentionally parsed without React Native dependencies,
// so ranking and deduplication can be regression tested on Node.
function extractTmdbIdFromYounifyRow(row:Record<string,unknown>):number|null {
  const ids = [row.tmdbId,row.tmdbID,row.tmdb_id,(row.externalIds as Record<string,unknown>|undefined)?.tmdb];
  for(const raw of ids){const n=Number(raw);if(Number.isSafeInteger(n)&&n>0)return n;}
  return null;
}
function getContinueWatchingProgressPercent(row:Record<string,unknown>):number {
  const duration=Number(row.duration);
  const position=Number(row.bookmarkPositionMs??row.resumePositionMs??row.positionMs);
  if(Number.isFinite(duration)&&duration>60000&&Number.isFinite(position)&&position>0)
    return Math.max(0,Math.min(100,Math.round(position/duration*100)));
  for(const field of ['watchProgress','watch_progress','playbackProgress','playback_progress','progress','percentWatched','percent_watched']){
    const raw=Number(row[field]);
    if(Number.isFinite(raw)&&raw>0&&raw<=100)
      return Math.max(0,Math.min(100,Math.round(raw<1?raw*100:raw)));
  }
  for(const field of ['watchPercent','completionPercent','progressPercent']){
    const raw=Number(row[field]);if(Number.isFinite(raw)&&raw>0&&raw<=100)return Math.round(raw);
  }
  return 0;
}
function episodeFromProvider(row:Record<string,unknown>):boolean {
  const season=Number(row.seasonNumber??row.season_number??row.season);
  const episode=Number(row.episodeNumber??row.episode_number??row.episode);
  if(!Number.isInteger(season)||!Number.isInteger(episode)||season<1||episode<1)return false;
  return !(season===1&&episode===1&&getContinueWatchingProgressPercent(row)===0);
}
function verifiedLocalEpisode(show:Show):boolean {
  if(show.type!=='Series')return false;
  if(show.lastWatchedSeason!=null&&show.lastWatchedEpisode!=null)return true;
  if(show.currentSeason==null||show.currentEpisode==null)return false;
  if(show.currentSeason===1&&show.currentEpisode===1)return false;
  return true;
}
export type SmartContinueItem =
  | { kind:'local'; show:Show & {posterUrl?:string|null}; progressVerified:boolean; rank:number }
  | { kind:'younify'; row:Record<string,unknown>; key:string; progressVerified:boolean; rank:number };

export function mediaKind(show:Show): 'movie' | 'tv' {
  return show.mediaType ?? (show.type==='Movie' ? 'movie' : 'tv');
}
function normalizedTitle(name:string):string {
  return name.toLowerCase().replace(/\b(?:s\d+\s*e\d+|season\s*\d+\s*episode\s*\d+)\b/g,'')
    .replace(/[^a-z0-9]+/g,' ').trim();
}
function itemKey(id:number|null,type:'tv'|'movie'|null,title:string):string {
  return id && type ? `${type}:${id}` : `title:${type??'unknown'}:${normalizedTitle(title)}`;
}

export function selectContinueWatching(input:{
  providerRows:readonly Record<string,unknown>[];
  localShows:readonly (Show & {posterUrl?:string|null})[];
  dismissed:readonly string[];
}):SmartContinueItem[] {
  const out:SmartContinueItem[]=[];
  const seen=new Set<string>();
  const dismissed=new Set(input.dismissed);
  for(const row of input.providerRows) {
    const id=extractTmdbIdFromYounifyRow(row);
    const type=inferYounifyRowMediaType(row);
    const title=String(row.showTitle || row.title || '').trim();
    if(!title)continue;
    const pct=getContinueWatchingProgressPercent(row);
    const episode=episodeFromProvider(row);
    // A recent provider title isn't necessarily in progress. No fake Resume.
    if((pct<=0 && !episode)||pct>=95)continue;
    const key=itemKey(id,type,title);
    if(seen.has(key)||dismissed.has(key)||id && dismissed.has(`tmdb:${id}`))continue;
    seen.add(key);
    const identifier=String(row.itemID??row.id??key);
    out.push({kind:'younify',row,key:identifier,progressVerified:pct>0||!!episode,rank:200+pct});
  }
  for(const show of input.localShows) {
    if(show.status!=='Watching')continue;
    const type=mediaKind(show);
    const key=itemKey(show.tmdbId??null,type,show.title);
    if(seen.has(key)||dismissed.has(key)||show.tmdbId && dismissed.has(`tmdb:${show.tmdbId}`))continue;
    seen.add(key);
    const verified=verifiedLocalEpisode(show);
    // A manually selected Watching status is not a verified playback session.
    out.push({kind:'local',show,progressVerified:verified,rank:verified?120:25});
  }
  return out.sort((a,b)=>b.rank-a.rank).slice(0,18);
}

export type VerifiedWatchOffer = {
  providerNames:string[];
  linkedProviderNames:string[];
  releaseDate?:string;
  runtime?:number;
  genreIds?:number[];
};
export type RankedWatchItem = {
  show:Show & {posterUrl?:string|null};
  score:number;
  explanation:string;
  available:boolean;
  comingSoon:boolean;
  durationLabel?:string;
};
export function rankWatchlist(input:{
  shows:readonly (Show & {posterUrl?:string|null})[];
  watching:readonly Show[];
  offers:Readonly<Record<string,VerifiedWatchOffer>>;
  preferredGenreIds?:readonly number[];
  minutesUntilNextCalendar?:number|null;
  now?:Date;
}):RankedWatchItem[] {
  const now=input.now??new Date();
  const latest=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const watchingType=new Set(input.watching.map(mediaKind));
  const likedGenres=new Set(input.preferredGenreIds??[]);
  return input.shows.filter(s=>s.status==='Plan to Watch').map(show=>{
    const offer=input.offers[`${mediaKind(show)}:${show.tmdbId}`];
    const names=offer?.linkedProviderNames??[];
    const available=names.length>0;
    const comingSoon=!!offer?.releaseDate && offer.releaseDate>latest && !available;
    const addedAt=Date.parse(show.createdAt||show.updatedAt||'');
    const daysSinceAdd=Number.isFinite(addedAt)?Math.max(0,(now.getTime()-addedAt)/86400000):90;
    const recent=Math.max(0,1-daysSinceAdd/90);
    const short=offer?.runtime && offer.runtime<75;
    const matchingGenres=(offer?.genreIds??[]).filter(g=>likedGenres.has(g)).length;
    const releaseTime=offer?.releaseDate?Date.parse(offer.releaseDate+'T12:00:00Z'):NaN;
    const recentlyReleased=Number.isFinite(releaseTime)&&releaseTime<=now.getTime()&&now.getTime()-releaseTime<45*86400000;
    const fitsBeforeEvent=!!offer?.runtime&&input.minutesUntilNextCalendar!=null&&
      input.minutesUntilNextCalendar<300&&input.minutesUntilNextCalendar>=offer.runtime+15;
    let score=20*recent+((show.rating??0)/5)*12+(watchingType.has(mediaKind(show))?10:0);
    if(available)score+=65;
    else if(offer?.providerNames.length)score+=10;
    if(comingSoon)score-=55;
    if(short && now.getHours()>=20)score+=8;
    if(recentlyReleased)score+=8;
    score+=Math.min(2,matchingGenres)*12;
    if(fitsBeforeEvent)score+=6;
    const explanation=comingSoon ? 'Coming soon · not yet available to stream'
      : available ? `Available on ${names[0]}`
      : offer?.providerNames.length ? 'Watch options available · check your services'
      : show.tmdbId ? 'In your watchlist · availability unconfirmed'
      : 'Saved in your watchlist';
    const personalisedExplanation=matchingGenres>0 && !comingSoon
      ? `${explanation} · matches your genres` : explanation;
    const withTiming=fitsBeforeEvent&&available
      ? `${personalisedExplanation} · fits before your next event` : personalisedExplanation;
    return {
      show,score,explanation:withTiming,available,comingSoon,
      durationLabel:offer?.runtime && offer.runtime>0?`${offer.runtime} min`:undefined,
    };
  }).sort((a,b)=>b.score-a.score || a.show.title.localeCompare(b.show.title)).slice(0,5);
}
