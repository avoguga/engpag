import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import axios from 'axios';
import { UserContext } from '../contexts/UserContext';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

const BoletoScreen = () => {
  const { userData } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [boletoLink, setBoletoLink] = useState('');
  const [digitableNumber, setDigitableNumber] = useState('');
  const [installmentDetails, setInstallmentDetails] = useState(null);

  // Capturando os parâmetros da navegação
  const { billReceivableId, installmentId } = useLocalSearchParams();

  useEffect(() => {
    if (!billReceivableId || !installmentId) {
      Alert.alert('Erro', 'ID da parcela ou do boleto não fornecido.');
    } else {
      fetchInstallmentDetails();
    }
  }, [billReceivableId, installmentId]);

  const fetchInstallmentDetails = async () => {
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
      const selectedResult = results.find(
        (result) => result.billReceivableId == billReceivableId
      );

      if (selectedResult) {
        const allInstallments = [
          ...(selectedResult.dueInstallments || []),
          ...(selectedResult.payableInstallments || []),
          ...(selectedResult.paidInstallments || []),
        ];

        const installment = allInstallments.find(
          (item) => item.installmentId == installmentId
        );

        if (installment) {
          // Calcula o status da parcela
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
          Alert.alert('Erro', 'Parcela não encontrada.');
        }
      } else {
        Alert.alert('Erro', 'Título não encontrado.');
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

    // Verifica se os parâmetros estão disponíveis
    if (!billReceivableId || !installmentId) {
      Alert.alert('Erro', 'ID da parcela ou do boleto não fornecido.');
      return;
    }

    setLoading(true);

    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb'; // Substitua pela sua senha
      const credentials = btoa(`${username}:${password}`);

      const response = await axios.post(
        'https://api.sienge.com.br/engenharq/public/api/v1/payment-slip-notification',
        {
          receivableBillId: billReceivableId,
          installmentId: installmentId,
          emailCustomer: userData.email,
          emailTitle: 'Segunda via de boleto',
          emailBody: 'Prezado cliente, segue a segunda via do boleto conforme solicitado.',
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 201) {
        Alert.alert('Sucesso', 'Boleto enviado com sucesso para o email: ' + userData.email);
      } else {
        Alert.alert('Erro', 'Falha ao enviar o boleto.');
      }
    } catch (error) {
      console.error('Error fetching boleto:', error.response ? error.response.data : error.message);
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

    // Verifica se os parâmetros estão disponíveis
    if (!billReceivableId || !installmentId) {
      Alert.alert('Erro', 'ID da parcela ou do boleto não fornecido.');
      return;
    }

    setLoading(true);

    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb'; // Substitua pela sua senha
      const credentials = btoa(`${username}:${password}`); // Usando btoa para codificação Base64

      console.log(billReceivableId, installmentId);

      const response = await axios.get(
        'https://api.sienge.com.br/engenharq/public/api/v1/payment-slip-notification',
        {
          params: {
            billReceivableId: billReceivableId,
            installmentId: installmentId,
          },
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (response.data.results && response.data.results[0]) {
        setBoletoLink(response.data.results[0].urlReport);
        setDigitableNumber(response.data.results[0].digitableNumber);
      } else {
        Alert.alert('Erro', 'Falha ao gerar o link do boleto.');
      }
    } catch (error) {
      console.error('Erro ao gerar link do boleto:', error);
      Alert.alert('Erro', 'Erro ao gerar o link do boleto.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithPix = () => {
    // Mock da funcionalidade PIX
    Alert.alert('PIX', 'Pagamento via PIX não implementado.');
  };

  return (
    <View style={styles.container}>
      {/* Barra superior */}
      <View style={styles.topBar}>
        <Ionicons name="menu" size={30} color="white" />
        <Ionicons name="notifications-outline" size={30} color="white" />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Ícone e nome do empreendimento */}
        <View style={styles.iconContainer}>
          <View style={styles.circleIcon}>
            <Ionicons name="home-outline" size={40} color="white" />
          </View>
          <Text style={styles.title}>RESIDENCIAL GRAND RESERVA</Text>
        </View>

        {/* Botão de 2ª via de boleto */}
        <TouchableOpacity style={styles.boletoButton}>
          <Text style={styles.boletoButtonText}>2ª VIA BOLETO</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <>
            {/* Exibir detalhes da parcela */}
            {installmentDetails && (
              <View style={styles.infoContainer}>
                <Text style={styles.infoLabel}>NÚMERO DA PARCELA</Text>
                <Text style={styles.infoValue}>{installmentDetails.installmentNumber}</Text>

                <Text style={styles.infoLabel}>VENCIMENTO</Text>
                <Text style={styles.infoValue}>{installmentDetails.dueDate}</Text>

                <Text style={styles.infoLabel}>NÚMERO DO TÍTULO</Text>
                <Text style={styles.infoValue}>{billReceivableId}</Text>

                <Text style={styles.infoLabel}>SITUAÇÃO</Text>
                <Text style={styles.infoValue}>{installmentDetails.status}</Text>

                <Text style={styles.infoLabel}>VALOR</Text>
                <Text style={styles.infoValue}>R$ {installmentDetails.currentBalance}</Text>
              </View>
            )}

            {/* Botões de ação */}
            <View style={styles.buttonContainer}>
              {/* Botão de Enviar Boleto por Email */}
              <TouchableOpacity style={styles.actionButton} onPress={requestBoletoEmail}>
                <FontAwesome name="envelope-o" size={20} color="white" />
                <Text style={styles.actionButtonText}> ENVIAR PELO E-MAIL</Text>
              </TouchableOpacity>

              {/* Botão de Gerar Link da Segunda Via */}
              <TouchableOpacity style={styles.actionButton} onPress={requestBoletoLink}>
                <Ionicons name="download-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}> GERAR LINK DA SEGUNDA VIA</Text>
              </TouchableOpacity>

              {/* Botão de Pagamento via PIX */}
              <TouchableOpacity style={styles.pixButton} onPress={handlePayWithPix}>
                {/* Inclua o ícone do Pix */}
                <Image
                  source={require('./logo-pix.svg')} // Substitua pelo logo SVG do Pix
                  style={styles.pixIcon}
                />
                <Text style={styles.actionButtonText}> PAGAR VIA PIX</Text>
              </TouchableOpacity>
            </View>

            {/* Exibir detalhes do boleto se o link tiver sido gerado */}
            {boletoLink ? (
              <View style={styles.boletoContainer}>
                <Text style={styles.digitableNumberText}>Número Digitável:</Text>
                <Text style={styles.digitableNumberValue}>{digitableNumber}</Text>
                <TouchableOpacity style={styles.boletoButton} onPress={() => Linking.openURL(boletoLink)}>
                  <Text style={styles.boletoButtonText}>Abrir Boleto</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
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
    backgroundColor: '#FFF8F8',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'red',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  circleIcon: {
    backgroundColor: 'red',
    borderRadius: 50,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
    textAlign: 'center',
  },
  boletoButton: {
    backgroundColor: 'red',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 25,
    alignSelf: 'center',
  },
  boletoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  actionButton: {
    backgroundColor: '#5B5B5B',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flexShrink: 1,
    textAlign: 'center',
  },
  pixButton: {
    backgroundColor: 'red',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
  },
  boletoContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  digitableNumberText: {
    fontSize: 16,
    color: '#888',
  },
  digitableNumberValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});

export default BoletoScreen;
