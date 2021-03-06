const {BrowserWindow} = require('electron');
const ws = require("nodejs-websocket");

const html_root  = 'http://127.0.0.1:8088/';
var view_index = html_root + 'desktop/black.html';

var control = {
	mainWindow: '',		// webview 窗件

	//导航
	navigat: function( nav_json ){
		//创建窗口
		var create_win = function(){
			var childWin = new BrowserWindow({parent: control.mainWindow, modal: true, show: false,frame: false,transparent: true})
			childWin.once('ready-to-show',() => {childWin.show()})
			return childWin
		}

		var close_win = function(){
			if( !control.childWin.isDestroyed() ){
				control.childWin.close();
			}
			control.childWin = "";
		}

		try {
			if(typeof(nav_json)=='object'){
				// event ：'open' 弹出窗口
				var rx=/^https?:\/\//i;
				var url = nav_json.url;
				if(!rx.test(url)) url = html_root + url;
				url = url.replace(/\\/g, '/');

				if ( nav_json.event == 'open'){
					if( typeof(this.childWin) != 'object' ){
						this.childWin = create_win();
					}else if( this.childWin.isDestroyed() ){
						this.childWin = create_win();
					}

					if (nav_json.size){
						var w = nav_json.size.width;
						var h = nav_json.size.height
						this.childWin.setSize(w,h);
						this.childWin.center();
					}
					var currentURL = this.childWin.webContents.getURL();
					if (currentURL != url) this.childWin.loadURL(url)

					if (nav_json.timer){
						if( typeof(nav_json.timer)=='number' ){
							setTimeout(function(){close_win();}, nav_json.timer * 1000)
						}
					}
				}
				// event : 'self' 当前窗口
				if ( nav_json.event == 'self'){
					control.mainWindow.loadURL(url);
				}
				// event : 'index' 关闭弹出窗口
				if ( nav_json.event == 'index'){
					view_index = url
					control.mainWindow.loadURL(view_index);
				}
				// event : 'close' 关闭弹出窗口
				if (nav_json.event == 'close'){
					if (typeof(this.childWin) == 'object'){
						close_win()
					}else{
						control.mainWindow.loadURL( view_index );
					}
				}
			}
		}catch(err){
			console.log("[JS]:err:"+err);
		}
	},

	//内部通信服务端
	start_websocket: function(){
		console.log("[JS]:开始建立屏幕通讯连接...");
		var server = ws.createServer((conn)=>{
		    conn.on("text", (str) => {
			    //console.log(str);
			    var json_str = JSON.parse(str);		//字符串转json
		        if (json_str.type == 'nav'){			//如果是导航消息，直接在这里处理
			        control.navigat(json_str);
		    	}else{
			        control.mainWindow.webContents.send('public',json_str);
				}
		    })
		    conn.on("close", (code, reason) => {
		        console.log("[JS]:关闭连接")
		    });
		    conn.on("error", (code, reason) => {
		        console.log("[JS]:异常关闭")
		    });
		}).listen(8103);
		server.on("connection", (client_sock)=>{
			console.log("[JS]:有客户端接入")
		});
	},

	Init: function(mainWindow){
		this.mainWindow = mainWindow;

		//开启通讯服务
		this.start_websocket();

		this.mainWindow.loadURL(view_index);
	}
}

module.exports = control;