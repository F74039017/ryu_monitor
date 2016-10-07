var CONF = {
    image: {
        width: 50,
        height: 40
    },
    force: {
        width: 960,
        height: 500,
        dist: 200,
        charge: -600
    }
};

var ws = new WebSocket("ws://" + location.host + "/v1.0/topology/ws");
ws.onmessage = function(event) {
    var data = JSON.parse(event.data);

    var result = rpc[data.method](data.params);

    var ret = {"id": data.id, "jsonrpc": "2.0", "result": result};
    this.send(JSON.stringify(ret));
}

function trim_zero(obj) {
    return String(obj).replace(/^0+/, "");
}

function dpid_to_int(dpid) {
    return Number("0x" + dpid);
}


function is_valid_link(link) {
    return (link.src.dpid < link.dst.dpid)
}

var topo = {
    nodes: [],
    links: [],
    node_index: {}, // dpid -> index of nodes array
    initialize: function (data) {
        this.add_nodes(data.switches);
        this.add_links(data.links);
    },
    add_nodes: function (nodes) {
        for (var i = 0; i < nodes.length; i++) {
            this.nodes.push(nodes[i]);
        }
        this.refresh_node_index();
		// console.log(nodes); // debug
    },
    add_links: function (links) {
        for (var i = 0; i < links.length; i++) {
            if (!is_valid_link(links[i])) continue;
            // console.log("add link: " + JSON.stringify(links[i]));

            var src_dpid = links[i].src.dpid;
            var dst_dpid = links[i].dst.dpid;
            var src_index = this.node_index[src_dpid];
            var dst_index = this.node_index[dst_dpid];
            var link = {
                source: src_index,
                target: dst_index,
                port: {
                    src: links[i].src,
                    dst: links[i].dst
                }
            }
            this.links.push(link);
        }
    },
    delete_nodes: function (nodes) {
        for (var i = 0; i < nodes.length; i++) {
            console.log("delete switch: " + JSON.stringify(nodes[i]));

            node_index = this.get_node_index(nodes[i]);
            this.nodes.splice(node_index, 1);
        }
        this.refresh_node_index();
    },
    delete_links: function (links) {
        for (var i = 0; i < links.length; i++) {
            if (!is_valid_link(links[i])) continue;
            console.log("delete link: " + JSON.stringify(links[i]));

            link_index = this.get_link_index(links[i]);
            this.links.splice(link_index, 1);
        }
    },
    get_node_index: function (node) {
        for (var i = 0; i < this.nodes.length; i++) {
            if (node.dpid == this.nodes[i].dpid) {
                return i;
            }
        }
        return null;
    },
    get_link_index: function (link) {
        for (var i = 0; i < this.links.length; i++) {
            if (link.src.dpid == this.links[i].port.src.dpid &&
                    link.src.port_no == this.links[i].port.src.port_no &&
                    link.dst.dpid == this.links[i].port.dst.dpid &&
                    link.dst.port_no == this.links[i].port.dst.port_no) {
                return i;
            }
        }
        return null;
    },
    get_ports: function () {
        var ports = [];
        var pushed = {};
        for (var i = 0; i < this.links.length; i++) {
            function _push(p, dir) {
                key = p.dpid + ":" + p.port_no;
                if (key in pushed) {
                    return 0;
                }

                pushed[key] = true;
                p.link_idx = i;
                p.link_dir = dir;
                return ports.push(p);
            }
            _push(this.links[i].port.src, "source");
            _push(this.links[i].port.dst, "target");
        }

        return ports;
    },
    get_port_point: function (d) {
        var weight = 0.88;

        var link = this.links[d.link_idx];
        var x1 = link.source.x;
        var y1 = link.source.y;
        var x2 = link.target.x;
        var y2 = link.target.y;

        if (d.link_dir == "target") weight = 1.0 - weight;

        var x = x1 * weight + x2 * (1.0 - weight);
        var y = y1 * weight + y2 * (1.0 - weight);

        return {x: x, y: y};
    },
    refresh_node_index: function(){
        this.node_index = {};
        for (var i = 0; i < this.nodes.length; i++) {
            this.node_index[this.nodes[i].dpid] = i;
        }
    },
}

var rpc = {
    event_switch_enter: function (params) {
        var switches = [];
        for(var i=0; i < params.length; i++){
            switches.push({"dpid":params[i].dpid,"ports":params[i].ports});
        }
        topo.add_nodes(switches);
        //elem.update(); //++ create a outer function with callback => combine vis and update
        return "";
    },
    event_switch_leave: function (params) {
        var switches = [];
        for(var i=0; i < params.length; i++){
            switches.push({"dpid":params[i].dpid,"ports":params[i].ports});
        }
        topo.delete_nodes(switches);
        //elem.update();
        return "";
    },
    event_link_add: function (links) {
        topo.add_links(links);
        //elem.update();
        return "";
    },
    event_link_delete: function (links) {
        topo.delete_links(links);
        //elem.update();
        return "";
    },
	event_port_info: function(data) {
		//console.log("port_info message");
		//console.log(JSON.stringify(data));
		//console.log(JSON.stringify(data[0]));
		return "";
	},
	event_dpi_info: function(data) {
		//console.log("dpi info message");
		//console.log(JSON.stringify(data));
		//console.log(JSON.stringify(data[0]));
		if(dv_oper.live_chart && dv_oper.live_chart.livedpi) {
			console.log("send dpi");
			dv_oper.live_chart.livedpi(data[0]);
		}
		else {
			console.log("opps");
		}
		return "";
	},
}

function initialize_topology(callback) {
    d3.json("/v1.0/topology/switches", function(error, switches) {
        d3.json("/v1.0/topology/links", function(error, links) {
            d3.json("/v1.0/topology/hosts", function(error, hosts) {
                topo.initialize({switches: switches, links: links});
                console.log(hosts);
				console.log(links);
                console.log(switches);
				console.log(topo);
                //elem.update();
                netdata.update(hosts);
                //console.log("init netdata => callback netJsonGraph");
                console.log(JSON.stringify(netdata));
                callback(netdata); // callback netJsonGraph
            });
        });
    });
}

window.dv_oper = {};
function main(callback) { // pass callbacks
	var netjsongraph = callback.netjsongraph;
	if(netjsongraph) {
		initialize_topology(netjsongraph);
	}
	else {
		console.log("netjsongraph callback error!");
	}
}

//main(); // to conbime netJsonGraph and topo data => call in index.html js with callback

/* helper function for netdata */
function trimInt(x) {
	return parseInt(trim_zero(x));
}
/* netjson */
var netdata = {
	update: function(hosts) {
		topo.nodes.forEach( function(x) {
			netdata.nodes.push({id: trimInt(x.dpid), properties: {type: "switch"}});
		});
		topo.links.forEach( function(x) {
			// put links between switches
			netdata.links.push({source: parseInt(trim_zero(x.port.src.dpid)), target: trimInt(x.port.dst.dpid),
				properties: {src_mac: x.port.src.hw_addr, src_port: trimInt(x.port.src.port_no),
							dst_mac: x.port.dst.hw_addr, dst_port: trimInt(x.port.dst.port_no)}});
		});
		hosts.forEach(function(host) {
			netdata.nodes.push({id: host.ipv4[0], properties: {type: "host"}});
			// put links between host and switch
			netdata.links.push({source: host.ipv4[0], target: trimInt(host.port.dpid), 
				properties: {src_mac: host.mac, dst_mac: host.port.hw_addr, sw_in_port: trimInt(host.port.port_no)}});
		});
	}	
};
netdata['type'] = "NetworkGraph";
netdata['label'] = "SDN topo";
netdata['protocol'] = "OpenFlow";
netdata['version'] = "1.3";
netdata['metric'] = "";
netdata['nodes'] = [];
netdata['links'] = [];

