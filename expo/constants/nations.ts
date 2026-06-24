export interface Nation {
  id: string;
  name: string;
  code: string;
  flag: string;
  apiId: number;
  region: 'europe' | 'africa' | 'south-america' | 'north-america' | 'asia' | 'oceania';
}

export const ALL_NATIONS: Nation[] = [
  // Europe
  { id: 'england', name: 'England', code: 'GB-ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', apiId: 10, region: 'europe' },
  { id: 'france', name: 'France', code: 'FR', flag: '🇫🇷', apiId: 2, region: 'europe' },
  { id: 'germany', name: 'Germany', code: 'DE', flag: '🇩🇪', apiId: 25, region: 'europe' },
  { id: 'spain', name: 'Spain', code: 'ES', flag: '🇪🇸', apiId: 9, region: 'europe' },
  { id: 'italy', name: 'Italy', code: 'IT', flag: '🇮🇹', apiId: 768, region: 'europe' },
  { id: 'portugal', name: 'Portugal', code: 'PT', flag: '🇵🇹', apiId: 27, region: 'europe' },
  { id: 'netherlands', name: 'Netherlands', code: 'NL', flag: '🇳🇱', apiId: 1118, region: 'europe' },
  { id: 'belgium', name: 'Belgium', code: 'BE', flag: '🇧🇪', apiId: 1, region: 'europe' },
  { id: 'croatia', name: 'Croatia', code: 'HR', flag: '🇭🇷', apiId: 3, region: 'europe' },
  { id: 'scotland', name: 'Scotland', code: 'GB-SCT', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', apiId: 1108, region: 'europe' },
  { id: 'wales', name: 'Wales', code: 'GB-WLS', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', apiId: 1109, region: 'europe' },
  { id: 'ireland', name: 'Ireland', code: 'IE', flag: '🇮🇪', apiId: 1104, region: 'europe' },
  { id: 'denmark', name: 'Denmark', code: 'DK', flag: '🇩🇰', apiId: 21, region: 'europe' },
  { id: 'sweden', name: 'Sweden', code: 'SE', flag: '🇸🇪', apiId: 22, region: 'europe' },
  { id: 'norway', name: 'Norway', code: 'NO', flag: '🇳🇴', apiId: 1105, region: 'europe' },
  { id: 'poland', name: 'Poland', code: 'PL', flag: '🇵🇱', apiId: 1101, region: 'europe' },
  { id: 'switzerland', name: 'Switzerland', code: 'CH', flag: '🇨🇭', apiId: 15, region: 'europe' },
  { id: 'austria', name: 'Austria', code: 'AT', flag: '🇦🇹', apiId: 1100, region: 'europe' },
  { id: 'turkey', name: 'Turkey', code: 'TR', flag: '🇹🇷', apiId: 777, region: 'europe' },
  { id: 'czech-republic', name: 'Czech Republic', code: 'CZ', flag: '🇨🇿', apiId: 1102, region: 'europe' },
  { id: 'serbia', name: 'Serbia', code: 'RS', flag: '🇷🇸', apiId: 14, region: 'europe' },
  { id: 'ukraine', name: 'Ukraine', code: 'UA', flag: '🇺🇦', apiId: 772, region: 'europe' },
  { id: 'greece', name: 'Greece', code: 'GR', flag: '🇬🇷', apiId: 1103, region: 'europe' },
  { id: 'romania', name: 'Romania', code: 'RO', flag: '🇷🇴', apiId: 774, region: 'europe' },
  { id: 'hungary', name: 'Hungary', code: 'HU', flag: '🇭🇺', apiId: 1106, region: 'europe' },
  { id: 'slovakia', name: 'Slovakia', code: 'SK', flag: '🇸🇰', apiId: 1107, region: 'europe' },
  { id: 'finland', name: 'Finland', code: 'FI', flag: '🇫🇮', apiId: 1110, region: 'europe' },
  { id: 'iceland', name: 'Iceland', code: 'IS', flag: '🇮🇸', apiId: 1111, region: 'europe' },
  { id: 'albania', name: 'Albania', code: 'AL', flag: '🇦🇱', apiId: 1112, region: 'europe' },
  { id: 'northern-ireland', name: 'Northern Ireland', code: 'GB-NIR', flag: '🇬🇧', apiId: 1113, region: 'europe' },

  // Africa
  { id: 'algeria', name: 'Algeria', code: 'DZ', flag: '🇩🇿', apiId: 1530, region: 'africa' },
  { id: 'angola', name: 'Angola', code: 'AO', flag: '🇦🇴', apiId: 2381, region: 'africa' },
  { id: 'benin', name: 'Benin', code: 'BJ', flag: '🇧🇯', apiId: 1513, region: 'africa' },
  { id: 'botswana', name: 'Botswana', code: 'BW', flag: '🇧🇼', apiId: 2382, region: 'africa' },
  { id: 'burkina-faso', name: 'Burkina Faso', code: 'BF', flag: '🇧🇫', apiId: 1507, region: 'africa' },
  { id: 'burundi', name: 'Burundi', code: 'BI', flag: '🇧🇮', apiId: 2383, region: 'africa' },
  { id: 'cameroon', name: 'Cameroon', code: 'CM', flag: '🇨🇲', apiId: 1116, region: 'africa' },
  { id: 'cape-verde', name: 'Cape Verde', code: 'CV', flag: '🇨🇻', apiId: 1514, region: 'africa' },
  { id: 'car', name: 'Central African Republic', code: 'CF', flag: '🇨🇫', apiId: 2384, region: 'africa' },
  { id: 'chad', name: 'Chad', code: 'TD', flag: '🇹🇩', apiId: 2385, region: 'africa' },
  { id: 'comoros', name: 'Comoros', code: 'KM', flag: '🇰🇲', apiId: 2386, region: 'africa' },
  { id: 'congo', name: 'Congo', code: 'CG', flag: '🇨🇬', apiId: 1515, region: 'africa' },
  { id: 'drc', name: 'DR Congo', code: 'CD', flag: '🇨🇩', apiId: 1516, region: 'africa' },
  { id: 'djibouti', name: 'Djibouti', code: 'DJ', flag: '🇩🇯', apiId: 2387, region: 'africa' },
  { id: 'egypt', name: 'Egypt', code: 'EG', flag: '🇪🇬', apiId: 1536, region: 'africa' },
  { id: 'equatorial-guinea', name: 'Equatorial Guinea', code: 'GQ', flag: '🇬🇶', apiId: 1517, region: 'africa' },
  { id: 'eritrea', name: 'Eritrea', code: 'ER', flag: '🇪🇷', apiId: 2388, region: 'africa' },
  { id: 'eswatini', name: 'Eswatini', code: 'SZ', flag: '🇸🇿', apiId: 2389, region: 'africa' },
  { id: 'ethiopia', name: 'Ethiopia', code: 'ET', flag: '🇪🇹', apiId: 1518, region: 'africa' },
  { id: 'gabon', name: 'Gabon', code: 'GA', flag: '🇬🇦', apiId: 1520, region: 'africa' },
  { id: 'gambia', name: 'Gambia', code: 'GM', flag: '🇬🇲', apiId: 1521, region: 'africa' },
  { id: 'ghana', name: 'Ghana', code: 'GH', flag: '🇬🇭', apiId: 842, region: 'africa' },
  { id: 'guinea', name: 'Guinea', code: 'GN', flag: '🇬🇳', apiId: 1522, region: 'africa' },
  { id: 'guinea-bissau', name: 'Guinea-Bissau', code: 'GW', flag: '🇬🇼', apiId: 1523, region: 'africa' },
  { id: 'ivory-coast', name: 'Ivory Coast', code: 'CI', flag: '🇨🇮', apiId: 846, region: 'africa' },
  { id: 'kenya', name: 'Kenya', code: 'KE', flag: '🇰🇪', apiId: 1524, region: 'africa' },
  { id: 'lesotho', name: 'Lesotho', code: 'LS', flag: '🇱🇸', apiId: 2390, region: 'africa' },
  { id: 'liberia', name: 'Liberia', code: 'LR', flag: '🇱🇷', apiId: 1525, region: 'africa' },
  { id: 'libya', name: 'Libya', code: 'LY', flag: '🇱🇾', apiId: 1526, region: 'africa' },
  { id: 'madagascar', name: 'Madagascar', code: 'MG', flag: '🇲🇬', apiId: 1527, region: 'africa' },
  { id: 'malawi', name: 'Malawi', code: 'MW', flag: '🇲🇼', apiId: 1528, region: 'africa' },
  { id: 'mali', name: 'Mali', code: 'ML', flag: '🇲🇱', apiId: 1048, region: 'africa' },
  { id: 'mauritania', name: 'Mauritania', code: 'MR', flag: '🇲🇷', apiId: 1529, region: 'africa' },
  { id: 'mauritius', name: 'Mauritius', code: 'MU', flag: '🇲🇺', apiId: 2391, region: 'africa' },
  { id: 'morocco', name: 'Morocco', code: 'MA', flag: '🇲🇦', apiId: 1519, region: 'africa' },
  { id: 'mozambique', name: 'Mozambique', code: 'MZ', flag: '🇲🇿', apiId: 1531, region: 'africa' },
  { id: 'namibia', name: 'Namibia', code: 'NA', flag: '🇳🇦', apiId: 1532, region: 'africa' },
  { id: 'niger', name: 'Niger', code: 'NE', flag: '🇳🇪', apiId: 1533, region: 'africa' },
  { id: 'nigeria', name: 'Nigeria', code: 'NG', flag: '🇳🇬', apiId: 1118, region: 'africa' },
  { id: 'rwanda', name: 'Rwanda', code: 'RW', flag: '🇷🇼', apiId: 1534, region: 'africa' },
  { id: 'sao-tome', name: 'Sao Tome and Principe', code: 'ST', flag: '🇸🇹', apiId: 2392, region: 'africa' },
  { id: 'senegal', name: 'Senegal', code: 'SN', flag: '🇸🇳', apiId: 13, region: 'africa' },
  { id: 'seychelles', name: 'Seychelles', code: 'SC', flag: '🇸🇨', apiId: 2393, region: 'africa' },
  { id: 'sierra-leone', name: 'Sierra Leone', code: 'SL', flag: '🇸🇱', apiId: 1535, region: 'africa' },
  { id: 'somalia', name: 'Somalia', code: 'SO', flag: '🇸🇴', apiId: 2394, region: 'africa' },
  { id: 'south-africa', name: 'South Africa', code: 'ZA', flag: '🇿🇦', apiId: 15, region: 'africa' },
  { id: 'south-sudan', name: 'South Sudan', code: 'SS', flag: '🇸🇸', apiId: 2395, region: 'africa' },
  { id: 'sudan', name: 'Sudan', code: 'SD', flag: '🇸🇩', apiId: 1537, region: 'africa' },
  { id: 'tanzania', name: 'Tanzania', code: 'TZ', flag: '🇹🇿', apiId: 1538, region: 'africa' },
  { id: 'togo', name: 'Togo', code: 'TG', flag: '🇹🇬', apiId: 1539, region: 'africa' },
  { id: 'tunisia', name: 'Tunisia', code: 'TN', flag: '🇹🇳', apiId: 27, region: 'africa' },
  { id: 'uganda', name: 'Uganda', code: 'UG', flag: '🇺🇬', apiId: 1540, region: 'africa' },
  { id: 'zambia', name: 'Zambia', code: 'ZM', flag: '🇿🇲', apiId: 1541, region: 'africa' },
  { id: 'zimbabwe', name: 'Zimbabwe', code: 'ZW', flag: '🇿🇼', apiId: 1542, region: 'africa' },

  // South America
  { id: 'brazil', name: 'Brazil', code: 'BR', flag: '🇧🇷', apiId: 6, region: 'south-america' },
  { id: 'argentina', name: 'Argentina', code: 'AR', flag: '🇦🇷', apiId: 26, region: 'south-america' },
  { id: 'uruguay', name: 'Uruguay', code: 'UY', flag: '🇺🇾', apiId: 7, region: 'south-america' },
  { id: 'colombia', name: 'Colombia', code: 'CO', flag: '🇨🇴', apiId: 1556, region: 'south-america' },
  { id: 'chile', name: 'Chile', code: 'CL', flag: '🇨🇱', apiId: 1555, region: 'south-america' },
  { id: 'ecuador', name: 'Ecuador', code: 'EC', flag: '🇪🇨', apiId: 1557, region: 'south-america' },
  { id: 'paraguay', name: 'Paraguay', code: 'PY', flag: '🇵🇾', apiId: 1558, region: 'south-america' },
  { id: 'peru', name: 'Peru', code: 'PE', flag: '🇵🇪', apiId: 1559, region: 'south-america' },
  { id: 'venezuela', name: 'Venezuela', code: 'VE', flag: '🇻🇪', apiId: 1560, region: 'south-america' },
  { id: 'bolivia', name: 'Bolivia', code: 'BO', flag: '🇧🇴', apiId: 1561, region: 'south-america' },

  // North/Central America
  { id: 'usa', name: 'United States', code: 'US', flag: '🇺🇸', apiId: 2384, region: 'north-america' },
  { id: 'mexico', name: 'Mexico', code: 'MX', flag: '🇲🇽', apiId: 16, region: 'north-america' },
  { id: 'canada', name: 'Canada', code: 'CA', flag: '🇨🇦', apiId: 5765, region: 'north-america' },
  { id: 'jamaica', name: 'Jamaica', code: 'JM', flag: '🇯🇲', apiId: 1562, region: 'north-america' },
  { id: 'costa-rica', name: 'Costa Rica', code: 'CR', flag: '🇨🇷', apiId: 1563, region: 'north-america' },
  { id: 'panama', name: 'Panama', code: 'PA', flag: '🇵🇦', apiId: 1564, region: 'north-america' },

  // Asia
  { id: 'japan', name: 'Japan', code: 'JP', flag: '🇯🇵', apiId: 12, region: 'asia' },
  { id: 'south-korea', name: 'South Korea', code: 'KR', flag: '🇰🇷', apiId: 17, region: 'asia' },
  { id: 'australia', name: 'Australia', code: 'AU', flag: '🇦🇺', apiId: 20, region: 'asia' },
  { id: 'saudi-arabia', name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', apiId: 23, region: 'asia' },
  { id: 'iran', name: 'Iran', code: 'IR', flag: '🇮🇷', apiId: 22, region: 'asia' },
  { id: 'qatar', name: 'Qatar', code: 'QA', flag: '🇶🇦', apiId: 1569, region: 'asia' },
  { id: 'uae', name: 'UAE', code: 'AE', flag: '🇦🇪', apiId: 1570, region: 'asia' },
  { id: 'india', name: 'India', code: 'IN', flag: '🇮🇳', apiId: 1571, region: 'asia' },
  { id: 'china', name: 'China', code: 'CN', flag: '🇨🇳', apiId: 1572, region: 'asia' },
];

export const REGION_LABELS: Record<Nation['region'], string> = {
  'europe': 'Europe',
  'africa': 'Africa',
  'south-america': 'South America',
  'north-america': 'North & Central America',
  'asia': 'Asia',
  'oceania': 'Oceania',
};

export const REGION_ORDER: Nation['region'][] = ['europe', 'africa', 'south-america', 'north-america', 'asia', 'oceania'];

/** PNG from flagcdn.com. `code` is `Nation.code` (e.g. `gb-eng`, `fr`, `us`). */
export function getNationFlagUrl(code: string, size: 'w20' | 'w40' | 'w80' | 'h20' | 'h24' = 'w80'): string {
  const slug = code.toLowerCase();
  return `https://flagcdn.com/${size}/${slug}.png`;
}
