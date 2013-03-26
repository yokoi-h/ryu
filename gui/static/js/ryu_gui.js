var conf = {
  LABEL_FONT_SIZE: 10,
  POSITION_BASE: {"x": 200, "y":250},
  POSITION_RADII_SW: {"x": 100, "y": 100},
  IMG_SW: {"x": 50, "y": 30, "img": "static/img/switch.gif"},
  URL_GET_STATS: '/stats',
  URL_FLOW_MOD: '/flow',
  ID_PRE_SW: 'node-switch-',
  ID_PRE_LINK_LIST: 'link-list-item-'
};


var disp = {
  input: {},
  switches: {}
};



var topo = {
  input_dialog: null,

  registo_handler: function(){
    topo.input_dialog = $('#jquery-ui-dialog').dialog({
      autoOpen: false,
      width: 450,
      show: 'explode',
      hide: 'explode',
      modal: true,
      buttons: {
        'Launch': function() {
          topo.restConnect($('#jquery-ui-dialog-form-host').val(),
                           $('#jquery-ui-dialog-form-port').val());
          $(this).dialog('close');
        },
        'cancel': function(){
          $(this).dialog('close');
        },
      },
      open: function(){
        topo.openInputForm();
      },
    });

    // Contents draggable
    $('#menu').draggable({ handle: '#menu, .content-title' });
    $('#link-list').draggable({ handle: '#link-list, .content-title' });
    $('#flow-list').draggable({ handle: '#flow-list, .content-title' });

    // Contents resize
    $("#menu").resizable( { autoHide : true } );
    $("#topology").resizable( { autoHide : true } );
    $("#flow-list").resizable( { autoHide : true } );
    $("#link-list").resizable( { autoHide : true } );

    // Contents active
    $(".content").click(function(){topo.contentActive(this.id)});

    // Menu mouseouver/mouseout
    $('#menu a div').hover(
      function(){ topo.menuMouseOver(this); },
      function(){ topo.menuMouseOut(this); }
    );

    // menu
    $('#jquery-ui-dialog-opener').click(function(){
      topo.input_dialog.dialog('open');
    });
    $("#menu-flow-entries").click(function(){
      topo.contentOpenClose('flow-list');
    });
    $("#menu-link-status").click(function(){
      topo.contentOpenClose('link-list');
    });
  },

  init: function(){
    topo.input_dialog.dialog('open');
  },

  setInput: function(host, port, err) {
    disp.input.host = host;
    disp.input.port = port;
    if (typeof err !== "undefined") disp.input.err = err;
  },

  openInputForm: function() {
    if (disp.input.host) $('#jquery-ui-dialog-form-host').val(disp.input.host);
    if (disp.input.port) $('#jquery-ui-dialog-form-port').val(disp.input.port);
    if (disp.input.err) {
      $("#input-err-msg").text(disp.input.err).css('display', 'block');
    } else {
      $("#input-err-msg").css('display', 'none');
    }
  },

  restConnect: function(host, port) {
//    alert("RestConnect " + host + ':' + port);
    disp.input.err = null;

    var msg = {};
    msg.event = "EventRestUrl";
    msg.body = {};
    msg.body.host = host;
    msg.body.port = port;
    websocket.onsend(msg);
  },

  menuMouseOver: function(el) {
    el.style.backgroundColor = "#0070c0";
    el.style.color = "#FFF";
  },

  menuMouseOut: function(el) {
    el.style.backgroundColor = "#EEE";
    el.style.color = "#0070c0";
  },

  contentOpenClose: function(id) {
    if (document.getElementById(id).style.display == 'none') topo.contentActive(id)
    else $('#' + id).css('display', 'none')
  },

  contentActive: function(id) {
    if (id == "menu") return;
    var contents = $("#main").find(".content");
    for (var i in contents) {
      if (Number(i) >= 0) {
        var content = contents[i];
        if (content.id != "menu") {
          if (content.id == id) {
            content.style.display = 'block';
            content.style.zIndex = $("#main").children(".content").length * 10;
          } else if (content.style.zIndex > 10) {
            content.style.zIndex = content.style.zIndex - 1 * 10;
          }
        }
      }
    }
  },

  lookingSwitch: function(dpid) {
    if (dpid == $("#looking-switch").text()) return;
    if (typeof dpid === "undefined") {
      dpid = null;
    } else if (!disp.switches[dpid]) {
      return
    }

    $("#looking-switch").text(dpid);

    // clear flow and link list
    utils.clearLinkList();
    utils.clearFlowList();

    if (dpid) {
      var sw = disp.switches[dpid];
      $(".content-title .looking").text(': ' + sw.name)
      for (var i in sw.ports) utils.appendLinkList(sw.ports[i]);
    }

    // send event
    msg = {};
    msg.event = "EventLookingSwitch";
    msg.body = {};
    msg.body.dpid = dpid;
    websocket.onsend(msg);
  },

  redesignTopology: function(){
    var base = conf.POSITION_BASE; // TODO: col topology offset
    var radii = conf.POSITION_RADII_SW;
    var cnt = 0;
    var len = 0;
    for (var i in disp.switches) len ++;

    for (var i in disp.switches) {
      var sw = disp.switches[i];
      var position = utils._calTh(cnt, len, base, radii);
      utils.addSwitch(sw, position)
      cnt ++;
    }
  }
};


var utils = {
  _addNode: function(id, position, img, className) {
    var topo_div = document.getElementById('topology');
    var node_div = document.createElement('div');
    var node_img = document.createElement('img');
    node_div.appendChild(node_img);
    topo_div.appendChild(node_div);

    node_div.style.position = 'absolute';
    node_div.id = id;
    if (typeof className !== 'undefined') node_div.className = className;
    node_div.style.width = img.x;
    node_div.style.height = img.y;
    node_div.style.left = position.y;
    node_div.style.top = position.x;

    node_img.id = id + "-img";
    node_img.src = img.img;
    node_img.style.width = img.x;
    node_img.style.height = img.y;

    // jsPlumb drag
    jsPlumb.draggable(node_div);
  },

  _moveNode: function(id, position) {
    var node_div = document.getElementById(id);
    node_div.style.left = position.y;
    node_div.style.top = position.x;
  },

  addSwitch: function(sw, position) {
    var id = conf.ID_PRE_SW + sw.dpid;
    if (document.getElementById(id)) {
      utils._moveNode(id, position);
      return
    } 

    var img = conf.IMG_SW;
    utils._addNode(id, position, img, 'switch');
    var node_div = document.getElementById(id)
    node_div.setAttribute("onClick","topo.lookingSwitch('" + sw.dpid + "')");

    var fontSize = conf.LABEL_FONT_SIZE;
    var label_div = document.createElement('div');
    label_div.className = "switch-label";
    label_div.id = id + "-label";
    label_div.style.width = sw.name.length * fontSize;
    label_div.style.marginTop = 0 - (img.y + fontSize) / 2;
    label_div.style.marginLeft = (img.x - sw.name.length * fontSize) / 2;
    
    var label_text = document.createTextNode(sw.name);
    label_div.appendChild(label_text);
    node_div.appendChild(label_div);
  },

  _calTh: v = function(no, len, base, radii) {
    var th = 3.14159;
    var p = {};
    p['x'] = base.x + radii.x * Math.cos(th * 2 * (len - no) / len);
    p['y'] = base.y + radii.y * Math.sin(th * 2 * (len - no) / len);
    return p
  },

  appendLinkList: function(link){
    var list_table = document.getElementById('link-list-table');
    var tr = list_table.insertRow(-1);
    tr.className = 'content-table-item';
    tr.id = conf.ID_PRE_LINK_LIST + link.dpid + '-' + link.port_no

    var no_td = tr.insertCell(-1);
    no_td.className = 'port-no';
    no_td.innerHTML = link.port_no;

    var name_td = tr.insertCell(-1);
    name_td.className = 'port-name';
    name_td.innerHTML = link.name;

    var peer_td = tr.insertCell(-1);
    var peer_port_span = document.createElement('span');
    var peer_switch_span = document.createElement('span');
    peer_td.className = 'port-peer';
    peer_port_span.className = 'peer-port-name';
    peer_switch_span.className = 'peer-switch-name';
    peer_td.appendChild(peer_port_span);
    peer_td.appendChild(peer_switch_span);

    var peer_port = '';
    var peer_switch = '';
    var peer = disp.switches[link.peer.dpid];
    if (peer) {
      if (peer.ports[link.peer.port_no]) {
        peer_port = peer.ports[link.peer.port_no].name;
        peer_switch = '(' + peer.name + ')';
      }
    }

    peer_port_span.innerHTML = peer_port;
    peer_switch_span.innerHTML = peer_switch;
  },

  modifyLinkList: function(p1, p2) {
    var look;
    if (p1.dpid == $("#looking-switch").text()) {
      look = disp.switches[p1.dpid].ports[p1.port_no];
    } else if (p2.dpid == $("#looking-switch").text()) {
      look = disp.switches[p2.dpid].ports[p2.port_no];
    } else {
      return
    }

    id = conf.ID_PRE_LINK_LIST + look.dpid + '-' + look.port_no;

    if (Number(look.peer.dpid) == Number(p2.dpid)) {
      var peer_switch = disp.switches[p2.dpid].name;
      var peer_port = disp.switches[p2.dpid].ports[p2.port_no].name;
      $("#" + id).find(".peer-port-name").text(peer_port);
      $("#" + id).find(".peer-switch-name").text('(' + peer_switch + ')');
    } else {
      $("#" + id).find(".peer-port-name").text('');
      $("#" + id).find(".peer-switch-name").text('');
    }
  },

  deleteLinkList: function(link) {
    if (link.dpid != $("#looking-switch").text()) return;
    var id = conf.ID_PRE_LINK_LIST + link.dpid + '-' + link.port_no;
    $('#link-list tr').remove('#' + id);
  },

  clearLinkList: function(){
    $('#link-list tr').remove('.content-table-item');
  },

  clearFlowList: function(){
    $('#flow-list tr').remove('.content-table-item');
  },

  addConnect: function(p1, p2) {
    var id_p1 = conf.ID_PRE_SW + p1.dpid;
    var id_p2 = conf.ID_PRE_SW + p2.dpid;
    utils._addConnect(id_p1, id_p2, p1.port_no);
    utils._addConnect(id_p2, id_p1, p2.port_no);
  },

  _addConnect: function(s, t, port_no) {
    if (typeof port_no === 'undefined')  overlays = null;
    else overlays = [["Label", {label: port_no + "", location: 0.15, cssClass: "port-no"}]];

    var connector = 'Straight';
    var anchors = ["Center", "Center"];
    var click = function(conn) { utils.emMatchFlow([conn.sourceId, conn.targetId]) }
    var paintStyle = {"lineWidth": 3,
                      "strokeStyle": '#35FF35',
                      "outlineWidth": 0.5,
                      "outlineColor": '#AAA',
                      "dashstyle": "0 0 0 0"}

    var conn = jsPlumb.connect({source: s,
                                target: t,
                                paintStyle: paintStyle,
                                connector: connector,
                                anchors: anchors,
                                overlays: overlays});
    conn.bind('click', click);
  },

  delConnect: function(p1, p2) {
    var id_p1 = conf.ID_PRE_SW + p1.dpid;
    var id_p2 = conf.ID_PRE_SW + p2.dpid;
    utils._delConnect(id_p1, id_p2);
    utils._delConnect(id_p2, id_p1);
  },

  _delConnect: function(s, t) {
    jsPlumb.detach({source: s, target: t});
  }
};

var websocket = {
  onsend: function(ev) {
//    alert('Send: ' + ev.event)
    ws.send(JSON.stringify(ev));
  },

  onmessage: function(ev) {
    msg = JSON.parse(ev);

    if (msg.event == 'EventRestConnectErr') {
      websocket._rest_connect_err(msg.body);
    } else if (msg.event == 'EventAddSwitch') {
      websocket._add_switch(msg.body);
    } else if (msg.event == 'EventDelSwitch') {
      websocket._del_switch(msg.body);
    } else if (msg.event == 'EventAddPort') {
      websocket._add_port(msg.body);
    } else if (msg.event == 'EventDelPort') {
      websocket._del_port(msg.body);
    } else if (msg.event == 'EventAddLink') {
      websocket._add_link(msg.body);
    } else if (msg.event == 'EventDelLink') {
      websocket._del_link(msg.body);
    } else {
      return;
    }
  },

  _rest_connect_err: function(body){
    topo.setInput(body.host, body.port, body.err)
    topo.openInputForm();
  },

  _add_switch: function(body) {
    if (body.dpid in disp.switches) return;
    disp.switches[body.dpid] = body;
    topo.redesignTopology();
    if (Number($("#looking-switch").text()) < 1) topo.lookingSwitch(body.dpid);
  },

  _del_switch: function(body) {
    alert('TODO: del_switch');
    utils.delConnect(body.dpid);
    utils.delSwitch(body.dpid);
    if ($("#looking-switch").text() == body.dpid) topo.lookingSwitch(0);
  },

  _add_port: function(body) {
    if (disp.switches[body.dpid]) disp.switches[body.dpid].ports[body.port_no] = body;
    utils.appendLinkList(body);
  },

  _del_port: function(body) {
    // TODO: del connection src or dst is this port. jsPlumb.getConnections
    delete disp.switches[body.dpid].ports[body.port_no];
    utils.deleteLinkList(body);
  },

  _add_link: function(body) {
    disp.switches[body.p1.dpid].ports[body.p1.port_no].peer = body.p2;
    disp.switches[body.p2.dpid].ports[body.p2.port_no].peer = body.p1;
    utils.addConnect(body.p1, body.p2);
    utils.modifyLinkList(body.p1, body.p2);
  },

  _del_link: function(body) {
    disp.switches[body.p1.dpid].ports[body.p1.port_no].peer = {};
    disp.switches[body.p2.dpid].ports[body.p2.port_no].peer = {};
    utils.delConnect(body.p1, body.p2);
    utils.modifyLinkList(body.p1, body.p2);
  }
};
