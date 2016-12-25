$(function() {
    $('#icon-map').click(function() {
        $('#tab-map').animate({ "right": "0px" }, 500).addClass('visible');
    });

    $('#map-back').click(function() {
        $('#tab-map').animate({ "right": "-1000px" }, 500).removeClass('visible');
    });

    $('#icon-info').click(function() {
        $('#tab-info').animate({ "right": "0px" }, 500).addClass('visible');
    });

    $('#info-back').click(function() {
        $('#tab-info').animate({ "right": "-1000px" }, 500).removeClass('visible');
    });

    $('#btn-proto').click(function() {
        $('#btn-proto').addClass('active');
        $('#btn-port').removeClass('active');
        $('.title-left').text('Protocols');
        $('.title-right').text('Source of HTTP');
        $('.chart-block-left .chart-main').attr('id', 'protos_pie');
        $('.chart-block-right .chart-main').attr('id', 'proto_source');
    });

    $('#btn-port').click(function() {
        $('#btn-port').addClass('active');
        $('#btn-proto').removeClass('active');
        $('.title-left').text('Receive');
        $('.title-right').text('Transmission');
        $('.chart-block-left .chart-main').attr('id', 'rx_gauge');
        $('.chart-block-right .chart-main').attr('id', 'tx_gauge');
    });

    $('#btn-campus').click(function() {
        $('#btn-campus').addClass('active');
        $('#btn-topo').removeClass('active');
        zoomTopo_reset();
    });

    $('#btn-topo').click(function() {
        $('#btn-topo').addClass('active');
        $('#btn-campus').removeClass('active');
        zoomTopo();
    });
});

function zoomTopo() {
    $('.map-demo').fadeOut('slow');
    $('.map-demo').removeClass('active');
    $('.topo-demo').fadeIn('slow');
    $('.topo-demo').addClass('active');

    if ($('#tab-map').hasClass('visible')) {
        $('#tab-map').animate({ 'right': '-1000px' }, 500).removeClass('visible');
    }
    if ($('#tab-info').hasClass('visible')) {
        $('#tab-info').animate({ 'right': '-1000px' }, 500).removeClass('visible');
    }
    $('#tab-map').animate({ 'right': '0px' }, 500).addClass('visible');
}

function zoomTopo_reset() {
    $('.topo-demo').fadeOut('slow');
    $('.topo-demo').removeClass('active');
    $('.map-demo').fadeIn('slow');
    $('.map-demo').addClass('active');

    if ($('#tab-info').hasClass('visible')) {
        $('#tab-info').animate({ 'right': '-1000px' }, 500).removeClass('visible');
    }
    if ($('#tab-map').hasClass('visible')) {
        $('#tab-map').animate({ 'right': '-1000px' }, 500).removeClass('visible');
    }
    $('#tab-info').animate({ 'right': '0px' }, 500).addClass('visible');
}
