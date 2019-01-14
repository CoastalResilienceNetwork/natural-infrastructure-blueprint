
define([
	    "dojo/_base/declare",
		"d3",
		"underscore",
		"dojo/json",
		"dojo/parser",
		"dojo/on",
		"dojo/aspect",
		"dojo/_base/array",
		"dojo/_base/html",
		"dojo/_base/window",
		"dojo/query",
		"dojo/dom",
		"dojo/dom-class",
		"dojo/dom-style",
		"dojo/dom-attr",
		"dojo/dom-construct",
		"dojo/dom-geometry",
		"dojo/_base/fx",
		"dojo/fx",
		"dojox/fx",
		"dijit/registry",
		"dijit/layout/ContentPane",
		"dijit/TitlePane",
		"dijit/layout/AccordionContainer",
		"dojox/widget/TitleGroup",
		"dijit/form/HorizontalSlider",
		"dijit/form/HorizontalRuleLabels",
		"esri/layers/ArcGISDynamicMapServiceLayer",
		"esri/layers/FeatureLayer",
		"esri/layers/GraphicsLayer",
		"esri/graphic",
		"esri/tasks/query",
		"esri/tasks/QueryTask",
		"esri/geometry/Extent",
		"esri/geometry/Point",
		"esri/InfoTemplate",
		"esri/geometry/screenUtils",
		"esri/request",
		"dojo/NodeList-traverse"
		], 


	function (declare,
			d3,
			_, 
			JSON,
			parser,
			on,
			aspect,
			array,
			html,
			win,			
			query,
			dom,
			domClass,
			domStyle,
			domAttr,
			domConstruct,
			domGeom,
			fx,
			coreFx,
			xFx,
			registry,
			ContentPane,
			TitlePane,
			AccordionContainer,
			TitleGroup,
			HorizontalSlider,
			HorizontalRuleLabels,
			DynamicMapServiceLayer,
			FeatureLayer,
			GraphicsLayer,
			Graphic,
			Query,
			QueryTask,
			Extent,
			Point,
			InfoTemplate,
			screenUtils,
			esriRequest
		  ) 
		
		{

		var nibTool = function(plugin, appData, appConfig){
			var self = this;
			this._plugin = plugin;
			this._app = this._plugin.app;
			this._container = this._plugin.container;
			this._plugin_directory = this._plugin.plugin_directory;
			this._legend = this._plugin.legendContainer;
			this._legendData = {};
			this._map = this._plugin.map;
			this._mapLayers = {};
			this._backgroundMapLayers = {};
			this._mapLayer = {};
			this._displayState = "closed";
			this._extent = {
				"xmin": 0,
				"ymin": 0,
				"xmax": 0,
				"ymax": 0,
				"spatialReference": {
					"wkid": 102100,
					"latestWkid": 3857
				}
			};
			this._data = JSON.parse(appData);
			this._interface = JSON.parse(appConfig);
			
			on(this._map, "click", function(evt) {
				var pt = evt.mapPoint;
				if (self._displayState == "open" && (self._mapLayer.id.indexOf("cobble_berms") >= 0 || self._mapLayer.id.indexOf("vegetated_dunes") >= 0)) {
					self.identifyHabitat(pt);
				}
			})
			
			on(self._map.infoWindow, "hide", function(evt) {
				dojo.query(".esriPopup .contentPane").removeClass("nib");
			})
			
			this.initialize = function(){
				this._extent.xmin = _.min(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.xmin; }));
				this._extent.ymin = _.min(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.ymin; }));
				this._extent.xmax = _.max(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.xmax; }));
				this._extent.ymax = _.max(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.ymax; }));
				
				domStyle.set(this._container, {
					"padding": "0px"
				});
				
				this.loadingDiv = domConstruct.create("div", {
					innerHTML:"<i class='fa fa-spinner fa-spin fa-3x fa-fw'></i>",
					style:"position:absolute; right: 10px; top:10px; width:40px; height:20x; line-height:20px; text-align:center; display:none;"
				}, this._container);
				
				this.loadLayers();
				this.loadInterface();
			}

			this.showTool = function(){
				this._map.setExtent(new Extent(this._extent), true);
				this._displayState = "open";
			} 

			this.hideTool = function(){
				if(!_.isEmpty(this._mapLayer)) {
					this._mapLayer.hide();
				}
				this._displayState = "closed";
			}
			
			this.closeTool = function(){
				if(!_.isEmpty(this._mapLayer)) {
					this._mapLayer.hide();
				}
				this._displayState = "closed";
			}
			
			this.loadLayers = function(){
				var serviceUrl = this._interface.service;
				var layers = this._interface.layers;
				
				_.each(_.keys(layers), function(layer) {
					if (layers[layer].type == "dynamic") {
						var mapLayer = new DynamicMapServiceLayer(serviceUrl, { id:layer });
						mapLayer.setVisibleLayers(layers[layer].ids);
						mapLayer.setImageFormat("png32");
					}
					
					on(mapLayer,"update-start",function(){
						domStyle.set(self.loadingDiv,"display", "block");
					})
					on(mapLayer,"update-end",function(){
						domStyle.set(self.loadingDiv,"display", "none");
					})
					
					if (layer.indexOf("background") >= 0) {
						self._backgroundMapLayers[layer] = mapLayer
					} else {
						self._mapLayers[layer] = mapLayer;
					}
					
					self._map.addLayer(mapLayer);
					mapLayer.hide();
					
				})
			}
			
			this.updateMapLayers = function(layer) {
				this._map.infoWindow.hide();
				_.each(_.keys(this._mapLayers), function(key) {
					self._mapLayers[key].hide();
				});
				if (layer != "") {
					this._mapLayer = this._mapLayers[layer];
					this._mapLayer.show();
				}
				
			}
			
			this.updateBackgroundLayer = function() {
				var layer = query(".plugin-nib .toggle-btn.background input[type=radio]:checked")[0].value;
				_.each(_.keys(this._backgroundMapLayers), function(key) {
					self._backgroundMapLayers[key].hide();
				});
				if (layer != "none") {
					var layerId = this._region.toLowerCase().replace(" ", "_") + "-background-" + layer;
					this._backgroundMapLayers[layerId].show();
				}
			}
			
						
			this.loadInterface = function() {
				var self = this;
				domStyle.set(this._container, { 
					"overflow": "visible"
				});
				
				//empty layout containers
			    this._containerPane = new ContentPane({
					id: "plugin-nib-" + self._map.id,
					style: "position:relative; overflow: visible; width:100%; height:100%;",
					className: 'cr-dojo-dijits'
			    });
			    this._containerPane.startup();
				this._container.appendChild(this._containerPane.domNode);
				
				this.inputsPane = new ContentPane({});
				this._containerPane.domNode.appendChild(this.inputsPane.domNode);
			    domStyle.set(this.inputsPane.containerNode, {
					"position": "relative",
					"overflow": "visible",
					"background": "none",
					"border": "none",
					"width": "100%",
					"height": "auto",
					"padding": "20px 0px 0px 0px"
				});
				on(this._map, "resize", function() {
					domStyle.set(self.inputsPane.containerNode, { "width": "100%", "height": "auto" });
				});
				
				/* domConstruct.create("div", { 
					class:"plugin-desc",
					innerHTML:"This work explores the viability of Natural Shoreline Infrastructure to reduce the vulnerability of coastal communities to climate change related hazards and provides a blueprint for high-, medium-, and low suitability of several types of natural infrastructure in two pilot study areas: Ventura County, and Monterey Bay."
				}, this.inputsPane.containerNode); */
				
				var table = domConstruct.create("div", {
					style:"position:relative;"
				}, this.inputsPane.containerNode);
				
				this.createRegionControls(table);
				this.createHabitatControls(table);
				this.createBackgroundControls(table);
				
				//var tr = domConstruct.create("tr", {}, table);
				var opacityTd = domConstruct.create("div", {}, table);
				
				this.opacityToggleDiv = domConstruct.create("div", {
					className: "section-div",
					style:"height:40px;margin-bottom: 20px;"
				}, opacityTd);
				
				var opacity = domConstruct.create("div", {
					className: "utility-control",
					innerHTML: '<span class="slr-' + this._map.id + '-opacity"><b>Opacity</b>&nbsp;<i class="fa fa-adjust"></i></span>'
				}, this.opacityToggleDiv);
				
				on(opacity,"click", function() {
					var status = domStyle.get(self.opacityContainer, "display");
					var display = (status == "none") ? "block" : "none";
					domStyle.set(self.opacityContainer, "display", display);
				})
				
				this.opacityContainer = domConstruct.create("div", {
					className: "utility"
				}, this.opacityToggleDiv);
				
				//opacity slider
				this.opacitySlider = new HorizontalSlider({
			        name: "opacitySlider",
			        value: 1,
			        minimum: 0,
			        maximum: 1,
			        intermediateChanges: true,
			        showButtons: false,
					disabled: false,
			        style: "width:75px; display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						_.each(_.keys(self._mapLayers), function(key) {
							self._mapLayers[key].setOpacity(Math.abs(value))
						});
			        }
			    });
				this.opacityContainer.appendChild(this.opacitySlider.domNode);
			}
			
			this.createRegionControls = function(table) {
				/*Region selector and summary button*/
				//var tr = domConstruct.create("tr", {}, table);
				var regionTd = domConstruct.create("div", { style:"padding:0px 20px;" }, table);
				
				var regionText = domConstruct.create("div", {
					style:"position:relative;margin-bottom:5px;text-align:left;font-size:14px;",
					innerHTML: '<span class="info-circle fa-stack fa dac-' + this._map.id + '-region"><i class="fa fa-circle fa-stack-1x"></i><span class="fa-stack-1x info-circle-text">1</span></span><b> Choose a Geography</b>'
				}, regionTd);
				
				var regionSelectDiv = domConstruct.create("div", { 
					className: "styled-select",
					style:"width:170px;display:inline-block;" 
				}, regionTd);
				this.regionSelect = dojo.create("select", { name: "regionType"}, regionSelectDiv);
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.regionSelect);
				
				_.forEach(_.keys(this._interface.region), function(key) {
					var value = self._interface.region[key].id;
					domConstruct.create("option", { innerHTML: key, value: key }, self.regionSelect);
				});
				
				on(this.regionSelect, "change", function() {
					self._region = this.value;
					
					if (this.value == "") {
						self._extent.xmin = _.min(dojo.map(_.keys(self._interface.region), function(region) { return self._interface.region[region].extent.xmin; }));
						self._extent.ymin = _.min(dojo.map(_.keys(self._interface.region), function(region) { return self._interface.region[region].extent.ymin; }));
						self._extent.xmax = _.max(dojo.map(_.keys(self._interface.region), function(region) { return self._interface.region[region].extent.xmax; }));
						self._extent.ymax = _.max(dojo.map(_.keys(self._interface.region), function(region) { return self._interface.region[region].extent.ymax; }));
					} else {
						self._extent = self._interface.region[self._region].extent;
					}
					self._map.setExtent(new Extent(self._extent), true);
					
					self.resetInterface();
				});
				this.regionSelect.value = _.first(this.regionSelect.options).value;
				this._region = this.regionSelect.value;
				
				this.downloadReport = domConstruct.create("div", { className:"downloadButton dac-report", innerHTML:'<i class="fa fa-file-pdf-o downloadIcon"></i><span class="downloadText">Report</span>' }, regionTd);
				on(this.downloadReport,"mouseover", function(){
					if (self._region && self._region != "") {
						domStyle.set(this, "background", "#0096d6");
					}
				});
				on(this.downloadReport,"mouseout", function(){
					if (self._region && self._region != "") {
						 domStyle.set(this, "background", "#2B2E3B");
					}
				});
				on(this.downloadReport,"click", function(){
					 if (self._region && self._region != "") {
						var url = self._interface.region[self._region].download.report;
						url = url.replace("HOSTNAME-", window.location.href);
						window.open(url, "_blank");
					 }
				});
			}
			
			
			this.updateRegion = function() {
				this.updateMapLayers("");
			}
			
			this.createHabitatControls = function(table) {
				var habitatTd = domConstruct.create("div", { style:"padding:0px 20px;" }, table);
				
				var backshoreTypeText = domConstruct.create("div", {
					style:"position:relative;margin-bottom:5px;text-align:left;font-size:14px;",
					innerHTML: '<span class="info-circle fa-stack fa dac-' + this._map.id + '-region"><i class="fa fa-circle fa-stack-1x"></i><span class="fa-stack-1x info-circle-text">2</span></span><b> Choose a Backshore Type</b>'
				}, habitatTd);
				
				var backshoreTypeSelectDiv = domConstruct.create("div", { 
					className: "styled-select",
					style:"width:100%;display:inline-block;" 
				}, habitatTd);
				this.backshoreTypeSelect = dojo.create("select", { name: "backshoreType"}, backshoreTypeSelectDiv);
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.backshoreTypeSelect);
				_.forEach(this._interface.controls.backshore, function(key) {
					domConstruct.create("option", { innerHTML: key.label, value: key.value }, self.backshoreTypeSelect);
				});
				
				on(this.backshoreTypeSelect, "change", function() {
					domConstruct.empty(self.habitatTypeSelect);
					domConstruct.create("option", { innerHTML: " -- ", value: "" }, self.habitatTypeSelect);
					if (this.value != "") {
						_.forEach(self._interface.controls.habitat[this.value], function(key) {
							if (!_.has(key, "region")) {
								domConstruct.create("option", { innerHTML: key.label, value: key.value }, self.habitatTypeSelect);
							} else if (_.has(key, "region") && key.region == self._region) {
								domConstruct.create("option", { innerHTML: key.label, value: key.value }, self.habitatTypeSelect);
							}
						});
					}
					self.habitatTypeDescription.innerHTML = "";
					self.updateMapLayers("");
				})
				
				this.backshoreTypeSelect.value = _.first(this.backshoreTypeSelect.options).value;
				
				var habitatTypeText = domConstruct.create("div", {
					style:"position:relative;margin-bottom:5px;text-align:left;font-size:14px;",
					innerHTML: '<span class="info-circle fa-stack fa dac-' + this._map.id + '-region"><i class="fa fa-circle fa-stack-1x"></i><span class="fa-stack-1x info-circle-text">3</span></span><b> Choose a Natural Infrastructure Type</b>'
				}, habitatTd);
				
				var habitatTypeSelectDiv = domConstruct.create("div", { 
					className: "styled-select",
					style:"width:100%;display:inline-block;" 
				}, habitatTd);
				this.habitatTypeSelect = dojo.create("select", { name: "habitatType"}, habitatTypeSelectDiv);
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.habitatTypeSelect);
				
				on(this.habitatTypeSelect, "change", function() {
					var layer = (this.value != "") ? self._region.replace(" ", "_").toLowerCase() + "-" + this.value : this.value;
					self.updateMapLayers(layer);
					
					var description = (this.value != "") ? self._interface.tooltips.habitat[this.value] : this.value;
					self.habitatTypeDescription.innerHTML = description;
				})
				
				this.habitatTypeDescription = domConstruct.create("div", {
					style:"position:relative;margin-bottom:5px;text-align:left;font-size:14px;line-height:1;",
					innerHTML: ''
				}, habitatTd);
				
			}
			
			this.createBackgroundControls = function(table) {
				var backgroundTd = domConstruct.create("div", { style:"padding:0px 20px;" }, table);
				
				var backgroundText = domConstruct.create("div", {
					style:"position:relative;margin-bottom:5px;text-align:left;font-size:14px;",
					innerHTML: '<span class="info-circle fa-stack fa dac-' + this._map.id + '-region"><i class="fa fa-circle fa-stack-1x"></i><span class="fa-stack-1x info-circle-text">4</span></span><b> Choose a Background Base Layer</b>'
				}, backgroundTd);
				
				var containerDiv = domConstruct.create("div", {
					className: "toggle-btn background"
				}, backgroundTd);
				
				domConstruct.create("input", { 
					type: "radio", 
					value: "slr", 
					name: "background",
					checked: false,
					id: "plugin-nib-background-slr-" + self._map.id
				}, containerDiv);
				
				domConstruct.create("label", { 
					for: "plugin-nib-background-slr-" + self._map.id,
					innerHTML: "Sea Level<br>Rise"
				}, containerDiv);
				
				domConstruct.create("input", { 
					type: "radio", 
					value: "habitat", 
					name: "background",
					checked: false, 
					id: "plugin-nib-background-habitat-" + self._map.id
				}, containerDiv);
				
				domConstruct.create("label", { 
					for: "plugin-nib-background-habitat-" + self._map.id,
					innerHTML: "Coastal<br>Habitats"
				}, containerDiv);
				
				domConstruct.create("input", { 
					type: "radio", 
					value: "none", 
					name: "background",
					checked: true, 
					id: "plugin-nib-background-none-" + self._map.id
				}, containerDiv);
				
				domConstruct.create("label", { 
					for: "plugin-nib-background-none-" + self._map.id,
					innerHTML: "No<br>Background"
				}, containerDiv);
				
				on(query(".plugin-nib .toggle-btn.background input"), "change", function(input) {
					if (self._region != "") {
						self.updateBackgroundLayer();
					}
				});
				
			}
			
			this.resetInterface = function(){
				this.backshoreTypeSelect.value = _.first(this.backshoreTypeSelect.options).value;
				
				domConstruct.empty(this.habitatTypeSelect);
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.habitatTypeSelect);
				this.habitatTypeSelect.value = _.first(this.habitatTypeSelect.options).value;
				
				this.habitatTypeDescription.innerHTML = "";
			}

			this.showMessageDialog = function(node, message, position, orientation) {
				var orientation = (_.isUndefined(orientation)) ? "top" : orientation;
				self.tip.innerHTML = message;
				domStyle.set(self.tip, { "display": "block" });
				var offset = 3;
				
				var p = domGeom.position(win.body());
				var np = domGeom.position(node);
				var nm = domGeom.getMarginBox(node);
				var t = domGeom.getMarginBox(self.tip);
				var n = { "x": np.x, "y": np.y, "w": np.w, "h": (np.h == nm.h) ? np.h - 4 : np.h }
				
				switch (orientation) {
					case "top":
						var left = n.x - p.x - t.w/2 + n.w/2;
						var top = n.y - p.y - t.h - n.h + offset;
						left = (position && position.l) ? n.x - p.x - t.w/2 + position.l : left;
						top = (position && position.t) ? n.y - p.y - t.h - position.t : top;
						break;
						
					case "right":
						var left = n.x - p.x + 1.5*n.w + offset;
						var top = n.y - p.y - t.h/2 + n.h/2;
						left = (position && position.l) ? n.x - p.x + position.l : left;
						top = (position && position.t) ? n.y - p.y - t.h/2 + position.t : top;
						break;
						
					case "bottom":
						var left = n.x - p.x - t.w/2 + n.w/2;
						var top = n.y - p.y + 2*n.h + offset;
						left = (position && position.l) ? n.x - p.x - t.w/2 + position.l : left;
						top = (position && position.t) ? n.y - p.y + position.t : top;
						break;
					
					case "left":
						var left = n.x - p.x - t.w - n.w/2 - offset;
						var top = n.y - p.y - t.h/2 + n.h/2;
						left = (position && position.l) ? n.x - p.x - t.w - position.l : left;
						top = (position && position.t) ? n.y - p.y - t.h/2 + position.t : top;
						break;
				}
				domClass.remove(self.tip, ["tooltip-top","tooltip-left","tooltip-bottom","tooltip-right"]);
				domClass.add(self.tip, "tooltip-" + orientation);
				domStyle.set(self.tip, {
					"left": left + "px",
					"top": top + "px"
				});
				
				self.tip.focus();
            }

            this.hideMessageDialog = function() {
        		domStyle.set(self.tip, { "display": "none" });
			}
			
			this.identifyHabitat = function(pt) {
				this._map.infoWindow.hide();
				this._map.graphics.clear();
				var layer = this._mapLayer;
				if (layer.id.indexOf("cobble_berms") >= 0 || layer.id.indexOf("vegetated_dunes") >= 0) {
					var url = layer.url + "/" + layer.visibleLayers[0];
					
					var query = new Query();
					query.geometry = pt;
					query.distance = 50;
					query.units = "meters";
					query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
					query.returnGeometry = false;
					query.outFields = ["*"];
					
					var queryTask = new QueryTask(url);
					queryTask.execute(query, function(response) {
						if (response.features.length > 0) {
							var graphic = response.features[0];
							var attributes = graphic.attributes;
							//var pt = pt;
							//self._map.infoWindow.setFeatures([graphic]);
							
							var foreField = "foreshore";
							var widthField = "beachwdth";
							var rankField = self._interface.layers[layer.id].fields.rank;
							var diffField = self._interface.layers[layer.id].fields.diff;
							
							var content = "<table class='jobsPopupTable' style='border-collapse:collapse;'>";
							content += "<tr style='background:#efefef;'><td style='text-align:right;padding:5px;width:70%;'><b>Suitability Rank</b>:</td><td style='text-align:left;padding:5px;'>" + (attributes[rankField].charAt(0).toUpperCase() + attributes[rankField].slice(1))  + "</td></tr>";
							content += "<tr style='background:#ffffff;'><td style='text-align:right;padding:5px;width:70%;'><b>Foreshore Type</b>:</td><td style='text-align:left;padding:5px;'>" + attributes[foreField] + "</td></tr>";
							content += "<tr style='background:#efefef;'><td style='text-align:right;padding:5px;width:70%;'><b>Beach Width (m)</b>:</td><td style='text-align:left;padding:5px;'>" + d3.format(",.0f")(attributes[widthField]) + "</td></tr>";
							content += "<tr style='background:#ffffff;'><td style='text-align:right;padding:5px;width:70%'><b>Additional Width (m) needed for High Suitability</b>:</td><td style='text-align:left;padding:5px;'>" + d3.format(",.0f")(attributes[diffField]) + "</td></tr>";
							content += "</table>";
							
							self._map.infoWindow.setTitle("");
							self._map.infoWindow.setContent(content);
							self._map.infoWindow.show(pt);
							
							dojo.query(".esriPopup .contentPane").addClass("nib");
						}
						
					});
				}
			}


		};
		
		return nibTool;	
		
	} //end anonymous function

); //End define
