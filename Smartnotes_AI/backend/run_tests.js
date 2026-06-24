const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');

(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log(`Memory MongoDB started at: ${uri}`);
  
  const server = spawn('node', ['index.js'], {
    env: { ...process.env, MONGO_URI: uri, PORT: 5001 },
    stdio: 'inherit'
  });
  
  setTimeout(() => {
    const test = spawn('node', ['test_pipeline.js'], {
      env: { ...process.env, BASE_URL: 'http://localhost:5001/api' },
      stdio: 'inherit'
    });
    
    test.on('close', async (code) => {
      console.log(`Test finished with code ${code}`);
      server.kill();
      await mongod.stop();
      process.exit(code);
    });
  }, 4000);
})();
