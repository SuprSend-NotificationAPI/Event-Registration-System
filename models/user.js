const mongoose = require('mongoose');
const {Schema, model} = mongoose;

const UserSchema = new Schema({
  email : {type:String},
  phone : {type:Number},
  name : String,
  Date : Date
});

const UserModel = model('User', UserSchema);

module.exports = UserModel;