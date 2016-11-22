/*
 * c3_wrapper is a data wrapper, which defines an interface between c3.js and dpi_oper.js
 * These API offer a convenient way to connect data in c3.js columns form and update chart periodically.
 * C3 chart must be generated by c3.js library, and update events can be registered with this API.
 *
 * Notice:
 *  Only allow to use data.columns() format currently.
 *
 *  connectData(chart, id, connFilter={dpi: null, port: null}, showFilter={dpi: null, port: null, dpi_flag: null, port_no: null}, size=10)
 *      chart: chart object created by c3.js
 *      id: ipv4 or dpid
 *      connFilter: only connect these data
 *      showFilter: only show these data
 *      size: size of history
 *      This API will register event to dpi_oper and save data as c3.js columns style.
 *
 *  XXX: data are updated per second currently..
 *  startShowLine(chart, type, rank=null):
 *      type => 'dpi' or 'port'
 *      show data on chart per second
 *  stopShow(chart):
 *      stop load new data to chart
 *
 *  setHistorySize(size):
 *      set the number of nodes shown in the chart.
 *      if the size is greater than that of present, append new data.
 *      else if size is less than that of present, only keep the latest number of data.
 *
 *  XXX: after reset showFilter, remember "unload() the chart"
 *  setShowFilter(showFilter, conn):
 *      reset showFilter in the connection.
 *
 *  destroy(chart):
 *      clear all events and remove connection from manager
 *
 *  chart2conn(chart):
 *      convert chart to connection element
 *  removeConnByChart(chart):
 *      similar to chart2conn, but remove conn from manager before return connection
 *
 *  clearData(chart):
 *      clear all records
 *
 * */

function c3_wrapper(dpi_oper) {
    this.manager; 
    this.idCnt; // use increment number as id. According to ES5, id can up to 2^53-1.
    this.dpi_oper;
    this.tryPeriod; // if dpi_oper not ready, try after 100ms

    /* constructor */

    this.manager = [];  // [connections..]
    this.idCnt = 0;
    this.dpi_oper = null;
    this.tryPeriod = 100; // try to connect dpi_oper every 100ms at most 10 times
    this.tryLimit = 10;

    this.dpi_oper = dpi_oper; // init dpi_oper
}

/**********************************
 *  Helper function
 **********************************/

/* process obj {name: 'A', value: int} */
c3_wrapper.prototype.protoCMP = function(a, b) {
    if(a.value==b.value) {
        return a.name.localeCompare(b.name);
    }
    return a.value-b.value;
}

c3_wrapper.prototype.updateDPIrank = function(conn) {
    var db = conn.data['dpi'];
    var dpi_rank = conn['dpi_rank'];
    var proto_byte=[], proto_pkt=[];
    for(var x in db) {
        var field = x; // protoName_byte or protoName_pkt
        var last_char = field.charAt(field.length-1);
        var protoName;
        if(last_char=='e') {
            proto_byte.push({name: field.substring(0, field.length-5), value: db[x][db[x].length-1]});
        }
        else if(last_char=='t') {
            proto_pkt.push({name: field.substring(0, field.length-4), value: db[x][db[x].length-1]});
        }
        else {
            throw "error dpi field: "+field;
        }
    }

    dpi_rank['byte'] = proto_byte.sort(c3_wrapper.prototype.protoCMP).reverse();
    dpi_rank['pkt'] = proto_pkt.sort(c3_wrapper.prototype.protoCMP).reverse();
    //console.log(JSON.stringify(dpi_rank['byte']));
}

c3_wrapper.prototype.genId = function() {
    return this.idCnt++;
}

/*
 * connFilter define which data should be collected from dpi_oper
 * if dpi filter is null, then it will collect all dpi data.
 * */
c3_wrapper.prototype.setConnFilter = function(filter, conn) {
    if(!filter.hasOwnProperty('dpi'))
        throw "lack of dpi field";
    if(!filter.hasOwnProperty('port'))
        throw "lack of port field";

    /* set port filter */
    if(filter['port'] == null) {
        conn['connFilter']['port'] = ['rx_pkt', 'rx_byte', 'tx_pkt', 'tx_byte', 'tot_pkt', 'tot_byte'];
    }
    else if(typeof filter['port'] === 'string') {
        // one param
		if(!this.isPortInfo(filter['port']))
			throw "wrong port field name: "+filter['port'];
        conn['connFilter']['port'].push(filter['port']);
    }
    else if(Object.prototype.toString.call(filter['port']) === '[object Array]') {
		for(var x in filter['port']) {
			if(!this.isPortInfo(filter['port'][x]))
				throw "wrong port field name: "+filter['port'][x];
		}
        conn['connFilter']['port'] = filter['port'].slice();
    }
    else
        throw "wrong port type";

    /* set dpi filter */
    if(filter['dpi'] == null) {
        conn['connFilter']['dpi'] = null; // this will collect all protocol info
    }
    else if(typeof filter['dpi'] === 'string') {
        // one param
        conn['connFilter']['dpi'].push(filter['dpi']);
    }
    else if(Object.prototype.toString.call(filter['dpi']) === '[object Array]') {
        conn['connFilter']['dpi'] = filter['dpi'].slice();
    }
    else
        throw "wrong dpi type";
}

/*
 * showFilter define which data should be shown in the chart
 * showFilter must be subset of connFilter
 * if dpi filter is null, then it will show protocols info. as many as possible
 * */
c3_wrapper.prototype.setShowFilter = function(showFilter, conn) {
    if(!showFilter.hasOwnProperty('dpi'))
        showFilter['dpi'] = null;
    if(!showFilter.hasOwnProperty('port'))
        showFilter['port'] = null;

    /* reset showFilter in connection */
    conn.showFilter = {'dpi': [], 'port': []};


    var dpi_list = showFilter['dpi'];
    var port_list = showFilter['port'];

    try {

        /* set port filter */
        if(port_list == null) {
            conn['showFilter']['port'] = conn['connFilter']['port'].slice();
        }
        else if(typeof port_list === 'string') {
            this.tryAppend(port_list, conn['connFilter']['port'], conn['showFilter']['port']);
        }
        else if(Object.prototype.toString.call(port_list) === '[object Array]') {
            for(var x in port_list) {
                this.tryAppend(port_list[x], conn['connFilter']['port'], conn['showFilter']['port']);
            }
        }
        else
            throw "wrong port type";

        if(!showFilter.hasOwnProperty('port_no')) {
            showFilter['port_no'] = null; // null port_no will show all ports
        }
        else if(showFilter['port_no']!=null){

            if(typeof showFilter['port_no'] == 'number') { // only one port
                conn['showFilter']['port_no'] = [showFilter['port_no']];
            }
            else { // port array
                /* int validate */
                for(var x in showFilter['port_no']) {
                    var port = showFilter['port_no'][x];
                    if(!Number.isInteger(port))
                        throw "showFilter: port_no not integer";
                }
                conn['showFilter']['port_no'] = showFilter['port_no'].slice();
            }
        }

        /* set dpi filter */
        if(dpi_list == null) {
            if(conn['connFilter']['dpi'] == null)
                conn['showFilter']['dpi'] = null;
            else
                conn['showFilter']['dpi'] = conn['connFilter']['dpi'].slice();
        }
        else if(typeof dpi_list === 'string') {
            this.tryAppend(dpi_list, conn['connFilter']['dpi'], conn['showFilter']['dpi']);
        }
        else if(Object.prototype.toString.call(dpi_list) === '[object Array]') {
            for(var x in dpi_list) {
                this.tryAppend(dpi_list[x], conn['connFilter']['dpi'], conn['showFilter']['dpi']);
            }
        }
        else
            throw "wrong dpi type";

        if(!showFilter.hasOwnProperty('dpi_flag') || showFilter['dpi_flag']==null) {
            conn['showFilter']['dpi_flag'] = 3; // show both port and byte
        }
        else if(Number.isInteger(showFilter['dpi_flag'])) {
            conn['showFilter']['dpi_flag'] = showFilter['dpi_flag'];
        }
        else
            throw " dpi_flag not integer in showFilter";
    }
    catch(err) {
        console.log(err);
        throw err; // rethrow
    }
}

/* if element in carr, then push to iarr */
c3_wrapper.prototype.tryAppend = function(element, carr, iarr) {
    if(this.inArray(element, carr))
        iarr.push(element);
    else
        throw "showFilter must be subset of connFilter";
}

c3_wrapper.prototype.inArray = function(str, arr) {
    for(var x in arr) {
        var tmp = arr[x];
        if(tmp == str)
            return true;
    }
    return false;
}

c3_wrapper.prototype.isPortInfo= function(str) {
    if(str=='rx_pkt' || str=='rx_byte' || str=='tx_pkt' || str=='tx_byte' || str=='tot_pkt' || str=='tot_byte')
        return true;
    else
        return false;
}

/*
 * connection:
 * {   'ref': obj, 
 *      'dpi_ts': []
 *      'dpi_sts': int // ts counter, set chart => data: {x: 'dpi_ts'}
 *      'port_ts': []
 *      'port_sts': int 
 *      'size': size, // For gauge, we can set it to 1 to keep only current value.
 *      'connFilter': {'dpi': [string ...], 'port': [string ...]}
 *      'showFilter': {'dpi': [string ...], 'port': [string ...], 'port_no'}
 *      'data': {'dpi': {protoName: []}, 'port': { port_no: {rx_pkt: [], ...}, tot_byte: int, tot_pkt: int}}
 *      'port_data_ready': false // port is cumulative data. Therefore, we need to wait for second data and calulate the first delta value
 *      'cb_name': string // Generate by c3_wrapper idCnt
 *      'id': int // ipv4 or dpid
 *      'intervalId': setInterval id
 *      'dpi_rank': {byte: [], pkt: []}
 * }
 *  
 * */
c3_wrapper.prototype.genConnection = function(chart, id, connFilter, showFilter, size) {
    var _id = this.genId();

    if(chart==null)
        throw "chart is null";

    if(size<=0)
        throw "size can not <= 0";

    var conn =  {ref: chart, dpi_ts: ['ts'], dpi_sts: null, port_ts: ['ts'], port_sts: null, size: size, connFilter: {'dpi': [], 'port': []}, showFilter: {'dpi': [], 'port': []}, data: {'dpi': {}, 'port': {}}, cb_name: _id, id: id, port_data_ready: false, intervalId: null, dpi_rank: {byte: [], pkt: []}};
    this.setConnFilter(connFilter, conn);
    this.setShowFilter(showFilter, conn);

    return conn;
}

/* check dpi_oper is ready */
c3_wrapper.prototype.isReady = function() {
    if(this.dpi_oper && this.dpi_oper.isReady()) {
        return true;
    }
    return false;
}

c3_wrapper.prototype.deepCloneObj = function(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/* 
 * db => data array
 * protoName
 * value => [byte, pkt]
 * head_padding => if not exist field, padding head 0
 * */
c3_wrapper.prototype.appendDPIData = function(db, protoName, value, head_padding=0) {
    var pkt_field = protoName+"_pkt";
    var byte_field = protoName+"_byte";

    /* padding head 0 */
    if(!db.hasOwnProperty(byte_field)) {
        db[byte_field] = [];
        if(head_padding!=0) {
            db[byte_field] = Array(head_padding+1).fill(0);
        }
        // XXX: both byte and pkt data's tag are protoName!!
        // Do not show them at the same time...
        db[byte_field][0] = protoName;
    }  
    db[byte_field].push(value[0]);

    if(!db.hasOwnProperty(pkt_field)) {
        db[pkt_field] = [];
        if(head_padding!=0) {
            db[pkt_field] = Array(head_padding+1).fill(0);
        }
        db[pkt_field][0] = protoName;
    }  
    db[pkt_field].push(value[1]);
}

/* process one kind of field. e.g rx_pkt */
c3_wrapper.prototype.appendPortData = function(db, fieldName, port_data, size) {
    if(!this.isPortInfo(fieldName))
        throw "error port field";

    if(fieldName=='tot_pkt' || fieldName=='tot_byte') {
        if(!db.hasOwnProperty(fieldName)) {
            db[fieldName] = [fieldName, port_data[fieldName]];
        }  
        else {
            var last = db[fieldName].pop();
            db[fieldName].push(port_data[fieldName]-last);
            db[fieldName].push(port_data[fieldName]);
            this.rmOldData(db[fieldName], size+1); // +1 => last record
        }
    }
    else {
        for(var x in port_data) {
            if(!isNaN(parseInt(x))) {
                var port_no = x;
                if(!db.hasOwnProperty(port_no)) {
                    db[port_no] = {};
                }

                if(!db[port_no].hasOwnProperty(fieldName)) {
                    db[port_no][fieldName] = [port_no+"_"+fieldName, port_data[port_no][fieldName]];
                }
                else {
                    var last = db[port_no][fieldName].pop();
                    db[port_no][fieldName].push(port_data[port_no][fieldName]-last);
                    db[port_no][fieldName].push(port_data[port_no][fieldName]);
                    this.rmOldData(db[port_no][fieldName], size+1); // +1 => last record
                }
            }
        }
    }

}

c3_wrapper.prototype.rmOldData = function(arr, size) {
    if(arr.length > size+1) {
        var delta = arr.length-size-1;
        arr.splice(1, delta);
    }
}


/**********************************
 *  API
 **********************************/

/*
 * XXX: not allow duplicated field in filter
 * dpi_flag: 1=>byte, 2=>pkt
 * */
c3_wrapper.prototype.connectData = function(chart, id, connFilter={dpi: null, port: null}, showFilter={dpi: null, port: null, dpi_flag: null, port_no: null}, size=10, failTime=0) {

	if(failTime==this.tryLimit) {
		throw "can not connect dpi_oper";
	}

    /* wait for ready */
	if(!this.isReady()) {
		var _this = this;
		setTimeout(function(){_this.connectData(chart, id, connFilter, showFilter, size, failTime+1)}, this.tryPeriod);
		return;
	}

    if(connFilter == null)
        connFilter = {dpi: null, port: null};
    if(showFilter == null)
        showFilter = {dpi: null, port: null, dpi_flag: null, port_no: null};

    var conn = this.genConnection(chart, id, connFilter, showFilter, size);

    /* register dpi_oper callback */
    try {
        _this = this; 

        /* Register dpi data */
        this.dpi_oper.regCallBack('dpi', conn.cb_name, id, function(dpi_data){
            
            var db = conn.data['dpi'];
            //console.log(dpi_data);

            /* add ts */
            var diff_time = addTS('dpi', conn);

            /* add dpi data */
            for(var x in dpi_data) {
                if(conn.connFilter['dpi']==null || this.inArray(dpi_data[x]['protoName'], conn.connFilter['dpi'])) { // check connFilter
                    var protoName = dpi_data[x]['protoName'];
                    // diff_time = null if not first data
                    _this.appendDPIData(db, protoName, [dpi_data[x]['bytes'], dpi_data[x]['packets']], Math.round(diff_time/1000));
                }
            }

            /* 
             * padding tail 0 
             * Some protocols appear this sec, but not appear in next sec
             * */
            var len = conn['dpi_ts'].length;
            for(var x in db) {
                if(db[x].length<len) {
                    db[x].push(0);
                }

                /* check history len */
                this.rmOldData(db[x], conn.size);
            }
            this.rmOldData(conn['dpi_ts'], conn.size);

            /* update rank */
            this.updateDPIrank(conn);
        }, this)


        /* Register port data */
        this.dpi_oper.regCallBack('port', conn.cb_name, id, function(port_data){
            // this is chart, _this is c3_wrapper
            
            /* add ts */
            if(conn.port_data_ready) {
               addTS('port', conn);
            }

            /* add port data */
            var db = conn.data['port'];
            for(var x in conn.connFilter['port']) { // try to add all field in connFilter
                var fieldName = conn.connFilter['port'][x];
                _this.appendPortData(db, fieldName, port_data, conn.size); // port_data = {port_no: {} || tot_xxx: int}
            }
            this.rmOldData(conn['port_ts'], conn.size);

            //console.log(JSON.stringify(port_data));

            conn.port_data_ready = true; // only skip first data

        }, this)

    }
    catch(err) {
        console.log("connectData error: "+err);
        return;
    }

    /* return diff time */
    function addTS(type, conn) {
        if(type!='port' && type!='dpi') {
            throw "wrong type in addTS()";
        }

        var diff_time = null;
        if(conn[type+'_sts']==null) {
            conn[type+'_sts'] = (new Date()).getTime();
            conn[type+'_ts'].push(0);
        }
        else {
            diff_time = (new Date()).getTime() - conn[type+'_sts'];
            conn[type+'_ts'].push(Math.round(diff_time/1000));
        }

        return diff_time;
    }

    this.manager.push(conn);

    return conn;
}

c3_wrapper.prototype.destroy = function(chart) {
    var conn = this.chart2conn(chart); // if chart==null or can't be found, conn=null
    if(conn) {
        var dpi = this.dpi_oper;
        try {
            this.stopShow(chart);
            dpi.removeCallback('dpi', conn.cb_name);
            dpi.removeCallback('port', conn.cb_name);
        }
        catch (err) {
            console.log("Destroy error: "+err); // not rethrow
        }
        chart.destroy();
    }
}

/* 
 * show data on chart 
 * data_type: dpi or port
 * rank: only show top rank
 * return: false => not start successfully
 * */
c3_wrapper.prototype.startShowLine = function(chart, data_type, rank=null) {
    var conn = this.chart2conn(chart);
    if(conn.intervalId) {
        console.log("already start show: "+conn.intervalId.toString());
        return false;
    }
    else if(rank!=null && !Number.isInteger(rank)) {
        console.log("rank isn't integer");
        return false;
    }
    else if(rank!=null && data_type=='port') {
        console.log("rank only for dpi data_type");
        return false;
    }
    var _this = this;
    var setId;

    if(data_type=='port') {
        setId = setInterval(function(){
            var db = conn.data['port'];

            /* prepare columns */
            var columns = [];
            columns.push(conn['port_ts']);
            for(var x in conn.showFilter['port']) {
                var fieldName = conn.showFilter['port'][x];
                if(fieldName.substring(0, 3)=='tot') { // tot_xxx
                    if(typeof db[fieldName] != 'undefined') {
                        columns.push(db[fieldName].slice(0, -1));
                    }
                }
                else {
                    for(var x in db) {
                        var port = parseInt(x);
                        // check show port_no
                        if(!isNaN(port) && (conn.showFilter['port_no']==null || _this.inArray(port, conn.showFilter['port_no']))) { 
                            if(typeof db[x][fieldName] != 'undefined') {
                                columns.push(db[x][fieldName].slice(0, -1));
                            }
                        }
                    }
                }
            }

            console.log(JSON.stringify(columns));
            /* update c3 chart */
            if(conn.port_data_ready && conn['port_sts']) {
                chart.load({
                    x: 'ts',
                    columns: columns
                });
            }
        }, 1000);
    }
    else if(data_type=='dpi') {
        setId = setInterval(function(){
            var db = conn.data['dpi'];

            /* prepare columns */
            var columns = [];
            columns.push(conn['dpi_ts']);
            //for(var x in db) {
                //var field = x; // protoName_byte or protoName_pkt
                //var last_char = field.charAt(field.length-1);
                //var protoName;
                //var byteORpkt; // byte: 1, pkt: 2
                //if(last_char=='e') {
                    //protoName = field.slice(0, -5);
                    //byteORpkt = 1;
                //}
                //else if(last_char=='t') {
                    //protoName = field.slice(0, -4);
                    //byteORpkt = 2;
                //}
                //else {
                    //throw "error dpi field: "+field;
                //}

                //if(conn.showFilter['dpi']==null || _this.inArray(protoName, conn.showFilter['dpi'])) { // check protocol showFilter
                    //var flag = conn.showFilter['dpi_flag'];
                    //if((byteORpkt&flag)>0) { // check byte and pkt flag
                        //columns.push(db[x]);
                    //}
                //}
            //}
            
            var flag = conn.showFilter['dpi_flag'];
            // XXX: because of protocol tag, flag==3 => show only byte
            if((1&flag)>0) { // byte
                addDPIcolumn.call(_this, conn, columns, 'byte', rank);
            }
            else if((2&flag)>0) { // pkt
                addDPIcolumn.call(_this, conn, columns, 'pkt', rank);
            }

            // type => byte or pkt
            function addDPIcolumn(conn, columns, type, rankLimit) {
                if(type!='byte' && type!='pkt')
                    throw "unknown type in addDPIcolumn";

                // [{name: protoName, value: int}, ...]
                var cnt = 0;
                var arr = conn.dpi_rank[type];
                var db = conn.data['dpi'];
                for(var x in arr) {
                    var protoName = arr[x]['name'];
                    if(conn.showFilter['dpi']==null || this.inArray(protoName, conn.showFilter['dpi'])) { // check protocol showFilter
                        columns.push(db[protoName+'_'+type]);
                        cnt++;
                        if(cnt==rankLimit)
                            return;
                    }
                }
            }

            console.log(JSON.stringify(columns));

            /* check whether same protocol rank list */
            var same = true;
            for(var x in chart.internal.legend[0][0].childNodes) {
                var name = chart.internal.legend[0][0].childNodes[x].__data__;
                var ok = false;
                if(typeof name == "undefined")
                    continue;
                for(var i in columns) {
                    if(name == columns[i][0]) {
                        ok = true;
                        break;
                    }
                }
                console.log(ok);
                if(!ok) {
                    same = false;
                    chart.unload({
                        done: function() {
                            /* update c3 chart */
                            chart.load({
                                x: 'ts',
                                columns: columns
                            });
                        }
                    });
                    break;
                }
            }
            if(same) {
                /* update c3 chart */
                chart.load({
                    x: 'ts',
                    columns: columns
                });
            }

        }, 1000);
    }
    else
        throw "unknown type";
    
    conn.intervalId = setId;
    return true;
}

c3_wrapper.prototype.stopShow = function(chart) {
    var conn = this.chart2conn(chart);
    if(conn) {
        if(conn.intervalId) {
            clearInterval(conn.intervalId);
            conn.intervalId = null;
        }
    }
}

c3_wrapper.prototype.setHistorySize = function(chart, size) {
    var conn = this.chart2conn(chart);
    if(conn) {
        conn.size = size;
    }
}

c3_wrapper.prototype.clearData = function(chart) {
    var conn = this.chart2conn(chart);
    if(conn) {
        conn['data'] = {'dpi': {}, 'port': {}};
        conn['port_data_ready'] = false;
        chart.unload();
    }
}

c3_wrapper.prototype.chart2conn = function(chart) {
    if(chart==null)
        return null;

    for(var x in this.manager) {
        var conn = this.manager[x];
        if(conn.ref == chart) {
            return conn;
        }
    }
    return null;
}

/* similar to chart2conn, but remove before return */
c3_wrapper.prototype.removeConnByChart = function(chart) {
    if(chart==null)
        return null;

    for(var x in this.manager) {
        var conn = this.manager[x];
        if(conn.ref == chart) {
            this.manager.splice(x, 1); // remove
            return conn;
        }
    }
    return null;
}
