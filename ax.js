const redis = require('redis');
const {promisifyAll} = require('bluebird')
promisifyAll(redis);


const runApplication = async () => {
  // Connect to redis at 127.0.0.1 port 6379 no password.
  const client = redis.createClient({
    host: '127.0.0.1',
    port: 6379,
    password: '123456'
  });

  const fooValue = await client.getAsync('17601551626');
  console.log(fooValue);
};

runApplication();