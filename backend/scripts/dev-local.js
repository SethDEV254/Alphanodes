require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  console.log(`In-memory MongoDB started at ${process.env.MONGO_URI}`);

  require('../server');

  process.on('SIGINT', async () => {
    await mongod.stop();
    process.exit(0);
  });
}

main();
