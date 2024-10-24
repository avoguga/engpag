import { Stack } from "expo-router";
import { UserProvider } from "./contexts/UserContext";
import { TouchableOpacity, View, StyleSheet, ActivityIndicator, Text, StatusBar } from "react-native"; // Adicionei StatusBar
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import NotificationIcon from "../components/NotificationIcon"; // Verifique que este ícone está corretamente definido

export default function RootLayout() {
  const router = useRouter();

  return (
    <UserProvider>
      <Stack>
        {/* Rota home/index - Sem header */}
        <Stack.Screen
          name="(home)/index"
          options={{
            headerShown: false, // Desativar header nesta rota
          }}
        />

        <Stack.Screen
          name="notification-screen/index"
          options={{
            headerShown: false, // Desativar header nesta rota
          }}
        />

        {/* Rota boleto-screen */}
        <Stack.Screen
          name="boleto-screen/index"
          options={{
            header: () => (
              <View style={styles.topBarWrapper}>
                <View style={styles.topBar}>
                  <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back-outline" size={28} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.topBarTitle}>2ª Via do Boleto</Text>
                  <NotificationIcon />
                </View>
              </View>
            ),
          }}
        />

        {/* Rota debit-options */}
        <Stack.Screen
          name="debit-options/index"
          options={{
            header: () => (
              <View style={styles.topBarWrapper}>
                <View style={styles.topBar}>
                  <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back-outline" size={28} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.topBarTitle}>Saldo devedor</Text>
                  <NotificationIcon />
                </View>
              </View>
            ),
          }}
        />

        {/* Rota debt-balance */}
        <Stack.Screen
          name="debt-balance/index"
          options={{
            header: () => (
              <View style={styles.topBarWrapper}>
                <View style={styles.topBar}>
                  <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back-outline" size={28} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.topBarTitle}>Saldo devedor</Text>
                  <NotificationIcon />
                </View>
              </View>
            ),
          }}
        />

        {/* Rota initial-page */}
        <Stack.Screen
          name="initial-page/index"
          options={{
            header: () => (
              <View style={styles.topBarWrapper}>
                <View style={styles.topBar}>
                  <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back-outline" size={28} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.topBarTitle}>Início</Text>
                  <NotificationIcon />
                </View>
              </View>
            ),
          }}
        />

        {/* Rota parcel-antecipation */}
        <Stack.Screen
          name="parcel-antecipation/index"
          options={{
            header: () => (
              <View style={styles.topBarWrapper}>
                <View style={styles.topBar}>
                  <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back-outline" size={28} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.topBarTitle}>Antecipação de parcela</Text>
                  <NotificationIcon />
                </View>
              </View>
            ),
          }}
        />

        {/* Rota payments-realized */}
        <Stack.Screen
          name="payments-realized/index"
          options={{
            header: () => (
              <View style={styles.topBarWrapper}>
                <View style={styles.topBar}>
                  <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back-outline" size={28} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.topBarTitle}>Pagamentos realizados</Text>
                  <NotificationIcon />
                </View>
              </View>
            ),
          }}
        />

        {/* Rota refer-friend */}
        <Stack.Screen
          name="refer-friend/index"
          options={{
            header: () => (
              <View style={styles.topBarWrapper}>
                <View style={styles.topBar}>
                  <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back-outline" size={28} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.topBarTitle}>Indicar Amigo</Text>
                  <NotificationIcon />
                </View>
              </View>
            ),
          }}
        />
      </Stack>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  topBarWrapper: {
    paddingTop: StatusBar.currentHeight || 24, // Adiciona padding dinâmico com base na altura da status bar
    backgroundColor: "#E1272C", // Mesma cor de fundo da topBar para criar uma sensação de continuidade
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E1272C",
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  topBarTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
