const crypto = require('crypto');
const axios = require('axios');
const moment = require('moment');
const redis = require('redis');
const {promisifyAll} = require('bluebird');
promisifyAll(redis);

const client = redis.createClient({
  'host': '',
  'port': 0,
  'password': ''
});

const publicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDc+CZK9bBA9IU+gZUOc6
FUGu7yO9WpTNB0PzmgFBh96Mg1WrovD1oqZ+eIF4LjvxKXGOdI79JRdve9
NPhQo07+uqGQgE4imwNnRx7PFtCRryiIEcUoavuNtuRVoBAm6qdB0Srctg
aqGfLgKvZHOnwTjyNqjBUxzMeQlEC2czEMSwIDAQAB
-----END PUBLIC KEY-----`.toString('ascii');

// 创建加密算法
let encode = function (data) {
  return crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }, Buffer.from(data + '')).toString('base64');
};

let obj2str = function (obj) {
  /**
   * @param {obj}  需要转换的对象
   * @return {string} 返回key1=val1,key2=val2....格式
   */
  let w = Object.entries(obj);
  w.forEach((v, i) => {
    w[i] = v.join('=')
  });
  return w.join('&');
}

let [mobile, password] = ['手机号', '服务密码'];
let [mobile_crypto, password_crypto] = [encodeURIComponent(encode(mobile)), encodeURIComponent(encode(password))];
let myCookie = '';
let headers = {
  'Host': 'act.10010.com',
  'accept': 'application/json, text/plain, */*',
  'content-type': 'application/x-www-form-urlencoded',
  'origin': 'https://img.client.10010.com',
  'accept-language': 'zh-cn',
  'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 unicom{version:iphone_c@8.0200}{systemVersion:dis}{yw_code:}',
}

async function login() {
  let dataString = `reqtime=${moment().format("YYYY-MM-DD HH:mm:ss")}&simCount=1&version=iphone_c@8.0200&mobile=${mobile_crypto}=wifi&isRemberPwd=false&appId=bcbf9239dffadd5449045269ab5346e8952c3aa5448fbc909b820cc7a941955ee47ad23e681715401940e0796e70cad7bc7f8e31f65df46dbea26a56a59077e3e84f38a0c5fcc9791d59e0f95a68fda2b163d09c8bc0cdfa60ea5b692542697e&deviceId=fdcfca1e376fed06710036b25df32de1aa2c0a2638a5d9c87c885e641c46756f&pip=192.168.1.115&password=${(password_crypto)}&deviceOS=12.4.1&deviceBrand=iphone&deviceModel=iPhone&remark4=&keyVersion=2&deviceCode=16639897-E139-44E1-A0A0-58BECD6F6DA6`;
  let res = await axios.post('https://m.client.10010.com/mobileService/login.htm', dataString, {
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 unicom{version:iphone_c@8.0200}{systemVersion:dis}{yw_code:}',
      "referer": "https://m.client.10010.com",
      "origin": "https://m.client.10010.com"
    },
  });
  let cookies = res.headers['set-cookie'];
  let myCookie = '';
  cookies.forEach(cookie => {
    if (cookie.indexOf('ecs_acc') > -1)
      myCookie += cookie.split(';')[0] + ';';
    if (cookie.indexOf('ecs_token') > -1)
      myCookie += cookie.split(';')[0] + ';';
  });
  console.log('cookie:', myCookie);
  await client.setAsync(mobile, myCookie);
  return myCookie;
}

async function sign() {
  headers['referer'] = 'https://img.client.10010.com/SigininApp/index.html';
  let {data} = await axios.post('https://act.10010.com/SigninApp/signin/daySign', '', {
    headers: {
      ...headers,
      cookie: myCookie
    }
  });
  console.log('签到：', JSON.stringify(data));
}

async function checkCookie() {
  let {data} = await axios.post('https://m.client.10010.com/mobileservicequery/operationservice/queryOcsPackageFlowLeftContent',
    {
      mobile: mobile
    }, {
      headers: {
        'Host': 'm.client.10010.com',
        'origin': 'https://img.client.10010.com',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 unicom{version:iphone_c@8.0200}{systemVersion:dis}{yw_code:}',
        'referer': `https://img.client.10010.com/yuliangchaxun/index.html?version=iphone_c@8.0200&desmobile=${mobile}&yw_code=&time=${new Date().getTime()}`,
        'Cookie': myCookie
      },
    });
  if (data === 999999) {
    console.log('cookie缓存失效');
    myCookie = await login();
    data = checkCookie();
  }
  return data;
}

// 套餐余量
async function query(data) {
  let resources = data['resources'];
  let index = 1;
  resources.forEach(resource => {
    resource.details.forEach(detail => {
      if (detail['addUpItemName']) {
        let addUpItemName = detail['addUpItemName'];  // 名称
        let use = detail['use'];  // 已使用
        let remain = detail['remain'];  // 剩余
        let usedPercent = detail['usedPercent'] + '%';  // 已用百分比
        console.log(index, addUpItemName, use, remain, usedPercent);
        index++; // 序号
      }
    })
  })
}

async function video() {
  let {data} = await axios.post('https://act.10010.com/SigninApp/doTask/finishVideo', '', {
    headers: {
      ...headers,
      cookie: myCookie
    },
  })
  console.log('看视频', data)
}

async function get1GB() {
  headers['referer'] = 'https://img.client.10010.com/SigininApp/index.html';
  let {data} = await axios.post('https://act.10010.com/SigninApp/doTask/getPrize', {}, {
    headers: {...headers, cookie: myCookie},
  })
  console.log('领取1GB：', JSON.stringify(data));
}

async function active() {
  // 获取流量包页面html
  let activeHeaders = {
    'Host': 'm.client.10010.com',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-cn',
    'Origin': 'http://m.client.10010.com',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 unicom{version:iphone_c@8.0102}{systemVersion:dis}{yw_code:}',
    'Upgrade-Insecure-Requests': '1',
    'Referer': 'http://m.client.10010.com/myPrizeForActivity/querywinninglist.htm',
    'cookie': myCookie
  }
  let body = obj2str({
    'typeScreenCondition': '2',
    'category': 'FFLOWPACKET',
    'pageSign': '1',
    'CALLBACKURL': 'https://m.client.10010.com/myPrizeForActivity/querywinninglist.htm'
  })
  let bag = await axios.post('http://m.client.10010.com/myPrizeForActivity/mygiftbag.htm', body, {
    headers: activeHeaders
  }).then(res => {
    return res.data
  })
  // console.log(data);  // html
  // 流量包ID
  bag = bag.match(/onclick="toDetailPage\((.*)\);"/)[1].replace(/'/g, "").split(',');
  // console.log(bag);
  // 激活流量包
  activeHeaders['Referer'] = 'http://m.client.10010.com/myPrizeForActivity/queryPrizeDetails.htm';
  body = `activeCode=${bag[0]}&prizeRecordID=${bag[1]}&activeName=%E5%81%9A%E4%BB%BB%E5%8A%A1%E9%A2%86%E5%A5%96%E5%93%81`;
  let {data} = await axios.post('https://m.client.10010.com/myPrizeForActivity/myPrize/activationFlowPackages.htm', body, {headers: activeHeaders});
  console.log('激活流量包：', data)

}

!(async () => {
  myCookie = await client.getAsync(mobile);
  if (!myCookie) {
    myCookie = await login();
    console.log('新建cookie：', myCookie)
  } else {
    console.log('读取到cookie缓存');
  }

  let data = await checkCookie();
  await query(data);  // 查询套餐余量
  // await sign();  // 签到
  // await video();  // 看视频任务
  // await get1GB();  // 完成签到和看视频后，领取1GB
  // await active();  // 领取后，激活1GB

  await client.quit();
})();
