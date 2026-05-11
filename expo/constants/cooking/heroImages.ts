/** Dish-specific hero images (Unsplash CDN, verified HTTP 200). */

const u = (photoPath: string) => `https://images.unsplash.com/${photoPath}?w=900&q=80`;

/**
 * Overrides default `image` on recipes so each meal matches its cuisine / preparation.
 * Keys = `CookingRecipe.id`.
 */
export const RECIPE_HERO_IMAGES: Record<string, string> = {
  // Legacy A
  'creamy-tuscan-chicken': u('photo-1518492104633-130d0cc84637'),
  'avocado-toast-deluxe': u('photo-1588137378633-dea1336ce1e2'),
  'thai-green-curry-legacy': u('photo-1455619452474-d2be8b1e70cd'),
  'berry-smoothie-bowl': u('photo-1590301157890-4810ed352733'),
  'lemon-herb-salmon-legacy': u('photo-1467003909585-2f8a72700288'),
  'chocolate-lava-cake': u('photo-1606313564200-e75d5e30476c'),
  'mediterranean-quinoa-bowl-legacy': u('photo-1512621776951-a57141f2eefd'),
  'spicy-prawn-tacos': u('photo-1565299585323-38d6b0865b47'),

  // Legacy B — Afro-Caribbean & African diaspora
  'jamaican-jerk-chicken': u('photo-1658833608786-22c4b4a621de'),
  'caribbean-rice-and-peas': u('photo-1516684732162-798a0062be99'),
  'trinidadian-doubles': u('photo-1631292784640-2b24be784d5d'),
  'nigerian-jollof-rice': u('photo-1665556899022-9761f95769e5'),
  'ethiopian-doro-wat': u('photo-1574484284002-952d92456975'),
  'moroccan-chicken-tagine': u('photo-1541518763669-27fef04b14ea'),
  'west-african-peanut-stew': u('photo-1547592180-85f173990554'),
  'south-african-bobotie': u('photo-1598511757337-fe2cafc31ba0'),

  // Legacy C
  'trini-curry-goat': u('photo-1585032226651-759b368d7246'),
  'plantain-black-bean-bowl': u('photo-1504674900247-0877df9cc836'),
  'greek-yoghurt-chicken-salad': u('photo-1547592166-23ac45744acd'),
  'lemon-herb-cod-parcels': u('photo-1553621042-f6e147245754'),
  'tomato-basil-egg-white-omelette': u('photo-1510693206972-df098062cb71'),
  'spicy-lentil-soup-legacy': u('photo-1576045057995-568f588f82fb'),
  'chicken-broccoli-stir-fry-legacy': u('photo-1603133872878-684f208fb84b'),
  'cauliflower-rice-burrito-bowl': u('photo-1627906327792-4ede6149189f'),

  // Afro-Caribbean extras
  'ackee-saltfish': u('photo-1504754524776-8f4f37790ca0'),
  'jamaican-beef-patty': u('photo-1632552544450-ed380a0372e7'),
  'escovitch-fish': u('photo-1548704087-b11dab0fbec0'),
  'jamaican-oxtail-stew': u('photo-1689860892307-7db54ab276ba'),
  'trinidadian-callaloo': u('photo-1607008904455-a17090d0a69e'),
  'barbados-cou-cou-flying-fish': u('photo-1575950674322-3a1977724f2e'),
  'haitian-griot': u('photo-1544025162-d76694265947'),

  // Mexican
  'mexican-chilaquiles-verdes': u('photo-1633372363856-f2fe2669a26e'),
  'mexican-pozole-rojo': u('photo-1576874762348-f74e25831a92'),
  'mexican-enchiladas-verdes': u('photo-1565299624946-b28f40a0ae38'),
  'mexican-huevos-rancheros': u('photo-1650330151304-5db3ca9b3b6c'),
  'mexican-sopa-de-tortilla': u('photo-1576045057995-568f588f82fb'),
  'mexican-carnitas': u('photo-1552332386-f8dd00dc2f85'),
  'mexican-birria-tacos': u('photo-1648071598153-428215dce7bb'),
  'mexican-chiles-rellenos': u('photo-1676081986290-ac79c2968c3f'),
  'mexican-esquites': u('photo-1601050690597-df0568f70950'),
  'mexican-tamales': u('photo-1613514785940-daed07799d9b'),

  // Tab curated
  'grilled-chicken-bowl': u('photo-1762631383520-df106b252f6a'),
  'garlic-salmon': u('photo-1544947950-fa07a98d237f'),
  'beef-broccoli': u('photo-1603133872878-684f208fb84b'),
  'zoodle-pesto': u('photo-1621996346565-e3dbc646d9a9'),
  'cauliflower-rice-shrimp': u('photo-1563379926898-05f4575a45d8'),
  'jollof-inspired': u('photo-1600891964092-4316c288032e'),
  'chana-masala': u('photo-1585937421612-70a008356fbe'),
  'miso-salmon-bowl': u('photo-1546069901-ba9599a7e63c'),
  'kimchi-fried-rice': u('photo-1580442151529-343f2f6e0e27'),
  'tacos-carne': u('photo-1687881063470-a78e6ea2590e'),
  'feijoada-lite': u('photo-1591386767153-987783380885'),
  'greek-salmon-salad': u('photo-1540189549336-e6e99c3679fe'),
  'overnight-oats-batch': u('photo-1517673400267-0251440c45dc'),
  'lentil-soup': u('photo-1576045057995-568f588f82fb'),
  'steak-salad': u('photo-1558030006-450675393462'),
  'shakshuka': u('photo-1595295333158-4742f28fbd85'),
  'thai-green-curry': u('photo-1761315412830-2f59480377b0'),
  'sheet-pan-fajitas': u('photo-1594221708779-94832f4320d1'),
  'buddha-bowl': u('photo-1490645935967-10de6ba17061'),
  'egg-muffins': u('photo-1525351484163-7529414344d8'),
};

export function applyRecipeHeroImages<T extends { id: string; image: string }>(recipes: T[]): T[] {
  return recipes.map((r) => {
    const image = RECIPE_HERO_IMAGES[r.id];
    return image ? { ...r, image } : r;
  });
}
