import React, { useContext, useEffect, useState } from 'react';
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
  ToastAndroid,
  Platform,
  Modal,
} from 'react-native';
import axios from 'axios';
import { UserContext } from '../contexts/UserContext';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import PixIcon from './logo-pix.svg';
import { router } from 'expo-router';

const BoletoScreen = () => {
  const { userData, enterpriseName } = useContext(UserContext); // Obtendo enterpriseName do contexto
  const [loading, setLoading] = useState(false);
  const [boletoLink, setBoletoLink] = useState('');
  const [digitableNumber, setDigitableNumber] = useState('');
  const [installmentDetails, setInstallmentDetails] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    fetchAvailableInstallment();
  }, [userData]);

  // Função para formatar a data no formato dd/mm/aaaa
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fetchAvailableInstallment = async () => {
    if (!userData || !userData.cpf) {
      Alert.alert('Erro', 'Dados do cliente não encontrados.');
      return;
    }

    setLoading(true);
    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb'; // Substitua pela sua senha
      const credentials = btoa(`${username}:${password}`);

      const response = await axios.get(
        'https://api.sienge.com.br/engenharq/public/api/v1/current-debit-balance',
        {
          params: {
            cpf: userData.cpf,
            correctAnnualInstallment: 'N',
          },
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      const results = response.data.results || [];
      let availableInstallments = [];

      // Coleta todas as parcelas com boleto disponível
      results.forEach((bill) => {
        const { dueInstallments, payableInstallments } = bill;
        const installments = [
          ...(dueInstallments || []),
          ...(payableInstallments || []),
        ]
          .filter((installment) => installment.generatedBoleto)
          .map((installment) => ({
            ...installment,
            billReceivableId: bill.billReceivableId,
          }));
        availableInstallments.push(...installments);
      });

      if (availableInstallments.length > 0) {
        // Ordena por data de vencimento e seleciona a mais próxima
        availableInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        const installment = availableInstallments[0];

        // Determina o status da parcela
        let status = 'Pendente';
        const today = new Date();
        const dueDate = new Date(installment.dueDate);

        if (installment.paidDate) {
          status = 'Pago';
        } else if (dueDate < today) {
          status = 'Vencido';
        } else {
          status = 'Pendente';
        }

        setInstallmentDetails({ ...installment, status });

      } else {
        Alert.alert('Aviso', 'Nenhum boleto disponível no momento.');
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da parcela:', error);
      Alert.alert('Erro', 'Não foi possível obter os detalhes da parcela.');
    } finally {
      setLoading(false);
    }
  };

  const requestBoletoEmail = async () => {
    if (!userData) {
      Alert.alert('Erro', 'Dados do cliente não encontrados.');
      return;
    }

    if (
      !installmentDetails ||
      !installmentDetails.billReceivableId ||
      !installmentDetails.installmentId
    ) {
      Alert.alert('Erro', 'Informações da parcela não disponíveis.');
      return;
    }

    setLoading(true);

    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb'; // Substitua pela sua senha
      const credentials = btoa(`${username}:${password}`);

      // Obter o link do boleto
      const response = await axios.get(
        'https://api.sienge.com.br/engenharq/public/api/v1/payment-slip-notification',
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
        const boletoLink = response.data.results[0].urlReport;

        const backendUrl = 'http://hw0oc4gc8ccwswwg4gk0kss8.167.88.39.225.sslip.io/send-email'; // Substitua pela URL do seu backend

        const emailResponse = await axios.post(backendUrl, {
          email: userData.email,
          boletoUrl: boletoLink,
          userName: userData.name,
        });

        if (emailResponse.status === 200) {
          Alert.alert(
            'Sucesso',
            'Boleto enviado com sucesso para o email: ' + userData.email
          );
        } else {
          Alert.alert('Erro', 'Falha ao enviar o boleto.');
        }
      } else {
        Alert.alert('Erro', 'Falha ao gerar o link do boleto.');
      }
    } catch (error) {
      console.error('Erro ao enviar o boleto:', error);
      Alert.alert('Erro', 'Erro ao enviar o boleto por e-mail.');
    } finally {
      setLoading(false);
    }
  };

  const requestBoletoLink = async () => {
    if (!userData) {
      Alert.alert('Erro', 'Dados do cliente não encontrados.');
      return;
    }

    if (
      !installmentDetails ||
      !installmentDetails.billReceivableId ||
      !installmentDetails.installmentId
    ) {
      Alert.alert('Erro', 'Informações da parcela não disponíveis.');
      return;
    }

    setLoading(true);

    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb'; 
      const credentials = btoa(`${username}:${password}`);

      const response = await axios.get(
        'https://api.sienge.com.br/engenharq/public/api/v1/payment-slip-notification',
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
        setIsModalVisible(true); // Exibe o modal
      } else {
        Alert.alert('Erro', 'Falha ao gerar o link do boleto.');
      }
    } catch (error) {
      console.error(
        'Erro ao gerar link do boleto:',
        error.response ? error.response.data : error.message
      );
      Alert.alert('Erro', 'Erro ao gerar o link do boleto.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDigitableLine = () => {
    if (digitableNumber) {
      Clipboard.setString(digitableNumber);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Linha digitável copiada!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Copiado', 'Linha digitável copiada para a área de transferência.');
      }
    }
  };

  const handlePayWithPix = async () => {
    if (!installmentDetails || !installmentDetails.billReceivableId) {
      Alert.alert('Erro', 'Informações da parcela não disponíveis.');
      return;
    }

    if (!userData || !userData.id) {
      Alert.alert('Erro', 'Dados do cliente não encontrados.');
      return;
    }

    const customerId = userData.id;

    const totalAmount = parseFloat(installmentDetails.currentBalance);

    setLoading(true);

    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb'; // Substitua pela sua senha
      const credentials = btoa(`${username}:${password}`);

      const billReceivableId = installmentDetails.billReceivableId;

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

      let companyName = '';
      let whatsappNumber = '';

      switch (companyId) {
        case 1:
          companyName = 'Engenharq';
          whatsappNumber = '558296890033';
          break;
        case 2:
          companyName = 'EngeLot';
          whatsappNumber = '558296890066';
          break;
        case 3:
          companyName = 'EngeLoc';
          whatsappNumber = '558296890202';
          break;
        default:
          companyName = 'Desconhecida';
          whatsappNumber = '5585986080000'; // Número padrão
      }

      const installmentNumber = installmentDetails.installmentNumber;

      const message = `Olá, meu nome é ${userData?.name}, meu CPF é ${userData?.cpf} gostaria de pagar a parcela ${installmentNumber} do título ${billReceivableId}. Valor: ${totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        message
      )}`;

      const supported = await Linking.canOpenURL(whatsappUrl);

      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
      }
    } catch (error) {
      console.error('Erro ao obter companyId:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o contato via WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Ícone e título */}
        <View style={styles.iconContainer}>
          <View style={styles.circleIcon}>
            <Ionicons name="home-outline" size={40} color="white" />
          </View>
          <Text style={styles.title}>{enterpriseName || 'Nome do Empreendimento'}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E1272C" style={{ marginTop: 20 }} />
        ) : (
          <>
            {/* Detalhes da Parcela */}
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
                  <Text style={styles.infoValue}>{installmentDetails.status}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Valor:</Text>
                  <Text style={styles.infoValue}>
                    {parseFloat(installmentDetails.currentBalance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noBoletoText}>
                Nenhum boleto disponível no momento.
              </Text>
            )}

            {/* Botões de Ação */}
            {installmentDetails && (
              <View style={styles.buttonContainer}>
                {/* Botão de Enviar Boleto por Email */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={requestBoletoEmail}
                >
                  <FontAwesome name="envelope-o" size={20} color="white" />
                  <Text style={styles.actionButtonText}> Enviar por E-mail</Text>
                </TouchableOpacity>

                {/* Botão de Gerar Link da Segunda Via */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={requestBoletoLink}
                >
                  <Ionicons name="download-outline" size={20} color="white" />
                  <Text style={styles.actionButtonText}>
                    {' '}
                    Gerar Link da Segunda Via
                  </Text>
                </TouchableOpacity>

                {/* Botão de Pagar via PIX */}
                <TouchableOpacity style={styles.pixButton} onPress={handlePayWithPix}>
                  <PixIcon width={20} height={20} />
                  <Text style={styles.actionButtonText}> Pagar via PIX</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Modal para exibir a linha digitável e botão de download */}
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
                <Text style={styles.digitableNumberValue}>{digitableNumber}</Text>
                <TouchableOpacity onPress={handleCopyDigitableLine}>
                  <Ionicons name="copy-outline" size={24} color="#E1272C" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.boletoDownloadButton}
                onPress={() => Linking.openURL(boletoLink)}
              >
                <Ionicons name="arrow-down-circle-outline" size={24} color="white" />
                <Text style={styles.boletoDownloadButtonText}>Baixar Boleto</Text>
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
  pixIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF6F6',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E1272C',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  circleIcon: {
    backgroundColor: '#E1272C',
    borderRadius: 50,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    color: '#555',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  noBoletoText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  buttonContainer: {
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
  },
  actionButton: {
    backgroundColor: '#5B5B5B',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    elevation: 2,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    textAlign: 'center',
  },
  pixButton: {
    backgroundColor: '#E1272C',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    width: '90%',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    color: '#333',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  digitableLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    marginBottom: 15,
    width: '100%',
    justifyContent: 'space-between',
  },
  digitableNumberValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  boletoDownloadButton: {
    backgroundColor: '#E1272C',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
    elevation: 2,
  },
  boletoDownloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    textAlign: 'center',
  },
  closeModalButton: {
    backgroundColor: '#5B5B5B',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BoletoScreen;
