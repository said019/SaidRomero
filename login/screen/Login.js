
import React, { Component } from 'react';
import { Container, Card, Content,  Body, Text, Button, Item, CardItem, Input, Icon,Header} from 'native-base';
import { StyleSheet, Alert,ScrollView, View, ActivityIndicator, } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import Registrarse from './Registrarse'
import ActivityIndicatorExample from './ActivityIndicator.js'

class Login extends Component {
  constructor(props){
    super(props);
    this.state={
      nombre:'',
      contraseña:''
    } 
  } //END CONSTRUCTOR*/
  render(){
    const navegar = this.props.navigation;
    return (
      <Container>
        <ScrollView style={misEstilos.scrollView}>
          <Content padder contentContainerStyle={misEstilos.content}>
            <Card>
             <Header>
              <Icon type='MaterialIcons' name='person-pin'/>
              <Text style={style}>BIENVENIDO</Text>
             </Header>
                <CardItem header bordered>
                  <Text style={misEstilos.textCenter}>Inicio de sesión</Text>
                </CardItem>
                <CardItem bordered>
                  <Body>
                    <Item inlineLabel>
                      <Icon type='FontAwesome' name='user' />
                        <Input placeholder="Nombre de usuario" value={this.state.nombre} onChangeText={(nombre)=> this.setState({nombre}) } />
                      </Item>
                      <Item inlineLabel last>
                        <Icon type='FontAwesome' name='lock' />
                        <Input placeholder="Contraseña" value={this.state.contraseña} onChangeText={(contraseña)=> this.setState({contraseña}) } /> 
                    </Item>
                  </Body>
                </CardItem>
              <Button
                primary
                onPress={() => { 
                  navegar.navigate('Entrar', {
                    titulo: 'Logeo Exitoso',
                    nombre: this.state.nombre,
                    contraseña: this.state.contraseña,
                  });
                 
                }}>
                <Text>ENTRAR</Text>
                
              </Button>
                <CardItem footer bordered>
                  <Text style={misEstilos.textCenter}>¿No tienes cuenta?</Text>
                </CardItem>
              <Button
                success
                onPress={() => {
                  navegar.navigate('Registrarse', {
                    titulo: 'Registro de usuario',
                  });
                }}>
                <Text>
                  REGISTRATE
                </Text>
              </Button>
            </Card>
          </Content>
        </ScrollView>
    </Container>
    ); //END RETURN
  } //END RENDER
} //END CLASS*/

const misEstilos = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  textCenter: {
    textAlign: 'center',
    widht: '100%',
    fontSize: 20
  },
  scrollView: {
    backgroundColor: 'pink',
    marginHorizontal: 0,
  }
});

const style = {
    color: 'white',
    fontSize: 30,
};



export default Login;
