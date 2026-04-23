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
  
  export async function fetchYounifyServices() {
    const connect = await configureYounify();
    return await connect.fetchServices(null);
  }

export async function fetchYounifyContentForConnectedServices() {
  const connect = await configureYounify();

  const linkedResult = await connect.fetchLinkedServices(null);
  const linkedServices = Array.isArray(linkedResult)
    ? linkedResult
    : Array.isArray((linkedResult as any)?.services)
      ? (linkedResult as any).services
      : [];

  console.log("Younify linked services count:", linkedServices.length);
  if (!linkedServices.length) {
    return [];
  }

  const categoriesResult = await connect.fetchCategories(null);
  const categories = Array.isArray(categoriesResult)
    ? categoriesResult
    : Array.isArray((categoriesResult as any)?.categories)
      ? (categoriesResult as any).categories
      : [];

  if (!categories.length) {
    return [];
  }

  const selectedCategory = categories[0];
  console.log(
    "Younify selected category:",
    (selectedCategory as any)?.name ??
      (selectedCategory as any)?.title ??
      String(selectedCategory),
  );

  const contentResult = await connect.fetchContent(
    [selectedCategory],
    linkedServices,
    null,
    null,
    null,
  );

  const flattenToItems = (input: any): any[] => {
    if (!input) return [];
    if (Array.isArray(input)) {
      return input.flatMap((entry) => flattenToItems(entry));
    }
    if (typeof input === "object") {
      if (Array.isArray(input.content)) return flattenToItems(input.content);
      if (Array.isArray(input.items)) return flattenToItems(input.items);
      if (Array.isArray(input.results)) return flattenToItems(input.results);
      if (Array.isArray(input.data)) return flattenToItems(input.data);
      if ((input.title || input.name || input.id) && !input.content && !input.items) {
        return [input];
      }
    }
    return [];
  };

  const normalizedContent = flattenToItems(contentResult);

  const hasTitle = (item: any) =>
    Boolean(String(item?.title ?? item?.name ?? "").trim());
  const getPoster = (item: any) =>
    item?.posterPath ??
    item?.poster_path ??
    item?.imageUrl ??
    item?.image ??
    item?.artworkUrl ??
    item?.artwork ??
    null;
  const getPopularity = (item: any) =>
    Number(
      item?.popularity ??
        item?.score ??
        item?.rating ??
        item?.rank ??
        0,
    );

  const cleanedContent = normalizedContent
    .filter((item) => hasTitle(item) && Boolean(getPoster(item)))
    .sort((a, b) => getPopularity(b) - getPopularity(a))
    .slice(0, 20);

  console.log("Younify content results count:", cleanedContent.length);
  return cleanedContent;
}
