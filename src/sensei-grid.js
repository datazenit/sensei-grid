(function ($) {

    // @TODO need to refactor event model. For example, avoid forced focus on grid,
    // just set a mode (active/inactive) instead.
    // key events should be global not specific to sensei grid, thus no focus would be needed
    // on sensei grid for them to work.
    // current event model and forced focus causes grid to get scrolled in area
    // when editor moves/closes which is unnecessary

    $.fn.grid = function (data, columns, options, name) {

        var plugin = this,
            defaults = {
                emptyRow: false,
                sortable: true,
                tableClass: "table table-bordered table-condensed",
                disableKeys: [],
                moveOnRowRemove: true,
                readonly: false,
                emptyGridMessage: null
            };

        plugin.name = null;
        plugin.isEditing = false;
        plugin.$prevRow = null;
        plugin.editorProps = {};
        plugin.preventEnter = false;

        $.fn.isOnScreen = function () {

            var win = $(window);

            var viewport = {
                top: win.scrollTop(),
                left: win.scrollLeft()
            };
            viewport.right = viewport.left + win.width();
            viewport.bottom = viewport.top + win.height();

            var bounds = this.offset();
            bounds.right = bounds.left + this.outerWidth();
            bounds.bottom = bounds.top + this.outerHeight();

            return (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));

        };

        /**
         * Force redraw on element
         * @param $el
         */
        var redraw = function ($el) {
            var el = $el.get(0);
            var d = el.style.display;

            // actual code that will force redraw of element
            el.style.display = "none";
            el.offsetHeight; // jshint ignore:line
            el.style.display = d;
        };

        /**
         * Normalize line endings
         * @param text
         * @returns string
         */
        var normalizeLineEndings = function (text) {
            return text.replace(/\r\n/g, "\n");
        };

        plugin.setActiveCell = function ($el) {

            // disable setting active cell when in read only mode
            if (plugin.config.readonly) {
              return;
            }

            plugin.$prevRow = $(".sensei-grid-tbody>tr>.activeCell", plugin.$el).parent("tr");
            plugin.$prevRow.removeClass("activeRow");

            $(".sensei-grid-tbody>tr>.activeCell", plugin.$el).removeClass("activeCell");
            $el.addClass("activeCell");
            $el.parent("tr").addClass("activeRow");

            // redraw element to fix border style in firefox
            // this should be called only for firefox, can cause performance issues on large grids
            redraw($el.parent("tr"));

            // trigger cell:select event
            plugin.events.trigger("cell:select", $el);

            if (plugin.$prevRow.index() !== $el.parent("tr").index()) {
                plugin.events.trigger("row:select", $el.parent("tr"));
                if (plugin.$prevRow.hasClass("sensei-grid-dirty-row") && plugin.isEditing) {
                    // save editor while keeping it open before trigger row:save event
                    // otherwise the value is not present in row data
                    plugin.saveEditor(true);
                    plugin.events.trigger("row:save", plugin.getRowData(plugin.$prevRow), plugin.$prevRow, "row:select");
                }
            }

            // @todo remove
            // focus first row action, if current cell is row action cell
            // if ($el.data("action") === true) {
            // }
        };

        // fixes inconsistent position in firefox/chrome
        // for this to work a div is needed inside table cell
        $.fn.cellPosition = function () {

            var pos = $(this).position();

            // if browser is firefox or similar, fix table cell position
            // firefox calculates cell positions differently from webkit browsers
            if (plugin.isSillyFirefox()) {
                pos.left -= 1;
                pos.top -= 1;
            }

            return pos;
        };

        plugin.events = {_events: {}};
        plugin.events.on = function (event, callback, context) {
            if (!_.has(this._events, event)) {
                this._events[event] = [];
            }
            this._events[event].push({callback: callback, context: context});
        };
        plugin.events.trigger = function (event) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (_.has(this._events, event)) {
                var events = this._events[event];
                _.each(events, function (e) {
                    var cbk = _.bind(e["callback"], e["context"]);
                    cbk.apply(this, args);
                });
            }
        };
        plugin.events.off = function (event) {
            if (_.has(this._events, event)) {
                delete this._events[event];
            }
        };

        plugin.isSillyFirefox = function () {
            if (!plugin.$el.find("td:first").position()) {
              return false;
            }
            var tableLeft = plugin.$el.position().left;
            var cellLeft = plugin.$el.find("td:first").position().left;
            return cellLeft !== tableLeft;
        };

        plugin.registerEditor = function (Editor) {
            var instance = new Editor(plugin);
            plugin.editors[instance.name] = instance;
        };

        plugin.registerRowAction = function (RowAction) {
            var instance = new RowAction(plugin);
            plugin.rowActions[instance.name] = instance;
        };

        plugin.render = function () {

            // render row actions
            plugin.rowElements = {};
            _.each(plugin.rowActions, function (rowAction) {
                rowAction.initialize();
                var rowEl = "<div>" + rowAction.rowElement() + "</div>";
                plugin.rowElements[rowAction.name] = rowEl;
            });

            plugin.renderBaseTable();
            plugin.renderColumns();
            plugin.renderData();

            // render each editor
            _.each(plugin.editors, function (editor) {
                editor.initialize();
                editor.render();
                editor.getElement().hide();
            });

            plugin.bindEvents();
        };

        plugin.destroy = function () {
            plugin.unbindEvents();
            plugin.$el.remove();
        };

        plugin.addEdit = function (edit){
            // the pointer is at the last element in the edits array; push and exit
            if (plugin.editPointer === plugin.edits.length - 1) {
                plugin.editPointer += 1;
                plugin.edits.push(edit);

            } else {
                // the pointer is not at the end; an undo occured, so changes after this must be erased
                plugin.editPointer += 1;

                // remove the nth element; parameter takes a position, not an index
                plugin.edits.splice(plugin.editPointer);
                plugin.edits.push(edit);
            }
        };

        plugin.redo = function (){
            if (plugin.editPointer + 1 >= plugin.edits.length) {
                return [];

            } else {
                plugin.editPointer += 1;
                return plugin.edits[plugin.editPointer];
            }
        };

        plugin.undo = function () {
            if (plugin.editPointer < 0) {
                return [];

            } else {
                var edit = plugin.edits[plugin.editPointer];
                plugin.editPointer -= 1;
                return edit;
            }
        };

        plugin.bindEvents = function () {
            // unbind previous events
            plugin.unbindEvents();

            plugin.$el.find(".sensei-grid-tbody>tr>td").on("click.grid."+plugin.name, plugin.clickCell);
            plugin.$el.find(".sensei-grid-tbody>tr>td").on("dblclick.grid", plugin.dblClickCell);
            plugin.$el.on("blur.grid", plugin.blur);
            plugin.$el.on("keydown.grid", plugin.keydown);
            plugin.$el.find(".sensei-grid-tbody>tr>th.sensei-grid-sortable").on("click.grid", plugin.sort);
            $(document).on("click.grid", plugin.editorBlur);
        };

        plugin.unbindEvents = function () {

            plugin.$el.off(".grid");
            $(document).off(".grid");
        };

        plugin.sort = function () {
            // get column value
            var col = $(this).text();
            var order = "asc";

            // remove previous sorting icon
            plugin.$el.find("th.sensei-grid-sortable .glyphicon").remove();

            if ($(this).data("order") && $(this).data("order") === "asc") {
                order = "desc";
                // add sorting icon
                $(this).append($("<span>").addClass("glyphicon glyphicon-chevron-up"));
            } else {
                // add sorting icon
                $(this).append($("<span>").addClass("glyphicon glyphicon-chevron-down"));
            }

            // save sort order
            $(this).data("order", order);

            // trigger callback
            plugin.events.trigger("column:sort", col, order, $(this));

            plugin.renderData();
        };

        plugin.editorBlur = function (e) {
            if (plugin.getActiveCell().length > 0 && plugin.$el.has($(e.target)).length === 0) {
                plugin.exitEditor();
                plugin.deactivateCell();
            }
        };

        plugin.hideEditors = function () {
            $(".sensei-grid-editor", plugin.$el).hide();
        };

        plugin.blur = function () {
            // check if focus has moved to editor
            // e.relatedTarget && plugin.$el.has($(e.relatedTarget))
            // not firefox compatible
            if (plugin.getActiveCell().length > 0 && !plugin.isEditing) {
                var $td = plugin.getActiveCell();
                plugin.exitEditor();
                plugin.isEditing = false;
                plugin.deactivateCell();

                // force redraw on last active row
                redraw($td.parent("tr"));
            }
        };

        // core parsers for cell values
        plugin.parsers = {};
        plugin.parsers["string"] = function (val) {
            return val.toString();
        };
        plugin.parsers["int"] = function (val) {
            return parseInt(val);
        };
        plugin.parsers["float"] = function (val) {
            return parseFloat(val);
        };

        plugin.getCellData = function ($cell) {
            var value = $cell.text();
            var type = plugin.getCellType($cell);

            // parse value according to defined cell type
            if (_.has(plugin.parsers, type)) {
                value = plugin.parsers[type](value);
            }

            return value;
        };

        plugin.getCellColumn = function ($cell) {
            return $cell.data("column");
        };

        plugin.getCellType = function ($cell) {
            return $cell.data("type");
        };

        plugin.getCellStatus = function ($cell) {
            return !!$cell.data("saved");
        };

        plugin.getCellDataByIndex = function (row, cell) {
            var $row = plugin.getRowByIndex(row);
            var $cell = plugin.getCellFromRowByIndex($row, cell);
            return plugin.getCellData($cell);
        };

        plugin.getCellDataByKey = function (row, key) {
            var $row = plugin.getRowByIndex(row);
            var $cell = plugin.getCellFromRowByKey($row, key);
            return plugin.getCellData($cell);
        };

        plugin.getCellFromRowByIndex = function ($row, index) {
            var $cell = $row.find("td").eq(index);
            if ($cell.length === 0) {
                throw new Error("Cell does not exist");
            }

            return $cell;
        };

        plugin.getCellFromRowByKey = function ($row, key) {

            var $cell = $row.find("td").filter(function () {
                return $(this).data("column") === key;
            });
            if ($cell.length === 0) {
                throw new Error("Cell does not exist");
            }

            return $cell;
        };

        plugin.getCellRow = function ($cell) {
            return $cell.parent("tr");
        };

        plugin.getRowCellsByIndex = function (index) {
            return plugin.getRowByIndex(index).find("td");
        };

        plugin.getRowCells = function ($row) {
            return $row.find("td");
        };

        plugin.getRowByIndex = function (index) {
            var $row = plugin.$el.find(".sensei-grid-tbody>tr").eq(index);
            if ($row.length === 0) {
                throw new Error("Row does not exist");
            }

            return $row;
        };

        plugin.getRowDataByIndex = function (index) {
            var $row = plugin.getRowByIndex(index);
            return plugin.getRowData($row);
        };

        plugin.getRowData = function ($row) {

            // get all cells from row
            var $cells = plugin.getRowCells($row);

            // get data from each cell
            var data = {};
            $cells.each(function () {
                data[plugin.getCellColumn($(this))] = plugin.getCellData($(this));
            });
            return data;
        };

        plugin.getRows = function () {
            return plugin.$el.find(".sensei-grid-tbody>tr");
        };

        plugin.getGridData = function () {
            var $rows = plugin.getRows();
            return $rows.map(function () {
                return plugin.getRowData($(this));
            }).get();
        };

        plugin.getActiveCell = function () {
            // if editor is active, get active cell from it
            if (plugin.isEditing && plugin.activeEditor && plugin.activeEditor.activeCell) {
                return plugin.activeEditor.activeCell;
            }
            return $("td.activeCell", plugin.$el);
        };

        plugin.setRowSaved = function ($row) {
            $row.removeClass("sensei-grid-dirty-row").removeClass("sensei-grid-empty-row");
            $row.find(">td").data("saved", true);
        };

        plugin.setRowDirty = function ($row) {
            $row.addClass("sensei-grid-dirty-row").removeClass("sensei-grid-empty-row");
            $row.find(">td").data("saved", false);
        };

        plugin.deactivateCell = function () {
            var $td = plugin.getActiveCell();
            $td.removeClass("activeCell");
            $td.parent("tr").removeClass("activeRow");

            // trigger cell:deactivate event
            plugin.events.trigger("cell:deactivate", $td);
        };

        plugin.clearActiveCell = function () {
            var $td = plugin.getActiveCell();
            var oldValue = plugin.getCellData($td);
            $(">div", $td).empty();

            // trigger cell:clear event
            plugin.events.trigger("cell:clear", oldValue, $td);
        };

        plugin.removeRow = function ($row) {

          // get row index
          var row = $row.index();

          // avoid removing empty row
          if ($row.hasClass("sensei-grid-empty-row")) {
              return false;
          }

          // select another row
          if (plugin.config["moveOnRowRemove"]) {
              // @todo move up, if there are no rows below
              plugin.moveDown();
          }

          // get row data for event
          var data = plugin.getRowData($row);

          // trigger row:remove event before actual removal
          // could be used to persist changes in db
          plugin.events.trigger("row:remove", data, row, $row);

          // remove row
          $row.remove();
        };

        /**
         * Remove currently active row and trigger event
         */
        plugin.removeActiveRow = function () {

            // get active cell
            var $cell = plugin.getActiveCell();

            // can't remove a row if there is no active cell
            if (!$cell) {
                return false;
            }

            // get row element
            var $row = plugin.getCellRow($cell);

            // remove actual row
            plugin.removeRow($row);

            // return status
            return true;
        };

        plugin.duplicateActiveRow = function () {

            // get active cell
            var $cell = plugin.getActiveCell();

            // can't remove a row if there is no active cell
            if (!$cell) {
                return false;
            }

            // get row element
            var $row = plugin.getCellRow($cell);

            // avoid removing empty row
            if ($row.hasClass("sensei-grid-empty-row")) {
                return false;
            }

            // get current row data
            var data = plugin.getRowData($row);

            // duplicate current row
            var $newRow = $(plugin.renderRow(data, false, true));

            // insert row below current one
            $newRow.insertAfter($row);

            // move focus down
            plugin.moveDown();

            // trigger row:duplicate event
            plugin.events.trigger("row:duplicate", $newRow);

            // return status
            return true;
        };

        plugin.moveRight = function () {

            var $td = plugin.getActiveCell();

            if ($td.next().length > 0) {
                plugin.setActiveCell($td.next());
            } else {
                // try next row
                var $nextRow = $td.parent("tr").next();
                if ($nextRow.length > 0) {
                    plugin.setActiveCell($("td:first", $nextRow));
                }
            }
        };

        plugin.moveUp = function () {

            var $td = plugin.getActiveCell();

            var $prevRow = $td.parent("tr").prev();
            if ($prevRow.length > 0) {
                var index = $td.index();
                var $upCell = $("td", $prevRow).eq(index);
                if ($upCell.length > 0) {
                    plugin.setActiveCell($upCell);
                } else {
                    plugin.setActiveCell($("td:last", $prevRow));
                }
            }
        };

        plugin.moveLeft = function () {

            var $td = plugin.getActiveCell();

            if ($td.prev().length > 0) {
                plugin.setActiveCell($td.prev());
            } else {
                // try next row
                var $prevRow = $td.parent("tr").prev();
                if ($prevRow.length > 0) {
                    plugin.setActiveCell($("td:last", $prevRow));
                }
            }
        };

        plugin.moveDown = function () {

            var $td = plugin.getActiveCell();

            var $nextRow = $td.parent("tr").next();
            if ($nextRow.length > 0) {
                var index = $td.index();
                var $downCell = $("td", $nextRow).eq(index);
                if ($downCell.length > 0) {
                    plugin.setActiveCell($downCell);
                } else {
                    plugin.setActiveCell($("td:first", $nextRow));
                }
            }
        };

        plugin.move = function (direction) {
            var directionMethod = "move" + direction.charAt(0).toUpperCase() + direction.substr(1);
            if (_.has(plugin, directionMethod)) {

                // move active cell
                plugin[directionMethod]();

                if (plugin.isEditing) {
                    // save & hide editor
                    plugin.saveEditor();
                }

                if (plugin.isEditing) {
                    // show editor for currently active cell
                    plugin.editCell();
                }

                // scroll cell into viewport if it is not already visible
                if (!plugin.getActiveCell().find(">div").isOnScreen()) {
                    if (_.contains(["up", "left"], direction)) {
                        plugin.getActiveCell().get(0).scrollIntoView(true);
                    } else {
                        plugin.getActiveCell().get(0).scrollIntoView(false);
                    }
                }

            } else {
                console.warn("move method not found", directionMethod);
            }
        };

        plugin.editCell = function () {
            // disable editor when in read only mode
            if (!plugin.config.readonly) {
                plugin.showEditor();
            }
        };

        plugin.getEditor = function () {
            return plugin.activeEditor;
        };

        plugin.getEditorInstance = function () {
            var $td = plugin.getActiveCell();

            var editorName = $td.data("editor");

            if (editorName && _.has(plugin.editors, editorName)) {
                // check if there is props for this editor
                var col = plugin.getCellColumn($td);
                if (_.has(plugin.editorProps, col)) {
                    plugin.editors[editorName].props = plugin.editorProps[col];
                }
                return plugin.editors[editorName];
            } else {
                // throw Error("Editor not found: " + editorName);
                // editor not found, skip cell
                console.info("Editor not found, skipping cell: " + editorName);
                return false;
            }
        };

        plugin.saveEditor = function (keepEditor) {

            // save editor if is active
            if (plugin.isEditing && plugin.activeEditor) {

                var $td = plugin.getActiveCell();
                var val = plugin.activeEditor.getValue();

                if (normalizeLineEndings(val) !== normalizeLineEndings($td.text())) {

                    // stores the original content and records the cell row and column
                    var edit = {
                        "type":"cell",
                        "previousState": plugin.getCellData($td),
                        "currentState": val,
                        "row": plugin.getRowData(plugin.getCellRow($td))["id"],
                        "column": $td.index()
                    };

                    var allowHTML = $td.data("allowHTML");

                    // save the state prior to edit
                    plugin.addEdit(edit);

                    // set value from editor to the active cell
                    if (allowHTML) {
                        $td.html($("<div>").html(val));
                    } else {
                        $td.html($("<div>").text(val));
                    }

                    // trigger editor:save event
                    var data = {};
                    data[$td.data("column")] = val;
                    plugin.events.trigger("editor:save", data, $td);

                    // remove empty row status from current row and assure that
                    // there is at least one empty row at the end of table
                    var $tr = $td.parent("tr");
                    if ($tr.hasClass("sensei-grid-empty-row")) {
                        $tr.removeClass("sensei-grid-empty-row").addClass("sensei-grid-dirty-row");
                        plugin.assureEmptyRow();
                    }
                }
            }

            // hide editor if needed
            if (!keepEditor && plugin.activeEditor) {
                plugin.getEditor().hide();
            }
        };

        plugin.assureEmptyRow = function () {
            if (plugin.config["emptyRow"] && plugin.$el.find(".sensei-grid-tbody>tr.sensei-grid-empty-row").length === 0) {
                var $tbody = plugin.$el.find(".sensei-grid-tbody");
                var $row = plugin.renderRow(null, false);
                $tbody.append($row);
            }
        };

        plugin.exitEditor = function (skipSave) {
            var $td = plugin.getActiveCell();
            if (plugin.isEditing && plugin.activeEditor) {
                if (!skipSave) {
                    plugin.saveEditor();

                    var $row = $td.parent("tr");
                    // if the row was dirty, save it as a whole
                    if ($row.hasClass("sensei-grid-dirty-row") && plugin.isEditing) {
                        plugin.events.trigger("row:save", plugin.getRowData($row), $row, "editor:close");
                    }

                } else {
                    plugin.getEditor().hide();
                }
            }

            // need to regain focus
            if (plugin.isEditing) {
                plugin.setActiveCell($td);
                plugin.$el.focus();
            }

            plugin.isEditing = false;
        };

        plugin.moveEditor = function () {
            if (plugin.isEditing) {
                plugin.showEditor();
                plugin.editCell();
            }
        };

        plugin.showEditor = function () {

            if (!plugin.getEditorInstance()) {
              plugin.exitEditor();
              plugin.isEditing = true;
              return;
            }

            // set active editor instance
            plugin.activeEditor = plugin.getEditorInstance();

            // assign element instances
            var $editor = plugin.activeEditor.getElement();
            var $td = plugin.getActiveCell();
            plugin.activeEditor.activeCell = $td;

            // set editing mode after we have gotten active cell
            plugin.isEditing = true;

            // show editor and set correct position
            plugin.activeEditor.show();
            $editor.css($td.cellPosition());
            plugin.activeEditor.setDimensions($td);

            // set value in editor
            var column = $td.data("column");
            var allowHTML = $td.data("allowHTML");
            var value = allowHTML ? $td.find(">div").html() : $td.text();
            plugin.activeEditor.setValue(value);

            // trigger editor:load event
            var data = {};
            data[column] = value;
            plugin.events.trigger("editor:load", data, $td);

            return $editor;
        };

        plugin.keydown = function (e) {

            var preventDefault = true;

            // all keyCodes that will be used
            var codes = [8, 9, 13, 27, 37, 38, 39, 40, 90, 89, 68];

            // specific keyCodes that won't be hijacked from the editor
            var editorCodes = [8, 37, 38, 39, 40, 68, 90, 89];

            if ((plugin.getActiveCell().length === 0 && !plugin.isEditing) || !_.contains(codes, e.which)) {
                return;
            }

            if (!plugin.isEditing && _.contains(plugin.config.disableKeys, e.which)) {
                e.preventDefault();
                return;
            }

            // if editor is editing and active editor can be found, prevent
            // keystrokes that could intervene with editor
            if (plugin.isEditing && plugin.getEditor() && _.contains(editorCodes, e.which)) {
                return;
            } else {
                e.preventDefault();
            }

            switch (e.which) {
                case 37: // left
                    plugin.move("left");
                    break;
                case 38: // up
                    plugin.move("up");
                    break;
                case 39: // right
                    plugin.move("right");
                    break;
                case 40: // down
                    plugin.move("down");
                    break;
                case 13: // enter

                    var isRowAction = false;
                    var $activeCell = plugin.getActiveCell();

                    if ($activeCell && $activeCell.data("action")) {
                      var rowActionName = $activeCell.data("action-name");
                      if (plugin.rowActions[rowActionName]) {
                        plugin.rowActions[rowActionName].trigger({data:
                          {$activeCell: $activeCell}});
                      }

                      isRowAction = true;
                    }

                    // @todo the code below must be refactored
                    if (plugin.isEditing) {
                        if (e.ctrlKey && e.shiftKey) {
                            plugin.move("up");
                        } else if (e.ctrlKey && !e.shiftKey) {
                            plugin.move("down");
                        } else {
                            // enter on row action should not
                            // change editor state
                            if (!plugin.preventEnter && !isRowAction) {
                                plugin.exitEditor();
                            }
                        }
                    } else {

                        // enter on row action should not change editor state
                        if (!isRowAction) {
                          plugin.editCell();
                        }
                    }
                    break;
                case 27: // esc
                    if (plugin.isEditing) {
                        plugin.exitEditor(true);
                    } else {
                        // remove focus from grid
                        plugin.$el.blur();
                    }
                    break;
                case 9: // tab
                    if (e.shiftKey) {
                        plugin.move("left");
                    } else {
                        plugin.move("right");
                    }
                    break;
                case 8: // backspace
                    if (e.ctrlKey || e.metaKey) {
                        plugin.removeActiveRow();
                    } else {
                        plugin.clearActiveCell();
                    }
                    break;
                case 90: // undo
                    if (e.ctrlKey || e.metaKey) {
                        var edit = plugin.undo();

                        if (edit.type === 'cell') {
                            if (('row' in edit) && ('column' in edit)) {

                                var row = plugin.getRowByIndex(edit.row - 1);
                                var element = plugin.getCellFromRowByIndex(row, edit.column);

                                // set value from editor to the active cell
                                element.html($("<div>").text(edit.previousState));

                                // trigger editor:save event
                                var data = {};
                                data[element.data("column")] = edit.previousState;
                                plugin.events.trigger("editor:save", data, element);

                            }
                        } else if (edit.type === 'row') {

                        }
                    }
                    break;
                case 89: // redo
                    if (e.ctrlKey || e.metaKey) {
                        var redo = plugin.redo();

                        if (('row' in redo) && ('column' in redo)) {

                            var currentRow = plugin.getRowByIndex(redo.row - 1);
                            var currentEl = plugin.getCellFromRowByIndex(currentRow, redo.column);

                            // set value from editor to the active cell
                            currentEl.html($("<div>").text(redo.currentState));

                            // trigger editor:save event
                            var localData = {};
                            localData[currentEl.data("column")] = redo.currentState;
                            plugin.events.trigger("editor:save", localData, currentEl);

                        }
                    }
                    break;
                case 68: // keypress "d" duplicate row
                    if (e.ctrlKey || e.shiftKey) {
                        plugin.duplicateActiveRow();
                    }
                    break;
            }

            if (preventDefault) {
                e.preventDefault();
            }
        };

        plugin.clickCell = function (e) {
            e.preventDefault();
            if (plugin.isEditing) {
                plugin.exitEditor();
            }
            plugin.setActiveCell($(this));
        };

        plugin.dblClickCell = function (e) {
            e.preventDefault();
            plugin.setActiveCell($(this));
            plugin.editCell();
        };

        plugin.renderColumns = function () {
            var $thead = $("thead", plugin.$el);
            var tr = document.createElement("tr");

            _.each(plugin.columns, function (column) {
                var th = document.createElement("th");
                var div = document.createElement("div");

                if (plugin.config["sortable"]) {
                    th.className = "sensei-grid-sortable";
                }

                $(div).text(column.display ? column.display : column.name);
                th.appendChild(div);

                $(th).data("name", column.name);
                $(th).data("type", column.type || "string");
                $(th).data("editor", column.editor || "BasicEditor");

                if (column.editorProps) {
                    plugin.editorProps[column.name] = column.editorProps;
                }

                tr.appendChild(th);
            });

            // if (!_.isEmpty(plugin.rowElements)) {
            //   var th = document.createElement("th");
            //   th.innerHTML = "";
            //   tr.appendChild(th);
            // }

            $thead.append(tr);
        };

        plugin.renderData = function () {
            var $tbody = $(".sensei-grid-tbody", plugin.$el);

            // remove existing content from tbody
            $tbody.html(null);

            _.each(plugin.data, function (item) {
                var tr = plugin.renderRow(item, true);
                $tbody.append(tr);
            });

            if (plugin.config["emptyRow"]) {
                // render empty row at the end of table
                var tr = plugin.renderRow(null, false);
                $tbody.append(tr);
            }

            // check if grid is empty and if empty grid message is set
            if (_.isEmpty(plugin.data) && plugin.config.emptyGridMessage) {
                // render row with empty grid message
                var emptyCell = $("<td colspan=999>").text(plugin.config.emptyGridMessage);
                var emptyRow = $("<tr>").append(emptyCell);
                $tbody.html(emptyRow);
            }
        };

        plugin.renderRow = function (item, saved, dirty) {
            var tr = document.createElement("tr");

            if (!saved) {
                tr.className = "sensei-grid-empty-row";
            }

            if (dirty) {
                tr.className = "sensei-grid-dirty-row";
            }

            _.each(plugin.columns, function (column) {
                var td = document.createElement("td");
                var div = document.createElement("div");

                if (_.has(item, column.name)) {
                    if (column.allowHTML && column.allowHTML === true) {
                        $(div).html(item[column.name]);
                    } else {
                        $(div).text(item[column.name]);
                    }
                }

                // check if nowrap needs to be disabled
                if (column.wrap === true) {
                  $(td).css("white-space", "normal");
                }

                $(td).data("allowHTML", column.allowHTML);
                $(td).data("column", column.name);
                $(td).data("type", column.type || "string");
                $(td).data("editor", column.editor || "BasicEditor");
                $(td).data("saved", saved);

                td.appendChild(div);
                tr.appendChild(td);
            });

            if (!_.isEmpty(plugin.rowElements)) {
              // append row actions to tr element
              _.each(plugin.rowElements, function (rowEl, name) {
                var td = document.createElement("td");
                td.innerHTML = rowEl;
                $(td).data("action", true);
                $(td).data("action-name", name);
                $(td).addClass("row-action");

                // if row action has defined trigger event, bind it to $(td) el
                var rowAction = plugin.rowActions[name];
                if (rowAction.triggerEvent && rowAction.triggerEvent.event && rowAction.triggerEvent.selector) {
                  $(td).on(rowAction.triggerEvent.event, rowAction.triggerEvent.selector, {$activeCell: $(td)}, rowAction.trigger);
                }

                tr.appendChild(td);
              });
            }

            return tr;
        };

        plugin.renderBaseTable = function () {
            var table = document.createElement("table");
            var thead = document.createElement("thead");
            var tbody = document.createElement("tbody");

            tbody.className = "sensei-grid-tbody";
            thead.className = "sensei-grid-thead";
            table.className = plugin.config.tableClass;

            table.appendChild(thead);
            table.appendChild(tbody);

            plugin.$el.html(table);
            plugin.$el.attr("tabindex", -1);
        };

        plugin.init = function (data, columns, options, name) {

            plugin.config = $.extend({}, defaults, options);
            plugin.data = data;
            plugin.columns = columns;
            plugin.name = name;
            plugin.$el = $(this);
            plugin.editors = {};
            plugin.rowActions = {};
            plugin.edits = [];
            plugin.editPointer = -1;

            return plugin;
        };

        return plugin.init(data, columns, options, name);
    };
})(jQuery);
