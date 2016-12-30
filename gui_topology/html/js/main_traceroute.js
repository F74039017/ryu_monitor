$(function() {
    var route = ["10.0.0.1", "1", "3", "10.0.0.4"];
    //getRoute();
});

function getRoute(route) {
    var linkX1,
        linkX2,
        linkY1,
        linkY2;

    $('#left svg g > .njg-node').each(function() {
        if ($(this).parent().children('.njg-tooltip').text() == route[0]) {
            if (i == 0) {
                $(this).addClass('route_host');
                $(this).css('stroke', 'rgb(0, 204, 0)');
                $(this).css('stroke-opacity', '0.7');
                $(this).css('color', 'rgba(0, 102, 0, 0.85)');
            } else {
                $(this).addClass('route_sw');
                $(this).css('stroke', 'rgb(51, 255, 51)');
                $(this).css('stroke-opacity', '0.5');
                $(this).css('color', 'rgba(0, 204, 0, 0.85)');
            }
            linkX1 = $(this).attr('cx');
            linkY1 = $(this).attr('cy');
        }
    });

    for (var i = 1; i < route.length; ++i) {
        $('#left svg g > .njg-node').each(function() {
            if ($(this).parent().children('.njg-tooltip').text() == route[i]) {
                if (i == route.length - 1) {
                    $(this).addClass('route_host');
                    $(this).css('stroke', 'rgb(0, 204, 0)');
                    $(this).css('stroke-opacity', '0.7');
                    $(this).css('color', 'rgba(0, 102, 0, 0.85)');
                } else {
                    $(this).addClass('route_sw');
                    $(this).css('stroke', 'rgb(51, 255, 51)');
                    $(this).css('stroke-opacity', '0.5');
                    $(this).css('color', 'rgba(0, 204, 0, 0.85)');
                }
                linkX2 = $(this).attr('cx');
                linkY2 = $(this).attr('cy');
            }
        });

        $('#left svg g > .njg-link').each(function() {
            if ($(this).attr('x1') == linkX1 && $(this).attr('y1') == linkY1 && $(this).attr('x2') == linkX2 && $(this).attr('y2') == linkY2) {
                $(this).css('stroke', 'rgb(102, 255, 102)');
                $(this).css('stroke-opacity', '0.5')
                $(this).css('stroke-width', '3');
                $(this).css('color', 'rgba(102, 255, 102, 1)');
            } else if ($(this).attr('x1') == linkX2 && $(this).attr('y1') == linkY2 && $(this).attr('x2') == linkX1 && $(this).attr('y2') == linkY1) {
            	$(this).css('stroke', 'rgb(102, 255, 102)');
                $(this).css('stroke-opacity', '0.5')
                $(this).css('stroke-width', '3');
                $(this).css('color', 'rgba(102, 255, 102, 1)');
            }
        });

        linkX1 = linkX2;
        linkY1 = linkY2;
    }
}
