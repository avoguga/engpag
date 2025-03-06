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
  Image,
} from "react-native";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import Baixar from "./baixarboleto.svg";

const BoletoScreen = () => {
  const { userData } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [boletoLink, setBoletoLink] = useState("");
  const [digitableNumber, setDigitableNumber] = useState("");
  const [availableInstallments, setAvailableInstallments] = useState([]);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSupportModalVisible, setIsSupportModalVisible] = useState(false);
  const [hasOverdueInstallment, setHasOverdueInstallment] = useState(false);
  const { enterpriseName, billReceivableId, unityName } =
    useLocalSearchParams();
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchAvailableInstallment();
  }, [userData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString + "T00:00:00Z");
    const day = date.getUTCDate().toString().padStart(2, "0");
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const excludedConditionTypes = [
    "Cartão de crédito",
    "Cartão de débito",
    "Sinal + cartão de crédito",
    "Financiamento",
    "Parcela de cartão de crédito",
    "Promissória",
    "Valor do terreno",
    "PIX", // Inclua "PIX" se necessário
  ];

  // Função para computar os campos (status e dias de atraso) e atualizar o boleto selecionado
  const processAndSetSelectedInstallment = (installment) => {
    const today = new Date();
    const dueDate = new Date(installment.dueDate);
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    let status = "Aguardando pagamento";
    let overdue = false;
    if (installment.paidDate) {
      status = "Pago";
    } else if (dueDate < today) {
      status = "Vencido";
      if (daysOverdue > 30) {
        overdue = true;
      }
    }
    installment.status = status;
    installment.daysOverdue = daysOverdue;
    setHasOverdueInstallment(overdue);
    setSelectedInstallment(installment);
  };

  const formatConditionType = (text) => {
    return text.toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  };

  const fetchAvailableInstallment = async () => {
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
      const credentials = btoa(
        "engenharq-mozart:wfW2ra73xSbH5r4AbQne4WesFDb1NaWe"
      );
      const searchParam = userData.cpf
        ? { cpf: userData.cpf, correctAnnualInstallment: "N" }
        : { cnpj: userData.cnpj, correctAnnualInstallment: "N" };
      const response = await axios.get(
        "https://engpag.backend.gustavohenrique.dev/proxy/current-debit-balance",
        {
          params: searchParam,
          headers: { Authorization: `Basic ${credentials}` },
        }
      );

      const results = response.data.results || [];
      let generatedInstallments = [];
      let nonGeneratedInstallments = [];

      // Encontrar o título que corresponde ao billReceivableId passado
      const bill = results.find(
        (bill) => bill.billReceivableId === parseInt(billReceivableId, 10)
      );

      if (bill) {
        const installments = [
          ...(bill.dueInstallments || []),
          ...(bill.payableInstallments || []),
        ];

        // Filter out excluded condition types
        const validInstallments = installments.filter(
          (installment) => 
            !excludedConditionTypes.includes(
              installment.conditionType ? installment.conditionType.trim() : ""
            )
        );

        validInstallments.forEach((installment) => {
          if (installment.generatedBoleto) {
            generatedInstallments.push({
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

        if (generatedInstallments.length > 0) {
          generatedInstallments.sort(
            (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
          );
          setAvailableInstallments(generatedInstallments);
          processAndSetSelectedInstallment(generatedInstallments[0]);
        } else if (nonGeneratedInstallments.length > 0) {
          Alert.alert(
            "Boleto indisponível",
            "Nenhum boleto está disponível no momento. Por favor, entre em contato com o suporte via WhatsApp para solicitar a geração.",
            [
              {
                text: "Falar com suporte",
                onPress: () => handleSendWhatsAppMessage(),
              },
              {
                text: "Cancelar",
                style: "cancel",
              },
            ]
          );
        } else {
          Alert.alert(
            "Nenhum Boleto Disponível",
            "Nenhum boleto está disponível no momento.",
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert(
          "Erro",
          "Título não encontrado. Por favor, entre em contato com o suporte."
        );
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
      const credentials = btoa(
        "engenharq-mozart:wfW2ra73xSbH5r4AbQne4WesFDb1NaWe"
      );

      let companyId = null;

      const response = await axios.get(
        `https://engpag.backend.gustavohenrique.dev/proxy/accounts-receivable/receivable-bills/${billReceivableId}`,
        {
          params: { customerId: userData.id },
          headers: { Authorization: `Basic ${credentials}` },
        }
      );
      console.log(response.data.companyId, "oi");
      companyId = response.data.companyId;

      const companyInfo = {
        1: { name: "Engenharq", whatsappNumber: "558296890033" },
        2: { name: "EngeLot", whatsappNumber: "558296890066" },
        3: { name: "EngeLoc", whatsappNumber: "558296890202" },
        default: { name: "Desconhecida", whatsappNumber: "5585986080000" },
      };

      const { whatsappNumber } =
        (companyId && companyInfo[companyId]) || companyInfo.default;

      const getCurrentMonthDate = () => {
        const now = new Date();
        now.setMonth(now.getMonth() + 1); // Adiciona 1 mês
        return `${now.getDate().toString().padStart(2, "0")}/${(
          now.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}/${now.getFullYear()}`;
      };

      let message = "";

      if (!selectedInstallment) {
        // Caso 1: Cliente já pagou e quer pagar próximo mês
        message = `Olá, meu nome é ${userData.name}. Gostaria de verificar a disponibilidade da 2ª via de boleto no sistema, referente ao empreendimento ${enterpriseName}, da unidade ${unityName} - correspondente ao título ${billReceivableId}.`;
      } else if (
        hasOverdueInstallment ||
        selectedInstallment.daysOverdue > 30
      ) {
        // Caso 2: Cliente inadimplente após 30 dias
        message = `Olá, meu nome é ${
          userData.name
        }. Gostaria de solicitar a liberação e geração de um novo boleto para pagamento referente ao empreendimento ${enterpriseName} cujo vencimento original era dia ${formatDate(
          selectedInstallment.dueDate
        )}. Referente a unidade ${unityName} - correspondente ao título ${billReceivableId}.`;
      } else {
        // Caso 3: Pagamento normal
        message = `Olá, meu nome é ${
          userData.name
        }. Gostaria de solicitar a geração de uma segunda via do boleto para pagamento referente ao empreendimento ${enterpriseName} cujo vencimento é dia ${formatDate(
          selectedInstallment.dueDate
        )}. Referente a unidade ${unityName} - correspondente ao título ${billReceivableId}.`;
      }

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
      !selectedInstallment ||
      !selectedInstallment.billReceivableId ||
      !selectedInstallment.installmentId
    ) {
      Alert.alert("Erro", "Informações da parcela não disponíveis.");
      return;
    }

    const today = new Date();
    const dueDate = new Date(selectedInstallment.dueDate);
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

    if (hasOverdueInstallment || daysOverdue > 30) {
      Alert.alert(
        "Boleto indisponível",
        "Este boleto está vencido há mais de 30 dias. Por favor, entre em contato com o suporte via WhatsApp para liberar o pagamento e gerar uma nova via.",
        [
          {
            text: "Falar com suporte",
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

    if (!selectedInstallment.generatedBoleto) {
      setIsSupportModalVisible(true);
      return;
    }

    setLoading(true);

    try {
      const credentials = btoa(
        "engenharq-mozart:wfW2ra73xSbH5r4AbQne4WesFDb1NaWe"
      );

      const response = await axios.get(
        "https://engpag.backend.gustavohenrique.dev/proxy/payment-slip-notification",
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
        setBoletoLink(response.data.results[0].urlReport);
        setDigitableNumber(response.data.results[0].digitableNumber);
        setIsModalVisible(true);

        // Enviar requisição para agendar o lembrete do boleto
        try {
          await axios.post(
            "https://engpag.backend.gustavohenrique.dev/schedule-boleto",
            {
              email: userData.email,
              vencimento: selectedInstallment.dueDate,
              userName: userData.name,
            }
          );
          console.log("Lembrete do boleto agendado com sucesso.");
        } catch (error) {
          console.error("Erro ao agendar o lembrete do boleto:", error);
        }
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
      !selectedInstallment ||
      !selectedInstallment.billReceivableId ||
      !selectedInstallment.installmentId
    ) {
      Alert.alert(
        "Erro",
        "Dados do usuário ou informações da parcela não encontrados."
      );
      return;
    }

    if (!selectedInstallment.generatedBoleto) {
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
              const credentials = btoa(
                "engenharq-mozart:wfW2ra73xSbH5r4AbQne4WesFDb1NaWe"
              );
              const responseBoleto = await axios.get(
                "https://engpag.backend.gustavohenrique.dev/proxy/payment-slip-notification",
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

              if (
                responseBoleto.data.results &&
                responseBoleto.data.results[0]
              ) {
                const boletoUrl = responseBoleto.data.results[0].urlReport;

                const responseEmail = await axios.post(
                  "https://engpag.backend.gustavohenrique.dev/send-email",
                  {
                    email: userData.email,
                    boletoUrl: boletoUrl,
                    userName: userData.name,
                  }
                );

                // Enviar requisição para agendar o lembrete do boleto
                try {
                  await axios.post(
                    "https://engpag.backend.gustavohenrique.dev/schedule-boleto",
                    {
                      email: userData.email,
                      vencimento: selectedInstallment.dueDate,
                      userName: userData.name,
                    }
                  );
                  console.log("Lembrete do boleto agendado com sucesso.");
                } catch (error) {
                  console.error("Erro ao agendar o lembrete do boleto:", error);
                }

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
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: 20,
          backgroundColor: "#880000",
          borderRadius: 40,
          marginHorizontal: 5,
          height: "100%",
        }}
      >
        <ScrollView>
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
          <Text style={styles.sectionTitle}>2ª Via de boletos</Text>

              {/* Display "Selecione a parcela" text when there are multiple boletos */}
              {availableInstallments.length > 1  && (
            <Text style={styles.selectParcelText}>Selecione a parcela</Text>
          )}


          {/* Exibe o Picker caso haja mais de um boleto disponível */}
          {availableInstallments.length > 1 && (
            <Picker
              selectedValue={
                selectedInstallment ? selectedInstallment.installmentId : null
              }
              style={styles.picker}
              onValueChange={(itemValue) => {
                const installment = availableInstallments.find(
                  (inst) => inst.installmentId === itemValue
                );
                if (installment) {
                  processAndSetSelectedInstallment(installment);
                }
              }}
            >
              {availableInstallments.map((inst) => (
                <Picker.Item
                  key={inst.installmentId}
                  label={`${formatConditionType(inst.conditionType)} ${
                    inst.installmentNumber
                  } - Venc: ${formatDate(inst.dueDate)}`}
                  value={inst.installmentId}
                />
              ))}
            </Picker>
          )}

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#E1272C"
              style={{ marginTop: 20 }}
            />
          ) : (
            <>
              {selectedInstallment ? (
                <>
                  <View style={styles.infoContainer}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>
                        {formatConditionType(selectedInstallment.conditionType)}:
                      </Text>
                      <Text style={styles.infoValue}>
                        {selectedInstallment.installmentNumber}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Vencimento:</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(selectedInstallment.dueDate)}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Número do Título:</Text>
                      <Text style={styles.infoValue}>
                        {selectedInstallment.billReceivableId}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Situação:</Text>
                      <Text style={styles.infoValue}>
                        {selectedInstallment.status}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Valor:</Text>
                      <Text style={styles.infoValue}>
                        {parseFloat(
                          selectedInstallment.currentBalance
                        ).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.buttonContainer}>
                    {hasOverdueInstallment ? (
                      <TouchableOpacity
                        style={styles.contactSupportButton}
                        onPress={() => handleSendWhatsAppMessage()}
                      >
                        <Ionicons
                          name="logo-whatsapp"
                          size={20}
                          color="white"
                        />
                        <Text style={styles.contactSupportButtonText}>
                          {" "}
                          Falar com suporte
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={requestBoletoLink}
                        >
                          <Image
                            style={{
                              width: 300,
                              height: 80,
                              resizeMode: "contain",
                            }}
                            source={require("./baixa.png")}
                          />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {hasOverdueInstallment ? (
                    <View style={styles.warningContainer}>
                      <Image
                        source={require("./warning.png")}
                        style={styles.warningLogo}
                        resizeMode="contain"
                      />
                      <Text style={styles.warningText}>
                        Este boleto está vencido há mais de 30 dias. Por favor,
                        entre em contato com o suporte via WhatsApp para liberar
                        o pagamento e gerar uma nova via.
                      </Text>
                    </View>
                  ) : selectedInstallment.status === "Vencido" ? (
                    <View style={styles.warningContainer}>
                      <Image
                        source={require("./warning.png")}
                        style={styles.warningLogo}
                        resizeMode="contain"
                      />
                      <Text style={styles.warningText}>
                        Este boleto está vencido. Você pode gerar uma segunda
                        via ou entrar em contato com o suporte para mais
                        informações.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.warningContainer}>
                      <Image
                        source={require("./warning.png")}
                        style={styles.warningLogo}
                        resizeMode="contain"
                      />
                      <Text style={styles.warningText}>
                        Após 30 dias de vencimento, será necessário falar com o
                        suporte para solicitar uma nova via do boleto.
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.noBoletoContainer}>
                  <Text style={styles.noBoletoText}>
                    Nenhum boleto está disponível no momento. Por favor, entre
                    em contato com o suporte via WhatsApp para liberar o
                    pagamento.
                  </Text>
                  <TouchableOpacity
                    style={styles.contactSupportButton}
                    onPress={() => handleSendWhatsAppMessage()}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color="white" />
                    <Text style={styles.contactSupportButtonText}>
                      {" "}
                      Falar com suporte
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

          {/* Modal de suporte */}
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
                  Este boleto não está disponível. Por favor, entre em contato
                  com o suporte via WhatsApp para liberar o pagamento.
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
                    <Text style={styles.supportButtonText}>
                      Falar com suporte
                    </Text>
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
  selectParcelText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10, 
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
  warningContainer: {
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
    height: 100,
    width: "90%",
  },
  warningText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "justify",
    flexShrink: 1,

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
    backgroundColor: "#D00000",
    padding: 10,
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
    // Customize se necessário. Aqui mantemos a ação de baixar boleto via SVG.
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
    textAlign: "center",
  },
  picker: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 20,
    color: "#333",
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
  // Bottom Navigation Styles
  bottomSection: {
    width: "100%",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
  },
  navButton: {
    padding: 10,
  },
  warningLogo: {
    width: 90,
    height: 90,
    flexShrink: 1,

  },
  logoBottom: {
    width: 50,
  },
});

export default BoletoScreen;
