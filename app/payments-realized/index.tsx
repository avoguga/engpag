import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UserContext } from "../contexts/UserContext";
import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";
import NotificationIcon from "@/components/NotificationIcon";

const PaymentsCompleted = () => {
  const { userData } = useContext(UserContext);
  const { billReceivableId } = useLocalSearchParams();
  const [completedPayments, setCompletedPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedParcel, setSelectedParcel] = useState("Número da Parcela");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    fetchCompletedPayments();
  }, [userData, billReceivableId]);

  const fetchCompletedPayments = async () => {
    if (!userData || !userData.cpf) {
      Alert.alert("Erro", "Dados do cliente não encontrados.");
      return;
    }

    if (!billReceivableId) {
      Alert.alert("Erro", "ID do título não fornecido.");
      return;
    }

    setLoading(true);

    try {
      const username = "engenharq-mozart";
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`);

      const response = await axios.get(
        "https://api.sienge.com.br/engenharq/public/api/v1/current-debit-balance",
        {
          params: {
            cpf: userData.cpf,
            correctAnnualInstallment: "N",
          },
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      const results = response.data.results || [];

      // Encontrar o resultado que corresponde ao billReceivableId
      const selectedResult = results.find(
        (result) => result.billReceivableId == billReceivableId
      );

      if (!selectedResult) {
        Alert.alert("Erro", "Título não encontrado.");
        setLoading(false);
        return;
      }

      const { paidInstallments } = selectedResult;

      if (!paidInstallments || paidInstallments.length === 0) {
        Alert.alert("Aviso", "Nenhum pagamento realizado encontrado.");
        setCompletedPayments([]);
        setLoading(false);
        return;
      }

      // Mapear as parcelas pagas para o formato desejado
      const payments = paidInstallments.map((installment) => {
        // Extrair a data de pagamento do primeiro recibo
        let paymentDate = null;
        let formattedPaymentDate = "Data indisponível";

        if (
          installment.receipts &&
          installment.receipts.length > 0 &&
          installment.receipts[0].receiptDate
        ) {
          paymentDate = new Date(installment.receipts[0].receiptDate);
          formattedPaymentDate = paymentDate.toLocaleDateString("pt-BR");
        }

        return {
          id: installment.installmentId.toString(),
          number: installment.installmentNumber,
          billReceivableId: selectedResult.billReceivableId,
          dueDate: new Date(installment.dueDate),
          formattedDueDate: new Date(installment.dueDate).toLocaleDateString(
            "pt-BR"
          ),
          paymentDate: paymentDate,
          formattedPaymentDate: formattedPaymentDate,
          value: parseFloat(installment.originalValue).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
        };
      });

      setCompletedPayments(payments);
    } catch (error) {
      console.error("Erro ao buscar parcelas pagas:", error);
      Alert.alert("Erro", "Não foi possível obter as parcelas pagas.");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedParcel("Número da Parcela");
    setStartDate(null);
    setEndDate(null);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Número da Parcela {item.number}</Text>
      <Text style={styles.cardSubtitle}>
        Número do Título {item.billReceivableId}
      </Text>
      <Text style={styles.cardSubtitle}>
        Vencimento: {item.formattedDueDate}
      </Text>
      <Text style={styles.cardSubtitle}>
        Data de Pagamento: {item.formattedPaymentDate}
      </Text>
      <Text style={styles.cardValue}>Valor: {item.value}</Text>
    </View>
  );

  const parcelNumbers = [
    "Número da Parcela",
    ...new Set(completedPayments.map((item) => item.number)),
  ];

  const filteredData = completedPayments.filter((item) => {
    // Filtrar por número da parcela
    if (
      selectedParcel !== "Número da Parcela" &&
      item.number !== selectedParcel
    ) {
      return false;
    }

    // Filtrar por data de pagamento
    const paymentDate = item.paymentDate;
    if (startDate && (!paymentDate || paymentDate < startDate)) {
      return false;
    }
    if (endDate && (!paymentDate || paymentDate > endDate)) {
      return false;
    }

    return true;
  });

  return (
    <View style={styles.container}>
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamentos Realizados</Text>
        <TouchableOpacity onPress={() => router.push("/notification-screen")}>
          <Ionicons name="notifications-outline" size={28} color="white" />
        </TouchableOpacity>
      </View> */}

      <Text style={styles.title}>ENGENHARQ LTDA</Text>
      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionButtonText}>PAGAMENTOS REALIZADOS</Text>
      </TouchableOpacity>

      {/* Filtro por parcela */}
      <View style={styles.searchContainer}>
        <Picker
          selectedValue={selectedParcel}
          style={styles.picker}
          onValueChange={(itemValue) => setSelectedParcel(itemValue)}
        >
          {parcelNumbers.map((parcelNumber) => (
            <Picker.Item
              key={parcelNumber}
              label={parcelNumber.toString()}
              value={parcelNumber}
            />
          ))}
        </Picker>
      </View>

      {/* Filtro por intervalo de datas */}
      <View style={styles.dateFilterContainer}>
        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#E1272C" />
          <Text style={styles.dateText}>
            {startDate ? startDate.toLocaleDateString("pt-BR") : "Data inicial"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#E1272C" />
          <Text style={styles.dateText}>
            {endDate ? endDate.toLocaleDateString("pt-BR") : "Data final"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botão de Resetar Filtros */}
      <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
        <Text style={styles.resetButtonText}>Resetar Filtros</Text>
      </TouchableOpacity>

      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) setStartDate(selectedDate);
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) setEndDate(selectedDate);
          }}
        />
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#E1272C" />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={styles.list}
          ListEmptyComponent={
            <Text style={styles.noDataText}>
              Nenhum pagamento realizado encontrado.
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF6F6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E1272C",
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 16,
    color: "#333",
  },
  actionButton: {
    backgroundColor: "#E1272C",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 16,
    marginHorizontal: 16,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textTransform: "uppercase",
  },
  searchContainer: {
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 16,
    paddingHorizontal: 12,
    marginHorizontal: 16,
  },
  picker: {
    height: 50,
    color: "#333",
  },
  dateFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    marginHorizontal: 16,
  },
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    width: "48%",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: "#E1272C",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 16,
    marginHorizontal: 16,
  },
  resetButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  list: {
    flex: 1,
    marginHorizontal: 16,
  },
  card: {
    padding: 16,
    backgroundColor: "#B9EBCE",
    borderRadius: 8,
    marginBottom: 12,
    borderColor: "#333",
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E1272C",
    marginTop: 8,
  },
  noDataText: {
    textAlign: "center",
    fontSize: 16,
    color: "#333",
  },
});

export default PaymentsCompleted;
