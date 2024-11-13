import React, { useState, useEffect, useContext, useRef } from "react";
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
  const [newDueDateInput, setNewDueDateInput] = useState("");
  const [hasOverdueInstallments, setHasOverdueInstallments] = useState(false);

  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);
  const newDueDateInputRef = useRef(null);

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
        const isOverdue = dueDateUTC < new Date();

        return {
          id: installment.installmentId.toString(),
          number: installment.installmentNumber,
          billReceivableId: selectedResult.billReceivableId,
          dueDate: dueDateUTC,
          formattedDueDate: formattedDueDate,
          value: parseFloat(installment.currentBalance).toLocaleString(
            "pt-BR",
            {
              style: "currency",
              currency: "BRL",
            }
          ),
          // status: dueDateUTC < new Date() ? "vencido" : "pendente",
          status: isOverdue ? "vencido" : "pendente",
          installmentId: installment.installmentId,
          generatedBoleto: installment.generatedBoleto,
          currentBalance: installment.currentBalance,
          conditionType: installment.conditionType,
        };
      });

      const hasOverdue = installments.some((item) => item.status === "vencido");
      setHasOverdueInstallments(hasOverdue);

      setData(installments);
    } catch (error) {
      console.error("Erro ao buscar parcelas:", error);
      Alert.alert("Erro", "Não foi possível obter as parcelas.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstallment = (item) => {
    if (
      selectedInstallments.some((installment) => installment.id === item.id)
    ) {
      setSelectedInstallments(
        selectedInstallments.filter((installment) => installment.id !== item.id)
      );
    } else {
      setSelectedInstallments([...selectedInstallments, item]);
    }
  };

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
        formattedText = formattedText.substring(0, 2) + "12";
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

  const unselectAllParcels = () => {
    setSelectedInstallments([]);
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
    <TouchableOpacity
      style={[
        styles.card,
        item.status === "vencido" ? styles.overdueCard : styles.pendingCard,
        selectedInstallments.some(
          (installment) => installment.id === item.id
        ) && styles.selectedCard,
      ]}
      onPress={() => handleSelectInstallment(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardNotice}>
          {item.generatedBoleto ? "Boleto Disponível" : "Boleto Indisponível"}
        </Text>
        <Ionicons
          name={item.generatedBoleto ? "checkmark-circle" : "close-circle"}
          size={20}
          color={item.generatedBoleto ? "#28a745" : "#dc3545"}
        />
      </View>
      <Text style={styles.cardTitle}>Parcela: {item.number}</Text>
      <Text style={styles.cardSubtitle}>Título: {item.billReceivableId}</Text>
      <Text style={styles.cardSubtitle}>
        Vencimento: {item.formattedDueDate}
      </Text>
      <Text style={styles.cardSubtitle}>
        Condição de pagamento: {item.conditionType}
      </Text>
      <Text style={styles.cardValue}>Valor: {item.value}</Text>
    </TouchableOpacity>
  );

  const handleSendWhatsAppMessage = async () => {
    if (!userData || !userData.id) {
      Alert.alert("Erro", "Dados do cliente não encontrados.");
      return;
    }

    if (Platform.OS === "web" && !newDueDateInput) {
      Alert.alert("Atenção", "Por favor, preencha a nova data de vencimento.");
      return;
    } else if (Platform.OS !== "web" && !newDueDate) {
      Alert.alert("Atenção", "Por favor, selecione a nova data de vencimento.");
      return;
    }

    const customerId = userData.id;
    const totalAmount = selectedInstallments.reduce(
      (sum, installment) => sum + parseFloat(installment.currentBalance),
      0
    );
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

      const { name: companyName, whatsappNumber } =
        companyInfo[companyId] || companyInfo.default;

      const installmentNumbers = selectedInstallments
        .map((installment) => installment.number)
        .join(", ");

      const document = userData.cpf
        ? userData.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
        : userData.cnpj;

      const dueDateString =
        Platform.OS === "web"
          ? newDueDateInput
          : newDueDate.toLocaleDateString("pt-BR");

      const message = `Solicitação de Antecipação de Parcelas - Título ${billReceivableId}\n\nOlá, meu nome é ${
        userData?.name
      }, portador(a) do CPF nº ${document}, e gostaria de solicitar a antecipação das parcelas ${installmentNumbers} totalizando o valor de ${totalAmount.toLocaleString(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL",
        }
      )}. Com uma nova data de vencimento para ${dueDateString}.`;

      if (Platform.OS === "web") {
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
          message
        )}`;
        window.open(whatsappUrl, "_blank");
        setConfirmModalVisible(false);
        setSelectedInstallments([]);
        setNewDueDateInput("");
      } else {
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
          message
        )}`;
        const supported = await Linking.canOpenURL(whatsappUrl);

        if (supported) {
          await Linking.openURL(whatsappUrl);
          setConfirmModalVisible(false);
          setSelectedInstallments([]);
          setNewDueDate(null);
          setNewDueDateInput("");
        } else {
          Alert.alert("Erro", "Não foi possível abrir o WhatsApp.");
        }
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

  // Funções de filtro (sem pesquisa por texto)
  const filterByDate = (installments) => {
    let filteredData = installments;

    // Excluir parcelas do mês vigente e meses que já passaram
    const currentDate = new Date();
    const nextMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1
    );

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

  // Aplicar todos os filtros: parcela e data
  const filteredData = filterByDate(filterByParcelNumber(data));

  const resetFilters = () => {
    setSelectedParcel("Selecione a parcela");
    setStartDate(null);
    setEndDate(null);
    setStartDateInput("");
    setEndDateInput("");
  };

  const handleModalDateInputWithMask = (text) => {
    let formattedText = text.replace(/\D/g, "");

    // Formatação da data (mantém como está)
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

    setNewDueDateInput(formattedText);

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
        const today = new Date();

        // Verifica se a data é válida e está dentro do mês atual
        if (
          date &&
          date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === day &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear() &&
          date >= today // Não permite datas passadas
        ) {
          setNewDueDate(date);
        } else {
          Alert.alert(
            "Erro",
            "A data de antecipação deve estar dentro do mês atual."
          );
          setNewDueDate(null);
          setNewDueDateInput("");
        }
      } else {
        Alert.alert("Erro", "Data inválida.");
        setNewDueDate(null);
        setNewDueDateInput("");
      }
    } else {
      setNewDueDate(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {enterpriseName || "Nome do Empreendimento"}
      </Text>
      <Text style={styles.selectedCountText}>
        {selectedInstallments.length} parcela(s) selecionada(s)
      </Text>

      {hasOverdueInstallments && (
        <Text style={styles.warningText}>
          Não é possível solicitar antecipação com parcelas em atraso.
        </Text>
      )}

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
        <Text style={styles.resetButtonText}>Limpar Filtros</Text>
      </TouchableOpacity>

      {selectedInstallments.length > 0 && (
        <TouchableOpacity
          style={[
            styles.resetButton,
            { marginBottom: 16, backgroundColor: "#6c757d" },
          ]}
          onPress={unselectAllParcels}
        >
          <Text style={styles.resetButtonText}>Desmarcar Parcelas</Text>
        </TouchableOpacity>
      )}

      {/* Adicionar instrução para o usuário */}
      {selectedInstallments.length === 0 ? (
        <Text style={styles.instructionText}>
          Toque em uma parcela para selecioná-la.
        </Text>
      ) : null}

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
          minimumDate={
            new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          }
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
          minimumDate={
            new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          }
        />
      )}

      {/* DateTimePicker para nova data de vencimento no modal */}
      {Platform.OS !== "web" && showNewDueDatePicker && (
        <DateTimePicker
          value={newDueDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowNewDueDatePicker(false);
            if (selectedDate) {
              // Verifica se a data selecionada está no mês atual
              const today = new Date();
              if (
                selectedDate.getMonth() === today.getMonth() &&
                selectedDate.getFullYear() === today.getFullYear() &&
                selectedDate >= today
              ) {
                const formattedDate = selectedDate.toLocaleDateString("pt-BR");
                setNewDueDate(selectedDate);
                setNewDueDateInput(formattedDate);
              } else {
                Alert.alert(
                  "Erro",
                  "A data de antecipação deve estar dentro do mês atual."
                );
                setNewDueDate(null);
                setNewDueDateInput("");
              }
            }
          }}
          minimumDate={new Date()} // Data atual
          maximumDate={
            new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          } // Último dia do mês atual
        />
      )}

      {/* Date Picker para Web no Modal */}
      {Platform.OS === "web" && showNewDueDatePicker && (
        <View style={styles.modalWebDatePicker}>
          <Ionicons name="calendar-outline" size={20} color="#E1272C" />
          <TouchableOpacity
            onPress={() => openWebDatePicker(newDueDateInputRef)}
          >
            <Ionicons name="calendar-outline" size={20} color="#E1272C" />
          </TouchableOpacity>
          {/* Input type="date" oculto */}
          <input
            type="date"
            style={styles.hiddenDateInput}
            ref={newDueDateInputRef}
            onChange={(e) =>
              handleWebDateChange(
                e.target.value ? new Date(e.target.value) : null,
                setNewDueDate,
                () => {}
              )
            }
          />
        </View>
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
            <Text style={styles.noDataText}>Nenhuma parcela encontrada.</Text>
          }
        />
      )}

      <TouchableOpacity
        style={[
          styles.floatingButton,
          hasOverdueInstallments && styles.disabledButton,
        ]}
        onPress={() => {
          if (hasOverdueInstallments) {
            if (Platform.OS === "web") {
              alert(
                "Não é possível solicitar antecipação com parcelas em atraso."
              );
            } else {
              Alert.alert(
                "Atenção",
                "Não é possível solicitar antecipação com parcelas em atraso."
              );
            }
            return;
          }

          if (selectedInstallments.length === 0) {
            if (Platform.OS === "web") {
              alert(
                "Por favor, clique em uma parcela para selecioná-la antes de continuar."
              );
            } else {
              Alert.alert(
                "Atenção",
                "Por favor, clique em uma parcela para selecioná-la antes de continuar."
              );
            }
            return;
          }
          setConfirmModalVisible(true);
        }}
      >
        <Ionicons name="cash-outline" size={24} color="white" />
      </TouchableOpacity>

      {confirmModalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={confirmModalVisible}
          onRequestClose={() => setConfirmModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Confirmação de Parcelas</Text>
              <ScrollView style={{ maxHeight: 400, width: "100%" }}>
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

              <Text style={styles.indiqueCond}>
                Informe a data para antecipação do pagamento
              </Text>

              {Platform.OS === "web" ? (
                <View style={styles.dateInputModalContainer}>
                  <Text style={styles.dateInstructionText}>
                    A data de antecipação deve estar dentro do mês atual!
                  </Text>
                  <View style={styles.modalDateInputWrapper}>
                    <TextInput
                      style={[
                        styles.dateInputModal,
                        newDueDateInput.length === 10
                          ? styles.validInput
                          : styles.invalidInput,
                      ]}
                      placeholder="DD/MM/AAAA"
                      value={newDueDateInput}
                      onChangeText={handleModalDateInputWithMask}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.dateInputModalContainer}>
                  <View style={styles.modalDateInputWrapper}>
                    <TextInput
                      style={[
                        styles.dateInputModal,
                        newDueDateInput.length === 10
                          ? styles.validInput
                          : styles.invalidInput,
                      ]}
                      placeholder="DD/MM/AAAA"
                      value={newDueDateInput}
                      onChangeText={handleModalDateInputWithMask}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                    <TouchableOpacity
                      style={styles.modalCalendarButton}
                      onPress={() => setShowNewDueDatePicker(true)}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={24}
                        color="#E1272C"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {Platform.OS !== "web" && showNewDueDatePicker && (
                <DateTimePicker
                  value={newDueDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowNewDueDatePicker(false);
                    if (selectedDate) {
                      const formattedDate =
                        selectedDate.toLocaleDateString("pt-BR");
                      setNewDueDate(selectedDate);
                      setNewDueDateInput(formattedDate);
                    }
                  }}
                  minimumDate={
                    new Date(
                      new Date().getFullYear(),
                      new Date().getMonth() + 1,
                      1
                    )
                  }
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
                  setNewDueDateInput(""); // Reset input when closing modal
                  setNewDueDate(null);
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
  container: {
    flex: 1,
    backgroundColor: "#FAF6F6",
    paddingTop: Platform.OS === "web" ? 20 : 0, // Ajuste para web
  },
  dateInputModalContainer: {
    width: "100%",
    marginVertical: 15,
  },
  modalDateInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  modalCalendarButton: {
    padding: 10,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
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
    ...Platform.select({
      web: {
        outlineWidth: 0,
        borderWidth: 0,
      },
    }),
  },
  dateFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
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
    width: 30,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  dateInputModal: {
    flex: 1,
    height: 50,
    width: 200,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 16,
    marginTop: 20,
    marginBottom: 20,
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
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  disabledButton: {
    backgroundColor: "#cccccc",
    opacity: 0.7,
  },
  warningText: {
    color: "#E1272C",
    fontSize: 14,
    textAlign: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    fontWeight: "bold",
  },
  overdueCard: {
    backgroundColor: "#FFD7D8",
  },
  pendingCard: {
    backgroundColor: "#E4E4E4",
  },
  selectedCard: {
    borderColor: "#E1272C",
    borderWidth: 2,
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
    color: "#777",
    marginTop: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#E1272C",
    marginTop: 8,
  },
  dateInstructionText: {
    fontSize: 16,
    color: "#ff0707",
    textAlign: "center",
    marginBottom: 10,
    fontStyle: "italic",
    fontWeight: 'bold'
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
    marginTop: 10,
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
  hiddenDateInput: {
    position: "absolute",
    left: "-9999px",
    opacity: 0,
    pointerEvents: "none",
  },
  modalWebDatePicker: {
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginTop: 10,
    width: "100%",
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
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    width: "100%",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 8,
  },
  indiqueCond: {
    fontSize: 18,
    color: "#333",
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default ParcelAntecipation;
