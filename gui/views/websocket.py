import logging
import gevent
import json
from flask import g, request

import view_base

LOG = logging.getLogger('ryu.gui')


class EventBase(dict):
    def __init__(self):
        super(EventBase, self).__init__()
        self['event'] = self.__class__.__name__
        self['body'] = {}

    def set_body(self, **body):
        for name, value in body.items():
            self['body'][name] = value


class EventAddSwitch(EventBase):
    def __init__(self):
        super(EventAddSwitch, self).__init__()


class EventDelSwitch(EventBase):
    def __init__(self):
        super(EventDelSwitch, self).__init__()


class EventAddPort(EventBase):
    def __init__(self):
        super(EventAddPort, self).__init__()


class EventDelPort(EventBase):
    def __init__(self):
        super(EventDelPort, self).__init__()


class EventAddLink(EventBase):
    def __init__(self):
        super(EventAddLink, self).__init__()


class EventDelLink(EventBase):
    def __init__(self):
        super(EventDelLink, self).__init__()


class EventRestConnectErr(EventBase):
    def __init__(self):
        super(EventRestConnectErr, self).__init__()


class WebsocketView(view_base.ViewBase):
    def __init__(self, ws):
        super(WebsocketView, self).__init__()
        self.ws = ws
        self.discovery = None

    def run(self):
        LOG.info('Websocket: connected')
        self.discovery = TopologyDiscovery(self.ws)
        while True:
            msg = self.ws.receive()
            if msg is not None:
                self._received(msg)
            else:
                self.discovery.is_active = False
                break

        self.ws.close()
        LOG.info('Websocket: closed.')
        return self.null_response()

    def _received(self, msg):
        LOG.debug('Websocket: received %s', msg)
        try:
            ev = json.loads(msg)
        except:
            LOG.debug("json parse error: %s", msg)
            return

        event = ev.get('event')
        body = ev.get('body')
        if event == 'EventRestUrl':
            self._connect_to_controller(body)
        else:
            return

    def _connect_to_controller(self, body):
        host = body.get('host')
        port = body.get('port')
        err = None
        if not (host and port):
            err = 'Please note that all fields.'
        elif not self.discovery.connect(host, port):
            err = 'Could not connect to REST API.'

        if err is not None:
            ev = EventRestConnectErr()
            ev.set_body(host=host, port=port, err=err)
            self.discovery.send_event(ev)
            return

        self.discovery.is_active = True
        self.discovery.start()


class TopologyDiscovery(object):
    def __init__(self, ws):
        self.ws = ws
        self.is_active = False
        self.model = None
    
    def connect(self, host, port):
        # TODO get model
        self.model = {}
        LOG.debug("REST connected. %s:%s", host, port)
        return True

    def start(self):
        dpid = 1
        while self.is_active:
            if self.is_active:
                ev = EventAddSwitch()
                name = 's' + str(dpid)
                ports = [1, 2, 3, 4]
                ev.set_body(dpid=dpid, name=name, ports=ports)
                self.send_event(ev)
                dpid += 1
            gevent.sleep(10)

    def send_event(self, ev):
        LOG.debug("Websocket: send msg. %s", ev)
        self.ws.send(json.dumps(ev))
