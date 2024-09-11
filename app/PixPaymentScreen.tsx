import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import axios from 'axios';

const PixPaymentScreen = () => {
  const [pixData, setPixData] = useState('');

  const fetchPixData = async () => {
    try {
      const response = await axios.get('https://api.sienge.com.br/engenharq/public/api/v1/pix-payment');
      setPixData(response.data.pixKey);
    } catch (error) {
      console.error('Error fetching Pix data:', error);
    }
  };

  useEffect(() => {
    fetchPixData();
  }, []);

  return (
    <View>
      <Text>Pix Payment</Text>
      {pixData ? <QRCode value={pixData} /> : <Text>Loading QR Code...</Text>}
    </View>
  );
};

export default PixPaymentScreen;
