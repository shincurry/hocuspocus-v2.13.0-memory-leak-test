const { Server } = require('@hocuspocus/server')
const { SQLite } = require('@hocuspocus/extension-sqlite')
const { Redis } = require('@hocuspocus/extension-redis')
const readline = require('readline');

async function bootstrap() {
  const server = Server.configure({
    port: 80,

    async onConnect() {
      console.log('🔮')
    },

    extensions: [
      new SQLite({
        database: 'data/db.sqlite',
      }),
      new Redis({
        host: "127.0.0.1",
        port: 6379,
      }),
    ],
  })

  await server.listen()

  const openDocument = async () => {
    const documentName = `doc-${Math.round(Math.random() * 100)}`
    const connection = await server.openDirectConnection(documentName)
    connection.transact((document) => {
      console.log("CONNECTION", document.name)
      //---- It seems that memory leak has nothing to do with document size, no need to modify or add large amount of data
      document.getMap('map').set('num', String(Math.random()))
    })
    await connection.disconnect()
  }
  const openDocuments = async () => {
    for (let i = 0; i < 10; i++) {
      const promises = []
      for (let j = 0; j < 10; j++) {
        promises.push(openDocument())
      }
      await Promise.all(promises)
    }
    console.log("DONE")
  }

  let enableLongTermTest = false
  //---- Long-term testing: keeping to open/close connection in long  for testing memory leak
  //---- press `L` to enable/disable
  setInterval(() => {
    if (enableLongTermTest) {
      openDocument()
    }
  }, 100)


  readline.emitKeypressEvents(process.stdin);

  if (process.stdin.setRawMode != null) {
    process.stdin.setRawMode(true);
  }

  process.stdin.on('keypress', async (str, key) => {
    //---- press 'G' to open multiple connections
    if (key.name === 'g') {
      openDocuments()
    }
    //---- press 'A' to open multiple connections
    if (key.name === 'a') {
      openDocument()
    }

    //---- press `L` to enable/disable long-term testing
    if (key.name === 'l') {
      enableLongTermTest = !enableLongTermTest
    }

    if (key.ctrl && key.name === 'c') {
      server.server.webSocketServer.close()
      for (const client of server.server.webSocketServer.clients) {
        console.log("client", client)
        client.close();
      }
      await server.destroy()
      console.log("server shutdown")
      process.exit(0);
    }
  })
}

bootstrap().catch(console.error)