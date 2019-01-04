
// Plugins should load their own versions of any libraries used even if those libraries are also used
// by the GeositeFramework, in case a future framework version uses a different library version.

require({
    // Specify library locations.
    // The calls to location.pathname.replace() below prepend the app's root path to the specified library location.
    // Otherwise, since Dojo is loaded from a CDN, it will prepend the CDN server path and fail, as described in
    // https://dojotoolkit.org/documentation/tutorials/1.7/cdn
    packages: [
        {
            name: "d3",
            location: "//d3js.org",
            main: "d3.v3.min"
        }
    ]
});

define([
		"dojo/_base/declare",
		"framework/PluginBase",
		"dojo/parser",
		"dojo/on",
		"dijit/registry",
		"dojo/_base/array",
		"dojo/dom-construct",
		"dojo/query",
		"dojo/dom",
		"dojo/dom-class",
		"dojo/dom-style",
		"dojo/dom-attr",
		 "d3",
		"underscore",
		"./app",
		"dojo/text!plugins/natural-infrastructure-blueprint/data.json",
		"dojo/text!plugins/natural-infrastructure-blueprint/interface.json"
       ],
       function (declare, PluginBase, parser, on, registry, array, domConstruct, query, dom, domClass, domStyle, domAttr, d3, _, tool, appData, appConfig) {
           return declare(PluginBase, {
               toolbarName: "Natural Infrastructure Blueprint",
			   fullName: "Natural Infrastructure Blueprint",
               toolbarType: "sidebar",
               hasHelp: false,
               showServiceLayersInLegend: true,
               allowIdentifyWhenActive: false,
               infoGraphic: "",
               pluginDirectory: "plugins/natural-infrastructure-blueprint",
               size: "small",
			   _state: {},
			   _firstLoad: true,
			   _saveAndShare: true,

               activate: function () {
				    var self = this;
					//process this._state if a populated object from setState exists
					if (!_.isEmpty(this._state) && this._saveAndShare) {
						
					} else {
						this.nibTool.showTool();	
					}
               },

               deactivate: function () {
					if(_.has(this.nibTool, "hideTool")) {
						this.nibTool.hideTool();
					}
               },

               hibernate: function () {
				  if(_.has(this.nibTool, "closeTool")) {
					  this.nibTool.closeTool();
				  }
               },

               initialize: function (frameworkParameters) {
				   declare.safeMixin(this, frameworkParameters);
                      var djConfig = {
                        parseOnLoad: true
                   };
                   domClass.add(this.container, "claro");
				   domClass.add(this.container, "plugin-nib");
					this.nibTool = new tool(this, appData, appConfig);
					this.nibTool.initialize(this.nibTool);
					nib_tool = this.nibTool;
					domStyle.set(this.container.parentNode, {
						"padding": "0px"
					});
               },

               getState: function () {
                   var state = new Object();
				   
				   state.controls = {};
				   state.controls.selects = {};
				   state.controls.sliders = {};
				   state.controls.radiocheck = {};
				   
                   return state;

                },

               setState: function (state) {
				   this._state = state;
               },

               identify: function(response){
               }
           });
       });
