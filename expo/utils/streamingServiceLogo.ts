/**
 * When Younify rows omit thumbnail URLs, map known provider names to brand domains for Clearbit logos.
 */
export function getStreamingBrandLogoUrl(serviceName: string): string | null {
  const n = serviceName.trim().toLowerCase();
  if (!n) return null;

  const rules: { test: (s: string) => boolean; domain: string }[] = [
    { test: (s) => /netflix/.test(s), domain: 'netflix.com' },
    { test: (s) => /hulu/.test(s), domain: 'hulu.com' },
    { test: (s) => /disney\+?|disney plus/.test(s), domain: 'disneyplus.com' },
    { test: (s) => /prime video|amazon prime|\bprime\b/.test(s), domain: 'primevideo.com' },
    { test: (s) => /hbo max|\bhbo\b|^max$/.test(s), domain: 'max.com' },
    { test: (s) => /peacock/.test(s), domain: 'peacocktv.com' },
    { test: (s) => /paramount/.test(s), domain: 'paramountplus.com' },
    { test: (s) => /apple tv/.test(s), domain: 'tv.apple.com' },
    { test: (s) => /crunchyroll/.test(s), domain: 'crunchyroll.com' },
    { test: (s) => /youtube/.test(s), domain: 'youtube.com' },
    { test: (s) => /showtime/.test(s), domain: 'showtime.com' },
    { test: (s) => /discovery\+?/.test(s), domain: 'discoveryplus.com' },
    { test: (s) => /starz/.test(s), domain: 'starz.com' },
    { test: (s) => /amc\+?/.test(s), domain: 'amcplus.com' },
    { test: (s) => /shudder/.test(s), domain: 'shudder.com' },
    { test: (s) => /britbox/.test(s), domain: 'britbox.com' },
    { test: (s) => /mubi/.test(s), domain: 'mubi.com' },
  ];

  for (const { test, domain } of rules) {
    if (test(n)) {
      return `https://logo.clearbit.com/${domain}`;
    }
  }
  return null;
}
