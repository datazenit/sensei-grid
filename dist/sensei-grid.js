/**
 * sensei-grid v0.4.3
 * Copyright (c) 2016 Lauris Dzilums <lauris@discuss.lv>
 * Licensed under MIT 
*/
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
                sortable: false,
                tableClass: "table table-bordered table-condensed",
                disableKeys: [],
                moveOnRowRemove: true,
                removable: true,
                readonly: false,
                emptyGridMessage: null,
                skipOnDuplicate: null,
                initialSort: null,
                selectable: false,
                toolbar: false,
                // container used for scrolling viewport
                getContainer: null
            };

        plugin.name = null;
        plugin.isEditing = false;
        plugin.$prevRow = null;
        plugin.editorProps = {};
        plugin.preventEnter = false;
        plugin.$lastActiveCell = null;

        /**
         * Helper method to traverse elements between two nodes
         * @param node1
         * @param node2
         * @returns {*}
         */
        $.fn.between = function (node1, node2) {
          var index0 = $(this).index(node1);
          var index1 = $(this).index(node2);

          if (index0 <= index1) {
            return this.slice(index0, index1 + 1);
          }
          return this.slice(index1, index0 + 1);
        };

        var isFirefox = function () {
          return navigator.userAgent.search("Firefox") > -1;
        };

        /**
         * Force redraw on element
         * NB! Causes scroll glitch after moving viewport with scrollLeft/scrollTop
         * Redraw is needed because of an old bug in firefox
         * https://bugzilla.mozilla.org/show_bug.cgi?id=688556
         * Use only for firefox because all other browser can get their shit together
         *
         * @param $el
         */
        var redraw = function ($el) {
          if (isFirefox()) {
            var el = $el.get(0);
            var d = el.style.display;

            // actual code that will force redraw of element
            el.style.display = "none";
            el.offsetHeight; // jshint ignore:line
            el.style.display = d;
          }
        };

        /**
         * Normalize line endings
         * @param text
         * @returns string
         */
        var normalizeLineEndings = function (text) {
            return text.replace(/\r\n/g, "\n");
        };

        /**
         * Clear text selection
         */
        var clearSelection = function () {
          if(document.selection && document.selection.empty) {
            document.selection.empty();
          } else if(window.getSelection) {
            var sel = window.getSelection();
            sel.removeAllRanges();
          }
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

            // set last active cell
            plugin.$lastActiveCell = $el;

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
            if (isFirefox()) {
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

        // @deprecated use isFirefox function
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

            // check if we need to show initial sorting
            if (plugin.config.sortable && _.isObject(plugin.config.initialSort)) {
              var col = plugin.config.initialSort.col;
              var $col = plugin.$el.find("th").filter(function () {
                return $(this).data("name") === col;
              });
              if ($col) {
                plugin.showSortingIndicator($col, plugin.config.initialSort.order);
              }
            }


            // render each editor
            _.each(plugin.editors, function (editor) {
                editor.initialize();
                editor.render();
                editor.getElement().hide();
            });

            plugin.bindEvents();
        };

        plugin.updateData = function (data) {
          plugin.renderData(data);
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

            plugin.$el.on("click.grid", ".sensei-grid-tbody>tr>td", plugin.clickCell);
            plugin.$el.on("dblclick.grid", ".sensei-grid-tbody>tr>td", plugin.dblClickCell);
            plugin.$el.on("blur.grid", plugin.blur);
            plugin.$el.on("keydown.grid", plugin.keydown);
            plugin.$el.on("click.grid", ".sensei-grid-thead .sensei-grid-sortable", plugin.sort);
            plugin.$el.on("change.grid", ".sensei-grid-tbody td.selectable :checkbox", plugin.selectCell);
            plugin.$el.on("change.grid", ".sensei-grid-thead th.selectable :checkbox", plugin.selectAll);
            $(document).on("click.grid", plugin.editorBlur);
        };

        plugin.unbindEvents = function () {
            plugin.$el.off("click.grid", ".sensei-grid-tbody>tr>td");
            plugin.$el.off("dblclick.grid", ".sensei-grid-tbody>tr>td");
            plugin.$el.off("blur.grid");
            plugin.$el.off("keydown.grid");
            plugin.$el.off("click.grid", ".sensei-grid-thead .sensei-grid-sortable");
            plugin.$el.off("change.grid", ".sensei-grid-tbody td.selectable :checkbox");
            plugin.$el.off("change.grid", ".sensei-grid-thead th.selectable :checkbox");
            $(document).off("click.grid");
        };

        /**
         * Show sorting indicator on column header
         * @param $el Column header element
         * @param forceOrder Sorting order: asc|desc
         */
        plugin.showSortingIndicator = function ($el, forceOrder) {
            var order;

            // remove row selections
            plugin.$el.find("thead th.selectable :checkbox").prop("checked", false);
            plugin.$el.find("tbody td.selectable :checkbox").prop("checked", false);
            plugin.$el.find("tbody tr.selectedRow").removeClass("selectedRow");

            // remove previous sorting icon
            plugin.$el.find("th.sensei-grid-sortable .glyphicon").remove();

            if (forceOrder === "desc" || ($el.data("order") && $el.data("order") === "asc")) {
              order = "desc";
              // add sorting icon
              $el.append($("<span>").addClass("glyphicon glyphicon-chevron-up"));
            } else {
              order = "asc";
              // add sorting icon
              $el.append($("<span>").addClass("glyphicon glyphicon-chevron-down"));
            }

            if (forceOrder) {
              order = forceOrder;
            }

            // save sort order
            $el.data("order", order);

            return order;
        };

        plugin.sort = function () {
            // get column value
            var col = $(this).data("name");
            //var order = "asc";

            // show sorting indicator on column header
            var order = plugin.showSortingIndicator($(this), order);

            // trigger callback
            plugin.events.trigger("column:sort", col, order, $(this));

            //plugin.renderData();
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

            // if cell doesn't exist, return null
            if (!$cell || $cell.length === 0) {
              return null;
            }

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
            return $cell;
        };

        plugin.getCellFromRowByKey = function ($row, key) {
            var $cell = $row.find("td").filter(function () {
                return $(this).data("column") === key;
            });
            return $cell;
        };

        plugin.getCellRow = function ($cell) {
            return $cell.parent("tr");
        };

        plugin.getRowCellsByIndex = function (index) {
            return plugin.getRowByIndex(index).find("td");
        };

        plugin.getRowCells = function ($row) {
            return $row.find("td:not(.selectable)");
        };

        plugin.getRowByIndex = function (index) {
            var $row = plugin.$el.find(".sensei-grid-tbody>tr").eq(index);
            return $row;
        };

        plugin.getRowDataByIndex = function (index) {
            var $row = plugin.getRowByIndex(index);
            return plugin.getRowData($row);
        };

        plugin.getRowData = function ($row) {

            // return null when row is not found
            if (!$row || $row.length === 0) {
              return null;
            }

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

        plugin.getSelectedRows = function () {
          return plugin.$el.find(".sensei-grid-tbody>tr.selectedRow");
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
            $row.find(">td.selectable").html($("<input type=checkbox>"));
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

        plugin.removeRow = function ($row, userArg) {

          // check if rows can be removed
          if (!plugin.config.removable) {
            return false;
          }

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
          plugin.events.trigger("row:remove", data, row, $row, userArg);

          // remove row
          $row.remove();
        };

        /**
         * Remove currently active row and trigger event
         */
        plugin.removeActiveRow = function () {

            // check if any rows are selected
            var $selectedRows = plugin.getSelectedRows();
            if ($selectedRows.length > 0) {
              $selectedRows.each(function () {
                plugin.removeRow($(this));
              });
              return;
            }

            // get active cell
            var $cell = plugin.getActiveCell();

            // can't remove a row if there is no active cell
            if ($cell.length === 0) {
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

            // check if we need to skip some values
            if (!_.isEmpty(plugin.config.skipOnDuplicate)) {
              data = _.omit(data, plugin.config.skipOnDuplicate);
            }

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

        plugin.scrollIntoView = function($el, $container) {
          var padding = 50;
          var top = 0;
          var left = 0;
          if ($container.offset()) {
            top = $container.offset().top + $container.scrollTop();
            left = $container.offset().left + $container.scrollLeft();
          }
          $container.scrollTop(
              $el.offset().top - top - padding
          );
          $container.scrollLeft(
              $el.offset().left - left - padding
          );
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

            var $cell = plugin.getActiveCell();
            var $container = $(window);
            var viewportSettings = {};
            if (plugin.config.getContainer) {
              $container = plugin.config.getContainer();
              viewportSettings = {viewport: $container};
            }

            // check if isInViewport method exists and active cell is in the viewport
            if ($.fn.isInViewport && $cell.isInViewport(viewportSettings).length === 0) {
              // cell is not in containers viewport, let's scroll
              plugin.scrollIntoView($cell, $container);
            }

            if (plugin.isEditing) {
              // show editor for currently active cell
              plugin.editCell();
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

            if (_.isFunction(editorName)) {
                editorName = editorName(plugin);
            }

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

        plugin.selectRow = function ($row, forceSelect, forceUnselect) {
          // check if row can be selected
          if (!plugin.config.selectable) {
            return;
          }

          var $cell = $row.find(".selectable");
          plugin.selectCell($cell, forceSelect, forceUnselect);
        };

        plugin.selectCell = function ($cell, forceSelect, forceUnselect) {
          // check if "this" is a selectable cell
          // "this" will be a dom element if selectCell is called as a callback to dom event
          if ($(this) && $(this).is("input")) {
            $cell = $(this).parents("td.selectable");
          } else {
            // toggle checkbox state because if "this" is not a dom element, selectCell is not called as callback to
            // dom event and checkbox state is unchanged
            var $checkbox = $cell.find(":checkbox");

            if (forceSelect) {
              $checkbox.prop("checked", true);
            } else if (forceUnselect) {
              $checkbox.prop("checked", false);
            } else {
              $checkbox.prop("checked", !$checkbox.prop("checked"));
            }
          }

          // don't select empty row
          if ($cell.parent().hasClass("sensei-grid-empty-row")) {
            return;
          }

          // toggle row select state
          if (forceSelect) {
            $cell.parent().addClass("selectedRow");
          } else if (forceUnselect) {
            $cell.parent().removeClass("selectedRow");
          } else {
            $cell.parent().toggleClass("selectedRow");
          }


          if ($cell.parent().hasClass("selectedRow")) {
            plugin.events.trigger("row:mark", $cell.parent());
          } else {
            plugin.events.trigger("row:unmark", $cell.parent());
          }
        };

        plugin.selectAll = function () {
          // forced states
          var forceSelect = true;
          var forceUnselect = false;

          var $checkbox = plugin.$el.find("thead th.selectable :checkbox");

          // check if current checkbox is unchecked
          if ($checkbox && !$checkbox.is(":checked")) {
            forceSelect = false;
            forceUnselect = true;
          }

          var $rows = plugin.getRows();
          $rows.each(function () {
              plugin.selectRow($(this), forceSelect, forceUnselect);
          });
        };

        plugin.showEditor = function () {

            // get editor instance
            var editor = plugin.getEditorInstance();

            if (!editor) {
              plugin.exitEditor();
              plugin.isEditing = true;
              return;
            }

            // set active editor instance
            plugin.activeEditor = editor;

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

            // set editor position again, because setting value and focusing editor
            // can cause different position
            $editor.css($td.cellPosition());

            // trigger editor:load event
            var data = {};
            data[column] = value;
            plugin.events.trigger("editor:load", data, $td);

            return $editor;
        };

        plugin.keydown = function (e) {

            var preventDefault = true;

            // all keyCodes that will be used
            var codes = [8, 9, 13, 27, 32, 37, 38, 39, 40, 65, 68, 89, 90];

            // specific keyCodes that won't be hijacked from the editor
            var editorCodes = [8, 32, 37, 38, 39, 40, 65, 68, 89, 90];

            // loose keyCodes that don't need an active cell to work
            var looseCodes = [8];

            // get active cell
            var $activeCell = plugin.getActiveCell();

            if ((plugin.getActiveCell().length === 0 && !plugin.isEditing && !_.contains(looseCodes, e.which)) ||
                !_.contains(codes, e.which)) {
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

            var $nextCell, $checkbox;

            switch (e.which) {
                case 37: // left
                    plugin.move("left");
                    break;
                case 38: // up

                    // check if current cell is selectable and shift key is pressed
                    if (e.shiftKey && plugin.config.selectable) {
                      // select cell/row
                      plugin.selectRow($activeCell.parent(), true);
                    }

                    plugin.move("up");

                    $nextCell = plugin.getActiveCell();
                    // check if next cell is selectable and shift key is pressed
                    if (e.shiftKey && plugin.config.selectable) {
                      // select cell/row
                      plugin.selectRow($nextCell.parent(), true);
                    }

                    break;
                case 39: // right
                    plugin.move("right");
                    break;
                case 40: // down

                    // check if current cell is selectable and shift key is pressed
                    if (e.shiftKey && plugin.config.selectable) {
                      // select cell/row
                      plugin.selectRow($activeCell.parent(), true);
                    }

                    plugin.move("down");

                    $nextCell = plugin.getActiveCell();
                    // check if next cell is selectable and shift key is pressed
                    if (e.shiftKey && plugin.config.selectable) {
                      // select cell/row
                      plugin.selectRow($nextCell.parent(), true);
                    }
                    break;
                case 13: // enter

                    var isRowAction = false;
                    var isSelectable = false;

                    if ($activeCell && $activeCell.data("action")) {
                      var rowActionName = $activeCell.data("action-name");
                      if (plugin.rowActions[rowActionName]) {
                        plugin.rowActions[rowActionName].trigger({data:
                          {$activeCell: $activeCell}});
                      }

                      isRowAction = true;
                    }

                    // check if cell is selectable checkbox wrapper
                    if ($activeCell && $activeCell.hasClass("selectable")) {

                      // select cell/row
                      plugin.selectCell($activeCell);

                      // set isSelectable state
                      isSelectable = true;
                    }

                    // @todo the code below must be refactored
                    if (plugin.isEditing) {
                        if (e.ctrlKey && e.shiftKey) {
                            plugin.move("up");
                        } else if (e.ctrlKey && !e.shiftKey) {
                            plugin.move("down");
                        } else {
                            // enter on row action and selectable cell should not change editor state
                            if (!plugin.preventEnter && !isRowAction && !isSelectable) {
                                plugin.exitEditor();
                            }
                        }
                    } else {

                        // enter on row action and selectable cell should not change editor state
                        if (!isRowAction && !isSelectable) {
                          plugin.editCell();
                        }
                    }
                    break;
                case 27: // esc
                    if (plugin.isEditing) {
                        plugin.exitEditor(true);
                    } else {
                        // get selected
                        var $selectedRows = plugin.getSelectedRows();
                        if ($selectedRows && $selectedRows.length > 0) {
                          // unselect all
                          $checkbox = plugin.$el.find("thead th.selectable :checkbox");
                          $checkbox.prop("checked", false);
                          plugin.selectAll();
                        } else {
                          // remove focus from grid if no rows are selected
                          plugin.$el.blur();
                        }
                    }
                    break;
                case 9: // tab
                    if (e.shiftKey) {
                        plugin.move("left");
                    } else {
                        plugin.move("right");
                    }
                    break;
                case 32: // space
                    // check if row is selectable
                    if ($activeCell && plugin.config.selectable) {
                      // select row
                      plugin.selectRow($activeCell.parent());
                    }
                    break;
                case 8: // backspace
                    if (e.ctrlKey || e.metaKey) {
                        plugin.removeActiveRow();
                    }
                    break;
                case 65: // "a" key
                    if (plugin.config.selectable && (e.ctrlKey || e.metaKey || e.shiftKey)) {

                      // toggle main selectable checkbox
                      $checkbox = plugin.$el.find("thead th.selectable :checkbox");
                      $checkbox.prop("checked", !$checkbox.prop("checked"));

                      // toggle select all rows
                      plugin.selectAll();
                    }
                    break;
                case 90: // undo
                    if (e.ctrlKey || e.metaKey) {
                        var edit = plugin.undo();

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
                    if (e.ctrlKey || e.shiftKey || e.metaKey) {
                        plugin.duplicateActiveRow();
                    }
                    break;
            }

            if (preventDefault) {
                e.preventDefault();
            }
        };

        plugin.clickCell = function (e) {
            // dont prevent default event if this is selectable cell with checkbox
            if (!$(this).hasClass("selectable")) {
              // is not selectable cell, prevent default event
              e.preventDefault();
            }

            var $prev;
            if (plugin.getActiveCell()) {
              $prev = plugin.getActiveCell().parent();
            }

            if (plugin.isEditing) {
                plugin.exitEditor();
            }
            plugin.setActiveCell($(this));

            // if shift key was pressed, extend selection between last active and current row
            if (plugin.config.selectable && e.shiftKey) {

              // disable text selection
              clearSelection();

              var $currentRow = $(this).parent();
              if ($prev && $currentRow) {
                var $between = plugin.$el.find("tbody>tr").between($prev, $currentRow);
                $between.each(function () {
                  // if current cell is selectable, skip its row, because the select event will be called anyway from
                  // checkbox change event
                  if (!$(e.target).is(":checkbox") || !$(this).is($currentRow)) {
                    plugin.selectCell($(this).find("td.selectable"), true);
                  }
                });
              }
            }
        };

        plugin.dblClickCell = function (e) {
            e.preventDefault();
            plugin.setActiveCell($(this));
            plugin.editCell();
        };

        plugin.renderColumns = function () {
            var $thead = $("thead", plugin.$el);
            var tr = document.createElement("tr");

            if (plugin.config.selectable) {
              var th = $("<th class=selectable><div><input type=checkbox></div></th>")[0];
              tr.appendChild(th);
            }

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

        /**
         * Render grid data
         * @param data Optional array of grid data, it will override existing data array
         */
        plugin.renderData = function (data) {
            var $tbody = $(".sensei-grid-tbody", plugin.$el);

            // override existing data array
            if (data) {
              plugin.data = data;
            }

            // remove existing content from tbody
            $tbody.html(null);

            _.each(plugin.data, function (item) {
                var tr = plugin.renderRow(item, true);
                $tbody.append(tr);
            });

            if (plugin.config.emptyRow) {
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

            if (plugin.config.selectable) {
              var $td = $("<td><div></div></td>");
              //var td = document.createElement("td");
              if (saved) {
                var $checkbox = $("<input type=checkbox>");
                $td.find("div").append($checkbox);
              }
              $td.prop("class", "selectable");
              tr.appendChild($td[0]);
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
                    
                    // custom style callback
                    if (_.isFunction(column.style)) {
                        var style = column.style(item[column.name], plugin);
                        
                        if (!_.isEmpty(style)) {
                            $(td).css(style);                            
                        }
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

            plugin.$el.html($("<div class='sensei-grid-table-wrapper'>").html(table));
            plugin.$el.attr("tabindex", -1);

            if (plugin.config.toolbar) {
              plugin.$el.append($("<div class='sensei-grid-toolbar'>").text("Empty toolbar."));
            }
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

(function ($) {
  var root = this;

  var Editor = function (grid) {
    this.grid = grid;
  };
  Editor.extend = function (props) {
    var parent = this;
    var child;

    child = function () {
      return parent.apply(this, arguments);
    };

    var Surrogate = function () {
      this.constructor = child;
    };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate();

    if (props) {
      _.extend(child.prototype, props);
    }

    child.__super__ = parent.prototype;

    return child;
  };
  Editor.prototype.getElement = function () {
    return $(this.editor);
  };
  Editor.prototype.initialize = function () {
  };
  Editor.prototype.render = function () {
  };
  Editor.prototype.show = function () {
    this.getElement().show();
  };
  Editor.prototype.hide = function () {
    this.getElement().hide();
    this.grid.activeEditor.activeCell = null;
    this.grid.activeEditor = null;
  };
  Editor.prototype.setDimensions = function ($td) {
    this.getElement().css({width: $td.outerWidth() + 1, height: $td.outerHeight() + 1});
  };
  Editor.prototype.getValue = function () {
    throw Error("Editor.getValue not implemented");
  };
  Editor.prototype.setValue = function () {
    throw Error("Editor.setValue not implemented");
  };

  // export editor
  root.Editor = Editor;

  root.BasicEditor = Editor.extend({
    types: [],
    name: "BasicEditor",
    render: function () {
      if (!this.editor) {
        this.editor = document.createElement("div");
        this.editor.className = "sensei-grid-editor sensei-grid-basic-editor";
        var input = document.createElement("input");
        input.setAttribute("type", "text");
        this.editor.appendChild(input);
        this.grid.$el.append(this.editor);
      }
    },
    getValue: function () {
      return $("input", this.editor).val();
    },
    setValue: function (val) {
      $("input", this.editor).val(val).focus();
    }
  });

  root.TextareaEditor = Editor.extend({
    types: [],
    name: "TextareaEditor",
    render: function () {
      if (!this.editor) {
        this.editor = document.createElement("div");
        this.editor.className = "sensei-grid-editor sensei-grid-textarea-editor";
        var textarea = document.createElement("textarea");
        this.editor.appendChild(textarea);
        this.grid.$el.append(this.editor);
      }
    },
    setDimensions: function ($td) {
      this.getElement().find("textarea").css({width: $td.outerWidth() + 50, height: $td.outerHeight() + 50});
    },
    getValue: function () {
      return $("textarea", this.editor).val();
    },
    setValue: function (val) {
      $("textarea", this.editor).val(val).focus();
    }
  });

  root.BooleanEditor = Editor.extend({
    types: [],
    name: "BooleanEditor",
    render: function () {
      if (!this.editor) {
        this.editor = document.createElement("div");
        this.editor.className = "sensei-grid-editor sensei-grid-boolean-editor";
        var $wrapper = $("<div>", {class: "sensei-grid-checkbox-wrapper"});
        $wrapper.append($("<input>", {type: "checkbox"}));
        $(this.editor).append($wrapper);
        this.grid.$el.append(this.editor);
      }
    },
    setDimensions: function ($td) {
      var css = {
        width: $td.outerWidth() - 3,
        height: $td.outerHeight() - 3,
        background: "white"
      };
      this.getElement().find(".sensei-grid-checkbox-wrapper").css(css);
    },
    getValue: function () {
      return $("input", this.editor).is(":checked") ? "true" : "false";
    },
    setValue: function (val) {
      if (val.toLowerCase() === "true") {
        $("input", this.editor).prop("checked", true);
      } else {
        $("input", this.editor).prop("checked", false);
      }
      $("input", this.editor).focus();
    }
  });

  root.SelectEditor = Editor.extend({
    types: [],
    name: "SelectEditor",
    render: function () {
      if (!this.editor) {
        this.editor = document.createElement("div");
        this.editor.className = "sensei-grid-editor sensei-grid-custom-editor";
        var select = document.createElement("select");
        this.editor.appendChild(select);
        this.grid.$el.append(this.editor);
      }
    },
    renderValues: function () {
      if (_.has(this.props, "values")) {

        var $select = this.getElement().find("select");
        $select.html(null);

        _.each(this.props["values"], function (val) {
          var option = document.createElement("option");
          option.value = val;
          option.innerHTML = val;
          $select.append(option);
        });
      }
    },
    show: function () {
      this.renderValues();
      this.getElement().show();
    },
    getValue: function () {
      return $("select", this.editor).val();
    },
    setValue: function (val) {
      $("select>option", this.editor).filter(function () {
        return $(this).val() === val;
      }).attr("selected", "selected");
      $("select").focus();
    }
  });

  /**
   * Substring matcher for typeahead plugin
   * @param strs
   * @return 
   */
  var substringMatcher = function (strs) {
    return function findMatches(q, cb) {
      var matches, substrRegex;

      // an array that will be populated with substring matches
      matches = [];

      // regex used to determine if a string contains the substring `q`
      substrRegex = new RegExp(q, 'i');

      // iterate through the pool of strings and for any string that
      // contains the substring `q`, add it to the `matches` array
      $.each(strs, function (i, str) {
        if (substrRegex.test(str)) {
          matches.push(str);
        }
      });

      cb(matches);
    };
  };
  root.AutocompleteEditor = Editor.extend({
    types: [],
    name: "AutocompleteEditor",
    render: function () {
      if (!this.editor) {
        this.editor = document.createElement("div");
        this.editor.className = "sensei-grid-editor sensei-grid-ac-editor";
        var input = document.createElement("input");
        input.setAttribute("type", "text");
        this.editor.appendChild(input);
        this.grid.$el.append(this.editor);
      }
    },
    show: function () {
      this.getElement().show();

      $("input", this.getElement()).typeahead(
          {
            hint: false,
            highlight: false,
            minLength: 0
          },
          {
            name: 'values',
            source: substringMatcher(this.props.values),
            limit: 100
          }
      );
    },
    hide: function () {

      // destroy typeahead
      $("input", this.getElement()).typeahead("close");
      $("input", this.getElement()).typeahead("destroy");

      this.getElement().hide();
      this.grid.activeEditor.activeCell = null;
      this.grid.activeEditor = null;
    },
    setDimensions: function ($td) {
      this.getElement().css({width: $td.outerWidth() + 1, height: $td.outerHeight() + 1});
    },
    getValue: function () {
      return $("input", this.editor).typeahead('val');
    },
    setValue: function (val) {
      $("input", this.editor).typeahead('val', val).focus();
    }
  });

  root.DateEditor = Editor.extend({
    types: [],
    name: "DateEditor",
    datepicker: null,
    render: function () {
      if (!this.editor) {

        // create editor elements
        this.editor = document.createElement("div");
        this.editor.className = "sensei-grid-editor sensei-grid-date-editor";
        var $wrapper = $("<div>", {class: "sensei-grid-date-wrapper"});
        $wrapper.append($("<input>", {type: "text", class: "datepicker"}));
        $(this.editor).append($wrapper);
        this.grid.$el.append(this.editor);

        // load the datepicker
        $('.datepicker').pickadate({
          format: 'ddd mmm dd yyyy',
          editable: true,
          today: false,
          clear: false,
          close: false
        });

        // store datepicker instance
        this.datepicker = $(".datepicker").pickadate('picker');
      }
    },
    show: function () {
      this.getElement().show();
      // force open datepicker
      if (this.datepicker) {
        this.datepicker.open();
      }
    },
    getValue: function () {
      return $("input", this.editor).val();
    },
    setValue: function (val) {
      $("input", this.editor).val(val).focus();
    }
  });

  root.DisabledEditor = Editor.extend({
    types: [],
    name: "DisabledEditor",
    render: function () {
      if (!this.editor) {

        // create editor elements
        this.editor = document.createElement("div");
        this.editor.className = "sensei-grid-editor sensei-grid-disabled-editor";
        var $input = $("<input>", {type: "text", readOnly: true});
        $(this.editor).append($input);
        this.grid.$el.append(this.editor);
      }
    },
    getValue: function () {
      return $("input", this.editor).val();
    },
    setValue: function (val) {
      $("input", this.editor).val(val).focus();
    }
  });

  root.RichEditor = Editor.extend({
    types: [],
    name: "RichEditor",
    render: function () {
      if (!this.editor) {
        this.editor = $("<div>", {class: "sensei-grid-editor sensei-grid-rich-editor"});
        var summertime = $("<div>", {class: "summertime-wrapper"});
        this.editor.append(summertime);
        this.grid.$el.append(this.editor);
      }
    },
    setDimensions: function ($td) {
      this.getElement().css({width: $td.outerWidth() + 50});
    },
    getValue: function () {
      var htmlVal = $(".summertime-wrapper", this.editor).summernote("code");
      return ("" + htmlVal).trim();
    },
    setValue: function (val) {

      $(".summertime-wrapper", this.editor).summernote({
        focus: true,
        height: 100,
        disableResizeEditor: true,
        toolbar: [
          ['style', ['bold', 'italic', 'underline', 'clear']],
          ['font', ['strikethrough']],
          ['color', ['color']],
          ['fontsize', ['fontsize']]
        ],
        callbacks: {
          onKeydown: function (e) {

            // prevent enter + modifier keys in summernote
            if (e.keyCode === 13 && (e.shiftKey || e.altKey || e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              return true;
            }

            // allow only enter itself in summernote, prevent event to be triggered in grid
            if (e.keyCode === 13) {
              e.stopImmediatePropagation();
            }

            // prevent tab in summernote
            if (e.keyCode === 9) {
              e.preventDefault();
              return false;
            }

          }
        }
      });

      $(".summertime-wrapper", this.editor).summernote("code", val);
    }
  });

})(jQuery);