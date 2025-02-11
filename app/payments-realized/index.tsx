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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { router, useLocalSearchParams } from "expo-router";
import NotificationIcon from "@/components/NotificationIcon";

const excludedConditionTypes = [
  "Cartão de crédito",
  "Cartão de débito",
  "Sinal",
  "Financiamento",
  "Promissória",
  "Valor do terreno",
];

const filterValidPayments = (payments: any) => {
  return payments.filter(
    (payment) => !excludedConditionTypes.includes(payment.conditionType.trim())
  );
};

const formatConditionType = (text: string) => {
  return text.toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
};

const PaymentsCompleted = () => {
  const { userData } = useContext(UserContext);
  const { billReceivableId, enterpriseName } = useLocalSearchParams();
  const [completedPayments, setCompletedPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedParcel, setSelectedParcel] = useState("Número da parcela");
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
      const password = "wfW2ra73xSbH5r4AbQne4WesFDb1NaWe"; // Substitua 'sua_senha' pela senha correta
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
        let receiptNetValue = "Valor indisponível";

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

          // Extrair receiptNetValue
          receiptNetValue = parseFloat(
            installment.receipts[0].receiptNetValue
          ).toLocaleString("pt-BR", {
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
          value: parseFloat(
            installment.receipts[0].receiptNetValue
          ).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          indexerName: installment.indexerName || "N/A",
          conditionType: installment.conditionType || "N/A",
          originalValue: parseFloat(installment.originalValue).toLocaleString(
            "pt-BR",
            {
              style: "currency",
              currency: "BRL",
            }
          ),
          receiptNetValue: receiptNetValue,
        };
      });

      const validPayments = filterValidPayments(payments);

      setCompletedPayments(validPayments);
    } catch (error) {
      console.error("Erro ao buscar parcelas pagas:", error);
      Alert.alert("Erro", "Não foi possível obter as parcelas pagas.");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedParcel("Número da parcela");
    setStartDate(null);
    setEndDate(null);
    setStartDateInput("");
    setEndDateInput("");
  };

  // Função atualizada para melhorar a máscara de entrada de data
  const handleDateInputWithMask = (text, setDate, setDateInput) => {
    let formattedText = text.replace(/\D/g, "");

    // Limitar o dia a 31 e o mês a 12 durante a digitação
    if (formattedText.length >= 1) {
      const day = formattedText.substring(0, 2);
      if (parseInt(day, 10) > 31) {
        formattedText = "31";
      }
    }

    if (formattedText.length >= 3) {
      const month = formattedText.substring(2, 4);
      if (parseInt(month, 10) > 12) {
        formattedText =
          formattedText.substring(0, 2) + "12" + formattedText.substring(4);
      }
    }

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
      const [dayStr, monthStr, yearStr] = formattedText.split("/");
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);

      // Verificar se os valores de dia, mês e ano são válidos
      const isValidDate =
        day > 0 &&
        day <= 31 &&
        month > 0 &&
        month <= 12 &&
        year >= 1900 &&
        year <= 2100;

      if (isValidDate) {
        const date = new Date(year, month - 1, day);
        // Verificar se a data é válida (por exemplo, não permitir 31 de fevereiro)
        if (
          date &&
          date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === day
        ) {
          setDate(date);
        } else {
          Alert.alert("Erro", "Data inválida.");
          setDate(null);
        }
      } else {
        Alert.alert("Erro", "Data inválida.");
        setDate(null);
      }
    } else {
      setDate(null);
    }
  };

  // Função renderDateInput atualizada para corrigir o showEndDatePicker
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
            onChangeText={(text) =>
              handleDateInputWithMask(text, setDate, setDateInput)
            }
            keyboardType="numeric"
            maxLength={10}
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
            onChangeText={(text) =>
              handleDateInputWithMask(text, setDate, setDateInput)
            }
            keyboardType="numeric"
            maxLength={10}
          />
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => {
              if (inputType === "start") {
                setShowStartDatePicker(true);
              } else if (inputType === "end") {
                setShowEndDatePicker(true);
              }
            }}
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
          {item.receiptNetValue !== "Valor indisponível"
            ? "Pagamento realizado"
            : "Pagamento indisponível"}
        </Text>
        <Ionicons
          name={
            item.receiptNetValue !== "Valor indisponível"
              ? "checkmark-circle"
              : "close-circle"
          }
          size={20}
          color={
            item.receiptNetValue !== "Valor indisponível"
              ? "#28a745"
              : "#dc3545"
          }
        />
      </View>
      <Text style={styles.cardTitle}>
        {formatConditionType(item.conditionType)}: {item.number}
      </Text>
      <Text style={styles.cardSubtitle}>
        Vencimento: {item.formattedDueDate}
      </Text>
      <Text style={styles.cardSubtitle}>
        Pagamento: {item.formattedPaymentDate}
      </Text>
      <Text style={styles.cardSubtitle}>Indexador: {item.indexerName}</Text>
      <Text style={styles.cardValue}>Valor: {item.value}</Text>
    </View>
  );

  const parcelNumbers = [
    "Número da parcela",
    ...new Set(completedPayments.map((item) => item.number)),
  ];

  const filteredData = completedPayments.filter((item) => {
    if (selectedParcel === "Número da parcela" && !startDate && !endDate) {
      return true;
    }

    // Filtrar por número da parcela
    if (
      selectedParcel !== "Número da parcela" &&
      item.number !== selectedParcel
    ) {
      return false;
    }

    // Filtrar por data de pagamento apenas se as datas estiverem definidas
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
      <View style={styles.content}>
        <View style={styles.headerName}>
          <Text style={styles.greeting}>
            Olá,{" "}
            {userData?.name
              ? userData.name
                  .toLowerCase()
                  .split(" ")
                  .slice(0, 1)
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ") || "Usuário"
              : "Usuário"}
            !
          </Text>
        </View>
        <Text style={styles.sectionTitle}>Pagamentos realizados</Text>
        {/* <Text style={styles.title}>
          {enterpriseName || "Nome do Empreendimento"}
        </Text> */}

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
                  parcelNumber === "Número da parcela"
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
          <Text style={styles.resetButtonText}>Limpar filtros</Text>
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
          />
        )}

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#E1272C"
            style={{ marginTop: 20 }}
          />
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
        {/* Bottom Navigation Section */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  headerName: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    width: "100%",
  },
  greeting: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "left",
    marginBottom: 20,
  },

  logoBottom: {
    width: 50,
  },
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#D00000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "#880000",
    borderRadius: 40,
    marginHorizontal: 5,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 10,
    color: "#fff",
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
    borderRadius: 20,
    backgroundColor: "#fff",
    marginBottom: 16,
    height: 30,
    justifyContent: "center",
    paddingHorizontal: 12,
    marginHorizontal: 12,
    width: "90%",
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
    height: 30,
    width: 30,
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 8,
    fontSize: 14,
    backgroundColor: "#fff",
    borderRightColor: "#fff",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingLeft: 16,
  },
  validInput: {},
  invalidInput: {},
  calendarButton: {
    height: 30,
    borderLeftColor: "#fff",
    backgroundColor: "#fff",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 8,
  },
  resetButton: {
    backgroundColor: "#E1272C",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 16,
    marginHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    width: "90%",
  },
  resetButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  list: {
    flex: 1,
    marginHorizontal: 16,
    width: "90%",
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
    color: "#fff",
    marginTop: 20,
  },
  hiddenDateInput: {
    position: "absolute",
    left: -9999,
    opacity: 0,
    pointerEvents: "none",
  },
  // Bottom Navigation Styles
  bottomSection: {
  },

  navigationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
  },
  navButton: {
    marginTop: 20,
  },
});

export default PaymentsCompleted;
