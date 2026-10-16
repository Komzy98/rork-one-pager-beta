import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const onboarding = join(process.cwd(), 'app', '(onboarding)');
const read = (name: string) => readFileSync(join(onboarding, name), 'utf8');

describe('Onboarding V2 screen wiring', () => {
  it('registers a single quick preference step after interests', () => {
    assert.match(read('_layout.tsx'), /name="quick-setup"/);
    assert.match(read('interests.tsx'), /getNextOnboardingRoute\('interests', selectedInterests\)/);
  });
  it('supports meaningful first actions without requiring credentials', () => {
    const s = read('quick-setup.tsx');
    for (const feature of ['getPopularTeams', 'ALL_NBA_TEAMS', 'ONBOARDING_EVENT_CATEGORIES',
      'ONBOARDING_EVENT_CITIES', 'searchTVShows', 'addShow', 'addTask']) {
      assert.ok(s.includes(feature), feature);
    }
    assert.match(s, /Skip/);
    assert.match(s, /returnTo === 'events'/);
    assert.doesNotMatch(s, /requestPermissions|configureYounify/);
  });
  it('renders actual saved preferences, then opens the restored Overview route', () => {
    const s = read('complete.tsx');
    assert.match(s, /profile\?\.favoriteTeams/);
    assert.match(s, /profile\?\.preferredEventsCity/);
    assert.match(s, /await updateProfile\(\{ onboardingCompleted: true \}\)/);
    assert.match(s, /router.replace\('\/\(tabs\)\/activities'/);
  });
  it('does not gate the first Overview with the old tutorial overlay', () => {
    const overview = readFileSync(join(process.cwd(), 'app', '(tabs)', 'activities.tsx'), 'utf8');
    assert.doesNotMatch(overview, /<TabWalkthrough/);
  });
  it('does not reintroduce the four simplified AI tabs', () => {
    const tabs = join(process.cwd(), 'app', '(tabs)');
    for (const name of ['today-coherent', 'my-life-world', 'discover-focused', 'you-coherent']) {
      assert.equal(existsSync(join(tabs, name + '.tsx')), false);
    }
  });
});
