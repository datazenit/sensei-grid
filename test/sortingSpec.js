// helper functions defined in helpers.js
var data = generateData(10);
var columns = getColumns(data);

describe("sensei-grid sorting", function () {

    var grid;
    var $el = $('<div class="sensei-grid">');

    // create dom element before each test
    beforeEach(function () {

        // suppress console.log statements from src files
        console.log = function () {
        };

        // create wrapper element
        $("body").append($el);
    });

    // remove grid wrapper after each test
    afterEach(function () {
        if (grid !== null) {
            grid.destroy();
            grid = null;
        }
    });

    it("sortable class shouldnt be added by default", function () {
        // render grid
        grid = $el.grid(data, columns, {sortable: false});
        grid.render();

        expect($(".sensei-grid-table-wrapper>table>thead>tr>th:first").length).toEqual(1);
        expect($(".sensei-grid-table-wrapper>table>thead>tr>th:first").attr("class")).toBeUndefined();
    });

    it("should add sorting class to th elements", function () {
        // render grid
        grid = $el.grid(data, columns, {sortable: true});
        grid.render();

        expect($(".sensei-grid-table-wrapper>table>thead>tr>th:first").length).toEqual(1);
        expect($(".sensei-grid-table-wrapper>table>thead>tr>th:first").attr("class")).toEqual("sensei-grid-sortable");
    });

    it("clicking on column header should trigger sorting event", function (done) {
        // render grid
        grid = $el.grid(data, columns, {sortable: true});
        grid.render();

        var $th = $(".sensei-grid-table-wrapper>table>thead>tr:first>th:first");

        // listen to row:save event and test returned values
        grid.events.on("column:sort", function (col, order, $el) {
            expect(col).toEqual("id");
            expect(order).toEqual("asc");
            done();
        });

        // trigger click event on first th element
        $th.click();
    });
});