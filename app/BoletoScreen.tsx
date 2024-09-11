import React, { useState } from 'react';
import { View, Text, Button, TextInput } from 'react-native';
import axios from 'axios';

const BoletoScreen = () => {
  const [clientId, setClientId] = useState('');
  const [boletoUrl, setBoletoUrl] = useState('');

  const requestBoleto = async () => {
    try {
      const response = await axios.post('https://api.sienge.com.br/engenharq/public/api/v1/payment-slip', { clientId });
      setBoletoUrl(response.data.boletoUrl);
    } catch (error) {
      console.error('Error fetching boleto:', error);
    }
  };

  return (
    <View>
      <Text>Request Boleto</Text>
      <TextInput 
        placeholder="Enter Client ID"
        value={clientId}
        onChangeText={setClientId}
      />
      <Button title="Request Boleto" onPress={requestBoleto} />
      {boletoUrl && <Text>Boleto: {boletoUrl}</Text>}
    </View>
  );
};

export default BoletoScreen;
