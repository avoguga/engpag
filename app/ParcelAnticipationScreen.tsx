import React, { useState } from 'react';
import { View, Text, Button, TextInput } from 'react-native';
import axios from 'axios';

const ParcelAnticipationScreen = () => {
  const [parcelCount, setParcelCount] = useState('');

  const anticipateParcel = async () => {
    try {
      const response = await axios.post('https://api.sienge.com.br/engenharq/public/api/v1/prepayment-slip', {
        parcelCount
      });
      console.log('Parcel anticipation successful:', response.data);
    } catch (error) {
      console.error('Error anticipating parcels:', error);
    }
  };

  return (
    <View>
      <Text>Anticipate Parcels</Text>
      <TextInput 
        placeholder="Enter Parcel Count"
        value={parcelCount}
        onChangeText={setParcelCount}
      />
      <Button title="Anticipate Parcels" onPress={anticipateParcel} />
    </View>
  );
};

export default ParcelAnticipationScreen;
