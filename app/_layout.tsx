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
import { useState } from "react";

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
                    <Ionicons
                      name="arrow-back-outline"
                      size={28}
                      color="white"
                    />
                  </TouchableOpacity>
                  <Text style={styles.topBarTitle}>2ª Via do boleto</Text>
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
                    <Ionicons
                      name="arrow-back-outline"
                      size={28}
                      color="white"
                    />
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
                    <Ionicons
                      name="arrow-back-outline"
                      size={28}
                      color="white"
                    />
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
            header: () => {
              // Define state and functions inside this header function
              const [modalVisible, setModalVisible] = useState(false);

              const handleLogoutPress = () => {
                setModalVisible(true);
              };

              const confirmLogout = async () => {
                try {
                  await AsyncStorage.removeItem("userData");
                  setModalVisible(false);
                  router.replace("/(home)"); // Navigate back to the login screen
                } catch (e) {
                  console.error("Failed to logout", e);
                }
              };

              const cancelLogout = () => {
                setModalVisible(false);
              };

              return (
                <View>
                  <View style={styles.topBarWrapper}>
                    <View style={styles.topBar}>
                      <TouchableOpacity onPress={handleLogoutPress}>
                        <Ionicons
                          name="log-out-outline"
                          size={28}
                          color="white"
                        />
                      </TouchableOpacity>
                      <Text style={styles.topBarTitle}>Início</Text>
                      <NotificationIcon />
                    </View>
                  </View>

                  {/* Modal for logout confirmation */}
                  {modalVisible && (
                    <Modal
                      animationType="fade"
                      transparent={true}
                      visible={modalVisible}
                      onRequestClose={cancelLogout}
                    >
                      <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                          <Text style={styles.modalTitle}>
                            Confirmação de logout
                          </Text>
                          <Text style={styles.modalText}>
                            Tem certeza que deseja sair?
                          </Text>
                          <View style={styles.modalButtonsContainer}>
                            <TouchableOpacity
                              style={styles.modalButton}
                              onPress={confirmLogout}
                            >
                              <Text style={styles.modalButtonText}>Sim</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.modalButton, styles.cancelButton]}
                              onPress={cancelLogout}
                            >
                              <Text style={styles.modalButtonText}>Não</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </Modal>
                  )}
                </View>
              );
            },
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
                    <Ionicons
                      name="arrow-back-outline"
                      size={28}
                      color="white"
                    />
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
                    <Ionicons
                      name="arrow-back-outline"
                      size={28}
                      color="white"
                    />
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
                <View style={styles.topBar}>
                  <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons
                      name="arrow-back-outline"
                      size={28}
                      color="white"
                    />
                  </TouchableOpacity>
                  <Text style={styles.topBarTitle}>
                    Histórico de pagamentos
                  </Text>
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
    paddingTop: StatusBar.currentHeight || 24,
    backgroundColor: "#E1272C",
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
