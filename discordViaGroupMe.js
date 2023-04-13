const express = require('express')
var request = require('request')
const fs = require('fs')
const app = express()
const port = 8087
app.use(express.json());
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
require('dotenv').config();

const groupMeBotID = process.env.GROUPME_BOT_ID
const groupMeImageProcessor = process.env.GROUPME_IMAGE_PRO
const discordChannelID = process.env.DISCORD_BOT_ID


app.post('/groupme', (req, res) => {
    //when a post to the group me URL us received we send it to the data digest function.
    //for clarification this is coming from groupMe and going to discord
    digestData(req.body);
    res.end('Response End...')
  })
app.get('/', (req, res) => {
  res.send('Wrong URL')
})

app.get('/groupme', (req, res) => {
    console.log('Get Connected')
  })

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

//based on the message type we then decide what to do with the message 
//this is used to send info to groupMe. 
client.on('messageCreate', async (message) => {
    if(!message.author.bot){ 
      if(message.content != ''){
        postToGroupMe(`${boldSansASCII(message.author.username)} said: ${message.content}`);
      }
      if(message.attachments){
        for(let element of message.attachments){
          console.log(element[1].name.split('.')[0])
          timeUpload = Date.now()

          if(element[1].name.split('.')[1] != 'webp'){
            downloadImage(element[1], timeUpload, message.author.username)
          }else{
            client.channels.cache.get(discordChannelID).send(`**Don't use webp you loser**`)
          }
        }
      }   
    }
})

client.on('ready', () => {
    console.log('Discord Ready');
})

client.login(process.env.DISCORD_BOT_ID);

//based on the message type we then decide what to do with the message 
//this is used to send info to discord. 
function digestData(body){
    if(body.sender_type == 'bot'){
        //to stop repeat messages
        console.log('bot');
    }else{
        if(body.attachments.length){
            body.attachments.forEach(element => {
                if(element.type == 'image'){
                    client.channels.cache.get(discordChannelID).send(`**${body.name}** sent:`)
                    client.channels.cache.get(discordChannelID).send(`${element.url}`)
                }
            });
        }
        if(body.text){
            client.channels.cache.get(discordChannelID).send(`**${body.name}** said: ${body.text}`)
        }
    }
}

//posts messages only to group me via bot
function postToGroupMe(message) {
    const botId = groupMeBotID;
    const url = 'https://api.groupme.com/v3/bots/post';
    const data = { text: message, bot_id: botId };
  
    request.post({
      url: url,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    }, function(error, response, body) {
      if (error) {
        console.error(error);
      } else {
        console.log(body);
      }
    });
}

//downloads an image from discord when posted by a user and assigns it a unique name. 
function downloadImage(imageData, timeUpload, author) {
  discordImageName = `${imageData.name.split('.')[0]}-${timeUpload}.${imageData.name.split('.')[1]}`
  // Create a write stream to the destination file
  const destStream = fs.createWriteStream('./images/' + discordImageName);

    request(imageData.url).pipe(destStream)
    .on('close', () => {
      console.log(`Downloaded ${imageData.url} and saved it as ${imageData.name.split('.')[0]}-${timeUpload}.${imageData.name.split('.')[1]}`);
      postImageToGroupMeProcessor(`./images/${imageData.name.split('.')[0]}-${timeUpload}.${imageData.name.split('.')[1]}`, author)
    });
}

//Uploads an image file to groupme's custom image processor that returns a link that the bot can send to the group
function postImageToGroupMeProcessor(location, author) { 
  const options = {
    url: 'https://image.groupme.com/pictures',
    headers: {
      'X-Access-Token': groupMeImageProcessor,
      'Content-Type': 'image/jpeg'
    },
    body: fs.readFileSync(location)
  };

  request.post(options, (error, response, body) => {
    if (error) {
      console.error(error);
    } else {
      console.log(JSON.parse(body).payload.url);
      postImageToGroupMe(JSON.parse(body).payload.url, author);
      removeFile(location)
    }
  });
}

//sends picture url with message and author to group via bot
function postImageToGroupMe(message, author) {
  const botId = groupMeBotID;
  const url = 'https://api.groupme.com/v3/bots/post';
  const data = {
    "bot_id"  : botId,
    "text"    : `${author} Sent: `,
    "attachments" : [
      {
        "type"  : "image",
        "url"   : message
      }
    ]
  };

  request.post({
    url: url,
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json'
    }
  }, function(error, response, body) {
    if (error) {
      console.error(error);
    } else {
      console.log(body);
    }
  });
}

//removes image file for use after postImageToGroupMeProcessor() is complete 
function removeFile(location){
  fs.unlink(location, (err) => {
    if (err) {
      console.error(err);
      return;
    }
  });
}
