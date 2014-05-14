/* variable declarations */ 

var socket

/* function declarations */

// type command in input field and submit to server
function autoType(text) {
  $('#input-command').focus()
  $('#input-command').val(text)
  setTimeout(submitCommand, 800)
}

// submit a command to the server and clear input field 
function submitCommand() {
  val = $('#input-command').val()
  socket.emit('player-action', { uuid: $.cookie('city54_uuid'), input: val })
  $('#input-command').val('')
}

/* let's go! */

$(document).ready(function() {

  // local player object
  player = {}

  // set up sockets
  socket = io.connect(window.location.origin)
  
  // check for cookie
  if(!$.cookie('city54_uuid')) {
    $.cookie('city54_uuid', uuid.v1()) // create new uuid
  }
  // send cookie to server for check 
  socket.emit('player-action', { uuid: $.cookie('city54_uuid'), firstPlayerAction: true })

  // focus input field
  $('#input-command').focus()
  $('body').on("keypress keyup keydown click focus resize", function() {
    $('#input-command').focus()
  })

  /* events */

  // a chat item comes in from the server
  socket.on('chat-update', function (data) {

    console.log(data)

    if (player.currentRoom != data.player_room) {
      $('#chat').append($('<section>'))
    }

    // todo: just submit the damn player object itself
    player = {
      name:         data.player_name,
      currentRoom:  data.player_room,
      state:        data.player_state,
    }

    // todo: check what is going on
    if(data.sender_name == "System") {
      newElem = $('<p data-sender="system">' + data.value + '</p>')
    } else {
      newElem = $('<p data-sender="player"><i>' + data.sender_name + ':</i> ' + data.value + '</p>')
    }
    if (data.type != undefined) newElem = newElem.addClass(data.type)
    $('#chat section:last-child').append(newElem)
  
    $('#chat section:last-child').append($("#input-command").detach())
    $("#input-command").focus()

    // scroll up to fit new item
	  $('#chat').animate( {
		    scrollTop: $("#chat")[0].scrollHeight - $("#chat").innerHeight()
      }, {
	      duration: 300,//$("ul#chat li:last-child").height()*10,
        queue: false,
        easing: "swing"
      })
  })
    
  // user clicks on commands
  $("body").on("click","b[data-command]", null, function() { 
    autoType($(this).data("command")) 
  })

  // user hits enter in console
  $('#input-command').on("keypress", function(e) {
    if (e.keyCode == 13) { 
      submitCommand()
    }
  })

  //$('body').keydown(function(e) {keyboard(e)})
  
})

/*
var keyboard = function(e) {
    var code = (e.keyCode ? e.keyCode : e.which);
    // Enter key?
    if(code == 13)
    {
        // Don't put a newline if this is the first command
        if ($('#PastCommands').html() != '')
            $('#PastCommands').append('<br />');
        $('#PastCommands').append($(this).val());
        $(this).val('');
    }
    else
        $('#input-command').html($(this).val());
}
*/

