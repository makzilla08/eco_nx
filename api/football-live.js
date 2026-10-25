const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const GRAPHQL_ENDPOINT = 'https://api4.xn--72czaud0ezbn4b8de.com/graphql';

const LIVE_EVENTS_QUERY = `
query LiveEvents {
  sportEvents {
    id
    name
    homeTeamName
    awayTeamName
    eventDateTime
    state
    sportLeague {
      name
    }
    channels
  }
}
`;

const SPORT_TYPES_QUERY = `
query SportTypes {
  sportTypes {
    id
    name
    liveEventCount
  }
}
`;

async function fetchGraphQL(query, variables = {}) {
  const tries = [
    GRAPHQL_ENDPOINT,
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(GRAPHQL_ENDPOINT),
    'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(GRAPHQL_ENDPOINT)
  ];
  
  const race = tries.map(u => (async () => {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 10000);
    try {
      const r = await fetch(u, {
        signal: ctl.signal,
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://www.dooball-doonang.com',
          'Referer': 'https://www.dooball-doonang.com/'
        },
        body: JSON.stringify({ query, variables })
      });
      clearTimeout(to);
      if (!r.ok) throw new Error('http ' + r.status);
      return await r.json();
    } catch (e) { clearTimeout(to); throw e; }
  })());
  
  try {
    const won = await Promise.any(race);
    race.forEach(p => p.catch(() => {}));
    return won;
  } catch (e) {
    throw new Error(String((e.errors || [e])[0]?.message || e).slice(0, 150));
  }
}

function dec(s) {
  return String(s || '')
    .replace(/&/g, '&').replace(/"/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&hellip;/g, '').replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '-').trim();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { action = 'list', league = '', status = '', id = '' } = req.query;
  
  try {
    if (action === 'list') {
      const data = await fetchGraphQL(LIVE_EVENTS_QUERY);
      let events = data.data?.sportEvents || [];
      if (status) events = events.filter(e => e.state === status);
      if (league) events = events.filter(e => (e.sportLeague?.name || '') === league);
      
      const items = events.map(e => ({
        id: e.id,
        title: e.name,
        homeTeam: e.homeTeamName,
        awayTeam: e.awayTeamName,
        homeScore: 0,
        awayScore: 0,
        homeLogo: '',
        awayLogo: '',
        league: e.sportLeague?.name || '',
        leagueLogo: '',
        time: e.eventDateTime,
        state: e.state,
        cover: e.channels?.[0]?.image || '',
        channels: (e.channels || []).filter(c => c.status === '1' || c.status === 1).map(c => ({
          id: c.id,
          url: c.url,
          title: c.title,
          image: c.image,
          tvstation: c.tvstation_name
        }))
      }));
      
      return res.status(200).json({ items });
    }
    
    if (action === 'detail') {
      if (!id) return res.status(400).json({ error: 'missing id' });
      
      const data = await fetchGraphQL(LIVE_EVENTS_QUERY);
      const events = data.data?.sportEvents || [];
      const e = events.find(ev => ev.id === id);
      if (!e) return res.status(404).json({ error: 'not found' });
      
      return res.status(200).json({
        id: e.id,
        title: e.name,
        homeTeam: e.homeTeamName,
        awayTeam: e.awayTeamName,
        homeScore: 0,
        awayScore: 0,
        homeLogo: '',
        awayLogo: '',
        league: e.sportLeague?.name || '',
        leagueLogo: '',
        time: e.eventDateTime,
        state: e.state,
        cover: e.channels?.[0]?.image || '',
        channels: (e.channels || []).filter(c => c.status === '1' || c.status === 1).map(c => ({
          id: c.id,
          url: c.url,
          title: c.title,
          image: c.image,
          tvstation: c.tvstation_name
        }))
      });
    }
    
    if (action === 'leagues') {
      const data = await fetchGraphQL(SPORT_TYPES_QUERY);
      const types = data.data?.sportTypes || [];
      const leagues = types
        .filter(t => t.liveEventCount > 0)
        .map(t => ({ id: t.id, name: t.name, count: t.liveEventCount }));
      return res.status(200).json({ leagues });
    }
    
    return res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e).slice(0, 150) });
  }
}