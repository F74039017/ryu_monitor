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

<<<<<<< HEAD
for (i = 0; i < 8; ++i) {
=======
for (i = 0; i < 9; ++i) {
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
    region[i] = svg.append('g');
    dept[i] = svg.append('g');
}

<<<<<<< HEAD
var active = d3.select(null),
    zoomReg_scale = 0,
    zoomReg_trans = 0,
    select_camp = '',
    select_dept = '';

/* Draw map with TopoJSON */
d3.json('/static/data/topojson/ncku.json', function(error, map) {
=======
var active = d3.select(null);

/* Draw map with TopoJSON */
d3.json('data/topojson/ncku.json', function(error, map) {
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
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
<<<<<<< HEAD
=======
            .on('dblclick', function(e) {
                e.preventDefault();
            })
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
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

<<<<<<< HEAD
d3.json('/static/data/topojson/ncku.json', function(error, map) {
=======
d3.json('data/topojson/ncku.json', function(error, map) {
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
    if (error)
        return console.error(error);

    for (i = 0; i < 8; ++i) {
        dept[i].selectAll('path')
            .data(topojson.feature(map, map.objects['dept_' + i]).features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('class', 'dept_' + i)
<<<<<<< HEAD
            .on('click', zoomDept)
=======
            //.on('click', zoom_in)
            //.on('dblclick', function(e) {
            //    e.preventDefault();
            //})
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
            .on('mousemove', hover_show)
            .on('mouseout', function() {
                tooltip.classed('hidden', true);
            });

        dept[i].append('path')
<<<<<<< HEAD
            .datum(topojson.mesh(map, map.objects['dept_' + i], function(a, b) {
                return a !== b;
            }))
=======
            //.datum(topojson.mesh(map, map.objects['dept_' + i], zoom_diff))
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
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

<<<<<<< HEAD
/* Click to reset the zoom-in of region. */
function zoom_reset(d) {
    active.classed('active', false);

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

        $('#tab-map').animate({ 'right': '-1000px' }, 500).removeClass('visible');
        document.getElementById('select-dept').innerHTML = '';

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
    if (active.node() === this)
        return zoom_reset(d);

    select_camp = d.properties.name;

    active.classed('active', false);
    active = d3.select(this).classed('active', true);

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

    select_dept = d.properties.name;

    document.getElementById('select-camp').innerHTML = select_camp;
    document.getElementById('select-dept').innerHTML = select_dept;
=======
/* Click to zoom out */
function zoom_reset() {
    active.classed('active', false);
    active = d3.select(null);

    for (i = 0; i < 8; ++i) {
        region[i].transition()
            .duration(750)
            .style('stroke-width', '1.5px')
            .attr('transform', '');

        dept[i].attr('visibility', 'hidden')
    }
}

/* Click to zoom-in of the region */
function zoomReg(d) {
    if (active.node() === this)
        return zoomReg_reset(d);
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c

    active.classed('active', false);
    active = d3.select(this).classed('active', true);

    var DELAY = 100,
        clicks = 0,
        timer = null;

    clicks++; //count clicks

    if (clicks === 1) {
        timer = setTimeout(function() {
<<<<<<< HEAD
            if ($('#tab-map').hasClass('visible')) {
                $('#tab-map').animate({ 'right': '-1000px' }, 500).removeClass('visible');
            }

            if ($('#tab-info').hasClass('visible')) {
                $('#tab-info').animate({ 'right': '-1000px' }, 500).removeClass('visible');
            }

            $('#tab-map').animate({ 'right': '0px' }, 500).addClass('visible');

            clicks = 0;
        }, DELAY);
    }
=======
            if ($('#tab-info').hasClass('visible')) {
                $('#tab-info').animate({ 'right': '-1000px' }, 500).removeClass('hidden').addClass('visible');
            }

            if ($('#tab-topo').hasClass('visible')) {
                $('#tab-topo').animate({ 'right': '-1000px' }, 500).removeClass('hidden').addClass('visible');
            }

            $('#tab-topo').animate({ 'right': '0px' }, 500).removeClass('hidden').addClass('visible');
            clicks = 0;
        }, DELAY);
    } /*else {
        clearTimeout(timer); //prevent single-click action
        if ($('#tab-topo').hasClass('visible')) {
            $('#tab-topo').animate({ 'right': '-1000px' }, 500).addClass('visible');
        }
        $('#tab-info').animate({ 'right': '0px' }, 500).addClass('visible');
        console.log('Double');
        clicks = 0;
    }*/

>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c

    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
<<<<<<< HEAD
        scale = 0.75 / Math.max(dx / $('.map-demo').width(), dy / $('.map-demo').height()),
        translate = [$('.map-demo').width() / 2 - scale * x, $('.map-demo').height() / 2 - scale * y];

    for (i = 0; i < 8; ++i) {
=======
        scale = 0.75 / Math.max(dx / $('svg').width(), dy / $('svg').height()),
        translate = [$('svg').width() / 2 - scale * x, $('svg').height() / 2 - scale * y];

    for (i = 0; i < 8; ++i) {
        dept[i].attr('visibility', 'hidden')

>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
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
<<<<<<< HEAD
=======

    /*water.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

    road.transition()
        .duration(750)
        .style('stroke-width', 1.5 / scale + 'px')
        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');*/
}

/* Click to reset the zoom-in of region */
function zoomReg_reset(d) {
    active.classed('active', false);
    active = d3.select(null);

    for (i = 0; i < 8; ++i) {
        region[i].transition()
            .duration(750)
            .style('stroke-width', '1.5px')
            .attr('transform', '');

        dept[i].attr('visibility', 'hidden');
    }

    /*water.transition()
        .duration(750)
        .style('stroke-width', '1.5px')
        .attr('transform', '');

    road.transition()
        .duration(750)
        .style('stroke-width', '1.5px')
        .attr('transform', '');

    dept.transition()
        .duration(750)
        .style('stroke-width', '1.5px')
        .attr('transform', '');*/
>>>>>>> f686840757ffebc3be8a86f532ed95271d9d6f6c
}

/* Change the size view of the window */
function sizeChange() {
    d3.select('g')
        .attr('transform', 'scale(' + $('.map-demo').width() / 900 + ')');

    $('svg').height($('.map-demo').width() * 0.618);
}
