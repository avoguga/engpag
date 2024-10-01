import React, { useContext, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { UserContext } from "../contexts/UserContext";

const DebitOptionsPage = () => {
  const router = useRouter();
  const { installmentsData } = useContext(UserContext);

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

      const overdueOrPendingInstallments = unpaidInstallments.filter(
        (installment) => {
          const dueDate = new Date(installment.dueDate);
          const today = new Date();
          return dueDate <= today;
        }
      );

      if (overdueOrPendingInstallments.length > 0) {
        overdueOrPendingInstallments.sort(
          (a, b) => new Date(b.dueDate) - new Date(a.dueDate)
        );

        const latestInstallment = overdueOrPendingInstallments[0];

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
        },
      });
    } else {
      Alert.alert("Erro", "Não há parcelas vencidas ou pendentes.");
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
        },
      });
    } else {
      Alert.alert("Erro", "Título não encontrado.");
    }
  };

  // Função de navegação para "Pagamentos Realizados"
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

    console.log('oiii')

    if (selectedResult) {
      router.push({
        pathname: "/debt-balance",
        params: {
          billReceivableId: selectedResult.billReceivableId,
        },
      });
    } else {
      Alert.alert("Erro", "Título não encontrado.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra superior */}
      <View style={styles.topBar}>
        <Ionicons name="menu" size={30} color="white" />
        <Ionicons name="notifications-outline" size={30} color="white" />
      </View>

      {/* Ícone e nome do empreendimento */}
      <View style={styles.iconContainer}>
        <View style={styles.circleIcon}>
          <Ionicons name="home-outline" size={40} color="white" />
        </View>
        <Text style={styles.title}>RESIDENCIAL GRAND RESERVA</Text>
      </View>

      {/* Botões de opções */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleBoletoNavigation} style={styles.buttonLarge}>
          <Text style={styles.buttonText}>2ª VIA BOLETO</Text>
        </TouchableOpacity>

        <View style={styles.row}> 
          <TouchableOpacity style={styles.buttonSmall} onPress={handleParcelAntecipationNavigation}>
            <Text style={styles.buttonText}>ANTECIPAR PARCELAS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonSmall} onPress={handleDebtBalance}>
            <Text style={styles.buttonText}>SALDO DEVEDOR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.buttonSmall}
            onPress={handlePaymentsRealizedNavigation} // Navegar para a tela de pagamentos realizados
          >
            <Text style={styles.buttonText}>PAGAMENTOS REALIZADOS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonSmall}>
            <Text style={styles.buttonText}>INDIQUE UM AMIGO</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.buttonLarge}>
          <Text style={styles.buttonText}>HISTÓRICO DE PAGAMENTOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F8",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "red",
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  circleIcon: {
    backgroundColor: "red",
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
    textAlign: "center", // Centraliza o título
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
    textAlign: "center", // Centraliza o texto
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
    textAlign: "center", // Centraliza o texto
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center", // Garante que o texto do botão está centralizado
  },
});

export default DebitOptionsPage;
