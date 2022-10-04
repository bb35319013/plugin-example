const html = `
<style>
  body { margin: 0; }
  .extendedh { width: 100%; }
  .extendedv { height: 100%; }
  #wrapper {
    border: 2px solid blue;  //罫線
    border-radius: 5px;  //境界線半径
    background-color: rgba(111, 111, 111, 0.5);  //背景色
    box-sizing: border-box;  //ボックスサイズ
  }
  .extendedh body, .extendedh #wrapper { width: 100%; }
  .extendedv body, .extendedv #wrapper { height: 100%; }
  ::-webkit-scrollbar { width: 8px; background: gray; }
  ::-webkit-scrollbar-thumb { border-radius: 4px; background: red; }
</style>
<div id="wrapper">   //箱の中身
  <h1>The Incredible ISS</h1>
  <p>Latitude: <span id="lat">-</span></p>  //緯度
  <p>Longitude: <span id="lon">-</span></p>  //経度
  <p>Altitude: <span id="alt">-</span>km</p>  //高度
  <p>
    <button id="update">Update</button>
    <button id="jump">Jump</button>
    <button id="follow">Follow</button>
    <button id="resize">Resize</button>
  </p>
</div>  //箱の中身終わり
<script>
  let lat, lng, alt;  //変数定義

  const update = () => {  //updateという関数定義(値書き換え禁止)
    return fetch("https://api.wheretheiss.at/v1/satellites/25544").then(r => r.json()).then(data => {  //非同期通信でサーバー上にあるほしいデータを取ってくる。成功したらr=responseにr.json()を代入、dataに以下を代入
      lat = data.latitude;  //latに緯度のデータを代入
      lng = data.longitude;  //lngに経度のデータを代入
      alt = data.altitude * 1000; // km -> m  //altに単位をkmからmに直して高度のデータを代入
      document.getElementById("lat").textContent = data.latitude;  //latタグのノードに含まれるテキストを緯度のデータに変換
      document.getElementById("lon").textContent = data.longitude;  //lonタグのノードに含まれるテキストを経度のデータに変換
      document.getElementById("alt").textContent = data.altitude;  //altタグのノードに含まれるテキストを高度のデータに変換
    });
  };

  const send = () => {  //sendという関数定義(値書き換え禁止)
    parent.postMessage({ type: "fly", lat, lng, alt }, "*");  //iframeの内側から外側(webassembly?)へ送信?
  };

  // document.getElementById("update").addEventListener("click", update);  //updateボタンをクリックされたらupdate関数の処理を実行
  document.getElementById("jump").addEventListener("click", send);  //jumpボタンをクリックされたらsend関数の処理を実行

  const updateExtended = e => {  //updateExtendedというeという引数を持つ関数を定義(値書き換え禁止)
    if (e && e.horizontally) {  //もしeとe.horazontallyが真なら以下を実行
      document.documentElement.classList.add("extendedh");  //ドキュメントのルート要素にextendedhにクラスを追加する
    } else {  //違うなら以下を実行
      document.documentElement.classList.remove("extendedh");  //ドキュメントのルート要素からextendedhクラスを削除する
    }
    if (e && e.vertically) {  //もしeとe.verticallyが真なら以下を実行
      document.documentElement.classList.add("extendedv");  //ドキュメントのルート要素にextendedvクラスを追加する
    } else {  //違うなら以下を実行
      document.documentElement.classList.remove("extendedv");  //ドキュメントのルート要素からextendedhクラスを削除する
    }
  };

  addEventListener("message", e => {  //postmessageからのデータを受けっとったら、以下を実行
    if (e.source !== parent || !e.data.extended) return;  //e.sourceとparentが同じ型で値が等しくないか方が異なる、もしくは、e.data.extendedが真ではないなら？以下を実行
    updateExtended(e.data.extended);  //e.data.extendedを引数としてuppdateExtended関数を実行
  });

  updateExtended(${JSON.stringify(reearth.widget.extended || null)});  //<-ここわからん
  update();  //update関数の実行

  let timer;  //変数の定義
  document.getElementById("follow").addEventListener("click", (e) => {  //followボタンをクリックされたら以下を実行
    if (timer) {  //もしtimerが真なら以下を実行
      clearTimeout(timer);  //setTimeoutによるTimer処理を終了させる
      timer = undefined;  //timerにundefinedを代入
      e.currentTarget.textContent = "Follow";  //クリックした要素を含むノード内のテキストをFollowに書き換える
      return;
    }
    const cb = () => update().then(() => {  //<-ここの関数わからん
      send();
      if (timer) timer = setTimeout(cb, 3000);
    });
    timer = 1;
    cb();
    e.currentTarget.textContent = "Unfollow";
  });

  let folded = true;  //変数を定義し、trueを代入
  document.getElementById("resize").addEventListener("click", (e) => {  //resizeのボタンをクリックしたら以下を実行
    folded = !folded;  //foldedにfoldedの否定を代入
    parent.postMessage({ type: "resize", folded }, "*");  //iframeの内側から外側(webassembly?)へ送信?
  });
</script>
`;

reearth.ui.show(html, { width: 300 });  //

reearth.on("update", () => {
  reearth.ui.postMessage({
    extended: reearth.widget.extended
  });
});

reearth.on("message", msg => {
  if (msg.type === "fly") {
    reearth.visualizer.camera.flyTo({
      lat: msg.lat,
      lng: msg.lng,
      height: msg.alt + 1000,
      heading: 0,
      pitch: -Math.PI/2,
      roll: 0,
    }, {
      duration: 2
    });
    const layer = reearth.layers.find(l => l.type === "model" && l.title === "ISS");
    if (layer) {
      reearth.layers.overrideProperty(layer.id, {
        default: {
          location: { lat: msg.lat, lng: msg.lng },
          height: msg.alt
        }
      });
    }
  } else if (msg.type === "resize") {
    reearth.ui.resize?.(msg.folded ? 300 : 500, undefined, msg.folded ? undefined : true);
  }
});
