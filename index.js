const fs = require('fs');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');

// Fungsi untuk menyalin folder dari source ke destination secara rekursif
function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(file => {
    const srcPath = path.join(from, file);
    const destPath = path.join(to, file);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

async function startBot() {
  // Tentukan folder session utama dan session backup
  const sessionPath = './session'; // session utama
  const backupPath = './session_backup'; // session backup

  // Cek apakah session utama ada; jika tidak, salin dari backup
  if (!fs.existsSync(sessionPath)) {
    console.log('Session utama tidak ditemukan. Menyalin session backup ke session utama...');
    if (fs.existsSync(backupPath)) {
      copyFolderSync(backupPath, sessionPath);
      console.log('Session backup berhasil disalin ke session utama.');
    } else {
      console.log('Session backup juga tidak ditemukan, lakukan autentikasi ulang.');
    }
  }

  // Muat auth state dari session utama
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const client = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  client.ev.on('creds.update', saveCreds);

  client.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const reason = (lastDisconnect.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode
        : undefined;
      console.error('Koneksi terputus, alasan:', reason);

      if (reason === DisconnectReason.connectionClosed) {
        // Salin session backup ke session utama
        console.log('Koneksi tertutup. Menyalin session backup ke session utama...');
        if (fs.existsSync(backupPath)) {
          copyFolderSync(backupPath, sessionPath);
          console.log('Penyalinan selesai. Mencoba restart bot...');
        } else {
          console.error('Session backup tidak ditemukan. Tidak bisa menyalin.');
        }
        // Restart bot
        setTimeout(() => {
          startBot().catch(err => console.error('Gagal restart bot:', err));
        }, 3000);
      }
    }
  });

  return client;
}

startBot().catch(err => console.error('Error saat memulai bot:', err));









/*
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys')
const { Boom } = require('@hapi/boom')

async function startBot() {
   // Coba muat session utama; jika gagal, muat session backup
   let sessionPath = './session'; // Folder session utama
   let backupPath = './session_backup'; // Folder session backup

   let authState;
   try {
      // Mencoba menggunakan session utama
      const result = await useMultiFileAuthState(sessionPath)
      authState = result.state
      console.log('Session utama berhasil dimuat.');
   } catch (err) {
      console.error('Gagal memuat session utama, mencoba session backup:', err)
      const result = await useMultiFileAuthState(backupPath)
      authState = result.state
      console.log('Session backup berhasil dimuat.');
   }

   const client = makeWASocket({
      auth: authState,
      printQRInTerminal: true,
   })

   client.ev.on('creds.update', async () => {
      // Simpan kredensial secara otomatis (pastikan disimpan ke session utama)
      // Kamu bisa menyimpan ke folder session utama atau backup sesuai logika kamu.
      console.log('Kredensial diperbarui');
   })

   client.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update
      if(connection === 'close'){
         const reason = (lastDisconnect.error instanceof Boom) 
            ? lastDisconnect.error.output.statusCode 
            : undefined
         console.error('Koneksi terputus, reason:', reason)
         if(reason === DisconnectReason.connectionClosed) {
            // Misalnya, lakukan restart bot atau load session backup lagi
            console.log('Koneksi tertutup, mencoba memuat session backup...');
            // Di sini, kamu bisa memanggil kembali fungsi startBot() atau melakukan reload session secara spesifik
            startBot().catch(err => console.error('Gagal restart bot:', err))
         }
      }
   })

   return client
}

startBot().catch(err => console.error('Error saat memulai bot:', err))*/









const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

const app = express();

// Konfigurasi session menggunakan session-file-store
app.use(session({
  store: new FileStore({
    path: './session_backup', // Folder tempat session disimpan
    logFn: function() {}      // Nonaktifkan logging jika perlu
  }),
  secret: 'your-secret-key',   // Ganti dengan secret yang lebih kompleks
  resave: false,               // Tidak menyimpan session jika tidak ada perubahan
  saveUninitialized: false,    // Hanya menyimpan session ketika ada data
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // Masa berlaku cookie: 1 hari
  }
}));

// Contoh route
app.get('/', (req, res) => {
  if (!req.session.views) {
    req.session.views = 1;
  } else {
    req.session.views++;
  }
  res.send(`Jumlah views: ${req.session.views}`);
});

app.listen(3000, () => console.log('Server berjalan di port 3000'));









require('dotenv').config(), require('rootpath')(), console.clear()
const { spawn: spawn } = require('child_process'),/* path = require('path'),*/ CFonts = require('cfonts'), chalk = require('chalk')

const unhandledRejections = new Map()
process.on('uncaughtException', (err) => {
   if (err.code === 'ENOMEM') {
      console.error('Out of memory error detected. Cleaning up resources...');
      // Lakukan tindakan pemulihan seperti membersihkan cache atau log
   } else {
      console.error('Uncaught Exception:', err)
   }
})

process.on('unhandledRejection', (reason, promise) => {
   unhandledRejections.set(promise, reason)
   if (reason.code === 'ENOMEM') {
      console.error('Out of memory error detected. Attempting recovery...');
      Object.keys(require.cache).forEach((key) => {
         delete require.cache[key]
      })
   } else {
      console.log('Unhandled Rejection at:', promise, 'reason:', reason)
   }
})

process.on('rejectionHandled', (promise) => {
   unhandledRejections.delete(promise)
})

process.on('Something went wrong', function (err) {
   console.log('Caught exception: ', err)
})

process.on('warning', (warning) => {
   if (warning.name === 'MaxListenersExceededWarning') {
      console.warn('Potential memory leak detected:', warning.message)
   }
})

function start() {
   let args = [path.join(__dirname, 'client.js'), ...process.argv.slice(2)]
   let p = spawn(process.argv[0], args, { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] })
      .on('message', data => {
         if (data == 'reset') {
            console.log('Restarting...')
            p.kill()
            delete p
         }
      })
      .on('exit', code => {
         console.error('Exited with code:', code)
         start()
      })
}

const major = parseInt(process.versions.node.split('.')[0], 10)
if (major < 20) {
   console.error(
      `\n❌ This script requires Node.js 20+ to run reliably.\n` +
      `   You are using Node.js ${process.versions.node}.\n` +
      `   Please upgrade to Node.js 20+ to proceed.\n`
   );
   process.exit(1)
}

CFonts.say('NEOXR BOT', {
   font: 'tiny',
   align: 'center',
   colors: ['system']
}), CFonts.say('Github : https://github.com/neoxr/neoxr-bot', {
   colors: ['system'],
   font: 'console',
   align: 'center'
}), start()