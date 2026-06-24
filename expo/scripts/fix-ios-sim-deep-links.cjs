#!/usr/bin/env node
/**
 * Allow Expo dev-client deep links on iOS Simulator without the
 * "Open in 'One Pager'?" confirmation dialog (simulator reboot wipes this).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const bplistCreator = require('bplist-creator');
const bplistParser = require('bplist-parser');

const APP_ID = 'app.rork.OPbeta';
const SCHEMES = ['onepager', 'app.rork.opbeta', 'app.rork.OPbeta'];

function bootedUdid() {
  const out = execSync('xcrun simctl list devices booted -j', { encoding: 'utf8' });
  const json = JSON.parse(out);
  for (const runtime of Object.values(json.devices)) {
    for (const device of runtime) {
      if (device.state === 'Booted') return device.udid;
    }
  }
  throw new Error('No booted iOS simulator found. Boot Simulator first.');
}

function readPlist(plistPath) {
  if (!fs.existsSync(plistPath)) return {};
  const raw = fs.readFileSync(plistPath);
  const parsed = bplistParser.parseBuffer(raw);
  return parsed[0] && typeof parsed[0] === 'object' ? parsed[0] : {};
}

function main() {
  const udid = bootedUdid();
  const plistPath = path.join(
    os.homedir(),
    'Library/Developer/CoreSimulator/Devices',
    udid,
    'data/Library/Preferences/com.apple.launchservices.schemeapproval.plist',
  );

  const data = readPlist(plistPath);
  for (const scheme of SCHEMES) {
    data[`com.apple.CoreSimulator.CoreSimulatorBridge-->${scheme}`] = APP_ID;
  }

  fs.mkdirSync(path.dirname(plistPath), { recursive: true });
  fs.writeFileSync(plistPath, bplistCreator(data));
  console.log(`Updated deep-link permissions for simulator ${udid}`);
}

main();
