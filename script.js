//Версия: 1.6.0 (30.11.2023)

const GBL = {
  version: 6,
  savekey: "gbl6save"
};

const variables = {};
const assets = {};

function parse(str) {
  const arr = str.split("\n");
  
  const info = {};
  const rooms = {};
  
  let room;
  let javascript = "";
  
  for (let i = 0; i < arr.length; i++) {
    const l = arr[i];
    
    if (!room && l.match(/^#/)) {
      const n = l.match(/^# (.*)/);
      const v = l.match(/^#v (.*)/);
      const a = l.match(/^#a (.*)/);
      const r = l.match(/^#r (.*)/);
      const i = l.match(/^#i (.*)/);
      const f = l.match(/^#f (.*)/);
      const c = l.match(/^#c (.*)/);
      const m = l.match(/^#m (.*)/);
      
      if (n) info.name = n[1];
      if (v) info.version = v[1];
      if (a) info.author = a[1];
      if (r) info.released = r[1];
      if (i) info.idea = i[1];
      if (f) info.first = f[1];
      if (m) info.music = m[1];
      if (c) {
        if (!info.credits) info.credits = [];
        info.credits.push(c[1]);
      }
    } else if (l.match(/^! (.*)/)) {
      const s = l.match(/^! (.*)/)[1]+"\n";
      
      if (room) room.javascript += s
      else javascript += s;
    } else if (l.match(/^@ (.*)/)) {
      const n = l.match(/^@ (.*)/)[1];
      
      room = {
        id: n,
        javascript: "",
        text: "",
        options: []
      };
      
      rooms[n] = room;
    } else if (room && l.match(/^\* (.*): (.*)/)) {
      const o = l.match(/^\* (.*): (.*)/);
      
      room.options.push({
        text: o[1],
        room: o[2]
      });
    } else if (room && l.match(/^\$\$\$\$\$/)) {
      room = null;
    } else if (room && l.length && !l.match(/^\/\/.*/)) room.text += l+"\n";
  }
  
  info.first ??= Object.keys(rooms)[0];
  info.music ??= "default";
  
  return {
    info,
    rooms,
    javascript
  };
}

function parsestr(arg, text) {
  return text.replace(/{(.*?)}/g, (m, c) => {
    try {
      return eval(c);
    } catch (e) {
      error(`Ошибка: не удалось выполнить код ${c} (${e.message})`);
      return "{Ошибка}";
    }
  });
}

function parseargs(text) {
  const m = text.match(/\((.*)\)/);
  
  try {
    return m ? JSON.parse("["+m[1]+"]"):[];
  } catch (e) {
    error(`Ошибка: не удалось прочитать параметры "${m[1]}"`);
    return [];
  }
}

function parseopt(room) {
  const m = room.match(/(.*) (\(.*\))/);
  
  return m ? {
    room: m[1],
    args: parseargs(m[2]),
    argstr: m[2]
  }:{
    room,
    args: [],
    argstr: ""
  };
}

const name = document.getElementById('name');
const text = document.getElementById('text');
const options = document.getElementById('options');
const title = document.getElementById('title');
const errorp = document.getElementById('error');
const reloadbtn = document.getElementById('reload');
const initial = document.getElementById('initial');
const game = document.getElementById('game');
const statep = document.getElementById('state');

var obj, code;
var stats, music;
var roomid, roomarg, roomargstr;

function chance(prob) {
  return Math.random() < prob;
}

function pixelsrc(colors, data, size) {
  const h = data.length;
  const w = Math.max(...data.map(x => x.length));
  
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  
  c.width = w*size;
  c.height = h*size;
  
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    ctx.fillStyle = colors[data[y][x] ?? 0];
    ctx.fillRect(x*size, y*size, size, size);
  }
  
  return c.toDataURL("image/png");
}

function pixelhtml() {
  const src = pixelsrc(...arguments);
  
  return `<img src="${src}" class="stateimg">`;
}

function state(str) {
  if (typeof str == "undefined") return statep.innerHTML;
  else statep.innerHTML = str;
}

function error(e) {
  if (!errorp.innerHTML) errorp.innerHTML = e;
}

function read(file) {
  const r = new FileReader();
  
  r.readAsText(file);
  
  r.onload = function() {
    code = r.result;
    
    start();
  };
}

function sound(src) {
  const sound = new Audio(src);
  
  let loaded = false;
  
  sound.addEventListener("loadeddata", () => loaded = true);
  
  return {
    play(mv = 1) {
      return new Promise(function(res) {
        const lmv = music.volume;
        
        if (loaded) {
          music.volume *= mv;
          
          const smv = music.volume;
          
          sound.addEventListener("ended", function() {
            if (music.volume == smv) music.volume = lmv;
            res();
          }, { once: true });
          
          sound.play();
        }
      });
    },
    
    get elememt() {
      return sound;
    },
    get src() {
      return src;
    },
    get size() {
      return src.length;
    },
    set volume(v) {
      sound.volume = v;
    },
    get volume() {
      return sound.volume;
    }
  };
}

function addbutton(html, f) {
  const btn = document.createElement("p");
  
  btn.className = "button";
  btn.innerHTML = html;
  btn.onclick = f;
  
  buttons.appendChild(btn);
}

function println(txt) {
  text.innerHTML += txt;
}

function start(start = true) {
  initial.style.display = "none";
  game.style.display = "block";
  
  obj = parse(code);
  
  stats = {
    rooms: Object.keys(obj.rooms).length
  };
  
  name.innerHTML = obj.info.name;
  title.innerHTML = obj.info.name;
  
  const musics = [
    "battle",
    "battle2",
    "default",
    "desert",
    "maze",
    "fast",
    "slow",
    "fun",
    "fun2",
    "fun3"
  ];
  
  if (obj.info.music != "off") {
    music = new Audio(musics.includes(obj.info.music) ? "assets/"+obj.info.music+".mp3":obj.info.music);
    
    music.loop = true;
    
    music.addEventListener("loadeddata", () => music.play());
  }
  
  try {
    eval(obj.javascript);
  } catch (e) {
    error(`Ошибка: не удалось выполнить код (${e.message})`);
  }
  
  if (start) {
    const opt = parseopt(obj.info.first);
    toroom(opt.room, opt.args);
  }
}

function toroom(id, arg) {
  const room = obj.rooms[id];
  
  if (!room) return void error(`Ошибка: комната «${id}» не существует`);
  
  roomid = id;
  roomarg = arg;
  
  const rtext = parsestr(arg, room.text);
  
  text.innerHTML = rtext;
  
  try {
    eval(room.javascript);
  } catch (e) {
    error(`Ошибка: не удалось выполнить код комнаты «${id}» (${e.message})`);
  }
  
  options.innerHTML = "";
  
  for (let i = 0; i < room.options.length; i++) {
    const o = room.options[i];
    const div = document.createElement("div");
    const btn = document.createElement("button");
    
    div.className = "optiondiv";
    btn.className = "optionbtn";
    
    btn.innerHTML = parsestr(arg, o.text);
    
    btn.onclick = function() {
      const r = parseopt(parsestr(arg, o.room));
      
      roomargstr = r.argstr;
      
      toroom(r.room, r.args);
    };
    
    div.appendChild(btn);
    options.appendChild(div);
  }
}

function save() {
  const o = {
    roomid,
    roomarg,
    variables,
    code,
    state: state()
  };
  
  localStorage.setItem(GBL.savekey, JSON.stringify(o));
}

function reload() {
  try {
    const o = JSON.parse(localStorage.getItem(GBL.savekey));
    
    code = o.code;
    
    const keys = Object.keys(o.variables);
    const vals = Object.values(o.variables);
    
    for (let i = 0; i < keys.length; i++) variables[keys[i]] = vals[i];
    
    start(false);
    
    state(o.state);
    toroom(o.roomid, o.roomarg);
  } catch (e) {
    error(`Ошибка: не удалось открыть сохранение (${e.message})`);
  }
}

if (localStorage.getItem(GBL.savekey)) reloadbtn.style.display = "block";