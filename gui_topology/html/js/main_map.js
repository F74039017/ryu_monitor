d3.select(window)
    .on('resize', sizeChange);

//set the projection of the map
var projection = d3.geo.mercator()
    .center([120.2175, 23.0007])
    .scale(3800000);

var path = d3.geo.path()
    .projection(projection);

//initialize the map
var svg = d3.select('.map-demo')
    .append('svg')
    .attr('width', '100%');

svg.append('rect')
    .attr('class', 'background')
    .on('click', zoom_reset);

var g = svg.append('g')
    .style('stroke-width', '0.5px');

//tooltip for hover
var tooltip = d3.select('.map-demo')
    .append('div')
    .attr('class', 'hidden tooltip');

//construct the map.
var region = new Array(8),
    dept = new Array(8),
    road = svg.append('g'),
    water = svg.append('g');

for (i = 0; i < 8; ++i) {
    region[i] = svg.append('g');
    dept[i] = svg.append('g');
}

var active = d3.select(null),
    zoomReg_scale = 0,
    zoomReg_trans = 0,
    select_camp = '',
    select_dept = '';

//('.container-map').addClass('active');

/* Draw map with TopoJSON */
d3.json('/static/data/topojson/ncku.json', function(error, map) {
    if (error)
        return console.error(error);

    for (i = 0; i < 8; ++i) {
        region[i].selectAll('path')
            .data(topojson.feature(map, map.objects['reg_' + i]).features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('class', 'reg_' + i)
            .on('click', zoomReg)
            .on('mousemove', hover_show)
            .on('mouseout', function() {
                tooltip.classed('hidden', true);
            });

        region[i].append('path')
            .datum(topojson.mesh(map, map.objects['reg_' + i], function(a, b) {
                return a !== b;
            }))
            .attr('d', path)
            .attr('class', 'mesh_reg');
    }
});


d3.json('/static/data/topojson/ncku.json', function(error, map) {
    if (error)
        return console.error(error);

    for (i = 0; i < 8; ++i) {
        dept[i].selectAll('path')
            .data(topojson.feature(map, map.objects['dept_' + i]).features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('class', 'dept_' + i)
            .on('click', zoomDept)
            .on('mousemove', hover_show)
            .on('mouseout', function() {
                tooltip.classed('hidden', true);
            });

        dept[i].append('path')
            .datum(topojson.mesh(map, map.objects['dept_' + i], function(a, b) {
                return a !== b;
            }))
            .attr('d', path)
            .attr('class', 'mesh_reg');

        dept[i].attr('visibility', 'hidden');
    }
});


/* Hover and show tooltip */
function hover_show(d) {
    var mouse = d3.mouse(svg.node()).map(function(d) {
        return parseInt(d);
    });

    tooltip.classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 15) + 'px; top:' + (mouse[1] - 35) + 'px')
        .html(d.properties.name);
}


/* Click to reset the zoom-in of region. */
function zoom_reset(d) {
    active.classed('active', false);
    window.lv_stat = 1;
    // XXX: hard code...
    reconstructOut();
    unloadOut();
    /* reset recv and trans switch */
    $('#btn-map_port').removeClass('active');
    $('#btn-map_proto').addClass('active');

    var DELAY = 100,
        clicks = 0,
        timer = null;

    clicks++; //count clicks

    if (clicks === 1) {
        timer = setTimeout(function() {
            if ($('#tab-map').hasClass('visible')) {
                $('#tab-map').animate({ 'right': '-1000px' }, 500).removeClass('visible');
            }

            $('#tab-map').animate({ 'right': '0px' }, {
                duration: 500,
                progress: function() {
                    $('#map-camp').text('國立成功大學');
                    $('#info-camp').text('國立成功大學');
                    $('#map-dept').text('校本部');
                    $('#info-dept').text('校本部');

                    $('#dpid1').text('N/A');
                    $('#dpid2').text('N/A');
                    $('#switches').text('N/A');
                    $('#hosts').text('N/A');
                }
            }).addClass('visible');

            clicks = 0;
        }, DELAY);
    }

    if (d.properties.type == "reg") {
        active = d3.select(null);

        for (i = 0; i < 8; ++i) {
            region[i].transition()
                .duration(750)
                .style('stroke-width', '1.5px')
                .attr('transform', '');

            dept[i].attr('visibility', 'hidden');
        }
    } else if (d.properties.type == "dept") {
        active = region[d.properties.reg];

        $('#tab-info').animate({ 'right': '-1000px' }, 500).removeClass('visible');
        //document.getElementById('select-dept').innerHTML = '';

        for (i = 0; i < 8; ++i) {
            region[i].transition()
                .duration(500)
                .style('stroke-width', 1.5 / zoomReg_scale + 'px')
                .attr('transform', 'translate(' + zoomReg_trans + ')scale(' + zoomReg_scale + ')');

            if (i == d.properties.reg) {
                dept[d.properties.reg].attr('transform', 'translate(' + zoomReg_trans + ')scale(' + zoomReg_scale + ')')

                dept[d.properties.reg].style('opacity', 0.0)
                    .transition()
                    .duration(250)
                    .delay(250)
                    .style('opacity', 1.0)
                    .style('stroke-width', 1.5 / zoomReg_scale + 'px')
                    .attr('visibility', 'visible');
            }
        }
    }
}

/* Click to zoom-in of region. */
function zoomReg(d) {
    $('.container-mode').css('visibility', 'hidden');
    window.lv_stat = 2;
    // XXX: hard code...
    reconstructOut();
    unloadOut();
    /* reset recv and trans switch */
    $('#btn-map_port').removeClass('active');
    $('#btn-map_proto').addClass('active');

    if (active.node() === this)
        return zoom_reset(d);

    select_camp = d.properties.name;

    active.classed('active', false);
    active = d3.select(this).classed('active', true);

    var DELAY = 100,
        clicks = 0,
        timer = null;

    clicks++; //count clicks

    if (clicks === 1) {
        timer = setTimeout(function() {
            if ($('#tab-map').hasClass('visible')) {
                $('#tab-map').animate({ 'right': '-1000px' }, 500).removeClass('visible');
            }

            $('#tab-map').animate({ 'right': '0px' }, {
                duration: 500,
                progress: function() {
                    $('#map-camp').text('校本部');
                    $('#info-camp').text('校本部');
                    $('#map-dept').text(select_camp);
                    $('#info-dept').text(select_camp);

                    $('#dpid1').text('N/A');
                    $('#dpid2').text('N/A');
                    $('#switches').text('N/A');
                    $('#hosts').text('N/A');
                }
            }).addClass('visible');

            clicks = 0;
        }, DELAY);
    }

    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2;

    zoomReg_scale = 0.75 / Math.max(dx / $('.map-demo').width(), dy / $('.map-demo').height());
    zoomReg_trans = [$('.map-demo').width() / 2 - zoomReg_scale * x, $('.map-demo').height() / 2 - zoomReg_scale * y];

    for (i = 0; i < 8; ++i) {
        dept[i].attr('visibility', 'hidden');
        region[i].transition()
            .duration(500)
            .style('stroke-width', 1.5 / zoomReg_scale + 'px')
            .attr('transform', 'translate(' + zoomReg_trans + ')scale(' + zoomReg_scale + ')');

        if (i == d.properties.reg) {
            dept[d.properties.reg].attr('transform', 'translate(' + zoomReg_trans + ')scale(' + zoomReg_scale + ')')

            dept[d.properties.reg].style('opacity', 0.0)
                .transition()
                .duration(250)
                .delay(250)
                .style('opacity', 1.0)
                .style('stroke-width', 1.5 / zoomReg_scale + 'px')
                .attr('visibility', 'visible');
        }
    }

    /*water.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

    road.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');*/
}


/* Click to zoom-in of dept. */
function zoomDept(d) {
    if (active.node() === this)
        return zoom_reset(d);
    window.lv_stat = 3;
    /* reset recv and trans switch */
    $('#btn-map_port').removeClass('active');
    $('#btn-map_proto').addClass('active');

    select_dept = d.properties.name;

    active.classed('active', false);
    active = d3.select(this).classed('active', true);

    var DELAY = 100,
        clicks = 0,
        timer = null;

    clicks++; //count clicks

    if (clicks === 1) {
        timer = setTimeout(function() {
            if ($('#tab-map').hasClass('visible')) {
                $('#tab-map').animate({ 'right': '-1000px' }, 500).removeClass('visible');
            }

            $('#tab-map').animate({ 'right': '0px' }, {
                duration: 500,
                progress: function() {
                    $('#map-camp').text(select_camp);
                    $('#info-camp').text(select_camp);
                    $('#map-dept').text(select_dept);
                    $('#info-dept').text(select_dept);

                    // Show switch between topology and campus view.
                    if (select_dept == '資訊系館') {
                        $('.container-mode').css('visibility', 'visible');
                        $('#dpid1').text('1');
                        $('#dpid2').text('1');
                        $('#switches').text('3');
                        $('#hosts').text('6');
                        // XXX: hard code...
                        intro_out();
                    } else {
                        $('.container-mode').css('visibility', 'hidden');
                        $('#dpid1').text('N/A');
                        $('#dpid2').text('N/A');
                        $('#switches').text('N/A');
                        $('#hosts').text('N/A');
                    }
                }
            }).addClass('visible');

            clicks = 0;
        }, DELAY);
    }

    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,

        scale = 0.75 / Math.max(dx / $('.map-demo').width(), dy / $('.map-demo').height()),
        translate = [$('.map-demo').width() / 2 - scale * x, $('.map-demo').height() / 2 - scale * y];

    for (i = 0; i < 8; ++i) {
        region[i].transition()
            .duration(500)
            .style('stroke-width', 1.5 / scale + 'px')
            .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

        if (i == d.properties.reg) {
            dept[d.properties.reg].attr('transform', 'translate(' + translate + ')scale(' + scale + ')')

            dept[d.properties.reg].style('opacity', 0.0)
                .transition()
                .duration(250)
                .delay(250)
                .style('opacity', 1.0)
                .style('stroke-width', 1.5 / scale + 'px')
                .attr('visibility', 'visible');
        }
    }
}

/* Change the size view of the window */
function sizeChange() {
    d3.select('g')
        .attr('transform', 'scale(' + $('.map-demo').width() / 900 + ')');

    $('svg').height($('.map-demo').width() * 0.618);
}
