const express = require('express')
const app = express()
const path = require('path');
const AWS = require('aws-sdk');
const fs = require('fs');
var _userConnections =[];
const port = process.env.PORT || 8000;
AWS.config.update({ accessKeyId: "AKIAZRSK7KXCPRP4SIDO", secretAccessKey: "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" });

var s3 = new AWS.S3()
app.use(express.urlencoded());
app.use(express.json());
app.get('', function(req, res) {
  res.sendFile(path.join(__dirname,"public/index.html"));
});
app.get('/', function(req, res) {
    
  res.sendFile(path.join(__dirname,"public/index.html"));
});
app.get('/*', function(req, res) {
  res.sendFile(path.join(__dirname, req.params[0]));
});
app.post('/upload', function(req, res) {

});



//Listen on port 3000
const server = app.listen(port);

//socket.io instantiation
const io = require('socket.io')(server, {
    cors: {
        origin: ["https://socketio-over-nodejs2.herokuapp.com/","http://webrtc.tagscores.com/"],
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
});

//listen on every connection
io.on('connection', (socket) => {
    
    console.log(socket.id);

    socket.on('userconnect',(data)=>{
        console.log('userconnect',data.dsiplayName,data.meetingid);
console.log(data);
        var other_users = _userConnections.filter(p => p.meeting_id == data.meetingid);

        _userConnections.push({
            connectionId: socket.id,
            user_id: data.dsiplayName,
            meeting_id :data.meetingid,
            user_type :data.user_type
        });
           console.log(other_users);
        other_users.forEach(v => {
            socket.to(v.connectionId).emit('informAboutNewConnection',{other_user_id:data.dsiplayName,connId:socket.id,user_type:data.user_type});
        });
        
        socket.emit('userconnected',other_users);
        //return other_users;
    });//end of userconnect

    socket.on('exchangeSDP',(data)=>{
        
        socket.to(data.to_connid).emit('exchangeSDP',{message:data.message, from_connid:socket.id});
        
    });//end of exchangeSDP

    socket.on('reset',(data)=>{
        var userObj = _userConnections.find(p => p.connectionId == socket.id);
        if(userObj){
            var meetingid = userObj.meeting_id;
            var list = _userConnections.filter(p => p.meeting_id == meetingid);
            _userConnections = _userConnections.filter(p => p.meeting_id != meetingid);
            
            list.forEach(v => {
                socket.to(v.connectionId).emit('reset');
            });

            socket.emit('reset');
        }
        
    });//end of reset

     socket.on('sendMessage',(msg,candidate_id,type)=>{
  
        var userObj = _userConnections.find(p => p.connectionId == socket.id);
        if(userObj){
            
            var meetingid = userObj.meeting_id;
            var from = userObj.user_id;

            var list = _userConnections.filter(p => p.meeting_id == meetingid);
            

            list.forEach(v => {
               if(candidate_id!="")
                {
                    if(v.connectionId==candidate_id)
                    {
                    socket.to(v.connectionId).emit('showChatMessage',{from:from,message:msg,time:getCurrDateTime(),user_id:candidate_id});
                    }
                }
                else
                {
                            if(v.user_type=="admin" && type=="candidate")
                            {
                           
                          //  socket.to(v.connectionId).emit('showChatMessage',{from:from,message:msg,time:getCurrDateTime(),user_id:v.connectionId});
                            socket.to(v.connectionId).emit('showChatMessage',{from:from,message:msg,time:getCurrDateTime(),user_id:"",send_type:0});
                            }
                            if(v.user_type=="candidate" && type=="admin")
                            {
                            //socket.to(v.connectionId).emit('showChatMessage',{from:from,message:msg,time:getCurrDateTime(),user_id:v.connectionId});
                            socket.to(v.connectionId).emit('showChatMessage',{from:from,message:msg,time:getCurrDateTime(),user_id:"",send_type:0});
                            }
                        
                }
            });

            socket.emit('showChatMessage',{from:from,message:msg,time:getCurrDateTime(),user_id:candidate_id,send_type:1});
        }
        
    });//end of reset
    
    socket.on('disconnect', function() {
        console.log('Got disconnect!');

        var userObj = _userConnections.find(p => p.connectionId == socket.id);
        if(userObj){
            var meetingid = userObj.meeting_id;
        
            _userConnections = _userConnections.filter(p => p.connectionId != socket.id);
            var list = _userConnections.filter(p => p.meeting_id == meetingid);
            
            list.forEach(v => {
                socket.to(v.connectionId).emit('informAboutConnectionEnd',socket.id);
            });
        }
     });
     
      socket.on('download_recording', function(data) {
          console.log(data);  
      })
     
        socket.on('check_my_id',()=>{
        socket.emit('show_my_id',{my_id:socket.id});
        });//check my id

})


function getCurrDateTime(){
    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    let seconds = date_ob.getSeconds();
    var dt = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
    return dt;
}
/*
function read(file) {
  
    fs.readFile(file, function (err, data) {
        if (err) { throw err }
        var base64data = new Buffer(data, 'binary');

        s3.putObject({
           'Bucket': 'tagscore-prod',
            'Key': file,
            'Body': base64data,
            'ACL': 'public-read'
         }, function (resp) {
            console.log(file)
        })
       
    })
    
}
// reg ex to match
var re = /\.txt$/;

// ensure that this file is in the directory of the files you want to run the cronjob on
fs.readdir(".", function(err, files) {
    if (err) {
        console.log( "Could not list the directory.", err)
        process.exit( 1 )
    }

    var matches = files.filter( function(text) { return re.test(text) } )
    console.log("These are the files you have", matches)
    var numFiles = matches.length


    if ( numFiles ) {
        // Read in the file, convert it to base64, store to S3

        for( i = 0; i < numFiles; i++ ) {
            read(matches[i])
        }

    }

})
*/
