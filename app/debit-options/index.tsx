import React, { useContext, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { UserContext } from "../contexts/UserContext";

const DebitOptionsPage = () => {
  const router = useRouter();
  const { userData, setUserData, installmentsData, setInstallmentsData } =
    useContext(UserContext);
  const { enterpriseName } = useLocalSearchParams();

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

  // Save installmentsData to localStorage whenever it changes (Web only)
  useEffect(() => {
    if (Platform.OS === "web" && installmentsData) {
      try {
        localStorage.setItem("installmentsData", JSON.stringify(installmentsData));
      } catch (error) {
        console.error("Erro ao salvar installmentsData no localStorage:", error);
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

  const handlePaymentsNavigation = () => {
    if (!installmentsData || installmentsData.length === 0) {
      Alert.alert("Erro", "Dados de parcelas não disponíveis.");
      return;
    }

    const selectedResult = installmentsData[0]; // Seleciona o primeiro item como exemplo; pode ser ajustado conforme a lógica do projeto

    if (selectedResult) {
      router.push({
        pathname: "/payments",
        params: {
          billReceivableId: selectedResult.billReceivableId,
          enterpriseName,
        },
      });
    } else {
      Alert.alert("Erro", "Título não encontrado.");
    }
  };

  const handleReferFriendNavigation = () => {
    router.push({
      pathname: "/refer-friend",
      params: { enterpriseName },
    });
  };

  const handleBoletoNavigation = () => {
    if (!installmentsData || installmentsData.length === 0) {
      Alert.alert("Erro", "Dados de parcelas não disponíveis.");
      return;
    }

    let lastInstallment = null;
    let selectedResult = null;

    installmentsData.forEach((result) => {
      const unpaidInstallments = [
        ...(result.dueInstallments || []),
        ...(result.payableInstallments || []),
      ];

      // Filtrar apenas as parcelas em aberto (sem data de pagamento)
      const openInstallments = unpaidInstallments.filter(
        (installment) => !installment.paymentDate
      );

      if (openInstallments.length > 0) {
        openInstallments.sort(
          (a, b) => new Date(b.dueDate) - new Date(a.dueDate)
        );

        const latestInstallment = openInstallments[0];

        if (
          !lastInstallment ||
          new Date(latestInstallment.dueDate) > new Date(lastInstallment.dueDate)
        ) {
          lastInstallment = latestInstallment;
          selectedResult = result;
        }
      }
    });

    if (lastInstallment && selectedResult) {
      router.push({
        pathname: "/boleto-screen",
        params: {
          billReceivableId: selectedResult.billReceivableId,
          installmentId: lastInstallment.installmentId,
          enterpriseName,
        },
      });
    } else {
      Alert.alert("Erro", "Não há parcelas em aberto.");
    }
  };

  const handleParcelAntecipationNavigation = () => {
    if (!installmentsData || installmentsData.length === 0) {
      Alert.alert("Erro", "Dados de parcelas não disponíveis.");
      return;
    }

    const selectedResult = installmentsData[0];

    if (selectedResult) {
      router.push({
        pathname: "/parcel-antecipation",
        params: {
          billReceivableId: selectedResult.billReceivableId,
          enterpriseName,
        },
      });
    } else {
      Alert.alert("Erro", "Título não encontrado.");
    }
  };

  const handlePaymentsRealizedNavigation = () => {
    if (!installmentsData || installmentsData.length === 0) {
      Alert.alert("Erro", "Dados de pagamentos não disponíveis.");
      return;
    }

    const selectedResult = installmentsData[0];

    if (selectedResult) {
      router.push({
        pathname: "/payments-realized",
        params: {
          billReceivableId: selectedResult.billReceivableId,
          enterpriseName,
        },
      });
    } else {
      Alert.alert("Erro", "Título não encontrado.");
    }
  };

  const handleDebtBalance = () => {
    if (!installmentsData || installmentsData.length === 0) {
      Alert.alert("Erro", "Dados de saldo devedor não disponíveis.");
      return;
    }

    const selectedResult = installmentsData[0];

    if (selectedResult) {
      router.push({
        pathname: "/debt-balance",
        params: {
          billReceivableId: selectedResult.billReceivableId,
          enterpriseName,
        },
      });
    } else {
      Alert.alert("Erro", "Título não encontrado.");
    }
  };

 
  const isPaid =
    installmentsData?.length > 0 && isTitlePaid(installmentsData[0]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <View style={styles.circleIcon}>
          <Ionicons name="home-outline" size={40} color="white" />
        </View>
        <Text style={styles.title}>
          {enterpriseName || "Nome do Empreendimento"}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleBoletoNavigation}
          style={[styles.buttonLarge, isPaid && styles.disabledButton]}
          disabled={isPaid}
        >
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
            <Text style={[styles.buttonText, isPaid && styles.disabledText]}>
              ANTECIPAR PARCELAS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonSmall, isPaid && styles.disabledButton]}
            onPress={handleDebtBalance}
            disabled={isPaid}
          >
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
            <Text style={styles.buttonText}>PAGAMENTOS REALIZADOS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSmall}
            onPress={handlePaymentsNavigation}
          >
            <Text style={styles.buttonText}>HISTÓRICO DE PAGAMENTOS</Text>
          </TouchableOpacity>
          {/* 
          <TouchableOpacity
            style={styles.buttonSmall}
            onPress={handleReferFriendNavigation}
          >
            <Text style={styles.buttonText}>INDIQUE UM AMIGO</Text>
          </TouchableOpacity> */}
        </View>

        {/* <TouchableOpacity
          style={styles.buttonLarge}
          onPress={handlePaymentsNavigation}
        >
          <Text style={styles.buttonText}>HISTÓRICO DE PAGAMENTOS</Text>
        </TouchableOpacity> */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F8",
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
});

export default DebitOptionsPage;
