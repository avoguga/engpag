  import React, { useState, useEffect, useContext } from "react";
  import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    Linking,
  } from "react-native";
  import { Ionicons } from "@expo/vector-icons";
  import { Picker } from "@react-native-picker/picker";
  import DateTimePicker from "@react-native-community/datetimepicker";
  import axios from "axios";
  import { UserContext } from "../contexts/UserContext";
  import { useLocalSearchParams } from "expo-router";
  import * as Clipboard from "expo-clipboard";

  const ParcelAntecipation = () => {
    const { userData } = useContext(UserContext);
    const { billReceivableId } = useLocalSearchParams();
    const [showActions, setShowActions] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [selectedParcel, setSelectedParcel] = useState("Número da Parcela");
    const [startDate, setStartDate] = useState(null); // Data inicial
    const [endDate, setEndDate] = useState(null); // Data final
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [data, setData] = useState([]); // Dados das parcelas
    const [loading, setLoading] = useState(false); // Loading for the main screen
    const [modalVisible, setModalVisible] = useState(false);
    const [boletoLink, setBoletoLink] = useState("");
    const [digitableNumber, setDigitableNumber] = useState("");
    const [modalLoading, setModalLoading] = useState(false); // Loading for the modal

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
        const username = "engenharq-mozart";
        const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb"; // Substitua pela sua senha
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
          value: `R$ ${installment.currentBalance.toFixed(2)}`,
          status: new Date(installment.dueDate) < new Date() ? "vencido" : "pendente",
          installmentId: installment.installmentId,
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
      setSelectedInstallment(item);
      setShowActions(false);
    };

    const toggleActions = () => {
      if (!selectedInstallment) {
        Alert.alert("Atenção", "Selecione uma parcela antes de continuar.");
        return;
      }
      setShowActions(!showActions);
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
      if (selectedParcel && selectedParcel !== "Número da Parcela") {
        return installments.filter((item) => item.number === selectedParcel);
      }
      return installments;
    };

    const resetFilters = () => {
      setSelectedParcel("Número da Parcela");
      setStartDate(null);
      setEndDate(null);
    };

    const renderItem = ({ item }) => (
      <TouchableOpacity
        style={[
          styles.card,
          item.status === "vencido" ? styles.overdueCard : styles.pendingCard,
          selectedInstallment?.id === item.id && styles.selectedCard,
        ]}
        onPress={() => handleSelectInstallment(item)}
      >
        <Text style={styles.cardNotice}>Clique para selecionar</Text>
        <Text style={styles.cardTitle}>Número da Parcela {item.number}</Text>
        <Text style={styles.cardSubtitle}>Número do Título {item.billReceivableId}</Text>
        <Text style={styles.cardSubtitle}>Vencimento {item.dueDate}</Text>
        <Text style={styles.cardValue}>Valor {item.value}</Text>
      </TouchableOpacity>
    );

    const handleRequestEmail = async () => {
      if (!selectedInstallment) {
        Alert.alert("Atenção", "Selecione uma parcela antes de continuar.");
        return;
      }

      setLoading(true);

      try {
        const username = "engenharq-mozart";
        const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb"; // Substitua pela sua senha
        const credentials = btoa(`${username}:${password}`);

        const response = await axios.post(
          "https://api.sienge.com.br/engenharq/public/api/v1/payment-slip-notification",
          {
            billReceivableId: selectedInstallment.billReceivableId,
            installmentId: selectedInstallment.installmentId,
            emailCustomer: userData.email,
            emailTitle: "Antecipação de parcela",
            emailBody:
              "Prezado cliente, segue o boleto da parcela antecipada conforme solicitado.",
          },
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 201) {
          Alert.alert(
            "Sucesso",
            "Boleto enviado com sucesso para o email: " + userData.email
          );
        } else {
          Alert.alert("Erro", "Falha ao enviar o boleto.");
        }
      } catch (error) {
        console.error("Erro ao enviar boleto por e-mail:", error);
        Alert.alert("Erro", "Não foi possível enviar o boleto por e-mail.");
      } finally {
        setLoading(false);
      }
    };

    const handleDownloadBoleto = async () => {
      if (!selectedInstallment) {
        Alert.alert("Atenção", "Selecione uma parcela antes de continuar.");
        return;
      }

      setModalLoading(true);
      setModalVisible(true);

      try {
        const username = "engenharq-mozart";
        const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
        const credentials = btoa(`${username}:${password}`);

        const response = await axios.get(
          "https://api.sienge.com.br/engenharq/public/api/v1/payment-slip-notification",
          {
            params: {
              billReceivableId: selectedInstallment.billReceivableId,
              installmentId: selectedInstallment.installmentId,
            },
            headers: {
              Authorization: `Basic ${credentials}`,
            },
          }
        );

        if (response.data.results && response.data.results[0]) {
          const boletoData = response.data.results[0];
          setBoletoLink(boletoData.urlReport);
          setDigitableNumber(boletoData.digitableNumber);
        } else {
          Alert.alert("Erro", "Falha ao gerar o link do boleto.");
          setModalVisible(false);
        }
      } catch (error) {
        console.error("Erro ao gerar link do boleto:", error);
        Alert.alert("Erro", "Erro ao gerar o link do boleto.");
        setModalVisible(false);
      } finally {
        setModalLoading(false);
      }
    };

    const handlePayWithPix = () => {
      Alert.alert("PIX", "Pagamento via PIX não implementado.");
    };

    const parcelNumbers = [
      "Número da Parcela",
      ...new Set(data.map((item) => item.number)),
    ];

    const filteredData = filterByDate(filterByParcelNumber(data));

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="menu" size={28} color="white" />
          <Ionicons name="notifications-outline" size={28} color="white" />
        </View>

        <Text style={styles.title}>RESIDENCIAL GRAND RESERVA</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>ANTECIPAR PARCELAS</Text>
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
                label={parcelNumber}
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
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={styles.list}
          />
        )}

        <TouchableOpacity style={styles.floatingButton} onPress={toggleActions}>
          <Ionicons name="cash-outline" size={24} color="white" />
        </TouchableOpacity>

        {showActions && (
          <View style={styles.actionsOverlay}>
            <TouchableOpacity style={styles.actionItem} onPress={handleRequestEmail}>
              <Ionicons name="mail-outline" size={20} color="white" />
              <Text style={styles.actionText}>ENVIAR PELO E-MAIL</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleDownloadBoleto}>
              <Ionicons name="download-outline" size={20} color="white" />
              <Text style={styles.actionText}>BAIXAR BOLETO</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handlePayWithPix}>
              <Image
                source={require("./logo-pix.svg")}
                style={styles.pixIcon}
              />
              <Text style={styles.actionText}>PAGAR VIA PIX</Text>
            </TouchableOpacity>
          </View>
        )}

        {modalVisible && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(false);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                {modalLoading ? (
                  <ActivityIndicator size="large" color="#E1272C" />
                ) : (
                  <>
                    <Text style={styles.modalTitle}>Boleto Gerado com Sucesso</Text>
                    <Text style={styles.modalLabel}>Linha Digitável:</Text>
                    <TouchableOpacity
                      onPress={() => {
                        Clipboard.setStringAsync(digitableNumber);
                        Alert.alert(
                          "Copiado",
                          "Linha digitável copiada para a área de transferência."
                        );
                      }}
                    >
                      <Text style={styles.modalDigitableNumber}>{digitableNumber}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => {
                        Linking.openURL(boletoLink);
                      }}
                    >
                      <Text style={styles.modalButtonText}>Baixar Boleto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => {
                        setModalVisible(false);
                      }}
                    >
                      <Text style={styles.modalCloseButtonText}>Fechar</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  };

const styles = StyleSheet.create({
  // Seus estilos...
  container: {
    flex: 1,
    backgroundColor: "#FAF6F6",
    padding: 16,
  },
  pixIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#E1272C",
    paddingVertical: 16,
    paddingHorizontal: 16,
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
    marginBottom: 16,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  searchContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
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
  },
  resetButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  list: {
    flex: 1,
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
    bottom: 20,
    right: 20,
  },
  actionsOverlay: {
    position: "absolute",
    bottom: 100,
    right: 20,
    alignItems: "center",
  },
  actionItem: {
    backgroundColor: "#555",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    width: 180,
  },
  actionText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    width: "85%",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  modalDigitableNumber: {
    fontSize: 16,
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  modalButton: {
    backgroundColor: "#E1272C",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginBottom: 10,
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
});

export default ParcelAntecipation;
