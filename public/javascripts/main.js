
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
      newElem = $('<li>' + data.value + '</li>')
    } else {
      newElem = $('<li>' + data.player_name + ': ' + data.value + '</li>')
    }
    $('ul#chat').append(newElem)
    
  })

  // user input events
  $('#input-command').on("keypress", function(e) {
    if (e.keyCode == 13) { submitCommand }
  })
  
  // focus input field
  $('#input-command').focus()
  
  // make commands clickable
  $("body").on("click","b[data-command]",null, function() { autoType( $(this).data("command") ) } )

  function autoType(text) {
    $('#input-command').focus()
    $('#input-command').val(text)
    setTimeout(submitCommand, 800)
  }

  function submitCommand() {
    val = $('#input-command').val()
    socket.emit('chat-submit', { uuid: $.cookie('city54_uuid'), value: val })
    $('#input-command').val('')
  }

})