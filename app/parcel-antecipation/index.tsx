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
  ToastAndroid,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { router, useLocalSearchParams } from "expo-router";

const ParcelAntecipation = () => {
  const { userData } = useContext(UserContext);
  const { billReceivableId } = useLocalSearchParams();
  const [selectedInstallments, setSelectedInstallments] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState("Selecione a parcela");
  const [startDate, setStartDate] = useState(null); // Data inicial
  const [endDate, setEndDate] = useState(null); // Data final
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [data, setData] = useState([]); // Dados das parcelas
  const [loading, setLoading] = useState(false); // Loading for the main screen
  const [enterpriseName, setEnterpriseName] = useState(""); // Nome do empreendimento

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [newDueDate, setNewDueDate] = useState(null);
  const [showNewDueDatePicker, setShowNewDueDatePicker] = useState(false);

  useEffect(() => {
    fetchInstallments();
  }, [userData, billReceivableId]);

  const fetchInstallments = async () => {
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
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb';
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

      const selectedResult = results.find(
        (result) => result.billReceivableId == billReceivableId
      );

      if (!selectedResult) {
        Alert.alert("Erro", "Título não encontrado.");
        setLoading(false);
        return;
      }

      // Obter o enterpriseName
      const customerId = userData.id;
      const billResponse = await axios.get(
        `https://api.sienge.com.br/engenharq/public/api/v1/accounts-receivable/receivable-bills/${billReceivableId}`,
        {
          params: {
            customerId: customerId,
          },
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      const enterpriseName =
        billResponse.data.enterpriseName || "Nome do Empreendimento";
      setEnterpriseName(enterpriseName);

      let allInstallments = [];

      const { dueInstallments, payableInstallments } = selectedResult;

      const installments = [
        ...(dueInstallments || []),
        ...(payableInstallments || []),
      ].map((installment) => ({
        id: installment.installmentId.toString(),
        number: installment.installmentNumber,
        billReceivableId: selectedResult.billReceivableId,
        dueDate: installment.dueDate,
        value: `R$ ${parseFloat(installment.currentBalance).toFixed(2)}`,
        status:
          new Date(installment.dueDate) < new Date() ? "vencido" : "pendente",
        installmentId: installment.installmentId,
        generatedBoleto: installment.generatedBoleto,
        currentBalance: installment.currentBalance,
      }));

      allInstallments = [...allInstallments, ...installments];

      setData(allInstallments);
    } catch (error) {
      console.error("Erro ao buscar parcelas:", error);
      Alert.alert("Erro", "Não foi possível obter as parcelas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstallment = (item) => {
    if (selectedInstallments.some((installment) => installment.id === item.id)) {
      // Remove da seleção
      setSelectedInstallments(
        selectedInstallments.filter((installment) => installment.id !== item.id)
      );
    } else {
      // Adiciona à seleção
      setSelectedInstallments([...selectedInstallments, item]);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedInstallments.length === 0) {
      Alert.alert(
        "Atenção",
        "Selecione ao menos uma parcela antes de continuar."
      );
      return;
    }
    setConfirmModalVisible(true);
  };

  const filterByDate = (installments) => {
    let filteredData = installments;

    if (startDate) {
      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.dueDate);
        return itemDate >= startDate;
      });
    }

    if (endDate) {
      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.dueDate);
        return itemDate <= endDate;
      });
    }

    return filteredData;
  };

  const filterByParcelNumber = (installments) => {
    if (selectedParcel && selectedParcel !== "Selecione a parcela") {
      return installments.filter((item) => item.number === selectedParcel);
    }
    return installments;
  };

  const resetFilters = () => {
    setSelectedParcel("Selecione a parcela");
    setStartDate(null);
    setEndDate(null);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        item.status === "vencido" ? styles.overdueCard : styles.pendingCard,
        selectedInstallments.some((installment) => installment.id === item.id) &&
          styles.selectedCard,
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
      <Text style={styles.cardSubtitle}>Vencimento {item.dueDate}</Text>
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

    const totalAmount = selectedInstallments.reduce((sum, installment) => {
      return sum + parseFloat(installment.currentBalance);
    }, 0);

    setLoading(true);

    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb';
      const credentials = btoa(`${username}:${password}`);

      const billReceivableId = selectedInstallments[0].billReceivableId;

      const response = await axios.get(
        `https://api.sienge.com.br/engenharq/public/api/v1/accounts-receivable/receivable-bills/${billReceivableId}`,
        {
          params: {
            customerId: customerId,
          },
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      const companyId = response.data.companyId;

      let companyName = "";
      let whatsappNumber = "";

      switch (companyId) {
        case 1:
          companyName = "Engenharq";
          whatsappNumber = "558296890033";
          break;
        case 2:
          companyName = "EngeLot";
          whatsappNumber = "558296890066";
          break;
        case 3:
          companyName = "EngeLoc";
          whatsappNumber = "558296890202";
          break;
        default:
          companyName = "Desconhecida";
          whatsappNumber = "5585986080000"; // Número padrão
      }

      // Gerar a mensagem
      const installmentNumbers = selectedInstallments
        .map((installment) => installment.number)
        .join(", ");

      const message = `Olá, meu nome é ${userData?.name}, meu CPF é ${
        userData?.cpf
      }, gostaria de negociar as parcelas: ${installmentNumbers} do título ${billReceivableId}. Valor total: R$ ${totalAmount.toFixed(
        2
      )}. Desejo uma nova data de vencimento para ${newDueDate.toLocaleDateString()}.`;

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        message
      )}`;

      // Abrir o WhatsApp
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

  const filteredData = filterByDate(filterByParcelNumber(data));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Antecipação de Parcelas</Text>
        <TouchableOpacity onPress={() => router.push("/notification-screen")}>
          <Ionicons name="notifications-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>
        {enterpriseName || "Nome do Empreendimento"}
      </Text>
      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionButtonText}>Antecipar Parcelas</Text>
      </TouchableOpacity>

      {/* Mostra a quantidade de parcelas selecionadas */}
      <Text style={styles.selectedCountText}>
        {selectedInstallments.length} parcela(s) selecionada(s)
      </Text>

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
        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#E1272C" />
          <Text style={styles.dateText}>
            {startDate ? startDate.toLocaleDateString() : "Data inicial"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#E1272C" />
          <Text style={styles.dateText}>
            {endDate ? endDate.toLocaleDateString() : "Data final"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botão de Limpar Filtros */}
      <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
        <Text style={styles.resetButtonText}>Limpar Filtros</Text>
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
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleConfirmSelection}
      >
        <Ionicons name="cash-outline" size={24} color="white" />
      </TouchableOpacity>

      {/* Modal de Confirmação */}
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
              <ScrollView style={{ maxHeight: 400 }}>
                {selectedInstallments.map((installment, index) => (
                  <View key={index} style={styles.modalItem}>
                    <Text style={styles.modalLabel}>
                      Parcela {installment.number} - Vencimento{" "}
                      {installment.dueDate} - Valor {installment.value}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.modalTotal}>
                Total: R${" "}
                {selectedInstallments
                  .reduce(
                    (sum, installment) =>
                      sum + parseFloat(installment.currentBalance),
                    0
                  )
                  .toFixed(2)}
              </Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowNewDueDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#E1272C" />
                <Text style={styles.dateText}>
                  {newDueDate
                    ? newDueDate.toLocaleDateString()
                    : "Selecione a nova data de vencimento"}
                </Text>
              </TouchableOpacity>
              {showNewDueDatePicker && (
                <DateTimePicker
                  value={newDueDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowNewDueDatePicker(false);
                    if (selectedDate) setNewDueDate(selectedDate);
                  }}
                />
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
  // ... (mantenha seus estilos existentes ou ajuste conforme necessário)
  container: {
    flex: 1,
    backgroundColor: "#FAF6F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E1272C",
    paddingVertical: 16,
    paddingHorizontal: 16,
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
    color: "#000",
  },
  actionButton: {
    backgroundColor: "#E1272C",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
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
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  picker: {
    height: 50,
    paddingHorizontal: 10,
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
});

export default ParcelAntecipation;
