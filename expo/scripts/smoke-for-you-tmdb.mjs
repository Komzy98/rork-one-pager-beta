const key =
  process.env.EXPO_PUBLIC_TMDB_API_KEY?.trim() || '9c4ca7924ae21a581e065517c106f1cc';
const base = 'https://api.themoviedb.org/3';
async function get(path) {
  const res = await fetch(`${base}${path}${path.includes('?') ? '&' : '?'}api_key=${key}`);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}
const trending = await get('/trending/movie/week');
console.log('trending movies', trending.results?.length ?? 0);
