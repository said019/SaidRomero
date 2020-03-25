drop database if exists prueba;
create database if not exists prueba;
use prueba;
create table if not exists usuario(
usuario varchar(30) not null,
correo varchar(13)not null,
contraseña varchar(50) not null)
engine=InnoDB;
desc usuario;

insert into usuario value("Said	","1234","saidromero19@gmail.com");
select * from usuario;