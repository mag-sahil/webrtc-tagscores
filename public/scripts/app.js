var socket = null;
var socker_url = 'https://webrtc-tagscores.herokuapp.com/';
//var socker_url = 'http://localhost:8000/';
var meeting_id = '';
var user_id = '';
var User_type = '';
var Test_type = '';

var MyApp = (function(){



function init(uid,mid,user_type,test_type){
   
    SignalServerEventBinding();
    create_user(uid,mid,user_type,test_type);
    EventBinding();
}


function create_user(uid,mid,user_type,test_type){
    
      user_id = uid;
    meeting_id = mid;
    User_type = user_type;
    Test_type=test_type;

    $('#meetingname').text(meeting_id);
    $('#me h2').text(user_id + '(Me)');
    document.title = user_id;
        
   
    socket.emit('check_my_id');
     socket.on('show_my_id', function (data) {
         $("#me_id").val(data.my_id);
     });
        


}

function SignalServerEventBinding(){
    // Set up the SignalR connection
    //$.connection.hub.logging = true;

    //_hub = $.connection.webRtcHub;
    //$.connection.hub.url = _hubUrl;

    socket = io.connect(socker_url);
    
    
   

    var serverFn = function (data, to_connid) {
        socket.emit('exchangeSDP',{message:data,to_connid:to_connid});
        //_hub.server.exchangeSDP(data, to_connid);
    };

    socket.on('reset',function () {
        location.reload();
    });

    socket.on('exchangeSDP', async function (data) {
        //alert(from_connid);
        await WrtcHelper.ExecuteClientFn(data.message, data.from_connid);
    });

    socket.on('informAboutNewConnection',function (data) {
        if(User_type!=data.user_type)
        {
        AddNewUser(data.other_user_id, data.connId);
        WrtcHelper.createNewConnection(data.connId);
        }
    });

    socket.on('informAboutConnectionEnd',function (connId) {
         var remove_other_user_id=$('#' + connId).find(".user_name").text();
        $('#' + connId).remove();
         $(".show_alert_message").prepend("<div class='alert alert-danger alert-dismissible fade in message_"+connId+"'><a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a>Candidate("+remove_other_user_id+") was disconnected.</div>");
         $(".message_"+connId).delay(5000).fadeOut();
        WrtcHelper.closeExistingConnection(connId);
    });

    socket.on('showChatMessage', function (data) {
        console.log(data);
        //  var div = $("<div>").text(data.from + '(' + data.time + '):' + data.message);
          //  var datetime=data.time;
            const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
            ];
            // Return today's date and time
            var currentTime = new Date()

            // returns the month (from 0 to 11)
            var month = monthNames[currentTime.getMonth() + 1];
            // returns the day of the month (from 1 to 31)
            var day = currentTime.getDate()
            // returns the year (four digits)
            var year = currentTime.getFullYear()
            
            var hours = currentTime.getHours();
            var minutes = currentTime.getMinutes();
            var ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0'+minutes : minutes;
            var c_time = hours + ':' + minutes + ' ' + ampm;
           // var c_time=currentTime.getHours() + ":" + currentTime.getMinutes() + ":" + currentTime.getSeconds();
            // write output MM/dd/yyyy
            var c_date= day+" "+month+" "+year;
            console.log(data);
            if(data.send_type)
            {
                 var div = $("<div class='direct-chat-msg right send_mess send_mess_"+data.user_id+"'>").html("<div class='direct-chat-info clearfix'><span class='direct-chat-name pull-right'>"+data.from+"</span><span class='direct-chat-timestamp pull-left'> "+c_date+" "+c_time+"</span></div> <img class='direct-chat-img' src='https://img.icons8.com/office/36/000000/person-female.png' alt='message user image'><div class='direct-chat-text'>"+data.message+"</div>");
            }
            else
            {
                var div = $("<div class='direct-chat-msg send_mess send_mess_"+data.user_id+"'>").html(" <div class='direct-chat-info clearfix'><span class='direct-chat-name pull-left'>"+data.from+"</span> <span class='direct-chat-timestamp pull-right'>"+c_date+" "+c_time+"</span> </div> <img class='direct-chat-img' src='https://img.icons8.com/color/36/000000/administrator-male.png' alt='message user image'><div class='direct-chat-text'>"+data.message+"</div>");
            }
           
            // $('#messages').append(div);
            $('.direct-chat-messages').append(div);
    });

    socket.on('connect', () => {
        if(socket.connected){
            WrtcHelper.init(serverFn, socket.id);

            if (user_id != "" && meeting_id != "") {
                socket.emit('userconnect',{dsiplayName:user_id, meetingid:meeting_id,user_type:User_type},);
                //_hub.server.connect(user_id, meeting_id)
                
            }
        }
    });

    socket.on('userconnected',function(other_users){
        $('#divUsers .other').remove();
       // console.log(other_users);
        if (other_users) {
            for (var i = 0; i < other_users.length; i++) {
                 if(User_type!=other_users[i].user_type)
                {
                AddNewUser(other_users[i].user_id, other_users[i].connectionId);
                WrtcHelper.createNewConnection(other_users[i].connectionId);
                }
            }
        }
        $(".toolbox").show();
        $('#messages').show();
        $('#divUsers').show();
    });
}

function EventBinding(){
    $('#btnResetMeeting').on('click', function () {
        socket.emit('reset');
    });

    $('#btnsend').on('click', function () {
        //_hub.server.sendMessage($('#msgbox').val());
        console.log($(this));
        console.log($(this).attr('data-id'));
        socket.emit('sendMessage',$('#msgbox').val(),$(this).attr('data-id'),User_type);
        $('#msgbox').val('');
    });

    $('#divUsers').on('dblclick', 'video', function () {
        this.requestFullscreen();
    });
}

function AddNewUser(other_user_id, connId) {
 
 console.log(User_type);
    var $newDiv = $('#otherTemplate').clone();
    $newDiv = $newDiv.attr('id', connId).addClass('other');
    $newDiv.find('.user_name').text(other_user_id);
    $newDiv.find('.Enable_mute').addClass("Enable_mute_"+connId);
    $newDiv.find('.Enable_mute').attr("data-id",connId);
    $newDiv.find('.Enable_mute').attr("data-status",true);
    $newDiv.find('.Enable_chat').attr("data-id",connId);
    $newDiv.find('.Enable_chat').attr("data-name",other_user_id);
    $newDiv.find('video').attr('id', 'v_' + connId);
    $newDiv.find('audio').attr('id', 'a_' + connId);
    if(User_type=="candidate" && Test_type=="t" )
    {
        $newDiv.hide();
    }else{
    $newDiv.show();
    }
    $('#divUsers').append($newDiv);
    $(".show_alert_message").prepend("<div class='alert alert-success alert-dismissible fade in message_"+connId+"'><a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a>Candidate("+other_user_id+") Connected Successfully!!</div>");
    $(".message_"+connId).delay(5000).fadeOut();
   
}

return {

    _init: function(uid,mid,user_type,test_type){
        init(uid,mid,user_type,test_type);
    }

};

}());