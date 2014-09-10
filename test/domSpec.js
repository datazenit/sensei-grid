// helper functions defined in helpers.js
var data = generateData(10);
var columns = getColumns(data);

describe("sensei-grid dom", function () {

    var grid;
    var $el = $('<div class="sensei-grid">');

    // create dom element before each test
    beforeEach(function () {

        // suppress console.log statements from src files
        console.log = function () {};

        // create wrapper element
        $("body").append($el);

        // render grid
        grid = $el.grid(data, columns);
        grid.registerEditor(BasicEditor);
        grid.render();
    });

    // remove grid wrapper after each test
    afterEach(function () {
        grid.destroy();
        grid = null;
    });

    it("should have a wrapper element", function () {
        expect($(".sensei-grid").length).toBe(1);
    });

    it("should have a table element and core structure", function () {
        expect($(".sensei-grid>table").length).toBe(1);
        expect($(".sensei-grid>table>thead").length).toBe(1);
        expect($(".sensei-grid>table>tbody").length).toBe(1);
        expect($(".sensei-grid>table>tbody>tr").length).toBe(10);
        expect($(".sensei-grid>table>thead>tr").length).toBe(1);
    });

    it("should render columns", function () {
        var $ths = $(".sensei-grid>table>thead>tr>th");
        var columnValues = $ths.map(function () {
            return $(this).text();
        }).get();

        expect($ths.length).toBe(5);
        expect(columnValues).toEqual(["id", "created_at", "status", "title", "count"]);
    });

    it("should render data", function () {
        var $firstRow = $(".sensei-grid>table>tbody>tr:first");
        var $lastRow = $(".sensei-grid>table>tbody>tr:last");

        expect($firstRow.find("td:first").text()).toEqual(data[0]["id"]);
        expect($firstRow.find("td:first").html()).toEqual("<div>" + data[0]["id"] + "</div>");

        expect($lastRow.find("td:eq(0)").text()).toEqual(data[9]["id"]);
        expect($lastRow.find("td:eq(1)").text()).toEqual(data[9]["created_at"]);
        expect($lastRow.find("td:eq(2)").text()).toEqual(data[9]["status"]);
        expect($lastRow.find("td:eq(3)").text()).toEqual(data[9]["title"]);
        expect(parseInt($lastRow.find("td:eq(4)").text())).toEqual(data[9]["count"]);
    });
});