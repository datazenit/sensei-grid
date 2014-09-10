// helper functions defined in helpers.js
var data = generateData(10);
var columns = getColumns(data);

describe("sensei-grid dom events", function () {

    var grid;
    var $el = $('<div class="sensei-grid">');

    // create dom element before each test
    beforeEach(function () {

        console.info("beforeEach");

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
        console.info("afterEach");
        grid.destroy();
        grid = null;
    });

    describe("click", function () {
        it("should set active cell", function () {
            var $cell = $(".sensei-grid>table>tbody>tr:first>td:eq(3)");
            $cell.trigger("click");
            expect($cell.hasClass("activeCell")).toBe(true);

            var $cell2 = $(".sensei-grid>table>tbody>tr:eq(4)>td:eq(1)");
            $cell2.trigger("click");
            expect($cell2.hasClass("activeCell")).toBe(true);
        });
        it("should only activate one cell", function () {
            var $cell = $(".sensei-grid>table>tbody>tr:first>td:eq(3)");
            $cell.trigger("click");
            expect($(".sensei-grid .activeCell").length).toBe(1);

            var $cell2 = $(".sensei-grid>table>tbody>tr:eq(4)>td:eq(1)");
            $cell2.trigger("click");
            expect($(".sensei-grid .activeCell").length).toBe(1);
        });
    });
    describe("dblclick", function () {
        it("should open editor", function () {
            var $cell = $(".sensei-grid>table>tbody>tr:first>td:eq(3)");
            $cell.trigger("dblclick");
            expect($(".sensei-grid-editor").is(":visible")).toBe(true);
            expect($(".sensei-grid-editor").length).toBe(1);
        });
    });
});