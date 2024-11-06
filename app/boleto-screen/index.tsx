import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  TouchableOpacity,
  ScrollView,
  Clipboard,
  Modal,
} from "react-native";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

const BoletoScreen = () => {
  const { userData } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [boletoLink, setBoletoLink] = useState("");
  const [digitableNumber, setDigitableNumber] = useState("");
  const [installmentDetails, setInstallmentDetails] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasOverdueInstallment, setHasOverdueInstallment] = useState(false);
  const { enterpriseName } = useLocalSearchParams();
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchAvailableInstallment();
  }, [userData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fetchAvailableInstallment = async () => {
    if (!userData || !userData.cpf) {
      Alert.alert("Erro", "Dados do cliente não encontrados.");
      return;
    }

    setLoading(true);
    try {
      const credentials = btoa(
        "engenharq-mozart:i94B1q2HUXf7PP7oscuIBygquSRZ9lhb"
      );
      const response = await axios.get(
        "https://api.sienge.com.br/engenharq/public/api/v1/current-debit-balance",
        {
          params: { cpf: userData.cpf, correctAnnualInstallment: "N" },
          headers: { Authorization: `Basic ${credentials}` },
        }
      );

      const results = response.data.results || [];
      let availableInstallments = [];

      results.forEach((bill) => {
        const installments = [
          ...(bill.dueInstallments || []),
          ...(bill.payableInstallments || []),
        ]
          .filter((installment) => installment.generatedBoleto)
          .map((installment) => ({
            ...installment,
            billReceivableId: bill.billReceivableId,
          }));
        availableInstallments.push(...installments);
      });

      if (availableInstallments.length > 0) {
        availableInstallments.sort(
          (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
        );
        const installment = availableInstallments[0];
        let status = "Pendente";
        const today = new Date();

        if (
          availableInstallments.some(
            (i) => new Date(i.dueDate) < today && !i.paidDate
          )
        ) {
          setHasOverdueInstallment(true);
          status = "Vencido";
        } else if (installment.paidDate) {
          status = "Pago";
        }

        setInstallmentDetails({ ...installment, status });
      } else {
        Alert.alert("Aviso", "Nenhum boleto disponível no momento.");
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes da parcela:", error);
      Alert.alert("Erro", "Não foi possível obter os detalhes da parcela.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsAppMessage = async () => {
    if (!userData || !userData.id || !installmentDetails) {
      Alert.alert("Erro", "Dados do cliente ou da parcela não encontrados.");
      return;
    }

    setLoading(true);

    try {
      const credentials = btoa(
        "engenharq-mozart:i94B1q2HUXf7PP7oscuIBygquSRZ9lhb"
      );

      const billReceivableId = installmentDetails.billReceivableId;

      const response = await axios.get(
        `https://api.sienge.com.br/engenharq/public/api/v1/accounts-receivable/receivable-bills/${billReceivableId}`,
        {
          params: { customerId: userData.id },
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

      const { whatsappNumber } = companyInfo[companyId] || companyInfo.default;

      const message = `Olá, meu nome é ${userData.name}, portador do CPF ${
        userData.cpf
      }. Gostaria de solicitar assistência para a parcela ${
        installmentDetails.installmentNumber
      } do título ${billReceivableId} referente ao empreendimento ${enterpriseName}. A parcela tem vencimento em ${formatDate(
        installmentDetails.dueDate
      )} e um valor de ${parseFloat(
        installmentDetails.currentBalance
      ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`;

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        message
      )}`;

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

  const requestBoletoLink = async () => {
    if (!userData) {
      Alert.alert("Erro", "Dados do cliente não encontrados.");
      return;
    }

    if (
      !installmentDetails ||
      !installmentDetails.billReceivableId ||
      !installmentDetails.installmentId
    ) {
      Alert.alert("Erro", "Informações da parcela não disponíveis.");
      return;
    }

    const today = new Date();
    const dueDate = new Date(installmentDetails.dueDate);
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

    if (hasOverdueInstallment || daysOverdue > 30) {
      Alert.alert(
        "Boleto Indisponível",
        "Este boleto está vencido ou há outras parcelas vencidas. Entre em contato com o suporte pelo WhatsApp para mais informações.",
        [
          {
            text: "Ir para o WhatsApp",
            onPress: () => handleSendWhatsAppMessage(),
          },
          {
            text: "Cancelar",
            style: "cancel",
          },
        ]
      );
      return;
    }

    setLoading(true);

    try {
      const credentials = btoa(
        "engenharq-mozart:i94B1q2HUXf7PP7oscuIBygquSRZ9lhb"
      );

      const response = await axios.get(
        "https://api.sienge.com.br/engenharq/public/api/v1/payment-slip-notification",
        {
          params: {
            billReceivableId: installmentDetails.billReceivableId,
            installmentId: installmentDetails.installmentId,
          },
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (response.data.results && response.data.results[0]) {
        setBoletoLink(response.data.results[0].urlReport);
        setDigitableNumber(response.data.results[0].digitableNumber);
        setIsModalVisible(true);
      } else {
        Alert.alert("Erro", "Falha ao gerar o link do boleto.");
      }
    } catch (error) {
      console.error("Erro ao gerar link do boleto:", error);
      Alert.alert("Erro", "Erro ao gerar o link do boleto.");
    } finally {
      setLoading(false);
    }
  };

  const requestBoletoEmail = async () => {
    if (
      !userData ||
      !installmentDetails ||
      !installmentDetails.billReceivableId ||
      !installmentDetails.installmentId
    ) {
      Alert.alert(
        "Erro",
        "Dados do usuário ou informações da parcela não encontrados."
      );
      return;
    }

    Alert.alert(
      "Confirmar Envio",
      "Tem certeza de que deseja enviar o boleto por e-mail?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Confirmar",
          onPress: async () => {
            setSendingEmail(true);

            try {
              const credentials = btoa(
                "engenharq-mozart:i94B1q2HUXf7PP7oscuIBygquSRZ9lhb"
              );
              const responseBoleto = await axios.get(
                "https://api.sienge.com.br/engenharq/public/api/v1/payment-slip-notification",
                {
                  params: {
                    billReceivableId: installmentDetails.billReceivableId,
                    installmentId: installmentDetails.installmentId,
                  },
                  headers: {
                    Authorization: `Basic ${credentials}`,
                  },
                }
              );

              if (
                responseBoleto.data.results &&
                responseBoleto.data.results[0]
              ) {
                const boletoUrl = responseBoleto.data.results[0].urlReport;

                const responseEmail = await axios.post(
                  "http://hw0oc4gc8ccwswwg4gk0kss8.167.88.39.225.sslip.io/send-email",
                  {
                    email: userData.email,
                    boletoUrl: boletoUrl,
                    userName: userData.name,
                  }
                );

                if (responseEmail.status === 200) {
                  Alert.alert(
                    "Sucesso",
                    "E-mail com o boleto enviado com sucesso!"
                  );
                } else {
                  Alert.alert("Erro", "Falha ao enviar o e-mail com o boleto.");
                }
              } else {
                Alert.alert("Erro", "Falha ao obter o link do boleto.");
              }
            } catch (error) {
              console.error("Erro ao enviar o e-mail:", error);
              Alert.alert(
                "Erro",
                "Não foi possível enviar o e-mail com o boleto."
              );
            } finally {
              setSendingEmail(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <View style={styles.circleIcon}>
            <Ionicons name="home-outline" size={40} color="white" />
          </View>
          <Text style={styles.title}>
            {enterpriseName || "Nome do Empreendimento"}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#E1272C"
            style={{ marginTop: 20 }}
          />
        ) : (
          <>
            {installmentDetails ? (
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Número da Parcela:</Text>
                  <Text style={styles.infoValue}>
                    {installmentDetails.installmentNumber}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Vencimento:</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(installmentDetails.dueDate)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Número do Título:</Text>
                  <Text style={styles.infoValue}>
                    {installmentDetails.billReceivableId}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Situação:</Text>
                  <Text style={styles.infoValue}>
                    {installmentDetails.status}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Valor:</Text>
                  <Text style={styles.infoValue}>
                    {parseFloat(
                      installmentDetails.currentBalance
                    ).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </Text>
                </View>
                <View style={styles.warningContainer}>
                  <Text style={styles.warningText}>
                    {hasOverdueInstallment
                      ? "Como se passaram 30 dias após o vencimento da parcela, é necessário solicitar uma nova via do boleto.\n \n Entre em contato com o suporte para gerar uma nova via do boleto e ficar em dia com os pagamentos!"
                      : "Após 30 dias de vencimento, é necessário falar com o suporte para solicitar uma nova via do boleto."}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noBoletoText}>
                Nenhum boleto disponível no momento.
              </Text>
            )}

            {installmentDetails && !hasOverdueInstallment && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={requestBoletoLink}
                >
                  <Ionicons name="download-outline" size={20} color="white" />
                  <Text style={styles.actionButtonText}>
                    {" "}
                    Gerar Link da Segunda Via
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={requestBoletoEmail}
                >
                  <Ionicons name="mail" size={20} color="white" />
                  <Text style={styles.actionButtonText}>
                    {" "}
                    Enviar para email
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {hasOverdueInstallment && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.contactSupportButton}
                  onPress={() => handleSendWhatsAppMessage()}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="white" />
                  <Text style={styles.contactSupportButtonText}>
                    {" "}
                    Falar com Suporte
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Linha Digitável:</Text>
              <View style={styles.digitableLineContainer}>
                <Text style={styles.digitableNumberValue}>
                  {digitableNumber}
                </Text>
                <TouchableOpacity
                  onPress={() => Clipboard.setString(digitableNumber)}
                >
                  <Ionicons name="copy-outline" size={24} color="#E1272C" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.boletoDownloadButton}
                onPress={() => Linking.openURL(boletoLink)}
              >
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={24}
                  color="white"
                />
                <Text style={styles.boletoDownloadButtonText}>
                  Baixar Boleto
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.closeModalButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  warningContainer: {
    backgroundColor: "#FFF3CD",
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  warningText: {
    color: "#856404",
    fontSize: 14,
    textAlign: "center",
  },
  contactSupportButton: {
    backgroundColor: "#25D366",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 15,
    elevation: 2,
  },
  contactSupportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#FAF6F6",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  topBar: {
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
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  circleIcon: {
    backgroundColor: "#E1272C",
    borderRadius: 50,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    color: "#333",
    textAlign: "center",
  },
  infoContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 20,
    width: "100%",
    marginBottom: 20,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    color: "#555",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  noBoletoText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
  buttonContainer: {
    marginTop: 10,
    alignItems: "center",
    width: "100%",
  },
  actionButton: {
    backgroundColor: "#5B5B5B",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    elevation: 2,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
    textAlign: "center",
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
  },
  modalTitle: {
    fontSize: 18,
    color: "#333",
    marginBottom: 15,
    fontWeight: "bold",
  },
  digitableLineContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    marginBottom: 15,
    width: "100%",
    justifyContent: "space-between",
  },
  digitableNumberValue: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  boletoDownloadButton: {
    backgroundColor: "#E1272C",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
    elevation: 2,
  },
  boletoDownloadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
    textAlign: "center",
  },
  closeModalButton: {
    backgroundColor: "#5B5B5B",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  closeModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default BoletoScreen;
