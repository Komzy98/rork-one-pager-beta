/**
 * react-native-younify-connect-sdk ships ios/YounifyConnectSDK.xcframework.zip and relies on
 * postinstall to extract it. That script swallows errors, so CI/EAS can end up with no xcframework
 * and Xcode fails with 'YounifyConnectSDK/Logging.h' file not found.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const sdkIos = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-younify-connect-sdk",
  "ios",
);
const marker = path.join(sdkIos, "YounifyConnectSDK.xcframework", "Info.plist");
const zipPath = path.join(sdkIos, "YounifyConnectSDK.xcframework.zip");

function main() {
  if (fs.existsSync(marker)) {
    return;
  }
  if (!fs.existsSync(zipPath)) {
    console.warn(
      "[ensure-younify-ios-framework] Zip not found; skipping (Younify iOS native SDK unavailable).",
    );
    return;
  }
  console.log("[ensure-younify-ios-framework] Extracting YounifyConnectSDK.xcframework…");
  execFileSync("unzip", ["-o", "-q", zipPath, "-d", sdkIos], { stdio: "inherit" });
  if (!fs.existsSync(marker)) {
    throw new Error(
      "[ensure-younify-ios-framework] Extraction finished but xcframework is still missing.",
    );
  }
}

main();
