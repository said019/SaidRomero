import React, { Component } from 'react';
import { Container, Header, Content, Item, Input, Icon, Spinner, CardItem,Text,Card} from 'native-base';
import {StyleSheet} from 'react-native';

import ActivityIndicatorExample from './ActivityIndicator.js'

 class Entrar extends Component {
  render() {
    return (
      <Container>
      <ActivityIndicatorExample/>
      <Header>
        <Icon type='MaterialIcons' name='person-pin'/>
          <Text style={style}>BIENVENIDO</Text>
      </Header>
        <Content padder contentContainerStyle = {misEstilos.content}>
          <Card>
           <CardItem header bordered>
              <Text style={misEstilos.textCenter}>{this.props.route.params.titulo}</Text>
            </CardItem>
            <CardItem>
              <Text style={misEstilos.textCenter}>{this.props.route.params.nombre}</Text>
            </CardItem>
            <CardItem>
              <Text style={misEstilos.textCenter}>{this.props.route.params.contraseña}</Text>
            </CardItem>
          </Card>
      </Content>
      </Container>
    );
  }
}


const misEstilos = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'pink',
    marginHorizontal: 0,
  },
  textCenter: {
    textAlign: 'center',
    widht: '100%'
  }
});

const style = {
    color: 'white',
    fontSize: 30,
};

export default Entrar;
