from operator import attrgetter

from ryu.app import simple_switch_13
from ryu.controller import ofp_event
from ryu.controller.handler import MAIN_DISPATCHER, DEAD_DISPATCHER
from ryu.controller.handler import set_ev_cls
from ryu.lib import hub

from ryu.app.event_message import EventMessage
from ryu.topology.api import get_switch, get_link, get_host
import json

from ryu.topology import event, switches
from ryu.lib.port_no import str_to_port_no
from ryu.lib.dpid import str_to_dpid

from ryu.app.wsgi import ControllerBase, WSGIApplication, route
from webob import Response
import re
from ryu.app.wsgi import (
    ControllerBase,
    WSGIApplication,
    websocket,
    WebSocketRPCClient
)

class SimpleMonitor(simple_switch_13.SimpleSwitch13):
    _CONTEXTS = {
        'wsgi': WSGIApplication,
        'switches': switches.Switches,
    }

    _EVENTS = [EventMessage]
    BANDWIDTH_LIMIT = 1024*1024*1024
    REQ_INTERVAL = 5

    def __init__(self, *args, **kwargs):
        super(SimpleMonitor, self).__init__(*args, **kwargs)
        self.datapaths = {}
        self.monitor_thread = hub.spawn(self._monitor)
        self.lastState = {}
        self.swPort_to_mac = {}
        self.border_mac = set()

        wsgi = kwargs['wsgi']
        wsgi.register(ResponseController, {'response_app': self})

    @set_ev_cls(ofp_event.EventOFPStateChange,
                [MAIN_DISPATCHER, DEAD_DISPATCHER])
    def _state_change_handler(self, ev):
        datapath = ev.datapath
        if ev.state == MAIN_DISPATCHER:
            if not datapath.id in self.datapaths:
                self.logger.debug('register datapath: %016x', datapath.id)
                self.datapaths[datapath.id] = datapath
        elif ev.state == DEAD_DISPATCHER:
            if datapath.id in self.datapaths:
                self.logger.debug('unregister datapath: %016x', datapath.id)
                del self.datapaths[datapath.id]

    @set_ev_cls(event.EventSwitchEnter)
    def _event_switch_enter_handler(self, ev):
        msg = ev.switch.to_dict()
        dpid = str_to_dpid(msg['dpid'])
        self.swPort_to_mac.setdefault(dpid, {})
        for port in msg['ports']:
            port_no = str_to_port_no(port['port_no'])
            self.swPort_to_mac[dpid][port_no] = port['hw_addr']
            self.border_mac.add(port['hw_addr'])

    @set_ev_cls(event.EventSwitchLeave)
    def _event_switch_leave_handler(self, ev):
        msg = ev.switch.to_dict()
        # add port if not in border_mac
        # del port if in border_mac

    @set_ev_cls(event.EventLinkAdd)
    def _event_link_add_handler(self, ev):
        msg = ev.link.to_dict()
        src_dpid = str_to_dpid(msg['src']['dpid'])
        dst_dpid = str_to_dpid(msg['dst']['dpid'])
        if src_dpid < dst_dpid:
            src_hw_addr = msg['src']['hw_addr']
            dst_hw_addr = msg['dst']['hw_addr']
            if src_hw_addr in self.border_mac:
                self.border_mac.remove(src_hw_addr)
            if dst_hw_addr in self.border_mac:
                self.border_mac.remove(dst_hw_addr)

    @set_ev_cls(event.EventLinkDelete)
    def _event_link_delete_handler(self, ev):
        msg = ev.link.to_dict()
        # do nothing

    def _monitor(self):
        while True:
            for dp in self.datapaths.values():
                self._request_stats(dp)
            hub.sleep(SimpleMonitor.REQ_INTERVAL)

            # try to create a topo graph
            # hosts = get_host(self)
            # body = json.dumps([host.to_dict() for host in hosts])
            # print body

            print "*******************  border_mac  *****************************"
            print self.border_mac

            # send event to observers
            # this is a testing event, which will be caught by ws_topology app

    def _request_stats(self, datapath):
        self.logger.debug('send stats request: %016x', datapath.id)
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser

        req = parser.OFPFlowStatsRequest(datapath)
        datapath.send_msg(req)

        req = parser.OFPPortStatsRequest(datapath, 0, ofproto.OFPP_ANY)
        datapath.send_msg(req)

    @set_ev_cls(ofp_event.EventOFPFlowStatsReply, MAIN_DISPATCHER)
    def _flow_stats_reply_handler(self, ev):
        body = ev.msg.body
        # print "****************** flow state body ****************************"
        # print body

        self.logger.info('datapath         '
                         'in-port  eth-dst           '
                         'out-port packets  bytes')
        self.logger.info('---------------- '
                         '-------- ----------------- '
                         '-------- -------- --------')
        # list conprehension
        for stat in sorted([flow for flow in body if flow.priority == 1],
                           key=lambda flow: (flow.match['in_port'],
                                             flow.match['eth_dst'])):
            self.logger.info('%016x %8x %17s %8x %8d %8d',
                             ev.msg.datapath.id,
                             stat.match['in_port'], stat.match['eth_dst'],
                             stat.instructions[0].actions[0].port,
                             stat.packet_count, stat.byte_count)

        # detect warning bandwidth    
        msg = ev.msg
        dpid = msg.datapath.id
        datapath = self.datapaths[dpid]
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        for stat in sorted([flow for flow in body if flow.priority == 1],
                           key=lambda flow: (flow.match['in_port'],
                                             flow.match['eth_dst'])):
            key = "%d, %d:%d" % (dpid, stat.match['in_port'], stat.instructions[0].actions[0].port)
            if key in self.lastState:
                if (stat.byte_count-self.lastState[key])//SimpleMonitor.REQ_INTERVAL>SimpleMonitor.BANDWIDTH_LIMIT:
                    # send Message to websocket
                    print "Exceed warning bandwidth at %016x %s %13s B => %13s B" % (ev.msg.datapath.id, key, self.lastState[key], stat.byte_count)

                    # send modflow to dpid => try drop all packets recv from in_port
                    in_port = stat.match['in_port']
                    inport_mac = self.swPort_to_mac[dpid][in_port]
                    # drop only in the border switch
                    if inport_mac in self.border_mac:
                        match = parser.OFPMatch(in_port=stat.match['in_port'])
                        actions = []
                        super(SimpleMonitor, self).add_flow(datapath=datapath, priority=2, match=match, actions=actions, idle_timeout=10)
                        # send message to ws
                        ev_msg = {'dpid': dpid, 'inport_mac': inport_mac}
                        event = EventMessage(ev_msg)
                        self.send_event_to_observers(event)
                        # show warning message on console
                        print "Drop dpid: %d, in_port %d" % (dpid, in_port)
            # if key in self.lastState:
                # print self.lastState[key], "   ", stat.byte_count
            self.lastState[key] = stat.byte_count

    @set_ev_cls(ofp_event.EventOFPPortStatsReply, MAIN_DISPATCHER)
    def _port_stats_reply_handler(self, ev):
        body = ev.msg.body
        print "****************** port state body ****************************"
        print body

        self.logger.info('datapath         port     '
                         'rx-pkts  rx-bytes rx-error '
                         'tx-pkts  tx-bytes tx-error')
        self.logger.info('---------------- -------- '
                         '-------- -------- -------- '
                         '-------- -------- --------')
        for stat in sorted(body, key=attrgetter('port_no')):
            self.logger.info('%016x %8x %8d %8d %8d %8d %8d %8d', 
                             ev.msg.datapath.id, stat.port_no,
                             stat.rx_packets, stat.rx_bytes, stat.rx_errors,
                             stat.tx_packets, stat.tx_bytes, stat.tx_errors)

class ResponseController(ControllerBase):
    def __init__(self, req, link, data, **config):
        super(ResponseController, self).__init__(req, link, data, **config)
        self.response_app = data['response_app']

    @route('response', '/SWstate/{src}/{dst}', methods=['GET'])
    def list_switches(self, req, **kwargs):
        src = kwargs['src']
        dst = kwargs['dst']
        hosts = get_host(self.response_app)
        src_host = next((x for x in hosts if x.ipv4[0] == src), None)
        dst_host = next((x for x in hosts if x.ipv4[0] == dst), None)
        if src_host is None:
            return Response(content_type='application/json', body="Wrong Src")
        if dst_host is None:
            return Response(content_type='application/json', body="Wrong Dst")
        path = []
        regex = re.compile(r'[0-9]?[0-9]?[0-9].[0-9]?[0-9]?[0-9].[0-9]?[0-9]?[0-9].[0-9]?[0-9]?[0-9]')
        next_dpid = src_host.port.dpid
        path.append(next_dpid)
        body = json.dumps(next_dpid)
        return Response(content_type='application/json', body=body)

	@route('response', '/check', methods=['GET'])
	def check(self, req, **kwargs):
		return Response(content_type='application/json', body='check message')
