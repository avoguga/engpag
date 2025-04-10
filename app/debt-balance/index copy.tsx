import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { useLocalSearchParams } from "expo-router";

// Definição dos tipos de condição a serem excluídos
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

const DebtBalanceScreen = () => {
  const { userData } = useContext(UserContext);
  const [saldoFinanciado, setSaldoFinanciado] = useState(null);
  const [saldoPago, setSaldoPago] = useState(null);
  const [saldoDevedor, setSaldoDevedor] = useState(null);
  const [recursoProprio, setRecursoProprio] = useState(0);
  const [nextPaymentDate, setNextPaymentDate] = useState(null);
  const [nextPaymentAmount, setNextPaymentAmount] = useState(null);
  const [contratoDetalhes, setContratoDetalhes] = useState({
    parcelas: {},
    prazoTotal: 0,
    prazoRestante: 0,
  });
  const [descontoConcedido, setDescontoConcedido] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outstandingInstallments, setOutstandingInstallments] = useState([]);
  const { enterpriseName, billReceivableId, receivableBillValue } =
    useLocalSearchParams();

  useEffect(() => {
    if (userData && (userData.cpf || userData.cnpj) && billReceivableId) {
      fetchData();
    }
  }, [userData, billReceivableId]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const username = "engenharq-mozart";
      const password = "wfW2ra73xSbH5r4AbQne4WesFDb1NaWe";
      const credentials = btoa(`${username}:${password}`);

      const searchParam = userData.cpf
        ? { cpf: userData.cpf, correctAnnualInstallment: "N" }
        : { cnpj: userData.cnpj, correctAnnualInstallment: "N" };

      // Chamada à rota current-debit-balance
      const responseDebitBalance = await axios.get(
        "http://201.51.197.250:3000/proxy/current-debit-balance",
        {
          params: searchParam,
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      const results = responseDebitBalance.data.results || [];
      const selectedResult = results.find(
        (result) => result.billReceivableId === parseInt(billReceivableId, 10)
      );

      if (selectedResult) {
        const allInstallments = [
          ...(selectedResult.dueInstallments || []),
          ...(selectedResult.payableInstallments || []),
          ...(selectedResult.paidInstallments || []),
        ];

        // Conjunto de tipos de condição a serem excluídos (para comparação eficiente)
        const excludedConditionTypesSet = new Set(
          excludedConditionTypes.map((type) => type.toLowerCase())
        );

        // Filtrar apenas parcelas vencidas, excluindo os tipos especificados
        const outstandingInstallments = (selectedResult.dueInstallments || [])
          .filter(
            (installment) =>
              !excludedConditionTypesSet.has(
                installment.conditionType.trim().toLowerCase()
              )
          )
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)); // ordenar por data

        setOutstandingInstallments(outstandingInstallments);

        const paidInstallments = selectedResult.paidInstallments || [];

        // Obtém todos os tipos únicos de parcelas
        const tiposParcelas = [
          ...new Set(allInstallments.map((i) => i.conditionType.trim())),
        ];

        // Calcula detalhes para cada tipo de parcela
        const detalheParcelas = {};
        tiposParcelas.forEach((tipo) => {
          const todasDesteTipo = allInstallments.filter(
            (i) => i.conditionType.trim() === tipo
          );

          // Pega o número total de parcelas do installmentNumber
          const totalParcelasFromNumber =
            todasDesteTipo[0]?.installmentNumber?.split("/")[1];
          const totalParcelas = totalParcelasFromNumber
            ? parseInt(totalParcelasFromNumber)
            : todasDesteTipo.length;

          const pagasDesteTipo = paidInstallments.filter(
            (i) => i.conditionType.trim() === tipo
          );

          const restantesDesteTipo = totalParcelas - pagasDesteTipo.length;

          detalheParcelas[tipo] = {
            total: totalParcelas,
            restantes: restantesDesteTipo,
            pagas: pagasDesteTipo.length,
            valorOriginal: todasDesteTipo.reduce(
              (sum, i) => sum + (i.originalValue || 0),
              0
            ),
            valorAtual: outstandingInstallments
              .filter((i) => i.conditionType.trim() === tipo)
              .reduce((sum, i) => sum + (i.currentBalance || 0), 0),
          };
        });

        setContratoDetalhes({
          parcelas: detalheParcelas,
          prazoTotal: allInstallments.length,
          prazoRestante: outstandingInstallments.length,
        });

        // Cálculo do Saldo Devedor
        const totalDebt = outstandingInstallments.reduce(
          (sum, installment) => sum + (installment.currentBalance || 0),
          0
        );
        setSaldoDevedor(totalDebt);

        // Próximo pagamento (considerando parcelas a vencer)
        const upcomingInstallments = (selectedResult.payableInstallments || [])
          .filter(
            (installment) =>
              !excludedConditionTypesSet.has(
                installment.conditionType.trim().toLowerCase()
              )
          )
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        if (upcomingInstallments.length > 0) {
          const nextInstallment = upcomingInstallments[0];
          setNextPaymentDate(nextInstallment.dueDate);
          setNextPaymentAmount(nextInstallment.currentBalance);
        } else {
          setNextPaymentDate(null);
          setNextPaymentAmount(null);
        }

        // Chamada à rota customer-financial-statements para obter descontos e financiamento
        const responseFinancialStatements = await axios.get(
          "http://201.51.197.250:3000/proxy/customer-financial-statements",
          {
            params: { customerId: userData.id },
            headers: {
              Authorization: `Basic ${credentials}`,
            },
          }
        );

        // Processamento dos dados de financial statements
        const financialResults = responseFinancialStatements.data.results || [];

        // Procura por parcelas do tipo DS (desconto/bonificação)
        const descontos = financialResults
          .flatMap((result) =>
            result.billsReceivable.flatMap((bill) =>
              bill.installments.filter((inst) => inst.conditionType === "DS")
            )
          )
          .reduce(
            (total, inst) =>
              total +
              inst.receipts.reduce(
                (sum, receipt) => sum + (receipt.netReceiptValue || 0),
                0
              ),
            0
          );

        setDescontoConcedido(descontos);

        // Cálculo do totalFinanciado (somar parcelas com conditionType "FI")
        const totalFinanciado = financialResults
          .flatMap((result) =>
            result.billsReceivable.flatMap((bill) =>
              bill.installments.filter((inst) => inst.conditionType === "FI")
            )
          )
          .reduce(
            (sum, inst) => sum + (inst.originalValue || 0),
            0
          );

        setSaldoFinanciado(totalFinanciado);

        // Cálculo do Recurso Próprio
        const valorContrato = parseFloat(receivableBillValue) || 0;
        const valorDesconto = descontos || 0;

        // Recurso próprio = Valor contrato - Desconto concedido - Valor total financiamento
        const totalRecursoProprio =
          valorContrato - valorDesconto - totalFinanciado;
        setRecursoProprio(totalRecursoProprio);

        // Cálculo do Saldo Pago
        const totalPaid = paidInstallments.reduce(
          (sum, installment) =>
            sum +
            installment.receipts.reduce(
              (receiptSum, receipt) =>
                receiptSum + (receipt.receiptNetValue || 0),
              0
            ),
          0
        );
        setSaldoPago(totalPaid);
        
      } else {
        setError("Nenhum contrato encontrado para o ID fornecido.");
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setError("Erro ao buscar dados.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (isNaN(value)) return "R$ 0,00";
    return `R$ ${parseFloat(value)
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + "T00:00:00Z");
    const day = date.getUTCDate().toString().padStart(2, "0");
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E1272C" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Ionicons name="reload-outline" size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.mainTitle}>
        {enterpriseName || "Nome do Empreendimento"}
      </Text>

      <View style={styles.debtContainer}>
        <Text style={styles.debtLabel}>Saldo a pagar</Text>
        <Text style={styles.debtAmount}>
          {saldoDevedor !== null ? formatCurrency(saldoDevedor) : "R$ 0,00"}
        </Text>
      </View>

      {outstandingInstallments.length > 0 ? (
        <View style={styles.nextPaymentContainer}>
          <Text style={styles.sectionTitle}>Parcelas vencidas</Text>

          {outstandingInstallments.map((installment) => (
            <View key={installment.installmentId} style={styles.parcelCard}>
              <View style={styles.parcelHeader}>
                <Text style={styles.parcelTitle}>
                  Parcela {installment.installmentNumber}
                </Text>
                <Text style={styles.parcelType}>
                  {installment.conditionType}
                </Text>
              </View>

              <View style={styles.parcelInfo}>
                <Text style={styles.infoLabel}>Vencimento:</Text>
                <Text style={styles.infoValue}>
                  {formatDate(installment.dueDate)}
                </Text>
              </View>

              <View style={styles.parcelInfo}>
                <Text style={styles.infoLabel}>Valor Original:</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(installment.originalValue)}
                </Text>
              </View>

              <View style={styles.parcelInfo}>
                <Text style={styles.infoLabel}>Valor Atual:</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(installment.currentBalance)}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total vencido:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(
                outstandingInstallments.reduce(
                  (sum, inst) => sum + (inst.currentBalance || 0),
                  0
                )
              )}
            </Text>
          </View>
        </View>
      ) : null}

      {nextPaymentDate && nextPaymentAmount ? (
        <View style={styles.nextPaymentContainer}>
          <Text style={styles.sectionTitle}>Próximo Vencimento</Text>
          <View style={styles.paymentRow}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Data</Text>
              <Text style={styles.paymentValue}>
                {formatDate(nextPaymentDate)}
              </Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Valor</Text>
              <Text style={styles.paymentValue}>
                {formatCurrency(nextPaymentAmount)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.financialInfoContainer}>
        <Text style={styles.sectionTitle}>Detalhes financeiros</Text>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Valor do contrato</Text>
          <Text style={styles.financialValue}>
            {receivableBillValue !== null
              ? formatCurrency(receivableBillValue)
              : "R$ 0,00"}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Valor do financiamento CAIXA</Text>
          <Text style={styles.financialValue}>
            {saldoFinanciado !== null
              ? formatCurrency(saldoFinanciado)
              : "R$ 0,00"}
          </Text>
        </View>

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Recurso próprio</Text>
          <Text style={styles.financialValue}>
            {recursoProprio > 0 ? formatCurrency(recursoProprio) : "R$ 0,00"}
          </Text>
        </View>
        {descontoConcedido > 0 ? (
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Desconto concedido</Text>
            <Text style={styles.financialValue}>
              {descontoConcedido > 0
                ? formatCurrency(descontoConcedido)
                : "R$ 0,00"}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.contractDetailsContainer}>
        <Text style={styles.sectionTitle}>Detalhes do contrato</Text>

        {/* Primeiro exibe as parcelas regulares */}
        {Object.entries(contratoDetalhes.parcelas)
          .filter(([tipo]) => tipo.toLowerCase().includes("parcela"))
          .map(([tipo, dados]) => (
            <View
              key={tipo}
              style={[styles.contractSection, { marginTop: 16 }]}
            >
              <Text style={styles.parcelasTitle}>{tipo}</Text>
              <View style={styles.contractRow}>
                <Text style={styles.contractLabelBold}>Total de parcelas</Text>
                <Text style={styles.contractValueHighlight}>{dados.total}</Text>
              </View>
              <View style={styles.contractRow}>
                <Text style={styles.contractLabel}>Parcelas pagas</Text>
                <Text style={styles.contractValue}>{dados.pagas}</Text>
              </View>
              <View style={styles.contractRow}>
                <Text style={styles.contractLabel}>Parcelas restantes</Text>
                <Text style={styles.contractValue}>{dados.restantes}</Text>
              </View>
              <View style={styles.contractRow}>
                <Text style={styles.contractLabelBold}>Valor a pagar</Text>
                <Text style={styles.contractValueHighlight}>
                  {formatCurrency(dados.valorAtual)}
                </Text>
              </View>
            </View>
          ))}
      </View>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  // Estilos gerais do container e cabeçalhos
  container: {
    flex: 1,
    backgroundColor: "#FFF8F8",
    padding: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },

  // Estilos para o container de débito
  debtContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  debtLabel: {
    fontSize: 18,
    color: "#333",
    fontWeight: "bold",
    marginBottom: 10,
  },
  debtAmount: {
    fontSize: 26,
    color: "#E1272C",
    fontWeight: "bold",
  },

  // Estilos para parcelas vencidas
  nextPaymentContainer: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    elevation: 3,
  },
  parcelCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  parcelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  parcelTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  parcelType: {
    fontSize: 14,
    color: "#666",
  },
  parcelInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },

  // Estilos para o container de total
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E1272C",
  },

  // Estilos para o próximo vencimento
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    elevation: 3,
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
    alignItems: "center",
  },
  paymentLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  // Estilos para informações financeiras
  financialInfoContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  financialLabel: {
    fontSize: 15,
    color: "#444",
  },
  financialValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },

  // Estilos para detalhes do contrato
  contractDetailsContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  contractRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  contractLabelBold: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  contractLabel: {
    fontSize: 15,
    color: "#444",
  },
  contractValueHighlight: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E1272C",
  },
  contractValue: {
    fontSize: 15,
    color: "#333",
  },
  parcelasTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#444",
    marginBottom: 12,
  },

  // Estilos para status e estados
  statusPago: {
    color: "#2E8B57",
    fontWeight: "bold",
  },

  // Estilos para loading e erro
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF8F8",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF8F8",
    padding: 16,
  },
  errorText: {
    color: "#E1272C",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    backgroundColor: "#E1272C",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
});

export default DebtBalanceScreen;
