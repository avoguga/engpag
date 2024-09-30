import { Stack } from "expo-router";
import { UserProvider } from "../contexts/UserContext";

export default function RootLayout() {
  return (
      <Stack>
        <Stack.Screen name="index"  />
      </Stack>
  );
}
