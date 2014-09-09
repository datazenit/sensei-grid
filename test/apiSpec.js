// helper functions defined in helpers.js
var data = generateData(10);
var columns = getColumns(data);

describe("sensei-grid api", function () {

    var grid;
    var $el = $('<div class="sensei-grid-test">');

    // create dom element before each test
    beforeEach(function () {

        // suppress console.log statements from src files
        console.log = function () {};

        // create wrapper element
        $("body").append($el);

        // render grid
        grid = $el.grid(data, columns);
        grid.render();
    });

    // remove grid wrapper after each test
    afterEach(function () {
        $(".sensei-grid-test").remove();
        grid = null;
    });

    describe("getRowDataByIndex", function () {
        it("should return data by positive index", function () {
            expect(grid.getRowDataByIndex(0)).toEqual(data[0]);
            expect(grid.getRowDataByIndex(1)).toEqual(data[1]);
            expect(grid.getRowDataByIndex(9)).toEqual(data[9]);
        });
        it("should return data by negative index", function () {
            expect(grid.getRowDataByIndex(-1)).toEqual(data[9]);
        });
        it("should throw error when row does not exist", function () {
            expect(function () { grid.getRowDataByIndex(100) }).toThrowError("Row does not exist");
            expect(function () { grid.getRowDataByIndex(-100) }).toThrowError("Row does not exist");
            expect(function () { grid.getRowDataByIndex("foo") }).toThrowError("Row does not exist");
        });
    });

    describe("getRowData", function () {
        it("should return row data", function () {
            var $row = $(".sensei-grid-test>table>tbody>tr");
            expect(grid.getRowData($row.eq(0))).toEqual(data[0]);
            expect(grid.getRowData($row.eq(1))).toEqual(data[1]);
            expect(grid.getRowData($row.eq(9))).toEqual(data[9]);
        });
    });

    describe("getRowCells", function () {
        it("should return row cells", function () {
            var $row = $(".sensei-grid-test>table>tbody>tr:first");
            expect(grid.getRowCells($row).length).toEqual(5);
            expect(grid.getRowCells($row).get()).toEqual($row.find(">td").get());
        });
    });
});