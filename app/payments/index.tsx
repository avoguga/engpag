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
} from "react-native";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

const formatDate = (dateString) => {
  if (!dateString) return "Data indisponível";
  const [year, month, day] = dateString.split("-");
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
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
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`);

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
      const selectedResult = results.find(
        (result) => result.billReceivableId == billReceivableId
      );

      if (!selectedResult) {
        Alert.alert("Erro", "Título não encontrado.");
        setLoading(false);
        return;
      }

      const allInstallments = [
        ...(selectedResult.dueInstallments || []),
        ...(selectedResult.payableInstallments || []),
      ].map((installment) => ({
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
      }));

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
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`);

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

      const payments = paidInstallments.map((installment) => {
        const receipt = installment.receipts && installment.receipts[0];
        const paymentDate = receipt ? formatDate(receipt.receiptDate) : "Data indisponível";
        const dueDate = formatDate(installment.dueDate);

        return {
          id: installment.installmentId.toString(),
          installmentId: installment.installmentId,
          installmentNumber: installment.installmentNumber,
          billReceivableId: selectedResult.billReceivableId,
          dueDate: installment.dueDate,
          formattedDueDate: dueDate,
          paymentDate: receipt?.receiptDate,
          formattedPaymentDate: paymentDate,
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
          indexerValueCalculationDate: receipt?.indexerValueCalculationDate,
          generatedBoleto: installment.generatedBoleto,
          receipt: receipt ? {
            receiptId: receipt.receiptId,
            receiptValue: receipt.receiptValue,
            receiptNetValue: receipt.receiptNetValue,
            monetaryCorrectionValue: receipt.monetaryCorrectionValue,
            calculationDate: receipt.calculationDate,
            indexerValueCalculationDate: receipt.indexerValueCalculationDate,
          } : null
        };
      });

      setCompletedPayments(payments);
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
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`);
  
      const response = await axios.get(
        `https://engpag.backend.gustavohenrique.dev/proxy/current-debit-balance/pdf`,
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
        
        if (Platform.OS === 'web') {
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          
          if (navigator.userAgent.indexOf('Safari') !== -1) {
            link.setAttribute('download', `historico-pagamento-${userData.id}.pdf`);
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
      if (filter === "VENCIDOS") return dueDate < today && !installment.paymentDate;
      if (filter === "A VENCER") return dueDate >= today && !installment.paymentDate;
    });
  };

  const renderInstallmentItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        item.paymentDate
          ? styles.paidBorder
          : new Date(item.dueDate) < new Date()
          ? styles.overdueBorder
          : styles.dueBorder,
      ]}
      onPress={() => {
        setSelectedInstallment(item);
        setModalVisible(true);
      }}
    >
      <MaterialIcons
        name="attach-money"
        size={30}
        color={item.paymentDate ? "#2E7D32" : "#E1272C"}
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>
          <Text style={styles.label}>Vencimento: </Text>
          {item.formattedDueDate}
        </Text>
        <Text style={styles.cardConditionType}>
          <Text style={styles.label}>Condição: </Text>
          {item.conditionType}
        </Text>
        <Text style={styles.cardAmount}>
          <Text style={styles.label}>Valor: </Text>
          {item.value || item.currentBalance}
        </Text>
        {item.paymentDate && (
          <Text style={styles.cardPaidDate}>
            <Text style={styles.label}>Pago em: </Text>
            {item.formattedPaymentDate}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.enterpriseName}>{enterpriseName}</Text>
      <Text style={styles.sectionTitle}>Extrato de Pagamentos</Text>
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={handlePaymentHistoryNavigation}
        disabled={loadingHistory}
      >
        <View style={styles.downloadButtonContent}>
          <MaterialIcons name="download" size={20} color="#fff" />
          <Text style={styles.downloadButtonText}>
            {loadingHistory ? "Baixando..." : "Baixar Histórico Completo"}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.filterContainer}>
        <TouchableOpacity onPress={() => setFilter("VENCIDOS")}>
          <Text style={[styles.filterText, filter === "VENCIDOS" && styles.activeFilter]}>Vencidos</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter("A VENCER")}>
          <Text style={[styles.filterText, filter === "A VENCER" && styles.activeFilter]}>A Vencer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter("PAGOS")}>
          <Text style={[styles.filterText, filter === "PAGOS" && styles.activeFilter]}>Pagos</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#E1272C" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={getFilteredInstallments()}
          keyExtractor={(item, index) => `${item.installmentId}-${index}`}
          renderItem={renderInstallmentItem}
          contentContainerStyle={styles.scrollContainer}
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
              <Text style={styles.modalTitle}>Detalhes da Parcela</Text>
              <ScrollView style={{ width: "100%" }}>
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Número da Parcela:</Text>
                  <Text style={styles.modalValue}>{selectedInstallment.installmentNumber}</Text>
                </View>
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Data de Vencimento:</Text>
                  <Text style={styles.modalValue}>{selectedInstallment.formattedDueDate}</Text>
                </View>
                {selectedInstallment.formattedPaymentDate && (
                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>Data de Pagamento:</Text>
                    <Text style={styles.modalValue}>{selectedInstallment.formattedPaymentDate}</Text>
                  </View>
                )}
                {selectedInstallment.receipt && (
                  <>
                    <View style={styles.modalItem}>
                      <Text style={styles.modalLabel}>Valor do Recibo:</Text>
                      <Text style={styles.modalValue}>
                        {parseFloat(selectedInstallment.receipt.receiptValue).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </Text>
                    </View>
                    <View style={styles.modalItem}>
                      <Text style={styles.modalLabel}>Valor Líquido do Recibo:</Text>
                      <Text style={styles.modalValue}>
                        {parseFloat(selectedInstallment.receipt.receiptNetValue).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </Text>
                    </View>
                  </>
                )}
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Valor Ajustado:</Text>
                  <Text style={styles.modalValue}>
                    {selectedInstallment.adjustedValue
                      ? parseFloat(selectedInstallment.adjustedValue).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "Valor indisponível"}
                  </Text>
                </View>
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Valor Original:</Text>
                  <Text style={styles.modalValue}>
                    {selectedInstallment.originalValue
                      ? parseFloat(selectedInstallment.originalValue).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "Valor indisponível"}
                  </Text>
                </View>
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Valor Adicional:</Text>
                  <Text style={styles.modalValue}>
                    {selectedInstallment.additionalValue
                      ? parseFloat(selectedInstallment.additionalValue).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "Valor indisponível"}
                  </Text>
                </View>
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Correção Monetária:</Text>
                  <Text style={styles.modalValue}>
                    {selectedInstallment.monetaryCorrectionValue
                      ? parseFloat(selectedInstallment.monetaryCorrectionValue).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "Valor indisponível"}
                  </Text>
                </View>
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Data Base da Correção:</Text>
                  <Text style={styles.modalValue}>
                    {selectedInstallment.baseDateOfCorrection
                      ? formatDate(selectedInstallment.baseDateOfCorrection)
                      : "Data indisponível"}
                  </Text>
                </View>
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Tipo de Condição:</Text>
                  <Text style={styles.modalValue}>{selectedInstallment.conditionType}</Text>
                </View>
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Código do Indexador:</Text>
                  <Text style={styles.modalValue}>{selectedInstallment.indexerCode}</Text>
                </View>
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Nome do Indexador:</Text>
                  <Text style={styles.modalValue}>{selectedInstallment.indexerName}</Text>
                </View>
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Valor Base do Indexador:</Text>
                  <Text style={styles.modalValue}>
                    {selectedInstallment.indexerValueBaseDate
                      ? selectedInstallment.indexerValueBaseDate.toFixed(8)
                      : "Valor indisponível"}
                  </Text>
                </View>
                <View style={styles.modalItem}>
                  <Text style={styles.modalLabel}>Valor de Cálculo do Indexador:</Text>
                  <Text style={styles.modalValue}>
                    {selectedInstallment.indexerValueCalculationDate
                      ? selectedInstallment.indexerValueCalculationDate.toFixed(8)
                      : "Valor indisponível"}
                  </Text>
                </View>
                {!selectedInstallment.paymentDate && (
                  <View style={styles.modalItem}>
                    <Text style={styles.modalLabel}>Gerou Boleto:</Text>
                    <Text style={styles.modalValue}>
                      {selectedInstallment.generatedBoleto ? "Sim" : "Não"}
                    </Text>
                  </View>
                )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF6F6",
    padding: 16,
  },
  enterpriseName: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#E1272C",
    marginVertical: 10,
  },
  downloadButton: {
    backgroundColor: "#E1272C",
    paddingVertical: 10,
    borderRadius: 5,
    marginVertical: 10,
    alignItems: "center",
    width: "80%",
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  filterText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#888",
  },
  activeFilter: {
    color: "#E1272C",
    borderBottomWidth: 2,
    borderBottomColor: "#E1272C",
  },
  scrollContainer: {
    paddingBottom: 16,
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
  dueBorder: {
    borderLeftColor: "#E1272C",
    borderLeftWidth: 5,
  },
  paidBorder: {
    borderLeftColor: "#2E7D32",
    borderLeftWidth: 5,
  },
  overdueBorder: {
    borderLeftColor: "#FFA726",
    borderLeftWidth: 5,
  },
  cardContent: {
    flex: 1,
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  cardConditionType: {
    fontSize: 14,
    color: "#555",
    marginTop: 5,
    fontStyle: "italic",
  },
  cardAmount: {
    fontSize: 16,
    color: "#E1272C",
    marginTop: 5,
  },
  cardPaidDate: {
    fontSize: 14,
    color: "#2E7D32",
    marginTop: 5,
  },
  label: {
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
});

export default PaymentHistory;
