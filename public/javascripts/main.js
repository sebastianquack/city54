 /* variable declarations */ 

var socket
var touchDevice = false

/* function declarations */

// type command in input field and submit to server
var autoTyping = false
function autoType(text, menuFlag, menuValue) {
  if (autoTyping) return
  else autoTyping = true
  scrollInput()
  var delay=90

  var type = function(text,delay) {
    character = text.substr(0,1)
    remaining = text.substr(1)
    elem = $('#input-command')
    elem.val(elem.val() + character)
    elem.trigger("keypress")
    if (remaining != "") setTimeout(function () {type(remaining,delay)}, delay)
  }
  type(text,delay)

  if(menuFlag == true) {
    setTimeout(function() { submitMenuCommand(menuValue); autoTyping = false; }, delay*(text.length+5))
  } else {
    setTimeout(function() { submitCommand(); autoTyping = false; }, delay*(text.length+5))
  }
}

// submit a command to the server and clear input field 
function submitCommand() {
  val = $('#input-command').val()
  if (val.trim()=="") return
  
  if(val.trim() == "logout") {
    $.cookie('city54_uuid', uuid.v1(), { expires: 31 }) // create new uuid
    location.reload()
  } else {
    socket.emit('player-action', { uuid: $.cookie('city54_uuid'), input: val })
  }
  $('#input-command').val('')
  updateInput()
}

// submit a menu command to the server and clear input field 
function submitMenuCommand(val) {
  socket.emit('player-action', { uuid: $.cookie('city54_uuid'), input: val, menu: true })
  $('#input-command').val('')
  updateInput()
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
  if(!touchDevice) {
    $('#input-command').focus()
  } 
  if ($('#input-command').val().length >= 1) $('#input').addClass('chars')
  else $('#input').removeClass('chars')
}


// fast scroll to input
var fastScroll = false
scrollInput = function() {
  
    var offset_y = $("#chat")[0].scrollHeight - $("#chat").innerHeight()
    var delta_y = offset_y-$("#chat").scrollTop()
    if (fastScroll || delta_y <= 2) return
    var duration = delta_y * 2
    duration = Math.max(Math.min(duration, 800), 200)
    $('#chat').stop().animate({
        scrollTop: offset_y
    },{
        duration: duration,
        queue: false,
        start: function() { fastScroll = true },
        always: function() { fastScroll = false },
        complete: fillCommandGaps,
        easing: "swing"
    })

}

fillCommandGaps = function() {
  $("#chat section:not(:last-child)").addClass("done")
}

/* let's go! */

$(document).ready(function() {

  touchDevice = 'ontouchstart' in window || !!navigator.msMaxTouchPoints; // detect touch device

  /*
  // detect touch device (roughly)
  $('body').on("touchstart", function() {
    $('body').removeClass("nontouch")
    $('body').addClass("touch")
  })
  */

  // local player object
  player = {}

  // set up sockets
  socket = io.connect(window.location.origin)
  
  // check for cookie
  if(!$.cookie('city54_uuid')) {
    console.log("creating new cookie");
    $.cookie('city54_uuid', uuid.v1(), { expires: 31 }) // create new uuid
  }
  
  // send cookie to server for check 
  socket.on('connect', function() { 
    socket.emit('player-action', { uuid: $.cookie('city54_uuid'), firstPlayerAction: true })
  })
  /* events */

  // a chat item comes in from the server
  socket.on('chat-update', function (data) {
    
    console.log(data)

    if (data.player_room != null && player.currentRoom != data.player_room || data.type == "chapter") {
      $('#chat').append($('<section>'))
      //if (["bergkamen","bönen","fröndenberg","holzwickede","kamen","lünen","schwerte","selm","unna","werne"].indexOf(player.currentRoom) != -1) $('body').trigger('startRumble');
    }


    //$('body').trigger('stopRumble');

    player = {
      name:         (data.player_name != null) ? data.player_name : player.name,
      currentRoom:  (data.player_room != null) ? data.player_room : player.currentRoom,
      state:        (data.player_state != null) ? data.player_state : player.state,
    }

    // do some replacements
    var d = new Date()
    d.setYear(2044)
    var dateString = d.getDate()+"."+(d.getMonth()+1)+"."+d.getFullYear()+", "+d.getHours()+":"+("00" + d.getMinutes()).slice(-2)
    data.value = data.value.replace("\time", dateString) // parse old links
    
    // add text
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
    updateInput()
    
    // scroll up to fit new item
    var delta_y = $("#chat")[0].scrollHeight -$("#chat").innerHeight()-$("#chat").scrollTop()
    $('#chat').stop().animate( {
		    scrollTop: $("#chat")[0].scrollHeight - $("#chat").innerHeight()
      }, {
	      duration: delta_y*10, //$("ul#chat p:last-child").height()*100,
        queue: true,
        easing: "easeOutSine",
        start: function() {
          // user scroll breaks slow scroll
          $("#chat").bind("mousedown.scroll DOMMouseScroll.scroll mousewheel.scroll keypress.scroll", function(e){
            $('#chat').stop()
            $('#chat').unbind("mousedown.scroll DOMMouseScroll.scroll mousewheel.scroll keypress.scroll")
          });
        },
        complete: fillCommandGaps,
        always: function(){}
    })
    
  })

  // focus input field
  if(!touchDevice) {
    $('body').not("b[data-command], #input-command").on("keypress click focus resize load", function(event){
      scrollInput()
      $('#input-command').focus()
    })
  } else {
    $('#input').on("click", function(event){
      $('#input-command').focus()
      setInterval(scrollInput, 500) // add delay while software keyboard opens on touch devices
    })
  }

  $('#input-command').on("keypress keyup keydown", updateInput)
  
  // toggle navigation
  $('.navbar-toggle').click( function(){
    $(this).parent().toggleClass('show');
  });
    
  if(self==top) {
  	$(".fullscreen-toggle").hide()    
  }
    
  // user clicks on menu
  $("body").on("click","*[data-menu]", null, function() { 
    $('nav').removeClass('show');
    if(player.state == "welcome" || player.state == "bot" || player.state == "chat") {
      submitMenuCommand($(this).data("menu"))      
    } else {
      autoType($(this).data("menu"), true, $(this).data("menu"))      
    }
  })
  
  // user clicks on command
  $("body").on("click","b[data-command]", null, function() { 
    scrollInput()
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
  
  $('.fullscreen-toggle').click(function() {
    window.open("http://city54.herokuapp.com/")
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

  })(jQuery);

})


