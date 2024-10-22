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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { PDFDocument } from "pdf-lib";
import { Buffer } from "buffer";
global.Buffer = Buffer;

import PixIcon from "./logo-pix.svg";

const ParcelAntecipation = () => {
  const { userData } = useContext(UserContext);
  const { billReceivableId } = useLocalSearchParams();
  const [showActions, setShowActions] = useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState("Número da Parcela");
  const [startDate, setStartDate] = useState(null); // Data inicial
  const [endDate, setEndDate] = useState(null); // Data final
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [data, setData] = useState([]); // Dados das parcelas
  const [loading, setLoading] = useState(false); // Loading for the main screen
  const [modalVisible, setModalVisible] = useState(false);
  const [boletoLinks, setBoletoLinks] = useState([]); // Array de links de boletos
  const [digitableNumbers, setDigitableNumbers] = useState([]); // Array de linhas digitáveis
  const [modalLoading, setModalLoading] = useState(false); // Loading for the modal
  // Removido o estado customerId

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

      const selectedResult = results.find(
        (result) => result.billReceivableId == billReceivableId
      );

      if (!selectedResult) {
        Alert.alert("Erro", "Título não encontrado.");
        setLoading(false);
        return;
      }

      // Não precisamos mais do selectedResult.customerId

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
    setShowActions(false);
  };

  const toggleActions = () => {
    if (selectedInstallments.length === 0) {
      Alert.alert(
        "Atenção",
        "Selecione ao menos uma parcela antes de continuar."
      );
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

  const handleRequestEmail = async () => {
    if (selectedInstallments.length === 0) {
      Alert.alert(
        "Atenção",
        "Selecione ao menos uma parcela antes de continuar."
      );
      return;
    }
  
    // Verifica se todos os boletos estão disponíveis
    const allBoletosAvailable = selectedInstallments.every(
      (installment) => installment.generatedBoleto
    );
  
    if (!allBoletosAvailable) {
      Alert.alert(
        "Atenção",
        "Nem todos os boletos estão disponíveis para envio por e-mail."
      );
      return;
    }
  
    setLoading(true);
  
    try {
      const username = "engenharq-mozart";
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`);
  
      // Enviar um e-mail para cada parcela selecionada

      for (const installment of selectedInstallments) {
      console.log(installment.billReceivableId, installment.installmentId)

        const response = await axios.post(
          "https://api.sienge.com.br/engenharq/public/api/v1/payment-slip-notification",
          {
            receivableBillId: installment.billReceivableId,
            installmentId: installment.installmentId,
            emailCustomer: userData.email,
            emailTitle: "Antecipação de parcelas",
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
  
        if (response.status !== 201) {
          Alert.alert(
            "Erro",
            `Falha ao enviar o boleto da parcela ${installment.number}.`
          );
          break;
        }
      }
  
      Alert.alert(
        "Sucesso",
        `Boletos enviados com sucesso para o email: ${userData.email}`
      );
    } catch (error) {
      console.error("Erro ao enviar boletos por e-mail:", error);
      Alert.alert("Erro", "Não foi possível enviar os boletos por e-mail.");
    } finally {
      setLoading(false);
    }
  };
  

  const handleDownloadBoleto = async () => {
    if (selectedInstallments.length === 0) {
      Alert.alert(
        "Atenção",
        "Selecione ao menos uma parcela antes de continuar."
      );
      return;
    }

    // Verifica se todos os boletos estão disponíveis
    const allBoletosAvailable = selectedInstallments.every(
      (installment) => installment.generatedBoleto
    );

    if (!allBoletosAvailable) {
      Alert.alert(
        "Atenção",
        "Nem todos os boletos estão disponíveis para download."
      );
      return;
    }

    setModalLoading(true);
    setModalVisible(true);

    try {
      const username = "engenharq-mozart";
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`);

      const pdfUrls = [];
      const digitableNumbers = [];

      for (const installment of selectedInstallments) {
        const response = await axios.get(
          "https://api.sienge.com.br/engenharq/public/api/v1/payment-slip-notification",
          {
            params: {
              billReceivableId: installment.billReceivableId,
              installmentId: installment.installmentId,
            },
            headers: {
              Authorization: `Basic ${credentials}`,
            },
          }
        );

        if (response.data.results && response.data.results[0]) {
          const boletoData = response.data.results[0];
          pdfUrls.push(boletoData.urlReport);
          digitableNumbers.push(boletoData.digitableNumber);
        } else {
          Alert.alert(
            "Erro",
            "Falha ao gerar o link do boleto para a parcela " +
              installment.number
          );
          setModalVisible(false);
          return;
        }
      }

      setBoletoLinks(pdfUrls);
      setDigitableNumbers(digitableNumbers);
    } catch (error) {
      console.error("Erro ao gerar link do boleto:", error);
      Alert.alert("Erro", "Erro ao gerar o link dos boletos.");
      setModalVisible(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDownloadAllBoletos = async () => {
    setModalLoading(true);

    try {
      const tempDir = `${FileSystem.documentDirectory}tempBoletos/`;

      // Cria o diretório temporário principal se não existir
      const dirInfo = await FileSystem.getInfoAsync(tempDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
      }

      const mergedPdf = await PDFDocument.create();

      // Baixa todos os PDFs e os combina
      for (let i = 0; i < boletoLinks.length; i++) {
        const boletoUrl = boletoLinks[i];
        const installmentNumber = selectedInstallments[i].number;

        // Define o caminho direto no diretório temporário, sem subdiretórios
        const fileName = `boleto_parcela_${installmentNumber}.pdf`;
        const filePath = `${tempDir}${fileName}`; // Diretório simples, sem subdiretórios adicionais

        // Baixa o arquivo PDF
        const downloadResumable = FileSystem.createDownloadResumable(
          boletoUrl,
          filePath
        );

        const { uri } = await downloadResumable.downloadAsync();

        // Lê o conteúdo do PDF como bytes
        const fileData = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Converte o base64 em array de bytes
        const pdfBytes = Buffer.from(fileData, "base64");

        // Carrega o PDF com o pdf-lib
        const pdf = await PDFDocument.load(pdfBytes);

        // Copia as páginas para o PDF mesclado
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      // Salva o PDF mesclado
      const mergedPdfBytes = await mergedPdf.save();
      const mergedPdfBase64 = Buffer.from(mergedPdfBytes).toString("base64");

      const mergedPdfPath = `${FileSystem.documentDirectory}boletos_combinados.pdf`;

      // Salva o arquivo PDF mesclado no sistema de arquivos
      await FileSystem.writeAsStringAsync(mergedPdfPath, mergedPdfBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert("Sucesso", "Boletos combinados em um único PDF.");

      // Compartilha o arquivo PDF mesclado
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(mergedPdfPath);
      } else {
        Alert.alert("Erro", "Compartilhamento não suportado no dispositivo.");
      }

      // Limpa o diretório temporário
      await FileSystem.deleteAsync(tempDir);
    } catch (error) {
      console.error("Erro ao combinar os boletos:", error);
      Alert.alert("Erro", "Erro ao combinar os boletos em um único PDF.");
    } finally {
      setModalLoading(false);
    }
  };

  const handlePayWithPix = async () => {
    if (selectedInstallments.length === 0) {
      Alert.alert(
        "Atenção",
        "Selecione ao menos uma parcela antes de continuar."
      );
      return;
    }

    if (!userData || !userData.id) {
      Alert.alert("Erro", "Dados do cliente não encontrados.");
      return;
    }

    const customerId = userData.id; // Obtém o customerId de userData

    const totalAmount = selectedInstallments.reduce((sum, installment) => {
      return sum + parseFloat(installment.currentBalance);
    }, 0);

    setLoading(true);

    try {
      const username = "engenharq-mozart";
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
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

      const message = `Olá, meu nome é ${userData?.name}, meu CPF é ${userData?.cpf} gostaria de antecipar as parcelas: ${installmentNumbers} do título ${billReceivableId}. Valor total: R$ ${totalAmount.toFixed(
        2
      )}`;

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        message
      )}`;

      // Abrir o WhatsApp
      const supported = await Linking.canOpenURL(whatsappUrl);

      if (supported) {
        await Linking.openURL(whatsappUrl);
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
    "Número da Parcela",
    ...new Set(data.map((item) => item.number)),
  ];

  const filteredData = filterByDate(filterByParcelNumber(data));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="arrow-back-outline" size={28} color="white" />
        <Text style={styles.headerTitle}>Antecipação de Parcelas</Text>
        <Ionicons name="notifications-outline" size={28} color="white" />
      </View>

      <Text style={styles.title}>Residencial Grand Reserva</Text>
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
              label={`Parcela ${parcelNumber}`}
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
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <TouchableOpacity style={styles.floatingButton} onPress={toggleActions}>
        <Ionicons name="cash-outline" size={24} color="white" />
      </TouchableOpacity>

      {showActions && (
        <View style={styles.actionsOverlay}>
          {selectedInstallments.every(
            (installment) => installment.generatedBoleto
          ) ? (
            <>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleRequestEmail}
              >
                <Ionicons name="mail-outline" size={20} color="white" />
                <Text style={styles.actionText}>Enviar por E-mail</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleDownloadBoleto}
              >
                <Ionicons name="download-outline" size={20} color="white" />
                <Text style={styles.actionText}>Baixar Boletos</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity style={styles.actionItem} onPress={handlePayWithPix}>
            <PixIcon width={20} height={20} />
            <Text style={styles.actionText}>Falar no WhatsApp</Text>
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
                  <Text style={styles.modalTitle}>
                    Boletos Gerados com Sucesso
                  </Text>
                  <ScrollView style={{ maxHeight: 400 }}>
                    {digitableNumbers.map((number, index) => (
                      <View key={index} style={styles.modalItem}>
                        <Text style={styles.modalLabel}>
                          Linha Digitável da Parcela{" "}
                          {selectedInstallments[index].number}:
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            Clipboard.setStringAsync(number);
                            Alert.alert(
                              "Copiado",
                              "Linha digitável copiada para a área de transferência."
                            );
                          }}
                        >
                          <Text style={styles.modalDigitableNumber}>
                            {number}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.modalButton}
                          onPress={() => {
                            Linking.openURL(boletoLinks[index]);
                          }}
                        >
                          <Text style={styles.modalButtonText}>
                            Baixar Boleto
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                  {/* Botão para baixar todos os boletos */}
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={handleDownloadAllBoletos}
                  >
                    <Text style={styles.modalButtonText}>
                      Baixar Todos os Boletos
                    </Text>
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
  container: {
    flex: 1,
    backgroundColor: "#FAF6F6",
  },
  pixIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
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
  actionsOverlay: {
    position: "absolute",
    bottom: 100,
    right: 20,
    alignItems: "flex-end",
  },
  actionItem: {
    backgroundColor: "#555",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    width: 220,
    elevation: 3,
  },
  actionText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "bold",
    fontSize: 16,
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
  modalDigitableNumber: {
    fontSize: 16,
    color: "#555",
    marginBottom: 15,
    textAlign: "center",
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
    marginBottom: 20,
    alignItems: "center",
  },
});

export default ParcelAntecipation;
