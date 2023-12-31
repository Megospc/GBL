//Версия: 1.8.3 (14.12.2023)

const GBL = {
  version: 8,
  savekey: "gbl8save"
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
      const o = l.match(/^#o (.*)/);
      
      if (n) info.name = n[1];
      if (v) info.version = v[1];
      if (a) info.author = a[1];
      if (r) info.released = r[1];
      if (i) info.idea = i[1];
      if (f) info.first = f[1];
      if (m) info.music = m[1];
      if (o) info.options = o[1];
      if (c) {
        if (!info.credits) info.credits = [];
        info.credits.push(c[1]);
      }
    } else if (l.match(/^! (.*)/)) {
      const s = l.match(/^! (.*)/)[1]+"\n";
      
      if (room) room.javascript += s;
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
    } else if (room && l.match(/^\"\"\" (.*)/)) {
      const t = l.match(/^\"\"\" (.*)/);
      
      room.text += t[1].replace(/([\{|\}])/g, (x, f) => `{"${f == "}" ? "\\u007C":"\\u007B"}"}`);
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
    argstr: "()"
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
const enterdiv = document.getElementById('enterdiv');
const enterinput = document.getElementById('enter');
const enterlabel = document.getElementById('enterlabel');
const soundbutton = document.getElementById('soundbutton');

var roomid, roomarg, roomargstr, roomtxtoptions;
var obj, code;
var stats, music;
var musicon = true;

function chance(prob) {
  return Math.random() < prob;
}

function entertext(callback, label = "") {
  enterinput.onchange = function() {
    const r = callback(enterinput.value);
    if (!r) enterdiv.style.display = "none";
  };
  
  enterlabel.innerHTML = label;
  enterinput.value = "";
  enterdiv.style.display = "block";
}

function imagehtml(src) {
  return `<img src="${src}" class="stateimg">`;
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
  
  return imagehtml(src);
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
        if (!musicon) res();
        else if (loaded) {
          const lmv = music.volume;
          
          music.volume *= mv;
          
          sound.addEventListener("ended", function() {
            if (mv) music.volume /= mv;
            else music.volume = lmv;
            
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

function togglesounds() {
  musicon = !musicon;
  
  soundbutton.innerHTML = musicon ? `<img src="assets/musicon.svg" class="soundimg">`:`<img src="assets/musicoff.svg" class="soundimg">`;
  
  if (music) {
    if (musicon) music.play();
    else music.pause();
  }
}

function addbutton(html, f) {
  const btn = document.createElement("p");
  
  btn.className = "button";
  btn.innerHTML = html;
  btn.onclick = f;
  
  buttons.appendChild(btn);
}

function println(txt) {
  text.innerHTML += parsestr(roomarg, txt);
}

function addoption(text, room) {
  const arg = roomarg;
  
  switch (obj.info.options) {
    case "entertext":
      roomtxtoptions.push({
        id: parsestr(arg, text), 
        handle() {
          const r = parseopt(parsestr(arg, room));
          
          roomargstr = r.argstr;
          
          toroom(r.room, r.args);
        }
      });
      
      break;
    
    default:
      const div = document.createElement("div");
      const btn = document.createElement("button");
      
      div.className = "optiondiv";
      btn.className = "optionbtn";
      
      btn.innerHTML = parsestr(arg, text);
      
      btn.onclick = function() {
        const r = parseopt(parsestr(arg, room));
        
        roomargstr = r.argstr;
        
        toroom(r.room, r.args);
      };
       
      div.appendChild(btn);
      options.appendChild(div);
  }
}

function start(start = true) {
  initial.style.display = "none";
  game.style.display = "block";
  
  obj = parse(code);
  
  stats = {
    get rooms() {
      return Object.keys(obj.rooms).length;
    },
    get assets() {
      return Object.keys(assets).length;
    }
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
  } else music = {};
  
  try {
    eval(obj.javascript);
  } catch (e) {
    error(`Ошибка: не удалось выполнить код (${e.message})`);
  }
  
  if (start) {
    const opt = parseopt(obj.info.first);
    
    roomargstr = opt.argstr;
    
    toroom(opt.room, opt.args);
  }
}

function toroom(id, arg) {
  const room = obj.rooms[id];
  
  if (!room) return void error(`Ошибка: комната «${id}» не существует`);
  
  roomid = id;
  roomarg = arg;
  roomtxtoptions = [];
  
  const rtext = parsestr(arg, room.text);
  
  text.innerHTML = rtext;
  
  try {
    eval(room.javascript);
  } catch (e) {
    error(`Ошибка: не удалось выполнить код комнаты «${id}» (${e.message})`);
  }
  
  options.innerHTML = "";
  
  if (obj.info.options == "entertext") {
    entertext(function(r) {
      const o = roomtxtoptions.find(x => x.id.toLowerCase() == r.toLowerCase());
      
      if (o) setTimeout(() => o.handle());
      else return true;
    });
  }
  
  for (let i = 0; i < room.options.length; i++) {
    const o = room.options[i];
    
    addoption(o.text, o.room);
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