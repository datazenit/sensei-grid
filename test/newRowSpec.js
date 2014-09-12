// helper functions defined in helpers.js
var data = generateData(10);
var columns = getColumns(data);

describe("sensei-grid new row", function () {

    var grid;
    var $el = $('<div class="sensei-grid">');

    // create dom element before each test
    beforeEach(function () {

        // suppress console.log statements from src files
        console.log = function () {};

        // create wrapper element
        $("body").append($el);

        // render grid
        //grid = $el.grid(data, columns);
        //grid.render();
    });

    // remove grid wrapper after each test
    afterEach(function () {
        grid.destroy();
        grid = null;
    });

    it("should render new empty row at the end of table if setting is enabled", function () {
        // render grid
        grid = $el.grid(data, columns, {emptyRow: true});
        grid.render();

        expect($(".sensei-grid>table>tbody>tr").length).toEqual(11);
        expect($(".sensei-grid>table>tbody>tr:last").text()).toEqual("");
    });

    it("should not render new empty row at the end of table if setting is disabled", function () {
        // render grid
        grid = $el.grid(data, columns, {emptyRow: false});
        grid.render();

        expect($(".sensei-grid>table>tbody>tr").length).toEqual(10);
        expect($(".sensei-grid>table>tbody>tr:last").text()).not.toEqual("");
    });
});