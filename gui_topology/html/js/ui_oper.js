<<<<<<< HEAD
/* init chart */
(function() {

    $(document).ready(function() {
=======


/* init chart */
(function() {

    $(document).ready(function(){
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
        //initialize_topology(); // init topology

        /** OUTER **/

        var dpi_lineChart_sel = "#out_dpi_chart"; // TODO
        var dpi_lineChart_dimen = [415, 180];
        window.dpi_lineChart = c3.generate({
            bindto: dpi_lineChart_sel,
            size: {
                width: dpi_lineChart_dimen[0],
                height: dpi_lineChart_dimen[1]
            },
            data: {
                x: 'ts',
                columns: []
            },
        });

        var port_lineChart_sel = "#out_port_chart"; // TODO
        var port_lineChart_dimen = [415, 180];
        window.port_lineChart = c3.generate({
            bindto: port_lineChart_sel,
            size: {
                width: port_lineChart_dimen[0],
                height: port_lineChart_dimen[1]
            },
            data: {
                x: 'ts',
                columns: []
            },
        });

        /** INNER **/

        var in_lineChart_sel = "#in_line_chart"; // TODO
        var in_lineChart_dimen = [415, 180];
        window.in_lineChart = c3.generate({
            bindto: in_lineChart_sel,
            size: {
                width: in_lineChart_dimen[0],
                height: in_lineChart_dimen[1]
            },
            data: {
                x: 'ts',
                columns: []
            },
        });

        var pie_chart_sel = "#protos_pie"; // TODO
        var pie_chart_dimen = [210, 175];
        window.pie_chart = c3.generate({
            bindto: pie_chart_sel,
            size: {
                width: pie_chart_dimen[0],
                height: pie_chart_dimen[1]
            },
            data: {
                x: 'ts',
                type: 'pie',
                columns: [],
                onclick: pie_click
            },
        });

        var con_pie_chart_sel = "#proto_source"; // TODO
        var con_pie_chart_dimen = [210, 175];
        window.contribute_chart = c3.generate({
            bindto: con_pie_chart_sel,
            size: {
                width: con_pie_chart_dimen[0],
                height: con_pie_chart_dimen[1]
            },
            data: {
                x: 'ts',
                type: 'pie',
                columns: []
            },
        });

        /*
        var tx_gauge_sel = "#line_chart"; // TODO
        var tx_gauge_dimen = [380, 190];
        window.tx_gauge = c3.generate({
            bindto: tx_gauge_sel,
            size: {
                width: tx_gauge_dimen[0],
                height: tx_gauge_dimen[1]
            },
            data: {
                type: 'gauge',
                columns: []
            },
            gauge: {
                label: {
                    format: function(value, ratio) {
                        return value;
                    },
                },
                min: 0,
                max: 5000,
                units: 'K bits'
            }
        });

        var rx_gauge_sel = "#line_chart"; // TODO
        var rx_gauge_dimen = [380, 190];
        window.rx_gauge = c3.generate({
            bindto: rx_gauge_sel,
            size: {
                width: rx_gauge_dimen[0],
                height: rx_gauge_dimen[1]
            },
            data: {
                type: 'gauge',
                columns: []
            },
            gauge: {
                label: {
                    format: function(value, ratio) {
                        return value;
                    },
                },
                min: 0,
                max: 5000,
                units: 'K bits'
            }
        });
        */
    });

})();

function sigleClickOnDepartment(id) {

}

/* reset outer DPI chart */
function ui_reconstructDPI_O(id) {
<<<<<<< HEAD
    //window.dp_stat = 1; // default dpi mode

=======
	//window.dp_stat = 1; // default dpi mode
    
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
    ui_resetAllStat();
    // TODO: reset btn status
    c3w.destroy(window.live_dpi_chart);
}

/* reset all stat flags except io_stat */
<<<<<<< HEAD
function ui_resetAllStat(bp = 1, rt = 1, dp = 1) {
=======
function ui_resetAllStat(bp=1, rt=1, dp=1) {
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
    window.bp_stat = bp;
    window.rt_stat = rt; // only node need
    window.dp_stat = dp; // 1: dpi, 2: port
}

window.io_stat = 1; // 1: out, 2: in
/* show and hide view page according to io_stat */
// TODO: 
function io_exchange() {
<<<<<<< HEAD
    if (window.io_stat == 1) {
        // hide in_view
        // show out_view
        // resetide_i
    } else if (window.io_stat) {
        // hide out_view
        // show in_view
        // resetide_o
    } else {
=======
    if(window.io_stat == 1) {
        // hide in_view
        // show out_view
        // resetide_i
    }
    else if(window.io_stat){
        // hide out_view
        // show in_view
        // resetide_o
    }
    else {
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
        throw "unknown io_stat";
    }
}

function resetSide_i() {
    resetInfo_i();

}

function reconstruct_i() {

}

function resetInfo_i() {

}

function dp_changePage_i() {

}

/***************************************/

function intro_proto() {
<<<<<<< HEAD
    c3w.connectData(dpi_lineChart, 1, null, { port_no: null, bp_flag: 1 });
=======
    c3w.connectData(dpi_lineChart, 1, null, {port_no: null, bp_flag: 1});
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
    c3w.startShowLine(dpi_lineChart, 'dpi', 3);
}

function intro_port() {
<<<<<<< HEAD
    c3w.connectData(port_lineChart, 1, null, { port_no: null, bp_flag: 1 });
    c3w.startShowLine(port_lineChart, 'port', 1);
=======
    c3w.connectData(port_lineChart, 1, null, {port_no: null, bp_flag: 1});
    c3w.startShowLine(port_lineChart, 'port', 1); 
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
}

function intro_out() {
    intro_proto();
    intro_port();
}

/***************************************/

function intro_innerLine() {
<<<<<<< HEAD
    c3w.connectData(in_lineChart, 1, null, { port_no: null, bp_flag: 1 });
=======
    c3w.connectData(in_lineChart, 1, null, {port_no: null, bp_flag: 1});
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
    c3w.startShowLine(in_lineChart, 'dpi', 3);
}

function intro_protoPie() {
    c3w.showProtoPie(pie_chart, 1, 2, 2000, in_lineChart); // chart, id, bp_flag, shareChart, rt_rank
}

function intro_in() {
    intro_innerLine();
    intro_protoPie();
}

function pie_click(d, i) {
    c3w.destroy(contribute_chart);
    console.log(d.name);
    var shareChart = in_lineChart;
<<<<<<< HEAD
    var shareConn = c3w.chart2conn(shareChart);
=======
    var shareConn= c3w.chart2conn(shareChart);
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
    var id = shareConn.id;
    c3w.showProtoContributePie(contribute_chart, id, d.name, shareChart);
}
