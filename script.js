//Вирсия: 1.0.0

const GBL = {
  version: 1
};

const variables = {};

function parse(str) {
  const arr = str.split("\n");
  
  const info = {};
  const rooms = {};
  
  let room;
  let javascript = "";
  
  for (let i = 0; i < arr.length; i++) {
    const l = arr[i];
    
    if (l.match(/^#/)) {
      const n = l.match(/^# (.*)/);
      const v = l.match(/^#v (.*)/);
      const a = l.match(/^#a (.*)/);
      const r = l.match(/^#r (.*)/);
      const i = l.match(/^#i (.*)/);
      const f = l.match(/^#f (.*)/);
      const p = l.match(/^#p (.*)/);
      const c = l.match(/^#c (.*)/);
      const m = l.match(/^#m (.*)/);
      
      if (n) info.name = n[1];
      if (v) info.version = v[1];
      if (a) info.author = a[1];
      if (r) info.released = r[1];
      if (i) info.idea = i[1];
      if (f) info.first = f[1];
      if (p) info.args = p[1];
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
    } else if (l.match(/^\* (.*): (.*)/)) {
      const o = l.match(/^\* (.*): (.*)/);
      
      room.options.push({
        text: o[1],
        room: o[2]
      })
    } else if (room && l.length && !l.match(/^\/\/.*/)) room.text += l+"\n";
  }
  
  info.first ??= Object.keys(rooms)[0];
  
  return {
    info,
    rooms,
    javascript
  };
}

function parsestr(arg, text) {
  return text.replace(/{(.*?)}/g, (m, c) => eval(c));
}

function parseargs(text) {
  const m = text.match(/\((.*)\)/);
  
  return m ? JSON.parse("["+m[1]+"]"):[];
}

function parseopt(arg, room) {
  const m = room.match(/(.*) (\(.*\))/);
  
  return m ? {
    room: m[1],
    args: parseargs(m[2])
  }:{
    room,
    args: []
  };
}

const name = document.getElementById('name');
const text = document.getElementById('text');
const options = document.getElementById('options');
const title = document.getElementById('title');
const initial = document.getElementById('initial');

var obj;

function read(file) {
  const r = new FileReader();
  
  r.readAsText(file);
  
  r.onload = function() {
    start(r.result);
  };
}

function start(text) {
  initial.style.display = "none";
  
  obj = parse(text);
  
  name.innerHTML = obj.info.name;
  title.innerHTML = obj.info.name;
  
  const music = new Audio("assets/"+(obj.info.music ?? "default")+".mp3");
  
  music.addEventListener("loadeddata", () => music.play());
  
  eval(obj.javascript);
  
  toroom(obj.info.first, parseargs(obj.info.args ?? "()"));
}

function toroom(id, arg) {
  const room = obj.rooms[id];
  
  text.innerHTML = parsestr(arg, room.text);
  
  eval(room.javascript);
  
  options.innerHTML = "";
  
  for (let i = 0; i < room.options.length; i++) {
    const o = room.options[i];
    const div = document.createElement("div");
    const btn = document.createElement("button");
    
    div.className = "optiondiv";
    btn.className = "optionbtn";
    
    btn.innerHTML = parsestr(arg, o.text);
    
    btn.onclick = function() {
      const r = parseopt(arg, parsestr(arg, o.room));
      
      toroom(r.room, r.args);
    };
    
    div.appendChild(btn);
    options.appendChild(div);
  }
}