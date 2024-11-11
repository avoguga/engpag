import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { useLocalSearchParams } from "expo-router";

const ParcelAntecipation = () => {
  const { userData } = useContext(UserContext);
  const { billReceivableId, enterpriseName } = useLocalSearchParams();
  const [selectedInstallments, setSelectedInstallments] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState("Selecione a parcela");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [newDueDate, setNewDueDate] = useState(null);
  const [showNewDueDatePicker, setShowNewDueDatePicker] = useState(false);
  const [searchText, setSearchText] = useState(""); // Novo estado para pesquisa

  useEffect(() => {
    fetchInstallments();
  }, [userData, billReceivableId]);

  const fetchInstallments = async () => {
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
      const selectedResult = results.find(
        (result) => result.billReceivableId == billReceivableId
      );

      if (!selectedResult) {
        Alert.alert("Erro", "Título não encontrado.");
        setLoading(false);
        return;
      }

      const installments = [
        ...(selectedResult.dueInstallments || []),
        ...(selectedResult.payableInstallments || []),
      ].map((installment) => {
        const [year, month, day] = installment.dueDate.split("-");
        const dueDateUTC = new Date(Date.UTC(year, month - 1, day));
        const formattedDueDate = `${day}/${month}/${year}`;

        return {
          id: installment.installmentId.toString(),
          number: installment.installmentNumber,
          billReceivableId: selectedResult.billReceivableId,
          dueDate: dueDateUTC,
          formattedDueDate: formattedDueDate,
          value: parseFloat(installment.currentBalance).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          status: dueDateUTC < new Date() ? "vencido" : "pendente",
          installmentId: installment.installmentId,
          generatedBoleto: installment.generatedBoleto,
          currentBalance: installment.currentBalance,
        };
      });

      setData(installments);
    } catch (error) {
      console.error("Erro ao buscar parcelas:", error);
      Alert.alert("Erro", "Não foi possível obter as parcelas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstallment = (item) => {
    if (selectedInstallments.some((installment) => installment.id === item.id)) {
      setSelectedInstallments(
        selectedInstallments.filter((installment) => installment.id !== item.id)
      );
    } else {
      setSelectedInstallments([...selectedInstallments, item]);
    }
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
      if (!isNaN(date)) setDate(date);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedInstallments.length === 0) {
      Alert.alert("Atenção", "Selecione ao menos uma parcela antes de continuar.");
      return;
    }
    setConfirmModalVisible(true);
  };

  const filterByDate = (installments) => {
    let filteredData = installments;

    // Excluir parcelas do mês vigente e meses que já passaram
    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

    filteredData = filteredData.filter((item) => item.dueDate >= nextMonth);

    if (startDate) {
      filteredData = filteredData.filter((item) => item.dueDate >= startDate);
    }

    if (endDate) {
      filteredData = filteredData.filter((item) => item.dueDate <= endDate);
    }

    return filteredData;
  };

  const filterByParcelNumber = (installments) => {
    if (selectedParcel && selectedParcel !== "Selecione a parcela") {
      return installments.filter((item) => item.number === selectedParcel);
    }
    return installments;
  };

  const filterBySearchText = (installments) => {
    if (!searchText) return installments;

    const lowercasedSearch = searchText.toLowerCase();

    return installments.filter((item) => {
      return (
        item.number.toString().includes(lowercasedSearch) ||
        item.billReceivableId.toLowerCase().includes(lowercasedSearch) ||
        (item.status && item.status.toLowerCase().includes(lowercasedSearch))
      );
    });
  };

  const resetFilters = () => {
    setSelectedParcel("Selecione a parcela");
    setStartDate(null);
    setEndDate(null);
    setStartDateInput("");
    setEndDateInput("");
    setSearchText("");
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        item.status === "vencido" ? styles.overdueCard : styles.pendingCard,
        selectedInstallments.some((installment) => installment.id === item.id) && styles.selectedCard,
      ]}
      onPress={() => handleSelectInstallment(item)}
    >
      <Text style={styles.cardNotice}>
        {item.generatedBoleto ? "Boleto disponível" : "Boleto indisponível"}
      </Text>
      <Text style={styles.cardTitle}>Número da Parcela {item.number}</Text>
      <Text style={styles.cardSubtitle}>
        Número do Título {item.billReceivableId}
      </Text>
      <Text style={styles.cardSubtitle}>Vencimento {item.formattedDueDate}</Text>
      <Text style={styles.cardValue}>Valor {item.value}</Text>
    </TouchableOpacity>
  );

  const handleSendWhatsAppMessage = async () => {
    if (!userData || !userData.id) {
      Alert.alert("Erro", "Dados do cliente não encontrados.");
      return;
    }

    if (!newDueDate) {
      Alert.alert("Atenção", "Por favor, selecione a nova data de vencimento.");
      return;
    }

    const customerId = userData.id;
    const totalAmount = selectedInstallments.reduce((sum, installment) => sum + parseFloat(installment.currentBalance), 0);
    setLoading(true);

    try {
      const username = "engenharq-mozart";
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`);
      const billReceivableId = selectedInstallments[0].billReceivableId;

      const response = await axios.get(
        `https://engpag.backend.gustavohenrique.dev/proxy/accounts-receivable/receivable-bills/${billReceivableId}`,
        {
          params: { customerId: customerId },
          headers: { Authorization: `Basic ${credentials}` },
        }
      );

      const companyId = response.data.companyId;
      const companyInfo = {
        1: { name: "Engenharq", whatsappNumber: "558296890033" },
        2: { name: "EngeLot", whatsappNumber: "558296890066" },
        3: { name: "EngeLoc", whatsappNumber: "558296890202" },
        default: { name: "Desconhecida", whatsappNumber: "5585986080000" },
      };

      const { name: companyName, whatsappNumber } = companyInfo[companyId] || companyInfo.default;
      const installmentNumbers = selectedInstallments.map((installment) => installment.number).join(", ");
      const document = userData.cpf ? `CPF ${userData.cpf}` : `CNPJ ${userData.cnpj}`;
      const message = `Olá, meu nome é ${userData?.name}, meu ${document}, gostaria de negociar as parcelas: ${installmentNumbers} do título ${billReceivableId}. Valor total: ${totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Desejo uma nova data de vencimento para ${newDueDate.toLocaleDateString("pt-BR")}.`;

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      const supported = await Linking.canOpenURL(whatsappUrl);

      if (supported) {
        await Linking.openURL(whatsappUrl);
        setConfirmModalVisible(false);
        setSelectedInstallments([]);
        setNewDueDate(null);
      } else {
        Alert.alert("Erro", "Não foi possível abrir o WhatsApp.");
      }
    } catch (error) {
      console.error("Erro ao obter companyId:", error);
      Alert.alert("Erro", "Não foi possível iniciar o contato via WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  const parcelNumbers = [
    "Selecione a parcela",
    ...new Set(data.map((item) => item.number)),
  ];

  // Aplicar todos os filtros: parcela, data e pesquisa
  const filteredData = filterBySearchText(filterByDate(filterByParcelNumber(data)));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {enterpriseName || "Nome do Empreendimento"}
      </Text>
      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionButtonText}>Antecipar Parcelas</Text>
      </TouchableOpacity>

      <Text style={styles.selectedCountText}>
        {selectedInstallments.length} parcela(s) selecionada(s)
      </Text>

      {/* Campo de Pesquisa */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar por texto..."
          value={searchText}
          onChangeText={(text) => setSearchText(text)}
        />
      </View>

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
              label={
                parcelNumber === "Selecione a parcela"
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
        {Platform.OS !== "web" ? (
          <>
            <View style={styles.dateInputContainer}>
              <TextInput
                style={[
                  styles.dateInput,
                  startDateInput.length === 10
                    ? styles.validInput
                    : styles.invalidInput,
                ]}
                placeholder="DD/MM/AAAA"
                value={startDateInput}
                onChangeText={(text) =>
                  handleDateInputWithMask(text, setStartDate, setStartDateInput)
                }
                keyboardType="numeric"
                maxLength={10}
              />
              <TouchableOpacity
                style={styles.calendarButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={24} color="#E1272C" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputContainer}>
              <TextInput
                style={[
                  styles.dateInput,
                  endDateInput.length === 10
                    ? styles.validInput
                    : styles.invalidInput,
                ]}
                placeholder="DD/MM/AAAA"
                value={endDateInput}
                onChangeText={(text) =>
                  handleDateInputWithMask(text, setEndDate, setEndDateInput)
                }
                keyboardType="numeric"
                maxLength={10}
              />
              <TouchableOpacity
                style={styles.calendarButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={24} color="#E1272C" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // Renderizar inputs de data para web
          <>
            <View style={styles.webDatePicker}>
              <Ionicons name="calendar-outline" size={20} color="#E1272C" />
              <input
                type="date"
                style={styles.webInputDate}
                value={startDate ? startDate.toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  const selected = e.target.value
                    ? new Date(e.target.value)
                    : null;
                  setStartDate(selected);
                }}
              />
            </View>
            <View style={styles.webDatePicker}>
              <Ionicons name="calendar-outline" size={20} color="#E1272C" />
              <input
                type="date"
                style={styles.webInputDate}
                value={endDate ? endDate.toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  const selected = e.target.value
                    ? new Date(e.target.value)
                    : null;
                  setEndDate(selected);
                }}
              />
            </View>
          </>
        )}
      </View>

      {/* Botão de Resetar Filtros */}
      <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
        <Text style={styles.resetButtonText}>Limpar Filtros</Text>
      </TouchableOpacity>

      {/* DateTimePickers para plataformas não web */}
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

      {/* DateTimePicker para nova data de vencimento no modal (para não-web) */}
      {Platform.OS !== "web" && showNewDueDatePicker && (
        <DateTimePicker
          value={newDueDate || new Date()}
          mode="date"
          display="default"
          minimumDate={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)}
          onChange={(event, selectedDate) => {
            setShowNewDueDatePicker(false);
            if (selectedDate) {
              setNewDueDate(selectedDate);
            }
          }}
        />
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={styles.noDataText}>
              Nenhuma parcela encontrada.
            </Text>
          }
        />
      )}

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleConfirmSelection}
      >
        <Ionicons name="cash-outline" size={24} color="white" />
      </TouchableOpacity>
      {confirmModalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={confirmModalVisible}
          onRequestClose={() => {
            setConfirmModalVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Confirmação de Parcelas</Text>
              <ScrollView style={{ maxHeight: 400, width: '100%' }}>
                {selectedInstallments.map((installment, index) => (
                  <View key={index} style={styles.modalItem}>
                    <Text style={styles.modalLabel}>
                      Parcela {installment.number} - Vencimento{" "}
                      {installment.formattedDueDate} - Valor {installment.value}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.modalTotal}>
                Total:{" "}
                {selectedInstallments
                  .reduce(
                    (sum, installment) =>
                      sum + parseFloat(installment.currentBalance),
                    0
                  )
                  .toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
              </Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowNewDueDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#E1272C" />
                <Text style={styles.dateText}>
                  {newDueDate
                    ? newDueDate.toLocaleDateString("pt-BR")
                    : "Selecione a nova data de vencimento"}
                </Text>
              </TouchableOpacity>
              {/* Date picker para web dentro do modal */}
              {Platform.OS === "web" && (
                <View style={styles.webDatePicker}>
                  <Ionicons name="calendar-outline" size={20} color="#E1272C" />
                  <input
                    type="date"
                    style={styles.webInputDate}
                    value={newDueDate ? newDueDate.toISOString().split("T")[0] : ""}
                    onChange={(e) => {
                      const selected = e.target.value
                        ? new Date(e.target.value)
                        : null;
                      setNewDueDate(selected);
                    }}
                  />
                </View>
              )}
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSendWhatsAppMessage}
              >
                <Text style={styles.modalButtonText}>Confirmar e Enviar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setConfirmModalVisible(false);
                }}
              >
                <Text style={styles.modalCloseButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  validInput: {
    borderColor: "#28a745",
  },
  invalidInput: {
    borderColor: "#dc3545",
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
  calendarButton: {
    marginLeft: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },

  container: {
    flex: 1,
    backgroundColor: "#FAF6F6",
    paddingTop: Platform.OS === "web" ? 20 : 0, // Ajuste para web
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
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 16,
    color: "#333",
  },
  actionButton: {
    backgroundColor: "#E1272C",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
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
  },
  selectedCountText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#333",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "web" ? 0 : 5, // Ajuste para web
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  picker: {
    height: 50,
    flex: 1,
    color: "#333",
  },
  dateFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
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
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    width: "100%",
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
    marginHorizontal: 16,
    marginBottom: 16,
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
    paddingHorizontal: 16,
  },
  card: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fff",
    elevation: 2,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  pendingCard: {
    backgroundColor: "#E4E4E4",
  },
  overdueCard: {
    backgroundColor: "#FFD7D8",
  },
  selectedCard: {
    borderColor: "#E1272C",
    borderWidth: 2,
  },
  cardNotice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#E1272C",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#E1272C",
    marginTop: 8,
  },
  floatingButton: {
    backgroundColor: "#E1272C",
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 30,
    right: 20,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#E1272C",
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: "center",
    color: "#333",
  },
  modalTotal: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
    color: "#E1272C",
  },
  modalButton: {
    backgroundColor: "#E1272C",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalCloseButton: {
    backgroundColor: "#5B5B5B",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  modalCloseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalItem: {
    marginBottom: 10,
    alignItems: "center",
  },
  webDatePicker: {
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    marginBottom: 10,
  },
  webInputDate: {
    marginLeft: 8,
    flex: 1,
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    fontSize: 16,
  },
});

export default ParcelAntecipation;
