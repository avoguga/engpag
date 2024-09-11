import { Stack } from "expo-router";
import { UserProvider } from "./contexts/UserContext";

export default function RootLayout() {
  return (
    <UserProvider>
      <Stack>
        <Stack.Screen name="(home)" />
      </Stack>
    </UserProvider>
  );
}
