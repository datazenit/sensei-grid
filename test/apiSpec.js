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


    // api examples
    //var $row = grid.getRowByIndex(5);
    //console.group("data api examples");
    //console.log("grid.getRowDataByIndex(0):", grid.getRowDataByIndex(0));
    //console.log("grid.getRowData($row):", grid.getRowData($row));
    //console.log("grid.getCellDataByIndex(0, 1):", grid.getCellDataByIndex(0, 1));
    //console.log("grid.getCellDataByKey(2, created_at):", grid.getCellDataByKey(2, "created_at"));
    //console.log("grid.getGridData():", grid.getGridData());
    //console.groupEnd();

    describe("getRowDataByIndex", function () {
        it("should return data by positive index", function () {
            expect(grid.getRowDataByIndex(0)).toEqual(data[0]);
            expect(grid.getRowDataByIndex(1)).toEqual(data[1]);
            expect(grid.getRowDataByIndex(9)).toEqual(data[9]);
        });
        it("should return data by negative index", function () {
            expect(grid.getRowDataByIndex(-1)).toEqual(data[9]);
        });
        it("should throw error when row is not found", function () {
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

    describe("getCellDataByIndex", function () {
        it("should return cell data by index", function () {
            expect(grid.getCellDataByIndex(0,0)).toEqual(data[0]["id"]);
            expect(grid.getCellDataByIndex(5,4)).toEqual(data[5]["count"]);
        });
        it("should return cell data by negative index", function () {
            expect(grid.getCellDataByIndex(-1,0)).toEqual(data[9]["id"]);
            expect(grid.getCellDataByIndex(0,-1)).toEqual(data[0]["count"]);
        });
        it("should throw error when cell or row is not found", function () {
            expect(function () { grid.getCellDataByIndex(100,0) }).toThrowError("Row does not exist");
            expect(function () { grid.getCellDataByIndex(0,100) }).toThrowError("Cell does not exist");
            expect(function () { grid.getCellDataByIndex(100,100) }).toThrowError("Row does not exist");
        });
    });
});