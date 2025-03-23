"use strict";
// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
require('events').EventEmitter.defaultMaxListeners = 500
const { Component } = require('@neoxr/wb')
const { Baileys, Function: Func, Config: env } = new Component
require('./lib/system/functions'), require('./lib/system/scraper'), require('./lib/system/config')
const fs = require('fs')
const colors = require('@colors/colors')
const { NodeCache } = require('@cacheable/node-cache')
const cache = new NodeCache({
   stdTTL: env.cooldown
})

const connect = async () => {
   try {
      // Documentation : https://github.com/neoxr/session
      const session = (process?.env?.DATABASE_URL && /mongo/.test(process.env.DATABASE_URL))
         ? require('@session/mongo').useMongoAuthState
         : (process?.env?.DATABASE_URL && /postgres/.test(process.env.DATABASE_URL))
            ? require('@session/postgres').usePostgresAuthState
            : null


      // Documentation : https://github.com/neoxr/database
      const database = await ((process?.env?.DATABASE_URL && /mongo/.test(process.env.DATABASE_URL))
         ? require('@database/mongo').createDatabase(process.env.DATABASE_URL, env.database, 'database')
         : (process?.env?.DATABASE_URL && /postgres/.test(process.env.DATABASE_URL))
            ? require('@database/postgres').createDatabase(process.env.DATABASE_URL, env.database)
            : require('@database/local').createDatabase(env.database))

      const client = new Baileys({
         type: '--neoxr-v1',
         plugsdir: 'plugins',
         session: session ? session(process.env.DATABASE_URL, 'session') : 'session',
         online: true,
         bypass_disappearing: true,
         version: [2, 3000, 1020608496] // To see the latest version : https://wppconnect.io/whatsapp-versions/
      })

      /* starting to connect */
      client.once('connect', async res => {
         /* load database */
         global.db = { users: [], chats: [], groups: [], statistic: {}, sticker: {}, setting: {}, ...(await database.fetch() || {}) }
         /* save database */
         await database.save(global.db)
         /* write connection log */
         if (res && typeof res === 'object' && res.message) Func.logFile(res.message)
      })

      /* print error */
      client.once('error', async error => {
         console.log(colors.red(error.message))
         if (error && typeof error === 'object' && error.message) Func.logFile(error.message)
      })

      /* bot is connected */
      client.once('ready', async () => {
         /* auto restart if ram usage is over */
         const ramCheck = setInterval(() => {
            var ramUsage = process.memoryUsage().rss
            if (ramUsage >= require('bytes')(env.ram_limit)) {
               clearInterval(ramCheck)
               process.send('reset')
            }
         }, 60 * 1000) // check ram usage every 1 min

         /* create temp directory if doesn't exists */
         if (!fs.existsSync('./temp')) fs.mkdirSync('./temp')

         /* clear temp folder every 10 minutes */
         setInterval(async () => {
            try {
               const tmpFiles = fs.readdirSync('./temp')
               if (tmpFiles.length > 0) {
                  tmpFiles.filter(v => !v.endsWith('.file')).map(v => fs.unlinkSync('./temp/' + v))
               }
            } catch { }
         }, 60 * 1000 * 10) // clear ./temp folder every 10 mins

         /* save database every 5 mins */
         setInterval(async () => {
            if (global.db) await database.save(global.db)
         }, 60 * 1000 * 5)
      })

      /* print all message object */
      client.register('message', ctx => {
         require('./handler')(client.sock, { ...ctx, database })
         require('./lib/system/baileys')(client.sock)
      })

      /* print deleted message object 
      client.register('message.delete', ctx => {
         const sock = client.sock
         if (!ctx || ctx.origin.fromMe || ctx.origin.isBot || !ctx.origin.sender) return
         if (cache.has(ctx.origin.sender) && cache.get(ctx.origin.sender) === 1) return
         cache.set(ctx.origin.sender, 1)
         if (Object.keys(ctx.delete.message) < 1) return
         if (ctx.origin.isGroup && global.db.groups.some(v => v.jid == ctx.origin.chat) && global.db.groups.find(v => v.jid == ctx.origin.chat).antidelete) return sock.copyNForward(ctx.origin.chat, ctx.delete)
      })*/


       /* PRINT DELETED OBJECT
       client.on('message.delete', async ctx => {
         const sock = client.sock;
         const ownerNumber = env.owner + '@s.whatsapp.net';
         if (!ctx || ctx.origin.fromMe || ctx.origin.isBot || !ctx.origin.sender) return;
         if (cache.has(ctx.origin.sender) && cache.get(ctx.origin.sender) === 1) return;
         cache.set(ctx.origin.sender, 1);
      
         // Pastikan objek ctx.delete dan message-nya ada
         if (!ctx.delete || !ctx.delete.message) {
            console.error('Objek pesan yang dihapus tidak lengkap');
            return;
         }
      
         // Jika contextInfo tidak ada, tambahkan objek kosong agar tidak error
         if (!ctx.delete.message.contextInfo) {
            ctx.delete.message.contextInfo = {};
         }
      
         try {
            // Forward pesan yang telah dihapus ke nomor owner
            await sock.copyNForward(ownerNumber, ctx.delete, true);
            // Jika ingin forward juga ke grup asal, hapus komentar di bawah ini:
            // await sock.copyNForward(ctx.origin.chat, ctx.delete);
         } catch (error) {
            console.error("Error saat forwarding pesan:", error);
         }
      });*/
      
         /*DELETE*/
         client.on('message.delete', async ctx => {
            try {
               const sock = client.sock;
               const ownerNumber = env.owner + '@s.whatsapp.net';
               
               // Pastikan objek pesan yang dihapus ada dan memiliki struktur yang tepat
               if (!ctx || !ctx.delete || !ctx.delete.message) {
                  console.error("Pesan yang dihapus tidak lengkap.");
                  return;
               }
               
               // Iterasi setiap properti dari objek pesan dan pastikan contextInfo ada
               for (let key in ctx.delete.message) {
                  if (ctx.delete.message[key] && typeof ctx.delete.message[key] === 'object') {
                     if (!ctx.delete.message[key].contextInfo) {
                        ctx.delete.message[key].contextInfo = {};
                     }
                  }
               }
               
               // Lanjutkan proses forwarding ke owner
               await sock.copyNForward(ownerNumber, ctx.delete, true);
            } catch (error) {
               console.error("Error saat forwarding pesan:", error);
            }
         });
         
      

   

   } catch (e) {
      throw new Error(e)
   }
}

connect().catch(() => connect())