from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import CONFIG_DISPATCHER, MAIN_DISPATCHER, DEAD_DISPATCHER
from ryu.controller.handler import set_ev_cls
from ryu.ofproto import ofproto_v1_3
from ryu.lib.packet import packet
from ryu.lib.packet import ethernet
from ryu.lib.packet import ether_types

from operator import attrgetter

from ryu.lib import hub

from ryu.app.port_message import PortMessage
from ryu.topology.api import get_switch, get_link, get_host
import json

from ryu.topology import event, switches
from ryu.lib.port_no import str_to_port_no
from ryu.lib.dpid import str_to_dpid, dpid_to_str

import datetime, time

from ryu.app.wsgi import ControllerBase, WSGIApplication, route
from webob import Response
import re
from ryu.app.wsgi import (
    ControllerBase,
    WSGIApplication,
    websocket,
    WebSocketRPCClient
)

class SimpleMonitor(app_manager.RyuApp):
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]
    _CONTEXTS = {
        'wsgi': WSGIApplication,
        'switches': switches.Switches,
    }

    _EVENTS = [PortMessage]
    BANDWIDTH_LIMIT = 1024*1024*1024
    PORT_REQ_INTERVAL = 5
    DPI_REQ_INTERVAL = 5

    def __init__(self, *args, **kwargs):
        super(SimpleMonitor, self).__init__(*args, **kwargs)
        self.mac_to_port = {}
        self.datapaths = {}
        self.monitor_thread = hub.spawn(self._port_monitor)
        self.dpi_thread = hub.spawn(self._dpi_monitor)
        self.lastState = {}
        # switch port_no to port mac
        self.swPort_to_mac = {}
        # dpid with port no to next dpid
        self.swPort_to_dpid = {}
        self.border_mac = set()

        self.dpi_info = {'mac': None, 'port_no': None, 'dpid': None, 'name': None}

        wsgi = kwargs['wsgi']
        wsgi.register(ResponseController, {'response_app': self})

    ############################################
    ## clone from simple_switch_13 and modify ##
    ############################################

    @set_ev_cls(ofp_event.EventOFPSwitchFeatures, CONFIG_DISPATCHER)
    def switch_features_handler(self, ev):
        datapath = ev.msg.datapath
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser

        # install table-miss flow entry
        #
        # We specify NO BUFFER to max_len of the output action due to
        # OVS bug. At this moment, if we specify a lesser number, e.g.,
        # 128, OVS will send Packet-In with invalid buffer_id and
        # truncated packet data. In that case, we cannot output packets
        # correctly.  The bug has been fixed in OVS v2.1.0.
        match = parser.OFPMatch()
        actions = [parser.OFPActionOutput(ofproto.OFPP_CONTROLLER,
                                          ofproto.OFPCML_NO_BUFFER)]
        self.add_flow(datapath, 0, match, actions)

    def add_flow(self, datapath, priority, match, actions, buffer_id=None, idle_timeout=None):
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser

        inst = [parser.OFPInstructionActions(ofproto.OFPIT_APPLY_ACTIONS,
                                             actions)]
        if buffer_id:
            mod = parser.OFPFlowMod(datapath=datapath, buffer_id=buffer_id,
                                    priority=priority, match=match,
                                    instructions=inst)
        elif idle_timeout:
            mod = parser.OFPFlowMod(datapath=datapath, priority=priority,
                                    match=match, instructions=inst, idle_timeout=idle_timeout, flags=ofproto.OFPFF_SEND_FLOW_REM)
        else:
            mod = parser.OFPFlowMod(datapath=datapath, priority=priority,
                                    match=match, instructions=inst)
        datapath.send_msg(mod)

    @set_ev_cls(ofp_event.EventOFPPacketIn, MAIN_DISPATCHER)
    def _packet_in_handler(self, ev):
        # If you hit this you might want to increase
        # the "miss_send_length" of your switch
        if ev.msg.msg_len < ev.msg.total_len:
            self.logger.debug("packet truncated: only %s of %s bytes",
                              ev.msg.msg_len, ev.msg.total_len)
        msg = ev.msg
        datapath = msg.datapath
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        in_port = msg.match['in_port']

        pkt = packet.Packet(msg.data)
        eth = pkt.get_protocols(ethernet.ethernet)[0]

        if eth.ethertype == ether_types.ETH_TYPE_LLDP:
            # ignore lldp packet
            return
        dst = eth.dst
        src = eth.src

        dpid = datapath.id
        self.mac_to_port.setdefault(dpid, {})

        # self.logger.info("packet in %s %s %s %s", dpid, src, dst, in_port)

        # learn a mac address to avoid FLOOD next time.
        self.mac_to_port[dpid][src] = in_port

        if dst in self.mac_to_port[dpid]:
            out_port = self.mac_to_port[dpid][dst]
        else:
            out_port = ofproto.OFPP_FLOOD

        if self.dpi_info['port_no']:
            actions = [parser.OFPActionOutput(out_port), parser.OFPActionOutput(int(self.dpi_info['port_no']))]
        else:
            actions = [parser.OFPActionOutput(out_port)]

        # install a flow to avoid packet_in next time
        if out_port != ofproto.OFPP_FLOOD:
            match = parser.OFPMatch(in_port=in_port, eth_dst=dst)
            # verify if we have a valid buffer_id, if yes avoid to send both
            # flow_mod & packet_out
            if msg.buffer_id != ofproto.OFP_NO_BUFFER:
                self.add_flow(datapath, 1, match, actions, msg.buffer_id)
                return
            else:
                self.add_flow(datapath, 1, match, actions)
        data = None
        if msg.buffer_id == ofproto.OFP_NO_BUFFER:
            data = msg.data

        out = parser.OFPPacketOut(datapath=datapath, buffer_id=msg.buffer_id,
                                  in_port=in_port, actions=actions, data=data)
        
        datapath.send_msg(out)

    # XXX: Can't handle mod flow very well.
    # This function will del all flows from the table currently.
    def del_flows(self, datapath, match, strict=False):
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        cmd = ofproto.OFPFC_DELETE
        if strict:
            cmd = ofproto.OFPFC_DELETE_STRICT

        mod = parser.OFPFlowMod(datapath=datapath,
                                command=cmd,
                                match=match,out_port=ofproto.OFPP_ANY, out_group=ofproto.OFPG_ANY)
        datapath.send_msg(mod)

    ###################
    ## handle events ##
    ###################

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
        self.swPort_to_dpid.setdefault(dpid, {})
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

        ## border dpid detection
        if src_dpid < dst_dpid:
            src_hw_addr = msg['src']['hw_addr']
            dst_hw_addr = msg['dst']['hw_addr']
            if src_hw_addr in self.border_mac:
                self.border_mac.remove(src_hw_addr)
            if dst_hw_addr in self.border_mac:
                self.border_mac.remove(dst_hw_addr)

        ## create swPort_to_dpid
        self.swPort_to_dpid[src_dpid][int(msg['src']['port_no'])] = dst_dpid

    @set_ev_cls(event.EventLinkDelete)
    def _event_link_delete_handler(self, ev):
        msg = ev.link.to_dict()
        # do nothing

    #############
    ## Monitor ##
    #############

    def _port_monitor(self):
        while True:
            for dp in self.datapaths.values():
                self._request_stats(dp)
            hub.sleep(SimpleMonitor.PORT_REQ_INTERVAL)

            # try to create a topo graph
            # hosts = get_host(self)
            # body = json.dumps([host.to_dict() for host in hosts])
            # print body

            # print "*******************  border_mac  *****************************"
            # print self.border_mac

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

        # self.logger.info('datapath         '
                         # 'in-port  eth-dst           '
                         # 'out-port packets  bytes')
        # self.logger.info('---------------- '
                         # '-------- ----------------- '
                         # '-------- -------- --------')
        # # list conprehension
        # for stat in sorted([flow for flow in body if flow.priority == 1],
                           # key=lambda flow: (flow.match['in_port'],
                                             # flow.match['eth_dst'])):
            # self.logger.info('%016x %8x %17s %8x %8d %8d',
                             # ev.msg.datapath.id,
                             # stat.match['in_port'], stat.match['eth_dst'],
                             # stat.instructions[0].actions[0].port,
                             # stat.packet_count, stat.byte_count)

        # detect warning bandwidth    
        msg = ev.msg
        dpid = msg.datapath.id
        datapath = self.datapaths[dpid]
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        # for stat in sorted([flow for flow in body if flow.priority == 1],
                           # key=lambda flow: (flow.match['in_port'],
                                             # flow.match['eth_dst'])):
            # key = "%d, %d:%d" % (dpid, stat.match['in_port'], stat.instructions[0].actions[0].port)
            # if key in self.lastState:
                # if (stat.byte_count-self.lastState[key])//SimpleMonitor.PORT_REQ_INTERVAL>SimpleMonitor.BANDWIDTH_LIMIT:
                    # # send Message to websocket
                    # print "Exceed warning bandwidth at %016x %s %13s B => %13s B" % (ev.msg.datapath.id, key, self.lastState[key], stat.byte_count)

                    # # send modflow to dpid => try drop all packets recv from in_port
                    # in_port = stat.match['in_port']
                    # inport_mac = self.swPort_to_mac[dpid][in_port]
                    # # drop only in the border switch
                    # if inport_mac in self.border_mac:
                        # match = parser.OFPMatch(in_port=stat.match['in_port'])
                        # actions = []
                        # super(SimpleMonitor, self).add_flow(datapath=datapath, priority=2, match=match, actions=actions, idle_timeout=10)
                        # # send message to ws
                        # ev_msg = {'dpid': dpid, 'inport_mac': inport_mac}
                        # event = EventMessage(ev_msg)
                        # self.send_event_to_observers(event)
                        # # show warning message on console
                        # print "Drop dpid: %d, in_port %d" % (dpid, in_port)
            # # if key in self.lastState:
                # # print self.lastState[key], "   ", stat.byte_count
            # self.lastState[key] = stat.byte_count

    @set_ev_cls(ofp_event.EventOFPPortStatsReply, MAIN_DISPATCHER)
    def _port_stats_reply_handler(self, ev):
        body = ev.msg.body
        # print "****************** port state body ****************************"
        # print "check dpid " + dpid_to_str(ev.msg.datapath.id).lstrip('0')
        # print body

        # self.logger.info('datapath         port     '
                         # 'rx-pkts  rx-bytes rx-error '
                         # 'tx-pkts  tx-bytes tx-error')
        # self.logger.info('---------------- -------- '
                         # '-------- -------- -------- '
                         # '-------- -------- --------')
        # for stat in sorted(body, key=attrgetter('port_no')):
            # self.logger.info('%016x %8x %8d %8d %8d %8d %8d %8d', 
                             # ev.msg.datapath.id, stat.port_no,
                             # stat.rx_packets, stat.rx_bytes, stat.rx_errors,
                             # stat.tx_packets, stat.tx_bytes, stat.tx_errors)


        # get port traffic info.
        # XXX: not consider overflow condition yet. 
        # Openflow 1.3 use counter that is wrap around with no overflow indicator. 
        dpid = dpid_to_str(ev.msg.datapath.id).lstrip('0')
        d = datetime.datetime.utcnow()
        ts_for_js = int(time.mktime(d.timetuple())) * 1000
        ev_msg = {'dpid': dpid, 'port_info': [], 'ts': ts_for_js}
        for stat in sorted(body, key=attrgetter('port_no')):
            ev_msg['port_info'].append({'port_no': stat.port_no,
                                        'rx_pkt': stat.rx_packets, 'rx_byte': stat.rx_bytes,
                                        'tx_pkt': stat.tx_packets, 'tx_byte': stat.tx_bytes})
        event = PortMessage(ev_msg)
        self.send_event_to_observers(event)

    def _dpi_monitor(self):
        """
        Send dpi request to server peroidically.
        Period = DPI_REQ_INTERVAL (default value is 5)
        """
        while True:
            # TODO: send a REST request to DPI server
            hub.sleep(SimpleMonitor.DPI_REQ_INTERVAL)
            pass


class ResponseController(ControllerBase):
    def __init__(self, req, link, data, **config):
        super(ResponseController, self).__init__(req, link, data, **config)
        self.response_app = data['response_app']

    @route('response', '/SWstate/{src}/{dst}', methods=['GET'])
    def list_switches(self, req, **kwargs):
        # TODO: consider internet ip location

        src = kwargs['src']
        dst = kwargs['dst']
        hosts = get_host(self.response_app)

        ## find the first matching obj in the list
        src_host = next((x for x in hosts if x.ipv4[0] == src), None)
        dst_host = next((x for x in hosts if x.ipv4[0] == dst), None)
        if src_host is None:
            return Response(content_type='text/plain', body="Wrong Src")
        if dst_host is None:
            return Response(content_type='text/plain', body="Wrong Dst")
        dst_mac = dst_host.mac

        ## create path from src to dst
        # find the first dpid connecting to the host
        path = []
        next_dpid = src_host.port.dpid

        while True:
            path.append(next_dpid)
            # hop all dp on the path
            out_port = self.response_app.mac_to_port[next_dpid][dst_mac]
            next_dpid = self.response_app.swPort_to_dpid[next_dpid].get(out_port)
            if next_dpid is None:
                break

        # print "check swPort_to_dpid ------"
        # print self.response_app.swPort_to_dpid

        body = json.dumps(path)
        return Response(content_type='application/json', body=body)

    @route('dpi_init', '/dpi/connect/{hw_addr}',
            methods=['GET'], requirements={'hw_addr': r'([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})'})
    def dpi_init(self, req, **kwargs):
        if self.response_app.dpi_info['mac']:
            return "DPI_ALREADY_EXIST"
        else:
            for host in get_host(self.response_app):
                host_dict = host.to_dict()
                #print host_dict['mac'] + "     " + kwargs['hw_addr'] # debug - check all compare mac pairs
                if host_dict['mac'] == kwargs['hw_addr']:
                    self.response_app.dpi_info['dpid'] = host_dict['port']['dpid']
                    self.response_app.dpi_info['port_no'] = host_dict['port']['port_no']
                    self.response_app.dpi_info['name'] = host_dict['port']['name']
                    break
            else:
                print "DPI server not found??!"
                return "DPI_INIT_FAIL"

        self.response_app.dpi_info['mac']= kwargs['hw_addr']
        for dp in self.response_app.datapaths.values():
            ofproto = dp.ofproto
            parser = dp.ofproto_parser
            match = parser.OFPMatch()
            # remove all flows
            self.response_app.del_flows(dp, match)
            # add table miss
            actions = [parser.OFPActionOutput(ofproto.OFPP_CONTROLLER,
                                          ofproto.OFPCML_NO_BUFFER)]
            inst = [parser.OFPInstructionActions(ofproto.OFPIT_APPLY_ACTIONS, actions)]
            self.response_app.add_flow(dp, 0, match, actions)

        return "DPI_INIT_OK"
