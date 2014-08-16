$(document).ready(function() {

	module("View.spawn",
		{
			setup: function() {
				var $fixture = $('#qunit-fixture');
				$fixture.append('<div id="grandparent"></div>');
				var $grandparent = $('#grandparent');
				$grandparent.append('<div id="parent"></div>');
				var $parent = $('#parent');
				$parent.append('<div id="child"></div>');
				var $child = $('#child');

				this.grandparentView = new Backbone.View({el : $grandparent});
				Backbone.Courier.add(this.grandparentView);
				this.parentView = new Backbone.View({el : $parent});
				Backbone.Courier.add(this.parentView);
				this.childView = new Backbone.View({el : $child});
				Backbone.Courier.add(this.childView);


			}
		}
	);

	test('Spawn message from child to parent view', 2, function() {

		var messageData = {firstName : 'Backbone', lastName : 'Courier'};

		this.parentView.onMessages = {
			"testMessage" : function () {
				ok("testMessage heard");
			},
			"testMessageWithData" : function (data) {
				deepEqual(data, messageData, "testMessageWithData heard with correct payload");
			}
		};

		this.childView.spawn('testMessage');
		this.childView.spawn('testMessageWithData',messageData);

	});

	test('Spawn roundtrip message (handled by parent)', function() {

		var infoString = "My personal info";
		this.parentView.onMessages = {
			"giveMeInfo!" : function( message ) {
				return infoString;
			}
		};

		var valFromMessage = this.childView.spawn('giveMeInfo!');

		equal(valFromMessage,infoString,'Got the correct into back');

	});

	test('Spawn roundtrip message (handled by grandparent)', function() {

		var infoString = "My personal info";
		this.grandparentView.onMessages = {
			"giveMeInfo!" : function( message ) {
				return infoString;
			}
		};

		var valFromMessage = this.childView.spawn('giveMeInfo!');

		equal(valFromMessage,infoString,'Got the correct into back');

	});

	test('Spawn unhandled roundtrip message', 1, function() {

			throws( function() { this.childView.spawn('roundtripMessage!'); },
				'Error thrown because there was no handler for roundtripMessage!');

	});

	module("View.onMessages",
		{

			setup: function() {

				var _this = this;
				var $fixture = $('#qunit-fixture');
				$fixture.append('<div id="grandparent"></div>');
				var $grandparent = $('#grandparent');
				$grandparent.append('<div id="parent"></div>');
				var $parent = $('#parent');
				$parent.append('<div id="child"></div>');
				var $child = $('#child');
				$parent.append('<div id="child2"></div>');
				var $child2 = $('#child2');

				this.grandparentView = new Backbone.View({el : $grandparent});
				Backbone.Courier.add(this.grandparentView);

				this.parentView = new Backbone.View({el : $parent});
				this.parentView.subviews = {};
				Backbone.Courier.add(this.parentView);

				this.childView = new Backbone.View({el : $child});
				Backbone.Courier.add(this.childView);
				this.parentView.subviews['child1'] = this.childView;

				this.childView2 = new Backbone.View({el : $child2});
				this.parentView.subviews['child2'] = this.childView2;
				Backbone.Courier.add(this.childView2);

			}
		}
	);


//Begin: onMessages tests may be reused for both the build-in subviews hash and the _getChildViewNamed function
	var handleMessageFromChild = function () {

		this.parentView.onMessages = {
			"message1 child1" : function(message) {
				ok('Heard message from child1');
			},
			"message1 child2" : function(message) {
				ok(false,"Should not have heard message1 from child2");
			}
		};

		this.childView.spawn('message1');

	};

	var handleAnyMessageFromChild = function () {

		this.parentView.onMessages = {
			"* child1" : function(message) {
				ok('Heard message ' + message.name + ' from child1' );
			},
			"message1 child2" : function(message) {
				ok(false,"Should not have heard message1 from child2");
			}
		};

		this.childView.spawn('message1');
		this.childView.spawn('message2');

	};


	//This test tests the specificity of onMessage handlers with '*'.  If more than one handler matches, the most specific one (highest number of non-'*' characters, should be chosen as the handler.
	var testMessageNameSpecificity = function () {

		this.parentView.onMessages = {
			"me* child1" : function(message) {
				ok('Heard message ' + message.name + ' from child1' );
			},
			"* child1" : function(message) {
				ok(false, 'This handler should not have heard message ' + message.name + ' from child1' );
			}
		};

		this.childView.spawn('message1');

		this.parentView.onMessages = {
			"me* child1" : function(message) {
				ok(false,'This handler should not have heard message ' + message.name + ' from child1' );
			},
			"* child1" : function(message) {
				ok(false, 'This handler should not have heard message ' + message.name + ' from child1' );
			},
			"me*ag* child1" : function(message) {
				ok('Heard message ' + message.name + ' from child1' );
			}

		};

		this.childView.spawn('message1');

	};

//End: Reused onMessages tests.


	test('Handle a specific message from specific child (using built-in subviews hash)', 1, handleMessageFromChild);

	test('Handle any message from specific child (using built-in subviews hash)', 2, handleAnyMessageFromChild);

	test('Testing message name specificity in onMessages hash when using "*"', 2, testMessageNameSpecificity);

	module("View._getChildViewNamed",
		{

			setup: function() {

				var _this = this;
				var $fixture = $('#qunit-fixture');
				$fixture.append('<div id="grandparent"></div>');
				var $grandparent = $('#grandparent');
				$grandparent.append('<div id="parent"></div>');
				var $parent = $('#parent');
				$parent.append('<div id="child"></div>');
				var $child = $('#child');
				$parent.append('<div id="child2"></div>');
				var $child2 = $('#child2');

				this.grandparentView = new Backbone.View({el : $grandparent});
				Backbone.Courier.add(this.grandparentView);

				this.parentView = new Backbone.View({el : $parent});
				Backbone.Courier.add(this.parentView);

				this.childView = new Backbone.View({el : $child});
				Backbone.Courier.add(this.childView);

				this.childView2 = new Backbone.View({el : $child2});
				Backbone.Courier.add(this.childView2);

				this.parentView._getChildViewNamed = function(childViewName) {

					if( childViewName === 'child1' ) {
						return _this.childView;
					}
					else if( childViewName === 'child2' ) {
						return _this.childView2;
					}
					else {
						throw new Error('Unknown view name: ' + childViewName);
					}
				};

			}
		}
	);

	test('Handle a specific message from specific child (using _getChildViewNamed)', 1, handleMessageFromChild);

	test('Handle any message from specific child (using _getChildViewNamed)', 2, handleAnyMessageFromChild);


	module("View.passMessages",
		{
			setup: function() {
				var $fixture = $('#qunit-fixture');
				$fixture.append('<div id="grandparent"></div>');
				var $grandparent = $('#grandparent');
				$grandparent.append('<div id="parent"></div>');
				var $parent = $('#parent');
				$parent.append('<div id="child"></div>');
				var $child = $('#child');
				$parent.append('<div id="child2"></div>');
				var $child2 = $('#child2');

				this.grandparentView = new Backbone.View({el : $grandparent});
				Backbone.Courier.add(this.grandparentView);
				this.parentView = new Backbone.View({el : $parent});
				Backbone.Courier.add(this.parentView);
				this.childView = new Backbone.View({el : $child});
				Backbone.Courier.add(this.childView);
				this.childView2 = new Backbone.View({el : $child2});
				Backbone.Courier.add(this.childView2);

			}
		}
	);

	test('Pass message from child onto grandparent without making changes', 3, function () {

		var _this = this;

		var messageData = {firstName : 'Backbone', lastName : 'Courier'};
		var messageData = {firstName : 'Backbone', lastName : 'Courier'};

		this.parentView.passMessages = {
			"message1" : "."
		};

		this.grandparentView.onMessages = {
			"message1" : function(data,source) {
				ok('Heard message');
				equal(source, _this.parentView, 'Source of message (the parent) is correct');
				deepEqual(data, messageData, 'Message data is correct (same as original)');
			}
		};

		this.childView.spawn('message1', messageData);

	});

	test('Pass message from child onto grandparent with rename using passMessages', 3, function () {

		var _this = this;

		var originalMessageData = {firstName : 'Backbone', lastName : 'Courier'};

		this.parentView.passMessages = {
			"message1" : "message2"
		};

		this.grandparentView.onMessages = {
			"message2" : function(data,source) {
				ok('Heard message');
				equal(source, _this.parentView, 'Source of message (the parent) is correct');
				deepEqual(data, originalMessageData, 'Message data is correct (same as original)');
			},
			"message1" : function() {
				ok(false,'Should not have heard "message1"');
			}
		};

		this.childView.spawn('message1', originalMessageData);

	});


	test('Pass message from child onto grandparent with rename by changing the message.name attribute', 3, function () {

		var _this = this;

		var originalMessageData = {firstName : 'Backbone', lastName : 'Courier'};

		this.parentView.passMessages = {
			"message1" : "message2"
		};

		this.grandparentView.onMessages = {
			"message2" : function(data,source) {
				ok('Heard message');
				equal(source, _this.parentView, 'Source of message (the parent) is correct');
				deepEqual(data, originalMessageData, 'Message data is correct (same as original)');
			},
			"message1" : function() {
				ok(false,'Should not have heard "message1"');
			}
		};

		this.childView.spawn('message1', originalMessageData);

	});

	module("View.spawnMessages",
		{
			setup: function() {
				var $fixture = $('#qunit-fixture');
				$fixture.append('<div id="grandparent"></div>');
				var $grandparent = $('#grandparent');
				$grandparent.append('<div id="parent"></div>');
				var $parent = $('#parent');
				$parent.append('<div id="child"></div>');
				var $child = $('#child');
				$parent.append('<div id="child2"></div>');
				var $child2 = $('#child2');

				this.grandparentView = new Backbone.View({el : $grandparent});
				Backbone.Courier.add(this.grandparentView);
				this.parentView = new Backbone.View({el : $parent});
				Backbone.Courier.add(this.parentView);
				this.parentView.subviews = {};

				this.childView = new Backbone.View({el : $child});
				Backbone.Courier.add(this.childView);
				this.parentView.subviews['child1'] = this.childView;

				this.childView2 = new Backbone.View({el : $child2});
				Backbone.Courier.add(this.childView2);
				this.parentView.subviews['child2'] = this.childView2;

			}
		}
	);

});
