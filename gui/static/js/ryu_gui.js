var conf = {
  URL_GET_FLOWS: 'stats/flow',
  LABEL_FONT_SIZE: 10,
  EVENT_LOOP_INTERVAL: 500,
  REPLACE_FLOW_INTERVAL: 5000,
  IMG_SW: {"x": 50, "y": 30, "img": "static/img/switch.png"},
  DEFAULT_REST_PORT: '8080',
  ID_PRE_SW: 'node-switch-',
  ID_PRE_LINK_LIST: 'link-list-item-',
  ID_PRE_FLOW_LIST: 'flow-list-item-'
};


var _EVENTS = [];

var _DATA = {
  watching: null,
  input: {},
  switches: {},
  links: {},
  timer: {}
};



///////////////////////////////////
//  topo
///////////////////////////////////
var topo = {
  registerHandler: function(){
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

    // Contents close
    $(".content-title-close").click(function(){
      return topo.contentClose($(this).closest("div .content").attr("id"))
    });
    $(".content-title-close").hover(function(){topo.closeMouseOver(this)}, function(){topo.closeMouseOut(this)});

    // Menu mouseouver/mouseout
    $('#menu a div').hover(function(){ topo.menuMouseOver(this); }, function(){ topo.menuMouseOut(this); });

    // menu
    $('#jquery-ui-dialog-opener').click(function(){$('#jquery-ui-dialog').dialog('open');});
    $("#menu-flow-entries").click(function(){topo.contentActive('flow-list');});
    $("#menu-link-status").click(function(){topo.contentActive('link-list');});
    $("#menu-redesign").click(function(){topo.redesignTopology();});
  },

  init: function(){
    topo.setInput({'port': conf.DEFAULT_REST_PORT});
    utils.restDisconnected();
    utils.event_loop();
    $('#jquery-ui-dialog').dialog('open');
  },

  setInput: function(input) {
    if (typeof input.host !== "undefined") _DATA.input.host = input.host;
    if (typeof input.port !== "undefined") _DATA.input.port = input.port;
    if (typeof input.err !== "undefined") _DATA.input.err = input.err;
  },

  openInputForm: function() {
    if (_DATA.input.host) $('#jquery-ui-dialog-form-host').val(_DATA.input.host);
    if (_DATA.input.port) $('#jquery-ui-dialog-form-port').val(_DATA.input.port);
    if (_DATA.input.err) {
      $("#input-err-msg").text(_DATA.input.err).css('display', 'block');
    } else {
      $("#input-err-msg").css('display', 'none');
    }
  },

  restConnect: function() {
    var input = {};
    input.host = $('#jquery-ui-dialog-form-host').val();
    input.port = conf.DEFAULT_REST_PORT;
    if ($('#jquery-ui-dialog-form-port').val()) input.port = $('#jquery-ui-dialog-form-port').val();

    // not changed
    if (_DATA.input.host == input.host
        && _DATA.input.port == input.port
        && !_DATA.timer.restStatus) return;

    input.err = '';
    topo.setInput(input);
    _EVENTS = [];
    utils.restDisconnected();

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

  closeMouseOver: function(id) {
  },

  closeMouseOut: function(id) {
  },

  contentClose: function(id) {
    $("#" + id).hide();
    return false;
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

  watchingSwitch: function(dpid) {
    if (typeof dpid === "undefined")  dpid = "";
    else if (! dpid in _DATA.switches) return;
    else if (dpid == _DATA.watching) return;
/**
    if (_DATA.timer.watingSwitchHighlight) clearInterval(_DATA.timer.watingSwitchHighlight)
    if (dpid) {
      var intervalfnc = function() {
        $("#" + conf.ID_PRE_SW + dpid).fadeTo(500, 0.50).fadeTo(1000, 1)
      };
      intervalfnc();
      _DATA.timer.watingSwitchHighlight = setInterval(intervalfnc, 1500);
    }
**/
    $("#topology div").find(".switch").css("border", "0px solid #FFF");
    $("#" + conf.ID_PRE_SW + dpid).css("border", "3px solid red");
    _DATA.watching = dpid;
    utils.clearLinkList();
    utils.clearFlowList();

    if (dpid) {
      // link list
      var sw = _DATA.switches[dpid];
      for (var i in sw.ports) utils.appendLinkList(sw.ports[i]);

      // flow list
      if (_DATA.timer.replaceFlowList) clearInterval(_DATA.timer.replaceFlowList)
      var intervalfnc = function() {
        rest.getFlows(_DATA.input.host, _DATA.input.port, _DATA.watching, function(data) {
          if (data.host != _DATA.input.host || data.port != _DATA.input.port) return;
          utils.replaceFlowList(data.dpid, data.flows);
        }, function(data){utils.replaceFlowList(false)});
      };
      intervalfnc();
      _DATA.timer.replaceFlowList = setInterval(intervalfnc, conf.REPLACE_FLOW_INTERVAL);
    }
//    websocket.sendWatchingSwitch(dpid);
  },

  redesignTopology: function(){
    var base = {x: $("#topology").height() / 2,
                y: $("#topology").width() / 2}
    var radii = {x: $("#topology").height() / 4,
                 y: $("#topology").width() / 4}
    var cnt = 0;
    var len = 0;
    for (var i in _DATA.switches) len ++;

    for (var i in _DATA.switches) {
      var sw = _DATA.switches[i];
      var position = utils._calTh(cnt, len, base, radii);
      utils.addSwitch(sw, position)
      cnt ++;
    }
  },

  emMatchFlow: function(source, target) {
      // TODO:
      return;
  }
};


///////////////////////////////////
//  utils
///////////////////////////////////
var utils = {
  event_loop: function() {
    if (_EVENTS.length) {
      var ev = _EVENTS.shift();
      if (ev.length == 1) ev[0]()
      else ev[0](ev[1]);
    }
    setTimeout(utils.event_loop, conf.EVENT_LOOP_INTERVAL);
  },

  registerEvent: function(func, arg){
    if (typeof arg === "undefined") _EVENTS.push([func])
    else _EVENTS.push([func, arg])
  },

  restDisconnected: function(host, port) {
    $("#topology").find(".rest-status").css('color', 'red').text('Disconnected');
    if (typeof host !== "undefined" && typeof port !== "undefined") {
      var rest = '<span class="rest-url">(' + host + ':' + port + ')</span>';
      $("#topology").find(".rest-status").append(rest);
    }
    if (_DATA.timer.restStatus) return;
    _DATA.timer.restStatus = setInterval(function(){
      $("#topology").find(".rest-status").fadeTo(1000, 0.25).fadeTo(1000, 1)
    }, 1500)
  },

  restConnected: function(host, port) {
    if (_DATA.timer.restStatus) {
      clearInterval(_DATA.timer.restStatus);
      _DATA.timer.restStatus = null;
      $("#topology").find(".rest-status").css('color', '#808080').text('Connected');
      var rest = '<span class="rest-url">(' + host + ':' + port + ')</span>';
      $("#topology").find(".rest-status").append(rest);
    }
  },

  _addNode: function(id, position, img, className) {
    var topo_div = $("#topology .content-body")[0];
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
    jsPlumb.draggable(node_div, {"containment": "parent"});
  },

  _moveNode: function(id, position) {
    // jsPlumb detach connections
    var conn = jsPlumb.getConnections({souece: id});
    jsPlumb.removeAllEndpoints(id);

    // move position and reconnect
    $("#" + id).animate({left: position.y, top: position.x}, 300, 'swing', function(){
        for (var i in conn) {
          utils._addConnect(conn[i].source, conn[i].target, conn[i].getOverlays()[0].getLabel());
        }
      }
    );
  },

  _delNode: function(id) {
    var points = jsPlumb.getEndpoints(id);
    for (var i in points) {
      jsPlumb.deleteEndpoint(points[i]);
    }
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
    node_div.setAttribute("onClick","topo.watchingSwitch('" + sw.dpid + "')");

//    var labelStr = 'dpid:' + ("0000000000000000" + sw.dpid.toString(16)).slice(-16);
    var labelStr = 'dpid: 0x' + sw.dpid.toString(16);
    $(node_div).find("img").attr('title', labelStr);
    var fontSize = conf.LABEL_FONT_SIZE;
    var label_div = document.createElement('div');
    label_div.className = "switch-label";
    label_div.id = id + "-label";
    label_div.style.width = labelStr.length * fontSize;
//    label_div.style.marginTop = 0 - (img.y + fontSize) / 2;
    label_div.style.marginLeft = (img.x - labelStr.length * fontSize) / 2;
    var label_text = document.createTextNode(labelStr);
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
    peer_td.className = 'port-peer';
    peer_port_span.className = 'peer-port-name';
    peer_td.appendChild(peer_port_span);

    var peer_port = '';
    if (link.peer) {
      if (link.peer.dpid) {
        var peer = _DATA.switches[link.peer.dpid];
        if (peer) {
          if (peer.ports[link.peer.port_no]) {
            peer_port = peer.ports[link.peer.port_no].name;
          }
        }
      }
    }
    peer_port_span.innerHTML = peer_port;
    utils._repainteRows('link-list-table');
  },

  modifyLinkList: function(p1, p2) {
    var watching;
    var other;
    if (p1.dpid == _DATA.watching) {
      watching = _DATA.switches[p1.dpid].ports[p1.port_no];
      other = p2;
    } else if (p2.dpid == _DATA.watching) {
      watching = _DATA.switches[p2.dpid].ports[p2.port_no];
      other = p1;
    } else {
      return
    }

    id = conf.ID_PRE_LINK_LIST + watching.dpid + '-' + watching.port_no;

    if (Number(watching.peer.dpid) == Number(other.dpid)) {
      var peer_switch = _DATA.switches[other.dpid].name;
      var peer_port = _DATA.switches[other.dpid].ports[other.port_no].name;
      $("#" + id).find(".peer-port-name").text(peer_port);
      $("#" + id).find(".peer-switch-name").text('(' + peer_switch + ')');
    } else {
      $("#" + id).find(".peer-port-name").text('');
      $("#" + id).find(".peer-switch-name").text('');
    }
  },

  deleteLinkList: function(link) {
    if (link.dpid != _DATA.watching) return;
    var id = conf.ID_PRE_LINK_LIST + link.dpid + '-' + link.port_no;
    $('#' + id).remove();
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
    var overlays = null;
    if (Number(port_no) > 0) overlays = [["Label", {label: port_no + "",
                                                    location: 0.15,
                                                    cssClass: "port-no"}]];

//    var connector = 'StateMachine';
    var connector = 'Straight';
    var endpoint = 'Blank';
    var anchors = ["Center", "Center"];
    var click = function(conn) { topo.emMatchFlow([conn.sourceId, conn.targetId]) }
    var paintStyle = {"lineWidth": 3,
                      "strokeStyle": '#35FF35',
                      "outlineWidth": 0.5,
                      "outlineColor": '#AAA',
                      "dashstyle": "0 0 0 0"}

    var conn = jsPlumb.connect({source: s,
                                target: t,
                                endpoint: endpoint,
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
    if (dpid === false) {
      utils.clearFlowList();
      return
    }
    if (dpid != _DATA.watching) return;
    utils.clearFlowList()

    var list_table = document.getElementById("flow-list-table");
    for (var i in flows) {
      var tr = list_table.insertRow(-1);
      tr.className = 'content-table-item';
      tr.id = conf.ID_PRE_FLOW_LIST + dpid + '-' + i;
      var td = tr.insertCell(-1);
      td.className = 'flow';

      // stats
      var stats = document.createElement('div');
      stats.className = 'flow-item-line';
      td.appendChild(stats);
      var statsTitle = document.createElement('span');
      statsTitle.className = 'flow-item-title';
      statsTitle.innerHTML = 'stats:';
      stats.appendChild(statsTitle);
      var statsVal = document.createElement('span');
      statsVal.className = 'flow-item-value';
      statsVal.innerHTML = flows[i].stats;
      stats.appendChild(statsVal);

      // rules
      var rules = document.createElement('div');
      rules.className = 'flow-item-line';
      td.appendChild(rules);
      var rulesTitle = document.createElement('span');
      rulesTitle.className = 'flow-item-title';
      rulesTitle.innerHTML = 'rules:';
      rules.appendChild(rulesTitle);
      var rulesVal = document.createElement('span');
      rulesVal.className = 'flow-item-value';
      rulesVal.innerHTML = flows[i].rules;
      rules.appendChild(rulesVal);

      // actions
      var actions = document.createElement('div');
      actions.className = 'flow-item-line';
      td.appendChild(actions);
      var actionsTitle = document.createElement('span');
      actionsTitle.className = 'flow-item-title';
      actionsTitle.innerHTML = 'actions:';
      actions.appendChild(actionsTitle);
      var actionsVal = document.createElement('span');
      actionsVal.className = 'flow-item-value';
      actionsVal.innerHTML = flows[i].actions;
      actions.appendChild(actionsVal);

//      td.innerHTML = flows[i];
      utils._repainteRows('flow-list-table');
    }
  },

  topologyCleanup: function() {
    topo.watchingSwitch();
    jsPlumb.reset();
    $("#topology .switch").remove();
    _DATA.switches = {};
  }
};


///////////////////////////////////
//  rest
///////////////////////////////////
var rest = {
  getFlows: function(host, port, dpid, successfnc, errorfnc) {
    if (typeof errorfnc === "undefined") errorfnc = function(){return false}
    $.ajax({
      'type': 'POST',
      'url': conf.URL_GET_FLOWS,
      'data': {"host": host, "port": port, "dpid": dpid},
      'dataType': 'json',
      'success': successfnc,
      'error': errorfnc
    });
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
    if (msg.host != _DATA.input.host || msg.port != _DATA.input.port) return;

    if (msg.message == 'rest_disconnected') {
      utils.restDisconnected(msg.host, msg.port);
      return;
    }

    utils.restConnected(msg.host, msg.port);
    if (msg.message == 'add_switches') {
      for (var i in msg.body) {
        utils.registerEvent(websocket._addSwitch, msg.body[i]);
      };

    } else if (msg.message == 'del_switches') {
      for (var i in msg.body) {
        utils.registerEvent(websocket._delSwitch, msg.body[i]);
      };

    } else if (msg.message == 'add_ports') {
      utils.registerEvent(function(ports){
        for (var i in ports) websocket._addPort(ports[i]);
      }, msg.body)

    } else if (msg.message == 'del_ports') {
      utils.registerEvent(function(ports){
        for (var i in ports) websocket._delPort(ports[i]);
      }, msg.body)

    } else if (msg.message == 'add_links') {
      for (var i in msg.body) {
        utils.registerEvent(websocket._addLink, msg.body[i]);
      };

    } else if (msg.message == 'del_links') {
      for (var i in msg.body) {
        utils.registerEvent(websocket._delLink, msg.body[i]);
      };

    } else if (msg.message == 'replace_flows') {
      utils.registerEvent(websocket._replaceFlows, msg.body);
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
    msg.body = {};
    msg.body.host = host;
    msg.body.port = port;
    websocket._sendMessage(msg);
  },

  sendWatchingSwitch: function(dpid){
    msg = {};
    msg.message = "watching_switch_update";
    msg.body = {};
    msg.body.dpid = dpid;
    websocket._sendMessage(msg);
  },

  ////////////
  // recive messages
  ////////////
  _addSwitch: function(body) {
    if (_DATA.switches[body.dpid]) return;
    _DATA.switches[body.dpid] = body;
    topo.redesignTopology();
  },

  _delSwitch: function(body) {
    if (_DATA.watching == body.dpid) topo.watchingSwitch();

    utils.delSwitch(body.dpid)

    for (var s in _DATA.switches) {
      for (var p in _DATA.switches[s].ports) {
        var port = _DATA.switches[s].ports[p];
        if (port.peer.dpid == body.dpid) {
          _DATA.switches[s].ports[p].peer = {};
          utils.modifyLinkList(body, port);
        }
      }
    }
    delete _DATA.switches[body.dpid]
    topo.redesignTopology();
  },

  _addPort: function(body) {
    if (_DATA.switches[body.dpid]) _DATA.switches[body.dpid].ports[body.port_no] = body;
    utils.appendLinkList(body);
  },

  _delPort: function(body) {
    // delete link list
    utils.deleteLinkList(body);

    // delete connect and memory
    for (var s in _DATA.switches) {
      for (var p in _DATA.switches[s].ports) {
        var port = _DATA.switches[s].ports[p];
        if (port.peer.dpid == body.dpid && port.peer.port_no == body.port_no) {
          utils.delConnect(port, port.peer);
          _DATA.switches[s].ports[p].peer = {};
          break;
        }
      }
    }
    delete _DATA.switches[body.dpid].ports[body.port_no];
  },

  _addLink: function(body) {
    _DATA.switches[body.p1.dpid].ports[body.p1.port_no].peer = body.p2;
    _DATA.switches[body.p2.dpid].ports[body.p2.port_no].peer = body.p1;
    utils.addConnect(body.p1, body.p2);
    utils.modifyLinkList(body.p1, body.p2);
  },

  _delLink: function(body) {
    _DATA.switches[body.p1.dpid].ports[body.p1.port_no].peer = {};
    _DATA.switches[body.p2.dpid].ports[body.p2.port_no].peer = {};
    utils.delConnect(body.p1, body.p2);
    utils.modifyLinkList(body.p1, body.p2);
  },

  _replaceFlows: function(body) {
    utils.replaceFlowList(body.dpid, body.flows);
  }
};
