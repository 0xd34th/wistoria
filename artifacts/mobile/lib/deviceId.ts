import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "@roomlab_device_id";

function generateId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

// A stable, anonymous identifier for this device so a user's saved redesigns
// can be associated with them server-side without requiring a login. The value
// is a short string, so it is safe to keep in AsyncStorage (unlike the large
// base64 images we now persist in the database instead).
export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = generateId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}
