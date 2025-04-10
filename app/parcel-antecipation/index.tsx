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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { router, useLocalSearchParams } from "expo-router";

const excludedConditionTypes = [
  "Cartão de crédito",
  "Cartão de débito",
  "Sinal",
  "Financiamento",
  "Promissória",
  "Valor do terreno",
];

const filterValidInstallments = (installments) => {
  return installments.filter(
    (installment) =>
      !excludedConditionTypes.includes(installment.conditionType.trim())
  );
};

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
  // antecipar parcela menos credito, debito, sinal, financiamento, promissoria, valor do terreno.
  // bloquar datas anteriores
  // arrumar data
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
      const password = "wfW2ra73xSbH5r4AbQne4WesFDb1NaWe";
      const credentials = btoa(`${username}:${password}`);

      const searchParam = userData.cpf
        ? { cpf: userData.cpf, correctAnnualInstallment: "N" }
        : { cnpj: userData.cnpj, correctAnnualInstallment: "N" };

      const response = await axios.get(
        "http://201.51.197.250:3000/proxy/current-debit-balance",
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
          status: isOverdue ? "vencido" : "pendente",
          installmentId: installment.installmentId,
          generatedBoleto: installment.generatedBoleto,
          currentBalance: installment.currentBalance,
          conditionType: installment.conditionType,
        };
      });

      const validInstallments = filterValidInstallments(installments);

      const hasOverdue = validInstallments.some(
        (item) => item.status === "vencido"
      );
      setHasOverdueInstallments(hasOverdue);

      setData(validInstallments);
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

  const formatConditionType = (text) => {
    return text.toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
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

  const renderDateInput = (inputType, setDate, dateInput, setDateInput) => (
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
            <Ionicons name="calendar-outline" size={14} color="#E1272C" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderItem = ({ item }) => {
    // Verifica se o item está selecionado
    const isSelected = selectedInstallments.some(
      (installment) => installment.id === item.id
    );

    return (
      <TouchableOpacity
        style={[
          styles.card,
          item.status === "vencido" ? styles.overdueCard : styles.pendingCard,
          isSelected && styles.selectedCard,
        ]}
        onPress={() => handleSelectInstallment(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardNotice}>
            {item.generatedBoleto
              ? "Boleto disponível"
              : "Apto para antecipação"}
          </Text>
          {/* Se o item estiver selecionado, exibe o ícone verde; caso contrário, utiliza a condição original */}
          <Ionicons
            name={
              isSelected
                ? "checkmark-circle"
                : item.generatedBoleto
                ? "checkmark-circle"
                : "close-circle"
            }
            size={20}
            color={
              isSelected
                ? "#28a745"
                : item.generatedBoleto
                ? "#28a745"
                : "#dc3545"
            }
          />
        </View>
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}>
          <Text style={styles.cardTitle}>
            Parcela: {item.number}
          </Text>
          <Text style={styles.cardTitle}>{item.value}</Text>
        </View>
        <Text style={styles.cardSubtitle}>Título: {item.billReceivableId}</Text>
        <Text style={styles.cardSubtitle}>
          Vencimento: {item.formattedDueDate}
        </Text>
      </TouchableOpacity>
    );
  };

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
      const password = "wfW2ra73xSbH5r4AbQne4WesFDb1NaWe";
      const credentials = btoa(`${username}:${password}`);
      const billReceivableId = selectedInstallments[0].billReceivableId;

      const response = await axios.get(
        `http://201.51.197.250:3000/proxy/accounts-receivable/receivable-bills/${billReceivableId}`,
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

    // Formatação básica da máscara
    if (formattedText.length > 2) {
      formattedText = formattedText.replace(/(\d{2})(\d)/, "$1/$2");
    }
    if (formattedText.length > 5) {
      formattedText = formattedText.replace(/(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
    }
    if (formattedText.length > 10) {
      formattedText = formattedText.slice(0, 10);
    }

    // Atualiza o input
    setNewDueDateInput(formattedText);

    // Só valida quando a data estiver completa
    if (formattedText.length === 10) {
      const [dayStr, monthStr, yearStr] = formattedText.split("/");
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);

      // Verifica se o mês é válido (1-12)
      if (month < 1 || month > 12) {
        if (Platform.OS === "web") {
          alert("Mês inválido");
        } else {
          Alert.alert("Erro", "Mês inválido");
        }
        return;
      }

      // Verifica o número máximo de dias para o mês específico
      const maxDays = new Date(year, month, 0).getDate();
      if (day < 1 || day > maxDays) {
        if (Platform.OS === "web") {
          alert(`Dia inválido para o mês ${month}. O máximo é ${maxDays} dias`);
        } else {
          Alert.alert(
            "Erro",
            `Dia inválido para o mês ${month}. O máximo é ${maxDays} dias`
          );
        }
        return;
      }

      // Pega o mês atual
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      // Verifica se está no mês atual
      if (month !== currentMonth || year !== currentYear) {
        if (Platform.OS === "web") {
          alert("A data deve ser do mês atual");
        } else {
          Alert.alert("Erro", "A data deve ser do mês atual");
        }
        return;
      }

      const selectedDate = new Date(year, month - 1, day);
      const currentDate = new Date();

      currentDate.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < currentDate) {
        if (Platform.OS === "web") {
          alert("Não é possível selecionar datas passadas");
        } else {
          Alert.alert("Erro", "Não é possível selecionar datas passadas");
        }
        return;
      }

      // Se chegou aqui, a data é válida
      setNewDueDate(selectedDate);
    }
  };

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
        <Text style={styles.sectionTitle}>Antecipação de parcelas</Text>

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

        <View style={styles.resetButtonContainer}>
          {/* Botão de Resetar Filtros */}
          <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
            <Text style={styles.resetButtonText}>Limpar filtros</Text>
          </TouchableOpacity>

          {selectedInstallments.length > 0 && (
            <TouchableOpacity
              style={[
                styles.resetButton,
                { marginBottom: 16, backgroundColor: "#6c757d" },
              ]}
              onPress={unselectAllParcels}
            >
              <Text style={styles.resetButtonText}>Desmarcar parcelas</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Adicionar instrução para o usuário */}
        <Text style={styles.instructionText}>
          {selectedInstallments.length === 0
            ? "Toque em uma parcela para selecioná-la."
            : `${selectedInstallments.length} parcela(s) selecionada(s).`}
        </Text>

        {/* DateTimePickers para filtros - qualquer mês a partir do atual */}
        {Platform.OS !== "web" && showStartDatePicker && (
          <DateTimePicker
            value={startDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                selectedDate.setHours(0, 0, 0, 0);

                if (selectedDate >= today) {
                  setStartDate(selectedDate);
                  setStartDateInput(selectedDate.toLocaleDateString("pt-BR"));
                  // Se a data final for anterior à nova data inicial, limpa a data final
                  if (endDate && selectedDate > endDate) {
                    setEndDate(null);
                    setEndDateInput("");
                  }
                } else {
                  Alert.alert(
                    "Erro",
                    "A data inicial não pode ser anterior a hoje"
                  );
                }
              }
            }}
            minimumDate={new Date()} // Hoje
          />
        )}

        {Platform.OS !== "web" && showEndDatePicker && (
          <DateTimePicker
            value={endDate || startDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                selectedDate.setHours(0, 0, 0, 0);
                const minDate = startDate || new Date();
                minDate.setHours(0, 0, 0, 0);

                if (selectedDate >= minDate) {
                  setEndDate(selectedDate);
                  setEndDateInput(selectedDate.toLocaleDateString("pt-BR"));
                } else {
                  Alert.alert(
                    "Erro",
                    "A data final deve ser igual ou posterior à data inicial"
                  );
                }
              }
            }}
            minimumDate={startDate || new Date()} // Data inicial ou hoje
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
                const today = new Date();
                // Zera as horas para comparação adequada
                today.setHours(0, 0, 0, 0);
                selectedDate.setHours(0, 0, 0, 0);

                if (
                  selectedDate.getMonth() === today.getMonth() &&
                  selectedDate.getFullYear() === today.getFullYear() &&
                  selectedDate >= today
                ) {
                  setNewDueDate(selectedDate);
                  setNewDueDateInput(selectedDate.toLocaleDateString("pt-BR"));
                } else {
                  Alert.alert(
                    "Erro",
                    "A data de antecipação deve estar dentro do mês atual e não pode ser anterior a hoje."
                  );
                }
              }
            }}
            minimumDate={new Date()} // Hoje
            maximumDate={
              // Último dia do mês atual
              new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
            }
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
            contentContainerStyle={{ paddingBottom: 100, width: "100%" }}
            ListEmptyComponent={
              <Text style={styles.noDataText}>Nenhuma parcela encontrada.</Text>
            }
          />
        )}

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
                        {installment.formattedDueDate} - Valor{" "}
                        {installment.value}
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
              <Ionicons name="play-forward-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D00000",
    paddingTop: Platform.OS === "web" ? 20 : 0, // Ajuste para web
    padding: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 200,
    backgroundColor: "#880000",
    borderRadius: 40,
    marginHorizontal: 5,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  headerName: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
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
  sectionTitleSeus: {
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "left",
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

  pickerContainer: {
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 20,
    backgroundColor: "#fff",
    marginBottom: 16,
    height: 30,
    justifyContent: "center",
    paddingHorizontal: 12,
    width: "100%",
  },
  picker: {
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
    marginBottom: 16,
    width: "100%",
    justifyContent: "space-between",
    gap: 16,
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
    // borderColor: "#28a745",
  },
  invalidInput: {
    // borderColor: "#dc3545",
  },
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
  resetButtonContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  resetButton: {
    backgroundColor: "#E1272C",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    width: 150,
  },
  resetButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 16,
    width: "100%",
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionText: {
    fontSize: 12,
    color: "#fff",
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
    borderWidth: 4,
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
  logoBottom: {
    width: 50,
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
    fontWeight: "bold",
  },
  floatingButton: {
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
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
  // Bottom Navigation Styles
  bottomSection: {
    bottom: 0,
    width: "100%",
    marginBottom: -170,
    paddingTop: 20,
  },

  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#880000",
    width: "100%",
    paddingHorizontal: 40,
  },
  navButton: {},
});

export default ParcelAntecipation;
