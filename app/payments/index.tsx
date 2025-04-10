import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  Platform,
  Image,
} from "react-native";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import {  MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

const excludedConditionTypes = [
  "Cartão de crédito",
  "Cartão de débito",
  "Sinal",
  "Financiamento",
  "Promissória",
  "Valor do terreno",
];

const filterValidPayments = (payments) => {
  return payments.filter((payment) => {
    const conditionType = payment.conditionType ? payment.conditionType.trim() : "";
    // Se for cartão de crédito, incluir somente se a parcela estiver paga
    if (conditionType === "Cartão de crédito") {
      return !!payment.paymentDate;
    }
    // Para os demais tipos excluídos, descartar a parcela
    if (excludedConditionTypes.includes(conditionType)) {
      return false;
    }
    return true;
  });
};


const formatDate = (dateString) => {
  if (!dateString) return "Data indisponível";
  const [year, month, day] = dateString.split("-");
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
};

const formatConditionType = (text) => {
  return text.toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
};

const PaymentHistory = () => {
  const { userData } = useContext(UserContext);
  const { billReceivableId, enterpriseName } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [installments, setInstallments] = useState([]);
  const [completedPayments, setCompletedPayments] = useState([]);
  const [filter, setFilter] = useState("A VENCER");

  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchInstallments();
    fetchCompletedPayments();
  }, [userData, billReceivableId]);

  const fetchInstallments = async () => {
    if (!userData || (!userData.cpf && !userData.cnpj) || !billReceivableId) {
      Alert.alert("Erro", "Dados do cliente ou ID do título não encontrados.");
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
          headers: { Authorization: `Basic ${credentials}` },
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

      const dueInstallments = filterValidPayments(
        selectedResult.dueInstallments || []
      );
      const payableInstallments = filterValidPayments(
        selectedResult.payableInstallments || []
      );

      const allInstallments = [...dueInstallments, ...payableInstallments].map(
        (installment) => ({
          ...installment,
          billReceivableId: selectedResult.billReceivableId,
          formattedDueDate: formatDate(installment.dueDate),
          currentBalance: parseFloat(
            installment.currentBalance || 0
          ).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          }),
          conditionType: installment.conditionType,
        })
      );

      setInstallments(allInstallments);
    } catch (error) {
      console.error("Erro ao buscar detalhes das parcelas:", error);
      Alert.alert("Erro", "Não foi possível obter os detalhes das parcelas.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedPayments = async () => {
    if (!userData || (!userData.cpf && !userData.cnpj) || !billReceivableId) {
      Alert.alert("Erro", "Dados do cliente ou ID do título não encontrados.");
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
          headers: { Authorization: `Basic ${credentials}` },
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

      const { paidInstallments } = selectedResult;

      if (!paidInstallments || paidInstallments.length === 0) {
        setCompletedPayments([]);
        setLoading(false);
        return;
      }

      // Processar todas as parcelas pagas com todos os recibos
      let allPayments = [];
      
      paidInstallments.forEach((installment) => {
        // Informações comuns da parcela
        const dueDate = formatDate(installment.dueDate);
        
        // Se não tiver recibos ou array vazio, criar uma entrada básica
        if (!installment.receipts || installment.receipts.length === 0) {
          allPayments.push({
            id: `${installment.installmentId}-no-receipt`,
            installmentId: installment.installmentId,
            installmentNumber: installment.installmentNumber,
            billReceivableId: selectedResult.billReceivableId,
            dueDate: installment.dueDate,
            formattedDueDate: dueDate,
            paymentDate: null,
            formattedPaymentDate: "Data indisponível",
            value: parseFloat(installment.adjustedValue || 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            }),
            adjustedValue: installment.adjustedValue,
            originalValue: installment.originalValue,
            currentBalance: installment.currentBalance,
            monetaryCorrectionValue: installment.monetaryCorrectionValue,
            baseDateOfCorrection: installment.baseDateOfCorrection,
            conditionType: installment.conditionType,
            indexerCode: installment.indexerCode,
            indexerName: installment.indexerName,
            indexerValueBaseDate: installment.indexerValueBaseDate,
            indexerValueCalculationDate: null,
            generatedBoleto: installment.generatedBoleto,
            receipt: null,
            hasMultipleReceipts: false,
            receipts: []
          });
          return; // Skip to next iteration
        }
        
        // Processar cada recibo da parcela
        installment.receipts.forEach((receipt, index) => {
          const paymentDate = receipt ? formatDate(receipt.receiptDate) : "Data indisponível";
          
          allPayments.push({
            id: `${installment.installmentId}-${receipt.receiptId}`,
            installmentId: installment.installmentId,
            installmentNumber: installment.installmentNumber,
            billReceivableId: selectedResult.billReceivableId,
            dueDate: installment.dueDate,
            formattedDueDate: dueDate,
            paymentDate: receipt?.receiptDate,
            formattedPaymentDate: paymentDate,
            value: parseFloat(receipt.receiptNetValue || 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            }),
            adjustedValue: installment.adjustedValue,
            originalValue: installment.originalValue,
            currentBalance: installment.currentBalance,
            monetaryCorrectionValue: installment.monetaryCorrectionValue,
            baseDateOfCorrection: installment.baseDateOfCorrection,
            conditionType: installment.conditionType,
            indexerCode: installment.indexerCode,
            indexerName: installment.indexerName,
            indexerValueBaseDate: installment.indexerValueBaseDate,
            indexerValueCalculationDate: receipt?.indexerValueCalculationDate,
            generatedBoleto: installment.generatedBoleto,
            receipt: {
              receiptId: receipt.receiptId,
              receiptValue: receipt.receiptValue,
              receiptNetValue: receipt.receiptNetValue,
              monetaryCorrectionValue: receipt.monetaryCorrectionValue,
              calculationDate: receipt.calculationDate,
              indexerValueCalculationDate: receipt.indexerValueCalculationDate,
            },
            hasMultipleReceipts: installment.receipts.length > 1,
            totalReceipts: installment.receipts.length,
            receiptIndex: index + 1
          });
        });
      });
      
      const validPayments = filterValidPayments(allPayments);
      setCompletedPayments(validPayments);
    } catch (error) {
      console.error("Erro ao buscar parcelas pagas:", error);
      Alert.alert("Erro", "Não foi possível obter as parcelas pagas.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentHistoryNavigation = async () => {
    if (!userData || !userData.id) {
      Alert.alert("Erro", "Dados do cliente não disponíveis.");
      return;
    }

    setLoadingHistory(true);

    try {
      const username = "engenharq-mozart";
      const password = "wfW2ra73xSbH5r4AbQne4WesFDb1NaWe";
      const credentials = btoa(`${username}:${password}`);

      const response = await axios.get(
        `http://201.51.197.250:3000/proxy/current-debit-balance/pdf`,
        {
          params: {
            customerId: userData.id,
          },
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (response.data && response.data.results && response.data.results[0]) {
        const url = response.data.results[0].urlReport;

        if (Platform.OS === "web") {
          const link = document.createElement("a");
          link.href = url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";

          if (navigator.userAgent.indexOf("Safari") !== -1) {
            link.setAttribute(
              "download",
              `historico-pagamento-${userData.id}.pdf`
            );
          }

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          await Linking.openURL(url);
        }
      } else {
        Alert.alert("Erro", "Histórico de pagamentos não disponível.");
      }
    } catch (error) {
      console.error("Erro ao buscar histórico de pagamentos:", error);
      Alert.alert("Erro", "Não foi possível obter o histórico de pagamentos.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const getFilteredInstallments = () => {
    const today = new Date();

    if (filter === "PAGOS") {
      return completedPayments;
    }

    return installments.filter((installment) => {
      const dueDate = new Date(installment.dueDate);
      if (filter === "VENCIDOS")
        return dueDate < today && !installment.paymentDate;
      if (filter === "A VENCER")
        return dueDate >= today && !installment.paymentDate;
    });
  };

  const getAmount = (item) => {
    if (item.receipt?.receiptNetValue) {
      return formatCurrency(item.receipt.receiptNetValue);
    }

    if (item.currentBalance) {
      return item.currentBalance;
    }

    return formatCurrency(0);
  };

  const formatCurrency = (value) => {
    return parseFloat(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const renderInstallmentItem = ({ item }) => {
    const isPaid = !!item.paymentDate;
    const dueDateObj = new Date(item.dueDate);
    const isOverdue = !isPaid && dueDateObj < new Date();
    const statusColor = isPaid ? "#2E7D32" : isOverdue ? "#E1272C" : "#FFA726";

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isPaid
            ? styles.paidBorder
            : isOverdue
            ? styles.overdueBorder
            : styles.dueBorder,
        ]}
        onPress={() => {
          setSelectedInstallment(item);
          setModalVisible(true);
        }}
      >
        <MaterialIcons name="attach-money" size={30} color={statusColor} />
        <View style={styles.cardContent}>
          {/* {item.hasMultipleReceipts && (
            <View style={styles.receiptBadge}>
              <Text style={styles.receiptBadgeText}>
                Recibo {item.receiptIndex} de {item.totalReceipts}
              </Text>
            </View>
          )}
           */}
          <Text style={[styles.cardTitle, { color: statusColor }]}>
            <Text style={[styles.label, { color: statusColor }]}>Vencimento: </Text>
            {item.formattedDueDate}
          </Text>
          <Text style={[styles.cardConditionType, { color: statusColor }]}>
            <Text style={[styles.label, { color: statusColor }]}>Condição: </Text>
            {formatConditionType(item.conditionType)}
          </Text>
          <Text style={[styles.cardAmount, { color: statusColor }]}>
            <Text style={[!item.paymentDate ? styles.label : styles.labell, { color: statusColor }]}>
              Valor:{" "}
            </Text>
            {item.paymentDate ? (
              <Text style={[styles.cardPaidDate, { color: statusColor }]}>{item.value}</Text>
            ) : (
              getAmount(item)
            )}
          </Text>
          {item.paymentDate && (
            <Text style={[styles.cardPaidDate, { color: statusColor }]}>
              <Text style={[styles.label, { color: statusColor }]}>Pago em: </Text>
              {item.formattedPaymentDate}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
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
        <Text style={styles.sectionTitle}>Extrato de pagamentos</Text>
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={handlePaymentHistoryNavigation}
          disabled={loadingHistory}
        >
          <Image source={require("./BUTTO.png")} style={{
            width: 300,
            height: 100,
          }} />
        </TouchableOpacity>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.buttonPago,
              filter === "VENCIDOS" && styles.pagoAtivo,
            ]}
            onPress={() => setFilter("VENCIDOS")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "VENCIDOS" && styles.activeFilter,
              ]}
            >
              Vencidos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.buttonPago,
              filter === "A VENCER" && styles.pagoAtivo,
            ]}
            onPress={() => setFilter("A VENCER")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "A VENCER" && styles.activeFilter,
              ]}
            >
              A vencer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.buttonPago, filter === "PAGOS" && styles.pagoAtivo]}
            onPress={() => setFilter("PAGOS")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "PAGOS" && styles.activeFilter,
              ]}
            >
              Pagos
            </Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#E1272C"
            style={{ marginTop: 20 }}
          />
        ) : (
          <FlatList
            data={getFilteredInstallments()}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderInstallmentItem}
            contentContainerStyle={styles.scrollContainer}
            style={{ width: "100%" }}
            ListEmptyComponent={
              <Text style={styles.noInstallmentsText}>
                Nenhum registro encontrado para a categoria "{filter}".
              </Text>
            }
          />
        )}

        {selectedInstallment && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(false);
              setSelectedInstallment(null);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Detalhes da parcela</Text>
                {/* {selectedInstallment.hasMultipleReceipts && (
                  <View style={styles.modalReceiptBadge}>
                    <Text style={styles.modalReceiptBadgeText}>
                      Recibo {selectedInstallment.receiptIndex} de {selectedInstallment.totalReceipts}
                    </Text>
                  </View>
                )} */}
                <ScrollView style={{ width: "100%" }}>
                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>Número da parcela:</Text>
                    <Text style={styles.modalValue}>
                      {selectedInstallment.installmentNumber}
                    </Text>
                  </View>
                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>Data de vencimento:</Text>
                    <Text style={styles.modalValue}>
                      {selectedInstallment.formattedDueDate}
                    </Text>
                  </View>
                  {selectedInstallment.formattedPaymentDate && (
                    <View style={styles.modalItem}>
                      <Text style={styles.modalLabel}>Data de pagamento:</Text>
                      <Text style={styles.modalValue}>
                        {selectedInstallment.formattedPaymentDate}
                      </Text>
                    </View>
                  )}
                  {selectedInstallment.receipt && (
                    <>
                      <View style={styles.modalItem}>
                        <Text style={styles.modalLabel}>Valor do recibo:</Text>
                        <Text style={styles.modalValue}>
                          {parseFloat(
                            selectedInstallment.receipt.receiptValue
                          ).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </Text>
                      </View>
                    </>
                  )}

                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>Valor original:</Text>
                    <Text style={styles.modalValue}>
                      {selectedInstallment.originalValue
                        ? parseFloat(
                            selectedInstallment.originalValue
                          ).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "Valor indisponível"}
                    </Text>
                  </View>
                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>Valor corrigido:</Text>
                    <Text style={styles.modalValue}>
                      {selectedInstallment.adjustedValue
                        ? parseFloat(
                            selectedInstallment.adjustedValue
                          ).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "Valor indisponível"}
                    </Text>
                  </View>
                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>Juros e multa:</Text>
                    <Text style={styles.modalValue}>
                      {selectedInstallment.additionalValue
                        ? parseFloat(
                            selectedInstallment.additionalValue
                          ).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "R$ 0,00"}
                    </Text>
                  </View>
                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>Valor atualizado:</Text>
                    <Text style={styles.modalValue}>
                      {selectedInstallment.currentBalance
                        ? selectedInstallment.currentBalance
                        : parseFloat(
                            selectedInstallment.receipt?.receiptNetValue
                          ).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }) ?? "Valor indisponível"}
                    </Text>
                  </View>
                  {!selectedInstallment.paymentDate && (
                    <View style={styles.modalItem}>
                      <Text style={styles.modalLabel}>Boleto gerado:</Text>
                      <Text style={styles.modalValue}>
                        {selectedInstallment.generatedBoleto ? "Sim" : "Não"}
                      </Text>
                    </View>
                  )}
                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>
                      Data base da correção:
                    </Text>
                    <Text style={styles.modalValue}>
                      {selectedInstallment.baseDateOfCorrection
                        ? formatDate(selectedInstallment.baseDateOfCorrection)
                        : "Data indisponível"}
                    </Text>
                  </View>
                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>Tipo de condição:</Text>
                    <Text style={styles.modalValue}>
                      {formatConditionType(selectedInstallment.conditionType)}
                    </Text>
                  </View>
                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>Indexador utilizado:</Text>
                    <Text style={styles.modalValue}>
                      {selectedInstallment.indexerName}
                    </Text>
                  </View>
                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>
                      Valor base do indexador:
                    </Text>
                    <Text style={styles.modalValue}>
                      {selectedInstallment.indexerValueBaseDate
                        ? selectedInstallment.indexerValueBaseDate.toFixed(8)
                        : "Valor indisponível"}
                    </Text>
                  </View>
                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>
                      Valor de cálculo do indexador:
                    </Text>
                    <Text style={styles.modalValue}>
                      {selectedInstallment.indexerValueCalculationDate
                        ? selectedInstallment.indexerValueCalculationDate.toFixed(
                            8
                          )
                        : "Valor indisponível"}
                    </Text>
                  </View>
                </ScrollView>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setModalVisible(false);
                    setSelectedInstallment(null);
                  }}
                >
                  <Text style={styles.closeButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
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
    textAlign: "center",
    width: "100%",
  },
  sectionTitleSeus: {
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "left",
    width: "100%",
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
    alignItems: "center",
    justifyContent: "center",
  },
  enterpriseName: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#E1272C",
    marginVertical: 10,
  },
  downloadButton: {
    borderRadius: 5,
    alignItems: "center",
    alignSelf: "center",
  },
  downloadButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  downloadButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 5,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    gap: 20,
  },
  buttonPago: {
    paddingVertical: 5,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    backgroundColor: "#FF0000",
  },
  pagoAtivo: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FF0000",
  },
  filterText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  activeFilter: {
    color: "#FF0000",
  },
  scrollContainer: {
    paddingBottom: 16,
  },
  logoBottom: {
    width: 50,
  },
  card: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 3,
  },
  // A vencer (parcelas futuras) – cor laranja
  dueBorder: {
    borderLeftColor: "#FFA726",
    borderLeftWidth: 5,
  },
  // Pagos – cor verde
  paidBorder: {
    borderLeftColor: "#2E7D32",
    borderLeftWidth: 5,
  },
  // Vencidos – cor vermelha
  overdueBorder: {
    borderLeftColor: "#E1272C",
    borderLeftWidth: 5,
  },
  cardContent: {
    flex: 1,
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cardConditionType: {
    fontSize: 14,
    fontStyle: "italic",
  },
  cardAmount: {
    fontSize: 16,
    marginTop: 5,
  },
  cardPaidDate: {
    fontSize: 14,
    marginTop: 5,
  },
  label: {
    fontWeight: "600",
  },
  labell: {
    fontWeight: "600",
  },
  noInstallmentsText: {
    textAlign: "center",
    fontSize: 16,
    color: "#888",
    marginTop: 20,
  },
  // Modal Styles
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
  modalItem: {
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  modalValue: {
    fontSize: 16,
    color: "#555",
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: "#E1272C",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  // Bottom Navigation Styles
  bottomSection: {
    width: "100%",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    gap: 30,
  },
  navButton: {
    marginTop: 10,
  },
  // Receipt badge styles
  receiptBadge: {
    backgroundColor: "#f8d7da",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  receiptBadgeText: {
    color: "#721c24",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalReceiptBadge: {
    backgroundColor: "#f8d7da",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 15,
    alignSelf: "center",
  },
  modalReceiptBadgeText: {
    color: "#721c24",
    fontSize: 14,
    fontWeight: "bold",
  }
});

export default PaymentHistory;