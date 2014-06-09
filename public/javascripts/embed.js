var ifrm = null
/* let's go! */

$(document).ready(function() {

  $('#width').val(300) // default values
  $('#height').val(400) // default values

  $('#submit').on('click', function(event) {

    if(ifrm) {
      ifrm.parentNode.removeChild(ifrm)
      ifrm = null  
    }
    
    // create the iframe
    ifrm = document.createElement("iframe")
    
    var url = location.protocol + '//' + location.hostname + (location.port ? ':'+location.port : '')
    ifrm.setAttribute("src", url)
    ifrm.frameBorder = "0"
    ifrm.style.width = $('#width').val()+"px"
    ifrm.style.height = $('#height').val()+"px"
    document.body.appendChild(ifrm)
    
    var text = document.createTextNode(ifrm.outerHTML);    
    $('#embed-code').html('').append(text);        
  })

})


