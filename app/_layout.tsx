import { Stack } from "expo-router";
import { UserProvider } from "./contexts/UserContext";

export default function RootLayout() {
  return (
    <UserProvider>
      <Stack>
        <Stack.Screen name="(home)" options={{
          headerShown: false
        }}/>
         <Stack.Screen name="boleto" />
         <Stack.Screen name="debit-balance" />
         {/* <Stack.Screen name="parcel-antecipation" /> */}
      </Stack>
    </UserProvider>
  );
}
