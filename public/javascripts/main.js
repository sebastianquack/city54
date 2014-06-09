/* variable declarations */ 

var socket

/* function declarations */

// type command in input field and submit to server
function autoType(text) {
  // TODO: scroll to input field
  $('#input-command').focus()
  var delay=90

  var type = function(text,delay) {
    character = text.substr(0,1)
    remaining = text.substr(1)
    elem = $('#input-command')
    elem.val(elem.val() + character)
    elem.trigger("keyup")
    if (remaining != "") setTimeout(function () {type(remaining,delay)}, delay)
  }
  type(text,delay)

  setTimeout(submitCommand, delay*(text.length+2))
}

// submit a command to the server and clear input field 
function submitCommand() {
  val = $('#input-command').val()
  socket.emit('player-action', { uuid: $.cookie('city54_uuid'), input: val })
  $('#input-command').val('')
  updateInput()
}

// submit a command to the server and clear input field 
function submitMenuCommand(val) {
  socket.emit('player-action', { uuid: $.cookie('city54_uuid'), input: val, menu: true })
}

// fill fake input with text, set cursor element
splitCursor = function (text, position) {
  begin = text.substr(0,position)
  cursor = text.substr(position,1)
  end = text.substr(position+1) + " "
  return '<span>'+begin+'</span><span id="cursor">'+cursor+'</span><span>'+end+'</span>'
}

// update fake input
updateInput = function() {
  $('#input-fake').html(splitCursor($('#input-command').val(), $('#input-command').getCursorPosition()))
  $('#input-command').focus()
  if ($('#input-command').val().length >= 1) $('#input').addClass('chars')
  else $('#input').removeClass('chars')
}

/* let's go! */

$(document).ready(function() {

  // local player object
  player = {}

  // set up sockets
  socket = io.connect(window.location.origin)
  
  // check for cookie
  if(!$.cookie('city54_uuid')) {
    $.cookie('city54_uuid', uuid.v1(), { expires: 31 }) // create new uuid
  }
  // send cookie to server for check 
  socket.emit('player-action', { uuid: $.cookie('city54_uuid'), firstPlayerAction: true })

  /* events */

  // a chat item comes in from the server
  socket.on('chat-update', function (data) {
    
    console.log(data)

    if (data.player_room != null && player.currentRoom != data.player_room) {
      $('#chat').append($('<section>'))
      if (["bergkamen","bönen","fröndenberg","holzwickede","kamen","lünen","schwerte","selm","unna","werne"].indexOf(player.currentRoom) != -1) $('body').trigger('startRumble');
    }
    else $('body').trigger('stopRumble');

    player = {
      name:         (data.player_name != null) ? data.player_name : player.name,
      currentRoom:  (data.player_room != null) ? data.player_room : player.currentRoom,
      state:        (data.player_state != null) ? data.player_state : player.state,
    }

    if(data.sender_name == "System") {
      newElem = $('<p>' + data.value + '</p>')
    } else {
      newElem = $('<p data-sender="'+data.sender_name+'">' + data.value + '</p>')
    }
    if (data.type != undefined) newElem = newElem.addClass(data.type)
    newElem = newElem.addClass("incoming")
    newElem = $('#chat section:last-child').append(newElem)

    // move input field to bottom and update data
    $('#chat section:last-child').append($("#input").detach())
    $("#input").attr("data-sender", player.name)
    $("#input").attr("data-state", player.state)
    $("#input-command").focus()

/*
    tt = $(".incoming")
    t = $(tt.last())
    t.removeClass("incoming")
    t.addClass("typing")
    console.log("all :" + tt.length)
    console.log("type:" + t.html())
    t.typewrite({ delay: 60 }, function () {
      console.log("remove:" + $(t).html() )
      $(t).removeClass("incoming")
      $(t).removeClass("typing")
    })
*/

    // scroll up to fit new item
    var delta_y = $("#chat")[0].scrollHeight -$("#chat").innerHeight()-$("#chat").scrollTop()
    $('#chat').animate( {
		    scrollTop: $("#chat")[0].scrollHeight - $("#chat").innerHeight()
      }, {
	      duration: delta_y*50, //$("ul#chat p:last-child").height()*100,
        queue: false,
        easing: "easeOutSine"
    })
    
  })

  // detect touch device (roughly)
  $('body').on("touchstart", function() {
    $('body').removeClass("nontouch")
    $('body').addClass("touch")
  })
    
  // focus input field
  $('body').on("keypress keyup keydown click focus resize load", updateInput)

  // user clicks on menu
  $("body").on("click","*[data-menu]", null, function() { 
    $('nav').removeClass('show');
    submitMenuCommand($(this).data("menu"))      
  })
  
  // user clicks on command
  $("body").on("click","b[data-command]", null, function() { 
    autoType($(this).data("command"))
  })

  // user hits enter in console
  $('#input-command').on("keypress", function(e) {
    if (e.keyCode == 13) { 
      submitCommand()
    }
  })
  
  $('header h1').click(function() {
    window.open("http://www.ringlokschuppen.de/ringlokschuppen/produktionen/vorschau-2014/festivals/54-stadt-das-ende-der-zukunft/");
  })
  
  $('#einbetten').click(function() {
    var embed_url = location.protocol + '//' + location.hostname + (location.port ? ':'+location.port : '') + '/embed'
    window.open(embed_url)
  })

  // Initialize jRumble on Selector
  //$('body').jrumble();

  /*
  // Start rumble on element
  $('body').trigger('startRumble');

  // Stop rumble on element
  $('body').trigger('stopRumble');
  */

  // blink cursor
  setInterval(function(){ $("#cursor").toggleClass("inverted")}, 650);

  // detect cursor position in <input>
  (function($) {
      $.fn.getCursorPosition = function() {
          var input = this.get(0);
          if (!input) return; // No (input) element found
          if ('selectionStart' in input) {
              // Standard-compliant browsers
              return input.selectionStart;
          } else if (document.selection) {
              // IE
              input.focus();
              var sel = document.selection.createRange();
              var selLen = document.selection.createRange().text.length;
              sel.moveStart('character', -input.value.length);
              return sel.text.length - selLen;
          }
      }

  // toggle navigation
  $('.navbar-toggle').click( function(){
    $(this).parent().toggleClass('show');
  });

  })(jQuery);

})


