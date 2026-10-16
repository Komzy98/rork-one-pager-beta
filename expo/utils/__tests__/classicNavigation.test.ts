import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const tabsDir = join(process.cwd(), 'app', '(tabs)');
const classicNavigation = readFileSync(join(tabsDir, '_layout.tsx'), 'utf8');
const overview = readFileSync(join(tabsDir, 'activities.tsx'), 'utf8');

describe('classic One Pager navigation', () => {
  it('starts on the original Overview, not the simplified Today screen', () => {
    assert.match(classicNavigation, /initialRouteName="activities"/);
    assert.match(classicNavigation, /activities: "Overview"/);
  });

  it('always exposes original Overview, Sports, Events and Profile tabs', () => {
    assert.match(classicNavigation, /ALWAYS_VISIBLE_TABS = \['activities', 'sports', 'events', 'profile'\]/);
    assert.match(classicNavigation, /getClassicVisibleTabs\(getPersonalizedTabs\(\)\)/);
    assert.match(classicNavigation, /name="activities"|name=\{name\}/);
  });

  it('keeps the original interest tabs available', () => {
    for (const name of ['tasks', 'shows', 'cooking', 'learning', 'discover']) {
      assert.ok(classicNavigation.includes("'" + name + "'"), name + ' classic route missing');
    }
  });

  it('removes all four simplified AI navigation destinations', () => {
    for (const name of ['today-coherent', 'my-life-world', 'discover-focused', 'you-coherent']) {
      assert.equal(existsSync(join(tabsDir, name + '.tsx')), false, name + ' should not exist');
      assert.equal(classicNavigation.includes(name), false, name + ' should not be registered');
    }
  });

  it('does not offer the alternate AI View on the traditional Overview', () => {
    assert.doesNotMatch(overview, /ActivitiesAIView|showUnifiedView|AI View/);
  });
});
