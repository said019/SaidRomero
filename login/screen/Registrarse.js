import React, { Component } from 'react';
import {StyleSheet, Alert, ScrollView} from 'react-native';
import { Container, Header, Content, Card, CardItem, Text, Body,Button, Item, Label, Input,Icon } from 'native-base';

export default class CardHeaderFooterExample extends Component {
  render() {
    return (
      <Container>
      <ScrollView style={misEstilos.scrollView}>
        <Content padder contentContainerStyle = {misEstilos.content}>
        <Card>
         <Header><Text style = {style}>BIENVENIDO</Text></Header>
            <CardItem header bordered>
              <Text style = {misEstilos.textCenter}>{this.props.route.params.titulo}</Text>
            </CardItem>
              <CardItem footer bordered>
              <Button primary style ={misEstilos.botoon}>
                <Icon type = 'AntDesign' name = 'facebook-square' ></Icon>
                <Text>
                  Facebook
                </Text>
              </Button>
              <Button danger  style ={misEstilos.botoon}>
                <Icon type = 'Entypo' name = 'google-' ></Icon>
                <Text style={misEstilos.textColor}>
                  Gmail
                </Text>
              </Button>
              </CardItem>
            <CardItem >
              <Body>
                <Text>
                  REGISTRAR
                </Text>
              <Item inlineLabel>
              <Icon type = 'FontAwesome' name = 'user-circle-o' ></Icon>
              <Input placeholder= "Nombre:" />
            </Item>
            <Item inlineLabel>
              <Icon type = 'FontAwesome' name = 'user-circle-o'></Icon>
              <Input placeholder= "Apellido:" />
            </Item>
            <Item inlineLabel>
              <Icon type = 'FontAwesome' name = 'comment'></Icon>
              <Input placeholder= "Email:" />
            </Item>
            <Item inlineLabel last>
              <Icon type = 'Foundation' name = 'telephone'></Icon>
              <Input placeholder="Teléfono" />
            </Item>
              </Body>
            </CardItem>
            <CardItem footer bordered>
            <Text style={misEstilos.textCenter}>¿Ya tienes cuenta?</Text>
            </CardItem>
            <CardItem footer bordered>
            <Button light style ={misEstilos.boton}>
              <Text>
                Cuenta
              </Text>
            </Button>
            <Button primary style ={misEstilos.boton} onPress = {()=> Alert.alert('REGISTRADO')}>
              <Text>
                Registrar
              </Text>
            </Button>
            </CardItem>
         </Card>
        </Content>
        </ScrollView>
      </Container>
    );
  }
}

const misEstilos=StyleSheet.create({
  content:{
    flex: 1,
    justifyContent: 'center'
},
  textCenter:{
    textAlign: 'center',
    whith: "100%",
    fontSize: 20
  },
  textColor:{
    textColor: '#025aff'
  },
  boton:{
    marginLeft: "13%"
  },
  botoon:{
    marginLeft: "10%"
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



/*https://expo.github.io/vector-icons/*/
/*https://docs.nativebase.io/Components.html#icon-def-headref*/
/*https://es.survivejs.com/react/advanced-techniques/styling-react/*/