var CONF = {
};


var disp = {
  input: {}
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

    // drag
    $('#menu').draggable({ handle: '#menum .titlebar' });
    $('#link-list').draggable({ handle: '#link-list, .titlebar' });
    $('#flow-list').draggable({ handle: '#flow-list, .titlebar' });

    // resize
    $("#menu").resizable( { autoHide : true } );
    $("#topology").resizable( { autoHide : true } );
    $("#flow-list").resizable( { autoHide : true } );
    $("#link-list").resizable( { autoHide : true } );

    // open / close
//    $(".titlebar").dblclick(function(){ topo.contentOpenClose(this) });

    // scrollbar
//    $('#menu-body').jScrollPane();
//    $('#flow-list-body').jScrollPane();
//    $('#link-list-body').jScrollPane({showArrows: true, verticalGutter: 5});

    // Menu
    $('#menu a div').hover(
      function(){ topo.menuMouseOver(this); },
      function(){ topo.menuMouseOut(this); }
    );

    // input frame
    $('#jquery-ui-dialog-opener').click(function(){
      topo.input_dialog.dialog('open');
    });

  },

  init: function(){
    // open input dialog
    topo.input_dialog.dialog('open');
  },

  setInput: function(host, port) {
    disp.input.host = host;
    disp.input.port = port;
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

  contentOpenClose: function(el){
    var body = $("#" + $(el).parent("div").attr("id") + "-body");
    if (body.css("display") == "none") {
      body.css("display", "block");
    } else {
      body.css("display", "none");
    }
  }
};

var websocket = {
  onsend: function(ev) {
//    alert(JSON.stringify(ev));
    ws.send(JSON.stringify(ev));
  },

  onmessage: function(ev) {
    msg = JSON.parse(ev);
//    alert('receive:' + msg.event);

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
    disp.input = body;
    topo.input_dialog.dialog('open');
  },

  _add_switch: function(body) {
    alert('TODO:: add_switch');
  },
  _del_switch: function(body) {
    alert('TODO:: del_switch');
  },
  _add_port: function(body) {
    alert('TODO:: add_port');
  },
  _del_port: function(body) {
    alert('TODO:: del_port');
  },
  _add_link: function(body) {
    alert('TODO:: add_link');
  },
  _del_link: function(body) {
    alert('TODO:: del_link');
  }
};
