

$(document).ready(function() {
  
  console.log('ready');
  
  console.log(window.location.origin);
  
  var socket = io.connect(window.location.origin);
   socket.on('news', function (data) {
     console.log(data);
     socket.emit('my other event', { my: 'data' });
  });
  
  if($.cookie('test_cookie')) {
    console.log('cookie found');
  } else {
    $.cookie('test_cookie', '1');
    console.log('cookie set');
  }
    
});