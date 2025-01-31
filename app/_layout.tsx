import { Stack } from "expo-router";
import { UserProvider } from "./contexts/UserContext";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  StatusBar,
  Modal,
} from "react-native"; // Adicionei StatusBar
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import NotificationIcon from "../components/NotificationIcon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import * as Font from 'expo-font';

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      await Font.loadAsync({
        'Neulis-Regular': require('../assets/fonts/Neulis/Neulis-Regular.ttf'),
        'Neulis-Bold': require('../assets/fonts/Neulis/Neulis-Bold.otf'),
        'Neulis-Medium': require('../assets/fonts/Neulis/Neulis-Medium.otf'),
      });
      setFontsLoaded(true);
    };
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    console.log('painho')
    return null; // ou algum indicador de carregamento, como um spinner
  }

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
                 
                </View>
              </View>
            ),
          }}
        />

        {/* Rota debit-options */}
        <Stack.Screen
          name="debit-options/index"
          options={{
            header: () => null,
          }}
        />

        {/* Rota debt-balance */}
        <Stack.Screen
          name="debt-balance/index"
          options={{
            header: () => (
              <View style={styles.topBarWrapper}>
                <View style={styles.topBar}>
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
                <View style={styles.topBar}></View>
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
                    <Ionicons
                      name="arrow-back-outline"
                      size={28}
                      color="white"
                    />
                  </TouchableOpacity>
                  <Text style={styles.topBarTitle}>Indicar Amigo</Text>
                  <NotificationIcon />
                </View>
              </View>
            ),
          }}
        />

        {/* Rota payments */}
        <Stack.Screen
          name="payments/index"
          options={{
            header: () => (
              <View style={styles.topBarWrapper}>
               
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
    paddingTop: StatusBar.currentHeight || 24,
    backgroundColor: "#D00000",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#D00000",
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  topBarWrapperWhite: {
    paddingTop: StatusBar.currentHeight || 24,
    backgroundColor: "#fff",
  },
  topBarWhite: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  topBarTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: 'Neulis-Regular',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#E1272C",
  },
  modalText: {
    fontSize: 18,
    marginBottom: 25,
    textAlign: "center",
    color: "#333",
  },
  modalButtonsContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#E1272C",
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#5B5B5B",
  },
  modalButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
