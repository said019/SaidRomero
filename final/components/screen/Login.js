import React, { Component } from 'react';
import { Container, Card, Content,  Body, Text, Button, Item, CardItem, Input, Icon } from 'native-base';
import { StyleSheet, Alert,ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import Registro from './Registro'

class Login extends Component {
  constructor(props){
    super(props);
    this.state={
      nombre:'',
      contraseña:''
    } }
  render(){
    const navegar = this.props.navigation;
    return (
      <Container>
      <Content padder contentContainerStyle={styles.content}>
        <Card>
          <CardItem header bordered>
            <Text style={styles.textCenter}>Inicio de sesión</Text>
          </CardItem>
          <CardItem bordered>
            <Body>
              <Item inlineLabel>
                <Icon type='FontAwesome' name='user' />
                  <Input placeholder='Nombre' value={this.state.nombre} onChangeText={(nombre)=> this.setState({nombre}) }/>
                </Item>
                <Item inlineLabel last>
                  <Icon type='FontAwesome' name='lock' />
                  <Input placeholder='Contraseña' secureTextEntry={true} value={this.state.contraseña} onChangeText={(contraseña)=> this.setState({contraseña}) }/>
                </Item>
            </Body>
          </CardItem>
          <CardItem footer bordered>
            <Button primary style={styles.boton}
            onPress={() => {
              navegar.navigate('Datos', {
                titulo: 'Bienvenido!! '+''+ this.state.nombre,
                nombre: this.state.nombre,
                contraseña: this.state.contraseña
              });
            }}>
              <Text> Entrar </Text></Button>
          </CardItem>
          
            <Button primary style={{justifyContent:'center', marginLeft: '56%', width: 125}}
            onPress={() => navegar.navigate('Registro', { 
              titulo: 'Registrate!!'
              }) }>
              <Text>Registrate!</Text></Button>
        </Card>
      </Content>
    </Container>
    ); //End return
  } //End render
} //End class

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor:"#33FFE5",

  },
  textCenter: {
    textAlign: 'center',
    width: '100%'
  },
  boton: {
    marginLeft: '36%',
  }
});


export default Login;
