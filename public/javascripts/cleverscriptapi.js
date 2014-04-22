/*
Include file for the Cleverscript API. Created 27/2/2013

This function will generate a form for the user to type into and will get the bot's
reply and show them on the screen, along with the reaction/emotion image. If jQuery
is available it will fade between the reaction and emotion. The main ShowCleverscriptForm
function has two arguments, the API key and a list of options. Only the API key is
required. The form and subsequent chat are written into a div with a class of
cleverscriptreply at the point where you call the function (unless you pass in the
form_id option). You can have more than one bot in a single page.

Use it like this:
  <script type="text/javascript" src="/path/to/cleverscriptapi.js"></script>
  <script type="text/javascript">ShowCleverscriptForm ('APIKEY', {interactions:3});</script>

Alternatively, if you would like to create the form yourself, you can set it up like this,
intially calling CleverscriptSetup to put in all the options including your callback
function and CleverscriptInput to process in the user's input.
  <form onsubmit="CleverscriptInput (this.userinput.value); return false;">
  You: <input name="userinput" type="text"/></form>
  <script type="text/javascript" src="cleverscriptapi.js"></script>
  <script type="text/javascript">
  function mycallback (data) {alert ('Bot replied: ' + data.output);}
  CleverscriptSetup ('APIKEY', {callback_after:mycallback, debug:2});
  </script>
The bot can not start the conversation when used this way, instead call CleverscriptInput('')
to get the first bot reply. If you have more than one bot on a page, call each with a
number at the end: CleverscriptInput (this.value, 0). To pass in extra variables to the API
using either method call CleverscriptExtraVariables (vars) with a key/value string or object.

The options and their default values are:
-server: whether to use the "test" or "live" server (live)
-you_label: text before the form input box (You)
-you_size: size of the form input box (40)
-submit_label: label for the submit button (Say it)
-wating_message: waiting message that appears while waiting for API to respond (Waiting...)
-timeout: timeout in milliseconds to wait for the API to reply (10000)
-timeout_message: message to display if the API times out (No response, please try again.)
-bot_start: whether the bot should start the conversation (yes)
-form_id: put the form in this HTML id (or else adds to page in place)
-reaction_image: whether to show reaction image: "none", "text" or "tone" (none)
-reaction_default: default image to show when nothing returned (agreeable or 0)
-reaction_prefix: path and prefix to the reaction image (blank)
-reaction_postfix: postfix to the reaction image (blank)
-emotion_image: whether to show emotion image: "none", "text" or "tone" (none)
-emotion_default: default image to show when nothing returned (agreeable or 0)
-emotion_prefix: path and prefix to the emotion image (blank)
-emotion_postfix: postfix to the emotion image (blank)
-image_width: width in pixels that images should be displayed at (80)
-image_delay: delay in milliseconds before fading between reaction and emotion (1000)
-image_fade: length of fade in ms (1000)
-bot_label: label for the bot's reply (Bot)
-you_capitalise: whether to capitalise the user's input automatically (yes)
-you_punctuate: whether to add a full stop to the user's input automatically (yes)
-interactions: how many interactions to show on the screen (0 = all)
-text_id: show the full text conversation in this HTML id (nowhere)
-text_count: only start showing it after this many interactions with display:block (0)
-callback_before: Javascript function to call before outputting bot's response with data as arg (none)
-callback_after: Javascript function to call before outputting bot's response with data as arg (none)
-csstate: the initial Cleverscript variable to restart a session (blank)
-avatar: name of avatar SWF file (none, costs more credits to use this)
-avatar_id: put the avatar into this div (or else adds to page in place)
-avatar_size: width and height of the avatar in pixels (478)
-tts_voice: voice to use for TTS (serena)
-debug: pass this in to see an alert with all the variables, 0=none, 1=data, 2=data+options (0)

Images:
You must have images for all the reactions and/or emotions (as listed in the manual)
or for the tones (from -2 to 2) in a directory on your server. The image name is formed
from the prefix, reaction/emotion full/tone and postfix. For example:
{reaction_image: 'tone', reaction_prefix:'/images/reaction', reaction_postfix: '.jpg'}
Would create an image like: /images/reacdtion-2.jpg if the reaction_tone was -2.

Classes used with some default styles applied:
form.cleverscriptform
form.cleverscriptform input.cleverscriptinput
form.cleverscriptform input.cleverscriptsubmit
div.cleverscriptreply 
div.cleverscriptreply div.cleverscriptimages {float:left; padding-right:10px; width: #px;}
div.cleverscriptreply div.cleverscriptimages img.cleverscriptreaction
div.cleverscriptreply div.cleverscriptimages img.cleverscriptemotion {position:absolute; width: #px;}
div.cleverscriptreply div.cleverscriptdivider {clear:both; padding-top: 15px;}
*/


/////////////////////////// ShowCleverscriptForm /////////////////////////// 
var CSBOTS = new Array(); //an array to store all the bots on the apge
var CSSWFOBJECT = null; //will store the SWF object if needed

function CleverscriptSetup (apikey, options) { //added 1/8/2013 to separate form from options
	////////////////// options for the object ////////////////// 
	if (!options) options = new Object();
	options.apikey = apikey;
	if (!options.server) options.server = 'live'; //live server by default
	if (!options.you_label) options.you_label = 'You';
	if (!options.you_size) options.you_size = 40;
	if (!options.submit_label) options.submit_label = 'Say it';
	if (!options.waiting_message) options.waiting_message = 'Waiting...';
	options.waiting = 0; //are we waiting for a response
	if (!options.timeout) options.timeout = 10000;
	if (!options.timeout_message) options.timeout_message = 'No response, please try again.';
	if (options.bot_start != 'no') options.bot_start = 'yes';
	if (!options.form_id) options.form_id = '';
	if (!options.reaction_image) options.reaction_image = 'none';
	if (!options.reaction_default) options.reaction_default = options.reaction_image=='tone' ? '0' : 'agreeable';
	if (!options.reaction_prefix) options.reaction_prefix = '';
	if (!options.reaction_postfix) options.reaction_postfix = '';
	if (!options.emotion_image) options.emotion_image = 'none';
	if (!options.emotion_default) options.emotion_default = options.emotion_image=='tone' ? '0' : 'agreeable';
	if (!options.emotion_prefix) options.emotion_prefix = '';
	if (!options.emotion_postfix) options.emotion_postfix = '';
	if (!options.image_width) options.image_width = 80;
	if (!options.image_delay) options.image_delay = 1000;
	if (!options.image_fade) options.image_fade = 1000;
	if (!options.bot_label) options.bot_label = 'Bot';
	if (options.you_capitalise != 'no') options.you_capitalise = 'yes';
	if (options.you_punctuate != 'no') options.you_punctuate = 'yes';
	if (!options.interactions) options.interactions = 0;
	if (!options.text_id) options.text_id = '';
	if (!options.text_count) options.text_count = 0;
	if (!options.callback_before) options.callback_before = '';
	if (!options.callback_after) options.callback_after = '';
	if (!options.csstate) options.csstate = ''; //the initial cleverscript state
	if (!options.avatar) options.avatar = '';
	if (options.avatar) FillSwfObject(); //include the code for a SWF object which we will need
	if (!options.avatar_id) options.avatar_id = '';
	if (!options.avatar_size) options.avatar_size = 478; //default size
	if (!options.tts_voice) options.tts_voice = 'serena';
	if (!options.debug) options.debug = 0;
	options.extra_variables = ''; //any extra variables to be passed in
	options.history = new Array(); //history of interactions
	var botnum = CSBOTS.length; //counter for this bot
	////////////////// create a wrapper for the callback ////////////////// 
	//This makes CleverscriptCallBack0 just another way to call CleverscriptCallBack allowing for more than one of these forms on a page.
	window['CleverscriptCallBack'+botnum] = new Function ('data', 'CleverscriptCallBack(data,' + botnum + ')');
	CSBOTS.push (options);
	return botnum; //return the counter for this bot
}
function CleverscriptSetState (cs, botnum) {var options = CSBOTS[botnum ? botnum : 0]; if (options) options.csstate = cs;}

/////////////////////////// Setup the bot with a form /////////////////////////// 
function ShowCleverscriptForm (apikey, options) {
	botnum = CleverscriptSetup (apikey, options); //set up all the options
	options = CSBOTS[botnum]; //get the options back
	////////////////// create the avatar ////////////////// 
	if (options.avatar) { //added to here 27/3/2014
		var dr = '<div id="csavatar' + botnum + '" class="cleverscriptavatar"></div>';
		var el = false;
		if (options.avatar_id) el = document.getElementById (options.avatar_id); //where to add the avatar
		if (el) el.innerHTML = dr; else document.write (dr); //add to the page
		if (CSSWFOBJECT.hasFlashPlayerVersion("8.0.0")) {	
			var flashvars = {"exp":options.avatar.replace('.swf','.xml'),"positionX":"-1","positionY":"0","avatarNumber":"1"};
			var params = {allowScriptAccess:'always', swliveconnect:'true', wmode:'transparent'};
			var attributes = {id:'csavatarswf'+botnum, name:'csavatarswf'+botnum, wmode:'transparent'};
			CSSWFOBJECT.embedSWF (options.avatar, 'csavatar'+botnum, options.avatar_size, options.avatar_size, "8.0.0", "", flashvars, params, attributes);
		}
	}
	////////////////// create the bot form ////////////////// 
	var r = ''; //a variable for the HTML
	r += '<div id="csreply' + botnum + '" class="cleverscriptreply"></div>';
	r += '<form class="cleverscriptform" onsubmit="CleverscriptInput(this.csinput,' + botnum + '); return false;">';
	r += options.you_label + ': <input id="csinput' + botnum + '" name="csinput" class="cleverscriptinput" type="text" ';
	r += 'size="' + options.you_size + '" onfocus="if(this.value==CSBOTS[' + botnum + '].timeout_message)this.value=\'\'"/> ';
	r += '<input name="cssubmit" class="cleverscriptsubmit" type="submit" value="' + options.submit_label + '" /></form>';
	var el = false; //used below
	if (options.form_id) el = document.getElementById (options.form_id); //where to add the form
	if (el) el.innerHTML = r; else document.write (r); //add to the page
	if (options.bot_start=='yes') CleverscriptInput ('', botnum); //make the bot start the conversation
}

/////////////////////////// If you want to pass in extra variables /////////////////////////// 
function CleverscriptExtraVariables (vars, botnum) {
	if (!botnum) botnum = 0;
	var options = CSBOTS[botnum];
	var r=''; //this will be used for the extra variables
	if (typeof vars == 'object') for (var p in vars) r += p + '=' + encodeURIComponent (vars[p]) + '&';
	else if (typeof vars == 'string') r = vars;
	options.extra_variables = r;
}

/////////////////////////// Called whenever there is form input /////////////////////////// 
function CleverscriptInput (inputel, botnum) {
	if (!botnum) botnum = 0;
	var options = CSBOTS[botnum];
	if (options.waiting) return; //we are currently waiting for a reply
	var csinput = ''; //the user's input
	if (typeof inputel == 'string') csinput = inputel; //we were passed an input
	else if (inputel) {csinput = inputel.value; inputel.value = options.waiting_message;} //show the loading message
	var url = 'http://';
	if (options.server=='test') url += 'testapi.cleverscript.com'; //test server
	else if (options.server=='live') url += 'api.cleverscript.com'; //live server
	else url += options.server; //use server that was passed in
	url += '/csapi';
	var params = new Object();
	params.key = options.apikey;
	params.input = encodeURIComponent (csinput);
	params.cs = options.csstate;
	params.callback = 'CleverscriptCallBack' + botnum;
	if (options.avatar && options.tts_voice) params.ttsvoice = options.tts_voice; //request TTS as well
	var geturl = url + '?'; for (var p in params) geturl += p + '=' + params[p] + '&';
	geturl += options.extra_variables; //extra variables added 1/8/2013
	if (options.debug >= 3) alert ("About to call: " + geturl);
	var appendel = document.getElementById('csreply'+botnum); if (!appendel) appendel = document.body; //use the document body 
	//Whether to do a POST message or a GET. POST is done for really long inputs on newer browsers as IE has a 2048 character limit. Added 1/8/2013
	if (geturl.length >= 2048 && window.postMessage) { //window.postMessage is only supported on newer browsers
		var csframename = 'CleverscriptPostFrame'; //the name of the cleverscript frame
		var csformname = 'CleverscriptPostForm'; //the name of the form
		var myframe = window.frames ? window.frames[csframename] : 0; //look up this iframe
		if (!myframe) { //make the iframe
			myframe = document.createElement ("iframe");
			myframe.style.display = "none";
			appendel.appendChild (myframe); 
			myframe.contentWindow.name = csframename;
		}
		var myform = document.forms ? document.forms[csformname] : 0; //look up my form
		if (myform) {for (var p in params) myform.elements[p].value = params[p];} //set the parameters
		else { //make the form
			myform = document.createElement ("form");
			myform.name = csformname;
			myform.target = csframename;
			myform.action = url; //the URL to POST to
			myform.method = "POST";
			appendel.appendChild (myform); 
			for (var p in params) {
				var hiddenField = document.createElement ("input");
				hiddenField.setAttribute ("type", "hidden");
				hiddenField.setAttribute ("name", p);
				hiddenField.setAttribute ("value", params[p]); //must be done here and not separately for IE8 from 19/8/2013
				myform.appendChild (hiddenField);
			}
		}
		//alert ('Submitting form ' + myform.outerHTML);
		myform.submit();
	} else { //a get request via JSONP
		var el = document.createElement ('script');
		el.setAttribute ('action', 'text/javascript'); el.setAttribute ('src', geturl);
		appendel.appendChild (el); 
	}
	CSBOTS[botnum].waiting = options.history.length + 1; //we are currently waiting
	if (document.getElementById('csinput'+botnum)) setTimeout ('CleverscriptTimeout(' + botnum + ',' + options.history.length + ')', options.timeout);
}

function CleverscriptTimeout (botnum, ic) {
	var options = CSBOTS[botnum];
	if (options.waiting != ic + 1) return; //already dealt with
	document.getElementById('csinput'+botnum).value = options.timeout_message;
	CSBOTS[botnum].waiting = 0;
}

/////////////////////////// Called to process the return from the form /////////////////////////// 
function CleverscriptCallBack (data, botnum) {
	////////////////// set up some variables ////////////////// 
	if (!botnum) botnum = 0;
	var options = CSBOTS[botnum];
	if (!data || !options) return; //no data or no bot options
	var ic = data.interaction_count; if (!ic) ic = options.history.length;
	if (options.callback_before && typeof (options.callback_before) == 'function') options.callback_before (data);

	////////////////// show debug alert ////////////////// 
	if (options.debug >= 1) CleverscriptShowObject ('BOT ' + botnum + ' DATA', data, 1);
	if (options.debug >= 2) CleverscriptShowObject ('BOT ' + botnum + ' OPTIONS', options, 1);

	////////////////// deal with reaction ////////////////// 
	var reaction='', reactionimage='';
	if (options.reaction_image != 'none') {
		reactionimage = options.reaction_prefix;
		reaction = options.reaction_image=='tone' ? data.reaction_tone : data.reaction;
		if (!reaction) reaction = options.reaction_default;
		reactionimage += reaction.replace('-', '').replace(' ', '_');
		reactionimage += options.reaction_postfix;
	}

	////////////////// deal with emotion ////////////////// 
	var emotion='', emotionimage='';
	if (options.emotion_image != 'none') {
		emotionimage = options.emotion_prefix;
		emotion = options.emotion_image=='tone' ? data.emotion_tone : data.emotion;
		if (!emotion) emotion = options.emotion_default;
		emotionimage += emotion.replace('-', '').replace(' ', '_');
		emotionimage += options.emotion_postfix;
	}

	////////////////// form the text ////////////////// 
	var reply = '';
	if (data.input) {
		if (options.you_punctuate) {var lc = data.input.substr(-1); lc = (lc == '.' || lc == '?' || lc == '!') ? '' : '.'; data.input += lc;}
		if (options.you_capitalise) data.input = data.input.substr(0,1).toUpperCase() + data.input.substr(1);
		reply += options.you_label + ': ' + data.input + '<br/>';
	}
	if (!data.output && data.response) data.output = data.response; //sometimes it comes back as response for bad responses 19/8/2013
	reply += options.bot_label + ': ' + data.output + '<br/>';

	////////////////// show the full conversation somewhere ////////////////// 
	var el = false; //for lower down
	if (options.text_id) el = document.getElementById (options.text_id); //where to add the form
	if (el) {el.innerHTML += reply; if (options.text_count <= ic) el.style.display = 'block';}

	////////////////// add the image and text ////////////////// 
	var fullreply='', reactionsrc='';
	var fadethem = (reactionimage && emotionimage && jQuery) ? 1 : 0; //can we fade between the images
	if (reactionimage || emotionimage) {
		var width = parseInt (options.image_width) > 0 ? (' width:' + options.image_width + 'px;') : '';
		var fadecss = fadethem ? 'position:absolute;' : '';
		fullreply = '<div class="cleverscriptimages" style="float:left; padding-right: 10px;' + width + '">';
		reactionsrc = '<img id="csreaction' + botnum + '-' + ic + '" src="' + reactionimage + '"';
		reactionsrc += ' title="Reaction: ' + reaction + '" class="cleverscriptreaction"';
		reactionsrc += ' style="' + fadecss + width + '"/>'; //then reaction so that it goes on top and then fades to emotion
		fullreply += reactionsrc;
		if (emotionimage) fullreply += '<img src="' + emotionimage + '" title="Emotion: ' + emotion + '" class="cleverscriptemotion" style="' + width + '"/>';
		fullreply += '&nbsp;</div>';
	}
	fullreply += reply;
	fullreply += '<div class="cleverscriptdivider" style="clear:both; padding-top:15px;"></div>';
	
	////////////////// get how many replies ////////////////// 
	var allreplies=''; //for all the replies so far
	var numshow = options.interactions>0 && options.interactions-1<options.history.length ? (options.interactions-1) : options.history.length;
	for (var i=options.history.length-numshow; i<options.history.length; i++) allreplies += options.history[i]; //get all the replies
	allreplies += fullreply; //show the full reply including the fade
	var replyel = document.getElementById('csreply'+botnum);
	if (replyel) replyel.innerHTML = allreplies;
	if (fadethem) jQuery('#csreaction'+botnum+'-'+ic).delay(options.image_delay).fadeOut(options.image_fade);
	var inputel = document.getElementById('csinput'+botnum);
	if (inputel) {inputel.value = ''; inputel.focus();} //focus the mouse in the form again

	////////////////// get the TTS ////////////////// 
	if (options.avatar && options.tts_voice && data.ttsvoice_mp3file && data.ttsvoice_txtfile) {
		var el = document.getElementById ('csavatarswf' + botnum);
		if (el.setSpeech) el.setSpeech (data.ttsvoice_mp3file, data.ttsvoice_txtfile); //need to set time out if still speaking
		if (el.realtimeLipsync) el.realtimeLipsync (data.ttsvoice_mp3file);
	}

	////////////////// add to history ////////////////// 
	if (fadethem && reactionsrc) fullreply = fullreply.replace (reactionsrc, ''); //remove reaction so only emotion is saved in history
	CSBOTS[botnum].history.push (fullreply); //push onto the history
	CSBOTS[botnum].csstate = data.cs; //remember the state for next time
	CSBOTS[botnum].waiting = 0; //no longer waiting
	if (options.callback_after && typeof (options.callback_after) == 'function') options.callback_after (data);
}

//Useful debugging function added 1/8/2013
function CleverscriptShowObject (prefix, obj, doalert) {
	var sep = doalert ? '\n' : '<br>'; var r = prefix ? (prefix + sep) : '';
	for (var p in obj) r += p + ': ' + obj[p] + sep;
	if (doalert) alert (r);
	else document.body.innerHTML += '<div style="background-color:pink">' + r + '</div>';
}

//For the call back for POSTed messages from 1/8/2013
function CleverscriptReceiveMessage (event) {
	if (!event || !event.origin || !event.data) return; //no event
	if (event.origin != 'http://api.cleverscript.com' && event.origin != 'http://testapi.cleverscript.com') return; //not from API
	//CleverscriptShowData ('event object', event, 1);
	eval (event.data); //eval the data which will call the callback function
}

/////////////////////////// Create swfobject /////////////////////////// 
function FillSwfObject() { //used for accessing the avatar SWF
/*	SWFObject v2.0 <http://code.google.com/p/swfobject/>
	Copyright (c) 2007 Geoff Stearns, Michael Williams, and Bobby van der Sluis
	This software is released under the MIT License <http://www.opensource.org/licenses/mit-license.php>
*/
if (!CSSWFOBJECT) CSSWFOBJECT = function(){var Z="undefined",P="object",B="Shockwave Flash",h="ShockwaveFlash.ShockwaveFlash",W="application/x-shockwave-flash",K="SWFObjectExprInst",G=window,g=document,N=navigator,f=[],H=[],Q=null,L=null,T=null,S=false,C=false;var a=function(){var l=typeof g.getElementById!=Z&&typeof g.getElementsByTagName!=Z&&typeof g.createElement!=Z&&typeof g.appendChild!=Z&&typeof g.replaceChild!=Z&&typeof g.removeChild!=Z&&typeof g.cloneNode!=Z,t=[0,0,0],n=null;if(typeof N.plugins!=Z&&typeof N.plugins[B]==P){n=N.plugins[B].description;if(n){n=n.replace(/^.*\s+(\S+\s+\S+$)/,"$1");t[0]=parseInt(n.replace(/^(.*)\..*$/,"$1"),10);t[1]=parseInt(n.replace(/^.*\.(.*)\s.*$/,"$1"),10);t[2]=/r/.test(n)?parseInt(n.replace(/^.*r(.*)$/,"$1"),10):0}}else{if(typeof G.ActiveXObject!=Z){var o=null,s=false;try{o=new ActiveXObject(h+".7")}catch(k){try{o=new ActiveXObject(h+".6");t=[6,0,21];o.AllowScriptAccess="always"}catch(k){if(t[0]==6){s=true}}if(!s){try{o=new ActiveXObject(h)}catch(k){}}}if(!s&&o){try{n=o.GetVariable("$version");if(n){n=n.split(" ")[1].split(",");t=[parseInt(n[0],10),parseInt(n[1],10),parseInt(n[2],10)]}}catch(k){}}}}var v=N.userAgent.toLowerCase(),j=N.platform.toLowerCase(),r=/webkit/.test(v)?parseFloat(v.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,i=false,q=j?/win/.test(j):/win/.test(v),m=j?/mac/.test(j):/mac/.test(v);/*@cc_on i=true;@if(@_win32)q=true;@elif(@_mac)m=true;@end@*/return{w3cdom:l,pv:t,webkit:r,ie:i,win:q,mac:m}}();var e=function(){if(!a.w3cdom){return }J(I);if(a.ie&&a.win){try{g.write("<script id=__ie_ondomload defer=true src=//:><\/script>");var i=c("__ie_ondomload");if(i){i.onreadystatechange=function(){if(this.readyState=="complete"){this.parentNode.removeChild(this);V()}}}}catch(j){}}if(a.webkit&&typeof g.readyState!=Z){Q=setInterval(function(){if(/loaded|complete/.test(g.readyState)){V()}},10)}if(typeof g.addEventListener!=Z){g.addEventListener("DOMContentLoaded",V,null)}M(V)}();function V(){if(S){return }if(a.ie&&a.win){var m=Y("span");try{var l=g.getElementsByTagName("body")[0].appendChild(m);l.parentNode.removeChild(l)}catch(n){return }}S=true;if(Q){clearInterval(Q);Q=null}var j=f.length;for(var k=0;k<j;k++){f[k]()}}function J(i){if(S){i()}else{f[f.length]=i}}function M(j){if(typeof G.addEventListener!=Z){G.addEventListener("load",j,false)}else{if(typeof g.addEventListener!=Z){g.addEventListener("load",j,false)}else{if(typeof G.attachEvent!=Z){G.attachEvent("onload",j)}else{if(typeof G.onload=="function"){var i=G.onload;G.onload=function(){i();j()}}else{G.onload=j}}}}}function I(){var l=H.length;for(var j=0;j<l;j++){var m=H[j].id;if(a.pv[0]>0){var k=c(m);if(k){H[j].width=k.getAttribute("width")?k.getAttribute("width"):"0";H[j].height=k.getAttribute("height")?k.getAttribute("height"):"0";if(O(H[j].swfVersion)){if(a.webkit&&a.webkit<312){U(k)}X(m,true)}else{if(H[j].expressInstall&&!C&&O("6.0.65")&&(a.win||a.mac)){D(H[j])}else{d(k)}}}}else{X(m,true)}}}function U(m){var k=m.getElementsByTagName(P)[0];if(k){var p=Y("embed"),r=k.attributes;if(r){var o=r.length;for(var n=0;n<o;n++){if(r[n].nodeName.toLowerCase()=="data"){p.setAttribute("src",r[n].nodeValue)}else{p.setAttribute(r[n].nodeName,r[n].nodeValue)}}}var q=k.childNodes;if(q){var s=q.length;for(var l=0;l<s;l++){if(q[l].nodeType==1&&q[l].nodeName.toLowerCase()=="param"){p.setAttribute(q[l].getAttribute("name"),q[l].getAttribute("value"))}}}m.parentNode.replaceChild(p,m)}}function F(i){if(a.ie&&a.win&&O("8.0.0")){G.attachEvent("onunload",function(){var k=c(i);if(k){for(var j in k){if(typeof k[j]=="function"){k[j]=function(){}}}k.parentNode.removeChild(k)}})}}function D(j){C=true;var o=c(j.id);if(o){if(j.altContentId){var l=c(j.altContentId);if(l){L=l;T=j.altContentId}}else{L=b(o)}if(!(/%$/.test(j.width))&&parseInt(j.width,10)<310){j.width="310"}if(!(/%$/.test(j.height))&&parseInt(j.height,10)<137){j.height="137"}g.title=g.title.slice(0,47)+" - Flash Player Installation";var n=a.ie&&a.win?"ActiveX":"PlugIn",k=g.title,m="MMredirectURL="+G.location+"&MMplayerType="+n+"&MMdoctitle="+k,p=j.id;if(a.ie&&a.win&&o.readyState!=4){var i=Y("div");p+="SWFObjectNew";i.setAttribute("id",p);o.parentNode.insertBefore(i,o);o.style.display="none";G.attachEvent("onload",function(){o.parentNode.removeChild(o)})}R({data:j.expressInstall,id:K,width:j.width,height:j.height},{flashvars:m},p)}}function d(j){if(a.ie&&a.win&&j.readyState!=4){var i=Y("div");j.parentNode.insertBefore(i,j);i.parentNode.replaceChild(b(j),i);j.style.display="none";G.attachEvent("onload",function(){j.parentNode.removeChild(j)})}else{j.parentNode.replaceChild(b(j),j)}}function b(n){var m=Y("div");if(a.win&&a.ie){m.innerHTML=n.innerHTML}else{var k=n.getElementsByTagName(P)[0];if(k){var o=k.childNodes;if(o){var j=o.length;for(var l=0;l<j;l++){if(!(o[l].nodeType==1&&o[l].nodeName.toLowerCase()=="param")&&!(o[l].nodeType==8)){m.appendChild(o[l].cloneNode(true))}}}}}return m}function R(AE,AC,q){var p,t=c(q);if(typeof AE.id==Z){AE.id=q}if(a.ie&&a.win){var AD="";for(var z in AE){if(AE[z]!=Object.prototype[z]){if(z=="data"){AC.movie=AE[z]}else{if(z.toLowerCase()=="styleclass"){AD+=' class="'+AE[z]+'"'}else{if(z!="classid"){AD+=" "+z+'="'+AE[z]+'"'}}}}}var AB="";for(var y in AC){if(AC[y]!=Object.prototype[y]){AB+='<param name="'+y+'" value="'+AC[y]+'" />'}}t.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+AD+">"+AB+"</object>";F(AE.id);p=c(AE.id)}else{if(a.webkit&&a.webkit<312){var AA=Y("embed");AA.setAttribute("type",W);for(var x in AE){if(AE[x]!=Object.prototype[x]){if(x=="data"){AA.setAttribute("src",AE[x])}else{if(x.toLowerCase()=="styleclass"){AA.setAttribute("class",AE[x])}else{if(x!="classid"){AA.setAttribute(x,AE[x])}}}}}for(var w in AC){if(AC[w]!=Object.prototype[w]){if(w!="movie"){AA.setAttribute(w,AC[w])}}}t.parentNode.replaceChild(AA,t);p=AA}else{var s=Y(P);s.setAttribute("type",W);for(var v in AE){if(AE[v]!=Object.prototype[v]){if(v.toLowerCase()=="styleclass"){s.setAttribute("class",AE[v])}else{if(v!="classid"){s.setAttribute(v,AE[v])}}}}for(var u in AC){if(AC[u]!=Object.prototype[u]&&u!="movie"){E(s,u,AC[u])}}t.parentNode.replaceChild(s,t);p=s}}return p}function E(k,i,j){var l=Y("param");l.setAttribute("name",i);l.setAttribute("value",j);k.appendChild(l)}function c(i){return g.getElementById(i)}function Y(i){return g.createElement(i)}function O(k){var j=a.pv,i=k.split(".");i[0]=parseInt(i[0],10);i[1]=parseInt(i[1],10);i[2]=parseInt(i[2],10);return(j[0]>i[0]||(j[0]==i[0]&&j[1]>i[1])||(j[0]==i[0]&&j[1]==i[1]&&j[2]>=i[2]))?true:false}function A(m,j){if(a.ie&&a.mac){return }var l=g.getElementsByTagName("head")[0],k=Y("style");k.setAttribute("type","text/css");k.setAttribute("media","screen");if(!(a.ie&&a.win)&&typeof g.createTextNode!=Z){k.appendChild(g.createTextNode(m+" {"+j+"}"))}l.appendChild(k);if(a.ie&&a.win&&typeof g.styleSheets!=Z&&g.styleSheets.length>0){var i=g.styleSheets[g.styleSheets.length-1];if(typeof i.addRule==P){i.addRule(m,j)}}}function X(k,i){var j=i?"visible":"hidden";if(S){c(k).style.visibility=j}else{A("#"+k,"visibility:"+j)}}return{registerObject:function(l,i,k){if(!a.w3cdom||!l||!i){return }var j={};j.id=l;j.swfVersion=i;j.expressInstall=k?k:false;H[H.length]=j;X(l,false)},getObjectById:function(l){var i=null;if(a.w3cdom&&S){var j=c(l);if(j){var k=j.getElementsByTagName(P)[0];if(!k||(k&&typeof j.SetVariable!=Z)){i=j}else{if(typeof k.SetVariable!=Z){i=k}}}}return i},embedSWF:function(n,u,r,t,j,m,k,p,s){if(!a.w3cdom||!n||!u||!r||!t||!j){return }r+="";t+="";if(O(j)){X(u,false);var q=(typeof s==P)?s:{};q.data=n;q.width=r;q.height=t;var o=(typeof p==P)?p:{};if(typeof k==P){for(var l in k){if(k[l]!=Object.prototype[l]){if(typeof o.flashvars!=Z){o.flashvars+="&"+l+"="+k[l]}else{o.flashvars=l+"="+k[l]}}}}J(function(){R(q,o,u);if(q.id==u){X(u,true)}})}else{if(m&&!C&&O("6.0.65")&&(a.win||a.mac)){X(u,false);J(function(){var i={};i.id=i.altContentId=u;i.width=r;i.height=t;i.expressInstall=m;D(i)})}}},getFlashPlayerVersion:function(){return{major:a.pv[0],minor:a.pv[1],release:a.pv[2]}},hasFlashPlayerVersion:O,createSWF:function(k,j,i){if(a.w3cdom&&S){return R(k,j,i)}else{return undefined}},createCSS:function(j,i){if(a.w3cdom){A(j,i)}},addDomLoadEvent:J,addLoadEvent:M,getQueryParamValue:function(m){var l=g.location.search||g.location.hash;if(m==null){return l}if(l){var k=l.substring(1).split("&");for(var j=0;j<k.length;j++){if(k[j].substring(0,k[j].indexOf("="))==m){return k[j].substring((k[j].indexOf("=")+1))}}}return""},expressInstallCallback:function(){if(C&&L){var i=c(K);if(i){i.parentNode.replaceChild(L,i);if(T){X(T,true);if(a.ie&&a.win){L.style.display="block"}}L=null;T=null;C=false}}}}}();
}

//From http://viget.com/extend/using-javascript-postmessage-to-talk-to-iframes for working with IE7 and IE8
if (typeof window.addEventListener != 'undefined') window.addEventListener ('message', CleverscriptReceiveMessage, false);
else if (typeof window.attachEvent != 'undefined') window.attachEvent('onmessage', CleverscriptReceiveMessage);


