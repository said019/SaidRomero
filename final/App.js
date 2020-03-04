import React from 'react';
import Login from './components/screen/Login';
import Registro from './components/screen/Registro';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Datos from './components/screen/Datos';


const Stack = createStackNavigator();

const App:() => React$Node = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Registro" component={Registro} />
        <Stack.Screen name='Datos' component={Datos} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;


