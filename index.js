require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const bodyParser = require("body-parser") 

const User = require("./models/user")

const { Suprsend, SubscriberListBroadcast } = require("@suprsend/node-sdk");
const { Workflow } = require("@suprsend/node-sdk")

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true})); 
app.use(express.static("public"));


mongoose.set('strictQuery', true);
const URI = process.env.MOGODB_URI;
mongoose.connect(URI, {useNewUrlParser: true});

const workspace_key = process.env.WORKSPACE_KEY;
const workspace_secret = process.env.WORKSPACE_SECRET;
const supr_client = new Suprsend(workspace_key, workspace_secret);
var finalotp  = 123456;

const subscriber_lists = supr_client.subscriber_lists.create({
    list_id: "eventsubscribers",
    list_name: "Event Registration system subscribers",
    list_description: "This list contains the information of the the all the ids who are registered to the  event registration system"
});

app.get("/",(req,res)=>{
    res.render("homepage");
})

app.get("/add-passcode",(req,res)=>{
     res.render("addpasscode");
})

app.post("/send-otp",(req,res)=>{
    const {user_id,name,phone,date} = req.body;
    console.log(user_id,name,phone,date);
    const newUser = new User({
        name : name,
        email : user_id,
        phone : phone,
        date : date
    })
    var otp = Math.floor(Math.random() * 900000) + 100000;
    finalotp = otp;
    const workflow_body = {
        "name": "OTP PROVIDER",
        "template": "otp-for-login",
        "notification_category": "transactional",
        "users": [
          {
            "distinct_id": user_id,
            "$sms": [phone],
          }
        ],
        "delivery": {
          "success": "seen",
          "mandatory_channels": ["email","sms"] 
        },
        "data": {
            "otp": otp,
            "domain": "Event Registration system",
            "duration": "15 minutes"
          }
      }
    
    const wf = new Workflow(workflow_body)
    const response =  supr_client.trigger_workflow(wf) 
    response.then((res) => console.log("response", res));
    newUser.save();
    const data = supr_client.subscriber_lists.add("eventsubscribers", [
        user_id
      ]);    
    data.then((res) => console.log(res)).catch((err) => console.log(err));       
    res.render("otppage",{user_id : user_id,name : name,phone : phone,date : date});
})

app.post("/otpverify",(req,res)=>{
    const {otp,button,name,phone,date} = req.body;
    const email = button;
    if(otp!=finalotp){
        res.render("failure");
    }
    else{
        const workflow_body = {
            "name": "event registration",
            "template": "event-registration-system",
            "notification_category": "transactional",
            "users": [
              {
                "distinct_id": email,
                "$email": [email],
              }
            ],
            "delivery": {
              "success": "seen",
              "mandatory_channels": ["email","sms"] 
            },
            "data": {
                "name":name,
                "date":date
              }
          }      
        const wf = new Workflow(workflow_body)
        const response =  supr_client.trigger_workflow(wf) 
        response.then((res) => console.log("response", res));     
        res.render("success"); 
    }
})


app.post("/sendbroadcast",(req,res)=>{
    const {message,key} = req.body;
    if(key!="4532@!#$$23wnsdakflda"){
        res.send("sorry but you are not authorized to send this");
    }
    else{
        const broadcast_body = {
            list_id: "eventsubscribers",
            template: "broadcast-event-registration",
            notification_category: "transactional",
            channels: ["email"],
            data: {
              "message": message
         }
       }
        const inst = new SubscriberListBroadcast(broadcast_body);
        const data = supr_client.subscriber_lists.broadcast(inst);
        data.then((res) => console.log(res)).catch((err) => console.log(err));
        res.render("success");
    }
})

app.post("/failure",(req,res)=>{
    res.redirect("/");
})

app.listen(3000,()=>{
    console.log("server started on port 3000");
})