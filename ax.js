let body = {
    'typeScreenCondition': '2',
    'category': 'FFLOWPACKET',
    'pageSign': '1',
    'CALLBACKURL': 'https://m.client.10010.com/myPrizeForActivity/querywinninglist.htm'
  }


function obj2str(obj){
	/**
	 * @param {obj}  需要转换的对象
	 * @return {string} 返回key1=val1,key2=val2....格式
	 */
	let w = Object.entries(obj);
	w.forEach((v,i)=>{w[i]=v.join('=')});
	return w.join('&');
}

console.log(obj2str(body))