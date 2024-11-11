import React, { useState, useContext, useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { useLocalSearchParams } from "expo-router";

const PaymentsCompleted = () => {
  const { userData } = useContext(UserContext);
  const { billReceivableId, enterpriseName } = useLocalSearchParams();
  const [completedPayments, setCompletedPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedParcel, setSelectedParcel] = useState("Número da Parcela");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Refs para inputs de data na web
  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);

  useEffect(() => {
    fetchCompletedPayments();
  }, [userData, billReceivableId]);

  const fetchCompletedPayments = async () => {
    if (!userData || (!userData.cpf && !userData.cnpj)) {
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

      const searchParam = userData.cpf
        ? { cpf: userData.cpf, correctAnnualInstallment: "N" }
        : { cnpj: userData.cnpj, correctAnnualInstallment: "N" };

      const response = await axios.get(
        "https://engpag.backend.gustavohenrique.dev/proxy/current-debit-balance",
        {
          params: searchParam,
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
        // Extrair e formatar a data de pagamento do recibo
        let paymentDate = null;
        let formattedPaymentDate = "Data indisponível";
        let receiptValue = "Valor indisponível";

        if (
          installment.receipts &&
          installment.receipts.length > 0 &&
          installment.receipts[0].receiptDate
        ) {
          // Ajuste para data UTC no receiptDate
          const receiptDate = installment.receipts[0].receiptDate;
          const [year, month, day] = receiptDate.split("-");
          paymentDate = new Date(Date.UTC(year, month - 1, day));
          formattedPaymentDate = `${day}/${month}/${year}`;

          // Extrair receiptValue
          receiptValue = parseFloat(installment.receipts[0].receiptValue).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });
        }

        // Ajuste para data UTC no dueDate
        const dueDate = installment.dueDate;
        let formattedDueDate = "Data indisponível";
        if (dueDate) {
          const [dueYear, dueMonth, dueDay] = dueDate.split("-");
          const dueDateUTC = new Date(Date.UTC(dueYear, dueMonth - 1, dueDay));
          formattedDueDate = `${dueDay}/${dueMonth}/${dueYear}`;
        }

        return {
          id: installment.installmentId.toString(),
          number: installment.installmentNumber,
          billReceivableId: selectedResult.billReceivableId,
          dueDate: dueDate, // Mantém a data original se precisar usá-la
          formattedDueDate: formattedDueDate, // Data formatada para exibição
          paymentDate: paymentDate, // Data do pagamento
          formattedPaymentDate: formattedPaymentDate, // Data do pagamento formatada
          value: parseFloat(installment.originalValue).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          indexerName: installment.indexerName || "N/A",
          conditionType: installment.conditionType || "N/A",
          adjustedValue: parseFloat(installment.adjustedValue).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          originalValue: parseFloat(installment.originalValue).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          receiptValue: receiptValue,
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
    setStartDateInput("");
    setEndDateInput("");
  };

  const handleDateInputWithMask = (text, setDate, setDateInput) => {
    let formattedText = text.replace(/\D/g, "");

    if (formattedText.length > 2) {
      formattedText = formattedText.replace(/(\d{2})(\d)/, "$1/$2");
    }
    if (formattedText.length > 5) {
      formattedText = formattedText.replace(/(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
    }
    if (formattedText.length > 10) {
      formattedText = formattedText.slice(0, 10);
    }

    setDateInput(formattedText);

    if (formattedText.length === 10) {
      const [day, month, year] = formattedText.split("/");
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date)) {
        setDate(date);
      } else {
        Alert.alert("Erro", "Data inválida.");
      }
    }
  };

  const handleWebDateChange = (selectedDate, setDate, setDateInput) => {
    if (selectedDate) {
      setDate(selectedDate);
      setDateInput(selectedDate.toLocaleDateString("pt-BR"));
    }
  };

  const openWebDatePicker = (inputRef) => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const renderDateInput = (
    inputType,
    date,
    setDate,
    dateInput,
    setDateInput,
    inputRef
  ) => (
    <View style={styles.dateInputContainer}>
      {Platform.OS === "web" ? (
        <>
          <TextInput
            style={[
              styles.dateInput,
              dateInput.length === 10 ? styles.validInput : styles.invalidInput,
            ]}
            placeholder="DD/MM/AAAA"
            value={dateInput}
            onChangeText={(text) => handleDateInputWithMask(text, setDate, setDateInput)}
            keyboardType="numeric"
            maxLength={10}
          />
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => openWebDatePicker(inputRef)}
          >
            <Ionicons name="calendar-outline" size={24} color="#E1272C" />
          </TouchableOpacity>
          {/* Input type="date" oculto */}
          <input
            type="date"
            style={styles.hiddenDateInput}
            ref={inputRef}
            onChange={(e) =>
              handleWebDateChange(
                e.target.value ? new Date(e.target.value) : null,
                setDate,
                setDateInput
              )
            }
          />
        </>
      ) : (
        <>
          <TextInput
            style={[
              styles.dateInput,
              dateInput.length === 10 ? styles.validInput : styles.invalidInput,
            ]}
            placeholder="DD/MM/AAAA"
            value={dateInput}
            onChangeText={(text) => handleDateInputWithMask(text, setDate, setDateInput)}
            keyboardType="numeric"
            maxLength={10}
          />
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setShowStartDatePicker(inputType === "start")}
          >
            <Ionicons name="calendar-outline" size={24} color="#E1272C" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardNotice}>
          {item.receiptValue !== "Valor indisponível" ? "Pagamento Realizado" : "Pagamento Indisponível"}
        </Text>
        <Ionicons
          name={item.receiptValue !== "Valor indisponível" ? "checkmark-circle" : "close-circle"}
          size={20}
          color={item.receiptValue !== "Valor indisponível" ? "#28a745" : "#dc3545"}
        />
      </View>
      <Text style={styles.cardTitle}>Parcela: {item.number}</Text>
      <Text style={styles.cardSubtitle}>Título: {item.billReceivableId}</Text>
      <Text style={styles.cardSubtitle}>Vencimento: {item.formattedDueDate}</Text>
      <Text style={styles.cardSubtitle}>Pagamento: {item.formattedPaymentDate}</Text>
      <Text style={styles.cardValue}>Valor: {item.value}</Text>
      {/* Novos campos adicionados */}
      <Text style={styles.cardSubtitle}>Indexador: {item.indexerName}</Text>
      <Text style={styles.cardSubtitle}>Tipo de Condição: {item.conditionType}</Text>
      <Text style={styles.cardSubtitle}>Valor do Recibo: {item.receiptValue}</Text>
      <Text style={styles.cardSubtitle}>Valor Ajustado: {item.adjustedValue}</Text>
      <Text style={styles.cardSubtitle}>Valor Original: {item.originalValue}</Text>
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
      <Text style={styles.title}>
        {enterpriseName || "Nome do Empreendimento"}
      </Text>
      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionButtonText}>PAGAMENTOS REALIZADOS</Text>
      </TouchableOpacity>

      {/* Filtro por parcela */}
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedParcel}
          style={styles.picker}
          onValueChange={(itemValue) => setSelectedParcel(itemValue)}
        >
          {parcelNumbers.map((parcelNumber) => (
            <Picker.Item
              key={parcelNumber}
              label={
                parcelNumber === "Número da Parcela"
                  ? parcelNumber
                  : `Parcela ${parcelNumber}`
              }
              value={parcelNumber}
            />
          ))}
        </Picker>
      </View>

      {/* Filtro por intervalo de datas */}
      <View style={styles.dateFilterContainer}>
        {renderDateInput(
          "start",
          startDate,
          setStartDate,
          startDateInput,
          setStartDateInput,
          startDateInputRef
        )}
        {renderDateInput(
          "end",
          endDate,
          setEndDate,
          endDateInput,
          setEndDateInput,
          endDateInputRef
        )}
      </View>

      {/* Botão de Resetar Filtros */}
      <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
        <Text style={styles.resetButtonText}>Resetar Filtros</Text>
      </TouchableOpacity>

      {/* DateTimePickers para plataformas móveis */}
      {Platform.OS !== "web" && showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              setStartDate(selectedDate);
              setStartDateInput(selectedDate.toLocaleDateString("pt-BR"));
            }
          }}
          minimumDate={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)}
        />
      )}

      {Platform.OS !== "web" && showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setEndDate(selectedDate);
              setEndDateInput(selectedDate.toLocaleDateString("pt-BR"));
            }
          }}
          minimumDate={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)}
        />
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#E1272C" style={{ marginTop: 20 }} />
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
    padding: 16,
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 10,
    color: "#333",
  },
  actionButton: {
    backgroundColor: "#E1272C",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textTransform: "uppercase",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 16,
    marginHorizontal: 16,
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  picker: {
    height: 50,
    width: "100%",
    color: "#333",
  },
  dateFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    marginHorizontal: 16,
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  validInput: {
    borderColor: "#28a745",
  },
  invalidInput: {
    borderColor: "#dc3545",
  },
  calendarButton: {
    marginLeft: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
  resetButton: {
    backgroundColor: "#E1272C",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardNotice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#E1272C",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
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
    color: "#555",
    marginTop: 20,
  },
  hiddenDateInput: {
    position: "absolute",
    left: -9999,
    opacity: 0,
    pointerEvents: "none",
  },
});

export default PaymentsCompleted;
