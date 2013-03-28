var conf = {
  LABEL_FONT_SIZE: 10,
  POSITION_RADII_SW: {"x": 100, "y": 100},
  IMG_SW: {"x": 50, "y": 30, "img": "static/img/switch.png"},
  DEFAULT_REST_PORT: '8080',
  ID_PRE_SW: 'node-switch-',
  ID_PRE_LINK_LIST: 'link-list-item-',
  ID_PRE_FLOW_LIST: 'flow-list-item-'
};


var disp = {
  input: {},
  switches: {},
  timer: {}
};



///////////////////////////////////
//  topo
///////////////////////////////////
var topo = {
  registo_handler: function(){
    $('#jquery-ui-dialog').dialog({
      autoOpen: false,
      width: 450,
      show: 'explode',
      hide: 'explode',
      modal: true,
      buttons: {
        'Launch': function() {
          topo.restConnect();
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
    $('#topology').draggable({ handle: '#topology, .content-title' });

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
      $('#jquery-ui-dialog').dialog('open');
    });
    $("#menu-flow-entries").click(function(){
      topo.contentOpenClose('flow-list');
    });
    $("#menu-link-status").click(function(){
      topo.contentOpenClose('link-list');
    });
  },

  init: function(){
    topo.setInput({'port': conf.DEFAULT_REST_PORT});
    utils.restUnconnected();
    $('#jquery-ui-dialog').dialog('open');
  },

  setInput: function(input) {
    if (typeof input.host !== "undefined") disp.input.host = input.host;
    if (typeof input.port !== "undefined") disp.input.port = input.port;
    if (typeof input.err !== "undefined") disp.input.err = input.err;
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

  restConnect: function() {
//    alert("RestConnect " + host + ':' + port);
    var input = {};
    input.host = $('#jquery-ui-dialog-form-host').val();
    input.port = conf.DEFAULT_REST_PORT;
    if ($('#jquery-ui-dialog-form-port').val()) input.port = $('#jquery-ui-dialog-form-port').val();
    input.err = '';
    topo.setInput(input);
    utils.restUnconnected();

    // topology cleanup
    utils.topologyCleanup();
    websocket.sendRestUpdate(input.host, input.port);
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
    for (var i=0; i < contents.length; i++) {
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
  },

  lookingSwitch: function(dpid) {
    if (dpid == $("#looking-switch").text()) return;
    if (typeof dpid === "undefined") {
      dpid = "";
    } else if (typeof disp.switches[dpid] === "undefined") {
      return
    }

    $("#looking-switch").text(dpid);
    utils.clearLinkList();
    utils.clearFlowList();

    if (dpid) {
      var sw = disp.switches[dpid];
      $(".content-title .looking").text(': ' + sw.name)
      for (var i in sw.ports) utils.appendLinkList(sw.ports[i]);
    } else {
      $(".content-title .looking").text('')
    }
    websocket.sendLookingSwitch(dpid);
  },

  redesignTopology: function(){
    var x = $("#topology").height() / 2
    var y = $("#topology").width() / 2

    var radii = conf.POSITION_RADII_SW;
    var cnt = 0;
    var len = 0;
    for (var i in disp.switches) len ++;

    for (var i in disp.switches) {
      var sw = disp.switches[i];
      var position = utils._calTh(cnt, len, {'x': x, 'y': y}, radii);
      utils.addSwitch(sw, position)
      cnt ++;
    }
  }
};


///////////////////////////////////
//  utils
///////////////////////////////////
var utils = {
  restUnconnected: function(host, port) {
    $("#topology").find(".rest-status").css('color', 'red').text('Unconnected');
    if (typeof host !== "undefined" && typeof port !== "undefined") {
      var rest = '<span class="rest-url">(' + host + ':' + port + ')</span>';
      $("#topology").find(".rest-status").append(rest);
    }
    if (disp.timer.restStatus) return;
    disp.timer.restStatus = setInterval(function(){
      $("#topology").find(".rest-status").fadeOut(1500,function(){$(this).fadeIn(1500)});
    },500);
  },

  restConnected: function(host, port) {
    if (disp.timer.restStatus) {
      clearInterval(disp.timer.restStatus);
      disp.timer.restStatus = null;
      $("#topology").find(".rest-status").css('color', '#808080').text('Connected');
      var rest = '<span class="rest-url">(' + host + ':' + port + ')</span>';
      $("#topology").find(".rest-status").append(rest);
    }
  },

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
    $(node_div).draggable({"containment": "parent"});
    jsPlumb.draggable(node_div);
  },

  _moveNode: function(id, position) {
    var node_div = document.getElementById(id);
    node_div.style.left = position.y;
    node_div.style.top = position.x;

    // jsPlumb reconnect
    var points = jsPlumb.getEndpoints(id);
    var conn = jsPlumb.getConnections({souece: id});
    for (var i in points) jsPlumb.deleteEndpoint(points[i]);
    for (var i in conn) {
      var label;
      for (var j in conn[i].getOverlays()) {
        label = conn[i].getOverlays()[j].getLabel();
        break;
      }
      utils._addConnect(conn[i].source, conn[i].target, label);
    }
  },

  _delNode: function(id) {
    var points = jsPlumb.getEndpoints(id);
    for (var i in points) jsPlumb.deleteEndpoint(points[i]);
    $("#" + id).remove();
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

  delSwitch: function(dpid) {
    utils._delNode(conf.ID_PRE_SW + dpid);
  },

  _calTh: function(no, len, base, radii) {
    var th = 3.14159;
    var p = {};
    p['x'] = base.x + radii.x * Math.cos(th * 2 * (len - no) / len);
    p['y'] = base.y + radii.y * Math.sin(th * 2 * (len - no) / len);
    return p
  },

  _repainteRows: function(list_table_id) {
    var rows = $("#main").find(".content");
    for (var i=0; i < $("#" + list_table_id).find(".content-table-item").length; i++) {
      var tr = $("#" + list_table_id).find(".content-table-item")[i];
      if (i % 2) {
        $(tr).find("td").css('background-color', '#D6D6D6');
        $(tr).find("td").css('color', '#535353');
      } else {
        $(tr).find("td").css('background-color', '#EEEEEE');
        $(tr).find("td").css('color', '#808080');
      }
    }
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

    utils._repainteRows('link-list-table');
  },

  modifyLinkList: function(p1, p2) {
    var look;
    var other;
    if (p1.dpid == $("#looking-switch").text()) {
      look = disp.switches[p1.dpid].ports[p1.port_no];
      other = p2;
    } else if (p2.dpid == $("#looking-switch").text()) {
      look = disp.switches[p2.dpid].ports[p2.port_no];
      other = p1;
    } else {
      return
    }

    id = conf.ID_PRE_LINK_LIST + look.dpid + '-' + look.port_no;

    if (Number(look.peer.dpid) == Number(other.dpid)) {
      var peer_switch = disp.switches[other.dpid].name;
      var peer_port = disp.switches[other.dpid].ports[other.port_no].name;
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
    utils._repainteRows('link-list-table');
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
    if (Number(port_no) < 1)  overlays = null;
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
  },

  replaceFlowList: function(dpid, flows){
    if (dpid != $("#looking-switch").text()) return;
    for (var i in flows) {
      var list_table = document.getElementById('flow-list-table');
      var tr = list_table.insertRow(-1);
      tr.className = 'content-table-item';
      tr.id = conf.ID_PRE_FLOW_LIST + dpid + '-' + i;

      var td = tr.insertCell(-1);
      td.className = 'flow';
      td.innerHTML = flows[i];
      utils._repainteRows('flow-list-table');
    }
  },

  topologyCleanup: function() {
    topo.lookingSwitch();
    disp.switches = {};
    for (var i=0; i < $("#topology").find(".switch").length; i++) {
      var el = $("#topology").find(".switch")[i];
      jsPlumb.removeAllEndpoints(el);
      $(el).remove();
    }
  }
};


///////////////////////////////////
//  websocket
///////////////////////////////////
var websocket = {
  _sendMessage: function(msg) {
    ws.send(JSON.stringify(msg));
  },

  onMessage: function(msg) {
    var msg = JSON.parse(msg);

    // user already updated to URL
    if (msg.host != disp.input.host || msg.port != disp.input.port) return;

    if (msg.message == 'rest_unconnected') {
      utils.restUnconnected(msg.host, msg.port);
      return;
    }

    utils.restConnected(msg.host, msg.port);
    if (msg.message == 'add_switch') {
      websocket._addSwitch(msg.body);
    } else if (msg.message == 'del_switch') {
      websocket._delSwitch(msg.body);
    } else if (msg.message == 'add_port') {
      websocket._addPort(msg.body);
    } else if (msg.message == 'del_port') {
      websocket._delPort(msg.body);
    } else if (msg.message == 'add_link') {
      websocket._addLink(msg.body);
    } else if (msg.message == 'del_link') {
      websocket._delLink(msg.body);
    } else if (msg.message == 'replace_flows') {
      websocket._replaceFlows(msg.body);
    } else {
      // unknown message
      return;
    }
  },

  ////////////
  // send messages
  ////////////
  sendRestUpdate: function(host, port){
    var msg = {};
    msg.message = 'rest_update';
    msg.host = host;
    msg.port = port;
    websocket._sendMessage(msg);
  },

  sendLookingSwitch: function(dpid){
    msg = {};
    msg.message = "looking_switch_update";
    msg.body = {};
    msg.body.dpid = dpid;
    websocket._sendMessage(msg);
  },

  ////////////
  // recive messages
  ////////////
  _addSwitch: function(body) {
    if (body.dpid in disp.switches) return;
    disp.switches[body.dpid] = body;
    topo.redesignTopology();
    if ($("#looking-switch").text() == "") {
      topo.lookingSwitch(body.dpid);
    }
  },

  _delSwitch: function(body) {
    if ($("#looking-switch").text() == body.dpid) topo.lookingSwitch();

    utils.delSwitch(body.dpid)

    for (var s in disp.switches) {
      for (var p in disp.switches[s].ports) {
        var port = disp.switches[s].ports[p];
        if (port.peer.dpid == body.dpid) {
          disp.switches[s].ports[p].peer = {};
          utils.modifyLinkList(body, port);
        }
      }
    }
    delete disp.switches[body.dpid]
    topo.redesignTopology();
  },

  _addPort: function(body) {
    if (disp.switches[body.dpid]) disp.switches[body.dpid].ports[body.port_no] = body;
    utils.appendLinkList(body);
  },

  _delPort: function(body) {
    // delete link list
    utils.deleteLinkList(body);

    // delete connect and memory
    for (var s in disp.switches) {
      for (var p in disp.switches[s].ports) {
        var port = disp.switches[s].ports[p];
        if (port.peer.dpid == body.dpid && port.peer.port_no == body.port_no) {
          utils.delConnect(port, port.peer);
          disp.switches[s].ports[p].peer = {};
          break;
        }
      }
    }
    delete disp.switches[body.dpid].ports[body.port_no];
  },

  _addLink: function(body) {
    disp.switches[body.p1.dpid].ports[body.p1.port_no].peer = body.p2;
    disp.switches[body.p2.dpid].ports[body.p2.port_no].peer = body.p1;
    utils.addConnect(body.p1, body.p2);
    utils.modifyLinkList(body.p1, body.p2);
  },

  _delLink: function(body) {
    disp.switches[body.p1.dpid].ports[body.p1.port_no].peer = {};
    disp.switches[body.p2.dpid].ports[body.p2.port_no].peer = {};
    utils.delConnect(body.p1, body.p2);
    utils.modifyLinkList(body.p1, body.p2);
  },

  _replaceFlows: function(body) {
    utils.replaceFlowList(body.dpid, body.flows);
  }
};
