import React, { Component } from 'react';
import {View,Text, ActivityIndicator} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

class Usuario extends Component{
  constructor(props){
    super(props);
    this.state={
      isLoading:true,
    }
  }//end constructor
  //Lo que está en --- async componentDidMount() ---  se ejecuta independientemente de lo que se este haciendo
  // --- await --- Una promesa es una respuesta, hay promesas verdaderas(regresa los datos correctamente) 
  // y falsas
  async componentDidMount(){
    try{
      const response = await fetch('https://reactnative.dev/movies.json');
      const responseJson = await response.json();
      this.setState({
        isLoading: false,
        dataSource: responseJson.movies,
      },function(){
      });
    }catch(error){
      console.log(error);
    }
  }//end componentDidMount

  render(){
    if(this.state.isLoading==true){
      return(
        <View style={{flex:1, padding: 20}}>
          <ActivityIndicator />
        </View>
      );
    }// end if
    return(
      <View>
        <FlatList 
          data={this.state.dataSource}
          renderItem={({item}) => 
            <Text>{item.title}, {item.releaseYear}</Text>
          }
          keyExtractor = {({id},index)=>id} />
      </View>
    );
  }//end render
}//end class

export default Usuario;




/*
import { Container, Header, Content, Card, CardItem, Text, Body,Button,Item, Icon,Input } from 'native-base';

class Pantalla extends Component{
render(){
  const navegar = this.props.navegation;
  return (
    <Container>
        <Header />
        <Content padder contentContainerStyle ={misEstilos.content}>
          <Card>
            <CardItem>
              <Text>Tu nombre es:{this.props.route.params.nombres}</Text>
            </CardItem>
            <CardItem>
              <Text>Tu contraseña es:{this.props.route.params.pass}</Text>
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
  },
});*/