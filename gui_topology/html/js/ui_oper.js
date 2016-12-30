

/* init chart */
(function() {

    $(document).ready(function(){
        initialize_topology(); // init topology

        /** OUTER **/

        var dpi_lineChart_sel = "#out_dpi_chart"; 
        var dpi_lineChart_dimen = [370, 185];
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

        var port_lineChart_sel = "#out_port_chart"; 
        var port_lineChart_dimen = [370, 185];
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

        var in_lineChart_sel = "#in_line_chart"; 
        var in_lineChart_dimen = [370, 185];
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

        var in_lineChart2_sel = "#in_line_chart2"; 
        var in_lineChart2_dimen = [370, 185];
        window.in_lineChart2 = c3.generate({
            bindto: in_lineChart2_sel,
            size: {
                width: in_lineChart2_dimen[0],
                height: in_lineChart2_dimen[1]
            },
            data: {
                x: 'ts',
                columns: []
            },
        });

        var pie_chart_sel = "#protos_pie"; 
        var pie_chart_dimen = [180, 180];
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

        var con_pie_chart_sel = "#proto_source"; 
        var con_pie_chart_dimen = [180, 180];
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

        var tx_gauge_sel = "#tx_gauge"; 
        var tx_gauge_dimen = [180, 170];
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
            },
            padding: {
                bottom: 25
            }
        });

        var rx_gauge_sel = "#rx_gauge"; 
        var rx_gauge_dimen = [180, 170];
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
            },
            padding: {
                bottom: 25
            }
        });
    });

})();

/* reset all stat flags except io_stat */
function ui_resetAllStat(bp=1, rt=1, dp=1) {
    window.bp_stat = bp;
    window.rt_stat = rt; // only node need
    window.dp_stat = dp; // 1: dpi, 2: port
}

/**************   button events    *****************/

function bp_btn_func() {
    if(window.bp_stat==1) {
        window.bp_stat = 2;
        rx_gauge.internal.config.gauge_max = 3000;
        tx_gauge.internal.config.gauge_max = 3000;
        rx_gauge.internal.config.gauge_units = "Packets";
        tx_gauge.internal.config.gauge_units = "Packets";
    }
    else {
        window.bp_stat = 1;
        rx_gauge.internal.config.gauge_max = 5000;
        tx_gauge.internal.config.gauge_max = 5000;
        rx_gauge.internal.config.gauge_units = "K bits";
        tx_gauge.internal.config.gauge_units = "K bits";
    }
    c3w.changeBP_FLAG(in_lineChart, window.bp_stat);
}

function intro_proto() {
    c3w.connectData(dpi_lineChart, 1, null, {port_no: null, bp_flag: 1});
    c3w.startShowLine(dpi_lineChart, 'dpi', 3);
}

function intro_port() {
    c3w.connectData(port_lineChart, 1, null, {port_no: null, bp_flag: 1});
    c3w.startShowLine(port_lineChart, 'port', 1); 
}

function intro_out() {
    intro_proto();
    intro_port();
}

function resetOutSideChart() {
    // XXX: hard code...
    reconstructOut();
    unloadOut();
    /* reset recv and trans switch */
    $('#btn-map_port').removeClass('active');
    $('#btn-map_proto').addClass('active');
}

/***************************************/

function intro_innerLine() {
    c3w.connectData(in_lineChart, 1, null, {port_no: null, bp_flag: 1});
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
    var shareConn= c3w.chart2conn(shareChart);
    var id = shareConn.id;
    c3w.showProtoContributePie(contribute_chart, id, d.name, shareChart);
}


function resetInSideChart() {
    console.log("work");
    reconstructIn();
    unloadIn();
    /* reset recv and trans switch */
    $('#btn-info_port').removeClass('active');
    $('#btn-info_proto').addClass('active');
}

window.bp_stat = 1;
window.rt_stat = 1; // only node need
window.dp_stat = 1; // 1: dpi, 2: port
window.cur_id = null;
window.lv_stat = 1;
window.nl_stat = 1; // 1: node, 2: link
