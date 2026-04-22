import Constants from "expo-constants";
import {
    Connect,
    ConnectOptions,
    LogLevel,
    type TokenHandler,
  } from "react-native-younify-connect-sdk";
  
  let configured = false;
  
  export async function configureYounify() {
    if (configured) return Connect.shared;
  
    const sdkKey =
  Constants.expoConfig?.extra?.younifySdkKey ??
  process.env.EXPO_PUBLIC_YOUNIFY_SDK_KEY;
  
    if (!sdkKey) {
      throw new Error("Missing EXPO_PUBLIC_YOUNIFY_SDK_KEY");
    }
  
    const tokenHandler: TokenHandler = new (class implements TokenHandler {
      onRenew(
        _expiredAccessToken: string | null,
        _refreshToken: string | null,
        renewed: (newAccessToken: string | null, newRefreshToken: string | null) => void
      ): void {
        renewed(null, null);
      }
  
      onRenewed(_newAccessToken: string, _newRefreshToken: string): void {
        // add secure persistence later
      }
    })();

    console.log("YOUNIFY SDK KEY (final):", sdkKey);
  
    const options: ConnectOptions = {
        key: sdkKey,
        logLevel: LogLevel.Warning,
        tokenHandler,
        accessToken: null,
        refreshToken: null,
      };
  
    const connect = Connect.shared;
    await connect.configure(options);
  
    configured = true;
    return connect;
  }
  
  export async function testYounifyServices() {
    const connect = await configureYounify();
    return await connect.fetchServices(null);
  }
