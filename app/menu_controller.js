/* variable declarations */

var Util = require('./util.js')
var Menu = require('./menu_controller.js')
var Intro = require('./intro_controller.js')
var World = require('./world_controller.js')

// handle introduction
var handleInput = function(socket, player, input) {

  console.log("menu command: " + input)

  switch(input) {

    case "hilfe": 
      Util.write(socket, player, {name: "System"}, "Spielanleitung", "sender", "chapter")
      text = "Herzlich Willkommen bei Einsame Immobilien, dem Webspiel zur 54. Stadt. Hier erfährst du alles, um in das ultimative Dating-Netzwerk der Ruhrstadt einzusteigen. Los geht's mit ein paar Basics.<br>[erkläre spielwelt]"
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      break

    case "erkläre spielwelt":
      text = "Schau dich in Ruhe um und erforsche das Ruhrgebiet im Jahr 2044. Du kannst 53 verschiedene Städte besuchen, indem du auf die gelb unterlegten Kommandos klickst oder sie mit der Tastatur eingibst. Auf dem Weg wirst du verschiedene Verkehrsmittel nutzen und Abkürzungen entdecken. Am besten du machst dir eine Karte, um dich besser zurecht zu finden!<br>[erkläre immobilien]"
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      break
      
    case "erkläre immobilien":
      text = "Ziel des Spiels ist es, möglichst viele einsame Immobilien miteinander in Kontakt zu bringen. Sprich mit ihnen, um herauszufinden, was ihnen fehlt. Baue eine 54. Stadt der Liebe oder spinne Intrigen. Achtung: Die Komplimente, Witze, Anmachsprüche und Beleidigungen, die die Immobilien austauschen, stammen alle von anderen Spielern.<br>[erkläre chat]"
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      break
      
    case "erkläre chat":
      text = "Unterwegs triffst du manchmal auf andere Menschen, mit denen du frei chatten kannst. Sprich sie mit dem Kommando 'sage' an und verabschiede dich mit 'tschüss'. Viel Spaß!<br>[zurück zum spiel]"
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      break
              
    case "spielstand": 
      Util.write(socket, player, {name: "System"}, "Spielstand", "sender", "chapter")
      
      // name
      var info = "Du bist " + Util.capitaliseFirstLetter(player.name) + ". "
      
      // städte
      info += "Du hast bereits " + player.cities.length + " von 53 Städten besucht"      
      if(player.cities.length > 0) {
        info += ": "
      }      
      for(var index = 0; index < player.cities.length; index++) {
          info += Util.capitaliseFirstLetter(player.cities[index])
          if(index < player.cities.length - 2) {
            info += ", "
          } 
          if(index == player.cities.length - 2) {
            info += " und "
          }
      }
      info += ".<br>"
            
      // quests
      player.quests.forEach(function(quest) {
        //{questGiver: questGiver, fromBot: fromBot, toBot: toBot, message: message, status: 'active'}
        if(quest.status == 'active') {
          info += Util.capitaliseFirstLetter(quest.questGiver) + " hat dich gefragt, ob du an " + Util.capitaliseFirstLetter(quest.toBot) + " folgende Nachricht überbringen kannst: '" + quest.message.text + "'.<br>"
        }
      })

      info += "[zurück zum spiel]"
      
      Util.write(socket, player, {name: "System"}, Util.linkify(info), "sender")
      
      break

    case "credits":
      Util.write(socket, player, {name: "System"}, "Credits", "sender", "chapter")
      
      text = "Ein Spiel von Invisible Playground, frei nach dem Roman 'Anarchie in Ruhrstadt' von Jörg Albrecht. Game-Design: Sebastian Quack, Holger Heissmeyer, Daniel Boy, Christiane Hütter. Recherchen: Christina Prfötschner. Programmierung: Sebastian Quack und Holger Heissmeyer. Grafik: V2A.net. Teil des Gesamtprojekts '54. Stadt' von Ringlokschuppen Ruhr, Theater Oberhausen und Urbane Künste Ruhr. [zurück zum spiel]"
      
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      
      break
            
    case "agbs":
      Util.write(socket, player, {name: "System"}, "Nutzungsbedingungen", "sender", "chapter")
      
      text = "Das Spiel verwendet Cookies, um Nutzer wiederzuerkennen. Zur Verfolgung von Mißbrauch werden die IP-Adressen der Nutzer gespeichert. Dialog-Elemente der Immobilien werden durch Nutzer eingegeben. Bitte geben Sie keine sensiblen Daten in das Spiel ein. Hinweise auf problematische Inhalte an tobias.fritzsche@ringlokschuppen.de [zurück zum spiel]"
      
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      
      break

    case "theater-tour":
      Util.write(socket, player, {name: "System"}, "Die Theatertour", "sender", "chapter")
      
      text = "Einsame Immobilien ist nur ein kleiner Vorgeschmack auf 54. Stadt, die spektakuläre Theater-Tour mit kainkollektiv, Ligna, Invisible Playground und Copy & Waster, vom 12.-14. 2014 September in Mülheim und Oberhausen. Infos und Karten unter ringlokschuppen.ruhr<br/> [zurück zum spiel]"
      
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      
      break



    case "zurück zum spiel":
      player.inMenu = false
      player.save()
      
      if(player.state == "world") {
        World.handleInput(socket, player, null)
      } else {
        Intro.handleInput(socket, player, null)
      }
      break

    default:
      Util.write(socket, player, {name: "System"}, "Befehl nicht erkannt.", "sender")
  }
  
}

/* expose functionality */
module.exports.handleInput = handleInput
