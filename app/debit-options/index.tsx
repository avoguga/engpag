import React, { useContext, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { UserContext } from "../contexts/UserContext";
import LogoENG from "../(home)/engenharq.svg";
import LogoENGELOT from "../(home)/enegelot.svg";
import Boleto from "./baixarboletoo.svg";
import Historico from "./historico.svg";
import Realizado from "./realizados.svg";
import SaldoDevedor from "./saldodevedo.svg";
import Antecipar from "./antecipar.svg";

const DebitOptionsPage = () => {
  const router = useRouter();
  const { userData, setUserData, installmentsData, setInstallmentsData } =
    useContext(UserContext);
  const { enterpriseName, billReceivableId, receivableBillValue, unityName } =
    useLocalSearchParams();

  // Load userData and installmentsData from localStorage on mount (Web only)
  useEffect(() => {
    if (Platform.OS === "web") {
      try {
        const storedUserData = localStorage.getItem("userData");
        if (storedUserData) {
          const parsedUserData = JSON.parse(storedUserData);
          setUserData(parsedUserData);
        }

        const storedInstallmentsData = localStorage.getItem("installmentsData");
        if (storedInstallmentsData) {
          const parsedInstallmentsData = JSON.parse(storedInstallmentsData);
          setInstallmentsData(parsedInstallmentsData);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do localStorage:", error);
      }
    }
  }, [setUserData, setInstallmentsData]);

  // Save userData to localStorage whenever it changes (Web only)
  useEffect(() => {
    if (Platform.OS === "web" && userData) {
      try {
        localStorage.setItem("userData", JSON.stringify(userData));
      } catch (error) {
        console.error("Erro ao salvar userData no localStorage:", error);
      }
    }
  }, [userData]);

  useEffect(() => {
    if (Platform.OS === "web" && installmentsData) {
      try {
        localStorage.setItem(
          "installmentsData",
          JSON.stringify(installmentsData)
        );
      } catch (error) {
        console.error(
          "Erro ao salvar installmentsData no localStorage:",
          error
        );
      }
    }
  }, [installmentsData]);

  const isTitlePaid = (installments) => {
    const unpaidInstallments = [
      ...(installments.dueInstallments || []),
      ...(installments.payableInstallments || []),
    ];
    return unpaidInstallments.length === 0;
  };

  // Encontra o item em installmentsData que corresponde ao billReceivableId atual
  const selectedResult = installmentsData?.find(
    (result) => result.billReceivableId === parseInt(billReceivableId, 10)
  );

  const handlePaymentsNavigation = () => {
    if (!selectedResult) {
      Alert.alert("Erro", "Dados de parcelas não disponíveis.");
      return;
    }

    router.push({
      pathname: "/payments",
      params: {
        billReceivableId: billReceivableId,
        enterpriseName,
      },
    });
  };

  const handleBoletoNavigation = () => {
    if (!selectedResult) {
      Alert.alert("Erro", "Dados de parcelas não disponíveis.");
      return;
    }

    let lastInstallment = null;

    const unpaidInstallments = [
      ...(selectedResult.dueInstallments || []),
      ...(selectedResult.payableInstallments || []),
    ];

    // Apenas as parcelas em aberto (sem data de pagamento)
    const openInstallments = unpaidInstallments.filter(
      (installment) => !installment.paymentDate
    );

    if (openInstallments.length > 0) {
      openInstallments.sort(
        (a, b) => new Date(b.dueDate) - new Date(a.dueDate)
      );

      lastInstallment = openInstallments[0];

      if (lastInstallment) {
        router.push({
          pathname: "/boleto-screen",
          params: {
            billReceivableId: billReceivableId,
            installmentId: lastInstallment.installmentId,
            enterpriseName,
            unityName: unityName,
          },
        });
      } else {
        Alert.alert("Erro", "Não há parcelas em aberto.");
      }
    } else {
      Alert.alert("Erro", "Não há parcelas em aberto.");
    }
  };

  const handleParcelAntecipationNavigation = () => {
    if (!selectedResult) {
      Alert.alert("Erro", "Dados de parcelas não disponíveis.");
      return;
    }

    router.push({
      pathname: "/parcel-antecipation",
      params: {
        billReceivableId: billReceivableId,
        enterpriseName,
      },
    });
  };

  const handlePaymentsRealizedNavigation = () => {
    if (!selectedResult) {
      Alert.alert("Erro", "Dados de pagamentos não disponíveis.");
      return;
    }

    router.push({
      pathname: "/payments-realized",
      params: {
        billReceivableId: billReceivableId,
        enterpriseName,
      },
    });
  };

  const handleDebtBalance = () => {
    if (!selectedResult) {
      Alert.alert("Erro", "Dados de saldo devedor não disponíveis.");
      return;
    }

    router.push({
      pathname: "/debt-balance",
      params: {
        billReceivableId: billReceivableId,
        enterpriseName,
        receivableBillValue,
      },
    });
  };

  const isPaid = selectedResult ? isTitlePaid(selectedResult) : false;

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.whiteCurve}>
          <Image
            source={require("./engepag-logo.png")}
            style={styles.logoTop}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* <View style={styles.iconContainer}>
        <View style={styles.circleIcon}>
          <Ionicons name="home-outline" size={40} color="white" />
        </View>
        <Text style={styles.title}>
          {enterpriseName || "Nome do Empreendimento"}
        </Text>
      </View> */}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleBoletoNavigation}
          style={[styles.buttonLarge, isPaid && styles.disabledButton]}
          disabled={isPaid}
        >
          <Boleto width={35} height={35} />
          <Text style={[styles.buttonText, isPaid && styles.disabledText]}>
            2ª VIA BOLETO
          </Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.buttonSmall, isPaid && styles.disabledButton]}
            onPress={handleParcelAntecipationNavigation}
            disabled={isPaid}
          >
            <Antecipar width={35} height={35} />
            <Text style={[styles.buttonText, isPaid && styles.disabledText]}>
              ANTECIPAR PARCELAS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonSmall, isPaid && styles.disabledButton]}
            onPress={handleDebtBalance}
            disabled={isPaid}
          >
            <SaldoDevedor width={35} height={35} />
            <Text style={[styles.buttonText, isPaid && styles.disabledText]}>
              SALDO DEVEDOR
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.buttonSmall}
            onPress={handlePaymentsRealizedNavigation}
          >
            <Realizado width={35} height={35} />
            <Text style={styles.buttonText}>PAGAMENTOS REALIZADOS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSmall}
            onPress={handlePaymentsNavigation}
          >
            <Historico width={35} height={35} />
            <Text style={styles.buttonText}>HISTÓRICO DE PAGAMENTOS</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.bottomLogos}>
        <LogoENG
          width={150}
          height={40}
          style={{ transform: [{ translateY: 20 }] }} // Ajusta a posição vertical
        />

        <LogoENGELOT
          width={100}
          height={50}
          style={{ transform: [{ translateY: 20 }] }}
        />
      </View>
      <View style={styles.bottomSection}>
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.back()}
          >
            <Image
              source={require("../seta.png")}
              style={styles.logoBottom}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.navigate("/initial-page")}
          >
            <Image
              source={require("../home.png")}
              style={styles.logoBottom}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  logoBottom: {
    width: 50,
  },
  // Bottom Navigation Styles
  bottomSection: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 140,
    paddingTop: 10,
  },

  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 120,
  },
  navButton: {
    padding: 10,
    marginTop: 20,
  },
  container: {
    flex: 1,
    backgroundColor: "#D00000",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  circleIcon: {
    backgroundColor: "#E1272C",
    borderRadius: 50,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    color: "#333",
    textAlign: "center",
  },
  buttonContainer: {
    marginTop: 50,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 15,
  },
  buttonLarge: {
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginBottom: 15,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    gap: 10,
    flexDirection: "row",
  },
  buttonSmall: {
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    width: "48%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  disabledButton: {
    backgroundColor: "#c6c6c6", // Cor cinza para botão desabilitado
  },
  disabledText: {
    color: "#888", // Cor mais clara para texto desabilitado
  },
  topSection: {
    width: "100%",
    height: 280, // Increased for larger logo area
  },
  whiteCurve: {
    backgroundColor: "white",
    height: "100%",
    borderBottomLeftRadius: 1000,
    borderBottomRightRadius: 1000,
    transform: [{ scaleX: 1.5 }],
    alignItems: "center",
    paddingTop: 40,
    overflow: "hidden",
  },
  logoTop: {
    width: 300, // Larger logo size
    height: 200,
    transform: [{ scaleX: 0.667 }], // Compensate for parent scaleX
  },
  bottomLogos: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
    gap: 30,
  },
});

export default DebitOptionsPage;
