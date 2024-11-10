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
  const [isSupportModalVisible, setIsSupportModalVisible] = useState(false);
  const [hasOverdueInstallment, setHasOverdueInstallment] = useState(false);
  const { enterpriseName } = useLocalSearchParams();
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchAvailableInstallment();
  }, [userData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00Z'); 
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };
  
  const fetchAvailableInstallment = async () => {
    if (!userData || (!userData.cpf && !userData.cnpj)) {
      Alert.alert("Erro", "Dados do cliente não encontrados.");
      return;
    }

    setLoading(true);
    try {
      const credentials = btoa("engenharq-mozart:i94B1q2HUXf7PP7oscuIBygquSRZ9lhb");
      const searchParam = userData.cpf ? { cpf: userData.cpf, correctAnnualInstallment: "N" } : { cnpj: userData.cnpj, correctAnnualInstallment: "N" };
      const response = await axios.get(
        "https://api.sienge.com.br/engenharq/public/api/v1/current-debit-balance",
        {
          params: searchParam,
          headers: { Authorization: `Basic ${credentials}` },
        }
      );

      const results = response.data.results || [];
      let availableInstallments = [];
      let nonGeneratedInstallments = [];

      results.forEach((bill) => {
        const installments = [
          ...(bill.dueInstallments || []),
          ...(bill.payableInstallments || []),
        ];

        installments.forEach((installment) => {
          if (installment.generatedBoleto) {
            availableInstallments.push({
              ...installment,
              billReceivableId: bill.billReceivableId,
            });
          } else {
            nonGeneratedInstallments.push({
              ...installment,
              billReceivableId: bill.billReceivableId,
            });
          }
        });
      });

      if (availableInstallments.length > 0) {
        availableInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        const installment = availableInstallments[0];
        let status = "Pendente";
        const today = new Date();
        const dueDate = new Date(installment.dueDate);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        if (installment.paidDate) {
          status = "Pago";
        } else if (dueDate < today) {
          status = "Vencido";
          if (daysOverdue > 30) {
            setHasOverdueInstallment(true);
          }
        }

        setInstallmentDetails({ ...installment, status });
      } else if (nonGeneratedInstallments.length > 0) {
        Alert.alert(
          "Boleto Indisponível",
          "Nenhum boleto está disponível no momento. Por favor, entre em contato com o suporte via WhatsApp para liberar o pagamento.",
          [
            {
              text: "Falar com Suporte",
              onPress: () => handleSendWhatsAppMessage(),
            },
            {
              text: "Cancelar",
              style: "cancel",
            },
          ]
        );
      } else {
        Alert.alert("Nenhum Boleto Disponível", "Nenhum boleto está disponível no momento.", [{ text: "OK" }]);
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes da parcela:", error);
      Alert.alert("Erro", "Não foi possível obter os detalhes da parcela.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsAppMessage = async () => {
    if (!userData) {
      Alert.alert("Erro", "Dados do cliente não encontrados.");
      return;
    }

    setLoading(true);

    try {
      const credentials = btoa("engenharq-mozart:i94B1q2HUXf7PP7oscuIBygquSRZ9lhb");

      let companyId = null;

      if (installmentDetails) {
        const billReceivableId = installmentDetails.billReceivableId;
        const response = await axios.get(
          `https://api.sienge.com.br/engenharq/public/api/v1/accounts-receivable/receivable-bills/${billReceivableId}`,
          {
            params: { customerId: userData.id },
            headers: { Authorization: `Basic ${credentials}` },
          }
        );

        companyId = response.data.companyId;
      }

      const companyInfo = {
        1: { name: "Engenharq", whatsappNumber: "558296890033" },
        2: { name: "EngeLot", whatsappNumber: "558296890066" },
        3: { name: "EngeLoc", whatsappNumber: "558296890202" },
        default: { name: "Desconhecida", whatsappNumber: "5585986080000" },
      };

      const { whatsappNumber } = (companyId && companyInfo[companyId]) || companyInfo.default;

      const message = `Olá, meu nome é ${userData.name}, portador do ${userData.cpf ? `CPF ${userData.cpf}` : `CNPJ ${userData.cnpj}`}. Gostaria de solicitar assistência para liberar o pagamento do meu boleto referente ao empreendimento ${enterpriseName}.`;

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

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

    if (!installmentDetails || !installmentDetails.billReceivableId || !installmentDetails.installmentId) {
      Alert.alert("Erro", "Informações da parcela não disponíveis.");
      return;
    }

    const today = new Date();
    const dueDate = new Date(installmentDetails.dueDate);
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

    if (hasOverdueInstallment || daysOverdue > 30) {
      Alert.alert(
        "Boleto Indisponível",
        "Este boleto está vencido há mais de 30 dias. Por favor, entre em contato com o suporte via WhatsApp para liberar o pagamento e gerar uma nova via.",
        [
          {
            text: "Falar com Suporte",
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

    if (!installmentDetails.generatedBoleto) {
      setIsSupportModalVisible(true);
      return;
    }

    setLoading(true);

    try {
      const credentials = btoa("engenharq-mozart:i94B1q2HUXf7PP7oscuIBygquSRZ9lhb");

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
    if (!userData || !installmentDetails || !installmentDetails.billReceivableId || !installmentDetails.installmentId) {
      Alert.alert("Erro", "Dados do usuário ou informações da parcela não encontrados.");
      return;
    }

    if (!installmentDetails.generatedBoleto) {
      setIsSupportModalVisible(true);
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
              const credentials = btoa("engenharq-mozart:i94B1q2HUXf7PP7oscuIBygquSRZ9lhb");
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

              if (responseBoleto.data.results && responseBoleto.data.results[0]) {
                const boletoUrl = responseBoleto.data.results[0].urlReport;

                const responseEmail = await axios.post(
                  "https://engpag.backend.gustavohenrique.dev/send-email",
                  {
                    email: userData.email,
                    boletoUrl: boletoUrl,
                    userName: userData.name,
                  }
                );

                if (responseEmail.status === 200) {
                  Alert.alert("Sucesso", "E-mail com o boleto enviado com sucesso!");
                } else {
                  Alert.alert("Erro", "Falha ao enviar o e-mail com o boleto.");
                }
              } else {
                Alert.alert("Erro", "Falha ao obter o link do boleto.");
              }
            } catch (error) {
              console.error("Erro ao enviar o e-mail:", error);
              Alert.alert("Erro", "Não foi possível enviar o e-mail com o boleto.");
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
              <>
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
                  <Text style={styles.availabilityText}>
                    Boleto {installmentDetails.generatedBoleto ? "Disponível" : "Indisponível"}
                  </Text>
                </View>

                {hasOverdueInstallment ? (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>
                      Este boleto está vencido há mais de 30 dias. Por favor,
                      entre em contato com o suporte via WhatsApp para liberar o
                      pagamento e gerar uma nova via.
                    </Text>
                  </View>
                ) : installmentDetails.status === "Vencido" ? (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>
                      Este boleto está vencido. Você pode gerar uma segunda via
                      ou entrar em contato com o suporte para mais informações.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>
                      Após 30 dias de vencimento, será necessário falar com o
                      suporte para solicitar uma nova via do boleto.
                    </Text>
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  {hasOverdueInstallment ? (
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
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={requestBoletoLink}
                      >
                        <Ionicons
                          name="download-outline"
                          size={20}
                          color="white"
                        />
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
                          Enviar para E-mail
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.noBoletoContainer}>
                <Text style={styles.noBoletoText}>
                  Nenhum boleto está disponível no momento. Por favor, entre em
                  contato com o suporte via WhatsApp para liberar o pagamento.
                </Text>
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
                  style={styles.copyButton}
                  onPress={() => {
                    Clipboard.setString(digitableNumber);
                    Alert.alert("Copiado", "Linha digitável copiada!");
                  }}
                >
                  <Ionicons name="copy-outline" size={24} color="#E1272C" />
                  <Text style={styles.copyButtonText}>Copiar</Text>
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

        {/* Modal de Suporte */}
        <Modal
          visible={isSupportModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsSupportModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.supportModalContainer}>
              <Text style={styles.supportModalTitle}>Suporte</Text>
              <Text style={styles.supportModalText}>
                Este boleto não está disponível. Por favor, entre em contato com o suporte via WhatsApp para liberar o pagamento.
              </Text>
              <View style={styles.supportModalButtons}>
                <TouchableOpacity
                  style={styles.supportButton}
                  onPress={() => {
                    setIsSupportModalVisible(false);
                    handleSendWhatsAppMessage();
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="white" />
                  <Text style={styles.supportButtonText}>Falar com Suporte</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelSupportButton}
                  onPress={() => setIsSupportModalVisible(false)}
                >
                  <Text style={styles.cancelSupportButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  availabilityText: {
    marginTop: 10,
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    fontStyle: "italic",
  },
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
  noBoletoContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  noBoletoText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 15,
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
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  copyButtonText: {
    color: "#E1272C",
    fontSize: 16,
    marginLeft: 5,
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
  supportModalContainer: {
    backgroundColor: "#fff",
    width: "85%",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  supportModalTitle: {
    fontSize: 18,
    color: "#333",
    marginBottom: 15,
    fontWeight: "bold",
    textAlign: "center",
  },
  supportModalText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },
  supportModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  supportButton: {
    backgroundColor: "#25D366",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    elevation: 2,
  },
  supportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
    textAlign: "center",
  },
  cancelSupportButton: {
    backgroundColor: "#5B5B5B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    elevation: 2,
  },
  cancelSupportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default BoletoScreen;
