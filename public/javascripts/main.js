

$(document).ready(function() {
  
  console.log('ready');
  
  var socket = io.connect('http://localhost');
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