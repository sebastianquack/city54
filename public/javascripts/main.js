
$(document).ready(function() {
  
  console.log('ready')  
  
  // cookies
  if($.cookie('city54_uuid')) {
    console.log('uuid found: ' + $.cookie('city54_uuid'))
  } else {
    $.cookie('city54_uuid', uuid.v1())
    console.log('uuid set to' + $.cookie('city54_uuid'))
  }
  
  // sockets
  var socket = io.connect(window.location.origin)
  console.log(window.location.origin)

  socket.emit('uuid-check', { uuid: $.cookie('city54_uuid') })

  socket.on('chat-update', function (data) {
    if(data.player_name == "System") {
      $('ul#chat').append('<li>' + data.value + '</li>')      
    } else {
      $('ul#chat').append('<li>' + data.player_name + ': ' + data.value + '</li>')      
    }

  })

  // user input events
  $('#input-command').on("keypress", function(e) {
    if (e.keyCode == 13) {  
      val = $('#input-command').val()
      socket.emit('chat-submit', { uuid: $.cookie('city54_uuid'), value: val })
      $('#input-command').val('')
    }
  })

})